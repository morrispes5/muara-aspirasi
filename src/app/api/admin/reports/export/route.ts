import {
  adminError,
  adminSensitiveResponseHeaders,
} from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import {
  CaseManagementError,
  listReportQueue,
  parseReportQueueQuery,
} from "@/server/aspirations/case-management";
import {
  consumePublicRateLimit,
  PublicRateLimitError,
} from "@/server/aspirations/rate-limit";
import { createReportWorkbook } from "@/server/aspirations/report-export";
import { isSameOriginRequest } from "@/server/security/origin";
import { readBoundedJson } from "@/server/security/request-body";
import { recordAuthAuditEvent } from "@/server/auth/audit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!isSameOriginRequest(request))
    return adminError(403, "FORBIDDEN", "Origin tidak diizinkan.");
  try {
    const session = await requireBemPermission(
      "EXPORT_REPORTS",
      request.headers,
    );
    const body = await readBoundedJson(request, 4096);
    if (
      !body ||
      typeof body !== "object" ||
      !("filters" in body) ||
      typeof body.filters !== "string"
    )
      return adminError(400, "INVALID_FILTER", "Filter tidak valid.");
    const query = parseReportQueueQuery(new URLSearchParams(body.filters));
    await consumePublicRateLimit(
      { scope: "admin-export", limit: 5, windowSeconds: 900 },
      session.user.id,
    );
    const reports = await listReportQueue(
      { ...query, page: 1, pageSize: 2001 },
      undefined,
      { includeRestricted: true },
    );
    if (reports.items.length > 2000 || reports.totalItems > 2000)
      return adminError(
        400,
        "EXPORT_LIMIT",
        "Maksimal 2.000 laporan. Persempit tanggal atau status lalu ekspor lagi.",
      );
    const bytes = await createReportWorkbook(reports.items);
    await recordAuthAuditEvent({
      action: "REPORTS_EXPORTED",
      actorType: "BEM_USER",
      actorUserId: session.user.id,
      metadata: { rowCount: reports.items.length, format: "xlsx" },
      result: "SUCCESS",
      targetId: "collection",
      targetType: "ASPIRATION_REPORTS",
    });
    return new Response(new Uint8Array(bytes), {
      headers: {
        ...adminSensitiveResponseHeaders,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="muara-aspirasi.xlsx"',
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof AuthorizationError)
      return adminError(
        error.statusCode,
        "FORBIDDEN",
        "Ekspor hanya untuk admin berwenang.",
      );
    if (error instanceof CaseManagementError || error instanceof SyntaxError)
      return adminError(400, "INVALID_FILTER", "Periksa filter ekspor.");
    if (error instanceof PublicRateLimitError) {
      const response = adminError(
        429,
        "RATE_LIMIT",
        "Terlalu banyak ekspor. Coba lagi nanti.",
      );
      response.headers.set("Retry-After", String(error.retryAfterSeconds));
      return response;
    }
    return adminError(
      503,
      "EXPORT_FAILED",
      "Ekspor belum tersedia. Coba lagi nanti.",
    );
  }
}
