import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, integer, decimal } from 'drizzle-orm/pg-core';
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
  
  // Alert settings
  frequency: alertFrequencyEnum('frequency').notNull().default('daily'),
  isActive: boolean('is_active').notNull().default(true),
  
  // Notification preferences
  emailNotify: boolean('email_notify').notNull().default(true),
  webhookNotify: boolean('webhook_notify').notNull().default(false),
  
  // Tracking
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
  triggerCount: integer('trigger_count').notNull().default(0),
  
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
  relevanceScore: decimal('relevance_score', { precision: 5, scale: 4 }),
  
  // What triggered this result
  matchedCompetitor: text('matched_competitor'),
  
  isRead: boolean('is_read').notNull().default(false),
  
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Junction tables for normalized data
export const alertKeywords = pgTable('alert_keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertCompetitors = pgTable('alert_competitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertId: uuid('alert_id').notNull().references(() => alerts.id, { onDelete: 'cascade' }),
  competitor: text('competitor').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const alertResultMatchedKeywords = pgTable('alert_result_matched_keywords', {
  id: uuid('id').primaryKey().defaultRandom(),
  alertResultId: uuid('alert_result_id').notNull().references(() => alertResults.id, { onDelete: 'cascade' }),
  keyword: text('keyword').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Alert = typeof alerts.$inferSelect;
export type NewAlert = typeof alerts.$inferInsert;
export type AlertResult = typeof alertResults.$inferSelect;
export type NewAlertResult = typeof alertResults.$inferInsert;
