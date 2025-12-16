import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { startups } from './startups.schema';

export const alertTypeEnum = pgEnum('alert_type', ['competitor', 'market', 'news', 'funding']);
export const alertFrequencyEnum = pgEnum('alert_frequency', ['realtime', 'daily', 'weekly']);

export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startupId: uuid('startup_id').references(() => startups.id, { onDelete: 'cascade' }),
  
  name: text('name').notNull(),
  type: alertTypeEnum('type').notNull().default('competitor'),
  
  // What to monitor
  keywords: text('keywords').array().notNull().default([]),
  competitors: text('competitors').array().notNull().default([]),
  
  // Alert settings
  frequency: alertFrequencyEnum('frequency').notNull().default('daily'),
  isActive: boolean('is_active').notNull().default(true),
  
  // Notification preferences
  emailNotify: boolean('email_notify').notNull().default(true),
  webhookNotify: boolean('webhook_notify').notNull().default(false),
  
  // Tracking
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  triggerCount: text('trigger_count').notNull().default('0'),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertResults = pgTable('alert_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  source: text('source'),
  sourceUrl: text('source_url'),
  relevanceScore: text('relevance_score'),
  
  // What triggered this result
  matchedKeywords: text('matched_keywords').array().default([]),
  matchedCompetitor: text('matched_competitor'),
  
  isRead: boolean('is_read').notNull().default(false),
  
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type AlertResult = typeof alertResults.$inferSelect;
export type NewAlertResult = typeof alertResults.$inferInsert;
