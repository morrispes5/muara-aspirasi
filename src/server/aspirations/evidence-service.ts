import { and, eq, inArray, isNull, lt, ne } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  aspirationReports,
  evidenceUploadIntents,
  reportEvidence,
} from "@/server/db/schema";
import {
  checksumEvidence,
  type EvidenceFileDescriptor,
  EvidenceValidationError,
  MAX_EVIDENCE_FILE_BYTES,
  MAX_EVIDENCE_TOTAL_BYTES,
  validateEvidenceBytes,
  validateEvidenceFileDescriptors,
} from "@/server/aspirations/evidence";
import {
  createEvidenceDownloadUrl,
  createEvidenceObjectKey,
  createEvidenceUploadUrl,
  deleteEvidenceObject,
  finalizeEvidenceObject,
  inspectEvidenceObject,
  isR2EvidenceEnabled,
  R2_UPLOAD_EXPIRY_SECONDS,
  R2ConfigurationError,
  R2ObjectSizeError,
  R2StorageError,
  readEvidenceObject,
  writeFinalEvidenceObject,
} from "@/server/storage/r2";
import { type Database, getDatabase } from "@/server/db/client";

export class EvidenceUploadError extends Error {
  constructor(
    public readonly code:
      | "CONFIGURATION"
      | "EXPIRED"
      | "INVALID"
      | "NOT_FOUND"
      | "NOT_UPLOADED"
      | "STORAGE"
      | "USED",
    message: string,
  ) {
    super(message);
    this.name = "EvidenceUploadError";
  }
}

export type PreparedEvidence = {
  checksumSha256: string;
  intentId: string;
  intentObjectKey: string;
  mimeType: string;
  objectKey: string;
  originalFilename: string;
  sizeBytes: number;
};

const EXPIRED_UPLOAD_CLEANUP_BATCH = 50;

async function cleanupExpiredEvidenceUploads(now: Date, database: Database) {
  const expired = await database
    .select({
      consumedAt: evidenceUploadIntents.consumedAt,
      id: evidenceUploadIntents.id,
      objectKey: evidenceUploadIntents.objectKey,
    })
    .from(evidenceUploadIntents)
    .where(
      and(
        lt(evidenceUploadIntents.expiresAt, now),
        isNull(evidenceUploadIntents.stagingDeletedAt),
      ),
    )
    .limit(EXPIRED_UPLOAD_CLEANUP_BATCH);

  const deletedConsumedIntentIds: string[] = [];
  const deletedUnconsumedIntentIds: string[] = [];
  for (const row of expired) {
    try {
      await deleteEvidenceObject(row.objectKey);
      if (row.consumedAt) {
        deletedConsumedIntentIds.push(row.id);
      } else {
        deletedUnconsumedIntentIds.push(row.id);
      }
    } catch {
      // Preserve the row so a later cleanup attempt still knows the object key.
    }
  }

  if (deletedUnconsumedIntentIds.length > 0) {
    await database
      .delete(evidenceUploadIntents)
      .where(inArray(evidenceUploadIntents.id, deletedUnconsumedIntentIds));
  }

  if (deletedConsumedIntentIds.length > 0) {
    await database
      .update(evidenceUploadIntents)
      .set({ stagingDeletedAt: now })
      .where(inArray(evidenceUploadIntents.id, deletedConsumedIntentIds));
  }
}

function ensureEnabled() {
  if (!isR2EvidenceEnabled()) {
    throw new EvidenceUploadError(
      "CONFIGURATION",
      "Evidence privat belum diaktifkan pada environment ini.",
    );
  }
}

function mapStorageError(error: unknown): EvidenceUploadError {
  if (error instanceof R2ConfigurationError) {
    return new EvidenceUploadError(
      "CONFIGURATION",
      "Evidence privat belum dikonfigurasi dengan lengkap.",
    );
  }
  return new EvidenceUploadError(
    "STORAGE",
    "Evidence belum tersedia di penyimpanan privat.",
  );
}

export async function createEvidenceUploadIntents(
  descriptors: EvidenceFileDescriptor[],
  database: Database = getDatabase(),
) {
  ensureEnabled();
  const { files, totalBytes } = validateEvidenceFileDescriptors(descriptors);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + R2_UPLOAD_EXPIRY_SECONDS * 1000);
  const records = files.map((file) => ({
    expiresAt,
    id: randomUUID(),
    mimeType: file.type,
    objectKey: createEvidenceObjectKey(),
    originalFilename: file.name,
    sizeBytes: file.size,
  }));

  await cleanupExpiredEvidenceUploads(now, database);
  await database.insert(evidenceUploadIntents).values(records);

  try {
    const uploads = await Promise.all(
      records.map(async (record) => ({
        expiresAt: expiresAt.toISOString(),
        headers: { "Content-Type": record.mimeType },
        id: record.id,
        uploadUrl: await createEvidenceUploadUrl({
          mimeType: record.mimeType,
          objectKey: record.objectKey,
          sizeBytes: record.sizeBytes,
        }),
      })),
    );

    return { totalBytes, uploads };
  } catch (error) {
    throw mapStorageError(error);
  }
}

export async function prepareEvidenceForSubmission(
  intentIds: string[],
  database: Database = getDatabase(),
): Promise<PreparedEvidence[]> {
  if (intentIds.length === 0) return [];

  ensureEnabled();

  if (new Set(intentIds).size !== intentIds.length) {
    throw new EvidenceUploadError(
      "INVALID",
      "Evidence tidak boleh menggunakan handle yang sama dua kali.",
    );
  }

  const rows = await database
    .select({
      expiresAt: evidenceUploadIntents.expiresAt,
      id: evidenceUploadIntents.id,
      mimeType: evidenceUploadIntents.mimeType,
      objectKey: evidenceUploadIntents.objectKey,
      originalFilename: evidenceUploadIntents.originalFilename,
      reportId: evidenceUploadIntents.reportId,
      sizeBytes: evidenceUploadIntents.sizeBytes,
      consumedAt: evidenceUploadIntents.consumedAt,
    })
    .from(evidenceUploadIntents)
    .where(inArray(evidenceUploadIntents.id, intentIds));

  if (rows.length !== intentIds.length) {
    throw new EvidenceUploadError(
      "NOT_FOUND",
      "Evidence belum dapat diverifikasi.",
    );
  }

  const now = new Date();
  const totalBytes = rows.reduce((sum, row) => sum + row.sizeBytes, 0);
  if (totalBytes > MAX_EVIDENCE_TOTAL_BYTES) {
    throw new EvidenceUploadError(
      "INVALID",
      "Ukuran total evidence terlalu besar.",
    );
  }

  const prepared: PreparedEvidence[] = [];

  try {
    for (const intentId of intentIds) {
      const row = rows.find((candidate) => candidate.id === intentId);
      if (!row) {
        throw new EvidenceUploadError("NOT_FOUND", "Evidence tidak ditemukan.");
      }
      if (row.consumedAt || row.reportId) {
        throw new EvidenceUploadError("USED", "Evidence sudah dipakai.");
      }
      if (row.expiresAt <= now) {
        throw new EvidenceUploadError(
          "EXPIRED",
          "Sesi upload evidence sudah kedaluwarsa.",
        );
      }
      if (row.sizeBytes > MAX_EVIDENCE_FILE_BYTES) {
        throw new EvidenceUploadError(
          "INVALID",
          "Ukuran evidence tidak valid.",
        );
      }

      try {
        const head = await inspectEvidenceObject(row.objectKey);
        if (head.contentLength !== row.sizeBytes) {
          throw new EvidenceUploadError(
            "INVALID",
            "Ukuran evidence tidak sesuai dengan deklarasi upload.",
          );
        }
        if (head.contentType && head.contentType !== row.mimeType) {
          throw new EvidenceUploadError(
            "INVALID",
            "Tipe evidence tidak sesuai dengan deklarasi upload.",
          );
        }

        const object = await readEvidenceObject(row.objectKey, row.sizeBytes);
        if (
          object.bytes.byteLength !== row.sizeBytes ||
          object.contentLength !== row.sizeBytes
        ) {
          throw new EvidenceUploadError(
            "INVALID",
            "Isi evidence tidak sesuai dengan deklarasi upload.",
          );
        }

        validateEvidenceBytes(
          row.mimeType as Parameters<typeof validateEvidenceBytes>[0],
          object.bytes,
        );

        const checksumSha256 = checksumEvidence(object.bytes);
        const finalObjectKey = await finalizeEvidenceObject({
          bytes: object.bytes,
          mimeType: row.mimeType,
          stagingObjectKey: row.objectKey,
        });

        prepared.push({
          checksumSha256,
          intentId: row.id,
          intentObjectKey: row.objectKey,
          mimeType: row.mimeType,
          objectKey: finalObjectKey,
          originalFilename: row.originalFilename,
          sizeBytes: row.sizeBytes,
        });
      } catch (error) {
        if (error instanceof EvidenceUploadError) throw error;
        if (error instanceof EvidenceValidationError) {
          throw new EvidenceUploadError("INVALID", error.message);
        }
        if (error instanceof R2ObjectSizeError) {
          throw new EvidenceUploadError(
            "INVALID",
            "Ukuran evidence tidak sesuai dengan deklarasi upload.",
          );
        }
        if (error instanceof R2StorageError) throw mapStorageError(error);
        throw mapStorageError(error);
      }
    }
  } catch (error) {
    await Promise.allSettled(
      prepared.map((evidence) => deleteEvidenceObject(evidence.objectKey)),
    );
    throw error;
  }

  return prepared;
}

export async function discardPreparedEvidence(prepared: PreparedEvidence[]) {
  await Promise.allSettled(
    prepared.map((evidence) => deleteEvidenceObject(evidence.objectKey)),
  );
}

type EvidenceDownloadRecord = {
  checksumSha256: string;
  id: string;
  mimeType: string;
  objectKey: string;
  sizeBytes: number;
};

async function migrateLegacyEvidenceObject(
  evidence: EvidenceDownloadRecord,
  database: Database,
) {
  let finalObjectKey: string | null = null;

  try {
    const object = await readEvidenceObject(
      evidence.objectKey,
      evidence.sizeBytes,
    );
    if (
      object.bytes.byteLength !== evidence.sizeBytes ||
      object.contentLength !== evidence.sizeBytes ||
      (object.contentType && object.contentType !== evidence.mimeType)
    ) {
      throw new EvidenceUploadError(
        "INVALID",
        "Evidence lama gagal melewati pemeriksaan integritas.",
      );
    }

    validateEvidenceBytes(
      evidence.mimeType as Parameters<typeof validateEvidenceBytes>[0],
      object.bytes,
    );
    if (checksumEvidence(object.bytes) !== evidence.checksumSha256) {
      throw new EvidenceUploadError(
        "INVALID",
        "Evidence lama gagal melewati pemeriksaan integritas.",
      );
    }

    finalObjectKey = await writeFinalEvidenceObject({
      bytes: object.bytes,
      mimeType: evidence.mimeType,
    });

    const [migrated] = await database
      .update(reportEvidence)
      .set({ objectKey: finalObjectKey })
      .where(
        and(
          eq(reportEvidence.id, evidence.id),
          eq(reportEvidence.objectKey, evidence.objectKey),
          isNull(reportEvidence.deletedAt),
        ),
      )
      .returning({ objectKey: reportEvidence.objectKey });

    if (migrated) {
      finalObjectKey = null;
      try {
        await deleteEvidenceObject(evidence.objectKey);
      } catch {
        // The legacy key is no longer served and provider lifecycle remains a fallback.
      }
      return migrated.objectKey;
    }

    await deleteEvidenceObject(finalObjectKey);
    finalObjectKey = null;

    const [current] = await database
      .select({ objectKey: reportEvidence.objectKey })
      .from(reportEvidence)
      .where(
        and(
          eq(reportEvidence.id, evidence.id),
          isNull(reportEvidence.deletedAt),
        ),
      )
      .limit(1);

    if (current?.objectKey.startsWith("evidence/final/")) {
      return current.objectKey;
    }

    throw new EvidenceUploadError(
      "STORAGE",
      "Evidence lama belum dapat dimigrasikan.",
    );
  } catch (error) {
    if (finalObjectKey) {
      await Promise.allSettled([deleteEvidenceObject(finalObjectKey)]);
    }
    if (error instanceof EvidenceUploadError) throw error;
    if (error instanceof EvidenceValidationError) {
      throw new EvidenceUploadError("INVALID", error.message);
    }
    if (error instanceof R2ObjectSizeError) {
      throw new EvidenceUploadError(
        "INVALID",
        "Evidence lama gagal melewati pemeriksaan integritas.",
      );
    }
    throw mapStorageError(error);
  }
}

export async function getEvidenceDownloadLink(
  reportId: string,
  evidenceId: string,
  database: Database = getDatabase(),
) {
  ensureEnabled();
  const [evidence] = await database
    .select({
      checksumSha256: reportEvidence.checksumSha256,
      id: reportEvidence.id,
      mimeType: reportEvidence.mimeType,
      objectKey: reportEvidence.objectKey,
      sizeBytes: reportEvidence.sizeBytes,
    })
    .from(reportEvidence)
    .innerJoin(
      aspirationReports,
      eq(aspirationReports.id, reportEvidence.reportId),
    )
    .where(
      and(
        eq(aspirationReports.id, reportId),
        eq(reportEvidence.id, evidenceId),
        ne(reportEvidence.validationStatus, "REJECTED"),
        isNull(reportEvidence.deletedAt),
      ),
    )
    .limit(1);

  if (!evidence) {
    throw new EvidenceUploadError("NOT_FOUND", "Evidence tidak ditemukan.");
  }

  try {
    const objectKey = evidence.objectKey.startsWith("evidence/quarantine/")
      ? await migrateLegacyEvidenceObject(evidence, database)
      : evidence.objectKey;
    return createEvidenceDownloadUrl(objectKey);
  } catch (error) {
    if (error instanceof EvidenceUploadError) throw error;
    throw mapStorageError(error);
  }
}
