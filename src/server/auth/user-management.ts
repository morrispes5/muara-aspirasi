import { and, count, eq } from "drizzle-orm";

import { auditEvents, authSessions, bemUsers } from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";
import { type BemRole } from "@/server/auth/roles";

export type BemUserStatus = "ACTIVE" | "SUSPENDED";

export type UpdateBemUserAccessInput = {
  actorUserId: string;
  role?: BemRole;
  status?: BemUserStatus;
  targetUserId: string;
};

type AccessManagementErrorCode =
  | "FORBIDDEN"
  | "LAST_ACTIVE_ADMIN"
  | "NO_CHANGE"
  | "SELF_LOCKOUT"
  | "USER_NOT_FOUND";

export class AccessManagementError extends Error {
  readonly code: AccessManagementErrorCode;

  constructor(code: AccessManagementErrorCode, message: string) {
    super(message);
    this.name = "AccessManagementError";
    this.code = code;
  }
}

export async function updateBemUserAccess(
  input: UpdateBemUserAccessInput,
  database: Database = getDatabase(),
) {
  return database.transaction(async (transaction) => {
    const [actor] = await transaction
      .select({
        role: bemUsers.role,
        status: bemUsers.status,
      })
      .from(bemUsers)
      .where(eq(bemUsers.id, input.actorUserId))
      .limit(1);

    if (!actor || actor.role !== "ADMIN" || actor.status !== "ACTIVE") {
      throw new AccessManagementError(
        "FORBIDDEN",
        "Hanya ADMIN aktif yang dapat mengubah akses akun BEM.",
      );
    }

    const [target] = await transaction
      .select({
        id: bemUsers.id,
        role: bemUsers.role,
        status: bemUsers.status,
      })
      .from(bemUsers)
      .where(eq(bemUsers.id, input.targetUserId))
      .limit(1);

    if (!target) {
      throw new AccessManagementError(
        "USER_NOT_FOUND",
        "Akun BEM target tidak ditemukan.",
      );
    }

    const nextRole = input.role ?? target.role;
    const nextStatus = input.status ?? target.status;

    if (nextRole === target.role && nextStatus === target.status) {
      throw new AccessManagementError(
        "NO_CHANGE",
        "Tidak ada perubahan akses untuk diterapkan.",
      );
    }

    if (
      target.id === input.actorUserId &&
      (nextRole !== "ADMIN" || nextStatus !== "ACTIVE")
    ) {
      throw new AccessManagementError(
        "SELF_LOCKOUT",
        "ADMIN tidak dapat menonaktifkan atau menurunkan akses akunnya sendiri.",
      );
    }

    const removesActiveAdmin =
      target.role === "ADMIN" &&
      target.status === "ACTIVE" &&
      (nextRole !== "ADMIN" || nextStatus !== "ACTIVE");

    if (removesActiveAdmin) {
      const [{ activeAdminCount }] = await transaction
        .select({ activeAdminCount: count() })
        .from(bemUsers)
        .where(and(eq(bemUsers.role, "ADMIN"), eq(bemUsers.status, "ACTIVE")));

      if (activeAdminCount <= 1) {
        throw new AccessManagementError(
          "LAST_ACTIVE_ADMIN",
          "Minimal satu ADMIN aktif harus tetap tersedia.",
        );
      }
    }

    const now = new Date();

    await transaction
      .update(bemUsers)
      .set({
        role: nextRole,
        status: nextStatus,
        updatedAt: now,
      })
      .where(eq(bemUsers.id, target.id));

    await transaction
      .delete(authSessions)
      .where(eq(authSessions.userId, target.id));

    await transaction.insert(auditEvents).values({
      action: "BEM_USER_ACCESS_UPDATED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: {
        nextRole,
        nextStatus,
        previousRole: target.role,
        previousStatus: target.status,
        sessionsRevoked: true,
      },
      result: "SUCCESS",
      targetId: target.id,
      targetType: "BEM_USER",
    });

    return {
      id: target.id,
      role: nextRole,
      status: nextStatus,
    };
  });
}
