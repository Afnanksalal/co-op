import { pgTable, uuid, varchar, text, jsonb, boolean, timestamp } from 'drizzle-orm/pg-core';

export const mcpIntegrations = pgTable('mcp_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  config: jsonb('config').notNull().default({}),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export type McpIntegration = typeof mcpIntegrations.$inferSelect;
export type NewMcpIntegration = typeof mcpIntegrations.$inferInsert;
