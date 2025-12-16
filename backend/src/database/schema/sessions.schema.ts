import { pgTable, uuid, varchar, jsonb, timestamp, index, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';
import { startups } from './startups.schema';
import { sessionMessages } from './session-messages.schema';

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    startupId: uuid('startup_id').notNull().references(() => startups.id, { onDelete: 'cascade' }),
    title: varchar('title', { length: 255 }), // User-editable session title
    status: varchar('status', { length: 50 }).notNull().default('active'),
    isPinned: boolean('is_pinned').notNull().default(false), // Favorite/pin sessions
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  (table) => [
    index('sessions_deleted_at_idx').on(table.deletedAt),
    index('sessions_is_pinned_idx').on(table.isPinned),
  ],
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  startup: one(startups, { fields: [sessions.startupId], references: [startups.id] }),
  messages: many(sessionMessages),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
