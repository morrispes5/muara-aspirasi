import { createCategoryRepository } from "@/server/db/repositories";
import Link from "next/link";
import { ReportEditor } from "@/components/admin/report-editor";
import { requireBemPermission } from "@/server/auth/session";

export const dynamic = "force-dynamic";
export default async function NewReportPage() {
  await requireBemPermission("CREATE_REPORT");
  const categories = await createCategoryRepository().listActive();
  return (
    <div className="grid gap-5">
      <Link href="/admin/laporan" className="text-brand text-sm underline">
        ← Tabel aspirasi
      </Link>
      <h1 className="text-ink text-3xl font-bold">Tambah laporan mahasiswa</h1>
      <ReportEditor
        categories={categories.map(({ id, name }) => ({ id, name }))}
      />
    </div>
  );
}
