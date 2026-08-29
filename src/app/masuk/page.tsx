import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/public/placeholder-page";
import { StateCard } from "@/components/ui/state-card";

export const metadata: Metadata = {
  title: "Masuk BEM",
};

export default function MasukPage() {
  return (
    <PlaceholderPage
      action={{ href: "/", label: "Kembali ke beranda" }}
      description="Area kerja BEM akan disiapkan setelah kebutuhan peran, keamanan, dan autentikasi disetujui pada milestone tersendiri."
      eyebrow="Area BEM"
      title="Akses internal belum diaktifkan"
    >
      <StateCard
        description="Tidak ada mekanisme masuk, akun, atau autentikasi pada milestone UI Foundation."
        title="Masuk BEM belum tersedia"
        tone="empty"
      />
    </PlaceholderPage>
  );
}
