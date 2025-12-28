import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

// RAG domain types
export const RAG_DOMAINS = ['legal', 'finance'] as const;
export type RagDomain = (typeof RAG_DOMAINS)[number];

// RAG sector types - expanded for production (70+ sectors)
// Note: Database column is varchar(50), accepts any sector value
export const RAG_SECTORS = [
  // Technology & Software
  'saas', 'ai_ml', 'developer_tools', 'cybersecurity', 'cloud_infrastructure',
  'data_analytics', 'devops', 'low_code',
  // Finance
  'fintech', 'insurtech', 'wealthtech', 'regtech', 'payments', 'banking', 'crypto_web3', 'defi',
  // Health & Life Sciences
  'healthtech', 'biotech', 'medtech', 'digital_health', 'mental_health', 'pharma', 'genomics', 'telehealth',
  // Commerce & Retail
  'ecommerce', 'marketplace', 'retail_tech', 'd2c', 'supply_chain', 'logistics',
  // Sustainability & Energy
  'greentech', 'cleantech', 'climate_tech', 'renewable_energy', 'carbon_tech', 'circular_economy',
  // Real Estate & Construction
  'proptech', 'construction_tech', 'smart_buildings',
  // Education & HR
  'edtech', 'hrtech', 'workforce_tech', 'learning_platforms',
  // Media & Entertainment
  'media_entertainment', 'gaming', 'creator_economy', 'streaming', 'adtech', 'martech',
  // Food & Agriculture
  'foodtech', 'agritech', 'food_delivery', 'restaurant_tech',
  // Transportation & Mobility
  'mobility', 'automotive', 'ev_tech', 'autonomous_vehicles', 'fleet_management',
  // Legal & Government
  'legaltech', 'govtech', 'civic_tech',
  // Travel & Hospitality
  'travel_tech', 'hospitality',
  // Social & Communication
  'social', 'communication', 'community',
  // Hardware & IoT
  'hardware', 'iot', 'robotics', 'drones', 'wearables',
  // Other
  'other',
] as const;
export type RagSector = (typeof RAG_SECTORS)[number];

// RAG region types - geographic regions for jurisdiction filtering
export const RAG_REGIONS = [
  'global', 'eu', 'us', 'uk', 'india', 'apac', 'latam', 'mena', 'canada',
] as const;
export type RagRegion = (typeof RAG_REGIONS)[number];

// RAG jurisdiction types - specific regulatory frameworks
export const RAG_JURISDICTIONS = [
  'general', 'gdpr', 'ccpa', 'lgpd', 'pipeda', 'pdpa', 'dpdp',
  'sec', 'finra', 'fca', 'sebi', 'mas', 'esma',
  'hipaa', 'pci_dss', 'sox', 'aml_kyc',
  'dmca', 'patent', 'trademark', 'copyright',
  'employment', 'labor', 'corporate', 'tax', 'contracts',
] as const;
export type RagJurisdiction = (typeof RAG_JURISDICTIONS)[number];

// RAG document types
export const RAG_DOCUMENT_TYPES = [
  'regulation', 'guidance', 'case_law', 'template', 'guide', 'checklist', 'analysis', 'faq',
] as const;
export type RagDocumentType = (typeof RAG_DOCUMENT_TYPES)[number];

// Vector status types
export const VECTOR_STATUSES = ['pending', 'indexed', 'expired'] as const;
export type VectorStatus = (typeof VECTOR_STATUSES)[number];

export const ragFiles = pgTable(
  'rag_files',
  {
    id: uuid('id').primaryKey(),
    filename: text('filename').notNull(),
    storagePath: text('storage_path').notNull(),
    contentType: text('content_type').notNull().default('application/pdf'),
    domain: varchar('domain', { length: 50 }).notNull(), // legal | finance
    sector: varchar('sector', { length: 50 }).notNull(), // RAG sector (70+ sectors available)
    // New jurisdiction fields
    region: varchar('region', { length: 50 }).notNull().default('global'), // eu | us | uk | india | apac | latam | mena | canada | global
    jurisdictions: text('jurisdictions').notNull().default('general'), // Comma-separated: gdpr,ccpa,hipaa
    documentType: varchar('document_type', { length: 50 }).notNull().default('guide'), // regulation | guidance | case_law | template | guide | checklist | analysis | faq
    // Status fields
    vectorStatus: varchar('vector_status', { length: 50 }).notNull().default('pending'), // pending | indexed | expired
    chunkCount: integer('chunk_count').notNull().default(0),
    lastAccessed: timestamp('last_accessed', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rag_files_domain').on(table.domain),
    index('idx_rag_files_sector').on(table.sector),
    index('idx_rag_files_domain_sector').on(table.domain, table.sector),
    index('idx_rag_files_region').on(table.region),
    index('idx_rag_files_document_type').on(table.documentType),
    index('idx_rag_files_domain_sector_region').on(table.domain, table.sector, table.region),
    index('idx_rag_files_vector_status').on(table.vectorStatus),
    index('idx_rag_files_last_accessed').on(table.lastAccessed),
  ],
);

export type RagFile = typeof ragFiles.$inferSelect;
export type NewRagFile = typeof ragFiles.$inferInsert;
