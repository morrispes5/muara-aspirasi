CREATE TYPE "advocacy_publication_status" AS ENUM('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "audit_actor_type" AS ENUM('SYSTEM', 'PUBLIC', 'BEM_USER');--> statement-breakpoint
CREATE TYPE "audit_result" AS ENUM('SUCCESS', 'DENIED', 'FAILED');--> statement-breakpoint
CREATE TYPE "bem_user_role" AS ENUM('EDITOR', 'ADVOCATE', 'ADMIN');--> statement-breakpoint
CREATE TYPE "bem_user_status" AS ENUM('ACTIVE', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "evidence_validation_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'QUARANTINED');--> statement-breakpoint
CREATE TYPE "identity_mode" AS ENUM('CONFIDENTIAL_BEM_ONLY', 'CONSENTED_LIMITED_SHARE');--> statement-breakpoint
CREATE TYPE "identity_share_scope" AS ENUM('BEM_ONLY', 'LIMITED_DESTINATION_UNIT');--> statement-breakpoint
CREATE TYPE "report_status" AS ENUM('RECEIVED', 'UNDER_REVIEW', 'NEEDS_CLARIFICATION', 'IN_COORDINATION', 'UPDATE_AVAILABLE', 'ACTION_TAKEN', 'RESOLVED', 'CANNOT_PROCESS');--> statement-breakpoint
CREATE TYPE "report_urgency" AS ENUM('LOW', 'NORMAL', 'HIGH', 'ESCALATE');--> statement-breakpoint
CREATE TYPE "student_info_category" AS ENUM('ACADEMIC', 'FACILITIES', 'OPPORTUNITY', 'EVENT', 'SERVICE', 'ANNOUNCEMENT');--> statement-breakpoint
CREATE TYPE "student_info_publication_status" AS ENUM('DRAFT', 'IN_REVIEW', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TABLE "aspiration_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"tracking_code" varchar(32) NOT NULL UNIQUE,
	"tracking_secret_hash" varchar(255) NOT NULL UNIQUE,
	"category_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"location" varchar(200) NOT NULL,
	"chronology" varchar(5000) NOT NULL,
	"impact" varchar(3000) NOT NULL,
	"suggested_solution" varchar(3000),
	"identity_mode" "identity_mode" DEFAULT 'CONFIDENTIAL_BEM_ONLY'::"identity_mode" NOT NULL,
	"ethics_accepted_at" timestamp with time zone NOT NULL,
	"privacy_notice_version" varchar(64) NOT NULL,
	"status" "report_status" DEFAULT 'RECEIVED'::"report_status" NOT NULL,
	"urgency" "report_urgency" DEFAULT 'NORMAL'::"report_urgency" NOT NULL,
	"internal_summary" varchar(3000),
	"duplicate_of_report_id" uuid,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"actor_user_id" uuid,
	"actor_type" "audit_actor_type" NOT NULL,
	"action" varchar(120) NOT NULL,
	"target_type" varchar(80) NOT NULL,
	"target_id" varchar(64) NOT NULL,
	"result" "audit_result" NOT NULL,
	"reason_code" varchar(80),
	"metadata" jsonb,
	"request_correlation_id" varchar(120),
	"ip_signal" varchar(128),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"author_user_id" uuid NOT NULL,
	"body" varchar(5000) NOT NULL,
	"deletion_reason" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"assignee_user_id" uuid,
	"route_label" varchar(160) NOT NULL,
	"assigned_by_user_id" uuid NOT NULL,
	"reason" varchar(1000),
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "report_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"object_key" varchar(512) NOT NULL UNIQUE,
	"original_filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"validation_status" "evidence_validation_status" DEFAULT 'PENDING'::"evidence_validation_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"validated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "report_evidence_size_positive" CHECK ("size_bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "report_status_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL,
	"from_status" "report_status",
	"to_status" "report_status",
	"reporter_message" varchar(3000),
	"is_reporter_visible" boolean DEFAULT false NOT NULL,
	"reason_code" varchar(80),
	"actor_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_status_events_requires_status" CHECK ("from_status" IS NOT NULL OR "to_status" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "reporter_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"report_id" uuid NOT NULL UNIQUE,
	"name" varchar(160) NOT NULL,
	"nim" varchar(32) NOT NULL,
	"email" varchar(320),
	"whatsapp" varchar(32),
	"contact_allowed" boolean DEFAULT false NOT NULL,
	"identity_share_scope" "identity_share_scope" DEFAULT 'BEM_ONLY'::"identity_share_scope" NOT NULL,
	"consent_recorded_at" timestamp with time zone,
	"consent_version" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "reporter_identities_limited_share_requires_consent" CHECK ("identity_share_scope" <> 'LIMITED_DESTINATION_UNIT' OR "consent_recorded_at" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(80) NOT NULL UNIQUE,
	"name" varchar(120) NOT NULL,
	"description" varchar(500) NOT NULL,
	"default_route_label" varchar(160) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "advocacy_update_reports" (
	"advocacy_update_id" uuid,
	"report_id" uuid,
	"linked_by_user_id" uuid NOT NULL,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "advocacy_update_reports_pk" PRIMARY KEY("advocacy_update_id","report_id")
);
--> statement-breakpoint
CREATE TABLE "advocacy_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(120) NOT NULL UNIQUE,
	"title" varchar(200) NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"body" varchar(12000) NOT NULL,
	"category_id" uuid NOT NULL,
	"progress_label" varchar(120) NOT NULL,
	"publication_status" "advocacy_publication_status" DEFAULT 'DRAFT'::"advocacy_publication_status" NOT NULL,
	"cover_media_key" varchar(512),
	"cover_alt" varchar(500),
	"source_credit" varchar(500),
	"author_user_id" uuid NOT NULL,
	"reviewer_user_id" uuid,
	"published_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "student_info_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"slug" varchar(120) NOT NULL UNIQUE,
	"title" varchar(200) NOT NULL,
	"summary" varchar(1000) NOT NULL,
	"body" varchar(12000) NOT NULL,
	"category" "student_info_category" NOT NULL,
	"publication_status" "student_info_publication_status" DEFAULT 'DRAFT'::"student_info_publication_status" NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"cover_media_key" varchar(512),
	"cover_alt" varchar(500),
	"source_url" varchar(2048),
	"source_credit" varchar(500),
	"author_user_id" uuid NOT NULL,
	"reviewer_user_id" uuid,
	"published_by_user_id" uuid,
	"scheduled_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bem_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(160) NOT NULL,
	"email" varchar(320) NOT NULL,
	"role" "bem_user_role" DEFAULT 'EDITOR'::"bem_user_role" NOT NULL,
	"status" "bem_user_status" DEFAULT 'ACTIVE'::"bem_user_status" NOT NULL,
	"created_by_user_id" uuid,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bem_users_email_normalized" CHECK ("email" = lower("email"))
);
--> statement-breakpoint
CREATE INDEX "aspiration_reports_status_submitted_at_idx" ON "aspiration_reports" ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "aspiration_reports_category_status_idx" ON "aspiration_reports" ("category_id","status");--> statement-breakpoint
CREATE INDEX "aspiration_reports_duplicate_of_report_id_idx" ON "aspiration_reports" ("duplicate_of_report_id");--> statement-breakpoint
CREATE INDEX "audit_events_target_occurred_at_idx" ON "audit_events" ("target_type","target_id","occurred_at");--> statement-breakpoint
CREATE INDEX "internal_notes_report_created_at_idx" ON "internal_notes" ("report_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "report_assignments_one_active_per_report" ON "report_assignments" ("report_id") WHERE "ended_at" IS NULL;--> statement-breakpoint
CREATE INDEX "report_assignments_assignee_ended_at_idx" ON "report_assignments" ("assignee_user_id","ended_at");--> statement-breakpoint
CREATE INDEX "report_evidence_report_created_at_idx" ON "report_evidence" ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "report_status_events_report_created_at_idx" ON "report_status_events" ("report_id","created_at");--> statement-breakpoint
CREATE INDEX "categories_active_sort_order_idx" ON "categories" ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "advocacy_update_reports_report_id_idx" ON "advocacy_update_reports" ("report_id");--> statement-breakpoint
CREATE INDEX "advocacy_updates_publication_published_at_idx" ON "advocacy_updates" ("publication_status","published_at");--> statement-breakpoint
CREATE INDEX "advocacy_updates_category_status_idx" ON "advocacy_updates" ("category_id","publication_status");--> statement-breakpoint
CREATE INDEX "student_info_posts_publication_published_at_idx" ON "student_info_posts" ("publication_status","published_at");--> statement-breakpoint
CREATE INDEX "student_info_posts_category_pinned_idx" ON "student_info_posts" ("category","is_pinned");--> statement-breakpoint
CREATE UNIQUE INDEX "bem_users_email_unique" ON "bem_users" (lower("email"));--> statement-breakpoint
CREATE INDEX "bem_users_role_status_idx" ON "bem_users" ("role","status");--> statement-breakpoint
ALTER TABLE "aspiration_reports" ADD CONSTRAINT "aspiration_reports_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_bem_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "internal_notes" ADD CONSTRAINT "internal_notes_author_user_id_bem_users_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_assignments" ADD CONSTRAINT "report_assignments_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_assignments" ADD CONSTRAINT "report_assignments_assignee_user_id_bem_users_id_fkey" FOREIGN KEY ("assignee_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_assignments" ADD CONSTRAINT "report_assignments_assigned_by_user_id_bem_users_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_evidence" ADD CONSTRAINT "report_evidence_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_status_events" ADD CONSTRAINT "report_status_events_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "report_status_events" ADD CONSTRAINT "report_status_events_actor_user_id_bem_users_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "reporter_identities" ADD CONSTRAINT "reporter_identities_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_update_reports" ADD CONSTRAINT "advocacy_update_reports_zS3iBp6mnwXb_fkey" FOREIGN KEY ("advocacy_update_id") REFERENCES "advocacy_updates"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_update_reports" ADD CONSTRAINT "advocacy_update_reports_report_id_aspiration_reports_id_fkey" FOREIGN KEY ("report_id") REFERENCES "aspiration_reports"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_update_reports" ADD CONSTRAINT "advocacy_update_reports_linked_by_user_id_bem_users_id_fkey" FOREIGN KEY ("linked_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_updates" ADD CONSTRAINT "advocacy_updates_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_updates" ADD CONSTRAINT "advocacy_updates_author_user_id_bem_users_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_updates" ADD CONSTRAINT "advocacy_updates_reviewer_user_id_bem_users_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "advocacy_updates" ADD CONSTRAINT "advocacy_updates_published_by_user_id_bem_users_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "student_info_posts" ADD CONSTRAINT "student_info_posts_author_user_id_bem_users_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "student_info_posts" ADD CONSTRAINT "student_info_posts_reviewer_user_id_bem_users_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "student_info_posts" ADD CONSTRAINT "student_info_posts_published_by_user_id_bem_users_id_fkey" FOREIGN KEY ("published_by_user_id") REFERENCES "bem_users"("id") ON DELETE RESTRICT;