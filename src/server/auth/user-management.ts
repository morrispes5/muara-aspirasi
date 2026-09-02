import { and, asc, count, eq } from "drizzle-orm";
import { createLocalAccountIssuer } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";

import {
  auditEvents,
  authAccounts,
  authSessions,
  bemUsers,
} from "@/server/db/schema";
import { type BemRole, isBemRole } from "@/server/auth/roles";
import { type Database, getDatabase } from "@/server/db/client";

export type BemUserStatus = "ACTIVE" | "SUSPENDED";

export type UpdateBemUserAccessInput = {
  actorUserId: string;
  role?: BemRole;
  status?: BemUserStatus;
  targetUserId: string;
};

export type CreateBemUserInput = {
  actorUserId: string;
  email: string;
  name: string;
  password: string;
  role: BemRole;
};

type AccessManagementErrorCode =
  | "FORBIDDEN"
  | "EMAIL_EXISTS"
  | "INVALID_INPUT"
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

async function assertActiveAdmin(
  database: Pick<Database, "select">,
  actorUserId: string,
) {
  const [actor] = await database
    .select({
      role: bemUsers.role,
      status: bemUsers.status,
    })
    .from(bemUsers)
    .where(eq(bemUsers.id, actorUserId))
    .limit(1);

  if (!actor || actor.role !== "ADMIN" || actor.status !== "ACTIVE") {
    throw new AccessManagementError(
      "FORBIDDEN",
      "Hanya ADMIN aktif yang dapat mengelola akun BEM.",
    );
  }
}

function normalizeNewUser(input: CreateBemUserInput) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (name.length < 2 || name.length > 160) {
    throw new AccessManagementError(
      "INVALID_INPUT",
      "Nama akun harus terdiri dari 2 sampai 160 karakter.",
    );
  }
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 320) {
    throw new AccessManagementError("INVALID_INPUT", "Email akun tidak valid.");
  }
  const allowedDomains = (process.env.BEM_ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase().replace(/^@/, ""))
    .filter(Boolean);
  if (
    allowedDomains.length > 0 &&
    !allowedDomains.some((domain) => email.endsWith(`@${domain}`))
  ) {
    throw new AccessManagementError(
      "INVALID_INPUT",
      "Email akun tidak termasuk domain BEM yang diizinkan.",
    );
  }
  if (input.password.length < 12 || input.password.length > 128) {
    throw new AccessManagementError(
      "INVALID_INPUT",
      "Kata sandi harus terdiri dari 12 sampai 128 karakter.",
    );
  }
  if (!isBemRole(input.role)) {
    throw new AccessManagementError("INVALID_INPUT", "Role akun tidak valid.");
  }

  return { email, name };
}

export async function listBemUsers(
  actorUserId: string,
  database: Database = getDatabase(),
) {
  await assertActiveAdmin(database, actorUserId);

  return database
    .select({
      createdAt: bemUsers.createdAt,
      email: bemUsers.email,
      id: bemUsers.id,
      lastLoginAt: bemUsers.lastLoginAt,
      name: bemUsers.name,
      role: bemUsers.role,
      status: bemUsers.status,
      twoFactorEnabled: bemUsers.twoFactorEnabled,
    })
    .from(bemUsers)
    .orderBy(asc(bemUsers.name));
}

export async function createBemUser(
  input: CreateBemUserInput,
  database: Database = getDatabase(),
) {
  const { email, name } = normalizeNewUser(input);
  const passwordHash = await hashPassword(input.password);
  const credentialIssuer = createLocalAccountIssuer("credential");
  const userId = randomUUID();

  return database.transaction(async (transaction) => {
    await assertActiveAdmin(transaction, input.actorUserId);

    const [existing] = await transaction
      .select({ id: bemUsers.id })
      .from(bemUsers)
      .where(eq(bemUsers.email, email))
      .limit(1);

    if (existing) {
      throw new AccessManagementError(
        "EMAIL_EXISTS",
        "Akun dengan email tersebut sudah ada.",
      );
    }

    await transaction.insert(bemUsers).values({
      createdByUserId: input.actorUserId,
      email,
      emailVerified: true,
      id: userId,
      name,
      role: input.role,
      status: "ACTIVE",
      twoFactorEnabled: false,
    });

    await transaction.insert(authAccounts).values({
      accountId: userId,
      id: randomUUID(),
      issuer: credentialIssuer,
      password: passwordHash,
      providerId: "credential",
      userId,
    });

    await transaction.insert(auditEvents).values({
      action: "BEM_USER_CREATED",
      actorType: "BEM_USER",
      actorUserId: input.actorUserId,
      metadata: { role: input.role, twoFactorEnabled: false },
      result: "SUCCESS",
      targetId: userId,
      targetType: "BEM_USER",
    });

    return {
      email,
      id: userId,
      name,
      role: input.role,
      status: "ACTIVE" as const,
    };
  });
}

export async function updateBemUserAccess(
  input: UpdateBemUserAccessInput,
  database: Database = getDatabase(),
) {
  return database.transaction(async (transaction) => {
    await assertActiveAdmin(transaction, input.actorUserId);

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
