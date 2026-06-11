import { z } from 'zod';

/**
 * Environment configuration for the cloud license control plane.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  API_PREFIX: z.string().default('api/v1'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_SSL_REJECT_UNAUTHORIZED: z
    .enum(['true', 'false'])
    .default('true')
    .transform(value => value === 'true'),

  // Supabase
  SUPABASE_URL: z.string().min(1, 'SUPABASE_URL is required'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_KEY: z.string().optional(),

  // Licensing
  LICENSE_KEY_PEPPER: z.string().optional(),
  LICENSE_OFFLINE_GRACE_DAYS: z.coerce.number().int().min(1).max(90).default(14),

  // Rate limiting
  THROTTLE_TTL: z.coerce.number().int().min(1).max(3600).default(60),
  THROTTLE_LIMIT: z.coerce.number().int().min(1).max(10000).default(100),

  // CORS
  CORS_ORIGINS: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),

  // App URL
  APP_URL: z.string().default('http://localhost:3000'),
}).refine(
  (data) => {
    return data.NODE_ENV !== 'production' || Boolean(data.LICENSE_KEY_PEPPER && data.LICENSE_KEY_PEPPER.length >= 32);
  },
  {
    message: 'LICENSE_KEY_PEPPER is required in production and must be at least 32 characters',
    path: ['LICENSE_KEY_PEPPER'],
  }
);

export type EnvConfig = z.infer<typeof envSchema>;
