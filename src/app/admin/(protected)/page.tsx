import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const foundations = [
  [
    "Identitas BEM",
    "Akun BEM memakai login email dan kata sandi. Pendaftaran publik dimatikan.",
  ],
  [
    "Peran terukur",
    "Editor, Advocate, dan Admin memiliki izin yang berbeda dan dicek di server.",
  ],
  [
    "Jejak akses",
    "Login berhasil/gagal, keluar, dan pencabutan sesi dicatat tanpa menyimpan credential.",
  ],
] as const;

export default function AdminPage() {
  return (
    <div className="grid gap-8">
      <header className="max-w-3xl">
        <Badge>Milestone 4 · fondasi akses</Badge>
        <h1 className="font-display text-ink mt-4 text-4xl leading-[1.02] tracking-[-0.04em] sm:text-5xl">
          Ruang kerja BEM siap dipakai dengan batas yang jelas.
        </h1>
        <p className="text-muted mt-5 text-base leading-7 sm:text-lg">
          Halaman ini adalah shell awal untuk memastikan sesi dan peran bekerja
          sebelum workflow laporan dibuka. Belum ada data aspirasi operasional
          yang ditampilkan di sini.
        </p>
      </header>
      <section aria-labelledby="fondasi-akses" className="grid gap-4">
        <div>
          <p className="text-brand text-xs font-bold tracking-[0.16em] uppercase">
            Yang sudah aktif
          </p>
          <h2 className="text-ink mt-2 text-2xl font-bold" id="fondasi-akses">
            Fondasi akses internal
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
        <p className="text-brand text-sm font-bold">Langkah berikutnya</p>
        <p className="text-ink mt-2 max-w-2xl text-sm leading-6">
          Workflow kirim/lacak aspirasi tetap ditunda sampai Milestone 5. Pada
          milestone berikutnya, helper izin ini menjadi batas untuk use case
          laporan dan data rahasia.
        </p>
      </Card>
    </div>
  );
}
