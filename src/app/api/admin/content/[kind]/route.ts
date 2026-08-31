import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";

import { type BemPermission, hasPermission } from "@/server/auth/roles";

import {
  type ContentFormInput,
  ContentServiceError,
  createContent,
  listAdminContent,
  parseContentKind,
} from "@/server/content/publication";

import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ kind: string }> };
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

function permissionForKind(kind: "advocacy" | "student-info"): BemPermission {
  return kind === "advocacy" ? "DRAFT_ADVOCACY_UPDATE" : "DRAFT_STUDENT_INFO";
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { kind: rawKind } = await context.params;
    const kind = parseContentKind(rawKind);
    await requireBemPermission(
      permissionForKind(kind),
      new Headers(request.headers),
    );
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const pageSize = Number(url.searchParams.get("pageSize") ?? "12");
    const content = await listAdminContent(kind, {
      page: Number.isInteger(page) && page > 0 ? page : 1,
      pageSize: Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 12,
      search: url.searchParams.get("search") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    return adminJson({ content });
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
    const { kind: rawKind } = await context.params;
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
    if (kind === "advocacy" && bodyHasReportIds(body)) {
      if (!hasPermission(session.user.role, "PROCESS_REPORT")) {
        throw new AuthorizationError(
          403,
          "Peran BEM ini tidak dapat menautkan laporan ke update.",
        );
      }
    }
    const content = await createContent(kind, formInput(body), session.user.id);
    return adminJson({ content }, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
