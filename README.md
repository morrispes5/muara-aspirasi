# Muara Aspirasi

Muara Aspirasi adalah portal advokasi dan informasi mahasiswa milik BEM FTI Universitas Budi Luhur. Produk ini ditujukan untuk membantu mahasiswa menyampaikan aspirasi secara terstruktur dan aman, sekaligus mengikuti pembaruan advokasi BEM dalam bahasa yang jelas.

Repository ini telah menyelesaikan **Milestone 1 — UI Foundation dan Public Shell**, **Milestone 2 — Halaman Publik Statis**, **Milestone 3 — Database dan ORM Foundation**, **Milestone 4 — BEM Authentication, Roles, dan Admin Foundation**, **Milestone 5 — Kirim dan Lacak Aspirasi**, serta **Milestone 6 — Moderasi dan Admin Case Management**. M5 menyediakan form bertahap, validasi server, Turnstile, honeypot, rate limit berbasis Neon, idempotency, receipt credential, serta tracking privat. M6 menambahkan antrean privat, filter, detail terpisah, assignment, state transition, catatan internal, pesan reporter-visible, arsip/reopen, optimistic concurrency, dan audit. Schema M6 memakai tabel report yang sudah tersedia dari M3 sehingga tidak ada migration baru. Neon main/production tidak disentuh.

## Prasyarat

- Node.js 22.16.0 atau lebih baru dalam major version yang kompatibel
- npm 10 atau lebih baru

Versi Node yang dipakai proyek dicatat di `.nvmrc` dan `netlify.toml`.

## Menjalankan secara lokal

1. Instal dependency:

   ```bash
   npm ci
   ```

2. Salin template environment menjadi `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

   Pada PowerShell Windows, gunakan:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Jalankan development server:

   ```bash
   npm run dev
   ```

4. Buka `http://localhost:3000`.

## Environment variable

| Nama                             | Wajib saat ini                | Keterangan                                                                                                      |
| -------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`            | Tidak untuk build lokal       | Kontrak URL publik aplikasi; template menggunakan `http://localhost:3000`. Nilai ini aman diekspos ke browser.  |
| `DATABASE_URL`                   | Saat runtime database dipakai | Pooled Neon connection string untuk server runtime; isi hanya di `.env.local` atau secret store.                |
| `DATABASE_URL_UNPOOLED`          | Saat migrate/seed             | Direct Neon connection string untuk migration dan seed terkontrol; isi hanya di `.env.local` atau secret store. |
| `DATABASE_ENVIRONMENT`           | Saat seed                     | Harus `development` atau `preview`; script seed menolak nilai lain agar tidak pernah mengenai production.       |
| `BETTER_AUTH_SECRET`             | Saat admin auth dipakai       | Secret minimal 32 karakter untuk signing/encryption Better Auth; jangan gunakan placeholder.                    |
| `BETTER_AUTH_URL`                | Saat admin auth dipakai       | Origin canonical auth, misalnya `http://localhost:3000`; sesuaikan per environment.                             |
| `BETTER_AUTH_TRUSTED_ORIGINS`    | Saat admin auth dipakai       | Daftar origin tepercaya dipisahkan koma; harus sesuai origin aplikasi.                                          |
| `BEM_ALLOWED_EMAIL_DOMAINS`      | Opsional M4                   | Allowlist domain email BEM untuk prosedur bootstrap; kosong berarti tidak menambah pembatasan domain.           |
| `AUTH_BOOTSTRAP_NAME`            | One-time bootstrap            | Nama admin pertama; hapus dari `.env.local` setelah bootstrap berhasil.                                         |
| `AUTH_BOOTSTRAP_EMAIL`           | One-time bootstrap            | Email admin pertama; hanya dipakai script bootstrap dan tidak boleh masuk repository.                           |
| `AUTH_BOOTSTRAP_PASSWORD`        | One-time bootstrap            | Password admin pertama minimal 12 karakter; hapus segera setelah bootstrap berhasil.                            |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Saat form M5 dibuka           | Site key Turnstile aman untuk browser; gunakan widget terpisah setiap environment.                              |
| `TURNSTILE_SECRET_KEY`           | Saat submission M5 aktif      | Secret server-only untuk Siteverify; tidak boleh memakai prefix `NEXT_PUBLIC_`.                                 |
| `PUBLIC_ABUSE_SIGNAL_SECRET`     | Saat endpoint publik M5 aktif | Salt HMAC terpisah untuk signal rate-limit/idempotency; berbeda untuk setiap environment.                       |

Cloudflare menyediakan dummy key resmi untuk localhost/automated testing; key tersebut hanya dipakai development/preview dan wajib diganti oleh widget/key asli sebelum production. R2 evidence tetap belum diaktifkan sampai private bucket serta aturan file disetujui. Jangan pernah memasukkan secret asli ke `.env.example` atau repository.

## Command proyek

| Kebutuhan          | Command                         | Catatan                                                                                                                                        |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Development        | `npm run dev`                   | Menjalankan Next.js development server.                                                                                                        |
| Lint               | `npm run lint`                  | Menjalankan ESLint dengan zero-warning policy.                                                                                                 |
| Type-check         | `npm run typecheck`             | Menjalankan TypeScript tanpa menghasilkan file build.                                                                                          |
| Test               | `npm test`                      | Menjalankan test satu kali dengan Vitest.                                                                                                      |
| Test watch         | `npm run test:watch`            | Menjalankan Vitest dalam watch mode.                                                                                                           |
| Format             | `npm run format`                | Memformat file yang dikelola proyek dengan Prettier.                                                                                           |
| Format check       | `npm run format:check`          | Memeriksa format tanpa mengubah file.                                                                                                          |
| Check migration    | `npm run db:check`              | Memeriksa konsistensi folder migration Drizzle tanpa koneksi database.                                                                         |
| Generate migration | `npm run db:generate`           | Membuat SQL migration reviewable dari `src/server/db/schema`; review SQL sebelum menerapkannya.                                                |
| Migration database | `npm run db:migrate`            | Menerapkan migration dengan `DATABASE_URL_UNPOOLED`; command gagal aman bila secret tidak tersedia.                                            |
| Seed database      | `npm run db:seed`               | Mengisi data sintetis hanya saat `DATABASE_ENVIRONMENT=development` atau `preview`; tidak ada data mahasiswa nyata.                            |
| Auth bootstrap     | `npm run auth:bootstrap`        | Membuat satu akun `ADMIN` dari environment one-time; hanya untuk development/preview dan harus dibersihkan setelah sukses.                     |
| Auth smoke         | `npm run auth:smoke`            | Menguji signup tertutup, origin, login, cookie, protected admin, revoke session, dan logout pada server lokal.                                 |
| Auth integration   | `npm run test:auth-integration` | Menguji role/status, session revocation, audit, dan self-lockout terhadap Neon development.                                                    |
| M5 smoke           | `npm run m5:smoke`              | Menguji submission/receipt/idempotency/tracking privat terhadap server lokal dan Neon non-production; membuat lalu membersihkan data sintetis. |
| M6 policy tests    | `npm test`                      | Mencakup state transition, filter queue, validasi tanggal/PIC, permission, submission, tracking, dan regression test lain.                     |
| Production build   | `npm run build`                 | Membuat build Next.js untuk production.                                                                                                        |
| Production start   | `npm run start`                 | Menjalankan hasil production build secara lokal.                                                                                               |

## Struktur utama

```text
.
├── .github/workflows/ci.yml   # Baseline quality gate GitHub Actions
├── docs/                      # Sumber kebenaran proyek dan aset referensi
├── drizzle/                   # SQL migration Drizzle yang reviewable
├── scripts/                   # Script operasional aman
├── src/app/                   # Next.js App Router
├── src/app/admin/             # Login, protected shell M4, dan case management M6
├── src/app/api/auth/          # Better Auth catch-all handler M4
├── src/components/admin/      # Shell/login/session M4 dan queue/detail report M6
├── src/server/auth/           # Auth instance, session, role, audit helper M4
├── src/server/db/             # Client Neon, schema, repository, health, transaction
├── src/lib/                   # Konfigurasi/domain shared yang belum terkait fitur bisnis
├── .env.example               # Nama environment variable tanpa secret
├── netlify.toml               # Build/development baseline Netlify
└── package.json               # Dependency dan command proyek
```

Dokumen utama proyek berada di [`docs/PRD.md`](docs/PRD.md), [`docs/MILESTONE_ROADMAP.md`](docs/MILESTONE_ROADMAP.md), [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md), dan [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md). Progres implementasi terbaru dicatat di [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

## Status dan batas saat ini

- M4 auth foundation aktif di `/admin/login`, `/admin`, dan `/api/auth/*`; public signup tetap nonaktif dan permission diperiksa server-side. M6 menambahkan `/admin/laporan`, `/admin/laporan/[id]`, `/api/admin/reports`, dan `/api/admin/reports/[id]` dengan guard yang sama.
- Neon project `muara-aspirasi` memiliki branch non-production `development` dan `preview`. Migration M3, M4, dan M5, serta akun ADMIN sintetis M4, telah diterapkan pada keduanya; M6 tidak mengubah schema sehingga tidak membuat migration baru. Branch Neon `main` belum disentuh.
- `src/server/db` menyediakan schema Drizzle, repository awal, internal health probe, dan batas transaksi. Tidak ada Route Handler/API bisnis yang mengeksposnya.
- Submission/tracking publik M5 dan dashboard kasus BEM M6 sudah aktif pada source. Workflow publication berbasis data, R2, notifikasi eksternal, dan production deployment masih berada di milestone berikutnya.
- Route `/aspirasi/kirim` dan `/aspirasi/lacak` memakai endpoint privat yang sudah dilindungi validasi, Turnstile, rate limit, idempotency, dan projection reporter-safe.
- Arsip Update Advokasi dan Info Mahasiswa berisi contoh tampilan berlabel jelas, bukan data BEM atau kampus yang nyata.
- Lima gambar di `docs/assets` telah disalin ke `public/images` atas persetujuan pengguna untuk UI lokal; sumbernya tidak dipindahkan atau diubah dan izin publikasi produksi tetap perlu dikonfirmasi.
- Migration auth M4 dan migration additive M5 sudah diterapkan serta diverifikasi pada Neon development/preview. M6 hanya memanfaatkan schema yang telah ada; tidak ada deployment aplikasi atau perubahan resource production dari milestone ini.

Milestone berikutnya adalah **Milestone 7 — Public Publishing, notifikasi, dan polish**. Sebelum mulai, owner perlu mengonfirmasi approver publikasi, copy kebijakan/kontak, izin aset, keputusan scheduler, dan apakah smoke test M6 berbasis data sintetis akan dijalankan pada Neon non-production.
