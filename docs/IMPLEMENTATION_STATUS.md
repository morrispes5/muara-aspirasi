# Implementation Status — Muara Aspirasi

> Terakhir diperbarui: 30 Agustus 2026
> Milestone aktif: **Milestone 4 selesai; Milestone 5 belum dimulai**

## Ringkasan status

Milestone 0, Documentation Gate, Milestone 1 (UI foundation), Milestone 2 (halaman publik statis), Milestone 3 (database/ORM), dan **Milestone 4 (BEM auth/roles/admin foundation) selesai**. Acceptance M4 lulus pada aplikasi lokal serta Neon development/preview dengan identitas sintetis. Milestone 5 belum dimulai.

M3 menyediakan fondasi data terisolasi dan M4 menambahkan authentication BEM-only, role enforcement, protected admin shell, access management, serta audit. Tidak ada database production, form aspirasi aktif, tracking privat, dashboard kasus, API bisnis laporan, R2, atau upload yang dibuat.

Repository GitHub privat tetap berada di `main` sesuai keputusan owner. Project Neon `morrizstore` tidak disentuh.

## Milestone selesai

| Milestone                             | Status  | Bukti utama                                                                                                                                                             |
| ------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Bootstrap dan documentation       | Selesai | Next.js, quality tooling, CI, README, dan docs proyek tersedia.                                                                                                         |
| 1 — UI Foundation dan Public Shell    | Selesai | Homepage/editorial shell responsif, asset usage terkontrol, tanpa backend.                                                                                              |
| 2 — Halaman Publik Statis             | Selesai | Halaman informasi/placeholder non-mutating dan content contoh berlabel.                                                                                                 |
| 3 — Database dan ORM Foundation       | Selesai | Schema Drizzle, migration/seed, Neon development + preview, data access awal, dan test M3.                                                                              |
| 4 — BEM Auth, Roles, Admin Foundation | Selesai | Better Auth, migration development/preview, bootstrap sintetis, BEM-only login, permission server-side, access management, audit, dan runtime/browser acceptance lulus. |

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

## Implementasi Milestone 4

### Authentication dan authorization

- Better Auth `1.7.2` dipasang dengan Drizzle adapter `1.7.2` dan catch-all handler pada `/api/auth/*`.
- Public signup dinonaktifkan; login hanya untuk akun BEM pada `bem_users` yang berstatus `ACTIVE`.
- Tabel persistence auth ditambahkan melalui migration lokal: `auth_sessions`, `auth_accounts`, dan `auth_verifications`; `bem_users` mendapat `email_verified` dan `image` sesuai mapping Better Auth.
- Role `EDITOR`, `ADVOCATE`, dan `ADMIN` beserta permission matrix eksplisit berada di `src/server/auth/roles.ts`.
- `src/server/auth/session.ts` adalah pemeriksaan server-side untuk user aktif dan permission. `src/proxy.ts` hanya redirect optimistis dan tidak menjadi authorization boundary.
- `/admin/login` menyediakan form login; `/admin` menyediakan shell kosong dengan identity, role, logout, dan revoke-other-sessions. Workflow report belum dimulai.
- Event login failure, logout, dan session revoke dicatat melalui allowlist audit tanpa password, session token, atau request body.

### Bootstrap dan migration

- `scripts/auth-bootstrap.mjs` menyediakan one-time bootstrap akun `ADMIN` dari environment; script menolak environment selain `development`/`preview` dan tidak memiliki credential hardcoded.
- Migration M4 tersedia di `drizzle/20260830054722_wise_dexter_bennett/migration.sql`, lulus `db:check`, dan sudah diterapkan/idempotent pada Neon `development` serta `preview`.
- Akun `ADMIN` sintetis dibuat pada kedua branch non-production. Plaintext password tidak masuk database, log, dokumentasi, atau repository.
- `src/server/auth/user-management.ts` membatasi perubahan role/status kepada ADMIN aktif, mencabut seluruh sesi target, menulis audit, serta mencegah self-lockout dan penghapusan last active ADMIN.

## File penting dibuat atau diubah

- `drizzle.config.ts` — konfigurasi Drizzle Kit tanpa credential hardcoded.
- `drizzle/20260829191548_milestone_3_foundation/` — migration SQL dan snapshot yang direview.
- `src/server/db/client.ts`, `health.ts`, `transaction.ts` — fondasi koneksi server, health, dan transaksi.
- `src/server/db/schema/*` — schema PostgreSQL/Drizzle per domain.
- `src/server/db/repositories/*` — data-access awal tanpa API bisnis.
- `src/server/db/*.test.ts` dan `src/server/db/repositories/*.test.ts` — test config, repository, serta transaction helper.
- `scripts/db-migrate.mjs` dan `scripts/db-seed.mjs` — migrate/seed eksplisit yang gagal aman tanpa secret dan menolak seed selain development/preview.
- `src/server/auth/*`, `src/app/admin/*`, `src/app/api/auth/[...all]/route.ts`, dan `src/components/admin/*` — fondasi auth, session/permission, handler, dan protected admin shell M4.
- `src/server/db/schema/auth.ts`, perubahan `users.ts`, dan `drizzle/20260830054722_wise_dexter_bennett/` — persistence schema dan migration auth M4.
- `scripts/auth-bootstrap.mjs`, `scripts/auth-smoke.mjs`, dan runner integration — bootstrap satu kali serta acceptance login/session/access tanpa credential di repository.
- `package.json`, `package-lock.json`, `.env.example`, `.prettierignore`, dan `README.md` — command, dependency driver WebSocket, template environment aman, dan dokumentasi operasional.
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY_PRIVACY.md`, `docs/DEPLOYMENT_RUNBOOK.md`, dan dokumen status ini — status M3 diselaraskan.

## Keputusan teknis

1. **Neon non-production dipisah dari `main`.** Development dan preview menerima migration/seed; database production belum ada dan `morrizstore` berada di luar scope.
2. **Drizzle migration adalah source perubahan schema.** SQL dibuat dengan `drizzle-kit generate`, dicek dengan `drizzle-kit check`, direview, lalu diberi migration record yang sama dengan workflow Drizzle.
3. **WebSocket Neon untuk transaksi.** Driver HTTP bagus untuk single query, tetapi driver WebSocket dipilih untuk batas transaksi interaktif yang dibutuhkan saat M5 membuat report + identity + status event secara atomik.
4. **Auth dipisahkan dari domain report.** M3 tetap hanya menyediakan `bem_users` sebagai record domain; M4 menambahkan tabel credential/session Better Auth dan helper authorization tanpa memasukkan password ke schema domain.
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

## Validasi Milestone 4

| Pemeriksaan                                     | Hasil                                                                                  |
| ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| Better Auth + Drizzle adapter install/config    | Lulus secara lokal; versi yang dipasang `1.7.2`.                                       |
| Auth schema migration generate/check            | Lulus; SQL M4 tersedia dan `db:check` lulus.                                           |
| Role/permission matrix tests                    | Lulus untuk role unknown, `EDITOR`, `ADVOCATE`, dan `ADMIN`.                           |
| Redirect safety tests                           | Lulus; external/non-admin redirect ditolak.                                            |
| Auth config tests                               | Lulus; base path, model mapping, signup off, dan password policy terverifikasi.        |
| Real database migration/login/revoke smoke test | Lulus pada development/preview; main/production tidak disentuh.                        |
| Access management integration                   | Lulus: role, suspension, revoke session, audit, dan self-lockout guard.                |
| Browser desktop/mobile                          | Lulus pada login/admin 390px; login, revoke session, logout, dan redirect tervalidasi. |
| MFA/recovery/domain allowlist decision          | Dikunci sebagai production gate: MFA ADMIN, dua recovery owner, domain resmi BEM.      |

## Pekerjaan milestone berikutnya

- Form kirim aspirasi, hashing/generasi tracking token, tracking privat, rate limit, Turnstile, dan mutation API (Milestone 5).
- R2, upload bukti, scan file, signed URL, atau evidence binary (Milestone 5/6).
- Status workflow bisnis, assignment UI, internal note UI, audit-writing service, atau public content publication workflow.
- Database/credential/deployment production, Netlify integration, serta domain resmi.

## Risiko, blocker, dan pertanyaan terbuka

- Region Neon free yang tersedia adalah AWS US East 1; ini berisiko latency untuk pengguna Indonesia dan harus dievaluasi sebelum production. Tidak ada recreate/destructive action dilakukan.
- Free plan memiliki kapasitas dan restore/history terbatas; RPO/RTO, backup/restore drill, serta ownership organisasi belum disetujui.
- Izin publikasi produksi untuk asset kampus, privacy notice final, retention/deletion SOP, escalation SOP, dan reviewer BEM masih membutuhkan keputusan manusia.
- Drizzle ORM/Kit dipasang pada rilis RC pasangan yang saat ini bebas audit vulnerability; upgrade harus dilakukan bersama setelah kompatibilitas versi diverifikasi.
- Neon connector mengalami mismatch parameter pada operasi SQL. Migration berhasil melalui command Drizzle lokal dengan connection string terautentikasi; jalur ini tetap standar untuk non-production.
- Endpoint connection development dan preview tidak menerima pasangan credential yang sama untuk direct/pooler. ENV lokal memakai endpoint yang masing-masing sudah diuji; credential harus dirotasi dan direct/pooler diverifikasi ulang sebelum production.

## Rekomendasi milestone berikutnya

Mulai **Milestone 5 — Kirim dan Lacak Aspirasi** hanya setelah scope dan acceptance-nya dibaca ulang. Pertahankan boundary M4: mahasiswa tidak memiliki akun, public signup tetap mati, operasi admin wajib permission server-side, dan data sensitif tidak boleh masuk log atau projection publik.
