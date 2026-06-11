import { sql } from 'drizzle-orm';
import { pgTable, uuid, varchar, timestamp, integer, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const licenses = pgTable(
  'licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerEmail: varchar('customer_email', { length: 255 }).notNull(),
    licenseHash: varchar('license_hash', { length: 128 }).notNull(),
    licensePrefix: varchar('license_prefix', { length: 32 }).notNull(),
    plan: varchar('plan', { length: 64 }).notNull().default('team'),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    seats: integer('seats').notNull().default(1),
    maxDevices: integer('max_devices').notNull().default(2),
    expiresAt: timestamp('expires_at'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    uniqueIndex('licenses_license_hash_idx').on(table.licenseHash),
    index('licenses_customer_email_idx').on(table.customerEmail),
    index('licenses_status_idx').on(table.status),
  ],
);

export const licenseActivations = pgTable(
  'license_activations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenseId: uuid('license_id').notNull().references(() => licenses.id, { onDelete: 'cascade' }),
    installId: varchar('install_id', { length: 128 }).notNull(),
    machineFingerprintHash: varchar('machine_fingerprint_hash', { length: 128 }).notNull(),
    activationTokenHash: varchar('activation_token_hash', { length: 128 }).notNull(),
    deviceName: varchar('device_name', { length: 255 }),
    appVersion: varchar('app_version', { length: 64 }),
    status: varchar('status', { length: 32 }).notNull().default('active'),
    metadata: jsonb('metadata').notNull().default({}),
    activatedAt: timestamp('activated_at').notNull().defaultNow(),
    lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
    deactivatedAt: timestamp('deactivated_at'),
  },
  table => [
    uniqueIndex('license_activations_token_hash_idx').on(table.activationTokenHash),
    uniqueIndex('license_activations_active_machine_idx')
      .on(table.licenseId, table.machineFingerprintHash)
      .where(sql`${table.status} = 'active'`),
    index('license_activations_license_id_idx').on(table.licenseId),
    index('license_activations_machine_idx').on(table.machineFingerprintHash),
    index('license_activations_status_idx').on(table.status),
  ],
);

export const licenseEvents = pgTable(
  'license_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licenseId: uuid('license_id').references(() => licenses.id, { onDelete: 'cascade' }),
    activationId: uuid('activation_id').references(() => licenseActivations.id, { onDelete: 'set null' }),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    index('license_events_license_id_idx').on(table.licenseId),
    index('license_events_activation_id_idx').on(table.activationId),
    index('license_events_type_idx').on(table.eventType),
  ],
);

export type License = typeof licenses.$inferSelect;
export type NewLicense = typeof licenses.$inferInsert;
export type LicenseActivation = typeof licenseActivations.$inferSelect;
export type NewLicenseActivation = typeof licenseActivations.$inferInsert;
export type LicenseEvent = typeof licenseEvents.$inferSelect;
export type NewLicenseEvent = typeof licenseEvents.$inferInsert;
