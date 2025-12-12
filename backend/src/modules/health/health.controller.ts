import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthCheckDto, ServiceStatus } from './dto/health-check.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy', type: HealthCheckDto })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(@Res() res: Response): Promise<void> {
    const health = await this.healthService.check();
    const statusCode =
      health.status === ServiceStatus.UNHEALTHY
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    res.status(statusCode).json(health);
  }
}
