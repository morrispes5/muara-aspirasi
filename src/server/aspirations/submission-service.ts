import { and, eq, isNull } from "drizzle-orm";

import {
  aspirationReports,
  auditEvents,
  categories,
  evidenceUploadIntents,
  reporterIdentities,
  reportEvidence,
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
import { type PreparedEvidence } from "@/server/aspirations/evidence-service";
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

export class EvidenceIntentError extends Error {
  constructor() {
    super("An evidence upload intent could not be committed.");
    this.name = "EvidenceIntentError";
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

type ReportWriteDatabase = Pick<Database, "insert" | "select" | "update">;

async function insertReport(
  database: ReportWriteDatabase,
  input: SubmissionInput,
  keyHash: string,
  preparedEvidence: PreparedEvidence[],
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

  const expectedIntentIds = input.evidence.map((item) => item.intentId);
  if (
    expectedIntentIds.length !== preparedEvidence.length ||
    expectedIntentIds.some(
      (intentId, index) => intentId !== preparedEvidence[index]?.intentId,
    )
  ) {
    throw new EvidenceIntentError();
  }

  if (preparedEvidence.length > 0) {
    const validatedAt = new Date();

    for (const evidence of preparedEvidence) {
      const [claimed] = await database
        .update(evidenceUploadIntents)
        .set({ consumedAt: validatedAt, reportId: report.id })
        .where(
          and(
            eq(evidenceUploadIntents.id, evidence.intentId),
            eq(evidenceUploadIntents.objectKey, evidence.objectKey),
            eq(evidenceUploadIntents.sizeBytes, evidence.sizeBytes),
            isNull(evidenceUploadIntents.consumedAt),
          ),
        )
        .returning({ id: evidenceUploadIntents.id });

      if (!claimed) {
        throw new EvidenceIntentError();
      }

      await database.insert(reportEvidence).values({
        checksumSha256: evidence.checksumSha256,
        mimeType: evidence.mimeType,
        objectKey: evidence.objectKey,
        originalFilename: evidence.originalFilename,
        reportId: report.id,
        sizeBytes: evidence.sizeBytes,
        validatedAt,
        validationStatus: "QUARANTINED",
      });
    }
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
    metadata:
      preparedEvidence.length > 0
        ? {
            evidenceBytes: preparedEvidence.reduce(
              (sum, evidence) => sum + evidence.sizeBytes,
              0,
            ),
            evidenceCount: preparedEvidence.length,
          }
        : undefined,
    result: "SUCCESS",
    targetId: report.id,
    targetType: "ASPIRATION_REPORT",
  });

  return { trackingCode: report.trackingCode, trackingSecret };
}

export async function submitPublicReport(
  input: SubmissionInput,
  idempotencyKey: string,
  preparedEvidence: PreparedEvidence[] = [],
  database: Database = getDatabase(),
) {
  const keyHash = idempotencyKeyHash(idempotencyKey);

  return database.transaction((transaction) =>
    insertReport(transaction, input, keyHash, preparedEvidence),
  );
}
