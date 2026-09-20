import { eq } from "drizzle-orm";
import { headers as getRequestHeaders } from "next/headers";

import { AuthConfigurationError, getAuth } from "@/server/auth/auth";
import {
  type BemPermission,
  type BemRole,
  hasPermission,
  isBemRole,
} from "@/server/auth/roles";
import { DatabaseConfigurationError, getDatabase } from "@/server/db/client";
import { bemUsers } from "@/server/db/schema";
import { isOwnerEmailAllowed } from "@/server/auth/owner-access";
import { resolveDeployEnvironment } from "@/server/config/deploy-environment";

type AuthSessionResponse = Awaited<
  ReturnType<ReturnType<typeof getAuth>["api"]["getSession"]>
>;

export type BemSession = NonNullable<AuthSessionResponse> & {
  user: NonNullable<AuthSessionResponse>["user"] & {
    role: BemRole;
    status: "ACTIVE";
    twoFactorEnabled: boolean;
  };
};

export function isMfaRequired() {
  return (
    process.env.MFA_REQUIRED?.trim().toLowerCase() === "true" ||
    resolveDeployEnvironment(process.env.DATABASE_ENVIRONMENT) === "production"
  );
}

export function isAdminMfaSessionAllowed(input: {
  allowMfaEnrollment?: boolean;
  mfaVerifiedAt: Date | null | undefined;
  role: BemRole;
  twoFactorEnabled: boolean;
}) {
  if (!isMfaRequired() || input.role !== "ADMIN") return true;
  if (!input.twoFactorEnabled) return input.allowMfaEnrollment === true;
  return input.mfaVerifiedAt instanceof Date;
}

function isExpectedConfigurationError(error: unknown): boolean {
  return (
    error instanceof AuthConfigurationError ||
    error instanceof DatabaseConfigurationError
  );
}

export async function getBemSession(
  requestHeaders?: Headers,
  options: { allowMfaEnrollment?: boolean } = {},
): Promise<BemSession | null> {
  try {
    const headers = requestHeaders ?? (await getRequestHeaders());
    const session = await getAuth().api.getSession({ headers });

    if (!session) {
      return null;
    }

    const [user] = await getDatabase()
      .select({
        email: bemUsers.email,
        id: bemUsers.id,
        name: bemUsers.name,
        role: bemUsers.role,
        status: bemUsers.status,
        twoFactorEnabled: bemUsers.twoFactorEnabled,
      })
      .from(bemUsers)
      .where(eq(bemUsers.id, session.user.id))
      .limit(1);

    if (
      !user ||
      user.status !== "ACTIVE" ||
      !isBemRole(user.role) ||
      !isOwnerEmailAllowed(user.email)
    ) {
      return null;
    }

    if (
      !isAdminMfaSessionAllowed({
        allowMfaEnrollment: options.allowMfaEnrollment,
        mfaVerifiedAt: session.session.mfaVerifiedAt,
        role: user.role,
        twoFactorEnabled: user.twoFactorEnabled,
      })
    ) {
      return null;
    }

    return {
      ...session,
      user: {
        ...session.user,
        email: user.email,
        id: user.id,
        name: user.name,
        role: user.role,
        status: "ACTIVE",
        twoFactorEnabled: user.twoFactorEnabled,
      },
    } as BemSession;
  } catch (error) {
    if (isExpectedConfigurationError(error)) {
      return null;
    }

    throw error;
  }
}

export class AuthorizationError extends Error {
  readonly statusCode: 401 | 403;

  constructor(statusCode: 401 | 403, message: string) {
    super(message);
    this.name = "AuthorizationError";
    this.statusCode = statusCode;
  }
}

export async function requireBemPermission(
  permission: BemPermission,
  requestHeaders?: Headers,
): Promise<BemSession> {
  const session = await getBemSession(requestHeaders);

  if (!session) {
    throw new AuthorizationError(401, "Sesi BEM tidak ditemukan.");
  }

  if (!hasPermission(session.user.role, permission)) {
    throw new AuthorizationError(403, "Peran BEM tidak memiliki izin ini.");
  }

  return session;
}
