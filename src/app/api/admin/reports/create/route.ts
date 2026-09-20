import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import {
  consumePublicRateLimit,
  PublicRateLimitError,
} from "@/server/aspirations/rate-limit";
import {
  DuplicateSubmissionError,
  InactiveCategoryError,
  submitAdminReport,
} from "@/server/aspirations/submission-service";
import {
  parseSubmissionInput,
  PublicInputError,
} from "@/server/aspirations/validation";
import {
  readBoundedJson,
  RequestBodyTooLargeError,
} from "@/server/security/request-body";
import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request))
    return adminError(403, "FORBIDDEN", "Origin tidak diizinkan.");
  try {
    const session = await requireBemPermission(
      "CREATE_REPORT",
      request.headers,
    );
    const key = request.headers.get("idempotency-key") ?? "";
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        key,
      )
    )
      return adminError(400, "INVALID_KEY", "Muat ulang formulir.");
    const body = await readBoundedJson(request);
    if (!body || typeof body !== "object" || Array.isArray(body))
      return adminError(400, "INVALID_INPUT", "Form tidak valid.");
    const input = parseSubmissionInput({
      ...body,
      evidence: [],
      honeypot: "",
      turnstileToken: "admin-authenticated",
      identityMode: "CONFIDENTIAL_BEM_ONLY",
      limitedShareConsent: false,
    });
    await consumePublicRateLimit(
      { scope: "admin-create", limit: 20, windowSeconds: 3600 },
      session.user.id,
    );
    const receipt = await submitAdminReport(input, key, session.user.id);
    return adminJson({ receipt }, 201);
  } catch (error) {
    if (error instanceof AuthorizationError)
      return adminError(
        error.statusCode,
        "FORBIDDEN",
        "Akses admin diperlukan.",
      );
    if (
      error instanceof PublicInputError ||
      error instanceof SyntaxError ||
      error instanceof InactiveCategoryError
    )
      return adminError(
        400,
        "INVALID_INPUT",
        error instanceof PublicInputError
          ? error.message
          : "Form atau kategori tidak valid.",
      );
    if (error instanceof RequestBodyTooLargeError)
      return adminError(413, "TOO_LARGE", "Form terlalu besar.");
    if (error instanceof DuplicateSubmissionError)
      return adminError(
        409,
        "DUPLICATE",
        "Laporan ini sudah tersimpan. Cari di tabel sebelum mengirim lagi.",
      );
    if (error instanceof PublicRateLimitError) {
      const response = adminError(
        429,
        "RATE_LIMIT",
        "Batas pencatatan tercapai. Coba lagi nanti.",
      );
      response.headers.set("Retry-After", String(error.retryAfterSeconds));
      return response;
    }
    return adminError(
      503,
      "UNAVAILABLE",
      "Belum dapat menyimpan. Periksa tabel sebelum mencoba ulang.",
    );
  }
}
