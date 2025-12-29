import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions.schema';
import { adminUsers } from './admin-users.schema';
import { userSettings } from './user-settings.schema';
import { logEvents } from './log-events.schema';
import { startups } from './startups.schema';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    name: varchar('name', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull().default('user'),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    authProvider: varchar('auth_provider', { length: 50 }), // 'google' | 'github'
    onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
    startupId: uuid('startup_id').references(() => startups.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'), // Soft delete
  },
  (table) => [
    index('users_deleted_at_idx').on(table.deletedAt),
    index('users_startup_id_idx').on(table.startupId),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  adminUser: one(adminUsers),
  settings: one(userSettings),
  logEvents: many(logEvents),
  startup: one(startups, { fields: [users.startupId], references: [startups.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
