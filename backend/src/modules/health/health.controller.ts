import { Controller, Get, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';
import { HealthCheckDto, ServiceStatus } from './dto/health-check.dto';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check(@Res() res: Response): Promise<void> {
    const health = await this.healthService.check();
    const statusCode =
      health.status === ServiceStatus.UNHEALTHY
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.OK;
    res.status(statusCode).json(health);
  }
}
