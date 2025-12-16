import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { sessions } from './sessions.schema';

export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sessionId: uuid('session_id')
      .references(() => sessions.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id'),
    title: text('title').notNull(),
    content: text('content').notNull(),
    agent: text('agent'),
    tags: text('tags').array().default([]),
    metadata: jsonb('metadata').default({}),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('bookmarks_user_id_idx').on(table.userId),
    sessionIdIdx: index('bookmarks_session_id_idx').on(table.sessionId),
    createdAtIdx: index('bookmarks_created_at_idx').on(table.createdAt),
  }),
);

export type Bookmark = typeof bookmarks.$inferSelect;
export type NewBookmark = typeof bookmarks.$inferInsert;
