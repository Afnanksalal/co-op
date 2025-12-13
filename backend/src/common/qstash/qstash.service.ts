import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@upstash/qstash';

export interface QStashJobData {
  taskId: string;
  type: string;
  payload: Record<string, unknown>;
  userId: string;
  createdAt: string;
}

export interface QStashPublishResult {
  messageId: string;
  taskId: string;
}

@Injectable()
export class QStashService implements OnModuleInit {
  private readonly logger = new Logger(QStashService.name);
  private client: Client | null = null;
  private readonly callbackUrl: string;

  constructor(private readonly configService: ConfigService) {
    const baseUrl = this.configService.get<string>('QSTASH_CALLBACK_URL') 
      ?? this.configService.get<string>('RENDER_EXTERNAL_URL')
      ?? 'http://localhost:3000';
    this.callbackUrl = `${baseUrl}/api/v1/agents/webhook`;
  }

  onModuleInit(): void {
    const token = this.configService.get<string>('QSTASH_TOKEN');
    
    if (!token) {
      this.logger.warn('QSTASH_TOKEN not configured - QStash disabled');
      return;
    }

    this.client = new Client({ token });
    this.logger.log('QStash client initialized');
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  /**
   * Publish a job to QStash for async processing
   */
  async publish(data: QStashJobData, delaySeconds?: number): Promise<QStashPublishResult> {
    if (!this.client) {
      throw new Error('QStash not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (delaySeconds && delaySeconds > 0) {
      headers['Upstash-Delay'] = `${String(delaySeconds)}s`;
    }

    // Add retry configuration
    headers['Upstash-Retries'] = '3';
    headers['Upstash-Retry'] = '10';

    const response = await this.client.publishJSON({
      url: this.callbackUrl,
      body: data,
      headers,
    });

    this.logger.log(`QStash job published: ${response.messageId} for task ${data.taskId}`);

    return {
      messageId: response.messageId,
      taskId: data.taskId,
    };
  }

  /**
   * Publish multiple jobs in batch
   */
  async publishBatch(jobs: QStashJobData[]): Promise<QStashPublishResult[]> {
    if (!this.client) {
      throw new Error('QStash not configured');
    }

    const messages = jobs.map(data => ({
      url: this.callbackUrl,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'Upstash-Retries': '3',
      },
    }));

    const responses = await this.client.batchJSON(messages);

    return responses.map((response, index) => ({
      messageId: 'messageId' in response ? response.messageId : 'error',
      taskId: jobs[index].taskId,
    }));
  }

  /**
   * Schedule a job for later execution
   */
  async schedule(
    data: QStashJobData,
    cron: string,
    _scheduleId?: string,
  ): Promise<{ scheduleId: string }> {
    if (!this.client) {
      throw new Error('QStash not configured');
    }

    const response = await this.client.schedules.create({
      destination: this.callbackUrl,
      cron,
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.logger.log(`QStash schedule created: ${response.scheduleId}`);

    return { scheduleId: response.scheduleId };
  }

  /**
   * Delete a scheduled job
   */
  async deleteSchedule(scheduleId: string): Promise<void> {
    if (!this.client) {
      throw new Error('QStash not configured');
    }

    await this.client.schedules.delete(scheduleId);
    this.logger.log(`QStash schedule deleted: ${scheduleId}`);
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<{ scheduleId: string; cron: string; destination: string }[]> {
    if (!this.client) {
      throw new Error('QStash not configured');
    }

    const schedules = await this.client.schedules.list();
    return schedules.map(s => ({
      scheduleId: s.scheduleId,
      cron: s.cron,
      destination: s.destination,
    }));
  }
}
