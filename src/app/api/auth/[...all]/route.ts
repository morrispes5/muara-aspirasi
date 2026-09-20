import { toNextJsHandler } from "better-auth/next-js";

import {
  adminLoginRateLimit,
  adminMfaRateLimit,
  consumePublicRateLimit,
  getRequestNetworkSignal,
  PublicRateLimitError,
} from "@/server/aspirations/rate-limit";
import { getAuth } from "@/server/auth/auth";
import { isOwnerEmailAllowed } from "@/server/auth/owner-access";
import { isSameOriginRequest } from "@/server/security/origin";
import { publicError } from "@/server/aspirations/public-response";
import { readBoundedJson } from "@/server/security/request-body";
import { recordAuthAuditEvent } from "@/server/auth/audit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AuthMethod = "DELETE" | "GET" | "PATCH" | "POST" | "PUT";

const auditedOperations = new Set([
  "revoke-other-sessions",
  "revoke-session",
  "revoke-sessions",
  "sign-in",
  "sign-out",
]);

function getOperation(request: Request): string {
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "");

  if (pathname.endsWith("/sign-in/email")) {
    return "sign-in";
  }

  return pathname.split("/").pop() ?? "";
}

async function handleAuthRequest(
  request: Request,
  method: AuthMethod,
): Promise<Response> {
  const operation = getOperation(request);
  if (
    method === "POST" &&
    (operation === "sign-in" || operation.startsWith("verify-"))
  ) {
    if (!isSameOriginRequest(request))
      return publicError(403, "ACCESS_DENIED", "Akses ditolak.");
    try {
      await consumePublicRateLimit(
        operation === "sign-in" ? adminLoginRateLimit : adminMfaRateLimit,
        getRequestNetworkSignal(request),
      );
      const input = await readBoundedJson(request, 4096);
      if (
        operation === "sign-in" &&
        !isOwnerEmailAllowed((input as { email?: unknown } | null)?.email)
      ) {
        return publicError(
          401,
          "INVALID_CREDENTIALS",
          "Email atau kata sandi tidak cocok.",
        );
      }
      request = new Request(request.url, {
        method,
        headers: request.headers,
        body: JSON.stringify(input),
      });
    } catch (error) {
      if (error instanceof PublicRateLimitError) {
        return publicError(
          429,
          "TOO_MANY_ATTEMPTS",
          "Terlalu banyak percobaan. Tunggu sebelum masuk lagi.",
          null,
          error.retryAfterSeconds,
        );
      }
      return publicError(
        503,
        "LOGIN_UNAVAILABLE",
        "Login belum tersedia. Coba lagi beberapa saat.",
      );
    }
  }
  const shouldAudit = auditedOperations.has(operation);
  let actorUserId: string | null = null;

  if (shouldAudit && operation !== "sign-in") {
    try {
      const session = await getAuth().api.getSession({
        headers: request.headers,
      });
      actorUserId = session?.user.id ?? null;
    } catch {
      actorUserId = null;
    }
  }

  const handler = toNextJsHandler(getAuth())[method];
  const response = await handler(request);

  try {
    if (operation === "sign-in" && response.status >= 400) {
      await recordAuthAuditEvent({
        action: "AUTH_LOGIN_FAILURE",
        actorType: "PUBLIC",
        metadata: { httpStatus: response.status, method: "email_password" },
        result: "FAILED",
        targetId: "email-password",
        targetType: "AUTHENTICATION",
      });
    } else if (actorUserId && response.ok) {
      const action =
        operation === "sign-out" ? "AUTH_LOGOUT" : "AUTH_SESSION_REVOKED";

      await recordAuthAuditEvent({
        action,
        actorType: "BEM_USER",
        actorUserId,
        metadata: { operation },
        result: "SUCCESS",
        targetId: actorUserId,
        targetType: "BEM_USER",
      });
    }
  } catch {
    // Authentication responses must not expose database/audit implementation details.
  }

  return response;
}

export function DELETE(request: Request) {
  return handleAuthRequest(request, "DELETE");
}

export function GET(request: Request) {
  return handleAuthRequest(request, "GET");
}

export function PATCH(request: Request) {
  return handleAuthRequest(request, "PATCH");
}

export function POST(request: Request) {
  return handleAuthRequest(request, "POST");
}

export function PUT(request: Request) {
  return handleAuthRequest(request, "PUT");
}
