import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { getBemSession } from "@/server/auth/session";
import { hasPermission } from "@/server/auth/roles";

const foundations = [
  [
    "Antrean terarah",
    "Laporan baru dapat disaring berdasarkan status, kategori, urgensi, dan assignment.",
  ],
  [
    "Data terpisah",
    "Isi laporan, identitas, catatan internal, pesan pelapor, dan evidence memiliki batas akses.",
  ],
  [
    "Tindakan terlacak",
    "Perubahan status, PIC, catatan, dan arsip menghasilkan audit tanpa menyalin isi sensitif.",
  ],
] as const;

export default function AdminPage() {
  const sessionPromise = getBemSession();

  return <AdminHome sessionPromise={sessionPromise} />;
}

async function AdminHome({
  sessionPromise,
}: {
  sessionPromise: ReturnType<typeof getBemSession>;
}) {
  const session = await sessionPromise;
  const canViewReports = Boolean(
    session && hasPermission(session.user.role, "VIEW_REPORTS"),
  );

  return (
    <div className="grid gap-8">
      <header className="max-w-3xl">
        <Badge>Ruang kerja BEM</Badge>
        <h1 className="font-display text-ink mt-4 text-4xl leading-[1.02] tracking-[-0.04em] sm:text-5xl">
          Laporan diproses dengan konteks yang cukup dan batas yang jelas.
        </h1>
        <p className="text-muted mt-5 text-base leading-7 sm:text-lg">
          Antrean laporan hanya tersedia untuk peran BEM yang diberi izin.
          Identitas pelapor, evidence, catatan internal, dan pesan aman untuk
          pelapor tidak dicampur dalam projection publik.
        </p>
      </header>
      <section aria-labelledby="fondasi-akses" className="grid gap-4">
        <div>
          <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
            Yang sudah aktif
          </p>
          <h2 className="text-ink mt-2 text-2xl font-bold" id="fondasi-akses">
            Case management
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {foundations.map(([title, description]) => (
            <Card className="h-full" key={title}>
              <h3 className="text-ink text-lg font-bold">{title}</h3>
              <p className="text-muted mt-3 text-sm leading-6">{description}</p>
            </Card>
          ))}
        </div>
      </section>
      <Card className="border-brand/30 bg-brand-soft">
        <p className="text-brand text-sm font-bold">Mulai dari antrean</p>
        <p className="text-ink mt-2 max-w-2xl text-sm leading-6">
          Buka daftar laporan untuk meninjau konteks, menetapkan PIC, mencatat
          koordinasi internal, dan mengirim pembaruan yang aman kepada pelapor.
        </p>
        {canViewReports ? (
          <ButtonLink className="mt-5" href="/admin/laporan">
            Buka antrean laporan
          </ButtonLink>
        ) : null}
      </Card>
    </div>
  );
}
