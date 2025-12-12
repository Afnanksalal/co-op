import { Module } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { AgentsProcessor } from './queue/agents.processor';
import { AGENTS_QUEUE } from './queue/agents.queue.types';
import { LlmModule } from '@/common/llm/llm.module';

import { LegalAgentService } from './domains/legal/legal-agent.service';
import { FinanceAgentService } from './domains/finance/finance-agent.service';
import { InvestorAgentService } from './domains/investor/investor-agent.service';
import { CompetitorAgentService } from './domains/competitor/competitor-agent.service';

@Module({
  imports: [
    LlmModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Upstash Redis connection for BullMQ
        // Uses rediss:// protocol (Redis over TLS)
        const host = config.get<string>('UPSTASH_REDIS_HOST', '');
        const port = config.get<number>('UPSTASH_REDIS_PORT', 6379);
        const password = config.get<string>('UPSTASH_REDIS_PASSWORD', '');

        return {
          connection: {
            host,
            port,
            password,
            tls: {},
          },
        };
      },
    }),
    BullModule.registerQueue({
      name: AGENTS_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    }),
  ],
  controllers: [AgentsController],
  providers: [
    AgentsService,
    OrchestratorService,
    AgentsQueueService,
    AgentsProcessor,
    LegalAgentService,
    FinanceAgentService,
    InvestorAgentService,
    CompetitorAgentService,
  ],
  exports: [AgentsService, OrchestratorService, AgentsQueueService],
})
export class AgentsModule {}
