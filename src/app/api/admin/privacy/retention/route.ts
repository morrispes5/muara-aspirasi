import { adminError, adminJson } from "@/server/aspirations/admin-response";
import {
  approveDeletionRequest,
  executeApprovedDeletion,
  listRetentionReviewQueue,
  placeRetentionHold,
  PrivacyRetentionError,
  recordMailboxDeletionRequest,
  releaseRetentionHold,
  verifyDeletionRequest,
} from "@/server/privacy/retention";
import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import { isSameOriginRequest } from "@/server/security/origin";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(body: JsonRecord, key: string) {
  return typeof body[key] === "string" ? body[key] : "";
}

function errorResponse(error: unknown) {
  if (error instanceof AuthorizationError) {
    return adminError(
      error.statusCode,
      error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
      error.statusCode === 401
        ? "Sesi ADMIN dengan MFA diperlukan untuk mengelola retensi."
        : "Hanya ADMIN dengan MFA yang dapat mengelola retensi.",
    );
  }
  if (error instanceof PrivacyRetentionError) {
    const status =
      error.code === "NOT_FOUND"
        ? 404
        : error.code === "CONFLICT" ||
            error.code === "HOLD_ACTIVE" ||
            error.code === "INVALID_STATUS" ||
            error.code === "EVIDENCE_STORAGE_DISABLED"
          ? 409
          : 400;
    return adminError(status, error.code, error.message);
  }
  return adminError(
    500,
    "REQUEST_FAILED",
    "Workflow retensi belum dapat diproses. Coba lagi beberapa saat.",
  );
}

async function requireMfaAdmin(request: Request) {
  const session = await requireBemPermission(
    "MANAGE_PRIVACY_RETENTION",
    new Headers(request.headers),
  );
  if (session.user.role !== "ADMIN" || !session.user.twoFactorEnabled) {
    throw new AuthorizationError(
      403,
      "ADMIN wajib memiliki MFA aktif untuk workflow retensi.",
    );
  }
  return session;
}

export async function GET(request: Request) {
  try {
    await requireMfaAdmin(request);
    const queue = await listRetentionReviewQueue();
    return adminJson({
      queue: queue.map((item) => ({
        ...item,
        closedAt: item.closedAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        eligibleAt: item.eligibleAt.toISOString(),
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
    const session = await requireMfaAdmin(request);
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return adminError(
        400,
        "VALIDATION_ERROR",
        "Bentuk permintaan tidak valid.",
      );
    }

    const action = stringValue(body, "action");
    let result: unknown;
    if (action === "record-mailbox-request") {
      result = await recordMailboxDeletionRequest({
        actorUserId: session.user.id,
        reportId: stringValue(body, "reportId"),
        requestCategory: stringValue(body, "requestCategory"),
      });
    } else if (action === "place-hold") {
      result = await placeRetentionHold({
        actorUserId: session.user.id,
        reasonCode: stringValue(body, "reasonCode"),
        reportId: stringValue(body, "reportId"),
      });
    } else if (action === "release-hold") {
      result = await releaseRetentionHold({
        actorUserId: session.user.id,
        holdId: stringValue(body, "holdId"),
      });
    } else if (action === "verify-request") {
      result = await verifyDeletionRequest({
        actorUserId: session.user.id,
        requestId: stringValue(body, "requestId"),
      });
    } else if (action === "approve-request") {
      result = await approveDeletionRequest({
        actorUserId: session.user.id,
        requestId: stringValue(body, "requestId"),
      });
    } else if (action === "execute-deletion") {
      result = await executeApprovedDeletion({
        actorUserId: session.user.id,
        requestId: stringValue(body, "requestId"),
      });
    } else {
      return adminError(
        400,
        "VALIDATION_ERROR",
        "Tindakan retensi tidak dikenal.",
      );
    }
    return adminJson({ ok: true, result });
  } catch (error) {
    return errorResponse(error);
  }
}
