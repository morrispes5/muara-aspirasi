import { afterEach, describe, expect, it, vi } from "vitest";

import * as evidenceService from "@/server/aspirations/evidence-service";
import { type Database } from "@/server/db/client";
import { type SubmissionInput } from "@/server/aspirations/validation";
import { submitPublicReport } from "@/server/aspirations/submission-service";

describe("submission evidence rollback", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("deletes prepared final objects when the database transaction fails", async () => {
    vi.stubEnv(
      "PUBLIC_ABUSE_SIGNAL_SECRET",
      "test-only-secret-with-sufficient-entropy-1234567890",
    );
    const failure = new Error("forced transaction failure");
    const database = {
      transaction: vi.fn().mockRejectedValue(failure),
    } as unknown as Database;
    const discard = vi
      .spyOn(evidenceService, "discardPreparedEvidence")
      .mockResolvedValue(undefined);
    const prepared = [
      {
        checksumSha256: "a".repeat(64),
        intentId: "00000000-0000-4000-8000-000000000001",
        intentObjectKey:
          "evidence/quarantine/00000000-0000-4000-8000-000000000002",
        mimeType: "application/pdf",
        objectKey: "evidence/final/00000000-0000-4000-8000-000000000003",
        originalFilename: "evidence.pdf",
        sizeBytes: 123,
      },
    ];

    await expect(
      submitPublicReport(
        {} as SubmissionInput,
        "00000000-0000-4000-8000-000000000004",
        prepared,
        database,
      ),
    ).rejects.toBe(failure);

    expect(discard).toHaveBeenCalledWith(prepared);
  });
});
