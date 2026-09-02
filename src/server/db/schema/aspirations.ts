import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import {
  auditActorTypeEnum,
  auditResultEnum,
  evidenceValidationStatusEnum,
  identityModeEnum,
  identityShareScopeEnum,
  reportStatusEnum,
  reportUrgencyEnum,
} from "@/server/db/schema/enums";
import { bemUsers } from "@/server/db/schema/users";
import { categories } from "@/server/db/schema/categories";

export const aspirationReports = pgTable(
  "aspiration_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trackingCode: varchar("tracking_code", { length: 32 }).notNull().unique(),
    trackingSecretHash: varchar("tracking_secret_hash", { length: 255 })
      .notNull()
      .unique(),
    // Nullable only for compatibility with pre-M5 rows. New submissions always
    // set it before insert and the unique constraint still protects retries.
    submissionKeyHash: varchar("submission_key_hash", { length: 64 }).unique(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 200 }).notNull(),
    location: varchar("location", { length: 200 }).notNull(),
    chronology: varchar("chronology", { length: 5000 }).notNull(),
    impact: varchar("impact", { length: 3000 }).notNull(),
    suggestedSolution: varchar("suggested_solution", { length: 3000 }),
    identityMode: identityModeEnum("identity_mode")
      .default("CONFIDENTIAL_BEM_ONLY")
      .notNull(),
    ethicsAcceptedAt: timestamp("ethics_accepted_at", {
      withTimezone: true,
    }).notNull(),
    privacyNoticeVersion: varchar("privacy_notice_version", {
      length: 64,
    }).notNull(),
    status: reportStatusEnum("status").default("RECEIVED").notNull(),
    urgency: reportUrgencyEnum("urgency").default("NORMAL").notNull(),
    internalSummary: varchar("internal_summary", { length: 3000 }),
    duplicateOfReportId: uuid("duplicate_of_report_id"),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  },
  (table) => [
    index("aspiration_reports_status_submitted_at_idx").on(
      table.status,
      table.submittedAt,
    ),
    index("aspiration_reports_category_status_idx").on(
      table.categoryId,
      table.status,
    ),
    index("aspiration_reports_duplicate_of_report_id_idx").on(
      table.duplicateOfReportId,
    ),
  ],
);

/**
 * Cross-instance throttling buckets for public endpoints. Raw addresses and
 * tracking values never enter this table: `signalHash` is an HMAC digest and
 * each bucket expires after its short enforcement window.
 */
export const publicRateLimitBuckets = pgTable(
  "public_rate_limit_buckets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    scope: varchar("scope", { length: 80 }).notNull(),
    signalHash: varchar("signal_hash", { length: 64 }).notNull(),
    windowStartedAt: timestamp("window_started_at", {
      withTimezone: true,
    }).notNull(),
    attemptCount: integer("attempt_count").default(1).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("public_rate_limit_buckets_scope_signal_window_key").on(
      table.scope,
      table.signalHash,
      table.windowStartedAt,
    ),
    index("public_rate_limit_buckets_expires_at_idx").on(table.expiresAt),
  ],
);

export const reporterIdentities = pgTable(
  "reporter_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .unique()
      .references(() => aspirationReports.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    nim: varchar("nim", { length: 32 }).notNull(),
    email: varchar("email", { length: 320 }),
    whatsapp: varchar("whatsapp", { length: 32 }),
    contactAllowed: boolean("contact_allowed").default(false).notNull(),
    identityShareScope: identityShareScopeEnum("identity_share_scope")
      .default("BEM_ONLY")
      .notNull(),
    consentRecordedAt: timestamp("consent_recorded_at", { withTimezone: true }),
    consentVersion: varchar("consent_version", { length: 64 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "reporter_identities_limited_share_requires_consent",
      sql`${table.identityShareScope} <> 'LIMITED_DESTINATION_UNIT' OR ${table.consentRecordedAt} IS NOT NULL`,
    ),
  ],
);

export const reportEvidence = pgTable(
  "report_evidence",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => aspirationReports.id, { onDelete: "restrict" }),
    objectKey: varchar("object_key", { length: 512 }).notNull().unique(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    checksumSha256: varchar("checksum_sha256", { length: 64 }).notNull(),
    validationStatus: evidenceValidationStatusEnum("validation_status")
      .default("PENDING")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    validatedAt: timestamp("validated_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "report_evidence_size_positive",
      sql`${table.sizeBytes} > 0 AND ${table.sizeBytes} <= 5242880`,
    ),
    index("report_evidence_report_created_at_idx").on(
      table.reportId,
      table.createdAt,
    ),
  ],
);

/**
 * Short-lived server-issued handles for direct private R2 uploads. The object
 * key is deliberately kept server-side; the browser only receives `id` and a
 * presigned URL. A handle can be consumed once when the report is committed.
 */
export const evidenceUploadIntents = pgTable(
  "evidence_upload_intents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectKey: varchar("object_key", { length: 512 }).notNull().unique(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    reportId: uuid("report_id").references(() => aspirationReports.id, {
      onDelete: "restrict",
    }),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "evidence_upload_intents_size_valid",
      sql`${table.sizeBytes} > 0 AND ${table.sizeBytes} <= 5242880`,
    ),
    index("evidence_upload_intents_expires_at_idx").on(table.expiresAt),
    index("evidence_upload_intents_report_id_idx").on(table.reportId),
  ],
);

export const reportStatusEvents = pgTable(
  "report_status_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => aspirationReports.id, { onDelete: "restrict" }),
    fromStatus: reportStatusEnum("from_status"),
    toStatus: reportStatusEnum("to_status"),
    reporterMessage: varchar("reporter_message", { length: 3000 }),
    isReporterVisible: boolean("is_reporter_visible").default(false).notNull(),
    reasonCode: varchar("reason_code", { length: 80 }),
    actorUserId: uuid("actor_user_id").references(() => bemUsers.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    check(
      "report_status_events_requires_status",
      sql`${table.fromStatus} IS NOT NULL OR ${table.toStatus} IS NOT NULL`,
    ),
    index("report_status_events_report_created_at_idx").on(
      table.reportId,
      table.createdAt,
    ),
  ],
);

export const internalNotes = pgTable(
  "internal_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => aspirationReports.id, { onDelete: "restrict" }),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => bemUsers.id, { onDelete: "restrict" }),
    body: varchar("body", { length: 5000 }).notNull(),
    deletionReason: varchar("deletion_reason", { length: 500 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("internal_notes_report_created_at_idx").on(
      table.reportId,
      table.createdAt,
    ),
  ],
);

export const reportAssignments = pgTable(
  "report_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => aspirationReports.id, { onDelete: "restrict" }),
    assigneeUserId: uuid("assignee_user_id").references(() => bemUsers.id, {
      onDelete: "restrict",
    }),
    routeLabel: varchar("route_label", { length: 160 }).notNull(),
    assignedByUserId: uuid("assigned_by_user_id")
      .notNull()
      .references(() => bemUsers.id, { onDelete: "restrict" }),
    reason: varchar("reason", { length: 1000 }),
    assignedAt: timestamp("assigned_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("report_assignments_one_active_per_report")
      .on(table.reportId)
      .where(sql`${table.endedAt} IS NULL`),
    index("report_assignments_assignee_ended_at_idx").on(
      table.assigneeUserId,
      table.endedAt,
    ),
  ],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => bemUsers.id, {
      onDelete: "restrict",
    }),
    actorType: auditActorTypeEnum("actor_type").notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    targetType: varchar("target_type", { length: 80 }).notNull(),
    targetId: varchar("target_id", { length: 64 }).notNull(),
    result: auditResultEnum("result").notNull(),
    reasonCode: varchar("reason_code", { length: 80 }),
    metadata:
      jsonb("metadata").$type<
        Record<string, string | number | boolean | null>
      >(),
    requestCorrelationId: varchar("request_correlation_id", { length: 120 }),
    ipSignal: varchar("ip_signal", { length: 128 }),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("audit_events_target_occurred_at_idx").on(
      table.targetType,
      table.targetId,
      table.occurredAt,
    ),
  ],
);
