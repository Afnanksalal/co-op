import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

function getLogLevels(env: string): LogLevel[] {
  if (env === 'production') {
    return ['error', 'warn', 'log'];
  }
  return ['error', 'warn', 'log', 'debug', 'verbose'];
}

async function bootstrap(): Promise<void> {
  const isProduction = process.env.NODE_ENV === 'production';
  const logger = new Logger('Bootstrap');

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

  app.use(helmet());

  app.enableCors({
    origin: corsOrigins === '*' ? '*' : corsOrigins.split(','),
    credentials: true,
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  if (configService.get('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Co-Op API')
      .setDescription('Co-Op Platform Backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  app.enableShutdownHooks();

  await app.listen(port);
  logger.log(`🚀 Co-Op Backend running on port ${String(port)}`);
  logger.log(`📚 API Docs: http://localhost:${String(port)}/docs`);
}

void bootstrap();
