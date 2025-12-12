import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions.schema';

export const startups = pgTable(
  'startups',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  (table) => [index('startups_deleted_at_idx').on(table.deletedAt)],
);

export const startupsRelations = relations(startups, ({ many }) => ({
  sessions: many(sessions),
}));

export type Startup = typeof startups.$inferSelect;
export type NewStartup = typeof startups.$inferInsert;
