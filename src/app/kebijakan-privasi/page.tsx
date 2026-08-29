import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Draf penjelasan pemrosesan data aspirasi Muara Aspirasi.",
};

const privacySections = [
  [
    "Data yang direncanakan",
    "Nama dan NIM untuk verifikasi BEM; kontak opsional; detail aspirasi; pilihan consent; dan bukti opsional saat perlindungan upload sudah siap.",
  ],
  [
    "Tujuan penggunaan",
    "Memahami aspirasi, melakukan triage, koordinasi yang proporsional, memberi pembaruan aman, dan menjaga audit operasional.",
  ],
  [
    "Siapa yang dapat melihat",
    "Role BEM yang berwenang dan membutuhkan informasi tersebut. FTI/public tidak melihat identitas pada mode default BEM-only.",
  ],
  [
    "Batas publikasi",
    "Update publik ditulis sebagai ringkasan independen. Nama, NIM, kontak, bukti, token, dan catatan internal tidak menjadi konten publik.",
  ],
] as const;

export default function KebijakanPrivasiPage() {
  return (
    <PublicPageIntro
      description="Draf ini menjelaskan arah perlindungan data sebelum layanan pengiriman aktif. Versi operasional, periode retensi, dan kanal permintaan data masih menunggu persetujuan owner."
      eyebrow="Kebijakan privasi"
      title="Privasi bukan catatan kaki"
    >
      <section className="bg-surface py-12 sm:py-16">
        <Container className="grid gap-4 md:grid-cols-2">
          {privacySections.map(([title, description]) => (
            <Card key={title}>
              <h2 className="text-ink text-xl font-bold">{title}</h2>
              <p className="text-muted mt-3 text-sm leading-6">{description}</p>
            </Card>
          ))}
        </Container>
        <Container className="mt-8">
          <Card className="border-warning/25 bg-warning-soft text-warning">
            <Badge tone="warning">Draf Milestone 2</Badge>
            <p className="mt-3 text-sm leading-6">
              Ini bukan kebijakan privasi final dan belum menjadi dasar layanan
              pengiriman. Sebelum public launch, BEM/owner harus menyetujui
              retensi data, kanal penghapusan/koreksi, kontak resmi, serta SOP
              eskalasi.
            </p>
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
