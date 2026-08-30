import { describe, expect, it } from "vitest";

import {
  canTransitionReportStatus,
  CaseManagementError,
  parseReportQueueQuery,
} from "@/server/aspirations/case-management";

const categoryId = "1ea889bc-f591-4d08-bf40-7d7d9f71fb0d";

describe("case management policy", () => {
  it("accepts the guarded forward status flow and same-status messages", () => {
    expect(canTransitionReportStatus("RECEIVED", "UNDER_REVIEW")).toBe(true);
    expect(
      canTransitionReportStatus("UNDER_REVIEW", "NEEDS_CLARIFICATION"),
    ).toBe(true);
    expect(canTransitionReportStatus("UNDER_REVIEW", "UNDER_REVIEW")).toBe(
      true,
    );
  });

  it("rejects jumps that skip the case workflow", () => {
    expect(canTransitionReportStatus("RECEIVED", "RESOLVED")).toBe(false);
    expect(canTransitionReportStatus("RESOLVED", "UNDER_REVIEW")).toBe(false);
    expect(canTransitionReportStatus("CANNOT_PROCESS", "ACTION_TAKEN")).toBe(
      false,
    );
  });

  it("normalizes the safe queue defaults and supported filters", () => {
    expect(
      parseReportQueueQuery(
        new URLSearchParams({
          assignment: "UNASSIGNED",
          assigneeUserId: "8f5e8f4d-7d3e-4b77-9e1d-184c1c9d35ab",
          categoryId,
          fromDate: "2026-08-01",
          page: "2",
          pageSize: "50",
          search: "  laboratorium  ",
          status: "UNDER_REVIEW",
          toDate: "2026-08-30",
          urgency: "HIGH",
        }),
      ),
    ).toEqual({
      archived: "ACTIVE",
      assignment: "UNASSIGNED",
      assigneeUserId: "8f5e8f4d-7d3e-4b77-9e1d-184c1c9d35ab",
      categoryId,
      fromDate: "2026-08-01",
      page: 2,
      pageSize: 50,
      search: "laboratorium",
      status: "UNDER_REVIEW",
      toDate: "2026-08-30",
      urgency: "HIGH",
    });
  });

  it("rejects invalid pagination, enum, UUID, and search input", () => {
    const invalidQueries = [
      new URLSearchParams({ pageSize: "11" }),
      new URLSearchParams({ status: "PUBLISHED" }),
      new URLSearchParams({ assignment: "MINE" }),
      new URLSearchParams({ categoryId: "not-a-uuid" }),
      new URLSearchParams({ assigneeUserId: "not-a-uuid" }),
      new URLSearchParams({ fromDate: "2026-02-30" }),
      new URLSearchParams({ fromDate: "2026-08-31", toDate: "2026-08-30" }),
      new URLSearchParams({ search: "x".repeat(81) }),
    ];

    for (const query of invalidQueries) {
      expect(() => parseReportQueueQuery(query)).toThrow(CaseManagementError);
    }
  });
});
