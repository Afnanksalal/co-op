import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  API_PREFIX: z.string().default('api/v1'),

  // Database
  DATABASE_URL: z.string(),

  // Redis (Upstash)
  UPSTASH_REDIS_URL: z.string(),
  UPSTASH_REDIS_TOKEN: z.string(),

  // Auth
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // MCP
  MCP_ENDPOINT: z.string().optional(),
  MCP_API_KEY: z.string().optional(),

  // Rate limiting
  THROTTLE_TTL: z.string().default('60').transform(Number),
  THROTTLE_LIMIT: z.string().default('100').transform(Number),

  // CORS
  CORS_ORIGINS: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
});

export type EnvConfig = z.infer<typeof envSchema>;
