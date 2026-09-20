import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { listRetentionReviewQueue } from "@/server/privacy/retention";
import { requireBemPermission } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Retensi dan Privasi",
  description:
    "Antrean review retensi yang hanya dapat diakses ADMIN dengan MFA.",
};

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(value);
}

export default async function AdminPrivacyPage() {
  const session = await requireBemPermission("MANAGE_PRIVACY_RETENTION");
  if (session.user.role !== "ADMIN" || !session.user.twoFactorEnabled) {
    return (
      <Card>
        <h1 className="text-ink text-2xl font-bold">MFA diperlukan</h1>
        <p className="text-muted mt-3 text-sm leading-6">
          Aktifkan MFA sebelum membuka workflow retensi dan penghapusan.
        </p>
      </Card>
    );
  }

  const queue = await listRetentionReviewQueue();
  return (
    <div className="grid gap-6">
      <header>
        <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
          ADMIN + MFA
        </p>
        <h1 className="text-ink font-display mt-3 text-4xl">
          Retensi & privasi
        </h1>
        <p className="text-muted mt-3 max-w-2xl text-sm leading-6">
          Antrean ini tidak menghapus otomatis. Catat request dari mailbox,
          verifikasi, setujui, lalu eksekusi melalui endpoint terproteksi sesuai
          SOP M9. Hold aktif selalu menghentikan penghapusan.
        </p>
      </header>
      <Card>
        <h2 className="text-ink text-lg font-bold">Kandidat review retensi</h2>
        {queue.length === 0 ? (
          <p className="text-muted mt-3 text-sm">Belum ada kandidat pending.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {queue.map((item) => (
              <li
                className="border-line rounded-control border p-4"
                key={item.id}
              >
                <p className="text-ink text-sm font-bold">
                  {item.trackingCode}
                </p>
                <p className="text-muted mt-1 text-xs leading-5">
                  Eligible {formatDate(item.eligibleAt)} · ditutup{" "}
                  {item.closedAt
                    ? formatDate(item.closedAt)
                    : "tidak diketahui"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
