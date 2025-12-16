import { pgTable, uuid, text, timestamp, boolean, jsonb, pgEnum, integer } from 'drizzle-orm/pg-core';

export const investorStageEnum = pgEnum('investor_stage', ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth']);

export const investors = pgTable('investors', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Basic info
  name: text('name').notNull(),
  description: text('description'),
  website: text('website'),
  logoUrl: text('logo_url'),
  
  // Investment details
  stage: investorStageEnum('stage').notNull(),
  sectors: text('sectors').array().notNull().default([]),
  checkSizeMin: integer('check_size_min'), // in thousands USD
  checkSizeMax: integer('check_size_max'), // in thousands USD
  
  // Location
  location: text('location').notNull(),
  regions: text('regions').array().notNull().default([]), // regions they invest in
  
  // Contact
  contactEmail: text('contact_email'),
  linkedinUrl: text('linkedin_url'),
  twitterUrl: text('twitter_url'),
  
  // Portfolio
  portfolioCompanies: text('portfolio_companies').array().default([]),
  notableExits: text('notable_exits').array().default([]),
  
  // Status
  isActive: boolean('is_active').notNull().default(true),
  isFeatured: boolean('is_featured').notNull().default(false),
  
  // Metadata
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Investor = typeof investors.$inferSelect;
export type NewInvestor = typeof investors.$inferInsert;
