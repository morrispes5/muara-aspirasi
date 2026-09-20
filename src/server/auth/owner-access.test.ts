import { afterEach, describe, expect, it, vi } from "vitest";
import { isOwnerEmailAllowed } from "./owner-access";

describe("single-owner access", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("allows exactly the configured address, not its domain or suffix", () => {
    vi.stubEnv("BEM_OWNER_EMAIL", "Owner@example.test");
    expect(isOwnerEmailAllowed(" owner@EXAMPLE.test ")).toBe(true);
    for (const email of [
      "other@example.test",
      "owner@example.test.attacker.test",
      undefined,
      "",
    ]) {
      expect(isOwnerEmailAllowed(email)).toBe(false);
    }
  });

  it.each(["production", "preview", "", "unknown"])(
    "fails closed without an owner in %s",
    (environment) => {
      vi.stubEnv("BEM_OWNER_EMAIL", "");
      vi.stubEnv("DATABASE_ENVIRONMENT", environment);
      expect(isOwnerEmailAllowed("owner@example.test")).toBe(false);
    },
  );
});
