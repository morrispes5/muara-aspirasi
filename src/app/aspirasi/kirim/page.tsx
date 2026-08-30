import type { Metadata } from "next";

import { AspirationForm } from "@/components/aspirations/aspiration-form";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { createCategoryRepository } from "@/server/db/repositories";
import { getTurnstileSiteKey } from "@/server/aspirations/turnstile";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kirim Aspirasi",
  description:
    "Kirim aspirasi FTI secara terstruktur dengan privasi identitas dan kode pelacakan privat.",
};

export default async function KirimAspirasiPage() {
  const [categories, turnstileSiteKey] = await Promise.all([
    createCategoryRepository().listActive(),
    Promise.resolve(getTurnstileSiteKey()),
  ]);

  return (
    <PublicPageIntro
      description="Ceritakan situasinya dengan konteks yang cukup. Identitasmu defaultnya hanya dibaca BEM, dan laporan tidak pernah menjadi posting publik."
      eyebrow="Kirim aspirasi"
      title="Sampaikan dengan aman, simpan bukti penerimaannya"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-6 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <aside className="grid gap-4 lg:sticky lg:top-8">
            <Card className="!bg-night text-white">
              <Badge className="border-mist/50 text-mist" tone="brand">
                Privasi default
              </Badge>
              <h2 className="font-display mt-5 text-3xl leading-tight tracking-[-0.035em] text-[#f7f1e6]">
                Rahasia untuk BEM, kecuali kamu menyetujui lebih.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                Nama dan NIM tidak dipublikasikan atau diteruskan ke FTI tanpa
                persetujuan berbagi terbatas yang eksplisit.
              </p>
            </Card>
            <Card>
              <h2 className="text-ink font-bold">Sebelum mengirim</h2>
              <ul className="text-muted mt-3 grid list-disc gap-2 pl-5 text-sm leading-6">
                <li>
                  Layanan ini bukan kanal darurat atau pengaduan kepolisian.
                </li>
                <li>
                  Jangan masukkan password, OTP, atau data pribadi yang tidak
                  perlu.
                </li>
                <li>
                  Upload bukti belum dibuka sampai penyimpanan privat disetujui.
                </li>
              </ul>
            </Card>
          </aside>
          <Card className="shadow-card">
            {turnstileSiteKey ? (
              <AspirationForm
                categories={categories.map(({ id, name }) => ({ id, name }))}
                turnstileSiteKey={turnstileSiteKey}
              />
            ) : (
              <div className="border-warning/25 bg-warning-soft text-warning rounded-control border p-4 text-sm leading-6">
                Form belum dapat dibuka karena verifikasi anti-spam belum
                dikonfigurasi untuk environment ini. Tidak ada data yang dapat
                dikirim sampai konfigurasi selesai.
              </div>
            )}
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
