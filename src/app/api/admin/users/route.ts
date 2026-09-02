import {
  AccessManagementError,
  createBemUser,
  listBemUsers,
} from "@/server/auth/user-management";
import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import { isBemRole } from "@/server/auth/roles";
import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return adminError(
      error.statusCode,
      error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      error.statusCode === 401
        ? "Sesi BEM diperlukan untuk mengelola akun."
        : "Peran BEM ini tidak memiliki izin mengelola akun.",
    );
  }

  if (error instanceof AccessManagementError) {
    const status =
      error.code === "FORBIDDEN"
        ? 403
        : error.code === "EMAIL_EXISTS"
          ? 409
          : 422;
    return adminError(status, error.code, error.message);
  }

  return adminError(
    500,
    "REQUEST_FAILED",
    "Akun BEM belum dapat diproses. Coba lagi beberapa saat.",
  );
}

export async function GET(request: Request) {
  try {
    const session = await requireBemPermission(
      "MANAGE_USERS",
      new Headers(request.headers),
    );
    const users = await listBemUsers(session.user.id);

    return adminJson({
      users: users.map((user) => ({
        ...user,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
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
    const body = await request.json();

    if (
      !isRecord(body) ||
      Object.keys(body).length !== 4 ||
      typeof body.email !== "string" ||
      typeof body.name !== "string" ||
      typeof body.password !== "string" ||
      typeof body.role !== "string" ||
      !isBemRole(body.role)
    ) {
      return adminError(422, "VALIDATION_ERROR", "Data akun tidak valid.");
    }

    const user = await createBemUser({
      actorUserId: session.user.id,
      email: body.email,
      name: body.name,
      password: body.password,
      role: body.role,
    });

    return adminJson({ user }, 201);
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
