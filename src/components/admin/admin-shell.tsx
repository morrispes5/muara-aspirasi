import {
  AdminNavigation,
  type AdminNavigationItem,
} from "@/components/admin/admin-navigation";
import { type BemRole, roleLabels } from "@/server/auth/roles";
import { AdminSessionControls } from "@/components/admin/admin-session-controls";
import { Container } from "@/components/layout/container";
import type { ReactNode } from "react";

type AdminShellProps = {
  children: ReactNode;
  user: {
    canDraftAdvocacy: boolean;
    canDraftStudentInfo: boolean;
    canManageUsers: boolean;
    canManagePrivacy: boolean;
    canViewReports: boolean;
    email: string;
    name: string;
    role: BemRole;
  };
};

export function AdminShell({ children, user }: AdminShellProps) {
  const items: AdminNavigationItem[] = [];
  if (user.canViewReports)
    items.push({ href: "/admin/laporan", label: "Tabel aspirasi" });
  if (user.canDraftAdvocacy)
    items.push({ href: "/admin/update", label: "Update advokasi" });
  if (user.canDraftStudentInfo)
    items.push({ href: "/admin/info-mahasiswa", label: "Info mahasiswa" });
  if (user.canManageUsers)
    items.push({ href: "/admin/users", label: "Kelola akun BEM" });
  if (user.canManagePrivacy)
    items.push({ href: "/admin/privacy", label: "Retensi & privasi" });
  if (user.role === "ADMIN")
    items.push({ href: "/admin/security", label: "Keamanan MFA" });

  return (
    <main className="bg-canvas flex-1" id="konten-utama">
      <Container className="grid gap-6 py-28 sm:py-32 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="rounded-card border-line bg-surface h-fit min-w-0 border p-4 lg:sticky lg:top-28 lg:p-5">
          <div className="border-line border-b pb-5">
            <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
              Ruang kerja BEM
            </p>
            <p className="text-ink font-display mt-3 text-2xl leading-tight">
              {user.name}
            </p>
            <p className="text-muted mt-1 text-xs leading-5 break-all">
              {user.email}
            </p>
            <span className="bg-brand-soft text-brand mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold">
              {roleLabels[user.role]}
            </span>
          </div>
          <AdminNavigation items={items} />
          <details className="border-line border-t pt-3 lg:pt-5">
            <summary className="text-ink cursor-pointer text-sm font-semibold">
              Akun & sesi
            </summary>
            <p className="text-muted mt-3 mb-3 text-xs leading-5">
              Sesi aktif dikelola dengan cookie HttpOnly. Cabut sesi lain bila
              perangkat pernah dipakai bersama.
            </p>
            <AdminSessionControls />
          </details>
        </aside>
        <section className="min-w-0">{children}</section>
      </Container>
    </main>
  );
}
