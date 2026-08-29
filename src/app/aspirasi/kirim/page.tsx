import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Kirim Aspirasi",
  description:
    "Pratinjau alur pengiriman aspirasi Muara Aspirasi tanpa mengirim data.",
};

const formSteps = [
  {
    number: "01",
    title: "Identitas mahasiswa",
    description:
      "Nama lengkap dan NIM diperlukan untuk verifikasi BEM. Email atau WhatsApp dapat ditambahkan bila kamu ingin dihubungi.",
  },
  {
    number: "02",
    title: "Detail aspirasi",
    description:
      "Kategori, judul masalah, lokasi, kronologi, dampak, dan usulan solusi membantu BEM memahami konteksnya.",
  },
  {
    number: "03",
    title: "Privasi dan bukti",
    description:
      "Defaultnya, identitas hanya dapat dilihat BEM. Bukti foto bersifat opsional dan akan diatur dengan perlindungan khusus saat layanan dibuka.",
  },
  {
    number: "04",
    title: "Tinjau dan kirim",
    description:
      "Kamu akan meninjau jawaban, menyetujui etika pelaporan, melewati anti-spam, lalu menyimpan kode dan token pelacakan.",
  },
] as const;

export default function KirimAspirasiPage() {
  return (
    <PublicPageIntro
      description="Inilah alur layanan yang akan dipakai saat pengiriman dibuka. Halaman ini hanya penjelasan: tidak ada data yang dikumpulkan, disimpan, atau dikirim."
      eyebrow="Kirim aspirasi"
      title="Satu laporan, dengan konteks yang cukup dan batas yang jelas"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-5">
          <div className="rounded-card border-warning/25 bg-warning-soft text-warning flex items-start gap-3 border p-4 text-sm leading-6">
            <Badge tone="warning">Pratinjau</Badge>
            <p>
              Form pengiriman belum aktif pada tahap ini. Jangan masukkan nama,
              NIM, kontak, atau detail kasus ke halaman preview ini.
            </p>
          </div>

          <ol className="grid gap-4 md:grid-cols-2">
            {formSteps.map((step) => (
              <li key={step.number}>
                <Card className="h-full space-y-5">
                  <span className="editorial-index text-brand text-4xl">
                    {step.number}
                  </span>
                  <div>
                    <h2 className="text-ink text-xl font-bold">{step.title}</h2>
                    <p className="text-muted mt-3 text-sm leading-6">
                      {step.description}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>

          <Card className="border-brand/20 bg-brand-soft">
            <Badge>Privasi identitas</Badge>
            <h2 className="text-ink mt-4 text-xl font-bold">
              Rahasia bagi FTI dan publik, secara default.
            </h2>
            <div className="text-muted mt-3 grid gap-4 text-sm leading-6 md:grid-cols-2">
              <p>
                <strong className="text-ink">Confidential BEM only.</strong>{" "}
                Nama dan NIM hanya dipakai BEM untuk verifikasi dan tidak
                diteruskan ke pihak FTI atau dipublikasikan.
              </p>
              <p>
                <strong className="text-ink">Consented limited share.</strong>{" "}
                Hanya bila kamu menyetujui secara eksplisit, BEM dapat memakai
                identitas minimum untuk koordinasi privat dengan unit FTI yang
                relevan.
              </p>
            </div>
          </Card>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/etika-pelaporan" variant="outline">
              Baca etika pelaporan
            </ButtonLink>
            <ButtonLink href="/aspirasi/lacak" variant="secondary">
              Pelajari cara melacak aspirasi
            </ButtonLink>
          </div>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
