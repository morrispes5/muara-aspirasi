import type { Metadata } from "next";

import { ContentManagerPage } from "@/components/admin/content-manager-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Update Advokasi",
  description: "Kelola draf, review, dan publikasi update advokasi BEM FTI.",
};

export default function AdminUpdatePage() {
  return (
    <ContentManagerPage
      description="Tulis ringkasan independen berbasis fakta terverifikasi. Laporan asli, identitas, catatan internal, dan evidence tidak pernah dirender ke halaman publik."
      kind="advocacy"
      permission="DRAFT_ADVOCACY_UPDATE"
      title="Update advokasi"
    />
  );
}
