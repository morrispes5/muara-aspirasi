import type { Metadata } from "next";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/layout/container";
import { PublicPageIntro } from "@/components/public/public-page-intro";

export const metadata: Metadata = {
  title: "Kebijakan Privasi",
  description: "Penjelasan pemrosesan data aspirasi Muara Aspirasi.",
};

const privacySections = [
  [
    "Data yang dikumpulkan",
    "Nama, NIM (10 angka), email, WhatsApp, detail aspirasi dan usulan solusi wajib untuk laporan baru. Izin dihubungi dan berbagi identitas tetap pilihan; bukti lampiran opsional bila tersedia. Data lama tidak dilengkapi secara otomatis.",
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
  [
    "Retensi dan penghapusan",
    "Laporan yang sudah ditutup disimpan selama 12 bulan. Laporan yang masih aktif atau memiliki hold tidak dihapus. Penghapusan dilakukan melalui review ADMIN dengan MFA dan dicatat tanpa menyimpan ulang data yang dihapus.",
  ],
  [
    "Cadangan pelacakan di perangkat",
    "Hanya bila kamu memilih Simpan di perangkat pribadi, browser menyimpan bukti rahasia (maksimal 20, kedaluwarsa 90 hari saat dibuka kembali). Siapa pun yang menggunakan browser ini dapat membaca progres. Cadangan tidak tersinkron dan bisa hilang jika data browser dihapus. File bukti dibaca lokal. Tidak ada pemulihan otomatis lewat email atau NIM.",
  ],
  [
    "Rekap Excel privat",
    "Admin dapat mengunduh rekap nama, NIM, email dan ringkasan daftar laporan untuk pengelolaan BEM. Ekspor dicatat dan tidak boleh dibagikan ke publik. Token, catatan internal dan lampiran tidak termasuk rekap.",
  ],
] as const;

export default function KebijakanPrivasiPage() {
  const privacyMailbox = process.env.NEXT_PUBLIC_BEM_PRIVACY_EMAIL?.trim();
  return (
    <PublicPageIntro
      description="Penjelasan bagaimana Muara Aspirasi membatasi akses, retensi, dan penghapusan data laporan."
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
          <Card className="border-brand/25 bg-brand-soft text-brand">
            <Badge tone="brand">Kanal privasi BEM</Badge>
            <p className="mt-3 text-sm leading-6">
              Untuk permintaan penghapusan atau koreksi, hubungi mailbox resmi
              BEM. Sertakan kode pelacakan bila tersedia; jangan mengirim token
              pelacakan, kata sandi, OTP, atau evidence melalui email.
            </p>
            {privacyMailbox ? (
              <a
                className="mt-3 inline-flex text-sm font-bold underline underline-offset-4"
                href={`mailto:${privacyMailbox}`}
              >
                {privacyMailbox}
              </a>
            ) : (
              <p className="mt-3 text-sm font-bold">
                Mailbox privasi BEM sedang dikonfigurasi.
              </p>
            )}
          </Card>
        </Container>
      </section>
    </PublicPageIntro>
  );
}
