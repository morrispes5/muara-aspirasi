import { afterEach, describe, expect, it, vi } from "vitest";
import {
  consumePublicRateLimit,
  getRequestNetworkSignal,
  PublicRateLimitError,
  submissionRateLimit,
} from "./rate-limit";
import type { Database } from "@/server/db/client";

describe("shared abuse limits", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("refuses forged forwarded IP fallback on Netlify", () => {
    vi.stubEnv("NETLIFY", "true");
    expect(
      getRequestNetworkSignal(
        new Request("https://example.test", {
          headers: { "x-forwarded-for": "1.2.3.4", "x-real-ip": "5.6.7.8" },
        }),
      ),
    ).toBe("unknown");
    expect(
      getRequestNetworkSignal(
        new Request("https://example.test", {
          headers: {
            "x-nf-client-connection-ip": "192.0.2.1",
            "x-forwarded-for": "1.2.3.4",
          },
        }),
      ),
    ).toBe("192.0.2.1");
  });
  it("allows attempt five and rejects six with the remaining window", async () => {
    vi.stubEnv("PUBLIC_ABUSE_SIGNAL_SECRET", "x".repeat(40));
    let count = 4;
    const insert = vi.fn(() => ({
      values: () => ({
        onConflictDoUpdate: () => ({
          returning: async () => [{ attemptCount: ++count }],
        }),
      }),
    }));
    const database = {
      delete: () => ({ where: async () => undefined }),
      insert,
    } as unknown as Database;
    const now = new Date("2026-09-20T10:15:00Z");
    await expect(
      consumePublicRateLimit(submissionRateLimit, "network", database, now),
    ).resolves.toBeUndefined();
    await expect(
      consumePublicRateLimit(submissionRateLimit, "network", database, now),
    ).rejects.toMatchObject({ retryAfterSeconds: 2700 });
    expect(PublicRateLimitError).toBeDefined();
  });
});
