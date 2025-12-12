import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions.schema';
import { adminUsers } from './admin-users.schema';
import { logEvents } from './log-events.schema';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('user'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  (table) => [index('users_deleted_at_idx').on(table.deletedAt)],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  adminUser: one(adminUsers),
  logEvents: many(logEvents),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
