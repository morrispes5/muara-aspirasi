import { afterEach, describe, expect, it, vi } from "vitest";

import { createAuth } from "@/server/auth/auth";
import type { Database } from "@/server/db/client";

describe("Better Auth configuration", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("keeps BEM authentication closed to public signup", () => {
    const auth = createAuth({} as Database, "a".repeat(32));

    expect(auth.options.basePath).toBe("/api/auth");
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true);
    expect(auth.options.user?.modelName).toBe("bem_users");
    expect(auth.options.session?.modelName).toBe("auth_sessions");
    expect(auth.options.account?.modelName).toBe("auth_accounts");
    expect(auth.options.verification?.modelName).toBe("auth_verifications");
    expect(auth.options.plugins?.map((plugin) => plugin.id)).toEqual([
      "two-factor",
      "next-cookies",
    ]);
    expect(auth.options.session?.additionalFields?.mfaVerifiedAt).toEqual(
      expect.objectContaining({
        input: false,
        required: false,
        type: "date",
      }),
    );
  });

  it("marks only sessions created by a successful MFA verification", async () => {
    vi.stubEnv("BEM_OWNER_EMAIL", "owner@example.test");
    const auth = createAuth({} as Database, "a".repeat(32));
    const before = auth.options.databaseHooks?.session?.create?.before;
    expect(before).toBeTypeOf("function");

    const session = {
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      id: "session-id",
      ipAddress: null,
      token: "session-token",
      updatedAt: new Date(),
      userAgent: null,
      userId: "user-id",
    };
    const context = (path: string) =>
      ({
        context: {
          internalAdapter: {
            findUserById: async () => ({
              id: "user-id",
              status: "ACTIVE",
              email: "owner@example.test",
            }),
          },
        },
        path,
      }) as never;

    const passwordSession = await before?.(
      session as never,
      context("/sign-in/email"),
    );
    const totpSession = await before?.(
      session as never,
      context("/two-factor/verify-totp"),
    );
    const backupSession = await before?.(
      session as never,
      context("/two-factor/verify-backup-code"),
    );

    expect(passwordSession).toEqual({
      data: expect.objectContaining({ mfaVerifiedAt: null }),
    });
    expect(totpSession).toEqual({
      data: expect.objectContaining({ mfaVerifiedAt: expect.any(Date) }),
    });
    expect(backupSession).toEqual({
      data: expect.objectContaining({ mfaVerifiedAt: expect.any(Date) }),
    });
  });
});
