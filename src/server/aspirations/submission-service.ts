import { and, eq } from "drizzle-orm";

import {
  aspirationReports,
  auditEvents,
  categories,
  reporterIdentities,
  reportStatusEvents,
} from "@/server/db/schema";
import {
  createTrackingCode,
  createTrackingSecret,
  hashOpaqueValue,
  hashTrackingSecret,
  privacyNoticeVersion,
} from "@/server/aspirations/tracking";
import { type Database, getDatabase } from "@/server/db/client";
import { requireConfiguredSecret } from "@/server/config/secret-policy";
import { type SubmissionInput } from "@/server/aspirations/validation";

export class InactiveCategoryError extends Error {
  constructor() {
    super("Selected category is not active.");
    this.name = "InactiveCategoryError";
  }
}

export class DuplicateSubmissionError extends Error {
  constructor() {
    super("A submission already exists for this idempotency key.");
    this.name = "DuplicateSubmissionError";
  }
}

function idempotencyKeyHash(key: string) {
  // Same rule as the rate limiter: the committed template salt must never be
  // accepted, or idempotency hashes become computable from the public source.
  const secret = requireConfiguredSecret(
    process.env.PUBLIC_ABUSE_SIGNAL_SECRET,
    "PUBLIC_ABUSE_SIGNAL_SECRET",
  );

  return hashOpaqueValue(`submission:${key}`, secret);
}

type ReportWriteDatabase = Pick<Database, "insert" | "select">;

async function insertReport(
  database: ReportWriteDatabase,
  input: SubmissionInput,
  keyHash: string,
) {
  const [category] = await database
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(eq(categories.id, input.categoryId), eq(categories.isActive, true)),
    )
    .limit(1);

  if (!category) {
    throw new InactiveCategoryError();
  }

  const [existing] = await database
    .select({ id: aspirationReports.id })
    .from(aspirationReports)
    .where(eq(aspirationReports.submissionKeyHash, keyHash))
    .limit(1);

  if (existing) {
    throw new DuplicateSubmissionError();
  }

  const trackingCode = createTrackingCode();
  const trackingSecret = createTrackingSecret();
  const trackingSecretHash = await hashTrackingSecret(trackingSecret);

  const [report] = await database
    .insert(aspirationReports)
    .values({
      categoryId: category.id,
      chronology: input.chronology,
      ethicsAcceptedAt: new Date(),
      identityMode: input.identityMode,
      impact: input.impact,
      location: input.location,
      privacyNoticeVersion,
      status: "RECEIVED",
      submissionKeyHash: keyHash,
      suggestedSolution: input.suggestedSolution,
      title: input.title,
      trackingCode,
      trackingSecretHash,
    })
    .returning({
      id: aspirationReports.id,
      trackingCode: aspirationReports.trackingCode,
    });

  if (!report) {
    throw new Error("Report insertion did not return a report.");
  }

  await database.insert(reporterIdentities).values({
    consentRecordedAt:
      input.identityMode === "CONSENTED_LIMITED_SHARE" ? new Date() : null,
    consentVersion:
      input.identityMode === "CONSENTED_LIMITED_SHARE"
        ? privacyNoticeVersion
        : null,
    contactAllowed: input.contactAllowed,
    email: input.email,
    identityShareScope:
      input.identityMode === "CONSENTED_LIMITED_SHARE"
        ? "LIMITED_DESTINATION_UNIT"
        : "BEM_ONLY",
    name: input.name,
    nim: input.nim,
    reportId: report.id,
    whatsapp: input.whatsapp,
  });

  await database.insert(reportStatusEvents).values({
    isReporterVisible: true,
    reporterMessage:
      "Laporan diterima. BEM akan memverifikasi ruang lingkup dan kelengkapannya.",
    reportId: report.id,
    toStatus: "RECEIVED",
  });

  await database.insert(auditEvents).values({
    action: "PUBLIC_REPORT_SUBMITTED",
    actorType: "PUBLIC",
    result: "SUCCESS",
    targetId: report.id,
    targetType: "ASPIRATION_REPORT",
  });

  return { trackingCode: report.trackingCode, trackingSecret };
}

export async function submitPublicReport(
  input: SubmissionInput,
  idempotencyKey: string,
  database: Database = getDatabase(),
) {
  const keyHash = idempotencyKeyHash(idempotencyKey);

  return database.transaction((transaction) =>
    insertReport(transaction, input, keyHash),
  );
}
