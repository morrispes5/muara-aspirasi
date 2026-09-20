import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";
import { TrackingForm } from "@/components/aspirations/tracking-form";

export const metadata: Metadata = {
  title: "Lacak Aspirasi",
  description:
    "Tempel bukti pelacakan pribadi untuk melihat perkembangan aspirasimu.",
};

export default function LacakAspirasiPage() {
  return (
    <PublicPageIntro
      description="Tempel bukti yang kamu simpan setelah mengirim aspirasi. Kode dan token lama juga tetap bisa digunakan."
      eyebrow="Lacak aspirasi"
      title="Cek pembaruan tanpa membuka laporanmu ke publik"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <aside className="grid gap-4 lg:sticky lg:top-8">
            <Card className="!bg-night text-white">
              <Badge className="border-mist/50 text-mist" tone="brand">
                Akses privat
              </Badge>
              <h2 className="font-display mt-5 text-3xl leading-tight tracking-[-0.035em] text-[#f7f1e6]">
                Satu bukti, kabar untukmu.
              </h2>
              <p className="mt-4 text-sm leading-6 text-slate-300">
                BEM tidak dapat menampilkan ulang token rahasia. Bila token
                hilang, jangan membagikan informasi laporan di kanal publik.
              </p>
            </Card>
            <Card>
              <h2 className="text-ink font-bold">Yang dapat kamu lihat</h2>
              <p className="text-muted mt-3 text-sm leading-6">
                Bukti penerimaan, status, waktu pembaruan, serta pesan yang aman
                untuk pelapor. Catatan internal, identitas, dan rute BEM tidak
                ditampilkan.
              </p>
            </Card>
          </aside>
          <Card className="shadow-card">
            <TrackingForm />
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
