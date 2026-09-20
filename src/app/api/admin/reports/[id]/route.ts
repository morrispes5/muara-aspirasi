import {
  addInternalNote,
  addReporterMessage,
  archiveReport,
  assignReport,
  CaseManagementError,
  changeReportStatus,
  deleteInternalNote,
  editReportContent,
  getReportDetail,
  listBemAssignees,
  reopenReport,
  updateCaseFields,
} from "@/server/aspirations/case-management";
import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import { type BemPermission, hasPermission } from "@/server/auth/roles";
import { isSameOriginRequest } from "@/server/security/origin";
import { PublicInputError } from "@/server/aspirations/validation";
import { readBoundedJson } from "@/server/security/request-body";
import { recordAuthAuditEvent } from "@/server/auth/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredString(body: JsonRecord, key: string) {
  const value = body[key];
  return typeof value === "string" ? value : "";
}

function optionalString(body: JsonRecord, key: string) {
  const value = body[key];
  return value === null || value === undefined || typeof value === "string"
    ? value
    : "";
}

function errorResponse(error: unknown) {
  if (error instanceof PublicInputError)
    return adminError(400, "VALIDATION_ERROR", error.message);
  if (error instanceof AuthorizationError) {
    return adminError(
      error.statusCode,
      error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      error.statusCode === 401
        ? "Sesi BEM diperlukan untuk membuka laporan."
        : "Peran BEM ini tidak memiliki izin untuk tindakan tersebut.",
    );
  }

  if (error instanceof CaseManagementError) {
    const status =
      error.code === "REPORT_NOT_FOUND" || error.code === "NOTE_NOT_FOUND"
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
    "Laporan belum dapat diproses. Coba lagi beberapa saat.",
  );
}

function permissionForAction(action: string): BemPermission {
  if (action === "edit-content") return "EDIT_REPORT_CONTENT";
  if (action === "archive") {
    return "ARCHIVE_REPORT";
  }

  if (action === "reopen") {
    return "REOPEN_REPORT";
  }

  return "PROCESS_REPORT";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const session = await requireBemPermission(
      "VIEW_REPORTS",
      new Headers(request.headers),
    );
    const { id } = await context.params;
    const includeRestricted = hasPermission(
      session.user.role,
      "VIEW_CONFIDENTIAL_REPORT",
    );
    const includeAudit = hasPermission(session.user.role, "VIEW_AUDIT");
    const report = await getReportDetail(id, {
      includeAudit,
      includeRestricted,
    });

    if (!report) {
      return adminError(404, "REPORT_NOT_FOUND", "Laporan tidak ditemukan.");
    }

    const [assignees] = await Promise.all([
      hasPermission(session.user.role, "PROCESS_REPORT")
        ? listBemAssignees()
        : Promise.resolve([]),
      recordAuthAuditEvent({
        action: "REPORT_DETAIL_VIEWED",
        actorType: "BEM_USER",
        actorUserId: session.user.id,
        metadata: {
          confidentialProjection: includeRestricted,
          evidenceProjection: includeRestricted,
        },
        result: "SUCCESS",
        targetId: id,
        targetType: "ASPIRATION_REPORT",
      }),
    ]);

    return adminJson({ assignees, report });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return adminError(
      403,
      "REQUEST_REJECTED",
      "Permintaan dari origin ini tidak diizinkan.",
    );
  }

  try {
    const session = await requireBemPermission(
      "VIEW_REPORTS",
      new Headers(request.headers),
    );
    const { id } = await context.params;
    let body: unknown;

    try {
      body = await readBoundedJson(request);
    } catch {
      return adminError(
        400,
        "VALIDATION_ERROR",
        "Bentuk permintaan tidak valid.",
      );
    }

    if (!isRecord(body)) {
      return adminError(
        400,
        "VALIDATION_ERROR",
        "Bentuk permintaan tidak valid.",
      );
    }

    const action = requiredString(body, "action");
    const permission = permissionForAction(action);

    if (!hasPermission(session.user.role, permission)) {
      throw new AuthorizationError(403, "Peran BEM ini tidak memiliki izin.");
    }

    const expectedUpdatedAt = requiredString(body, "expectedUpdatedAt");
    let result: unknown;

    if (action === "edit-content") {
      result = await editReportContent({
        actorUserId: session.user.id,
        reportId: id,
        expectedUpdatedAt,
        fields: body.fields,
        reason: requiredString(body, "reason"),
      });
    } else if (action === "status") {
      result = await changeReportStatus({
        actorUserId: session.user.id,
        expectedUpdatedAt,
        reasonCode: optionalString(body, "reasonCode"),
        reportId: id,
        reporterMessage: optionalString(body, "reporterMessage"),
        toStatus: requiredString(body, "toStatus"),
      });
    } else if (action === "reporter-message") {
      result = await addReporterMessage({
        actorUserId: session.user.id,
        expectedUpdatedAt,
        message: requiredString(body, "message"),
        reportId: id,
      });
    } else if (action === "case-fields") {
      result = await updateCaseFields({
        actorUserId: session.user.id,
        categoryId:
          body.categoryId === undefined
            ? undefined
            : requiredString(body, "categoryId"),
        expectedUpdatedAt,
        internalSummary:
          body.internalSummary === undefined
            ? undefined
            : optionalString(body, "internalSummary"),
        reportId: id,
        urgency:
          body.urgency === undefined
            ? undefined
            : requiredString(body, "urgency"),
      });
    } else if (action === "assign") {
      result = await assignReport({
        actorUserId: session.user.id,
        assigneeUserId: requiredString(body, "assigneeUserId"),
        expectedUpdatedAt,
        reason: optionalString(body, "reason"),
        reportId: id,
        routeLabel: requiredString(body, "routeLabel"),
      });
    } else if (action === "internal-note") {
      result = await addInternalNote({
        actorUserId: session.user.id,
        body: requiredString(body, "body"),
        expectedUpdatedAt,
        reportId: id,
      });
    } else if (action === "delete-note") {
      result = await deleteInternalNote({
        actorUserId: session.user.id,
        deletionReason: requiredString(body, "deletionReason"),
        expectedUpdatedAt,
        noteId: requiredString(body, "noteId"),
        reportId: id,
      });
    } else if (action === "archive") {
      result = await archiveReport({
        actorUserId: session.user.id,
        expectedUpdatedAt,
        reasonCode: optionalString(body, "reasonCode"),
        reportId: id,
      });
    } else if (action === "reopen") {
      result = await reopenReport({
        actorUserId: session.user.id,
        expectedUpdatedAt,
        reasonCode: optionalString(body, "reasonCode"),
        reportId: id,
        reporterMessage: optionalString(body, "reporterMessage"),
      });
    } else {
      return adminError(
        400,
        "VALIDATION_ERROR",
        "Tindakan laporan tidak dikenal.",
      );
    }

    return adminJson({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}
