import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { users } from './users.schema';
import { startups } from './startups.schema';

// Lead type - person (influencer) or company
export const LEAD_TYPES = ['person', 'company'] as const;
export type LeadType = (typeof LEAD_TYPES)[number];

// Lead status enum values
export const LEAD_STATUSES = ['new', 'enriched', 'contacted', 'replied', 'converted', 'unsubscribed'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Campaign status enum values
export const CAMPAIGN_STATUSES = ['draft', 'scheduled', 'sending', 'paused', 'completed'] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

// Campaign mode - how emails are generated
export const CAMPAIGN_MODES = ['single_template', 'ai_personalized'] as const;
export type CampaignMode = (typeof CAMPAIGN_MODES)[number];

// Email status enum values
export const EMAIL_STATUSES = ['pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/**
 * Leads table - stores discovered potential customers/influencers
 */
export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startupId: uuid('startup_id').notNull().references(() => startups.id, { onDelete: 'cascade' }),
  
  // Lead type
  leadType: varchar('lead_type', { length: 20 }).default('company').$type<LeadType>(),
  
  // For companies
  companyName: varchar('company_name', { length: 255 }),
  website: varchar('website', { length: 500 }),
  industry: varchar('industry', { length: 100 }),
  companySize: varchar('company_size', { length: 50 }),
  
  // For people/influencers
  name: varchar('name', { length: 255 }),
  platform: varchar('platform', { length: 100 }), // youtube, twitter, linkedin, instagram, tiktok
  handle: varchar('handle', { length: 255 }), // @username
  followers: integer('followers'),
  niche: varchar('niche', { length: 255 }), // tech, fitness, business, etc.
  
  // Common fields
  email: varchar('email', { length: 255 }),
  location: varchar('location', { length: 255 }),
  description: text('description'),
  profileUrl: varchar('profile_url', { length: 500 }),
  
  // Custom fields (flexible key-value for any extra data)
  customFields: jsonb('custom_fields').default({}).$type<Record<string, string>>(),
  
  // Metadata
  leadScore: integer('lead_score').default(0),
  status: varchar('status', { length: 50 }).default('new').$type<LeadStatus>(),
  source: varchar('source', { length: 100 }),
  tags: jsonb('tags').default([]).$type<string[]>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('leads_user_id_idx').on(table.userId),
  index('leads_startup_id_idx').on(table.startupId),
  index('leads_status_idx').on(table.status),
  index('leads_type_idx').on(table.leadType),
]);

/**
 * Campaigns table - stores email campaign configurations
 */
export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startupId: uuid('startup_id').notNull().references(() => startups.id, { onDelete: 'cascade' }),
  
  name: varchar('name', { length: 255 }).notNull(),
  
  // Campaign mode
  mode: varchar('mode', { length: 50 }).default('single_template').$type<CampaignMode>(),
  
  // For single_template mode - one template for all
  subjectTemplate: text('subject_template'),
  bodyTemplate: text('body_template'),
  
  // For ai_personalized mode - AI generates unique emails
  campaignGoal: text('campaign_goal'), // What you want to achieve
  tone: varchar('tone', { length: 50 }).default('professional'), // professional, casual, friendly, bold
  callToAction: text('call_to_action'), // What action you want them to take
  
  // Target lead type
  targetLeadType: varchar('target_lead_type', { length: 20 }).default('person').$type<LeadType>(),
  
  status: varchar('status', { length: 50 }).default('draft').$type<CampaignStatus>(),
  
  // Settings
  settings: jsonb('settings').default({}).$type<{
    trackOpens?: boolean;
    trackClicks?: boolean;
    dailyLimit?: number;
    includeUnsubscribeLink?: boolean;
    followUpDays?: number; // Days before follow-up
    maxFollowUps?: number;
  }>(),
  
  // Available variables for templates (auto-detected from leads)
  availableVariables: jsonb('available_variables').default([]).$type<string[]>(),
  
  // Stats (denormalized for quick access)
  stats: jsonb('stats').default({}).$type<{
    totalEmails?: number;
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
    replied?: number;
  }>(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('campaigns_user_id_idx').on(table.userId),
  index('campaigns_status_idx').on(table.status),
]);

/**
 * Campaign emails table - individual emails in a campaign
 */
export const campaignEmails = pgTable('campaign_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
  
  subject: varchar('subject', { length: 500 }).notNull(),
  body: text('body').notNull(),
  
  status: varchar('status', { length: 50 }).default('pending').$type<EmailStatus>(),
  
  // Tracking
  trackingId: varchar('tracking_id', { length: 100 }).unique(),
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  openedAt: timestamp('opened_at'),
  clickedAt: timestamp('clicked_at'),
  bouncedAt: timestamp('bounced_at'),
  
  // Error info
  errorMessage: text('error_message'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('campaign_emails_campaign_id_idx').on(table.campaignId),
  index('campaign_emails_lead_id_idx').on(table.leadId),
  index('campaign_emails_status_idx').on(table.status),
  index('campaign_emails_tracking_id_idx').on(table.trackingId),
]);

// Type exports for use in services
export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
export type Campaign = typeof campaigns.$inferSelect;
export type NewCampaign = typeof campaigns.$inferInsert;
export type CampaignEmail = typeof campaignEmails.$inferSelect;
export type NewCampaignEmail = typeof campaignEmails.$inferInsert;
