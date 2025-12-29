DROP INDEX "user_settings_rate_limit_tier_idx";--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "admin_notes" varchar(1000);--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "rate_limit_tier";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "custom_rate_limit";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "usage_this_month";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "usage_limit";--> statement-breakpoint
ALTER TABLE "user_settings" DROP COLUMN "usage_reset_at";