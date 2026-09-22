import { StateCard } from "@/components/ui/state-card";

export default function AdminLoading() {
  return (
    <div aria-live="polite" role="status">
      <StateCard
        description="Tunggu sebentar. Menu ruang kerja tetap bisa digunakan."
        headingLevel="h1"
        title="Memuat halaman admin"
        tone="loading"
      />
    </div>
  );
}
