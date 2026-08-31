import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "@/server/security/origin";

const endpoint = "https://muara.example.ac.id/api/aspirasi/lacak";

function requestWith(origin: string | null) {
  return new Request(endpoint, {
    method: "POST",
    ...(origin ? { headers: { origin } } : {}),
  });
}

describe("sensitive request origin guard", () => {
  it("accepts a browser request from the application's own origin", () => {
    expect(
      isSameOriginRequest(requestWith("https://muara.example.ac.id")),
    ).toBe(true);
  });

  it("rejects a cross-origin browser request", () => {
    for (const origin of [
      "https://attacker.example",
      "http://muara.example.ac.id",
      "https://muara.example.ac.id.attacker.example",
      "https://evil.muara.example.ac.id",
      "null",
    ]) {
      expect(isSameOriginRequest(requestWith(origin))).toBe(false);
    }
  });

  it("allows a request that carries no Origin header at all", () => {
    // Non-browser same-origin callers omit Origin; SameSite cookies remain the
    // primary CSRF control. Documented in docs/SECURITY_PRIVACY.md section 10.
    expect(isSameOriginRequest(requestWith(null))).toBe(true);
  });

  it("compares the port as part of the origin", () => {
    const request = new Request("https://muara.example.ac.id:8443/api/x", {
      headers: { origin: "https://muara.example.ac.id" },
      method: "POST",
    });
    expect(isSameOriginRequest(request)).toBe(false);
  });
});
