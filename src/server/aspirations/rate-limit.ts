import { type Database, getDatabase } from "@/server/db/client";
import { publicRateLimitBuckets } from "@/server/db/schema";

import { lt, sql } from "drizzle-orm";

import { hashOpaqueValue } from "@/server/aspirations/tracking";

import { isPlaceholderSecret } from "@/server/config/secret-policy";

export class RateLimitConfigurationError extends Error {
  constructor() {
    super("PUBLIC_ABUSE_SIGNAL_SECRET belum diatur.");
    this.name = "RateLimitConfigurationError";
  }
}

export class PublicRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("Public rate limit exceeded.");
    this.name = "PublicRateLimitError";
  }
}

type RateLimitRule = {
  limit: number;
  scope: string;
  windowSeconds: number;
};

export const submissionRateLimit: RateLimitRule = {
  limit: 5,
  scope: "submission-ip",
  windowSeconds: 60 * 60,
};

export const adminLoginRateLimit: RateLimitRule = {
  limit: 10,
  scope: "admin-login-ip",
  windowSeconds: 15 * 60,
};

export const adminMfaRateLimit: RateLimitRule = {
  limit: 10,
  scope: "admin-mfa-ip",
  windowSeconds: 5 * 60,
};

export const evidenceIntentRateLimit: RateLimitRule = {
  limit: 10,
  scope: "evidence-intent-ip",
  windowSeconds: 60 * 60,
};

// Upload capacity must never consume the report-submission budget.
export const evidenceIntentCircuitBreaker: RateLimitRule = {
  limit: 150,
  scope: "evidence-intent-global",
  windowSeconds: 60 * 60,
};

export const trackingIpRateLimit: RateLimitRule = {
  limit: 20,
  scope: "tracking-ip",
  windowSeconds: 15 * 60,
};

export const trackingCodeRateLimit: RateLimitRule = {
  limit: 8,
  scope: "tracking-code",
  windowSeconds: 15 * 60,
};

export const submissionCircuitBreaker: RateLimitRule = {
  limit: 150,
  scope: "submission-global",
  windowSeconds: 60 * 60,
};

function startOfWindow(now: Date, windowSeconds: number) {
  const milliseconds = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / milliseconds) * milliseconds);
}

function getSignalSecret() {
  // Rejects the `.env.example` placeholder as well as an empty value: that
  // template salt is public, so accepting it would make bucket keys forgeable.
  if (isPlaceholderSecret(process.env.PUBLIC_ABUSE_SIGNAL_SECRET)) {
    throw new RateLimitConfigurationError();
  }
  return process.env.PUBLIC_ABUSE_SIGNAL_SECRET!.trim();
}

export function getRequestNetworkSignal(request: Request) {
  // Netlify supplies this header. Never fall back to client-supplied forwarding
  // headers on the deployed service, where an attacker could rotate them.
  if (process.env.NETLIFY === "true") {
    return (
      request.headers.get("x-nf-client-connection-ip")?.trim() || "unknown"
    );
  }
  return (
    request.headers.get("x-nf-client-connection-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function consumePublicRateLimit(
  rule: RateLimitRule,
  rawSignal: string,
  database: Database = getDatabase(),
  now = new Date(),
) {
  const windowStartedAt = startOfWindow(now, rule.windowSeconds);
  const expiresAt = new Date(
    windowStartedAt.getTime() + rule.windowSeconds * 1000,
  );
  const signalHash = hashOpaqueValue(rawSignal, getSignalSecret());

  await database
    .delete(publicRateLimitBuckets)
    .where(lt(publicRateLimitBuckets.expiresAt, now));

  const [bucket] = await database
    .insert(publicRateLimitBuckets)
    .values({ expiresAt, scope: rule.scope, signalHash, windowStartedAt })
    .onConflictDoUpdate({
      set: {
        attemptCount: sql`${publicRateLimitBuckets.attemptCount} + 1`,
        updatedAt: sql`now()`,
      },
      target: [
        publicRateLimitBuckets.scope,
        publicRateLimitBuckets.signalHash,
        publicRateLimitBuckets.windowStartedAt,
      ],
    })
    .returning({ attemptCount: publicRateLimitBuckets.attemptCount });

  if (!bucket || bucket.attemptCount > rule.limit) {
    throw new PublicRateLimitError(
      Math.max(1, Math.ceil((expiresAt.getTime() - now.getTime()) / 1000)),
    );
  }
}

export async function consumeTrackingRateLimits(
  request: Request,
  trackingCode: string,
  database: Database = getDatabase(),
) {
  await consumePublicRateLimit(
    trackingIpRateLimit,
    getRequestNetworkSignal(request),
    database,
  );
  await consumePublicRateLimit(trackingCodeRateLimit, trackingCode, database);
}
