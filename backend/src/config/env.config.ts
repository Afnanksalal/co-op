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

  // Upstash QStash (serverless queue)
  QSTASH_TOKEN: z.string().optional(),
  QSTASH_CURRENT_SIGNING_KEY: z.string().optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().optional(),

  // LLM Providers (configure at least one)
  GROQ_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // Web Search Fallback (optional - ScrapingBee)
  SCRAPINGBEE_API_KEY: z.string().optional(),

  // LLM Council settings (minimum 2 required for cross-critique)
  LLM_COUNCIL_MIN_MODELS: z.string().default('2').transform(Number),
  LLM_COUNCIL_MAX_MODELS: z.string().default('2').transform(Number),

  // Notion Integration (optional - internal integration)
  NOTION_API_TOKEN: z.string().optional(),
  NOTION_DEFAULT_PAGE_ID: z.string().optional(),

  // RAG Service (for legal/finance agents)
  RAG_SERVICE_URL: z.string().optional(),
  RAG_API_KEY: z.string().optional(),

  // API Keys
  MASTER_API_KEY: z.string().optional(),

  // Encryption (for sensitive data at rest)
  ENCRYPTION_KEY: z.string().optional(), // 32-byte hex key for AES-256

  // Rate limiting
  THROTTLE_TTL: z.string().default('60').transform(Number),
  THROTTLE_LIMIT: z.string().default('100').transform(Number),

  // CORS
  CORS_ORIGINS: z.string().default('*'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'log', 'debug', 'verbose']).default('log'),

  // SendGrid Email
  SENDGRID_API_KEY: z.string().optional(),
  SENDGRID_FROM_EMAIL: z.string().default('noreply@co-op.ai'),
  SENDGRID_FROM_NAME: z.string().default('Co-Op AI'),
});

export type EnvConfig = z.infer<typeof envSchema>;
