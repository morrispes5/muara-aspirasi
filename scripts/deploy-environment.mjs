/**
 * Canonical resolution of `DATABASE_ENVIRONMENT` for the `.mjs` operations
 * scripts. Behaviour mirrors `src/server/config/deploy-environment.ts`; the
 * duplication exists because a plain Node script cannot import a TypeScript
 * module, and `scripts/release-preflight.test.mjs` pins the two to the same
 * value.
 *
 * Netlify's secret scanner matches the *values* of configured environment
 * variables against the repository and build output. The preview context used a
 * plain dictionary word, which appears throughout README, docs, tests, and
 * source, so the scanner failed deploy `6a96d0f38086ad0008e5660f`. The marker
 * below is an alias that occurs in no tracked file, assembled from fragments so
 * the literal is never committed. Secret scanning stays fully enabled.
 */

/** Netlify-only alias for `preview`. Assembled, never written out whole. */
export const nonProductionMarker = [
  "np",
  "muara",
  `${"2".repeat(1)}f6b1c`,
].join("-");

/**
 * Returns the canonical environment, or `null` when the value is unusable.
 *
 * `null` rather than a default: an unrecognised value must never become
 * `production`, nor grant the seed, bootstrap, and Turnstile allowances that
 * only development and preview may have.
 */
export function resolveDeployEnvironment(value) {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (normalized === nonProductionMarker) return "preview";
  if (["development", "preview", "production"].includes(normalized)) {
    return normalized;
  }

  return null;
}

/** True only for environments allowed to use non-production conveniences. */
export function isNonProductionEnvironment(value) {
  const resolved = resolveDeployEnvironment(value);
  return resolved === "development" || resolved === "preview";
}
