ALTER TABLE "sessions" ADD COLUMN "is_pinned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "sessions_is_pinned_idx" ON "sessions" USING btree ("is_pinned");