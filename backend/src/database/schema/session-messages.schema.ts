import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions.schema';

export const sessionMessages = pgTable(
  'session_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull(), // 'user' | 'assistant' | 'system'
    content: text('content').notNull(),
    agent: varchar('agent', { length: 100 }), // Which agent responded
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    index('session_messages_session_id_idx').on(table.sessionId),
    index('session_messages_created_at_idx').on(table.createdAt),
  ],
);

export const sessionMessagesRelations = relations(sessionMessages, ({ one }) => ({
  session: one(sessions, { fields: [sessionMessages.sessionId], references: [sessions.id] }),
}));

export type SessionMessage = typeof sessionMessages.$inferSelect;
export type NewSessionMessage = typeof sessionMessages.$inferInsert;
