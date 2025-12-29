CREATE TABLE "user_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"suspended_at" timestamp,
	"suspended_reason" varchar(500),
	"rate_limit_tier" varchar(50) DEFAULT 'standard' NOT NULL,
	"custom_rate_limit" integer,
	"usage_this_month" integer DEFAULT 0 NOT NULL,
	"usage_limit" integer DEFAULT 1000 NOT NULL,
	"usage_reset_at" timestamp DEFAULT now() NOT NULL,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "startups" ALTER COLUMN "sector" SET DEFAULT 'other';--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_settings_user_id_idx" ON "user_settings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_settings_status_idx" ON "user_settings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_settings_rate_limit_tier_idx" ON "user_settings" USING btree ("rate_limit_tier");