import { and, eq, inArray, isNotNull, isNull, lt } from "drizzle-orm";
import { randomBytes } from "node:crypto";

import {
  aspirationReports,
  auditEvents,
  evidenceUploadIntents,
  internalNotes,
  privacyDeletionRequests,
  reportAssignments,
  reporterIdentities,
  reportEvidence,
  reportRetentionHolds,
  reportStatusEvents,
  retentionReviewQueue,
} from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";
import { deleteEvidenceObject, isR2EvidenceEnabled } from "@/server/storage/r2";

export const RETENTION_MONTHS = 12;
export const terminalRetentionStatuses = [
  "RESOLVED",
  "CANNOT_PROCESS",
] as const;

export type DeletionRequestStatus =
  "RECEIVED" | "VERIFIED" | "APPROVED" | "COMPLETED";

export class PrivacyRetentionError extends Error {
  constructor(
    public readonly code:
      | "CONFLICT"
      | "EVIDENCE_STORAGE_DISABLED"
      | "HOLD_ACTIVE"
      | "INVALID_STATUS"
      | "NOT_FOUND"
      | "VALIDATION_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "PrivacyRetentionError";
  }
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

export function retentionEligibleAt(closedAt: Date) {
  return addMonths(closedAt, RETENTION_MONTHS);
}

export function isRetentionEligible(closedAt: Date, now = new Date()) {
  return retentionEligibleAt(closedAt).getTime() <= now.getTime();
}

export function canTransitionDeletionRequest(
  from: DeletionRequestStatus,
  to: DeletionRequestStatus,
) {
  return (
    (from === "RECEIVED" && to === "VERIFIED") ||
    (from === "VERIFIED" && to === "APPROVED") ||
    (from === "APPROVED" && to === "COMPLETED")
  );
}

function requireReasonCode(value: string) {
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9_]{3,80}$/.test(normalized)) {
    throw new PrivacyRetentionError(
      "VALIDATION_ERROR",
      "Kode alasan harus berisi 3–80 huruf kapital, angka, atau garis bawah.",
    );
  }
  return normalized;
}

async function requireReport(reportId: string, database: Database) {
  const [report] = await database
    .select({
      deletedAt: aspirationReports.deletedAt,
      id: aspirationReports.id,
    })
    .from(aspirationReports)
    .where(eq(aspirationReports.id, reportId))
    .limit(1);

  if (!report) {
    throw new PrivacyRetentionError("NOT_FOUND", "Laporan tidak ditemukan.");
  }
  if (report.deletedAt) {
    throw new PrivacyRetentionError(
      "CONFLICT",
      "Laporan sudah dihapus sesuai kebijakan retensi.",
    );
  }
}

async function requireNoActiveHold(reportId: string, database: Database) {
  const [hold] = await database
    .select({ id: reportRetentionHolds.id })
    .from(reportRetentionHolds)
    .where(
      and(
        eq(reportRetentionHolds.reportId, reportId),
        isNull(reportRetentionHolds.releasedAt),
      ),
    )
    .limit(1);

  if (hold) {
    throw new PrivacyRetentionError(
      "HOLD_ACTIVE",
      "Laporan memiliki hold aktif dan tidak boleh dihapus.",
    );
  }
}

/** Enqueue only—this routine never removes a report or its evidence. */
export async function enqueueRetentionCandidates(
  database: Database = getDatabase(),
  now = new Date(),
) {
  const cutoff = addMonths(now, -RETENTION_MONTHS);
  const rows = await database
    .select({ closedAt: aspirationReports.closedAt, id: aspirationReports.id })
    .from(aspirationReports)
    .leftJoin(
      reportRetentionHolds,
      and(
        eq(reportRetentionHolds.reportId, aspirationReports.id),
        isNull(reportRetentionHolds.releasedAt),
      ),
    )
    .leftJoin(
      retentionReviewQueue,
      eq(retentionReviewQueue.reportId, aspirationReports.id),
    )
    .where(
      and(
        inArray(aspirationReports.status, terminalRetentionStatuses),
        isNotNull(aspirationReports.closedAt),
        lt(aspirationReports.closedAt, cutoff),
        isNull(aspirationReports.deletedAt),
        isNull(reportRetentionHolds.id),
        isNull(retentionReviewQueue.id),
      ),
    );

  const candidates = rows
    .filter((row) => row.closedAt && isRetentionEligible(row.closedAt, now))
    .map((row) => ({
      eligibleAt: retentionEligibleAt(row.closedAt as Date),
      reportId: row.id,
    }));

  if (candidates.length > 0) {
    await database.insert(retentionReviewQueue).values(candidates);
  }

  return { enqueued: candidates.length, evaluatedAt: now };
}

export async function listRetentionReviewQueue(
  database: Database = getDatabase(),
) {
  return database
    .select({
      closedAt: aspirationReports.closedAt,
      createdAt: retentionReviewQueue.createdAt,
      eligibleAt: retentionReviewQueue.eligibleAt,
      id: retentionReviewQueue.id,
      reportId: aspirationReports.id,
      status: retentionReviewQueue.status,
      trackingCode: aspirationReports.trackingCode,
    })
    .from(retentionReviewQueue)
    .innerJoin(
      aspirationReports,
      eq(retentionReviewQueue.reportId, aspirationReports.id),
    )
    .where(eq(retentionReviewQueue.status, "PENDING"));
}

export async function recordMailboxDeletionRequest(
  input: { actorUserId: string; reportId: string; requestCategory: string },
  database: Database = getDatabase(),
) {
  await requireReport(input.reportId, database);
  const requestCategory = requireReasonCode(input.requestCategory);
  const [request] = await database
    .insert(privacyDeletionRequests)
    .values({
      recordedByUserId: input.actorUserId,
      reportId: input.reportId,
      requestCategory,
      source: "BEM_MAILBOX",
    })
    .returning({
      id: privacyDeletionRequests.id,
      status: privacyDeletionRequests.status,
    });

  await database.insert(auditEvents).values({
    action: "PRIVACY_DELETION_REQUEST_RECORDED",
    actorType: "BEM_USER",
    actorUserId: input.actorUserId,
    metadata: { source: "BEM_MAILBOX" },
    reasonCode: requestCategory,
    result: "SUCCESS",
    targetId: input.reportId,
    targetType: "ASPIRATION_REPORT",
  });

  return request;
}

export async function placeRetentionHold(
  input: { actorUserId: string; reasonCode: string; reportId: string },
  database: Database = getDatabase(),
) {
  await requireReport(input.reportId, database);
  const reasonCode = requireReasonCode(input.reasonCode);
  await requireNoActiveHold(input.reportId, database);
  const [hold] = await database
    .insert(reportRetentionHolds)
    .values({
      placedByUserId: input.actorUserId,
      reasonCode,
      reportId: input.reportId,
    })
    .returning({ id: reportRetentionHolds.id });

  await database.insert(auditEvents).values({
    action: "RETENTION_HOLD_PLACED",
    actorType: "BEM_USER",
    actorUserId: input.actorUserId,
    reasonCode,
    result: "SUCCESS",
    targetId: input.reportId,
    targetType: "ASPIRATION_REPORT",
  });
  return hold;
}

export async function releaseRetentionHold(
  input: { actorUserId: string; holdId: string },
  database: Database = getDatabase(),
) {
  const [updated] = await database
    .update(reportRetentionHolds)
    .set({ releasedAt: new Date(), releasedByUserId: input.actorUserId })
    .where(
      and(
        eq(reportRetentionHolds.id, input.holdId),
        isNull(reportRetentionHolds.releasedAt),
      ),
    )
    .returning({ reportId: reportRetentionHolds.reportId });
  if (!updated) {
    throw new PrivacyRetentionError("NOT_FOUND", "Hold aktif tidak ditemukan.");
  }
  await database.insert(auditEvents).values({
    action: "RETENTION_HOLD_RELEASED",
    actorType: "BEM_USER",
    actorUserId: input.actorUserId,
    result: "SUCCESS",
    targetId: updated.reportId,
    targetType: "ASPIRATION_REPORT",
  });
  return updated;
}

export async function verifyDeletionRequest(
  input: { actorUserId: string; requestId: string },
  database: Database = getDatabase(),
) {
  const [updated] = await database
    .update(privacyDeletionRequests)
    .set({ status: "VERIFIED", verifiedAt: new Date() })
    .where(
      and(
        eq(privacyDeletionRequests.id, input.requestId),
        eq(privacyDeletionRequests.status, "RECEIVED"),
      ),
    )
    .returning({ reportId: privacyDeletionRequests.reportId });
  if (!updated) {
    throw new PrivacyRetentionError(
      "INVALID_STATUS",
      "Permintaan harus berstatus diterima sebelum diverifikasi.",
    );
  }
  return updated;
}

export async function approveDeletionRequest(
  input: { actorUserId: string; requestId: string },
  database: Database = getDatabase(),
) {
  const [request] = await database
    .select({ reportId: privacyDeletionRequests.reportId })
    .from(privacyDeletionRequests)
    .where(
      and(
        eq(privacyDeletionRequests.id, input.requestId),
        eq(privacyDeletionRequests.status, "VERIFIED"),
      ),
    )
    .limit(1);
  if (!request) {
    throw new PrivacyRetentionError(
      "INVALID_STATUS",
      "Permintaan harus diverifikasi sebelum disetujui.",
    );
  }
  await requireNoActiveHold(request.reportId, database);
  await database
    .update(privacyDeletionRequests)
    .set({
      approvedAt: new Date(),
      approvedByUserId: input.actorUserId,
      status: "APPROVED",
    })
    .where(eq(privacyDeletionRequests.id, input.requestId));
  return request;
}

export async function executeApprovedDeletion(
  input: { actorUserId: string; requestId: string },
  database: Database = getDatabase(),
  deleteObject: (objectKey: string) => Promise<void> = deleteEvidenceObject,
) {
  const [request] = await database
    .select({ reportId: privacyDeletionRequests.reportId })
    .from(privacyDeletionRequests)
    .where(
      and(
        eq(privacyDeletionRequests.id, input.requestId),
        eq(privacyDeletionRequests.status, "APPROVED"),
      ),
    )
    .limit(1);
  if (!request) {
    throw new PrivacyRetentionError(
      "INVALID_STATUS",
      "Permintaan harus disetujui sebelum penghapusan dijalankan.",
    );
  }
  await requireNoActiveHold(request.reportId, database);

  const evidence = await database
    .select({ id: reportEvidence.id, objectKey: reportEvidence.objectKey })
    .from(reportEvidence)
    .where(eq(reportEvidence.reportId, request.reportId));
  if (evidence.length > 0 && !isR2EvidenceEnabled()) {
    throw new PrivacyRetentionError(
      "EVIDENCE_STORAGE_DISABLED",
      "Evidence ada, tetapi storage privat tidak aktif. Penghapusan dihentikan agar tidak parsial.",
    );
  }

  // Object storage is deleted first. DeleteObject is idempotent, so a retry is
  // safe if the subsequent database transaction is interrupted.
  await Promise.all(evidence.map((item) => deleteObject(item.objectKey)));
  const deletedAt = new Date();

  await database.transaction(async (transaction) => {
    await transaction
      .delete(reporterIdentities)
      .where(eq(reporterIdentities.reportId, request.reportId));
    await transaction
      .delete(reportEvidence)
      .where(eq(reportEvidence.reportId, request.reportId));
    // Preserve minimal workflow metadata, never dependent free-form PII.
    await transaction
      .update(internalNotes)
      .set({
        body: "[Konten dihapus sesuai kebijakan retensi]",
        deletionReason: null,
        deletedAt,
        updatedAt: deletedAt,
      })
      .where(eq(internalNotes.reportId, request.reportId));
    await transaction
      .update(reportStatusEvents)
      .set({ reporterMessage: null })
      .where(eq(reportStatusEvents.reportId, request.reportId));
    await transaction
      .update(reportAssignments)
      .set({ reason: null, routeLabel: "[Dihapus]" })
      .where(eq(reportAssignments.reportId, request.reportId));
    // Keep opaque keys so deferred staging cleanup can still retry safely.
    await transaction
      .update(evidenceUploadIntents)
      .set({ originalFilename: "[Dihapus]" })
      .where(eq(evidenceUploadIntents.reportId, request.reportId));
    await transaction
      .update(aspirationReports)
      .set({
        chronology: "[Konten dihapus sesuai kebijakan retensi]",
        deletedAt,
        deletionReasonCode: "MAILBOX_REQUEST",
        impact: "[Konten dihapus sesuai kebijakan retensi]",
        internalSummary: null,
        location: "[Dihapus]",
        submissionKeyHash: randomBytes(32).toString("hex"),
        suggestedSolution: null,
        title: "[Laporan dihapus sesuai kebijakan retensi]",
        trackingSecretHash: randomBytes(48).toString("base64url"),
        updatedAt: deletedAt,
      })
      .where(eq(aspirationReports.id, request.reportId));
    await transaction
      .update(privacyDeletionRequests)
      .set({
        completedAt: deletedAt,
        resolutionCode: "PII_EVIDENCE_PURGED",
        status: "COMPLETED",
      })
      .where(eq(privacyDeletionRequests.id, input.requestId));
    await transaction
      .update(retentionReviewQueue)
      .set({
        completedAt: deletedAt,
        reviewedAt: deletedAt,
        reviewedByUserId: input.actorUserId,
        status: "COMPLETED",
      })
      .where(eq(retentionReviewQueue.reportId, request.reportId));
    await transaction.insert(auditEvents).values({
      action: "PRIVACY_DELETION_COMPLETED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: {
        evidenceObjectCount: evidence.length,
        reporterIdentityPurged: true,
      },
      reasonCode: "MAILBOX_REQUEST",
      result: "SUCCESS",
      targetId: request.reportId,
      targetType: "ASPIRATION_REPORT",
    });
  });

  return {
    deletedAt,
    evidenceObjectCount: evidence.length,
    reportId: request.reportId,
  };
}
