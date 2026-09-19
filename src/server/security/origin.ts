/**
 * Origin check for sensitive non-GET requests, per `docs/SECURITY_PRIVACY.md`
 * section 10 ("Verifikasi Origin/Host untuk request browser sensitif").
 *
 * A browser always attaches `Origin` to a cross-origin request, so a mismatch
 * is rejected. A request with no `Origin` at all is allowed because same-origin
 * non-browser callers (health checks, curl during an incident drill) legitimately
 * omit it; the session cookie `SameSite` policy remains the primary CSRF control
 * and this check is defence in depth on top of it.
 *
 * This is the single definition behind every route that guards its mutations;
 * the behaviour is intentionally identical to the per-route copies it replaced.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === new URL(request.url).origin) {
    return true;
  }

  const host = request.headers.get("host")?.trim();
  if (!host || host.includes(",") || /[/?#\\]/.test(host)) {
    return false;
  }

  const forwardedProtocol = request.headers
    .get("x-forwarded-proto")
    ?.split(",", 1)[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "http" || forwardedProtocol === "https"
      ? forwardedProtocol
      : new URL(request.url).protocol.slice(0, -1);

  try {
    return origin === new URL(`${protocol}://${host}`).origin;
  } catch {
    return false;
  }
}
