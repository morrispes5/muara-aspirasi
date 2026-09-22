import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { AdminShell } from "@/components/admin/admin-shell";

const route = vi.hoisted(() => ({
  pathname: "/admin/laporan",
  pending: false,
}));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("next/link", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/link")>()),
  useLinkStatus: () => ({ pending: route.pending }),
}));
vi.mock("@/components/admin/admin-session-controls", () => ({
  AdminSessionControls: () => null,
}));

const user = {
  canDraftAdvocacy: true,
  canDraftStudentInfo: true,
  canManagePrivacy: true,
  canManageUsers: true,
  canViewReports: true,
  email: "admin@example.test",
  name: "Admin QA",
  role: "ADMIN" as const,
};

function render(overrides = {}) {
  return renderToStaticMarkup(
    <AdminShell user={{ ...user, ...overrides }}>Konten halaman</AdminShell>,
  );
}

describe("admin navigation", () => {
  beforeEach(() => {
    route.pathname = "/admin/laporan";
    route.pending = false;
  });

  it.each([
    ["/admin/laporan", "/admin/laporan"],
    ["/admin/laporan/baru", "/admin/laporan"],
    ["/admin/laporan/example", "/admin/laporan"],
    ["/admin/update", "/admin/update"],
    ["/admin/info-mahasiswa", "/admin/info-mahasiswa"],
    ["/admin/users", "/admin/users"],
    ["/admin/privacy", "/admin/privacy"],
  ])("selects exactly the matching section for %s", (pathname, href) => {
    route.pathname = pathname;
    const html = render();
    const active = html.match(/<a\b[^>]*aria-current="page"[^>]*>/g) ?? [];
    expect(active).toHaveLength(1);
    expect(active[0]).toContain(`href="${href}"`);
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain("Beranda admin");
  });

  it("does not match a route that merely starts with the same letters", () => {
    route.pathname = "/admin/laporan-lain";
    expect(render()).not.toContain('aria-current="page"');
  });

  it("keeps permission-restricted sections out of the navigation", () => {
    const html = render({
      canViewReports: false,
      canManageUsers: false,
      canManagePrivacy: false,
      role: "EDITOR",
    });
    expect(html).not.toContain('href="/admin/laporan"');
    expect(html).not.toContain('href="/admin/users"');
    expect(html).not.toContain('href="/admin/privacy"');
    expect(html).not.toContain('href="/admin/security"');
    expect(html).toContain('href="/admin/update"');
  });

  it("shows accessible feedback only while a link is pending", () => {
    expect(render()).not.toContain("Memuat");
    route.pending = true;
    expect(render()).toContain('class="sr-only">Memuat Tabel aspirasi');
  });
});
