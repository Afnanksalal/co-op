import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { UserThrottleGuard } from '@/common/guards/user-throttle.guard';
import { RateLimit } from '@/common/decorators/rate-limit.decorator';
import { InsightsService, InsightContext } from './insights.service';

class GenerateInsightsDto {
  toolName: string;
  data: Record<string, unknown>;
  userContext?: {
    companyName?: string;
    industry?: string;
    stage?: string;
    country?: string;
  };
}

@ApiTags('AI Insights')
@Controller('insights')
@UseGuards(AuthGuard, UserThrottleGuard)
@ApiBearerAuth()
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Post('generate')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'insights:generate' })
  @ApiOperation({ summary: 'Generate AI-powered insights for any tool' })
  async generateInsights(@Body() dto: GenerateInsightsDto) {
    const context: InsightContext = {
      toolName: dto.toolName,
      data: dto.data,
      userContext: dto.userContext,
    };
    return this.insightsService.generateInsights(context);
  }
}
