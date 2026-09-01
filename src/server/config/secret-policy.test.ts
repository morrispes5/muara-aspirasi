import { describe, expect, it } from "vitest";

import {
  isPlaceholderSecret,
  requireConfiguredSecret,
  SecretConfigurationError,
} from "@/server/config/secret-policy";

/**
 * The exact value committed in `.env.example`. Accepting it in a deployed
 * environment would mean the abuse-signal HMAC salt is public, so this string is
 * the specific regression these tests exist to prevent.
 */
const exampleFileValue = "replace-with-a-separate-random-rate-limit-secret";

describe("server secret policy", () => {
  it("rejects the value committed in .env.example", () => {
    expect(isPlaceholderSecret(exampleFileValue)).toBe(true);
    expect(() =>
      requireConfiguredSecret(exampleFileValue, "PUBLIC_ABUSE_SIGNAL_SECRET"),
    ).toThrow(SecretConfigurationError);
  });

  it.each([undefined, "", "   ", "replace-with-turnstile-secret-key"])(
    "rejects the unusable value %s",
    (value) => {
      expect(isPlaceholderSecret(value)).toBe(true);
      expect(() => requireConfiguredSecret(value, "ANY_SECRET")).toThrow(
        SecretConfigurationError,
      );
    },
  );

  it("accepts and trims a real value", () => {
    expect(requireConfiguredSecret("  a-real-random-value  ", "ANY")).toBe(
      "a-real-random-value",
    );
  });

  it("names the variable but never echoes the value", () => {
    const secret = "replace-with-something-that-must-not-be-logged";

    try {
      requireConfiguredSecret(secret, "PUBLIC_ABUSE_SIGNAL_SECRET");
      expect.unreachable("should have thrown");
    } catch (error) {
      const thrown = error as SecretConfigurationError;
      expect(thrown.variableName).toBe("PUBLIC_ABUSE_SIGNAL_SECRET");
      expect(thrown.message).toContain("PUBLIC_ABUSE_SIGNAL_SECRET");
      expect(thrown.message).not.toContain(secret);
    }
  });
});
