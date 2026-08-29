import { describe, expect, it } from "vitest";

import { navigationItems, siteConfig } from "@/lib/site-config";

describe("siteConfig", () => {
  it("menetapkan identitas proyek fondasi", () => {
    expect(siteConfig.name).toBe("Muara Aspirasi");
    expect(siteConfig.purpose).toContain("BEM FTI");
  });

  it("mengarahkan navigasi publik ke route canonical Milestone 2", () => {
    expect(siteConfig.reportPath).toBe("/aspirasi/kirim");
    expect(siteConfig.trackingPath).toBe("/aspirasi/lacak");
    expect(navigationItems.map((item) => item.href)).toEqual([
      "/",
      "/update",
      "/info-mahasiswa",
      "/tentang",
    ]);
  });
});
