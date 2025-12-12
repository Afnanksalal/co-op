import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { StartupsService } from '@/modules/startups/startups.service';
import { UsersService } from '@/modules/users/users.service';
import { AgentInput, AgentPhaseResult } from './types/agent.types';
import { RunAgentDto } from './dto/run-agent.dto';
import { TaskStatusDto } from './dto/task-status.dto';

interface QueueTaskResult {
  taskId: string;
  jobId: string;
}

@Injectable()
export class AgentsService {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly queueService: AgentsQueueService,
    private readonly startupsService: StartupsService,
    private readonly usersService: UsersService,
  ) {}

  async run(userId: string, dto: RunAgentDto): Promise<AgentPhaseResult[]> {
    const input = await this.buildAgentInput(userId, dto);
    return this.orchestrator.runAgent(dto.agentType, input);
  }

  async queueTask(userId: string, dto: RunAgentDto): Promise<QueueTaskResult> {
    const input = await this.buildAgentInput(userId, dto);
    return this.queueService.addJob(dto.agentType, input, userId);
  }

  /**
   * Build agent input from DTO - shared between run() and queueTask()
   */
  private async buildAgentInput(userId: string, dto: RunAgentDto): Promise<AgentInput> {
    await this.verifyStartupOwnership(userId, dto.startupId);

    const startup = await this.startupsService.findRaw(dto.startupId);
    if (!startup) {
      throw new BadRequestException('Startup not found');
    }

    return {
      context: {
        sessionId: dto.sessionId,
        userId,
        startupId: dto.startupId,
        metadata: {
          // Company basics
          companyName: startup.companyName,
          tagline: startup.tagline,
          description: startup.description,
          website: startup.website,
          // Business classification
          industry: startup.industry,
          businessModel: startup.businessModel,
          revenueModel: startup.revenueModel,
          // Stage
          stage: startup.stage,
          foundedYear: startup.foundedYear,
          // Team
          teamSize: startup.teamSize,
          cofounderCount: startup.cofounderCount,
          // Location
          country: startup.country,
          city: startup.city,
          operatingRegions: startup.operatingRegions,
          // Financials
          fundingStage: startup.fundingStage,
          totalRaised: startup.totalRaised,
          monthlyRevenue: startup.monthlyRevenue,
          isRevenue: startup.isRevenue,
          // Target market
          targetCustomer: startup.targetCustomer,
          problemSolved: startup.problemSolved,
          competitiveAdvantage: startup.competitiveAdvantage,
        },
      },
      prompt: dto.prompt,
      documents: dto.documents,
    };
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusDto | null> {
    return this.queueService.getJobStatus(taskId);
  }

  async cancelTask(taskId: string): Promise<boolean> {
    return this.queueService.cancelJob(taskId);
  }

  private async verifyStartupOwnership(userId: string, startupId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (user.startup?.id !== startupId) {
      throw new ForbiddenException('You do not have access to this startup');
    }
  }
}
