import { pgTable, uuid, varchar, text, integer, timestamp, index, decimal } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions.schema';
import { users } from './users.schema';

export const startups = pgTable(
  'startups',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // === FOUNDER INFO ===
    founderName: varchar('founder_name', { length: 255 }).notNull(),
    founderRole: varchar('founder_role', { length: 100 }).notNull(), // CEO, CTO, etc.

    // === COMPANY BASICS ===
    companyName: varchar('company_name', { length: 255 }).notNull(),
    tagline: varchar('tagline', { length: 500 }), // One-liner pitch
    description: text('description').notNull(), // Detailed description
    website: varchar('website', { length: 500 }),

    // === BUSINESS CLASSIFICATION ===
    industry: varchar('industry', { length: 100 }).notNull(), // Primary industry
    sector: varchar('sector', { length: 50 }).notNull().default('saas'), // RAG sector for document filtering (70+ sectors)
    businessModel: varchar('business_model', { length: 100 }).notNull(), // B2B, B2C, B2B2C, Marketplace, etc.
    revenueModel: varchar('revenue_model', { length: 100 }), // Subscription, Transaction, Freemium, etc.

    // === COMPANY STAGE ===
    stage: varchar('stage', { length: 100 }).notNull(), // Idea, MVP, Growth, Scale
    foundedYear: integer('founded_year').notNull(),
    launchDate: timestamp('launch_date'), // When product launched (if applicable)

    // === TEAM ===
    teamSize: varchar('team_size', { length: 50 }).notNull(), // 1-5, 6-20, 21-50, 51-200, 200+
    cofounderCount: integer('cofounder_count').notNull().default(1),

    // === LOCATION ===
    country: varchar('country', { length: 100 }).notNull(),
    city: varchar('city', { length: 100 }),
    operatingRegions: varchar('operating_regions', { length: 500 }), // Comma-separated regions

    // === FINANCIALS ===
    fundingStage: varchar('funding_stage', { length: 100 }), // Bootstrapped, Pre-seed, Seed, Series A, etc.
    totalRaised: decimal('total_raised', { precision: 15, scale: 2 }), // In USD
    monthlyRevenue: decimal('monthly_revenue', { precision: 15, scale: 2 }), // MRR in USD
    isRevenue: varchar('is_revenue', { length: 20 }).notNull().default('no'), // yes, no, pre_revenue

    // === TARGET MARKET ===
    targetCustomer: text('target_customer'), // Who is the ideal customer
    problemSolved: text('problem_solved'), // What problem does it solve
    competitiveAdvantage: text('competitive_advantage'), // What makes it unique

    // === TIMESTAMPS ===
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    index('startups_deleted_at_idx').on(table.deletedAt),
    index('startups_industry_idx').on(table.industry),
    index('startups_stage_idx').on(table.stage),
    index('startups_funding_stage_idx').on(table.fundingStage),
    index('startups_country_idx').on(table.country),
  ],
);

export const startupsRelations = relations(startups, ({ many }) => ({
  sessions: many(sessions),
  founders: many(users),
}));

export type Startup = typeof startups.$inferSelect;
export type NewStartup = typeof startups.$inferInsert;
