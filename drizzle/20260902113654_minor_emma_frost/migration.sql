CREATE TABLE "evidence_upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"object_key" varchar(512) NOT NULL UNIQUE,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"report_id" uuid,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_upload_intents_size_valid" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880)
);
--> statement-breakpoint
CREATE TABLE "two_factor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"verified" boolean DEFAULT true NOT NULL,
	"failed_verification_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "bem_users" ADD COLUMN "two_factor_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE INDEX "evidence_upload_intents_expires_at_idx" ON "evidence_upload_intents" ("expires_at");--> statement-breakpoint
CREATE INDEX "evidence_upload_intents_report_id_idx" ON "evidence_upload_intents" ("report_id");--> statement-breakpoint
CREATE INDEX "two_factor_user_id_idx" ON "two_factor" ("user_id");--> statement-breakpoint
ALTER TABLE "evidence_upload_intents" ADD CONSTRAINT "evidence_upload_intents_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "two_factor" ADD CONSTRAINT "two_factor_user_id_bem_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "bem_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "report_evidence" DROP CONSTRAINT "report_evidence_size_positive", ADD CONSTRAINT "report_evidence_size_positive" CHECK ("size_bytes" > 0 AND "size_bytes" <= 5242880);