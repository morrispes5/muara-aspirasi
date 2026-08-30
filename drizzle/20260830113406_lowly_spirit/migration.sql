CREATE TABLE "public_rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"scope" varchar(80) NOT NULL,
	"signal_hash" varchar(64) NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"attempt_count" integer DEFAULT 1 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aspiration_reports" ADD COLUMN "submission_key_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "aspiration_reports" ADD CONSTRAINT "aspiration_reports_submission_key_hash_key" UNIQUE("submission_key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "public_rate_limit_buckets_scope_signal_window_key" ON "public_rate_limit_buckets" ("scope","signal_hash","window_started_at");--> statement-breakpoint
CREATE INDEX "public_rate_limit_buckets_expires_at_idx" ON "public_rate_limit_buckets" ("expires_at");