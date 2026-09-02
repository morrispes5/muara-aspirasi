import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminTwoFactor } from "@/components/admin/admin-two-factor";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { getBemSession } from "@/server/auth/session";
import { getSafeAdminRedirectPath } from "@/server/auth/redirect";
import { hasPermission } from "@/server/auth/roles";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Keamanan MFA",
  description: "Pengaturan authenticator dan recovery untuk akun BEM.",
};

type AdminSecurityPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function AdminSecurityPage({
  searchParams,
}: AdminSecurityPageProps) {
  const session = await getBemSession(undefined, { allowMfaEnrollment: true });
  if (!session || !hasPermission(session.user.role, "VIEW_ADMIN_DASHBOARD")) {
    redirect("/admin/login?next=%2Fadmin%2Fsecurity");
  }

  const params = await searchParams;
  const nextPath = getSafeAdminRedirectPath(params.next);

  return (
    <main className="bg-canvas flex-1" id="konten-utama">
      <Container className="grid min-h-[calc(100svh-8rem)] items-center py-28 sm:py-32">
        <div className="mx-auto grid w-full max-w-xl gap-6">
          <div>
            <p className="text-brand text-xs font-bold tracking-[0.18em] uppercase">
              Keamanan akun
            </p>
            <h1 className="font-display text-ink mt-4 text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">
              Lindungi akses ruang BEM.
            </h1>
            <p className="text-muted mt-4 text-base leading-7">
              Setup ini tidak mengirim secret ke server lain. Secret TOTP
              disimpan terenkripsi oleh Better Auth dan backup code hanya
              ditampilkan saat setup.
            </p>
          </div>
          <Card>
            <AdminTwoFactor
              nextPath={nextPath}
              twoFactorEnabled={session.user.twoFactorEnabled}
            />
          </Card>
        </div>
      </Container>
    </main>
  );
}
