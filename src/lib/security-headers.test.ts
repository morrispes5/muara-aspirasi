import { describe, expect, it } from "vitest";

import {
  contentSecurityPolicy,
  permissionsPolicy,
  securityHeaders,
  turnstileOrigin,
} from "@/lib/security-headers";

function directives(policy: string): Record<string, string[]> {
  return Object.fromEntries(
    policy.split("; ").map((directive) => {
      const [name, ...values] = directive.split(" ");
      return [name, values];
    }),
  );
}

describe("content security policy", () => {
  it("locks down the directives that stop injected content from loading", () => {
    const policy = directives(contentSecurityPolicy());

    expect(policy["default-src"]).toEqual(["'self'"]);
    expect(policy["object-src"]).toEqual(["'none'"]);
    expect(policy["base-uri"]).toEqual(["'self'"]);
    expect(policy["frame-ancestors"]).toEqual(["'none'"]);
    // form-action 'self' is what stops an injected form from posting a
    // reporter's tracking code to an attacker-controlled host.
    expect(policy["form-action"]).toEqual(["'self'"]);
  });

  it("allows Turnstile and nothing else off-origin", () => {
    const policy = directives(contentSecurityPolicy());
    const offOrigin = new Set<string>();

    for (const values of Object.values(policy)) {
      for (const value of values) {
        if (value.startsWith("http")) offOrigin.add(value);
      }
    }

    expect([...offOrigin]).toEqual([turnstileOrigin]);
    expect(policy["connect-src"]).toEqual(["'self'", turnstileOrigin]);
    expect(policy["frame-src"]).toEqual([turnstileOrigin]);
  });

  it("never allows eval in a production policy", () => {
    expect(contentSecurityPolicy(false)).not.toContain("'unsafe-eval'");
    expect(contentSecurityPolicy()).not.toContain("'unsafe-eval'");
  });

  it("allows eval only for the development refresh runtime", () => {
    const policy = directives(contentSecurityPolicy(true));

    expect(policy["script-src"]).toContain("'unsafe-eval'");
    expect(policy["default-src"]).toEqual(["'self'"]);
  });
});

describe("security headers", () => {
  it("ships the CSP report-only while enforcement is a pending owner decision", () => {
    const keys = securityHeaders().map((header) => header.key);

    expect(keys).toContain("Content-Security-Policy-Report-Only");
    expect(keys).not.toContain("Content-Security-Policy");
  });

  it("does not set HSTS from the application", () => {
    // A wrong max-age is cached by browsers and cannot be undone from here.
    // Recorded as an owner/deploy decision in docs/SECURITY_PRIVACY.md.
    expect(securityHeaders().map((header) => header.key)).not.toContain(
      "Strict-Transport-Security",
    );
  });

  it("sets the framing, sniffing, and referrer defences", () => {
    const headers = Object.fromEntries(
      securityHeaders().map((header) => [header.key, header.value]),
    );

    expect(headers["X-Frame-Options"]).toBe("DENY");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Cross-Origin-Opener-Policy"]).toBe("same-origin");
  });

  it("denies the device capabilities this application never uses", () => {
    for (const feature of ["camera", "microphone", "geolocation", "payment"]) {
      expect(permissionsPolicy).toContain(`${feature}=()`);
    }
  });

  it("emits unique header keys so none silently overrides another", () => {
    const keys = securityHeaders().map((header) => header.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
