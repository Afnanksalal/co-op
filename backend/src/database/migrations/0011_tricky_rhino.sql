CREATE TABLE "user_document_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"chunk_index" integer NOT NULL,
	"encrypted_content" text NOT NULL,
	"embedding" text,
	"token_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid,
	"filename" text NOT NULL,
	"original_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" text DEFAULT 'processing' NOT NULL,
	"chunk_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"is_expired" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "user_document_chunks" ADD CONSTRAINT "user_document_chunks_document_id_user_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."user_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_document_chunks" ADD CONSTRAINT "user_document_chunks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_documents" ADD CONSTRAINT "user_documents_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_document_chunks_document_id_idx" ON "user_document_chunks" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "user_document_chunks_user_id_idx" ON "user_document_chunks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_document_chunks_chunk_index_idx" ON "user_document_chunks" USING btree ("chunk_index");--> statement-breakpoint
CREATE INDEX "user_documents_user_id_idx" ON "user_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_documents_session_id_idx" ON "user_documents" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "user_documents_status_idx" ON "user_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_documents_expires_at_idx" ON "user_documents" USING btree ("expires_at");