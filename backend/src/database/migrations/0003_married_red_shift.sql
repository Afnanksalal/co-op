ALTER TABLE "rag_files" ADD COLUMN "region" varchar(50) DEFAULT 'global' NOT NULL;--> statement-breakpoint
ALTER TABLE "rag_files" ADD COLUMN "jurisdictions" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "rag_files" ADD COLUMN "document_type" varchar(50) DEFAULT 'guide' NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_rag_files_region" ON "rag_files" USING btree ("region");--> statement-breakpoint
CREATE INDEX "idx_rag_files_document_type" ON "rag_files" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_rag_files_domain_sector_region" ON "rag_files" USING btree ("domain","sector","region");