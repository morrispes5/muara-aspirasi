import type { Metadata } from "next";

import { ContentManagerPage } from "@/components/admin/content-manager-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Info Mahasiswa",
  description: "Kelola draf, review, dan publikasi informasi mahasiswa.",
};

export default function AdminInfoMahasiswaPage() {
  return (
    <ContentManagerPage
      description="Bagikan informasi akademik, layanan, kesempatan, acara, fasilitas, dan pengumuman yang sudah ditinjau. Gunakan pin untuk informasi yang perlu berada di urutan teratas."
      kind="student-info"
      permission="DRAFT_STUDENT_INFO"
      title="Info mahasiswa"
    />
  );
}
