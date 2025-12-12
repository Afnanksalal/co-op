import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentsService } from './agents.service';
import { OrchestratorService } from './orchestrator/orchestrator.service';

// Domain agents
import { LegalAgentService } from './domains/legal/legal-agent.service';
import { FinanceAgentService } from './domains/finance/finance-agent.service';
import { InvestorAgentService } from './domains/investor/investor-agent.service';
import { CompetitorAgentService } from './domains/competitor/competitor-agent.service';

@Module({
  controllers: [AgentsController],
  providers: [
    AgentsService,
    OrchestratorService,
    LegalAgentService,
    FinanceAgentService,
    InvestorAgentService,
    CompetitorAgentService,
  ],
  exports: [AgentsService, OrchestratorService],
})
export class AgentsModule {}
