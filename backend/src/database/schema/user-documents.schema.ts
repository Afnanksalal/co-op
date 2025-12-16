import { pgTable, uuid, text, timestamp, integer, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { sessions } from './sessions.schema';

/**
 * User uploaded documents - stores metadata only, NOT the original file.
 * Original files are processed, chunked, encrypted, then deleted.
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
    
    // Document metadata (safe to store)
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

/**
 * Encrypted document chunks - stores encrypted text content.
 * Embeddings are stored separately and are NOT encrypted (they don't reveal content).
 */
export const userDocumentChunks = pgTable(
  'user_document_chunks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id')
      .notNull()
      .references(() => userDocuments.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    
    // Chunk metadata
    chunkIndex: integer('chunk_index').notNull(),
    
    // ENCRYPTED content - AES-256-GCM encrypted text
    // Format: iv:authTag:ciphertext (hex encoded)
    encryptedContent: text('encrypted_content').notNull(),
    
    // Embedding vector (NOT encrypted - embeddings don't reveal original content)
    // Stored as JSON array of floats
    embedding: text('embedding'),
    
    // Metadata for search (non-sensitive)
    tokenCount: integer('token_count'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index('user_document_chunks_document_id_idx').on(table.documentId),
    userIdIdx: index('user_document_chunks_user_id_idx').on(table.userId),
    chunkIndexIdx: index('user_document_chunks_chunk_index_idx').on(table.chunkIndex),
  }),
);

export type UserDocument = typeof userDocuments.$inferSelect;
export type NewUserDocument = typeof userDocuments.$inferInsert;
export type UserDocumentChunk = typeof userDocumentChunks.$inferSelect;
export type NewUserDocumentChunk = typeof userDocumentChunks.$inferInsert;
