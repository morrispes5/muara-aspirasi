import type { Metadata } from "next";

import {
  InformationCard,
  PlaceholderPage,
} from "@/components/public/placeholder-page";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Transparansi",
};

export default function TransparansiPage() {
  return (
    <PlaceholderPage
      action={{ href: "/", label: "Kembali ke beranda" }}
      description="Format ini menunjukkan cara pembaruan dapat dibaca dengan jernih saat data dan tata kelola sudah disiapkan."
      eyebrow="Transparansi"
      title="Dampak yang dijelaskan secara bertanggung jawab"
    >
      <div className="rounded-card border-warning/25 bg-warning-soft text-warning flex items-center gap-3 border p-4 text-sm leading-6">
        <Badge tone="warning">Contoh tampilan</Badge>
        Angka dan ringkasan di bawah bukan data nyata.
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <InformationCard title="Contoh: 28 masukan">
          <p>
            Format ringkasan jumlah aspirasi per periode akan diputuskan bersama
            tata kelola data.
          </p>
        </InformationCard>
        <InformationCard title="Contoh: 6 pembaruan">
          <p>
            Setiap pembaruan akan mengutamakan langkah tindak lanjut, bukan
            detail pribadi pelapor.
          </p>
        </InformationCard>
        <InformationCard title="Contoh: 3 fokus dampak">
          <p>
            Fokus dampak hanya akan ditampilkan setelah ada definisi metrik yang
            dapat diaudit.
          </p>
        </InformationCard>
      </div>
    </PlaceholderPage>
  );
}
