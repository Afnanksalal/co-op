CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "licenses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_email" varchar(255) NOT NULL,
  "license_hash" varchar(128) NOT NULL,
  "license_prefix" varchar(32) NOT NULL,
  "plan" varchar(64) DEFAULT 'team' NOT NULL,
  "status" varchar(32) DEFAULT 'active' NOT NULL,
  "seats" integer DEFAULT 1 NOT NULL,
  "max_devices" integer DEFAULT 2 NOT NULL,
  "expires_at" timestamp,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "license_activations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "license_id" uuid NOT NULL REFERENCES "licenses"("id") ON DELETE cascade,
  "install_id" varchar(128) NOT NULL,
  "machine_fingerprint_hash" varchar(128) NOT NULL,
  "activation_token_hash" varchar(128) NOT NULL,
  "device_name" varchar(255),
  "app_version" varchar(64),
  "status" varchar(32) DEFAULT 'active' NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "activated_at" timestamp DEFAULT now() NOT NULL,
  "last_seen_at" timestamp DEFAULT now() NOT NULL,
  "deactivated_at" timestamp
);

CREATE TABLE IF NOT EXISTS "license_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "license_id" uuid REFERENCES "licenses"("id") ON DELETE cascade,
  "activation_id" uuid REFERENCES "license_activations"("id") ON DELETE set null,
  "event_type" varchar(64) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "licenses_license_hash_idx" ON "licenses" ("license_hash");
CREATE INDEX IF NOT EXISTS "licenses_customer_email_idx" ON "licenses" ("customer_email");
CREATE INDEX IF NOT EXISTS "licenses_status_idx" ON "licenses" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "license_activations_token_hash_idx" ON "license_activations" ("activation_token_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "license_activations_active_machine_idx" ON "license_activations" ("license_id", "machine_fingerprint_hash") WHERE "status" = 'active';
CREATE INDEX IF NOT EXISTS "license_activations_license_id_idx" ON "license_activations" ("license_id");
CREATE INDEX IF NOT EXISTS "license_activations_machine_idx" ON "license_activations" ("machine_fingerprint_hash");
CREATE INDEX IF NOT EXISTS "license_activations_status_idx" ON "license_activations" ("status");
CREATE INDEX IF NOT EXISTS "license_events_license_id_idx" ON "license_events" ("license_id");
CREATE INDEX IF NOT EXISTS "license_events_activation_id_idx" ON "license_events" ("activation_id");
CREATE INDEX IF NOT EXISTS "license_events_type_idx" ON "license_events" ("event_type");
