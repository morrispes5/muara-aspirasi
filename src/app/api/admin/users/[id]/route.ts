import {
  AccessManagementError,
  updateBemUserAccess,
} from "@/server/auth/user-management";
import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import { isBemRole } from "@/server/auth/roles";
import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return adminError(
      error.statusCode,
      error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      error.statusCode === 401
        ? "Sesi BEM diperlukan untuk mengubah akun."
        : "Peran BEM ini tidak memiliki izin mengubah akun.",
    );
  }
  if (error instanceof AccessManagementError) {
    const status =
      error.code === "FORBIDDEN" || error.code === "SELF_LOCKOUT"
        ? 403
        : error.code === "USER_NOT_FOUND"
          ? 404
          : 409;
    return adminError(status, error.code, error.message);
  }
  return adminError(
    500,
    "REQUEST_FAILED",
    "Perubahan akun belum dapat disimpan. Coba lagi beberapa saat.",
  );
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
    const session = await requireBemPermission(
      "MANAGE_USERS",
      new Headers(request.headers),
    );
    const { id } = await context.params;
    if (!isUuid(id)) {
      return adminError(404, "USER_NOT_FOUND", "Akun BEM tidak ditemukan.");
    }

    const body = await request.json();
    const keys = isRecord(body) ? Object.keys(body) : [];
    if (
      !isRecord(body) ||
      keys.length < 1 ||
      keys.length > 2 ||
      keys.some((key) => key !== "role" && key !== "status")
    ) {
      return adminError(
        422,
        "VALIDATION_ERROR",
        "Perubahan akses tidak valid.",
      );
    }

    const role = body.role;
    const status = body.status;
    if (
      (role !== undefined && (typeof role !== "string" || !isBemRole(role))) ||
      (status !== undefined && status !== "ACTIVE" && status !== "SUSPENDED")
    ) {
      return adminError(
        422,
        "VALIDATION_ERROR",
        "Role atau status akun tidak valid.",
      );
    }

    const result = await updateBemUserAccess({
      actorUserId: session.user.id,
      role: role as Parameters<typeof updateBemUserAccess>[0]["role"],
      status: status as Parameters<typeof updateBemUserAccess>[0]["status"],
      targetUserId: id,
    });

    return adminJson({ user: result });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return adminError(
        400,
        "VALIDATION_ERROR",
        "Bentuk permintaan tidak valid.",
      );
    }
    return errorResponse(error);
  }
}
