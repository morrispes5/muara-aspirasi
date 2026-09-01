/**
 * Canonical public origin for absolute URLs in metadata, `sitemap.xml`, and
 * `robots.txt`.
 *
 * `robots.txt` previously emitted `Sitemap: /sitemap.xml`. A relative value is
 * invalid there: RFC 9309 section 2.2.3 and Google's own reference both require
 * the sitemap directive to be a fully qualified URL, so crawlers ignore it.
 * Every consumer now resolves against the same origin instead of each building
 * its own.
 *
 * The localhost fallback keeps local development working without configuration.
 * It is deliberately NOT treated as acceptable for a deployed environment;
 * `scripts/release-preflight.mjs` fails when `NEXT_PUBLIC_APP_URL` is missing or
 * still points at localhost, which is where that belongs — a build-time throw
 * here would break local development for no security gain.
 */
export const localAppUrlFallback = "http://localhost:3000";

/**
 * Only schemes that can actually serve this application.
 *
 * This matters beyond tidiness. `new URL("javascript:alert(1)").origin` is the
 * *string* `"null"`, so without this allowlist `getAppUrl()` returned `"null"`
 * and every caller then threw: `new URL(path, "null")` is a TypeError, which
 * would take down `sitemap.xml`, `robots.txt`, and — through `metadataBase` —
 * the root layout itself. `ftp://host` is the quieter half of the same bug: it
 * parses, so an invalid scheme was silently emitted into crawler-facing output.
 */
const allowedProtocols = new Set(["http:", "https:"]);

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) return localAppUrlFallback;

  try {
    const parsed = new URL(configured);
    if (!allowedProtocols.has(parsed.protocol)) return localAppUrlFallback;
    return parsed.origin;
  } catch {
    return localAppUrlFallback;
  }
}

export function absoluteUrl(path: string): string {
  return new URL(path, getAppUrl()).toString();
}
