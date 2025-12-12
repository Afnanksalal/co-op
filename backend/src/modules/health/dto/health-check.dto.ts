import { ApiProperty } from '@nestjs/swagger';

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export class HealthCheckDto {
  @ApiProperty({ enum: ServiceStatus })
  status: ServiceStatus;

  @ApiProperty()
  timestamp: string;

  @ApiProperty()
  version: string;

  @ApiProperty({ type: 'object', additionalProperties: { enum: ServiceStatus } })
  services: Record<string, ServiceStatus>;
}
