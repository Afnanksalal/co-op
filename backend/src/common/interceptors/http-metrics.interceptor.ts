import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '@/common/metrics/metrics.service';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const startTime = Date.now();

    // Increment active connections
    this.metricsService.incrementActiveConnections();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - startTime;
          this.metricsService.recordHttpRequest(
            request.method,
            request.path,
            response.statusCode,
            durationMs,
          );
          this.metricsService.decrementActiveConnections();
        },
        error: () => {
          const durationMs = Date.now() - startTime;
          // For errors, use the response status code if set, otherwise 500
          const statusCode = response.statusCode >= 400 ? response.statusCode : 500;
          this.metricsService.recordHttpRequest(
            request.method,
            request.path,
            statusCode,
            durationMs,
          );
          this.metricsService.decrementActiveConnections();
        },
      }),
    );
  }
}
