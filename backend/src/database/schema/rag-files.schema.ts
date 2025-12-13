import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

// RAG domain types
export const RAG_DOMAINS = ['legal', 'finance'] as const;
export type RagDomain = (typeof RAG_DOMAINS)[number];

// RAG sector types
export const RAG_SECTORS = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] as const;
export type RagSector = (typeof RAG_SECTORS)[number];

// Vector status types
export const VECTOR_STATUSES = ['pending', 'indexed', 'expired'] as const;
export type VectorStatus = (typeof VECTOR_STATUSES)[number];

export const ragFiles = pgTable(
  'rag_files',
  {
    id: uuid('id').primaryKey(),
    filename: text('filename').notNull(),
    storagePath: text('storage_path').notNull(),
    contentType: text('content_type').notNull().default('application/pdf'),
    domain: varchar('domain', { length: 50 }).notNull(), // legal | finance
    sector: varchar('sector', { length: 50 }).notNull(), // fintech | greentech | healthtech | saas | ecommerce
    vectorStatus: varchar('vector_status', { length: 50 }).notNull().default('pending'), // pending | indexed | expired
    chunkCount: integer('chunk_count').notNull().default(0),
    lastAccessed: timestamp('last_accessed', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rag_files_domain').on(table.domain),
    index('idx_rag_files_sector').on(table.sector),
    index('idx_rag_files_domain_sector').on(table.domain, table.sector),
    index('idx_rag_files_vector_status').on(table.vectorStatus),
    index('idx_rag_files_last_accessed').on(table.lastAccessed),
  ],
);

export type RagFile = typeof ragFiles.$inferSelect;
export type NewRagFile = typeof ragFiles.$inferInsert;
