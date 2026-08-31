import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";

import { type BemPermission, hasPermission } from "@/server/auth/roles";

import {
  type ContentFormInput,
  ContentServiceError,
  getAdminContent,
  mutateContent,
  parseContentAction,
  parseContentKind,
} from "@/server/content/publication";

import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string; kind: string }> };
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function bodyHasReportIds(body: JsonRecord): boolean {
  return Object.prototype.hasOwnProperty.call(body, "reportIds");
}

function requiredString(body: JsonRecord, key: string) {
  return typeof body[key] === "string" ? body[key] : "";
}

function optionalString(body: JsonRecord, key: string) {
  return body[key] === null ||
    body[key] === undefined ||
    typeof body[key] === "string"
    ? (body[key] as string | null | undefined)
    : "";
}

function formInput(body: JsonRecord): ContentFormInput {
  return {
    body: requiredString(body, "body"),
    category: optionalString(body, "category") ?? undefined,
    categoryId: optionalString(body, "categoryId") ?? undefined,
    isPinned:
      body.isPinned === undefined ? undefined : (body.isPinned as boolean),
    progressLabel: optionalString(body, "progressLabel") ?? undefined,
    reportIds: Array.isArray(body.reportIds)
      ? (body.reportIds as string[])
      : undefined,
    slug: requiredString(body, "slug"),
    sourceCredit: optionalString(body, "sourceCredit") ?? undefined,
    sourceUrl: optionalString(body, "sourceUrl") ?? undefined,
    summary: requiredString(body, "summary"),
    title: requiredString(body, "title"),
  };
}

function permissionForKind(kind: "advocacy" | "student-info"): BemPermission {
  return kind === "advocacy" ? "DRAFT_ADVOCACY_UPDATE" : "DRAFT_STUDENT_INFO";
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return adminError(
      error.statusCode,
      error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      error.statusCode === 401
        ? "Sesi BEM diperlukan untuk mengelola konten."
        : "Peran BEM ini tidak memiliki akses konten.",
    );
  }
  if (error instanceof ContentServiceError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "CONFLICT" || error.code === "SLUG_TAKEN"
          ? 409
          : 400;
    return adminError(status, error.code, error.message);
  }
  return adminError(
    500,
    "REQUEST_FAILED",
    "Konten belum dapat diproses. Coba lagi beberapa saat.",
  );
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id, kind: rawKind } = await context.params;
    const kind = parseContentKind(rawKind);
    await requireBemPermission(
      permissionForKind(kind),
      new Headers(request.headers),
    );
    const content = await getAdminContent(kind, id);
    return content
      ? adminJson({ content })
      : adminError(404, "NOT_FOUND", "Konten tidak ditemukan.");
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return adminError(
      403,
      "REQUEST_REJECTED",
      "Permintaan dari origin ini tidak diizinkan.",
    );
  }
  try {
    const { id, kind: rawKind } = await context.params;
    const kind = parseContentKind(rawKind);
    const session = await requireBemPermission(
      permissionForKind(kind),
      new Headers(request.headers),
    );
    let body: unknown;
    try {
      body = await request.json();
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
    const action = parseContentAction(body.action);
    if (
      (action === "publish" || action === "archive") &&
      !hasPermission(session.user.role, "APPROVE_PUBLICATION")
    ) {
      throw new AuthorizationError(
        403,
        "Peran BEM ini tidak dapat menyetujui publikasi.",
      );
    }
    if (
      action === "save_draft" &&
      !hasPermission(session.user.role, "APPROVE_PUBLICATION")
    ) {
      const current = await getAdminContent(kind, id);
      if (current?.publicationStatus === "PUBLISHED") {
        throw new AuthorizationError(
          403,
          "Konten terbit hanya dapat diedit oleh Admin agar selalu melewati review.",
        );
      }
    }
    if (kind === "advocacy" && bodyHasReportIds(body)) {
      if (!hasPermission(session.user.role, "PROCESS_REPORT")) {
        throw new AuthorizationError(
          403,
          "Peran BEM ini tidak dapat menautkan laporan ke update.",
        );
      }
    }
    const content = await mutateContent(
      kind,
      id,
      action,
      formInput(body),
      requiredString(body, "expectedUpdatedAt"),
      session.user.id,
    );
    return adminJson({ content });
  } catch (error) {
    return errorResponse(error);
  }
}
