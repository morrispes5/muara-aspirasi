import { describe, expect, it } from "vitest";

import { getSafeAdminRedirectPath } from "@/server/auth/redirect";

describe("admin redirect validation", () => {
  it("accepts only local admin paths", () => {
    expect(getSafeAdminRedirectPath("/admin")).toBe("/admin");
    expect(getSafeAdminRedirectPath("/admin/laporan?status=RECEIVED")).toBe(
      "/admin/laporan?status=RECEIVED",
    );
  });

  it("rejects external and non-admin destinations", () => {
    expect(getSafeAdminRedirectPath("https://example.com")).toBe("/admin");
    expect(getSafeAdminRedirectPath("//example.com/admin")).toBe("/admin");
    expect(getSafeAdminRedirectPath("/update")).toBe("/admin");
    expect(getSafeAdminRedirectPath("/administrator")).toBe("/admin");
    expect(getSafeAdminRedirectPath(["/admin", "/update"])).toBe("/admin");
    expect(getSafeAdminRedirectPath(undefined)).toBe("/admin");
  });
});
