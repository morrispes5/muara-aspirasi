import { describe, expect, it } from "vitest";

import {
  hasPermission,
  isBemRole,
  permissionsForRole,
} from "@/server/auth/roles";

describe("BEM permission matrix", () => {
  it("keeps public values and unknown roles outside the matrix", () => {
    expect(isBemRole("ADMIN")).toBe(true);
    expect(isBemRole("admin")).toBe(false);
    expect(isBemRole(null)).toBe(false);
    expect(hasPermission("UNKNOWN", "VIEW_ADMIN_DASHBOARD")).toBe(false);
  });

  it("lets editor work on the admin shell and student info only", () => {
    expect(hasPermission("EDITOR", "VIEW_ADMIN_DASHBOARD")).toBe(true);
    expect(hasPermission("EDITOR", "DRAFT_STUDENT_INFO")).toBe(true);
    expect(hasPermission("EDITOR", "VIEW_REPORTS")).toBe(false);
    expect(hasPermission("EDITOR", "VIEW_CONFIDENTIAL_REPORT")).toBe(false);
    expect(hasPermission("EDITOR", "MANAGE_USERS")).toBe(false);
  });

  it("lets advocate process reports without user or publication approval power", () => {
    expect(hasPermission("ADVOCATE", "VIEW_REPORTS")).toBe(true);
    expect(hasPermission("ADVOCATE", "PROCESS_REPORT")).toBe(true);
    expect(hasPermission("ADVOCATE", "DRAFT_ADVOCACY_UPDATE")).toBe(true);
    expect(hasPermission("ADVOCATE", "APPROVE_PUBLICATION")).toBe(false);
    expect(hasPermission("ADVOCATE", "MANAGE_USERS")).toBe(false);
  });

  it("gives admin the complete matrix", () => {
    expect(permissionsForRole("ADMIN")).toHaveLength(11);
    expect(hasPermission("ADMIN", "APPROVE_PUBLICATION")).toBe(true);
    expect(hasPermission("ADMIN", "ARCHIVE_REPORT")).toBe(true);
    expect(hasPermission("ADMIN", "MANAGE_USERS")).toBe(true);
    expect(hasPermission("ADMIN", "VIEW_AUDIT")).toBe(true);
  });
});
