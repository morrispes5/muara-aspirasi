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
  inspectEvidenceObject,
  isR2EvidenceEnabled,
  R2_UPLOAD_EXPIRY_SECONDS,
  R2ConfigurationError,
  R2StorageError,
  readEvidenceObject,
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
  mimeType: string;
  objectKey: string;
  originalFilename: string;
  sizeBytes: number;
};

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

  await database.transaction(async (transaction) => {
    await transaction
      .delete(evidenceUploadIntents)
      .where(
        and(
          lt(evidenceUploadIntents.expiresAt, now),
          isNull(evidenceUploadIntents.consumedAt),
        ),
      );
    await transaction.insert(evidenceUploadIntents).values(records);
  });

  try {
    const uploads = await Promise.all(
      records.map(async (record) => ({
        expiresAt: expiresAt.toISOString(),
        headers: { "Content-Type": record.mimeType },
        id: record.id,
        uploadUrl: await createEvidenceUploadUrl({
          mimeType: record.mimeType,
          objectKey: record.objectKey,
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

  const prepared = await Promise.all(
    intentIds.map(async (intentId) => {
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

        const object = await readEvidenceObject(row.objectKey);
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

        return {
          checksumSha256: checksumEvidence(object.bytes),
          intentId: row.id,
          mimeType: row.mimeType,
          objectKey: row.objectKey,
          originalFilename: row.originalFilename,
          sizeBytes: row.sizeBytes,
        };
      } catch (error) {
        if (error instanceof EvidenceUploadError) throw error;
        if (error instanceof EvidenceValidationError) {
          throw new EvidenceUploadError("INVALID", error.message);
        }
        if (error instanceof R2StorageError) throw mapStorageError(error);
        throw mapStorageError(error);
      }
    }),
  );

  return prepared;
}

export async function getEvidenceDownloadLink(
  reportId: string,
  evidenceId: string,
  database: Database = getDatabase(),
) {
  ensureEnabled();
  const [evidence] = await database
    .select({
      id: reportEvidence.id,
      objectKey: reportEvidence.objectKey,
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
    return createEvidenceDownloadUrl(evidence.objectKey);
  } catch (error) {
    throw mapStorageError(error);
  }
}
