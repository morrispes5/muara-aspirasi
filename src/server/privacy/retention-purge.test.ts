import { afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { type SQL } from "drizzle-orm";

import {
  aspirationReports,
  auditEvents,
  evidenceUploadIntents,
  internalNotes,
  privacyDeletionRequests,
  reportAssignments,
  reporterIdentities,
  reportEvidence,
  reportStatusEvents,
  retentionReviewQueue,
} from "@/server/db/schema";
import { type Database } from "@/server/db/client";
import { executeApprovedDeletion } from "./retention";

const reportId = "00000000-0000-4000-8000-000000000001";
const requestId = "00000000-0000-4000-8000-000000000002";
const sentinel = "Private student name and contact to erase";

function fixture(options: { hold?: boolean; evidence?: boolean } = {}) {
  const state = new Map<object, Record<string, unknown>>([
    [internalNotes, { body: sentinel, deletionReason: sentinel }],
    [reportStatusEvents, { reporterMessage: sentinel, toStatus: "RESOLVED" }],
    [reportAssignments, { reason: sentinel, routeLabel: sentinel }],
    [
      evidenceUploadIntents,
      { originalFilename: sentinel, objectKey: "opaque-staging-key" },
    ],
    [
      aspirationReports,
      {
        title: sentinel,
        chronology: sentinel,
        impact: sentinel,
        internalSummary: sentinel,
        location: sentinel,
        suggestedSolution: sentinel,
      },
    ],
    [privacyDeletionRequests, { status: "APPROVED" }],
    [retentionReviewQueue, { status: "PENDING" }],
    [reporterIdentities, { name: sentinel }],
    [reportEvidence, { originalFilename: sentinel }],
  ]);
  const dialect = new PgDialect();
  function verifyScope(table: object, where: SQL) {
    expect(dialect.sqlToQuery(where).params).toEqual([
      table === privacyDeletionRequests ? requestId : reportId,
    ]);
  }
  const transaction = {
    update: (table: object) => ({
      set: (fields: Record<string, unknown>) => ({
        where: async (where: SQL) => {
          verifyScope(table, where);
          state.set(table, { ...state.get(table), ...fields });
        },
      }),
    }),
    delete: (table: object) => ({
      where: async (where: SQL) => {
        verifyScope(table, where);
        state.delete(table);
      },
    }),
    insert: (table: object) => ({
      values: async (data: Record<string, unknown>) => {
        expect(table).toBe(auditEvents);
        state.set(table, data);
      },
    }),
  };
  const limit = vi
    .fn()
    .mockResolvedValueOnce([{ reportId }])
    .mockResolvedValueOnce(options.hold ? [{ id: "active-hold" }] : []);
  let selects = 0;
  const runTransaction = vi.fn(
    async (run: (tx: typeof transaction) => Promise<void>) => run(transaction),
  );
  const database = {
    select: () => {
      selects++;
      return {
        from: () => ({
          where: () =>
            selects <= 2
              ? { limit }
              : Promise.resolve(
                  options.evidence
                    ? [{ id: "evidence", objectKey: "opaque-final-key" }]
                    : [],
                ),
        }),
      };
    },
    transaction: runTransaction,
  } as unknown as Database;
  return { state, database, runTransaction };
}

describe("approved privacy purge", () => {
  afterEach(() => vi.unstubAllEnvs());
  it("erases dependent free text while retaining minimal workflow and cleanup metadata", async () => {
    const { state, database } = fixture();
    await executeApprovedDeletion(
      { actorUserId: "admin", requestId },
      database,
      vi.fn(),
    );
    expect(JSON.stringify([...state.values()])).not.toContain(sentinel);
    expect(state.has(reporterIdentities)).toBe(false);
    expect(state.has(reportEvidence)).toBe(false);
    expect(state.get(privacyDeletionRequests)?.status).toBe("COMPLETED");
    expect(state.get(reportStatusEvents)?.toStatus).toBe("RESOLVED");
    expect(state.get(evidenceUploadIntents)?.objectKey).toBe(
      "opaque-staging-key",
    );
    expect(state.get(internalNotes)?.deletedAt).toBeInstanceOf(Date);
    expect(state.get(auditEvents)?.action).toBe("PRIVACY_DELETION_COMPLETED");
  });
  it("does not purge or complete a report with an active hold", async () => {
    const { state, database, runTransaction } = fixture({ hold: true });
    const removeObject = vi.fn();
    await expect(
      executeApprovedDeletion(
        { actorUserId: "admin", requestId },
        database,
        removeObject,
      ),
    ).rejects.toMatchObject({ code: "HOLD_ACTIVE" });
    expect(removeObject).not.toHaveBeenCalled();
    expect(runTransaction).not.toHaveBeenCalled();
    expect(state.get(internalNotes)?.body).toBe(sentinel);
  });
  it("does not mark completion when object deletion fails", async () => {
    vi.stubEnv("R2_EVIDENCE_ENABLED", "true");
    const { database, runTransaction, state } = fixture({ evidence: true });
    await expect(
      executeApprovedDeletion(
        { actorUserId: "admin", requestId },
        database,
        vi.fn().mockRejectedValue(new Error("storage failure")),
      ),
    ).rejects.toThrow("storage failure");
    expect(runTransaction).not.toHaveBeenCalled();
    expect(state.get(privacyDeletionRequests)?.status).toBe("APPROVED");
  });
});
