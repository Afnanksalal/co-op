CREATE TYPE "public"."alert_frequency" AS ENUM('realtime', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('competitor', 'market', 'news', 'funding');--> statement-breakpoint
CREATE TABLE "alert_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"alert_id" uuid NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source" text,
	"source_url" text,
	"relevance_score" text,
	"matched_keywords" text[] DEFAULT '{}',
	"matched_competitor" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"startup_id" uuid,
	"name" text NOT NULL,
	"type" "alert_type" DEFAULT 'competitor' NOT NULL,
	"keywords" text[] DEFAULT '{}' NOT NULL,
	"competitors" text[] DEFAULT '{}' NOT NULL,
	"frequency" "alert_frequency" DEFAULT 'daily' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"email_notify" boolean DEFAULT true NOT NULL,
	"webhook_notify" boolean DEFAULT false NOT NULL,
	"last_checked_at" timestamp with time zone,
	"last_triggered_at" timestamp with time zone,
	"trigger_count" text DEFAULT '0' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alert_results" ADD CONSTRAINT "alert_results_alert_id_alerts_id_fk" FOREIGN KEY ("alert_id") REFERENCES "public"."alerts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_startup_id_startups_id_fk" FOREIGN KEY ("startup_id") REFERENCES "public"."startups"("id") ON DELETE cascade ON UPDATE no action;