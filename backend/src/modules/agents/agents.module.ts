import { Module, forwardRef } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { AgentsWebhookController } from './queue/agents.webhook.controller';
import { A2AService } from './a2a/a2a.service';
import { LlmModule } from '@/common/llm/llm.module';
import { RagModule } from '@/common/rag/rag.module';
import { ResearchModule } from '@/common/research/research.module';
import { RedisModule } from '@/common/redis/redis.module';
import { QStashModule } from '@/common/qstash/qstash.module';
import { StartupsModule } from '@/modules/startups/startups.module';
import { UsersModule } from '@/modules/users/users.module';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';

import { LegalAgentService } from './domains/legal/legal-agent.service';
import { FinanceAgentService } from './domains/finance/finance-agent.service';
import { InvestorAgentService } from './domains/investor/investor-agent.service';
import { CompetitorAgentService } from './domains/competitor/competitor-agent.service';

@Module({
  imports: [
    LlmModule,
    RagModule,
    ResearchModule,
    RedisModule,
    QStashModule,
    StartupsModule,
    forwardRef(() => UsersModule),
    forwardRef(() => WebhooksModule),
  ],
  controllers: [AgentsController, AgentsWebhookController],
  providers: [
    AgentsService,
    OrchestratorService,
    AgentsQueueService,
    A2AService,
    LegalAgentService,
    FinanceAgentService,
    InvestorAgentService,
    CompetitorAgentService,
  ],
  exports: [AgentsService, OrchestratorService, AgentsQueueService, A2AService],
})
export class AgentsModule {}
