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
  return !origin || origin === new URL(request.url).origin;
}
