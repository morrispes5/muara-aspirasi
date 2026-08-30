import { type Database, getDatabase } from "@/server/db/client";
import { auditEvents } from "@/server/db/schema";

type AuthAuditResult = "SUCCESS" | "DENIED" | "FAILED";
type AuthAuditActorType = "SYSTEM" | "PUBLIC" | "BEM_USER";

export type AuthAuditInput = {
  action: string;
  actorType: AuthAuditActorType;
  actorUserId?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
  reasonCode?: string | null;
  requestCorrelationId?: string | null;
  result: AuthAuditResult;
  targetId: string;
  targetType: string;
};

export async function recordAuthAuditEvent(
  input: AuthAuditInput,
  database: Database = getDatabase(),
) {
  return database.insert(auditEvents).values({
    action: input.action,
    actorType: input.actorType,
    actorUserId: input.actorUserId ?? null,
    metadata: input.metadata,
    reasonCode: input.reasonCode ?? null,
    requestCorrelationId: input.requestCorrelationId ?? null,
    result: input.result,
    targetId: input.targetId,
    targetType: input.targetType,
  });
}
