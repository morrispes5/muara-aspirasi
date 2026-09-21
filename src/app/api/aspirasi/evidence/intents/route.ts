import { NextResponse } from "next/server";

import {
  consumePublicRateLimit,
  evidenceIntentCircuitBreaker,
  evidenceIntentRateLimit,
  getRequestNetworkSignal,
  PublicRateLimitError,
} from "@/server/aspirations/rate-limit";
import {
  createEvidenceUploadIntents,
  EvidenceUploadError,
} from "@/server/aspirations/evidence-service";
import {
  type EvidenceFileDescriptor,
  EvidenceValidationError,
  validateEvidenceFileDescriptors,
} from "@/server/aspirations/evidence";
import {
  publicError,
  publicSensitiveResponseHeaders,
} from "@/server/aspirations/public-response";
import {
  readBoundedJson,
  RequestBodyTooLargeError,
} from "@/server/security/request-body";
import { isR2EvidenceEnabled } from "@/server/storage/r2";
import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseDescriptors(value: unknown): EvidenceFileDescriptor[] {
  if (!isRecord(value) || Object.keys(value).length !== 1) {
    throw new EvidenceValidationError("Format evidence tidak dapat diproses.");
  }

  const files = value.files;
  if (!Array.isArray(files)) {
    throw new EvidenceValidationError("Daftar evidence tidak valid.");
  }

  return files.map((file) => {
    if (
      !isRecord(file) ||
      Object.keys(file).length !== 3 ||
      typeof file.name !== "string" ||
      typeof file.type !== "string" ||
      typeof file.size !== "number"
    ) {
      throw new EvidenceValidationError("Metadata evidence tidak valid.");
    }

    return { name: file.name, size: file.size, type: file.type };
  });
}

function evidenceError(error: EvidenceUploadError) {
  if (error.code === "CONFIGURATION" || error.code === "STORAGE") {
    return publicError(
      503,
      "EVIDENCE_UNAVAILABLE",
      "Upload bukti belum tersedia. Coba lagi setelah penyimpanan privat siap.",
    );
  }

  return publicError(422, "EVIDENCE_INVALID", error.message, "evidence");
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return publicError(
      403,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }

  if (!isR2EvidenceEnabled()) {
    return evidenceError(new EvidenceUploadError("CONFIGURATION", ""));
  }

  let body: unknown;
  try {
    body = await readBoundedJson(request, 8 * 1024);
  } catch (error) {
    return publicError(
      error instanceof RequestBodyTooLargeError ? 413 : 400,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }

  try {
    const { files: descriptors } = validateEvidenceFileDescriptors(
      parseDescriptors(body),
    );
    const networkSignal = getRequestNetworkSignal(request);
    await consumePublicRateLimit(evidenceIntentRateLimit, networkSignal);
    await consumePublicRateLimit(evidenceIntentCircuitBreaker, "all-evidence");

    const result = await createEvidenceUploadIntents(descriptors);

    return NextResponse.json(result, {
      headers: publicSensitiveResponseHeaders,
      status: 201,
    });
  } catch (error) {
    if (error instanceof EvidenceValidationError) {
      return publicError(422, "EVIDENCE_INVALID", error.message, "evidence");
    }

    if (error instanceof EvidenceUploadError) {
      return evidenceError(error);
    }

    if (error instanceof PublicRateLimitError) {
      return publicError(
        429,
        "REQUEST_REJECTED",
        "Terlalu banyak percobaan. Coba lagi beberapa saat.",
        null,
        error.retryAfterSeconds,
      );
    }

    return publicError(
      500,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }
}
