import { Injectable, Inject, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from './dto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Blocked hosts for SSRF prevention
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly isProduction: boolean;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
  }

  private validateWebhookUrl(url: string): void {
    try {
      const parsed = new URL(url);

      // In production, block internal/private URLs
      if (this.isProduction) {
        const hostname = parsed.hostname.toLowerCase();

        if (BLOCKED_HOSTS.includes(hostname)) {
          throw new BadRequestException('Webhook URL cannot point to localhost or internal addresses');
        }

        // Block private IP ranges
        if (hostname.startsWith('10.') || hostname.startsWith('192.168.') || (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.exec(hostname))) {
          throw new BadRequestException('Webhook URL cannot point to private IP addresses');
        }

        // Require HTTPS in production
        if (parsed.protocol !== 'https:') {
          throw new BadRequestException('Webhook URL must use HTTPS in production');
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid webhook URL');
    }
  }

  async create(userId: string, dto: CreateWebhookDto): Promise<WebhookResponseDto> {
    // Validate URL for SSRF prevention
    this.validateWebhookUrl(dto.url);

    const secret = randomBytes(32).toString('hex');

    const [webhook] = await this.db
      .insert(schema.webhooks)
      .values({
        userId,
        name: dto.name,
        url: dto.url,
        secret,
        events: dto.events,
      })
      .returning();

    return this.toResponse(webhook);
  }

  async findByUserId(userId: string): Promise<WebhookResponseDto[]> {
    const webhooks = await this.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.userId, userId));

    return webhooks.map(w => this.toResponse(w));
  }

  async findById(id: string, userId: string): Promise<WebhookResponseDto> {
    const results = await this.db
      .select()
      .from(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)))
      .limit(1);

    const webhook = results[0];
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return this.toResponse(webhook);
  }

  async update(id: string, userId: string, dto: UpdateWebhookDto): Promise<WebhookResponseDto> {
    await this.findById(id, userId);

    // Validate URL if being updated
    if (dto.url !== undefined) {
      this.validateWebhookUrl(dto.url);
    }

    const updateData: Partial<schema.NewWebhook> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.url !== undefined) updateData.url = dto.url;
    if (dto.events !== undefined) updateData.events = dto.events;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const [updated] = await this.db
      .update(schema.webhooks)
      .set(updateData)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)))
      .returning();

    return this.toResponse(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);

    await this.db
      .delete(schema.webhooks)
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)));
  }

  async regenerateSecret(id: string, userId: string): Promise<{ secret: string }> {
    await this.findById(id, userId);

    const secret = randomBytes(32).toString('hex');

    await this.db
      .update(schema.webhooks)
      .set({ secret, updatedAt: new Date() })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)));

    return { secret };
  }

  async trigger(event: string, data: Record<string, unknown>): Promise<void> {
    const webhooks = await this.db
      .select()
      .from(schema.webhooks)
      .where(eq(schema.webhooks.isActive, true));

    const matchingWebhooks = webhooks.filter(w => {
      const events = w.events as string[];
      return events.includes(event) || events.includes('*');
    });

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    await Promise.allSettled(
      matchingWebhooks.map(webhook => this.sendWebhook(webhook, payload)),
    );
  }

  private async sendWebhook(webhook: schema.Webhook, payload: WebhookPayload, retryCount = 0): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff
    
    const body = JSON.stringify(payload);
    const signature = this.generateSignature(body, webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': payload.event,
          'X-Webhook-Retry': String(retryCount),
        },
        body,
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const shouldRetry = response.status >= 500 || response.status === 429;
        if (shouldRetry && retryCount < MAX_RETRIES) {
          this.logger.warn(`Webhook ${webhook.id} failed with ${String(response.status)}, retrying (${String(retryCount + 1)}/${String(MAX_RETRIES)})`);
          await this.delay(RETRY_DELAYS[retryCount]);
          await this.sendWebhook(webhook, payload, retryCount + 1); return;
        }
        this.logger.warn(`Webhook ${webhook.id} failed: HTTP ${String(response.status)} after ${String(retryCount)} retries`);
      }

      await this.db
        .update(schema.webhooks)
        .set({ lastTriggeredAt: new Date() })
        .where(eq(schema.webhooks.id, webhook.id));
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        this.logger.warn(`Webhook ${webhook.id} error, retrying (${String(retryCount + 1)}/${String(MAX_RETRIES)}): ${String(error)}`);
        await this.delay(RETRY_DELAYS[retryCount]);
        await this.sendWebhook(webhook, payload, retryCount + 1); return;
      }
      this.logger.error(`Webhook ${webhook.id} error after ${String(MAX_RETRIES)} retries: ${String(error)}`);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateSignature(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  private toResponse(webhook: schema.Webhook): WebhookResponseDto {
    return {
      id: webhook.id,
      userId: webhook.userId,
      name: webhook.name,
      url: webhook.url,
      events: webhook.events as string[],
      isActive: webhook.isActive,
      lastTriggeredAt: webhook.lastTriggeredAt,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
    };
  }
}
