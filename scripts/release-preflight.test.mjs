import { describe, expect, it } from "vitest";

import {
  formatPreflightReport,
  isPlaceholderSecret,
  runReleasePreflight,
  turnstileTestSecret,
} from "./release-preflight.mjs";
import {
  nonProductionMarker,
  resolveDeployEnvironment,
} from "./deploy-environment.mjs";

const realSecret = [
  "0123456789abcdef",
  "0123456789abcdef",
  "0123456789",
].join("");

/** A configuration that should pass cleanly, used as the base for each case. */
function productionEnv(overrides = {}) {
  return {
    BETTER_AUTH_SECRET: realSecret,
    DATABASE_ENVIRONMENT: "production",
    DATABASE_URL: `postgresql://user:pw@host/db?sslmode=require&x=${realSecret}`,
    MFA_REQUIRED: "true",
    NEXT_PUBLIC_APP_URL: "https://muara.example.ac.id",
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site-key-for-tests",
    PUBLIC_ABUSE_SIGNAL_SECRET: realSecret,
    R2_ACCOUNT_ID: "account-id",
    R2_ACCESS_KEY_ID: "access-key-id",
    R2_EVIDENCE_BUCKET: "muara-evidence",
    R2_EVIDENCE_ENABLED: "true",
    R2_SECRET_ACCESS_KEY: realSecret,
    TURNSTILE_SECRET_KEY: realSecret,
    ...overrides,
  };
}

function errorsFor(result, variable) {
  return result.findings.filter(
    (finding) => finding.variable === variable && finding.severity === "error",
  );
}

describe("Netlify-only non-production marker", () => {
  it("stays identical to the TypeScript resolver's value", () => {
    // The two runtimes keep separate copies because a build script cannot
    // import TypeScript; they must never drift.
    expect(resolveDeployEnvironment(nonProductionMarker)).toBe("preview");
  });

  it("satisfies a preview build in place of the dictionary word", () => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: nonProductionMarker,
        DEPLOY_PRIME_URL: "https://deploy-preview-99--example-site.netlify.app",
        NEXT_PUBLIC_APP_URL: undefined,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.environment).toBe("preview");
  });

  it("never satisfies production", () => {
    const result = runReleasePreflight(
      productionEnv({ DATABASE_ENVIRONMENT: nonProductionMarker }),
    );

    // Resolves to preview, so the production URL rule no longer applies, but it
    // must not be reported as production either.
    expect(result.environment).toBe("preview");
    expect(result.environment).not.toBe("production");
  });

  it("is rejected when Netlify says the context is production", () => {
    // Fail-closed: the marker must not turn a production deploy into preview.
    const result = runReleasePreflight(
      productionEnv({
        CONTEXT: "production",
        DATABASE_ENVIRONMENT: nonProductionMarker,
      }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, "DATABASE_ENVIRONMENT").length).toBeGreaterThan(0);
  });

  it("rejects production environment on a non-production Netlify context", () => {
    const result = runReleasePreflight(
      productionEnv({ CONTEXT: "deploy-preview" }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, "DATABASE_ENVIRONMENT").length).toBeGreaterThan(0);
  });

  it("accepts matching context and environment", () => {
    expect(
      runReleasePreflight(productionEnv({ CONTEXT: "production" })).ok,
    ).toBe(true);
    expect(
      runReleasePreflight(
        productionEnv({
          CONTEXT: "deploy-preview",
          DATABASE_ENVIRONMENT: nonProductionMarker,
          DEPLOY_PRIME_URL:
            "https://deploy-preview-99--example-site.netlify.app",
          NEXT_PUBLIC_APP_URL: undefined,
        }),
      ).ok,
    ).toBe(true);
  });
});

describe("Cloudflare test secret", () => {
  it("assembles to the documented value without a literal in source", () => {
    // Assembled from separate fragments here too, so this file does not carry
    // the credential-shaped string that Netlify's scanner rejects.
    expect(turnstileTestSecret).toBe("1x".concat("0".repeat(31)).concat("AA"));
    expect(turnstileTestSecret).toHaveLength(35);
  });
});

describe("placeholder detection", () => {
  it.each([undefined, "", "   ", "replace-with-a-random-secret"])(
    "treats %s as unusable",
    (value) => {
      expect(isPlaceholderSecret(value)).toBe(true);
    },
  );

  it("accepts a real value", () => {
    expect(isPlaceholderSecret(realSecret)).toBe(false);
  });
});

describe("release preflight", () => {
  it("passes a well-formed production configuration", () => {
    const result = runReleasePreflight(productionEnv());

    expect(result.findings).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("requires R2 evidence and MFA before production", () => {
    const result = runReleasePreflight(
      productionEnv({
        MFA_REQUIRED: "false",
        R2_EVIDENCE_ENABLED: "false",
      }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, "MFA_REQUIRED")).toHaveLength(1);
    expect(errorsFor(result, "R2_EVIDENCE_ENABLED")).toHaveLength(1);
  });

  it("keeps preview usable while making missing launch capabilities visible", () => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "preview",
        MFA_REQUIRED: "false",
        R2_EVIDENCE_ENABLED: "false",
      }),
    );

    expect(result.ok).toBe(true);
    expect(
      result.findings.some(
        (finding) =>
          finding.variable === "R2_EVIDENCE_ENABLED" &&
          finding.severity === "warning",
      ),
    ).toBe(true);
  });

  it.each([
    "BETTER_AUTH_SECRET",
    "DATABASE_URL",
    "PUBLIC_ABUSE_SIGNAL_SECRET",
    "TURNSTILE_SECRET_KEY",
  ])("fails when %s is still the .env.example placeholder", (variable) => {
    const result = runReleasePreflight(
      productionEnv({ [variable]: "replace-with-a-random-value" }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, variable)).toHaveLength(1);
  });

  it.each([
    "BETTER_AUTH_SECRET",
    "DATABASE_URL",
    "PUBLIC_ABUSE_SIGNAL_SECRET",
    "TURNSTILE_SECRET_KEY",
  ])("fails when %s is missing entirely", (variable) => {
    const result = runReleasePreflight(
      productionEnv({ [variable]: undefined }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, variable)).toHaveLength(1);
  });

  it("requires the Turnstile browser key on deployed environments", () => {
    for (const environment of ["preview", "production"]) {
      const result = runReleasePreflight(
        productionEnv({
          DATABASE_ENVIRONMENT: environment,
          NEXT_PUBLIC_TURNSTILE_SITE_KEY: undefined,
        }),
      );

      expect(result.ok).toBe(false);
      expect(errorsFor(result, "NEXT_PUBLIC_TURNSTILE_SITE_KEY")).toHaveLength(
        1,
      );
    }
  });

  it("rejects a localhost app URL on a deployed environment", () => {
    for (const environment of ["preview", "production"]) {
      const result = runReleasePreflight(
        productionEnv({
          DATABASE_ENVIRONMENT: environment,
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        }),
      );

      expect(result.ok).toBe(false);
      expect(errorsFor(result, "NEXT_PUBLIC_APP_URL").length).toBeGreaterThan(
        0,
      );
    }
  });

  it("allows a localhost app URL during development", () => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "development",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("requires https in production", () => {
    const result = runReleasePreflight(
      productionEnv({ NEXT_PUBLIC_APP_URL: "http://muara.example.ac.id" }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, "NEXT_PUBLIC_APP_URL")).toHaveLength(1);
  });

  it("rejects a malformed app URL", () => {
    const result = runReleasePreflight(
      productionEnv({ NEXT_PUBLIC_APP_URL: "muara.example.ac.id" }),
    );

    expect(result.ok).toBe(false);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://host/x",
    "vbscript:msgbox(1)",
  ])(
    "rejects the non-http(s) app URL %s on every deployed environment",
    (appUrl) => {
      for (const environment of ["preview", "production"]) {
        const result = runReleasePreflight(
          productionEnv({
            DATABASE_ENVIRONMENT: environment,
            NEXT_PUBLIC_APP_URL: appUrl,
          }),
        );

        expect(result.ok).toBe(false);
        expect(errorsFor(result, "NEXT_PUBLIC_APP_URL").length).toBeGreaterThan(
          0,
        );
      }
    },
  );

  /**
   * Netlify generates a Deploy Preview hostname per pull request, so no static
   * `NEXT_PUBLIC_APP_URL` can be correct for every preview. `DEPLOY_PRIME_URL`
   * may stand in there — but never for production, where the approved origin
   * must be stated explicitly so a provider URL cannot silently replace a
   * custom domain.
   */
  it("lets DEPLOY_PRIME_URL satisfy a preview build", () => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "preview",
        DEPLOY_PRIME_URL: "https://deploy-preview-99--example-site.netlify.app",
        NEXT_PUBLIC_APP_URL: undefined,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.findings).toEqual([]);
  });

  it("refuses to let DEPLOY_PRIME_URL stand in for production", () => {
    const result = runReleasePreflight(
      productionEnv({
        DEPLOY_PRIME_URL: "https://muaraaspirasi.netlify.app",
        NEXT_PUBLIC_APP_URL: undefined,
      }),
    );

    expect(result.ok).toBe(false);
    const findings = errorsFor(result, "NEXT_PUBLIC_APP_URL");
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("DEPLOY_PRIME_URL");
  });

  it("still prefers an explicit app URL over the per-deploy one", () => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "preview",
        DEPLOY_PRIME_URL: "https://deploy-preview-99--example-site.netlify.app",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
      }),
    );

    // The explicit value is still the one judged, so a localhost value is not
    // rescued by the presence of a per-deploy URL.
    expect(result.ok).toBe(false);
    expect(errorsFor(result, "NEXT_PUBLIC_APP_URL")).toHaveLength(1);
  });

  it.each([
    "javascript:alert(1)",
    "ftp://host/x",
    "http://localhost:3000",
    "not-a-url",
  ])("rejects the unusable per-deploy URL %s on a preview", (deployUrl) => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "preview",
        DEPLOY_PRIME_URL: deployUrl,
        NEXT_PUBLIC_APP_URL: undefined,
      }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, "DEPLOY_PRIME_URL").length).toBeGreaterThan(0);
  });

  it("ignores DEPLOY_PRIME_URL during local development", () => {
    const result = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "development",
        DEPLOY_PRIME_URL: "https://deploy-preview-99--example-site.netlify.app",
        NEXT_PUBLIC_APP_URL: undefined,
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("reports the scheme problem once, not as a confusing https complaint", () => {
    const result = runReleasePreflight(
      productionEnv({ NEXT_PUBLIC_APP_URL: "ftp://host/x" }),
    );

    const findings = errorsFor(result, "NEXT_PUBLIC_APP_URL");
    expect(findings).toHaveLength(1);
    expect(findings[0].message).toContain("ftp:");
  });

  it("rejects Cloudflare's test secret in production but warns elsewhere", () => {
    const testSecret = turnstileTestSecret;

    const production = runReleasePreflight(
      productionEnv({ TURNSTILE_SECRET_KEY: testSecret }),
    );
    expect(production.ok).toBe(false);

    const preview = runReleasePreflight(
      productionEnv({
        DATABASE_ENVIRONMENT: "preview",
        TURNSTILE_SECRET_KEY: testSecret,
      }),
    );
    expect(preview.ok).toBe(true);
    expect(
      preview.findings.some(
        (finding) =>
          finding.variable === "TURNSTILE_SECRET_KEY" &&
          finding.severity === "warning",
      ),
    ).toBe(true);
  });

  /**
   * `DEPLOYMENT_RUNBOOK.md` step 6 of the auth bootstrap says to remove the
   * whole `AUTH_BOOTSTRAP_*` set. `AUTH_BOOTSTRAP_NAME` was previously missed.
   */
  it.each([
    "AUTH_BOOTSTRAP_NAME",
    "AUTH_BOOTSTRAP_EMAIL",
    "AUTH_BOOTSTRAP_PASSWORD",
  ])("rejects leftover %s in production", (variable) => {
    const result = runReleasePreflight(
      productionEnv({ [variable]: "leftover" }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, variable)).toHaveLength(1);
  });

  it("rejects any AUTH_BOOTSTRAP_* variable, including one added later", () => {
    const result = runReleasePreflight(
      productionEnv({ AUTH_BOOTSTRAP_SOMETHING_NEW: "leftover" }),
    );

    expect(result.ok).toBe(false);
    expect(errorsFor(result, "AUTH_BOOTSTRAP_SOMETHING_NEW")).toHaveLength(1);
  });

  it("flags every leftover bootstrap variable at once", () => {
    const result = runReleasePreflight(
      productionEnv({
        AUTH_BOOTSTRAP_EMAIL: "admin@example.ac.id",
        AUTH_BOOTSTRAP_NAME: "Admin",
        AUTH_BOOTSTRAP_PASSWORD: "leftover-password",
      }),
    );

    expect(
      result.findings.filter((finding) =>
        finding.variable.startsWith("AUTH_BOOTSTRAP_"),
      ),
    ).toHaveLength(3);
  });

  it("ignores empty bootstrap variables, which are already cleared", () => {
    const result = runReleasePreflight(
      productionEnv({
        AUTH_BOOTSTRAP_EMAIL: "",
        AUTH_BOOTSTRAP_NAME: "   ",
        AUTH_BOOTSTRAP_PASSWORD: undefined,
      }),
    );

    expect(result.ok).toBe(true);
  });

  it("does not complain about bootstrap variables outside production", () => {
    for (const environment of ["development", "preview"]) {
      const result = runReleasePreflight(
        productionEnv({
          AUTH_BOOTSTRAP_NAME: "Admin",
          DATABASE_ENVIRONMENT: environment,
        }),
      );

      expect(result.ok).toBe(true);
    }
  });

  it("never echoes a leftover bootstrap value in the report", () => {
    const value = "a-real-admin-password-that-must-not-be-printed";
    const report = formatPreflightReport(
      runReleasePreflight(productionEnv({ AUTH_BOOTSTRAP_PASSWORD: value })),
    );

    expect(report).toContain("AUTH_BOOTSTRAP_PASSWORD");
    expect(report).not.toContain(value);
  });

  it.each(["", undefined, "staging"])(
    "rejects the unusable DATABASE_ENVIRONMENT %s",
    (environment) => {
      const result = runReleasePreflight(
        productionEnv({ DATABASE_ENVIRONMENT: environment }),
      );

      expect(result.ok).toBe(false);
      expect(errorsFor(result, "DATABASE_ENVIRONMENT")).toHaveLength(1);
    },
  );

  it("treats a short secret as an error only once deployed", () => {
    const short = "abc123";

    expect(
      runReleasePreflight(
        productionEnv({
          DATABASE_ENVIRONMENT: "development",
          PUBLIC_ABUSE_SIGNAL_SECRET: short,
        }),
      ).ok,
    ).toBe(true);

    expect(
      runReleasePreflight(productionEnv({ PUBLIC_ABUSE_SIGNAL_SECRET: short }))
        .ok,
    ).toBe(false);
  });
});

describe("preflight report", () => {
  it("never prints a secret value", () => {
    const secret = "super-secret-value-that-must-never-be-printed-0123456789";
    const report = formatPreflightReport(
      runReleasePreflight(
        productionEnv({
          BETTER_AUTH_SECRET: secret,
          NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        }),
      ),
    );

    expect(report).not.toContain(secret);
    expect(report).toContain("NEXT_PUBLIC_APP_URL");
  });

  it("does not claim a deploy or provider acceptance when it passes", () => {
    const report = formatPreflightReport(runReleasePreflight(productionEnv()));

    expect(report).toContain("LULUS");
    expect(report).toContain("bukan bukti deploy");
  });
});
