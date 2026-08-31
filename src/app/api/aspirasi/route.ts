import {
  consumePublicRateLimit,
  getRequestNetworkSignal,
  PublicRateLimitError,
  submissionCircuitBreaker,
  submissionRateLimit,
} from "@/server/aspirations/rate-limit";
import {
  DuplicateSubmissionError,
  InactiveCategoryError,
  submitPublicReport,
} from "@/server/aspirations/submission-service";
import {
  parseSubmissionInput,
  PublicInputError,
} from "@/server/aspirations/validation";
import {
  publicError,
  publicSensitiveResponseHeaders,
} from "@/server/aspirations/public-response";
import {
  TurnstileVerificationError,
  verifyTurnstile,
} from "@/server/aspirations/turnstile";

import { NextResponse } from "next/server";

import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

function isIdempotencyKey(value: string | null): value is string {
  return Boolean(
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    ),
  );
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return publicError(
      403,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }

  const idempotencyKey = request.headers.get("idempotency-key");
  if (!isIdempotencyKey(idempotencyKey)) {
    return publicError(
      400,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return publicError(
      400,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }

  try {
    const input = parseSubmissionInput(body);

    if (input.honeypot.trim()) {
      return publicError(
        400,
        "REQUEST_REJECTED",
        "Permintaan belum dapat diproses.",
      );
    }

    const networkSignal = getRequestNetworkSignal(request);
    await consumePublicRateLimit(submissionRateLimit, networkSignal);
    await consumePublicRateLimit(submissionCircuitBreaker, "all-submissions");
    await verifyTurnstile(input.turnstileToken, new URL(request.url).hostname);

    const credential = await submitPublicReport(input, idempotencyKey);

    return NextResponse.json(
      {
        receipt: {
          message:
            "Laporan diterima. Simpan kode dan token rahasia ini; token tidak dapat ditampilkan lagi.",
          status: "RECEIVED",
          trackingCode: credential.trackingCode,
          trackingSecret: credential.trackingSecret,
        },
      },
      { headers: publicSensitiveResponseHeaders, status: 201 },
    );
  } catch (error) {
    if (error instanceof PublicInputError) {
      return publicError(422, "VALIDATION_ERROR", error.message, error.field);
    }

    if (error instanceof PublicRateLimitError) {
      return publicError(
        429,
        "REQUEST_REJECTED",
        "Terlalu banyak percobaan. Coba lagi beberapa saat.",
      );
    }

    if (error instanceof TurnstileVerificationError) {
      return publicError(
        error.reason === "CONFIGURATION" ? 503 : 400,
        "VERIFICATION_REQUIRED",
        "Verifikasi anti-spam belum berhasil. Muat ulang verifikasi lalu coba lagi.",
      );
    }

    if (error instanceof DuplicateSubmissionError) {
      return publicError(
        409,
        "SUBMISSION_ALREADY_RECEIVED",
        "Pengiriman ini sudah diterima. Jangan mengirim ulang laporan yang sama.",
      );
    }

    if (error instanceof InactiveCategoryError) {
      return publicError(
        422,
        "VALIDATION_ERROR",
        "Pilih kategori aspirasi yang tersedia.",
        "categoryId",
      );
    }

    return publicError(
      500,
      "REQUEST_REJECTED",
      "Permintaan belum dapat diproses.",
    );
  }
}
