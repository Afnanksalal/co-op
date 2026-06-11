import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function getLogLevels(env: string): LogLevel[] {
  if (env === 'production') {
    return ['error', 'warn', 'log'];
  }
  return ['error', 'warn', 'log', 'debug', 'verbose'];
}

// Graceful shutdown timeout (30 seconds)
const SHUTDOWN_TIMEOUT_MS = 30000;

/**
 * Pre-flight validation for production environment
 * Fails fast if critical configuration is missing
 */
function validateProductionConfig(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) return;

  const logger = new Logger('PreFlight');
  const errors: string[] = [];

  if (!process.env.LICENSE_KEY_PEPPER || process.env.LICENSE_KEY_PEPPER.length < 32) {
    errors.push('LICENSE_KEY_PEPPER is required in production and must be at least 32 characters');
  }

  if (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS === '*') {
    errors.push('CORS_ORIGINS must be set to explicit origins in production');
  }

  // Critical: Database URL required
  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is required');
  }

  // Critical: Supabase configuration
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    errors.push('SUPABASE_URL and SUPABASE_ANON_KEY are required');
  }

  if (errors.length > 0) {
    logger.error('Production configuration validation failed:');
    errors.forEach(err => { logger.error(`  - ${err}`); });
    throw new Error(`Production configuration invalid: ${errors.join('; ')}`);
  }

  logger.log('Production configuration validated successfully');
}

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');

  // Validate production configuration before starting
  validateProductionConfig();

  const app = await NestFactory.create(AppModule, {
    logger: getLogLevels(process.env.NODE_ENV ?? 'development'),
    // In production, use JSON format for structured logging
    ...(isProduction && {
      bufferLogs: true,
    }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  const corsOrigins = configService.get<string>('CORS_ORIGINS', '*');

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));

  // CORS configuration
  app.enableCors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(',').map(o => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-CoOp-Install-Id'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  });

  app.setGlobalPrefix(apiPrefix);

  app.use((request: { requestId?: string }, response: { setHeader: (key: string, value: string) => void }, next: () => void) => {
    request.requestId = randomUUID();
    response.setHeader('X-Request-Id', request.requestId);
    next();
  });

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Enable graceful shutdown
  app.enableShutdownHooks();

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error(`Uncaught exception: ${error.message}`, error.stack);
    // Give time for logs to flush
    setTimeout(() => process.exit(1), 1000);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    logger.error(`Unhandled rejection: ${String(reason)}`);
  });

  // Graceful shutdown on SIGTERM/SIGINT
  const shutdown = async (signal: string) => {
    logger.log(`Received ${signal}, starting graceful shutdown...`);
    
    const shutdownTimer = setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    try {
      await app.close();
      clearTimeout(shutdownTimer);
      logger.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      clearTimeout(shutdownTimer);
      logger.error(`Error during shutdown: ${String(error)}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  await app.listen(port);
  logger.log(`Co-Op cloud license backend running on port ${String(port)}`);
}

void bootstrap();
