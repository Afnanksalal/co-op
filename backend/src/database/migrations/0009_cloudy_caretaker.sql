ALTER TABLE "alert_results" ALTER COLUMN "relevance_score" SET DATA TYPE numeric(5, 4);--> statement-breakpoint
ALTER TABLE "alerts" ALTER COLUMN "trigger_count" SET DATA TYPE integer;