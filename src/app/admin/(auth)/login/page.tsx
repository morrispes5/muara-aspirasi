import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getBemSession, isMfaRequired } from "@/server/auth/session";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { getSafeAdminRedirectPath } from "@/server/auth/redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Masuk BEM",
};

type AdminLoginPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function AdminLoginPage({
  searchParams,
}: AdminLoginPageProps) {
  const params = await searchParams;
  const redirectPath = getSafeAdminRedirectPath(params.next);
  const session = await getBemSession();

  if (session) {
    redirect(redirectPath);
  }

  return (
    <main className="bg-canvas flex-1" id="konten-utama">
      <Container className="grid min-h-[calc(100svh-8rem)] items-center py-28 sm:py-32">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div>
            <p className="text-brand text-xs font-bold tracking-[0.18em] uppercase">
              Akses internal
            </p>
            <h1 className="font-display text-ink mt-4 text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">
              Masuk admin.
            </h1>
            <p className="text-muted mt-4 text-base leading-7">
              Khusus pengelola Muara Aspirasi. Mahasiswa dapat mengirim dan
              melacak aspirasi tanpa login.
            </p>
          </div>
          <Card>
            <AdminLoginForm
              mfaRequired={isMfaRequired()}
              redirectPath={redirectPath}
            />
          </Card>
          <Link
            className="text-brand hover:text-brand-dark rounded-control text-center text-sm font-bold underline underline-offset-4"
            href="/"
          >
            Kembali ke halaman publik
          </Link>
        </div>
      </Container>
    </main>
  );
}
