import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Lacak Aspirasi",
  description:
    "Penjelasan pelacakan privat Muara Aspirasi menggunakan kode dan token rahasia.",
};

export default function LacakAspirasiPage() {
  return (
    <PublicPageIntro
      description="Saat layanan aktif, pelaporan tidak menjadi posting publik. Hanya pemegang kode pelacakan dan token rahasia yang dapat membaca pembaruan aman untuk pelapor."
      eyebrow="Lacak aspirasi"
      title="Bukti diterima dan pembaruan yang bisa kamu cek sendiri"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="bg-night text-white">
            <Badge className="border-mist/50 text-mist" tone="brand">
              Akses privat
            </Badge>
            <h2 className="font-display mt-5 text-3xl leading-tight tracking-[-0.035em] text-[#f7f1e6]">
              Kode saja tidak cukup.
            </h2>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Setelah laporan terkirim, simpan kode pelacakan dan token rahasia.
              Keduanya diperlukan untuk membuka timeline laporan; token tidak
              akan ditampilkan lagi.
            </p>
          </Card>
          <Card className="grid gap-5 md:grid-cols-3">
            {[
              [
                "01",
                "Masukkan dua kredensial",
                "Kode pelacakan dan token rahasia.",
              ],
              [
                "02",
                "Baca status aman",
                "Penerimaan laporan, progres, dan tanggal pembaruan.",
              ],
              [
                "03",
                "Temukan update publik",
                "Baca koordinasi yang sudah aman diumumkan tanpa identitas pelapor.",
              ],
            ].map(([number, title, description]) => (
              <div key={number}>
                <p className="editorial-index text-brand text-3xl">{number}</p>
                <h2 className="text-ink mt-3 font-bold">{title}</h2>
                <p className="text-muted mt-2 text-sm leading-6">
                  {description}
                </p>
              </div>
            ))}
          </Card>
        </Container>
        <Container className="mt-6">
          <Card className="border-warning/25 bg-warning-soft text-warning">
            <p className="text-sm leading-6">
              <strong>Belum aktif.</strong> Tidak ada kolom yang dapat diisi
              atau status yang dapat dicari pada Milestone 2. Pelacakan
              fungsional dibuat bersama keamanan, database, dan token pada
              Milestone 5.
            </p>
          </Card>
          <ButtonLink className="mt-6" href="/update">
            Lihat contoh update advokasi
          </ButtonLink>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
