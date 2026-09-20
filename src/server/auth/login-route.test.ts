import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ handler: vi.fn(), consume: vi.fn() }));
vi.mock("better-auth/next-js", () => ({
  toNextJsHandler: () => ({ POST: mocks.handler }),
}));
vi.mock("@/server/auth/auth", () => ({ getAuth: () => ({}) }));
vi.mock("@/server/auth/audit", () => ({ recordAuthAuditEvent: vi.fn() }));
vi.mock("@/server/aspirations/rate-limit", async (original) => ({
  ...(await original<typeof import("@/server/aspirations/rate-limit")>()),
  consumePublicRateLimit: mocks.consume,
}));
import { POST } from "@/app/api/auth/[...all]/route";
import { PublicRateLimitError } from "@/server/aspirations/rate-limit";

const request = (email: string) =>
  new Request("https://example.test/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      origin: "https://example.test",
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password: "test-only-password" }),
  });

describe("owner-only login route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("BEM_OWNER_EMAIL", "owner@example.test");
    mocks.handler.mockImplementation(async (input: Request) => {
      await input.json();
      return new Response("{}", {
        headers: { "set-cookie": "auth-test=opaque; HttpOnly" },
      });
    });
  });
  afterEach(() => vi.unstubAllEnvs());
  it("rejects other email addresses before password authentication", async () => {
    expect((await POST(request("other@example.test"))).status).toBe(401);
    expect(mocks.handler).not.toHaveBeenCalled();
  });
  it("passes the owner to authentication and preserves its cookies", async () => {
    const response = await POST(request("owner@example.test"));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(mocks.consume).toHaveBeenCalledOnce();
  });
  it("blocks throttled requests without calling authentication", async () => {
    mocks.consume.mockRejectedValue(new PublicRateLimitError(240));
    const response = await POST(request("owner@example.test"));
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("240");
    expect(mocks.handler).not.toHaveBeenCalled();
  });
});
