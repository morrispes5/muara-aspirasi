CREATE TABLE "privacy_deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"source" varchar(32) DEFAULT 'BEM_MAILBOX' NOT NULL,
	"request_category" varchar(80) NOT NULL,
	"status" varchar(32) DEFAULT 'RECEIVED' NOT NULL,
	"recorded_by_user_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"resolution_code" varchar(80)
);
--> statement-breakpoint
CREATE TABLE "report_retention_holds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"reason_code" varchar(80) NOT NULL,
	"placed_by_user_id" uuid NOT NULL,
	"placed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"released_by_user_id" uuid,
	"released_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "retention_review_queue" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL UNIQUE,
	"eligible_at" timestamp with time zone NOT NULL,
	"status" varchar(32) DEFAULT 'PENDING' NOT NULL,
	"reviewed_by_user_id" uuid,
	"reviewed_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aspiration_reports" ADD COLUMN "closed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "aspiration_reports" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "aspiration_reports" ADD COLUMN "deletion_reason_code" varchar(80);--> statement-breakpoint
UPDATE "aspiration_reports"
SET "closed_at" = COALESCE("resolved_at", "updated_at")
WHERE "closed_at" IS NULL
  AND "status" IN ('RESOLVED', 'CANNOT_PROCESS');--> statement-breakpoint
CREATE INDEX "aspiration_reports_retention_candidate_idx" ON "aspiration_reports" ("closed_at","deleted_at");--> statement-breakpoint
CREATE INDEX "privacy_deletion_requests_status_recorded_at_idx" ON "privacy_deletion_requests" ("status","recorded_at");--> statement-breakpoint
CREATE INDEX "privacy_deletion_requests_report_id_idx" ON "privacy_deletion_requests" ("report_id");--> statement-breakpoint
CREATE UNIQUE INDEX "report_retention_holds_one_active_per_report" ON "report_retention_holds" ("report_id") WHERE "released_at" IS NULL;--> statement-breakpoint
CREATE INDEX "report_retention_holds_report_placed_at_idx" ON "report_retention_holds" ("report_id","placed_at");--> statement-breakpoint
CREATE INDEX "retention_review_queue_status_eligible_at_idx" ON "retention_review_queue" ("status","eligible_at");--> statement-breakpoint
ALTER TABLE "privacy_deletion_requests" ADD CONSTRAINT "privacy_deletion_requests_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "privacy_deletion_requests" ADD CONSTRAINT "privacy_deletion_requests_recorded_by_user_id_bem_users_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "privacy_deletion_requests" ADD CONSTRAINT "privacy_deletion_requests_approved_by_user_id_bem_users_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_retention_holds" ADD CONSTRAINT "report_retention_holds_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_retention_holds" ADD CONSTRAINT "report_retention_holds_placed_by_user_id_bem_users_id_fkey" FOREIGN KEY ("placed_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_retention_holds" ADD CONSTRAINT "report_retention_holds_released_by_user_id_bem_users_id_fkey" FOREIGN KEY ("released_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "retention_review_queue" ADD CONSTRAINT "retention_review_queue_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "retention_review_queue" ADD CONSTRAINT "retention_review_queue_reviewed_by_user_id_bem_users_id_fkey" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;
