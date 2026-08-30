import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import {
  CaseManagementError,
  listReportQueue,
  parseReportQueueQuery,
} from "@/server/aspirations/case-management";
import { recordAuthAuditEvent } from "@/server/auth/audit";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return adminError(
      error.statusCode,
      error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      error.statusCode === 401
        ? "Sesi BEM diperlukan untuk membuka antrean laporan."
        : "Peran BEM ini tidak memiliki akses ke antrean laporan.",
    );
  }

  if (error instanceof CaseManagementError) {
    const status =
      error.code === "REPORT_NOT_FOUND"
        ? 404
        : error.code === "CONFLICT" ||
            error.code === "INVALID_TRANSITION" ||
            error.code === "NO_CHANGE" ||
            error.code === "REPORT_ARCHIVED"
          ? 409
          : 400;

    return adminError(status, error.code, error.message);
  }

  return adminError(
    500,
    "REQUEST_FAILED",
    "Antrean laporan belum dapat dimuat. Coba lagi beberapa saat.",
  );
}

export async function GET(request: Request) {
  try {
    const session = await requireBemPermission(
      "VIEW_REPORTS",
      new Headers(request.headers),
    );
    const query = parseReportQueueQuery(new URL(request.url).searchParams);
    const reports = await listReportQueue(query);

    await recordAuthAuditEvent({
      action: "REPORT_QUEUE_VIEWED",
      actorType: "BEM_USER",
      actorUserId: session.user.id,
      metadata: {
        page: query.page,
        pageSize: query.pageSize,
        resultCount: reports.items.length,
      },
      result: "SUCCESS",
      targetId: "collection",
      targetType: "ASPIRATION_REPORTS",
    });

    return adminJson({ reports });
  } catch (error) {
    return errorResponse(error);
  }
}
