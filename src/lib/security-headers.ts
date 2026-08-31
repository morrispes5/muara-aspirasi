/**
 * Response security headers for every route.
 *
 * Scope note (Milestone 8 Wave 1): these are the headers that are safe to apply
 * from the application without a browser compatibility pass. Two controls are
 * deliberately NOT set here and remain owner/deploy decisions recorded in
 * `docs/SECURITY_PRIVACY.md`:
 *
 * - `Strict-Transport-Security`, because a wrong `max-age` is cached by
 *   browsers and is not reversible from the application side.
 * - An enforcing `Content-Security-Policy`. Per `SECURITY_PRIVACY.md` section 10
 *   ("Terapkan Content Security Policy bertahap dan uji compatibility") the
 *   policy below ships as report-only first, so a mistake cannot break the
 *   public form or the Turnstile challenge before a preview QA pass.
 */

/** The only third-party origin the application talks to at runtime. */
export const turnstileOrigin = "https://challenges.cloudflare.com";

/**
 * Google fonts are pulled in through `next/font`, which self-hosts them at
 * build time, so no font or style origin outside `'self'` is needed.
 */
export function contentSecurityPolicy(isDevelopment = false): string {
  const scriptSrc = [
    "'self'",
    // Next.js injects inline bootstrap/hydration scripts. Replacing this with
    // per-request nonces needs middleware work that is tracked as pending.
    "'unsafe-inline'",
    // React Refresh needs eval in dev only; it is never allowed in a build.
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
    turnstileOrigin,
  ];

  const directives: Array<[string, string[]]> = [
    ["default-src", ["'self'"]],
    ["base-uri", ["'self'"]],
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'none'"]],
    ["form-action", ["'self'"]],
    ["script-src", scriptSrc],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", ["'self'", turnstileOrigin]],
    ["frame-src", [turnstileOrigin]],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
  ];

  return directives
    .map(([directive, values]) => `${directive} ${values.join(" ")}`)
    .join("; ");
}

/**
 * Denies the browser features this application never uses, so a compromised or
 * injected script cannot silently reach a camera, microphone, or location.
 */
export const permissionsPolicy = [
  "accelerometer=()",
  "autoplay=()",
  "browsing-topics=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=()",
  "geolocation=()",
  "gyroscope=()",
  "interest-cohort=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
].join(", ");

export type SecurityHeader = { key: string; value: string };

export function securityHeaders(isDevelopment = false): SecurityHeader[] {
  return [
    {
      key: "Content-Security-Policy-Report-Only",
      value: contentSecurityPolicy(isDevelopment),
    },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Permissions-Policy", value: permissionsPolicy },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-DNS-Prefetch-Control", value: "off" },
    { key: "X-Frame-Options", value: "DENY" },
  ];
}
