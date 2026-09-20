import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), limit: vi.fn() }));
vi.mock("@/server/auth/auth", () => ({
  AuthConfigurationError: class extends Error {},
  getAuth: () => ({ api: { getSession: mocks.getSession } }),
}));
vi.mock("@/server/db/client", () => ({
  DatabaseConfigurationError: class extends Error {},
  getDatabase: () => ({
    select: () => ({ from: () => ({ where: () => ({ limit: mocks.limit }) }) }),
  }),
}));
import { getBemSession } from "./session";

describe("existing sessions honor the owner restriction", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_ENVIRONMENT", "production");
    vi.stubEnv("BEM_OWNER_EMAIL", "owner@example.test");
    mocks.getSession.mockResolvedValue({
      session: { mfaVerifiedAt: new Date() },
      user: { id: "existing-user" },
    });
  });
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });
  it("denies another active ADMIN even with a previously verified MFA session", async () => {
    mocks.limit.mockResolvedValue([
      {
        id: "existing-user",
        email: "other@example.test",
        role: "ADMIN",
        status: "ACTIVE",
        twoFactorEnabled: true,
      },
    ]);
    expect(await getBemSession(new Headers())).toBeNull();
  });
  it("allows the existing owner session after MFA", async () => {
    mocks.limit.mockResolvedValue([
      {
        id: "existing-user",
        email: "owner@example.test",
        role: "ADMIN",
        status: "ACTIVE",
        twoFactorEnabled: true,
      },
    ]);
    expect(await getBemSession(new Headers())).toMatchObject({
      user: { email: "owner@example.test" },
    });
  });
});
