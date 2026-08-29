import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Etika Pelaporan",
  description:
    "Pedoman pelaporan aman dan bertanggung jawab untuk Muara Aspirasi.",
};

export default function EtikaPelaporanPage() {
  return (
    <PublicPageIntro
      description="Aspirasi akan lebih mudah ditindaklanjuti bila fokus pada pengalaman, konteks, dan perbaikan yang diharapkan."
      eyebrow="Etika pelaporan"
      title="Tulis dengan jelas, aman, dan bertanggung jawab"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h2 className="text-ink text-xl font-bold">
              Yang sebaiknya disampaikan
            </h2>
            <ul className="text-muted mt-4 grid gap-3 text-sm leading-6">
              <li>• Apa yang terjadi, di mana, dan kapan konteksnya.</li>
              <li>• Dampak yang dirasakan pada proses belajar atau kampus.</li>
              <li>• Saran perbaikan bila kamu memilikinya.</li>
              <li>
                • Bukti yang relevan dan tidak melanggar privasi pihak lain.
              </li>
            </ul>
          </Card>
          <Card className="border-danger/25 bg-danger-soft">
            <h2 className="text-danger text-xl font-bold">
              Yang tidak boleh dimasukkan
            </h2>
            <ul className="text-danger mt-4 grid gap-3 text-sm leading-6">
              <li>
                • Fitnah, ancaman, ujaran kebencian, atau serangan pribadi.
              </li>
              <li>
                • Password, OTP, data bank, atau dokumen privat yang tidak
                relevan.
              </li>
              <li>
                • Tuduhan sebagai fakta tanpa konteks yang dapat diperiksa.
              </li>
              <li>• Konten darurat yang membutuhkan respons segera.</li>
            </ul>
          </Card>
        </Container>
        <Container className="mt-8">
          <Card className="bg-canvas">
            <h2 className="text-ink text-xl font-bold">
              Cara BEM memperlakukan laporan
            </h2>
            <p className="text-muted mt-3 max-w-3xl text-sm leading-6">
              BEM dapat meminta klarifikasi jika kontak tersedia, menandai
              laporan di luar scope, atau menolak konten yang tidak aman.
              Keputusan publik selalu berupa ringkasan baru dan tidak
              memindahkan laporan asli ke halaman umum.
            </p>
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
