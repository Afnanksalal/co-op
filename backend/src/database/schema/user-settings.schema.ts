import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users.schema';

/**
 * User settings for status management and admin notes.
 * Usage tracking is handled via Redis (pilot limits).
 * Separate from users table to avoid bloating the main user record.
 */
export const userSettings = pgTable(
  'user_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
    
    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, suspended
    suspendedAt: timestamp('suspended_at'),
    suspendedReason: varchar('suspended_reason', { length: 500 }),
    
    // Admin notes
    adminNotes: varchar('admin_notes', { length: 1000 }),
    
    // Activity tracking
    lastActiveAt: timestamp('last_active_at'),
    
    // Timestamps
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('user_settings_user_id_idx').on(table.userId),
    index('user_settings_status_idx').on(table.status),
  ],
);

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));

export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;

/**
 * Pilot plan limits - these are the EXISTING limits enforced via Redis
 * Admin can view and reset these, but not change the limits (code-defined)
 */
export const PILOT_LIMITS = {
  agentRequests: { limit: 3, period: 'month', key: 'usage' }, // usage:{userId}:{YYYY-MM}
  apiKeys: { limit: 1, period: 'total' },
  webhooks: { limit: 1, period: 'total' },
  leads: { limit: 50, period: 'total' },
  campaigns: { limit: 5, period: 'total' },
  emailsPerDay: { limit: 50, period: 'day' },
} as const;

export type PilotLimitType = keyof typeof PILOT_LIMITS;
