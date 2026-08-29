# Implementation Status — Muara Aspirasi

> Terakhir diperbarui: 29 Agustus 2026  
> Milestone aktif: Milestone 2 — Halaman Publik Statis

## Ringkasan status

Milestone 0 dan Documentation Gate **selesai secara lokal**. Milestone 1 juga selesai untuk fondasi UI publik, lalu dilanjutkan dengan **visual redesign homepage** ke arah editorial premium: palet malam navy + ivory hangat, headline serif, hero hampir satu layar, navbar glass yang menggelap saat scroll, ilustrasi mahasiswa orisinal yang bergerak lembut, serta foto/identitas kampus yang dipakai secara proporsional atas persetujuan eksplisit pengguna.

Milestone 2 menambahkan halaman publik statis yang mengikuti PRD: alur kirim dan lacak sebagai preview aman, halaman Tentang, Kebijakan Privasi draft, Etika Pelaporan, serta arsip/detail contoh untuk Update Advokasi dan Info Mahasiswa. Tidak ada fitur aspirasi fungsional, autentikasi, database, API bisnis, atau integrasi vendor yang ditambahkan.

Pada 29 Agustus 2026, PRD direvisi ke v0.2 untuk mengunci alur aspirasi: nama dan NIM wajib untuk verifikasi BEM, `CONFIDENTIAL_BEM_ONLY` menjadi default, dan `CONSENTED_LIMITED_SHARE` hanya dapat dipilih dengan consent eksplisit untuk koordinasi privat ke unit FTI. Ini adalah perubahan requirement/dokumentasi; implementasi form tetap ditunda ke Milestone 5.

Git telah diinisialisasi pada branch `main`, memiliki commit awal, dan sudah terhubung ke repository privat `https://github.com/morrispes5/muara-aspirasi`. Branch `main` sudah dipush dan working tree bersih. Atas keputusan owner, perubahan proyek dilakukan langsung ke `main`; rekomendasi branch-per-milestone pada roadmap menjadi workflow ideal yang tidak dipakai untuk repository ini. Acceptance Netlify Deploy Preview masih belum diverifikasi.

## Milestone yang selesai

| Milestone                                         | Status                                                                            | Bukti utama                                                                                                                                                  |
| ------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Milestone 0 — Project bootstrap and documentation | Selesai secara lokal; verifikasi Deploy Preview tertunda                          | Next.js App Router berjalan, dependency terkunci, lint/type-check/test/build lulus, CI dan konfigurasi Netlify tersedia.                                     |
| Documentation Gate — technical planning           | Selesai; menunggu human review atas Open Questions                                | Enam dokumen teknis dibuat, ERD/lifecycle dirancang, security/deployment checklist dan roadmap rinci tersedia.                                               |
| Milestone 1 — UI Foundation dan Public Shell      | Selesai secara lokal; visual redesign dan aset kampus terintegrasi; tanpa backend | Homepage editorial, lima placeholder, shell publik responsif, token malam/ivory, aset lokal berizin pengguna, state visual, dan QA command lulus.            |
| Milestone 2 — Halaman Publik Statis               | Selesai secara lokal; review policy/content owner masih diperlukan                | Route canonical kirim/lacak yang non-fungsional, Tentang/Privasi/Etika, arsip/detail konten contoh, metadata, robots, dan sitemap; semua quality gate lulus. |

## File penting yang dibuat atau diubah

### Fondasi aplikasi

- `package.json` dan `package-lock.json` — dependency terkunci serta command development, quality, test, migration placeholder, dan build.
- `src/app/layout.tsx` dan `src/app/globals.css` — public shell global, metadata, token malam/ivory, tipografi display serif, motion halus yang menghormati `prefers-reduced-motion`, focus state, dan baseline responsif.
- `src/app/page.tsx` — homepage cinematic: hero penuh layar dengan foto gerbang kampus, headline editorial, CTA, ilustrasi mahasiswa orisinal, poster kampanye, identitas kolaborasi, dan section dengan reveal.
- `public/images/campus-gateway.jpg`, `fti-logo.jpg`, `muara-aspirasi-poster.jpg`, `ubl-fti-lockup.png`, dan `bem-fti-mark.png` — salinan kelima aset pengguna untuk UI lokal; sumber asli tetap di `docs/assets`.
- `public/images/student-voices-editorial.png` — ilustrasi mahasiswa orisinal untuk hero; tidak mengambil logo, teks, atau artwork dari referensi eksternal.
- `src/app/tentang/page.tsx`, `src/app/aspirasi/page.tsx`, `src/app/lacak/page.tsx`, `src/app/transparansi/page.tsx`, dan `src/app/masuk/page.tsx` — placeholder konsisten tanpa submit, akun, atau akses data.
- `src/app/loading.tsx` dan `src/app/not-found.tsx` — state loading dan not-found dasar.
- `src/components/layout/*` — `Container`, header glass yang menggelap saat scroll dengan menu seluler, dan footer malam.
- `src/components/ui/*` — `ButtonLink`, `Badge`, `Card`, `SectionHeading`, input/textarea read-only visual, dan `StateCard` (empty/loading/error/success).
- `src/components/public/placeholder-page.tsx` — kerangka placeholder dan information card yang dipakai ulang.
- `src/lib/site-config.ts` dan `src/lib/site-config.test.ts` — identitas proyek, navigasi publik, serta smoke test.
- `tsconfig.json` — TypeScript strict mode dan alias `@/*` menuju `src/*`.
- `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, dan `vitest.config.ts` — baseline Next.js, Tailwind CSS, dan test; generator file aturan agen Next.js dinonaktifkan agar `npm run dev` tidak membuat artefak untracked.

### Kualitas dan operasi

- `eslint.config.mjs` — aturan Next.js Core Web Vitals, TypeScript, Prettier compatibility, dan sorting import.
- `.prettierrc.json`, `.prettierignore`, dan `.editorconfig` — format konsisten; dokumen sumber kebenaran asli dikecualikan dari rewrite otomatis.
- `.gitignore` — mengecualikan dependency, build, cache, log, credential, environment lokal, dan output deployment.
- `.env.example` — memuat URL localhost serta placeholder aman `DATABASE_URL` dan `DATABASE_URL_UNPOOLED`; tidak ada credential nyata.
- `.github/workflows/ci.yml` — baseline CI untuk format check, lint, type-check, test, dan build.
- `netlify.toml` dan `.nvmrc` — build Netlify serta Node.js 22.16.0.
- `scripts/db-migrate.mjs` — placeholder aman yang tidak mengubah database.

### Dokumentasi dan aset

- `README.md` — tujuan, local setup, environment variable, command, struktur, dan batas milestone.
- `docs/PRD.md` — sumber kebenaran produk; diperbarui ke v0.2 dengan form aspirasi empat tahap, verifikasi nama/NIM, consent identitas default BEM-only, tracking code + token, dan pemisahan update publik.
- `docs/DATA_MODEL.md`, `docs/SECURITY_PRIVACY.md`, dan `docs/MILESTONE_ROADMAP.md` — diselaraskan dengan PRD v0.2 untuk identity record wajib, dua mode consent, serta scope form di Milestone 5.
- `docs/IMPLEMENTATION_ROADMAP.md` dan `docs/CODEX_HANDOFF.md` — salinan dokumen yang diberikan dan dipertahankan sebagai konteks perencanaan.
- `docs/ASSET_MANIFEST.md` — manifest lima gambar referensi.
- `docs/assets/*` — lima gambar sumber; tetap utuh dan disalin, bukan dipindahkan, ke aset UI lokal setelah persetujuan pengguna.
- `docs/ARCHITECTURE.md` — modular-monolith boundary, target folder, access area, integrations, dan report data flow.
- `docs/DATA_MODEL.md` — entity/relationship, Mermaid ERD, lifecycle, data classification, audit, dan constraint konseptual.
- `docs/SECURITY_PRIVACY.md` — baseline privacy/security MVP serta pre-production acceptance checklist tanpa klaim implementasi.
- `docs/UX_UI_DESIGN_SYSTEM.md` — navigation, page inventory, component/tokens, states, accessibility, serta no-logo asset guardrail.
- `docs/DEPLOYMENT_RUNBOOK.md` — development/preview/production, planned environment variables, release, backup, rollback, monitoring, dan incident flow.
- `docs/MILESTONE_ROADMAP.md` — roadmap rinci dari UI foundation hingga limited launch.
- `docs/IMPLEMENTATION_STATUS.md` — catatan progres utama ini.

## Validasi terakhir

Quality gate dijalankan ulang setelah persiapan toolchain Milestone 3 pada 29 Agustus 2026. Dependency Drizzle/Neon dan placeholder environment database sudah ditambahkan; tidak ada database, credential nyata, atau integrasi eksternal yang dibuat.

| Command/pemeriksaan    | Hasil                                                                                                                                                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`               | Lulus dari kondisi bersih; 415 paket diaudit dan 0 vulnerability ditemukan.                                                                                                                                                                                                                                                                              |
| `npm run format`       | Lulus; seluruh file yang dikelola telah diformat oleh Prettier.                                                                                                                                                                                                                                                                                          |
| `npm run format:check` | Lulus; seluruh file yang dikelola sesuai format Prettier.                                                                                                                                                                                                                                                                                                |
| `npm run lint`         | Lulus tanpa warning ESLint.                                                                                                                                                                                                                                                                                                                              |
| `npm run typecheck`    | Lulus dalam TypeScript strict mode.                                                                                                                                                                                                                                                                                                                      |
| `npm test`             | Lulus; 1 test file dan 2 test berhasil.                                                                                                                                                                                                                                                                                                                  |
| `npm run build`        | Lulus; route `/`, `/_not-found`, `/aspirasi`, `/lacak`, `/masuk`, `/tentang`, dan `/transparansi` prerender statis.                                                                                                                                                                                                                                      |
| Browser QA             | `npm run dev` di `http://localhost:3000`; route `/`, `/tentang`, `/aspirasi`, `/lacak`, `/transparansi`, dan `/masuk` masing-masing merender landmark `main`. Review desktop menegaskan hero kampus, wordmark, CTA, dan ilustrasi terbaca; review mobile 390px (viewport CSS 375px) menegaskan menu membuka enam link dan tidak ada horizontal overflow. |
| Scan pola secret       | Lulus; tidak ada secret nyata, API key, atau private key. URL database di `.env.example` hanya placeholder dokumentasi dan tidak digunakan runtime.                                                                                                                                                                                                      |
| Audit aset             | Kelima aset disalin ke `public/images` tanpa mengubah sumber, lalu dipakai proporsional pada hero, poster, header, section kolaborasi, dan footer. Satu ilustrasi mahasiswa orisinal lokal juga ditambahkan; tidak ada aset eksternal.                                                                                                                   |
| Status Git             | Repository lokal berada pada `main`, terhubung ke remote GitHub privat `origin`, dan perubahan sebelumnya sudah dipush.                                                                                                                                                                                                                                  |

## Keputusan teknis dan alasan

1. **Next.js 16 App Router dengan struktur `src/`.** Roadmap mengunci Next.js, TypeScript, Tailwind, dan App Router. Struktur `src/` dipakai konsisten agar kode aplikasi terpisah dari konfigurasi repository.
2. **Server Component dan halaman statis minimal.** Placeholder tidak memerlukan client state atau API sehingga bundle tetap kecil dan scope tidak melebar ke Milestone 1.
3. **TypeScript strict dan alias `@/*`.** Strict mode menangkap kesalahan tipe lebih awal; satu alias root mencegah pola path relatif yang tidak konsisten.
4. **ESLint 9 + konfigurasi Next.js dan Prettier.** ESLint 9 dipilih karena plugin transitif di `eslint-config-next` belum mendukung ESLint 10 tanpa peer conflict. Aturan sorting import menjaga urutan import konsisten.
5. **Tailwind CSS tanpa shadcn/ui.** Tailwind adalah stack yang dikunci. shadcn/ui sengaja belum dipasang karena roadmap meminta hanya menambahkan komponen yang benar-benar digunakan.
6. **Vitest dengan satu smoke test fondasi.** Test runner dan command CI sudah terbukti bekerja tanpa membuat test fitur yang belum ada.
7. **Netlify auto-detection tanpa adapter manual.** Next.js dikenali oleh Netlify dan runtime Next disediakan otomatis, sehingga `netlify.toml` cukup menetapkan command build, output `.next`, dan versi Node.
8. **Environment minimum.** Hanya URL aplikasi lokal/publik yang dideklarasikan. Nama credential vendor ditunda sampai kontrak arsitektur dan keamanan tersedia, agar tidak menebak nama atau pola secret.
9. **Migration command berupa placeholder non-mutating.** README tetap memiliki command migration; toolchain Drizzle sudah dipasang sebagai persiapan, tetapi schema, migration, dan koneksi database belum dibuat sebelum target Neon disetujui.
10. **Aset kampus dipakai terbatas atas persetujuan pengguna.** Kelima file hanya disalin ke `public/images`, tidak dipindahkan dari `docs/assets`; foto memberi konteks hero, poster memberi jejak kampanye, dan identitas institusi hanya sebagai pendamping wordmark. Izin brand/foto untuk public launch tetap terbuka.
11. **Modular monolith.** Satu Next.js application menjadi deployment unit, sedangkan domain, data access, authorization, dan provider adapters memiliki boundary terpisah untuk menghindari coupling UI ke database/vendor.
12. **Server-first dan public/private projections terpisah.** Server Components menjadi default reads; Route Handlers dipakai untuk public submission/tracking dan integrations; seluruh action/handler sensitif tetap memvalidasi auth/permission/input server-side.
13. **Tidak ada moderator role baru.** PRD hanya menetapkan `EDITOR`, `ADVOCATE`, dan `ADMIN`; tugas triage/moderasi berada pada `ADVOCATE` dengan approval sensitif default pada `ADMIN` sampai policy final disetujui.
14. **Database preview terisolasi.** Development, preview, dan production dirancang memakai Neon branches/credentials berbeda; migration tidak dijalankan sebagai efek samping build.
15. **Notification MVP tetap in-app.** Tracking timeline dan UI feedback adalah default. Email/WhatsApp tidak diasumsikan sampai owner memutuskan scope dan privacy/provider.
16. **Wordmark tetap identitas utama.** Header tetap memprioritaskan teks “Muara Aspirasi”; lockup institusi berukuran kecil di desktop agar tetap terasa kampus tanpa menjadi halaman logo.
17. **Ilustrasi mahasiswa orisinal.** Hero memakai karya baru lokal yang menggambarkan tiga mahasiswa berbicara dan membawa perangkat belajar. Animasi gerak halus bersifat dekoratif dan dimatikan pada `prefers-reduced-motion`.
18. **Navigasi Milestone 2 mengikuti informasi publik PRD.** Shell menyediakan Beranda, Update Advokasi, Info Mahasiswa, dan Tentang, dengan Lacak Aspirasi sebagai aksi sekunder serta Kirim Aspirasi sebagai aksi utama. URL canonical untuk preview adalah `/aspirasi/kirim` dan `/aspirasi/lacak`; URL Milestone 1 tetap redirect agar tautan tidak putus.
19. **Interaksi shell dibatasi pada header.** `SiteHeader` menjadi Client Component hanya untuk state scroll dan menu mobile berlabel; halaman publik serta konten lainnya tetap Server Component.
20. **Data contoh diberi label eksplisit.** Semua angka di homepage dan halaman Transparansi disebut “contoh tampilan” atau “bukan data nyata”; tidak ada klaim metrik, laporan, atau dampak operasional.
21. **Visual redesign cinematic, bukan template SaaS.** Hero penuh layar memakai foto gerbang kampus, headline serif, navbar kaca mengambang, CTA kapsul, ilustrasi mahasiswa, dan motion halus dengan fallback `prefers-reduced-motion`. Bukan salinan Velorah.
22. **Penggunaan aset tercatat dan reversible.** `ASSET_MANIFEST.md` sekarang mencatat setiap pemetaan sumber ke salinan `public/images`; file sumber tetap tidak berubah.
23. **Velorah/21st.dev hanya art direction.** Tidak ada salinan layout, copy, aset, atau identitas Velorah; komposisi, bahasa, dan brand tetap milik Muara Aspirasi.
24. **Navbar fixed dengan state scroll.** Header merender di klien hanya untuk menggelapkan latar saat scroll dan membuka menu seluler; halaman lain tetap Server Component.
25. **Alur identitas aspirasi dikunci di PRD v0.2.** “Anonim sepenuhnya” tidak dipakai karena bertentangan dengan nama/NIM wajib. Defaultnya adalah `CONFIDENTIAL_BEM_ONLY`; pilihan `CONSENTED_LIMITED_SHARE` harus menyebut tujuan koordinasi dan tidak pernah mengizinkan publikasi identitas.

## Pekerjaan yang sengaja belum dikerjakan

- Autentikasi Better Auth dan akun BEM.
- Project Neon Muara Aspirasi, schema Drizzle, migration nyata, seed, dan koneksi database.
- Cloudflare Turnstile, R2, upload, dan pengelolaan media.
- API bisnis, Server Actions bisnis, form kirim/lacak aspirasi, token tracking, dan workflow status.
- Dashboard admin, role/permission, audit log, dan publikasi konten.
- Konten profil/kontak resmi untuk public launch, serta privacy/ethics final yang telah direview owner.
- Fitur pengiriman dan pelacakan aspirasi yang fungsional, termasuk validasi, status, token, dan feedback transaksi.
- Instalasi shadcn/ui, pemeriksaan master asset resmi, dan persetujuan publikasi/brand sebelum deploy.
- Netlify Deploy Preview atau resource production lainnya.

## Risiko, pertanyaan terbuka, dan blocker

### Open Questions yang membutuhkan keputusan manusia

- Domain resmi, owner/recovery access untuk seluruh akun vendor, dan siapa reviewer BEM.
- Izin tertulis, master logo resmi, brand guideline, serta hak penggunaan foto.
- Retention report/contact/evidence/audit dan deletion/correction request channel.
- Permission approval final, terutama bantuan `EDITOR` pada report dan hak publish `ADVOCATE`.
- MFA/recovery flow admin dan bootstrap akun pertama.
- Serious-risk escalation contact/SOP serta turnaround expectation.
- File MIME/size allowlist, malware scanning, dan rate-limit store/provider.
- Neon region/plan/restore window, RPO/RTO, monitoring/error provider.
- Apakah external notification diperlukan; default saat ini tidak ada.

Setiap dokumen teknis mencatat Proposed Default agar pekerjaan dapat direncanakan, tetapi default tersebut bukan policy final sampai owner menyetujuinya.

### Risiko lain

- Repository GitHub privat sudah terhubung dan `main` sudah dipush; workflow CI dapat berjalan setelah perubahan berikutnya, sedangkan Netlify Deploy Preview belum dikonfigurasi/diverifikasi.
- Pengguna telah menyetujui pemakaian lokal kelima aset. Namun izin tertulis, versi master resmi, dan hak publikasi untuk logo/foto masih perlu dikonfirmasi sebelum deploy publik, sesuai open decision di PRD.
- ESLint 9.39.5 sudah ditandai deprecated oleh npm, tetapi saat ini merupakan jalur kompatibel tanpa peer conflict untuk plugin transitif Next.js. Upgrade ke ESLint 10 perlu dilakukan setelah plugin Next.js terkait mendukungnya.
- `npm ci` di Windows sempat memberi warning cleanup `EPERM` pada optional WASM package di `node_modules`. Instalasi tetap exit 0, audit tetap 0 vulnerability, dan seluruh quality gate lulus; `node_modules` juga tidak dilacak source control.
- `NEXT_PUBLIC_APP_URL` belum dipakai runtime selain sebagai kontrak environment awal; canonical metadata dapat disambungkan pada milestone desain/deployment setelah domain resmi diputuskan.
- Browser lokal memetakan permintaan 390px ke viewport CSS 375px. Tidak ada overflow dan menu terbuka pada pengujian tersebut, tetapi perangkat fisik/zoom 200% tetap perlu diperiksa sebelum public launch.

## Rekomendasi milestone berikutnya

1. Owner/BEM mereview Open Questions pada enam dokumen teknis, terutama versi master/izin publikasi aset dan prosedur konten; jangan deploy aset lokal sebelum keputusan itu final.
2. Mulai **Milestone 2 — Content & IA**: setujui content model dan siapkan halaman update advokasi/informasi mahasiswa yang tetap statis atau CMS-ready tanpa membuka data laporan.
3. Sebelum public launch, owner perlu menyetujui izin aset, contact/SOP darurat, privacy notice, dan etika pelaporan; aset yang sudah ada di UI lokal harus diganti dengan master resmi bila tersedia.
4. Jangan menambahkan database, auth, API bisnis, atau form fungsional sebelum Milestone 3 dan keputusan security/data yang relevan disetujui.
5. GitHub sudah terhubung pada `main`; langkah eksternal berikutnya adalah konfigurasi Netlify hanya jika owner menginstruksikannya.

## Pembaruan Milestone 2 — Halaman Publik Statis

### UI dan halaman yang selesai

- `/tentang` kini menjelaskan tujuan, prinsip, batas layanan, proses, dan pengingat bahwa portal bukan layanan darurat.
- `/aspirasi/kirim` dan `/aspirasi/lacak` adalah preview aman dari alur PRD; keduanya tidak memiliki field aktif, submit, request, penyimpanan data, atau klaim keberhasilan.
- `/update` dan `/info-mahasiswa` menyediakan archive contoh; `/update/[slug]` dan `/info-mahasiswa/[slug]` menyediakan detail contoh yang diprerender. Semua konten diberi label contoh tampilan.
- `/kebijakan-privasi` dan `/etika-pelaporan` tersedia sebagai dokumen draft statis, dengan batasan yang jelas sebelum layanan dibuka.
- `robots.ts` dan `sitemap.ts` menyiapkan discoverability dasar untuk route publik tanpa memasukkan area BEM.

### Komponen dan keputusan teknis

- `PublicPageIntro` menyediakan satu `h1` dan landmark `main` yang konsisten bagi halaman publik statis.
- `ArticleCard` dan `src/lib/public-content.ts` menyatukan model konten contoh agar archive/detail tetap sinkron tanpa CMS atau database.
- Navigasi memakai URL canonical PRD (`/aspirasi/kirim` dan `/aspirasi/lacak`); route lama `/aspirasi` dan `/lacak` melakukan redirect server-side agar tautan Milestone 1 tidak putus.
- Tidak ada aset baru yang dipakai pada Milestone 2. Aset kampus yang telah disetujui pengguna tetap hanya muncul pada homepage/shell Milestone 1.

### Sengaja ditunda

- Provisioning database, schema/migration, seed, dan koneksi Neon tetap khusus Milestone 3; toolchain Drizzle sudah disiapkan sebagai prasyarat.
- Auth BEM dan area admin tetap khusus Milestone 4.
- Form pengiriman, Turnstile, upload bukti, submit, kode/token pelacakan, serta timeline privat tetap khusus Milestone 5.
- Konten nyata, filter, pagination, publication workflow, dan sumber/credit editorial terverifikasi tetap khusus Milestone 7 setelah ada approval BEM.

### Risiko dan blocker

- Privacy notice, etika pelaporan, contact resmi, dan SOP eskalasi masih draft; halaman statis tidak boleh dianggap siap public launch sebelum owner menyetujuinya.
- Contoh update/informasi bukan konten BEM terverifikasi dan tidak boleh diganti dengan data nyata tanpa proses editorial.
- Izin publikasi produksi untuk foto/logo kampus masih perlu konfirmasi tertulis walaupun pengguna menyetujui pemakaian lokal.
- Project Neon baru belum dibuat. Neon MCP hanya melihat project `morrizstore`, yang sengaja tidak disentuh; database Muara Aspirasi wajib memakai project/branch terpisah.

### Validasi Milestone 2

| Pemeriksaan                                 | Hasil                                                                                                                                                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run format` dan `npm run format:check` | Lulus; seluruh file terkelola sesuai Prettier.                                                                                                                                                                           |
| `npm run lint`                              | Lulus tanpa warning ESLint.                                                                                                                                                                                              |
| `npm run typecheck`                         | Lulus pada TypeScript strict mode.                                                                                                                                                                                       |
| `npm test`                                  | Lulus; 1 test file dan 2 test berhasil.                                                                                                                                                                                  |
| `npm run build`                             | Lulus; semua route statis M2, detail update/info SSG, `robots.txt`, dan `sitemap.xml` berhasil diprerender.                                                                                                              |
| Browser QA desktop 1280px                   | `/update` memiliki satu `h1`, satu `main`, tautan canonical lengkap, dan tidak ada horizontal overflow.                                                                                                                  |
| Browser QA mobile 390px                     | Preview kirim/lacak, Tentang, Privasi, Etika, dan dua route detail memiliki satu `h1`, satu `main`, dan tidak ada horizontal overflow. Menu mobile membuka/menutup dengan `aria-expanded`; console tidak memiliki error. |

### Rekomendasi setelah Milestone 2

Jalankan Milestone 3 saja: putuskan owner/region/plan Neon, retention, dan keputusan data yang masih terbuka, lalu bangun schema Drizzle serta migration pada database development/preview yang kosong. Jangan membuka form atau authentication sebelum foundation tersebut lulus validasi.

## Persiapan Milestone 3 — Toolchain dan handoff

- Neon MCP dan skill `neon-postgres` tersedia serta berhasil dipakai untuk pemeriksaan baca-saja organisasi/project.
- Organisasi yang terlihat adalah `morrizprogammer`; satu-satunya project yang terlihat adalah `morrizstore` (`rapid-star-49652334`). Tidak ada operasi create/update/SQL dijalankan terhadap project tersebut.
- Dependency lokal yang sudah disiapkan: `drizzle-orm@1.0.0-rc.4`, `drizzle-kit@1.0.0-rc.4`, `@neondatabase/serverless@1.1.0`, dan `dotenv@17.4.2`. Pasangan rc dipilih setelah versi stable Drizzle Kit memunculkan advisory esbuild transitive; audit setelah penggantian menjadi 0 vulnerability.
- `.env.example` hanya menambahkan nama dan placeholder aman `DATABASE_URL` serta `DATABASE_URL_UNPOOLED`; connection string nyata tetap harus berada di `.env.local` yang di-ignore.
- Tidak diperlukan akun Drizzle terpisah. Drizzle ORM/Kit adalah dependency npm; akun/resource yang diperlukan untuk database adalah Neon.
- Validasi persiapan selesai: `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm audit --omit=optional`, dan guard `npm run db:migrate` berhasil. Guard migration tetap non-mutating dan hanya mencetak blocker yang menunggu project/branch Neon serta keputusan data.

### Gate manual sebelum implementasi schema

1. Owner membuat project Neon baru khusus Muara Aspirasi, bukan branch di `morrizstore`.
2. Owner memilih organisasi, region, plan, nama database, serta branch development dan preview.
3. Owner mengirim project/branch identifier non-secret; connection string disimpan lokal tanpa ditempel di chat atau commit.
4. Owner mengonfirmasi identity mode, status/urgency transition, retention, evidence limit/MIME/bytes, serious-risk SOP, dan permission identity/evidence sesuai `DATA_MODEL.md` dan `SECURITY_PRIVACY.md`.

Setelah gate ini dipenuhi, Milestone 3 dapat dilanjutkan dengan schema, migration review, repository, health check, dan test hanya terhadap branch development/preview. Auth, form submission, upload, dan API bisnis tetap berada pada milestone berikutnya.
