/**
 * Shared rule for "this server secret is a real value, not the template".
 *
 * `docs/SECURITY_PRIVACY.md` section 12 requires the build to fail with a safe
 * message when a required server secret is missing, and forbids falling back to
 * anything else. `BETTER_AUTH_SECRET` already enforced that inline in
 * `src/server/auth/auth.ts`, but `PUBLIC_ABUSE_SIGNAL_SECRET` only checked for
 * emptiness — so copying `.env.example` verbatim into a deployed environment
 * shipped a HMAC salt that is committed to this repository, which would make
 * rate-limit bucket keys and idempotency hashes computable by anyone holding the
 * source.
 *
 * Only the placeholder and empty cases throw at runtime. A minimum-length rule
 * lives in `scripts/release-preflight.mjs` instead: it is the owner's pre-deploy
 * gate, and enforcing a length here could hard-fail an already-running preview
 * environment whose value this repository cannot inspect.
 */
export const secretPlaceholderPrefix = "replace-with";

export class SecretConfigurationError extends Error {
  constructor(public readonly variableName: string) {
    // Names the variable, never the value.
    super(`${variableName} belum diatur dengan nilai acak khusus environment.`);
    this.name = "SecretConfigurationError";
  }
}

export function isPlaceholderSecret(value: string | undefined): boolean {
  const normalized = value?.trim();
  return !normalized || normalized.startsWith(secretPlaceholderPrefix);
}

/** Returns the trimmed secret, or throws if it is absent or still the template. */
export function requireConfiguredSecret(
  value: string | undefined,
  variableName: string,
): string {
  if (isPlaceholderSecret(value)) {
    throw new SecretConfigurationError(variableName);
  }

  return value!.trim();
}
