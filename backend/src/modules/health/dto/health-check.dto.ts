export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

export class HealthCheckDto {
  status: ServiceStatus;

  timestamp: string;

  version: string;

  services: Record<string, ServiceStatus>;
}
