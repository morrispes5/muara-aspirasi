import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import {
  AccessManagementError,
  updateBemUserAccess,
} from "@/server/auth/user-management";
import { auditEvents, authSessions, bemUsers } from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";

const describeIntegration =
  process.env.AUTH_INTEGRATION === "1" ? describe : describe.skip;

describeIntegration("BEM access management on Neon development", () => {
  let database: Database;
  const targetUserId = randomUUID();
  const sessionToken = `m4-integration-${randomUUID()}`;
  let actorUserId = "";

  beforeAll(async () => {
    database = getDatabase();
    const actorEmail = process.env.AUTH_BOOTSTRAP_EMAIL;

    if (!actorEmail) {
      throw new Error("AUTH_BOOTSTRAP_EMAIL wajib untuk integration test.");
    }

    const [actor] = await database
      .select({ id: bemUsers.id })
      .from(bemUsers)
      .where(eq(bemUsers.email, actorEmail))
      .limit(1);

    if (!actor) {
      throw new Error("Akun bootstrap ADMIN belum tersedia.");
    }

    actorUserId = actor.id;

    await database.insert(bemUsers).values({
      createdByUserId: actorUserId,
      email: `m4-integration-${targetUserId}@example.invalid`,
      emailVerified: true,
      id: targetUserId,
      name: "M4 Integration User",
      role: "EDITOR",
      status: "ACTIVE",
    });

    await database.insert(authSessions).values({
      expiresAt: new Date(Date.now() + 60_000),
      token: sessionToken,
      userId: targetUserId,
    });
  });

  afterAll(async () => {
    if (database) {
      await database.delete(bemUsers).where(eq(bemUsers.id, targetUserId));
    }
  });

  it("allows ADMIN to change role and revokes every target session", async () => {
    await expect(
      updateBemUserAccess(
        {
          actorUserId,
          role: "ADVOCATE",
          targetUserId,
        },
        database,
      ),
    ).resolves.toEqual({
      id: targetUserId,
      role: "ADVOCATE",
      status: "ACTIVE",
    });

    const sessions = await database
      .select({ id: authSessions.id })
      .from(authSessions)
      .where(eq(authSessions.userId, targetUserId));
    const events = await database
      .select({ action: auditEvents.action })
      .from(auditEvents)
      .where(eq(auditEvents.targetId, targetUserId));

    expect(sessions).toHaveLength(0);
    expect(events.at(-1)?.action).toBe("BEM_USER_ACCESS_UPDATED");
  });

  it("suspends the target while preserving the active ADMIN", async () => {
    await expect(
      updateBemUserAccess(
        {
          actorUserId,
          status: "SUSPENDED",
          targetUserId,
        },
        database,
      ),
    ).resolves.toEqual({
      id: targetUserId,
      role: "ADVOCATE",
      status: "SUSPENDED",
    });
  });

  it("prevents an ADMIN from locking out its own account", async () => {
    await expect(
      updateBemUserAccess(
        {
          actorUserId,
          status: "SUSPENDED",
          targetUserId: actorUserId,
        },
        database,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<AccessManagementError>>({
        code: "SELF_LOCKOUT",
      }),
    );
  });
});
