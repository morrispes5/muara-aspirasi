import { afterEach, describe, expect, it, vi } from "vitest";

import {
  consumePublicRateLimit,
  RateLimitConfigurationError,
  submissionRateLimit,
} from "@/server/aspirations/rate-limit";
import { type Database } from "@/server/db/client";

/**
 * Wiring test for the fail-closed rule, not just the predicate.
 *
 * `.env.example` ships `PUBLIC_ABUSE_SIGNAL_SECRET=replace-with-a-separate-random-rate-limit-secret`.
 * The previous guard only rejected an empty value, so copying that file into a
 * deployed environment silently used a salt that is committed to this
 * repository — making rate-limit bucket keys and idempotency hashes computable
 * by anyone with the source. These assertions fail if that guard is loosened.
 */
const exampleFileValue = "replace-with-a-separate-random-rate-limit-secret";
const original = process.env.PUBLIC_ABUSE_SIGNAL_SECRET;

afterEach(() => {
  if (original === undefined) delete process.env.PUBLIC_ABUSE_SIGNAL_SECRET;
  else process.env.PUBLIC_ABUSE_SIGNAL_SECRET = original;
});

/** Fails the test if the rate limiter ever reaches the database. */
function unreachableDatabase() {
  return {
    delete: () => expect.unreachable("must not touch the database"),
    insert: () => expect.unreachable("must not touch the database"),
    select: vi.fn(() => expect.unreachable("must not touch the database")),
  } as unknown as Database;
}

describe("abuse signal secret is fail-closed", () => {
  it.each([exampleFileValue, "replace-with-anything", "", "   "])(
    "refuses to run the rate limiter with the unusable secret %s",
    async (value) => {
      process.env.PUBLIC_ABUSE_SIGNAL_SECRET = value;

      await expect(
        consumePublicRateLimit(
          submissionRateLimit,
          "203.0.113.9",
          unreachableDatabase(),
        ),
      ).rejects.toBeInstanceOf(RateLimitConfigurationError);
    },
  );

  it("refuses when the variable is absent entirely", async () => {
    delete process.env.PUBLIC_ABUSE_SIGNAL_SECRET;

    await expect(
      consumePublicRateLimit(
        submissionRateLimit,
        "203.0.113.9",
        unreachableDatabase(),
      ),
    ).rejects.toBeInstanceOf(RateLimitConfigurationError);
  });

  it("never puts the rejected value in the error message", async () => {
    process.env.PUBLIC_ABUSE_SIGNAL_SECRET = exampleFileValue;

    await expect(
      consumePublicRateLimit(
        submissionRateLimit,
        "203.0.113.9",
        unreachableDatabase(),
      ),
    ).rejects.toSatisfy(
      (error: Error) => !error.message.includes(exampleFileValue),
    );
  });
});
