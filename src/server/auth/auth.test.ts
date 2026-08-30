import { describe, expect, it } from "vitest";

import { createAuth } from "@/server/auth/auth";
import type { Database } from "@/server/db/client";

describe("Better Auth configuration", () => {
  it("keeps BEM authentication closed to public signup", () => {
    const auth = createAuth({} as Database, "a".repeat(32));

    expect(auth.options.basePath).toBe("/api/auth");
    expect(auth.options.emailAndPassword?.enabled).toBe(true);
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true);
    expect(auth.options.user?.modelName).toBe("bem_users");
    expect(auth.options.session?.modelName).toBe("auth_sessions");
    expect(auth.options.account?.modelName).toBe("auth_accounts");
    expect(auth.options.verification?.modelName).toBe("auth_verifications");
  });
});
