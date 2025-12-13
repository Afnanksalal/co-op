CREATE TABLE "rag_files" (
	"id" uuid PRIMARY KEY NOT NULL,
	"filename" text NOT NULL,
	"storage_path" text NOT NULL,
	"content_type" text DEFAULT 'application/pdf' NOT NULL,
	"domain" varchar(50) NOT NULL,
	"sector" varchar(50) NOT NULL,
	"vector_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"last_accessed" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_rag_files_domain" ON "rag_files" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_rag_files_sector" ON "rag_files" USING btree ("sector");--> statement-breakpoint
CREATE INDEX "idx_rag_files_domain_sector" ON "rag_files" USING btree ("domain","sector");--> statement-breakpoint
CREATE INDEX "idx_rag_files_vector_status" ON "rag_files" USING btree ("vector_status");--> statement-breakpoint
CREATE INDEX "idx_rag_files_last_accessed" ON "rag_files" USING btree ("last_accessed");