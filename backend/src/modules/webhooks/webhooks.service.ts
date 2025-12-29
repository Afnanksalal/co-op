import { Injectable, Inject, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { createHmac, randomBytes } from 'crypto';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { EncryptionService } from '@/common/encryption/encryption.service';
import { AuditService } from '@/common/audit/audit.service';
import { RedisService } from '@/common/redis/redis.service';
import * as schema from '@/database/schema';
import { CreateWebhookDto, UpdateWebhookDto, WebhookResponseDto } from './dto';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookUsageStats {
  webhookId: string;
  webhookName: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveriesToday: number;
  deliveriesThisMonth: number;
  lastTriggeredAt: Date | null;
}

export interface UserWebhookUsageSummary {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveriesToday: number;
  totalDeliveriesThisMonth: number;
  successRate: number;
  webhookUsage: WebhookUsageStats[];
}

// Blocked hosts for SSRF prevention
const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '169.254.169.254'];
// Blocked ports for SSRF prevention (common internal service ports)
const BLOCKED_PORTS = [22, 23, 25, 110, 143, 445, 3306, 5432, 6379, 27017, 9200, 11211];

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly isProduction: boolean;
  private readonly WEBHOOK_USAGE_PREFIX = 'webhook:usage:';

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
    private readonly encryption: EncryptionService,
    private readonly audit: AuditService,
    private readonly redis: RedisService,
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
        if (
          hostname.startsWith('10.') ||
          hostname.startsWith('192.168.') ||
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.exec(hostname)
        ) {
          throw new BadRequestException('Webhook URL cannot point to private IP addresses');
        }

        // Block dangerous ports (common internal service ports)
        const port = parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80);
        if (BLOCKED_PORTS.includes(port)) {
          throw new BadRequestException(`Webhook URL cannot use port ${port} (blocked for security)`);
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

  // Pilot: 1 webhook per user
  private readonly PILOT_WEBHOOK_LIMIT = 1;
  // Pilot: 10 triggers per day
  private readonly PILOT_DAILY_TRIGGER_LIMIT = 10;

  async create(userId: string, dto: CreateWebhookDto): Promise<WebhookResponseDto> {
    // Pilot program: Limit to 1 webhook per user
    const existingWebhooks = await this.findByUserId(userId);
    if (existingWebhooks.length >= this.PILOT_WEBHOOK_LIMIT) {
      throw new BadRequestException('Pilot program allows only 1 webhook per user. Delete your existing webhook to create a new one.');
    }

    // Validate URL for SSRF prevention
    this.validateWebhookUrl(dto.url);

    // Generate and encrypt the secret
    const plainSecret = randomBytes(32).toString('hex');
    const encryptedSecret = this.encryption.encrypt(plainSecret);

    const [webhook] = await this.db
      .insert(schema.webhooks)
      .values({
        userId,
        name: dto.name,
        url: dto.url,
        secret: encryptedSecret,
        events: dto.events,
      })
      .returning();

    // Audit log
    await this.audit.log({
      userId,
      action: 'webhook.created',
      resource: 'webhook',
      resourceId: webhook.id,
      oldValue: null,
      newValue: { name: dto.name, url: dto.url, events: dto.events },
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    return this.toResponse(webhook);
  }

  async findByUserId(userId: string): Promise<WebhookResponseDto[]> {
    const webhooks = await this.db.select().from(schema.webhooks).where(eq(schema.webhooks.userId, userId));

    return webhooks.map((w) => this.toResponse(w));
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
    const existing = await this.findById(id, userId);

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

    // Audit log
    await this.audit.log({
      userId,
      action: 'webhook.updated',
      resource: 'webhook',
      resourceId: id,
      oldValue: { name: existing.name, url: existing.url, events: existing.events, isActive: existing.isActive },
      newValue: { name: updated.name, url: updated.url, events: updated.events, isActive: updated.isActive },
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    return this.toResponse(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    const existing = await this.findById(id, userId);

    await this.db.delete(schema.webhooks).where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)));

    // Audit log
    await this.audit.log({
      userId,
      action: 'webhook.deleted',
      resource: 'webhook',
      resourceId: id,
      oldValue: { name: existing.name, url: existing.url },
      newValue: null,
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });
  }

  async regenerateSecret(id: string, userId: string): Promise<{ secret: string }> {
    await this.findById(id, userId);

    // Generate and encrypt new secret
    const plainSecret = randomBytes(32).toString('hex');
    const encryptedSecret = this.encryption.encrypt(plainSecret);

    await this.db
      .update(schema.webhooks)
      .set({ secret: encryptedSecret, updatedAt: new Date() })
      .where(and(eq(schema.webhooks.id, id), eq(schema.webhooks.userId, userId)));

    // Audit log
    await this.audit.log({
      userId,
      action: 'webhook.secret_regenerated',
      resource: 'webhook',
      resourceId: id,
      oldValue: null,
      newValue: null, // Don't log the secret
      ipAddress: null,
      userAgent: null,
      metadata: {},
    });

    return { secret: plainSecret };
  }

  private async checkDailyTriggerLimit(webhookId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `${this.WEBHOOK_USAGE_PREFIX}${webhookId}:daily:${today}`;
    const currentUsage = await this.redis.get<number>(dailyKey) ?? 0;
    return currentUsage < this.PILOT_DAILY_TRIGGER_LIMIT;
  }

  async trigger(event: string, data: Record<string, unknown>): Promise<void> {
    const webhooks = await this.db.select().from(schema.webhooks).where(eq(schema.webhooks.isActive, true));

    const matchingWebhooks = webhooks.filter((w) => {
      const events = w.events as string[];
      return events.includes(event) || events.includes('*');
    });

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // Check daily limit before sending
    const webhooksToTrigger = await Promise.all(
      matchingWebhooks.map(async (webhook) => {
        const allowed = await this.checkDailyTriggerLimit(webhook.id);
        return allowed ? webhook : null;
      })
    );

    const allowedWebhooks = webhooksToTrigger.filter((w): w is schema.Webhook => w !== null);
    
    if (allowedWebhooks.length < matchingWebhooks.length) {
      this.logger.warn(`Some webhooks skipped due to daily trigger limit (${this.PILOT_DAILY_TRIGGER_LIMIT}/day)`);
    }

    await Promise.allSettled(allowedWebhooks.map((webhook) => this.sendWebhook(webhook, payload)));
  }

  private async sendWebhook(webhook: schema.Webhook, payload: WebhookPayload): Promise<void> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [1000, 5000, 15000]; // Exponential backoff

    const body = JSON.stringify(payload);
    // Decrypt the secret for signing
    const decryptedSecret = this.encryption.decrypt(webhook.secret);
    const signature = this.generateSignature(body, decryptedSecret);

    // Use iterative retry instead of recursive to prevent stack overflow
    for (let retryCount = 0; retryCount <= MAX_RETRIES; retryCount++) {
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

        if (response.ok) {
          await this.db.update(schema.webhooks).set({ lastTriggeredAt: new Date() }).where(eq(schema.webhooks.id, webhook.id));
          // Track successful delivery
          await this.trackDelivery(webhook.id, true);
          return;
        }

        const shouldRetry = response.status >= 500 || response.status === 429;
        if (!shouldRetry || retryCount >= MAX_RETRIES) {
          this.logger.warn(
            `Webhook ${webhook.id} failed: HTTP ${String(response.status)} after ${String(retryCount)} retries`,
          );
          // Track failed delivery
          await this.trackDelivery(webhook.id, false);
          return;
        }

        this.logger.warn(
          `Webhook ${webhook.id} failed with ${String(response.status)}, retrying (${String(retryCount + 1)}/${String(MAX_RETRIES)})`,
        );
        await this.delay(RETRY_DELAYS[retryCount]);
      } catch (error) {
        if (retryCount >= MAX_RETRIES) {
          this.logger.error(`Webhook ${webhook.id} error after ${String(MAX_RETRIES)} retries: ${String(error)}`);
          // Track failed delivery
          await this.trackDelivery(webhook.id, false);
          return;
        }
        this.logger.warn(
          `Webhook ${webhook.id} error, retrying (${String(retryCount + 1)}/${String(MAX_RETRIES)}): ${String(error)}`,
        );
        await this.delay(RETRY_DELAYS[retryCount]);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

  private async trackDelivery(webhookId: string, success: boolean): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Increment total deliveries
    const totalKey = `${this.WEBHOOK_USAGE_PREFIX}${webhookId}:total`;
    await this.redis.incr(totalKey);

    // Increment success/failure counter
    const statusKey = `${this.WEBHOOK_USAGE_PREFIX}${webhookId}:${success ? 'success' : 'failed'}`;
    await this.redis.incr(statusKey);

    // Increment daily counter
    const dailyKey = `${this.WEBHOOK_USAGE_PREFIX}${webhookId}:daily:${today}`;
    await this.redis.incr(dailyKey);
    await this.redis.expire(dailyKey, 86400 * 7); // Keep for 7 days

    // Increment monthly counter
    const monthlyKey = `${this.WEBHOOK_USAGE_PREFIX}${webhookId}:monthly:${month}`;
    await this.redis.incr(monthlyKey);
    await this.redis.expire(monthlyKey, 86400 * 35); // Keep for ~35 days
  }

  async getWebhookUsage(webhookId: string, userId: string): Promise<WebhookUsageStats | null> {
    const webhook = await this.findById(webhookId, userId);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const [totalDeliveries, successfulDeliveries, failedDeliveries, deliveriesToday, deliveriesThisMonth] =
      await Promise.all([
        this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhookId}:total`),
        this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhookId}:success`),
        this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhookId}:failed`),
        this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhookId}:daily:${today}`),
        this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhookId}:monthly:${month}`),
      ]);

    return {
      webhookId: webhook.id,
      webhookName: webhook.name,
      totalDeliveries: totalDeliveries ?? 0,
      successfulDeliveries: successfulDeliveries ?? 0,
      failedDeliveries: failedDeliveries ?? 0,
      deliveriesToday: deliveriesToday ?? 0,
      deliveriesThisMonth: deliveriesThisMonth ?? 0,
      lastTriggeredAt: webhook.lastTriggeredAt,
    };
  }

  async getUserUsageSummary(userId: string): Promise<UserWebhookUsageSummary> {
    const webhooks = await this.findByUserId(userId);

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const webhookUsage: WebhookUsageStats[] = [];
    let totalDeliveriesToday = 0;
    let totalDeliveriesThisMonth = 0;
    let totalSuccess = 0;
    let totalFailed = 0;
    let activeWebhooks = 0;

    for (const webhook of webhooks) {
      const [totalDeliveries, successfulDeliveries, failedDeliveries, deliveriesToday, deliveriesThisMonth] =
        await Promise.all([
          this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhook.id}:total`),
          this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhook.id}:success`),
          this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhook.id}:failed`),
          this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhook.id}:daily:${today}`),
          this.redis.get<number>(`${this.WEBHOOK_USAGE_PREFIX}${webhook.id}:monthly:${month}`),
        ]);

      const stats: WebhookUsageStats = {
        webhookId: webhook.id,
        webhookName: webhook.name,
        totalDeliveries: totalDeliveries ?? 0,
        successfulDeliveries: successfulDeliveries ?? 0,
        failedDeliveries: failedDeliveries ?? 0,
        deliveriesToday: deliveriesToday ?? 0,
        deliveriesThisMonth: deliveriesThisMonth ?? 0,
        lastTriggeredAt: webhook.lastTriggeredAt,
      };

      webhookUsage.push(stats);
      totalDeliveriesToday += stats.deliveriesToday;
      totalDeliveriesThisMonth += stats.deliveriesThisMonth;
      totalSuccess += stats.successfulDeliveries;
      totalFailed += stats.failedDeliveries;

      if (webhook.isActive) {
        activeWebhooks++;
      }
    }

    const totalAll = totalSuccess + totalFailed;
    const successRate = totalAll > 0 ? (totalSuccess / totalAll) * 100 : 100;

    return {
      totalWebhooks: webhooks.length,
      activeWebhooks,
      totalDeliveriesToday,
      totalDeliveriesThisMonth,
      successRate: Math.round(successRate * 100) / 100,
      webhookUsage,
    };
  }
}
