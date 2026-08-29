import { ButtonLink } from "@/components/ui/button-link";
import { Container } from "@/components/layout/container";
import { StateCard } from "@/components/ui/state-card";

export default function NotFound() {
  return (
    <main className="flex-1 pt-28 pb-16" id="konten-utama">
      <Container className="grid max-w-2xl gap-6">
        <StateCard
          description="Alamat yang kamu buka belum tersedia di shell publik Muara Aspirasi."
          title="Halaman tidak ditemukan"
          tone="error"
        />
        <ButtonLink href="/">Kembali ke beranda</ButtonLink>
      </Container>
    </main>
  );
}
