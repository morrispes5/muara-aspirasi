import { Container } from "@/components/layout/container";
import { StateCard } from "@/components/ui/state-card";

export default function Loading() {
  return (
    <main className="flex-1 pt-28 pb-16" id="konten-utama">
      <Container className="max-w-2xl">
        <StateCard
          description="Konten sedang disiapkan untuk ditampilkan."
          headingLevel="h1"
          title="Memuat halaman"
          tone="loading"
        />
      </Container>
    </main>
  );
}
