import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { ApiKeyGuard } from '@/common/guards/api-key.guard';

@ApiTags('Metrics')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @UseGuards(ApiKeyGuard)
  @ApiBearerAuth()
  @Header('Content-Type', 'text/plain')
  @ApiOperation({ summary: 'Get Prometheus metrics (requires API key)' })
  @ApiResponse({ status: 200, description: 'Prometheus metrics in text format' })
  @ApiResponse({ status: 401, description: 'Unauthorized - API key required' })
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
