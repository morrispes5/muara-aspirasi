import { NextResponse } from "next/server";

import {
  AuthorizationError,
  requireBemPermission,
} from "@/server/auth/session";
import {
  EvidenceUploadError,
  getEvidenceDownloadLink,
} from "@/server/aspirations/evidence-service";
import { adminError } from "@/server/aspirations/admin-response";
import { isSameOriginRequest } from "@/server/security/origin";
import { recordAuthAuditEvent } from "@/server/auth/audit";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ evidenceId: string; id: string }>;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function GET(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) {
    return adminError(
      403,
      "REQUEST_REJECTED",
      "Permintaan dari origin ini tidak diizinkan.",
    );
  }

  try {
    const session = await requireBemPermission(
      "VIEW_CONFIDENTIAL_REPORT",
      new Headers(request.headers),
    );
    const { evidenceId, id } = await context.params;

    if (!isUuid(id) || !isUuid(evidenceId)) {
      return adminError(404, "EVIDENCE_NOT_FOUND", "Evidence tidak ditemukan.");
    }

    const downloadUrl = await getEvidenceDownloadLink(id, evidenceId);
    await recordAuthAuditEvent({
      action: "EVIDENCE_ACCESSED",
      actorType: "BEM_USER",
      actorUserId: session.user.id,
      metadata: { evidenceId, reportId: id },
      result: "SUCCESS",
      targetId: id,
      targetType: "ASPIRATION_REPORT",
    });

    return NextResponse.redirect(downloadUrl, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
      },
      status: 307,
    });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return adminError(
        error.statusCode,
        error.statusCode === 401 ? "AUTH_REQUIRED" : "FORBIDDEN",
        error.statusCode === 401
          ? "Sesi BEM diperlukan untuk membuka evidence."
          : "Peran BEM ini tidak memiliki izin melihat evidence.",
      );
    }

    if (error instanceof EvidenceUploadError) {
      const status =
        error.code === "CONFIGURATION" || error.code === "STORAGE" ? 503 : 404;
      return adminError(
        status,
        status === 503 ? "EVIDENCE_UNAVAILABLE" : "EVIDENCE_NOT_FOUND",
        status === 503
          ? "Evidence belum tersedia di penyimpanan privat."
          : "Evidence tidak ditemukan.",
      );
    }

    return adminError(
      500,
      "REQUEST_FAILED",
      "Evidence belum dapat dibuka. Coba lagi beberapa saat.",
    );
  }
}
