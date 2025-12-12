import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  API_PREFIX: z.string().default('api/v1'),

  // Database
  DATABASE_URL: z.string(),

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('documents'),

  // Upstash Redis - REST API (for @upstash/redis caching)
  UPSTASH_REDIS_URL: z.string(),
  UPSTASH_REDIS_TOKEN: z.string(),

  // Upstash Redis - Standard connection (for BullMQ queues)
  UPSTASH_REDIS_HOST: z.string(),
  UPSTASH_REDIS_PORT: z.string().default('6379').transform(Number),
  UPSTASH_REDIS_PASSWORD: z.string(),

  // LLM Providers (configure at least one)
  GROQ_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // LLM Council settings
  LLM_COUNCIL_MIN_MODELS: z.string().default('3').transform(Number),
  LLM_COUNCIL_MAX_MODELS: z.string().default('5').transform(Number),

  // MCP (optional)
  MCP_ENDPOINT: z.string().optional(),
  MCP_API_KEY: z.string().optional(),

  // API Keys
  MASTER_API_KEY: z.string().optional(),

  // Rate limiting
  THROTTLE_TTL: z.string().default('60').transform(Number),
  THROTTLE_LIMIT: z.string().default('100').transform(Number),

  // CORS
  CORS_ORIGINS: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),
});

export type EnvConfig = z.infer<typeof envSchema>;
