import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "@/proxy";

describe("admin proxy", () => {
  it("allows the MFA challenge page without a completed session cookie", () => {
    const response = proxy(
      new NextRequest("https://muara.example/admin/2fa?next=%2Fadmin"),
    );

    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("still redirects other anonymous admin routes to login", () => {
    const response = proxy(
      new NextRequest("https://muara.example/admin/laporan?status=RECEIVED"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://muara.example/admin/login?next=%2Fadmin%2Flaporan%3Fstatus%3DRECEIVED",
    );
  });

  it("preserves access for an existing Better Auth session cookie", () => {
    const request = new NextRequest("https://muara.example/admin/laporan", {
      headers: { cookie: "better-auth.session_token=valid-shape" },
    });

    expect(proxy(request).headers.get("x-middleware-next")).toBe("1");
  });
});
