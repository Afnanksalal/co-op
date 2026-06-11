import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';
export const DATABASE_POOL = 'DATABASE_POOL';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const logger = new Logger('DatabasePool');

        const pool = new Pool({
          connectionString: configService.get<string>('DATABASE_URL'),
          ssl: isProduction
            ? { rejectUnauthorized: configService.get<boolean>('DATABASE_SSL_REJECT_UNAUTHORIZED', true) }
            : false,
          max: isProduction ? 20 : 10,
          min: isProduction ? 5 : 2,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000,
          maxUses: 7500,
        });

        pool.on('connect', () => {
          logger.debug('New database connection established');
        });

        pool.on('error', (err) => {
          logger.error('Database pool error', err);
        });

        pool.on('remove', () => {
          logger.debug('Database connection removed from pool');
        });

        return pool;
      },
    },
    {
      provide: DATABASE_CONNECTION,
      inject: [DATABASE_POOL],
      useFactory: (pool: Pool): NodePgDatabase<typeof schema> => {
        return drizzle(pool, { schema });
      },
    },
  ],
  exports: [DATABASE_CONNECTION, DATABASE_POOL],
})
export class DatabaseModule {}
