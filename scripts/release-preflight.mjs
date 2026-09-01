import { pathToFileURL } from "node:url";

/**
 * Owner-run pre-deploy configuration gate.
 *
 * Validates the *shape* of an environment: required server secrets are real
 * values rather than the `.env.example` template, the public app URL is absolute
 * and not localhost once deployed, Cloudflare's test secret is not used in
 * production, and one-time bootstrap inputs are not left behind.
 *
 * It makes no network or database call and needs no production credential, so it
 * is deterministic and safe to run anywhere, including CI. It prints variable
 * names and reasons only, never a secret value, per `docs/SECURITY_PRIVACY.md`
 * sections 4 and 12.
 *
 * A pass means the configuration shape is sane. It is NOT evidence that a deploy
 * happened, that a provider accepted the values, or that any owner gate is met.
 *
 * Usage:
 *   npm run release:preflight
 *   node --env-file-if-exists=.env.local scripts/release-preflight.mjs
 */

export const secretPlaceholderPrefix = "replace-with";

/** Environments that must satisfy every deployed-grade rule. */
const deployedEnvironments = new Set(["preview", "production"]);
const knownEnvironments = ["development", "preview", "production"];

/** Server secrets that must be real, environment-specific values. */
const requiredSecrets = [
  "BETTER_AUTH_SECRET",
  "DATABASE_URL",
  "PUBLIC_ABUSE_SIGNAL_SECRET",
  "TURNSTILE_SECRET_KEY",
];

/** Cloudflare's always-passes test secret. Never valid in production. */
const turnstileTestSecret = "1x0000000000000000000000000000000AA";

/** Only schemes that can actually serve the application. */
const allowedProtocols = new Set(["http:", "https:"]);

/** Every one-time bootstrap input shares this prefix. */
const bootstrapVariablePrefix = "AUTH_BOOTSTRAP_";

const minimumSecretLength = 32;

export function isPlaceholderSecret(value) {
  const normalized = value?.trim();
  return !normalized || normalized.startsWith(secretPlaceholderPrefix);
}

export function runReleasePreflight(env) {
  const findings = [];
  const environment = env.DATABASE_ENVIRONMENT?.trim() ?? "";
  const isDeployed = deployedEnvironments.has(environment);
  const isProduction = environment === "production";

  const error = (variable, message) =>
    findings.push({ message, severity: "error", variable });
  const warn = (variable, message) =>
    findings.push({ message, severity: "warning", variable });

  if (!environment) {
    error(
      "DATABASE_ENVIRONMENT",
      "Wajib diisi: development, preview, atau production.",
    );
  } else if (!knownEnvironments.includes(environment)) {
    error("DATABASE_ENVIRONMENT", `Nilai tidak dikenal: "${environment}".`);
  }

  for (const variable of requiredSecrets) {
    const value = env[variable];

    if (isPlaceholderSecret(value)) {
      error(
        variable,
        value?.trim()
          ? "Masih memakai placeholder .env.example."
          : "Belum diatur.",
      );
      continue;
    }

    // Length is advisory locally so development is not blocked, but a short
    // secret in preview or production is a real finding.
    if (value.trim().length < minimumSecretLength) {
      const message = `Panjang di bawah ${minimumSecretLength} karakter.`;
      if (isDeployed) error(variable, message);
      else warn(variable, message);
    }
  }

  const appUrl = env.NEXT_PUBLIC_APP_URL?.trim();
  const deployPrimeUrl = env.DEPLOY_PRIME_URL?.trim();

  // Netlify's built-in per-deploy URL may stand in for a preview or branch
  // deploy, whose hostname is generated per pull request and cannot be a static
  // value. It may NEVER stand in for production: the approved origin has to be
  // stated explicitly so a provider URL cannot silently replace a custom domain.
  const deployUrlMayStandIn = isDeployed && !isProduction;
  const urlSource = appUrl
    ? "NEXT_PUBLIC_APP_URL"
    : deployUrlMayStandIn && deployPrimeUrl
      ? "DEPLOY_PRIME_URL"
      : "NEXT_PUBLIC_APP_URL";
  const urlValue = urlSource === "DEPLOY_PRIME_URL" ? deployPrimeUrl : appUrl;

  if (!urlValue) {
    if (isProduction) {
      error(
        "NEXT_PUBLIC_APP_URL",
        "Production wajib menyebut origin resmi secara eksplisit; DEPLOY_PRIME_URL tidak diterima sebagai pengganti.",
      );
    } else if (isDeployed) {
      error(
        "NEXT_PUBLIC_APP_URL",
        "Wajib diisi untuk environment ter-deploy, atau sediakan DEPLOY_PRIME_URL dari Netlify.",
      );
    }
  } else {
    let parsed;
    try {
      parsed = new URL(urlValue);
    } catch {
      error(urlSource, "Bukan URL absolut yang valid.");
    }

    if (parsed) {
      const isLocal =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";

      // Scheme first. `javascript:` and `data:` parse successfully but their
      // origin is the string "null", which makes every absolute-URL consumer
      // throw; `ftp:` parses and would be emitted verbatim into robots.txt.
      if (!allowedProtocols.has(parsed.protocol)) {
        error(
          urlSource,
          `Skema ${parsed.protocol} tidak diizinkan; gunakan http atau https.`,
        );
      } else {
        // sitemap.xml, robots.txt, and metadataBase all resolve against this.
        if (isDeployed && isLocal) {
          error(
            urlSource,
            "Masih menunjuk localhost pada environment ter-deploy.",
          );
        }
        if (isProduction && parsed.protocol !== "https:") {
          error(urlSource, "Production wajib memakai https.");
        }
      }
    }
  }

  if (env.TURNSTILE_SECRET_KEY?.trim() === turnstileTestSecret) {
    const message = "Memakai Cloudflare test secret.";
    if (isProduction) error("TURNSTILE_SECRET_KEY", message);
    else warn("TURNSTILE_SECRET_KEY", `${message} Hanya untuk pengujian.`);
  }

  if (isProduction) {
    // `DEPLOYMENT_RUNBOOK.md` step 6 of the auth bootstrap says to remove the
    // whole `AUTH_BOOTSTRAP_*` set — including `AUTH_BOOTSTRAP_NAME` — so this
    // matches on the prefix rather than a hand-listed pair, and keeps covering
    // any bootstrap variable added later.
    for (const variable of Object.keys(env).sort()) {
      if (
        variable.startsWith(bootstrapVariablePrefix) &&
        env[variable]?.trim()
      ) {
        error(
          variable,
          "Input bootstrap sekali pakai tidak boleh tersisa di production.",
        );
      }
    }
  }

  return {
    environment: environment || "(kosong)",
    findings,
    ok: findings.every((finding) => finding.severity !== "error"),
  };
}

/** Human-readable report. Variable names and reasons only, never values. */
export function formatPreflightReport(result) {
  const lines = [`Release preflight — environment: ${result.environment}`];

  if (result.findings.length === 0) {
    lines.push("Tidak ada temuan.");
  }

  for (const finding of result.findings) {
    const label = finding.severity === "error" ? "ERROR  " : "WARNING";
    lines.push(`${label} ${finding.variable}: ${finding.message}`);
  }

  lines.push(
    result.ok
      ? "Hasil: LULUS (tidak ada error). Ini bukan bukti deploy atau penerimaan provider."
      : "Hasil: GAGAL. Perbaiki setiap ERROR sebelum deploy.",
  );

  return lines.join("\n");
}

// Only run the CLI when this file is the entry point, so importing it from a
// test does not execute the check or set an exit code.
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  const result = runReleasePreflight(process.env);
  process.stdout.write(`${formatPreflightReport(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
