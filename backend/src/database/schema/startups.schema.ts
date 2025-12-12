import { pgTable, uuid, varchar, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions.schema';

export const startups = pgTable('startups', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const startupsRelations = relations(startups, ({ many }) => ({
  sessions: many(sessions),
}));

export type Startup = typeof startups.$inferSelect;
export type NewStartup = typeof startups.$inferInsert;
