import { createHash } from "node:crypto";

export const MAX_EVIDENCE_FILES = 3;
export const MAX_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_EVIDENCE_TOTAL_BYTES = 10 * 1024 * 1024;

export const supportedEvidenceMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type SupportedEvidenceMimeType =
  (typeof supportedEvidenceMimeTypes)[number];

export type EvidenceFileDescriptor = {
  name: string;
  size: number;
  type: string;
};

export class EvidenceValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidenceValidationError";
  }
}

function isSupportedMimeType(
  value: string,
): value is SupportedEvidenceMimeType {
  return supportedEvidenceMimeTypes.includes(
    value as SupportedEvidenceMimeType,
  );
}

function extensionForMimeType(mimeType: SupportedEvidenceMimeType) {
  if (mimeType === "application/pdf") return ["pdf"];
  if (mimeType === "image/png") return ["png"];
  return ["jpg", "jpeg"];
}

function normalizeFilename(name: string, mimeType: SupportedEvidenceMimeType) {
  const normalized = name.trim();

  if (
    !normalized ||
    normalized.length > 255 ||
    /[\\/]/.test(normalized) ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    throw new EvidenceValidationError("Nama file evidence tidak valid.");
  }

  const extension = normalized.split(".").pop()?.toLowerCase();
  if (!extension || !extensionForMimeType(mimeType).includes(extension)) {
    throw new EvidenceValidationError(
      "Ekstensi file evidence tidak sesuai dengan tipenya.",
    );
  }

  return normalized;
}

export function validateEvidenceFileDescriptors(
  files: EvidenceFileDescriptor[],
) {
  if (files.length < 1 || files.length > MAX_EVIDENCE_FILES) {
    throw new EvidenceValidationError(
      `Evidence berjumlah ${MAX_EVIDENCE_FILES} file atau kurang.`,
    );
  }

  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes > MAX_EVIDENCE_TOTAL_BYTES) {
    throw new EvidenceValidationError(
      `Ukuran total evidence maksimal ${MAX_EVIDENCE_TOTAL_BYTES / (1024 * 1024)} MB.`,
    );
  }

  const normalized = files.map((file) => {
    if (!Number.isInteger(file.size) || file.size < 1) {
      throw new EvidenceValidationError("Ukuran file evidence tidak valid.");
    }
    if (file.size > MAX_EVIDENCE_FILE_BYTES) {
      throw new EvidenceValidationError(
        `Ukuran setiap file evidence maksimal ${MAX_EVIDENCE_FILE_BYTES / (1024 * 1024)} MB.`,
      );
    }
    if (!isSupportedMimeType(file.type)) {
      throw new EvidenceValidationError(
        "Tipe evidence hanya boleh JPEG, PNG, atau PDF.",
      );
    }

    return {
      name: normalizeFilename(file.name, file.type),
      size: file.size,
      type: file.type,
    };
  });

  return { files: normalized, totalBytes };
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((value, index) => bytes[index] === value);
}

export function validateEvidenceBytes(
  mimeType: SupportedEvidenceMimeType,
  bytes: Uint8Array,
) {
  const valid =
    (mimeType === "image/jpeg" && hasPrefix(bytes, [0xff, 0xd8, 0xff])) ||
    (mimeType === "image/png" &&
      hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    (mimeType === "application/pdf" &&
      new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-");

  if (!valid) {
    throw new EvidenceValidationError(
      "Isi file evidence tidak sesuai dengan tipe yang dipilih.",
    );
  }
}

export function checksumEvidence(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}
