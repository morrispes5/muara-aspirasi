import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Tentang",
};

export default function TentangPage() {
  return (
    <PublicPageIntro
      description="Muara Aspirasi adalah program advokasi BEM FTI: ruang untuk menyampaikan pengalaman kampus secara terstruktur, membaca pembaruan aman, dan memahami kerja tindak lanjut."
      eyebrow="Tentang"
      title="Ruang yang memulai percakapan dengan rasa hormat"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-4 md:grid-cols-3">
          {[
            [
              "Mendengar dengan konteks",
              "Aspirasi bukan dinding keluhan publik. Setiap laporan perlu cukup konteks agar dapat dibaca dan diarahkan secara bertanggung jawab.",
            ],
            [
              "Menjaga batas informasi",
              "Nama, NIM, kontak, bukti, dan catatan internal bukan bahan publikasi. Pembaruan publik adalah ringkasan baru yang aman.",
            ],
            [
              "Mengabarkan proses",
              "BEM tidak menjanjikan setiap persoalan pasti selesai, tetapi berkomitmen menjelaskan progres yang dapat dibagikan dengan aman.",
            ],
          ].map(([title, description]) => (
            <Card className="h-full" key={title}>
              <h2 className="text-ink text-xl font-bold">{title}</h2>
              <p className="text-muted mt-3 text-sm leading-6">{description}</p>
            </Card>
          ))}
        </Container>
        <Container className="mt-10 grid gap-6 lg:grid-cols-[1fr_0.85fr]">
          <Card className="bg-canvas">
            <h2 className="font-display text-ink text-3xl leading-tight tracking-[-0.035em]">
              Apa yang dapat kamu harapkan?
            </h2>
            <ul className="text-muted mt-5 grid gap-3 text-sm leading-6">
              <li>• Bukti bahwa laporan diterima setelah dikirim.</li>
              <li>• Status dan pesan progres yang aman untuk pelapor.</li>
              <li>• Update advokasi dan informasi mahasiswa yang terpisah.</li>
              <li>
                • Transparansi dengan data yang tidak membocorkan identitas.
              </li>
            </ul>
          </Card>
          <Card className="border-warning/25 bg-warning-soft text-warning">
            <h2 className="text-lg font-bold">Bukan layanan darurat</h2>
            <p className="mt-3 text-sm leading-6">
              Situasi bahaya langsung, kekerasan, pelecehan, risiko melukai
              diri, atau tindak pidana perlu memakai jalur darurat dan SOP
              kampus yang sesuai. Jangan menunggu respons dari Muara Aspirasi
              untuk situasi yang membutuhkan pertolongan segera.
            </p>
          </Card>
        </Container>
        <Container className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/aspirasi/kirim">Pelajari alur aspirasi</ButtonLink>
          <ButtonLink href="/kebijakan-privasi" variant="outline">
            Baca kebijakan privasi
          </ButtonLink>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
