import { APIError, betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";

import {
  authAccounts,
  authSessions,
  authVerifications,
  bemUsers,
  twoFactor as twoFactorSchema,
} from "@/server/db/schema";
import { type Database, getDatabase } from "@/server/db/client";
import { recordAuthAuditEvent } from "@/server/auth/audit";

export class AuthConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigurationError";
  }
}

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret || secret.length < 32 || secret.startsWith("replace-with")) {
    throw new AuthConfigurationError(
      "BETTER_AUTH_SECRET belum diatur dengan nilai acak minimal 32 karakter.",
    );
  }

  return secret;
}

function getConfiguredOrigins(): string[] {
  const configured = [
    process.env.BETTER_AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    // Netlify's per-deploy URL. Deploy Preview hostnames are generated per pull
    // request, so a static BETTER_AUTH_URL can only ever be right for one of
    // them; deriving the origin means the preview context needs no hardcoded
    // auth origin at all, which also removes it from the secret scanner's
    // value-matching surface.
    process.env.DEPLOY_PRIME_URL,
    ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS ?? "").split(","),
  ];

  return configured
    .filter((origin): origin is string => typeof origin === "string")
    .map((origin) => origin.trim())
    .filter(
      (origin, index, origins) => origin && origins.indexOf(origin) === index,
    );
}

export function createAuth(database: Database, secret = getAuthSecret()) {
  const secureCookies = process.env.NODE_ENV === "production";
  const mfaVerificationPaths = new Set([
    "/two-factor/verify-backup-code",
    "/two-factor/verify-otp",
    "/two-factor/verify-totp",
  ]);

  return betterAuth({
    advanced: {
      database: {
        generateId: "uuid",
      },
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: secureCookies,
      },
      useSecureCookies: secureCookies,
    },
    appName: "Muara Aspirasi BEM",
    basePath: "/api/auth",
    baseURL:
      process.env.BETTER_AUTH_URL ??
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.DEPLOY_PRIME_URL,
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: {
        auth_accounts: authAccounts,
        auth_sessions: authSessions,
        auth_verifications: authVerifications,
        bem_users: bemUsers,
        twoFactor: twoFactorSchema,
      },
      transaction: true,
    }),
    databaseHooks: {
      session: {
        create: {
          async after(session) {
            await database
              .update(bemUsers)
              .set({
                lastLoginAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(bemUsers.id, session.userId));

            await recordAuthAuditEvent(
              {
                action: "AUTH_LOGIN_SUCCESS",
                actorType: "BEM_USER",
                actorUserId: session.userId,
                metadata: { method: "email_password" },
                result: "SUCCESS",
                targetId: session.userId,
                targetType: "BEM_USER",
              },
              database,
            );
          },
          async before(session, context) {
            const user = context
              ? await context.context.internalAdapter.findUserById(
                  session.userId,
                )
              : null;
            const status = (user as { status?: unknown } | null)?.status;

            if (!user || status !== "ACTIVE") {
              throw APIError.from("FORBIDDEN", {
                code: "ACCOUNT_SUSPENDED",
                message: "Akun BEM tidak aktif.",
              });
            }

            return {
              data: {
                ...session,
                mfaVerifiedAt:
                  context && mfaVerificationPaths.has(context.path)
                    ? new Date()
                    : null,
              },
            };
          },
        },
      },
    },
    emailAndPassword: {
      disableSignUp: true,
      enabled: true,
      maxPasswordLength: 128,
      minPasswordLength: 12,
    },
    plugins: [
      nextCookies(),
      twoFactor({
        issuer: "Muara Aspirasi BEM",
        twoFactorTable: "twoFactor",
        trustDeviceMaxAge: 0,
      }),
    ],
    secret,
    trustedOrigins: getConfiguredOrigins(),
    user: {
      additionalFields: {
        role: {
          input: false,
          required: true,
          type: "string",
        },
        status: {
          input: false,
          required: true,
          type: "string",
        },
      },
      modelName: "bem_users",
    },
    session: {
      additionalFields: {
        mfaVerifiedAt: {
          fieldName: "mfa_verified_at",
          input: false,
          required: false,
          type: "date",
        },
      },
      modelName: "auth_sessions",
    },
    account: {
      modelName: "auth_accounts",
    },
    verification: {
      modelName: "auth_verifications",
    },
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

let authInstance: AuthInstance | undefined;

export function getAuth(): AuthInstance {
  if (!authInstance) {
    authInstance = createAuth(getDatabase());
  }

  return authInstance;
}
