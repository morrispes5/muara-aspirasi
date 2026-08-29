# Implementation Status — Muara Aspirasi

> Terakhir diperbarui: 30 Agustus 2026
> Milestone aktif: **Milestone 3 — Database dan ORM Foundation (selesai)**

## Ringkasan status

Milestone 0, Documentation Gate, Milestone 1 (UI foundation), Milestone 2 (halaman publik statis), dan **Milestone 3** selesai. UI publik tetap bersifat statis dan tidak berubah pada M3.

M3 menyediakan fondasi data yang terisolasi untuk Muara Aspirasi: project Neon terpisah pada free plan, branch `development` dan `preview`, Drizzle schema sesuai `DATA_MODEL.md`, migration SQL reviewable, seed sintetis, repository awal, internal health probe, dan transaction helper. Tidak ada database production, auth, form aspirasi, tracking, dashboard, API bisnis, R2, atau upload yang dibuat.

Repository GitHub privat tetap berada di `main` sesuai keputusan owner. Project Neon `morrizstore` tidak disentuh.

## Milestone selesai

| Milestone                          | Status  | Bukti utama                                                                                |
| ---------------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| 0 — Bootstrap dan documentation    | Selesai | Next.js, quality tooling, CI, README, dan docs proyek tersedia.                            |
| 1 — UI Foundation dan Public Shell | Selesai | Homepage/editorial shell responsif, asset usage terkontrol, tanpa backend.                 |
| 2 — Halaman Publik Statis          | Selesai | Halaman informasi/placeholder non-mutating dan content contoh berlabel.                    |
| 3 — Database dan ORM Foundation    | Selesai | Schema Drizzle, migration/seed, Neon development + preview, data access awal, dan test M3. |

## Implementasi Milestone 3

### Infrastruktur data

- Project Neon khusus: `muara-aspirasi` (`divine-art-60321097`), free plan, PostgreSQL 18, AWS US East 1.
- Branch non-production: `development` (`br-super-pond-avlexrnx`) dan `preview` (`br-jolly-butterfly-avdafzzv`). Branch Neon `main` tidak diubah.
- Migration `drizzle/20260829191548_milestone_3_foundation/migration.sql` sudah direview dan diterapkan atomik pada `development` dan `preview` melalui SQL editor Neon. Kedua branch mencatat migration tersebut pada `drizzle.__drizzle_migrations`.
- Seed sintetis diterapkan pada kedua branch: tujuh kategori laporan, satu record user development nonaktif tanpa credential, serta dua draf konten nonpublik. Tidak ada nama, NIM, contact, aspirasi, atau evidence mahasiswa nyata.

### Schema dan data access

- `src/server/db/schema/` memetakan `BemUser`, `Category`, `AspirationReport`, `ReporterIdentity`, `ReportEvidence`, `ReportStatusEvent`, `InternalNote`, `ReportAssignment`, `AuditEvent`, `AdvocacyUpdate`, `AdvocacyUpdateReport`, dan `StudentInfoPost`.
- Enum identity, status, urgency, evidence, audit, role, dan publication dikunci sebagai kontrak database.
- PII dipisahkan dalam `reporter_identities`; tracking secret hanya memiliki kolom hash; evidence hanya metadata private tanpa integrasi R2.
- Unique constraint, foreign key `RESTRICT`, check constraint, index laporan/publication/audit, dan partial unique assignment aktif tersedia.
- `src/server/db/client.ts` memakai Neon serverless WebSocket driver supaya transaction interaktif didukung. Secret hanya dibaca server-side dari `DATABASE_URL` saat dipakai.
- `src/server/db/health.ts` menyediakan probe internal tanpa Route Handler publik dan tanpa membocorkan error vendor.
- `src/server/db/transaction.ts` menjadi satu batas transaksi reusable untuk operasi multi-record pada milestone berikutnya.
- Repository awal hanya menyediakan daftar kategori aktif dan lookup report internal minim; tidak ada public projection, authorization bypass, atau endpoint.

## File penting dibuat atau diubah

- `drizzle.config.ts` — konfigurasi Drizzle Kit tanpa credential hardcoded.
- `drizzle/20260829191548_milestone_3_foundation/` — migration SQL dan snapshot yang direview.
- `src/server/db/client.ts`, `health.ts`, `transaction.ts` — fondasi koneksi server, health, dan transaksi.
- `src/server/db/schema/*` — schema PostgreSQL/Drizzle per domain.
- `src/server/db/repositories/*` — data-access awal tanpa API bisnis.
- `src/server/db/*.test.ts` dan `src/server/db/repositories/*.test.ts` — test config, repository, serta transaction helper.
- `scripts/db-migrate.mjs` dan `scripts/db-seed.mjs` — migrate/seed eksplisit yang gagal aman tanpa secret dan menolak seed selain development/preview.
- `package.json`, `package-lock.json`, `.env.example`, `.prettierignore`, dan `README.md` — command, dependency driver WebSocket, template environment aman, dan dokumentasi operasional.
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY_PRIVACY.md`, `docs/DEPLOYMENT_RUNBOOK.md`, dan dokumen status ini — status M3 diselaraskan.

## Keputusan teknis

1. **Neon non-production dipisah dari `main`.** Development dan preview menerima migration/seed; database production belum ada dan `morrizstore` berada di luar scope.
2. **Drizzle migration adalah source perubahan schema.** SQL dibuat dengan `drizzle-kit generate`, dicek dengan `drizzle-kit check`, direview, lalu diberi migration record yang sama dengan workflow Drizzle.
3. **WebSocket Neon untuk transaksi.** Driver HTTP bagus untuk single query, tetapi driver WebSocket dipilih untuk batas transaksi interaktif yang dibutuhkan saat M5 membuat report + identity + status event secara atomik.
4. **Tidak ada Better Auth pada M3.** `bem_users` adalah record domain tanpa password/session; Better Auth dan role enforcement baru M4.
5. **Seed adalah sintetis dan draft-only.** User development berstatus `SUSPENDED`, seluruh konten seed berstatus `DRAFT`, dan tidak ada PII mahasiswa.
6. **Migration tidak dijalankan oleh build.** `npm run db:migrate` memerlukan `DATABASE_URL_UNPOOLED` secara eksplisit; build/deploy tidak boleh mengubah database diam-diam.

## Validasi Milestone 3

| Pemeriksaan                    | Hasil                                                                                                                        |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:generate`          | Lulus; tidak ada perubahan schema tambahan setelah migration foundation.                                                     |
| `npm run db:check`             | Lulus; migration Drizzle konsisten.                                                                                          |
| TypeScript M3                  | Lulus dalam strict mode.                                                                                                     |
| Unit tests M3                  | Lulus: konfigurasi secret fail-safe, repository kategori, serta boundary transaksi/propagasi rollback.                       |
| Neon `development` migration   | Lulus atomik; 12 tabel foundation, 7 kategori seed, 1 record migration, partial unique index tersedia.                       |
| Constraint test `development`  | Lulus: email wajib lower-case, slug kategori unique, dan satu active assignment/report ditegakkan; artefak test dibersihkan. |
| Transaction test `development` | Lulus: insert test di-rollback dan tidak tersisa (`transaction_rollback_clean = true`).                                      |
| Neon `preview` migration       | Lulus; 12 tabel foundation, 7 kategori seed, 1 record migration.                                                             |

## Pekerjaan yang sengaja belum dikerjakan

- Better Auth, akun BEM yang dapat login, role enforcement, admin shell, atau dashboard (Milestone 4).
- Form kirim aspirasi, hashing/generasi tracking token, tracking privat, rate limit, Turnstile, dan mutation API (Milestone 5).
- R2, upload bukti, scan file, signed URL, atau evidence binary (Milestone 5/6).
- Status workflow bisnis, assignment UI, internal note UI, audit-writing service, atau public content publication workflow.
- Database/credential/deployment production, Netlify integration, serta domain resmi.

## Risiko, blocker, dan pertanyaan terbuka

- Region Neon free yang tersedia adalah AWS US East 1; ini berisiko latency untuk pengguna Indonesia dan harus dievaluasi sebelum production. Tidak ada recreate/destructive action dilakukan.
- Free plan memiliki kapasitas dan restore/history terbatas; RPO/RTO, backup/restore drill, serta ownership organisasi belum disetujui.
- Izin publikasi produksi untuk asset kampus, privacy notice final, retention/deletion SOP, escalation SOP, dan reviewer BEM masih membutuhkan keputusan manusia.
- Drizzle ORM/Kit dipasang pada rilis RC pasangan yang saat ini bebas audit vulnerability; upgrade harus dilakukan bersama setelah kompatibilitas versi diverifikasi.
- Neon MCP mengalami mismatch parameter pada operasi SQL. Migration tetap berhasil melalui SQL editor Neon yang terautentikasi; command lokal `db:migrate` tetap menjadi jalur standar saat secret disediakan secara aman.

## Rekomendasi milestone berikutnya

Mulai **Milestone 4 — BEM Authentication, Roles, dan Admin Foundation** saja: instal Better Auth, bootstrap procedure akun BEM, callback/trusted origin, middleware/guard server, role/permission matrix, audit event auth, dan admin shell kosong. Jangan membuat form atau submit aspirasi sampai M5.
