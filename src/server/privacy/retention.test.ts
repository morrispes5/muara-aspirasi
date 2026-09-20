import { describe, expect, it } from "vitest";

import {
  canTransitionDeletionRequest,
  isRetentionEligible,
  RETENTION_MONTHS,
  retentionEligibleAt,
} from "@/server/privacy/retention";

describe("retention policy", () => {
  it("keeps a closed report for exactly twelve calendar months", () => {
    const closedAt = new Date("2025-02-28T12:00:00.000Z");
    const eligibleAt = retentionEligibleAt(closedAt);

    expect(RETENTION_MONTHS).toBe(12);
    expect(eligibleAt.toISOString()).toBe("2026-02-28T12:00:00.000Z");
    expect(
      isRetentionEligible(closedAt, new Date("2026-02-28T11:59:59.999Z")),
    ).toBe(false);
    expect(isRetentionEligible(closedAt, eligibleAt)).toBe(true);
  });

  it("allows deletion only after mailbox verification and ADMIN approval", () => {
    expect(canTransitionDeletionRequest("RECEIVED", "VERIFIED")).toBe(true);
    expect(canTransitionDeletionRequest("VERIFIED", "APPROVED")).toBe(true);
    expect(canTransitionDeletionRequest("APPROVED", "COMPLETED")).toBe(true);
    expect(canTransitionDeletionRequest("RECEIVED", "APPROVED")).toBe(false);
    expect(canTransitionDeletionRequest("COMPLETED", "VERIFIED")).toBe(false);
  });
});
