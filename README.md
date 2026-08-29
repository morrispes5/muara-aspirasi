# Muara Aspirasi

Muara Aspirasi adalah portal advokasi dan informasi mahasiswa milik BEM FTI Universitas Budi Luhur. Produk ini ditujukan untuk membantu mahasiswa menyampaikan aspirasi secara terstruktur dan aman, sekaligus mengikuti pembaruan advokasi BEM dalam bahasa yang jelas.

Repository ini telah menyelesaikan **Milestone 1 — UI Foundation dan Public Shell** dan **Milestone 2 — Halaman Publik Statis**. Halaman publik, arsip contoh, kebijakan privasi draft, dan etika pelaporan dapat dilihat secara lokal. Pengiriman aspirasi, pelacakan, autentikasi, database, dashboard, serta publikasi berbasis data belum diimplementasikan.

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

| Nama                  | Wajib saat ini          | Keterangan                                                                                                                                                            |
| --------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL` | Tidak untuk build lokal | Kontrak URL publik aplikasi; template menggunakan `http://localhost:3000`. Nilai ini aman diekspos ke browser dan akan dipakai saat metadata canonical dikonfigurasi. |

Nama credential untuk Neon, Better Auth, Cloudflare Turnstile, dan Cloudflare R2 belum ditambahkan. Integrasi tersebut baru boleh dikonfigurasi pada milestone pemiliknya setelah dokumen arsitektur, data, dan keamanan tersedia. Jangan pernah memasukkan secret asli ke `.env.example` atau repository.

## Command proyek

| Kebutuhan          | Command                | Catatan                                                                                                        |
| ------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Development        | `npm run dev`          | Menjalankan Next.js development server.                                                                        |
| Lint               | `npm run lint`         | Menjalankan ESLint dengan zero-warning policy.                                                                 |
| Type-check         | `npm run typecheck`    | Menjalankan TypeScript tanpa menghasilkan file build.                                                          |
| Test               | `npm test`             | Menjalankan test satu kali dengan Vitest.                                                                      |
| Test watch         | `npm run test:watch`   | Menjalankan Vitest dalam watch mode.                                                                           |
| Format             | `npm run format`       | Memformat file yang dikelola proyek dengan Prettier.                                                           |
| Format check       | `npm run format:check` | Memeriksa format tanpa mengubah file.                                                                          |
| Migration database | `npm run db:migrate`   | Placeholder aman; migration nyata baru direncanakan pada Milestone 3 dan perintah ini tidak mengubah database. |
| Production build   | `npm run build`        | Membuat build Next.js untuk production.                                                                        |
| Production start   | `npm run start`        | Menjalankan hasil production build secara lokal.                                                               |

## Struktur utama

```text
.
├── .github/workflows/ci.yml   # Baseline quality gate GitHub Actions
├── docs/                      # Sumber kebenaran proyek dan aset referensi
├── scripts/                   # Script operasional aman
├── src/app/                   # Next.js App Router
├── src/lib/                   # Konfigurasi/domain shared yang belum terkait fitur bisnis
├── .env.example               # Nama environment variable tanpa secret
├── netlify.toml               # Build/development baseline Netlify
└── package.json               # Dependency dan command proyek
```

Dokumen utama proyek berada di [`docs/PRD.md`](docs/PRD.md), [`docs/IMPLEMENTATION_ROADMAP.md`](docs/IMPLEMENTATION_ROADMAP.md), dan [`docs/CODEX_HANDOFF.md`](docs/CODEX_HANDOFF.md). Progres implementasi terbaru dicatat di [`docs/IMPLEMENTATION_STATUS.md`](docs/IMPLEMENTATION_STATUS.md).

## Status dan batas saat ini

- Tidak ada autentikasi atau registrasi pengguna.
- Tidak ada ORM, schema, migration nyata, koneksi database, atau seed.
- Tidak ada API bisnis, form aspirasi aktif, tracking privat, dashboard, atau workflow publikasi berbasis data.
- Route `/aspirasi/kirim` dan `/aspirasi/lacak` adalah preview yang secara eksplisit tidak mengumpulkan atau mengirim data.
- Arsip Update Advokasi dan Info Mahasiswa berisi contoh tampilan berlabel jelas, bukan data BEM atau kampus yang nyata.
- Lima gambar di `docs/assets` telah disalin ke `public/images` atas persetujuan pengguna untuk UI lokal; sumbernya tidak dipindahkan atau diubah dan izin publikasi produksi tetap perlu dikonfirmasi.
- Tidak ada deployment atau perubahan resource eksternal dari milestone ini.
