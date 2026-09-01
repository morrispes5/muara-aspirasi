import { afterEach, describe, expect, it, vi } from "vitest";

import {
  cloudflareDummySecret,
  verifyTurnstile,
} from "@/server/aspirations/turnstile";

const originalSecret = process.env.TURNSTILE_SECRET_KEY;
const originalEnvironment = process.env.DATABASE_ENVIRONMENT;

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.TURNSTILE_SECRET_KEY;
  } else {
    process.env.TURNSTILE_SECRET_KEY = originalSecret;
  }

  if (originalEnvironment === undefined) {
    delete process.env.DATABASE_ENVIRONMENT;
  } else {
    process.env.DATABASE_ENVIRONMENT = originalEnvironment;
  }
});

describe("Turnstile server verification", () => {
  it("accepts only a successful verification for the request hostname", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ hostname: "localhost", success: true })),
      );

    await expect(
      verifyTurnstile("token", "localhost", fetchMock),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects provider failures, duplicate/expired tokens, and hostname mismatch", async () => {
    process.env.TURNSTILE_SECRET_KEY = "test-secret";

    await expect(
      verifyTurnstile(
        "token",
        "localhost",
        vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              "error-codes": ["timeout-or-duplicate"],
              success: false,
            }),
          ),
        ),
      ),
    ).rejects.toMatchObject({ reason: "REJECTED" });

    await expect(
      verifyTurnstile(
        "token",
        "localhost",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ hostname: "other.test", success: true }),
            ),
          ),
      ),
    ).rejects.toMatchObject({ reason: "REJECTED" });
  });

  it("accepts Cloudflare's dummy hostname only in non-production environments", async () => {
    process.env.DATABASE_ENVIRONMENT = "development";
    process.env.TURNSTILE_SECRET_KEY = cloudflareDummySecret;

    await expect(
      verifyTurnstile(
        "XXXX.DUMMY.TOKEN.XXXX",
        "localhost",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ hostname: "example.com", success: true }),
            ),
          ),
      ),
    ).resolves.toBeUndefined();

    process.env.DATABASE_ENVIRONMENT = "production";
    await expect(
      verifyTurnstile(
        "XXXX.DUMMY.TOKEN.XXXX",
        "localhost",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ hostname: "example.com", success: true }),
            ),
          ),
      ),
    ).rejects.toMatchObject({ reason: "REJECTED" });
  });

  it("fails closed when the server-only secret is missing", async () => {
    delete process.env.TURNSTILE_SECRET_KEY;

    await expect(verifyTurnstile("token", "localhost")).rejects.toMatchObject({
      reason: "CONFIGURATION",
    });
  });
});
