import { afterEach, describe, expect, it, vi } from "vitest";

import { isAdminMfaSessionAllowed } from "@/server/auth/session";

describe("ADMIN session MFA assurance", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps a pre-enrollment ADMIN session enrollment-only", () => {
    vi.stubEnv("MFA_REQUIRED", "true");

    expect(
      isAdminMfaSessionAllowed({
        allowMfaEnrollment: true,
        mfaVerifiedAt: null,
        role: "ADMIN",
        twoFactorEnabled: false,
      }),
    ).toBe(true);
    expect(
      isAdminMfaSessionAllowed({
        mfaVerifiedAt: null,
        role: "ADMIN",
        twoFactorEnabled: false,
      }),
    ).toBe(false);
  });

  it("does not upgrade an old session when another session enrolls MFA", () => {
    vi.stubEnv("MFA_REQUIRED", "true");

    expect(
      isAdminMfaSessionAllowed({
        allowMfaEnrollment: true,
        mfaVerifiedAt: null,
        role: "ADMIN",
        twoFactorEnabled: true,
      }),
    ).toBe(false);
    expect(
      isAdminMfaSessionAllowed({
        mfaVerifiedAt: new Date(),
        role: "ADMIN",
        twoFactorEnabled: true,
      }),
    ).toBe(true);
  });

  it("preserves non-ADMIN access policy", () => {
    vi.stubEnv("MFA_REQUIRED", "true");

    expect(
      isAdminMfaSessionAllowed({
        mfaVerifiedAt: null,
        role: "ADVOCATE",
        twoFactorEnabled: false,
      }),
    ).toBe(true);
  });
});
