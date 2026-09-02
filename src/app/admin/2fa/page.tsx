import type { Metadata } from "next";

import { AdminTwoFactorChallenge } from "@/components/admin/admin-two-factor-challenge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { getSafeAdminRedirectPath } from "@/server/auth/redirect";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verifikasi MFA",
  description: "Verifikasi dua faktor untuk akses ruang kerja BEM.",
};

type AdminTwoFactorPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

export default async function AdminTwoFactorPage({
  searchParams,
}: AdminTwoFactorPageProps) {
  const params = await searchParams;
  const nextPath = getSafeAdminRedirectPath(params.next);

  return (
    <main className="bg-canvas flex-1" id="konten-utama">
      <Container className="grid min-h-[calc(100svh-8rem)] items-center py-28 sm:py-32">
        <div className="mx-auto grid w-full max-w-md gap-6">
          <div>
            <p className="text-brand text-xs font-bold tracking-[0.18em] uppercase">
              Verifikasi tambahan
            </p>
            <h1 className="font-display text-ink mt-4 text-4xl leading-tight tracking-[-0.04em] sm:text-5xl">
              Satu langkah lagi.
            </h1>
          </div>
          <Card>
            <AdminTwoFactorChallenge nextPath={nextPath} />
          </Card>
        </div>
      </Container>
    </main>
  );
}
