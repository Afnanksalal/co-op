ALTER TABLE "campaigns" ALTER COLUMN "subject_template" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "subject_template" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "body_template" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ALTER COLUMN "company_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "mode" varchar(50) DEFAULT 'single_template';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "campaign_goal" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "tone" varchar(50) DEFAULT 'professional';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "call_to_action" text;--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "target_lead_type" varchar(20) DEFAULT 'person';--> statement-breakpoint
ALTER TABLE "campaigns" ADD COLUMN "available_variables" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "lead_type" varchar(20) DEFAULT 'company';--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "name" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "platform" varchar(100);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "handle" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "followers" integer;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "niche" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "email" varchar(255);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "profile_url" varchar(500);--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "custom_fields" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "leads_type_idx" ON "leads" USING btree ("lead_type");--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "contact_name";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "contact_email";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "contact_title";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "linkedin_url";--> statement-breakpoint
ALTER TABLE "leads" DROP COLUMN "enrichment_data";