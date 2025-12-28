import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { sessions } from './sessions.schema';

/**
 * User uploaded documents - stores metadata only.
 * Content is stored encrypted in Upstash Vector (via RAG service).
 */
export const userDocuments = pgTable(
  'user_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'set null' }),
    
    // Document metadata
    filename: text('filename').notNull(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    
    // Processing status
    status: text('status').notNull().default('processing'), // processing | ready | failed | expired
    chunkCount: integer('chunk_count').notNull().default(0),
    
    // Auto-expiry settings
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isExpired: boolean('is_expired').notNull().default(false),
    
    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastAccessedAt: timestamp('last_accessed_at', { withTimezone: true }),
  },
  (table) => ({
    userIdIdx: index('user_documents_user_id_idx').on(table.userId),
    sessionIdIdx: index('user_documents_session_id_idx').on(table.sessionId),
    statusIdx: index('user_documents_status_idx').on(table.status),
    expiresAtIdx: index('user_documents_expires_at_idx').on(table.expiresAt),
  }),
);

export type UserDocument = typeof userDocuments.$inferSelect;
export type NewUserDocument = typeof userDocuments.$inferInsert;
