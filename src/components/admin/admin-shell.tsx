import { type BemRole, roleLabels } from "@/server/auth/roles";
import { AdminSessionControls } from "@/components/admin/admin-session-controls";
import { Container } from "@/components/layout/container";
import Link from "next/link";
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
  return (
    <main className="bg-canvas flex-1" id="konten-utama">
      <Container className="grid gap-6 py-28 sm:py-32 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        <aside className="rounded-card border-line bg-surface h-fit border p-5 lg:sticky lg:top-28">
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
          <nav
            aria-label="Navigasi ruang kerja BEM"
            className="grid gap-1 py-5"
          >
            <Link
              className="bg-brand-soft text-brand rounded-control px-3 py-2.5 text-sm font-bold"
              href="/admin"
            >
              Beranda admin
            </Link>
            {user.canViewReports ? (
              <Link
                className="text-ink hover:bg-brand-soft hover:text-brand rounded-control px-3 py-2.5 text-sm font-bold"
                href="/admin/laporan"
              >
                Tabel aspirasi
              </Link>
            ) : null}
            {user.canDraftAdvocacy ? (
              <Link
                className="text-ink hover:bg-brand-soft hover:text-brand rounded-control px-3 py-2.5 text-sm font-bold"
                href="/admin/update"
              >
                Update advokasi
              </Link>
            ) : null}
            {user.canDraftStudentInfo ? (
              <Link
                className="text-ink hover:bg-brand-soft hover:text-brand rounded-control px-3 py-2.5 text-sm font-bold"
                href="/admin/info-mahasiswa"
              >
                Info mahasiswa
              </Link>
            ) : null}
            {user.canManageUsers ? (
              <Link
                className="text-ink hover:bg-brand-soft hover:text-brand rounded-control px-3 py-2.5 text-sm font-bold"
                href="/admin/users"
              >
                Kelola akun BEM
              </Link>
            ) : null}
            {user.canManagePrivacy ? (
              <Link
                className="text-ink hover:bg-brand-soft hover:text-brand rounded-control px-3 py-2.5 text-sm font-bold"
                href="/admin/privacy"
              >
                Retensi & privasi
              </Link>
            ) : null}
            {user.role === "ADMIN" ? (
              <Link
                className="text-ink hover:bg-brand-soft hover:text-brand rounded-control px-3 py-2.5 text-sm font-bold"
                href="/admin/security"
              >
                Keamanan MFA
              </Link>
            ) : null}
          </nav>
          <div className="border-line border-t pt-5">
            <p className="text-muted mb-3 text-xs leading-5">
              Sesi aktif dikelola dengan cookie HttpOnly. Cabut sesi lain bila
              perangkat pernah dipakai bersama.
            </p>
            <AdminSessionControls />
          </div>
        </aside>
        <section className="min-w-0">{children}</section>
      </Container>
    </main>
  );
}
