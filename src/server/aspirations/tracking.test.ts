import { describe, expect, it } from "vitest";

import {
  createTrackingCode,
  createTrackingSecret,
  hashOpaqueValue,
  hashTrackingSecret,
  isTrackingCode,
  verifyTrackingSecret,
} from "@/server/aspirations/tracking";

describe("tracking credentials", () => {
  it("generates a readable opaque code and a one-time random secret", () => {
    const code = createTrackingCode();
    const secret = createTrackingSecret();

    expect(isTrackingCode(code)).toBe(true);
    expect(secret).not.toContain(code);
    expect(secret.length).toBeGreaterThanOrEqual(40);
  });

  it("persists only a salted secret hash and verifies in constant-time path", async () => {
    const secret = createTrackingSecret();
    const storedHash = await hashTrackingSecret(secret);

    expect(storedHash).toMatch(/^scrypt\$16384\$/);
    expect(storedHash).not.toContain(secret);
    await expect(verifyTrackingSecret(secret, storedHash)).resolves.toBe(true);
    await expect(
      verifyTrackingSecret("wrong-secret", storedHash),
    ).resolves.toBe(false);
  });

  it("hashes idempotency and abuse signals without retaining their input", () => {
    const hash = hashOpaqueValue(
      "temporary-network-signal",
      "separate-test-salt",
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain("temporary-network-signal");
  });
});
