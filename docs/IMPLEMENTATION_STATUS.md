# Implementation Status — Muara Aspirasi

> Terakhir diperbarui: 19 September 2026
> Milestone aktif: **M9 source workflow dan migration Neon preview selesai; UAT dua hari dan production belum dijalankan.** Neon main/production tidak disentuh.

## Ringkasan status

Milestone 0, Documentation Gate, Milestone 1 (UI foundation), Milestone 2 (halaman publik statis), Milestone 3 (database/ORM), **Milestone 4 (BEM auth/roles/admin foundation)**, **Milestone 5 (kirim dan lacak aspirasi)**, dan **Milestone 6 (moderasi dan admin case management)** selesai pada source. Acceptance M4/M5 lulus pada aplikasi lokal serta Neon development/preview dengan identitas sintetis. M6 memakai schema report yang sudah tersedia dari M3, menambahkan runtime queue/detail/workflow tanpa migration baru; smoke mutasi Neon M6 masih membutuhkan izin eksplisit owner.

M3 menyediakan fondasi data terisolasi dan M4 menambahkan authentication BEM-only, role enforcement, protected admin shell, access management, serta audit. M5 menambahkan form aspirasi bertahap, API POST, validasi ketat, honeypot, Turnstile server verification, idempotency, rate limit database, receipt credential, dan tracking timeline reporter-safe. M6 menambahkan dashboard kasus BEM dengan filter, detail privacy-aware, status workflow, assignment, internal note, reporter-visible message, archive/reopen, concurrency guard, dan audit. M7 menambahkan publication service untuk Update Advokasi dan Info Mahasiswa, workflow approval, archive/detail/filter/pagination publik berbasis projection database, serta feedback UI. Wave 10 menambahkan evidence upload intent ke private R2, validasi ulang binary, authorized signed read, admin user management, MFA enforcement guard, production bootstrap terpisah, dan browser/CI gates. M9 menambahkan kandidat retensi 12 bulan, hold, pencatatan mailbox, verifikasi/approval ADMIN MFA, purge PII/evidence yang diaudit, gate CSP enforcing, dan HSTS production 30 hari. Migration M8/M9 sudah diterapkan ke Neon `preview`; database production, aktivasi evidence R2, scheduler provider, notifikasi eksternal, UAT, dan production belum diaktifkan.

Repository GitHub privat tetap berada di `main` sesuai keputusan owner. PR #2 (`feat: harden milestone 8 release readiness`) merged pada 2 September 2026 sebagai commit `9b93057`. PR #4 (`feat: M9 retention workflow and launch gates`) terbuka dari branch `codex/m9-limited-uat` pada commit `3e768e5`; quality, secret scan, browser smoke, dan Netlify Deploy Preview lulus. Netlify production masih menunjuk deploy lama saat verifikasi 19 September 2026, sehingga preview atau merge tidak diklaim sebagai production deploy. Project Neon `morrizstore` tidak disentuh.

## Checkpoint deployment M9 — 19 September 2026

- Netlify Deploy Preview PR #4 tersedia dan check provider berstatus sukses, tetapi URL dialihkan ke Team Protection. QA isi, header aplikasi, dan journey admin masih membutuhkan login akun Netlify yang diundang.
- Branch Neon `preview` (`br-jolly-butterfly-avdafzzv`) diverifikasi terpisah dari `main`. Sebelum migration, branch restore point copy-on-write `backup-preview-pre-m9-20260919` (`br-billowing-dawn-av66ywj8`) dibuat tanpa compute.
- `DATABASE_URL_UNPOOLED` lokal ditemukan salah menunjuk hostname `-pooler`; migration dijalankan dengan direct endpoint yang diturunkan hanya di proses. `scripts/db-migrate.mjs` kini menolak URL kosong, invalid, non-PostgreSQL, dan hostname `-pooler` agar kesalahan ini tidak berulang.
- Migration additive M8 dan M9 berhasil diterapkan hanya ke Neon `preview`. Record `drizzle.__drizzle_migrations` naik dari 3 menjadi 5; tabel evidence intent, two-factor, privacy request, retention hold, dan retention queue tersedia; tidak ada report terminal dengan `closed_at` kosong setelah backfill.
- Gate lokal terbaru: format, lint, typecheck, `db:check`, 252 test lulus dengan 3 integration skip, serta production build webpack lulus. CI PR #4 tetap menjadi bukti browser smoke clean-checkout yang selesai penuh.
- UAT belum dimulai. Netlify preview masih memerlukan mailbox privasi resmi, secret runner retensi, verifikasi environment UAT, akses Team Protection, akun BEM sintetis dengan MFA, dan pelaksanaan checklist dua hari.

## Milestone selesai

| Milestone                              | Status              | Bukti utama                                                                                                                                                                            |
| -------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 — Bootstrap dan documentation        | Selesai             | Next.js, quality tooling, CI, README, dan docs proyek tersedia.                                                                                                                        |
| 1 — UI Foundation dan Public Shell     | Selesai             | Homepage/editorial shell responsif, asset usage terkontrol, tanpa backend.                                                                                                             |
| 2 — Halaman Publik Statis              | Selesai             | Halaman informasi/placeholder non-mutating dan content contoh berlabel.                                                                                                                |
| 3 — Database dan ORM Foundation        | Selesai             | Schema Drizzle, migration/seed, Neon development + preview, data access awal, dan test M3.                                                                                             |
| 4 — BEM Auth, Roles, Admin Foundation  | Selesai             | Better Auth, migration development/preview, bootstrap sintetis, BEM-only login, permission server-side, access management, audit, dan runtime/browser acceptance lulus.                |
| 5 — Kirim dan Lacak Aspirasi           | Selesai             | Migration additive diterapkan pada Neon development/preview; smoke development memvalidasi receipt, idempotency, hash, event/audit, serta tracking privat.                             |
| 6 — Moderasi dan Admin Case Management | Selesai pada source | Queue/filter/pagination, detail terpisah, role guard, status transition, assignment history, internal note, reporter message, archive/reopen, optimistic conflict, dan audit tersedia. |

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
- Schema M3 telah menyediakan seluruh persistence yang diperlukan M6: report, identity, evidence metadata, status event, internal note, assignment, dan audit. M6 menambahkan use case/query runtime tanpa migration baru; tidak ada public projection atau authorization bypass.

## Implementasi Milestone 4

### Authentication dan authorization

- Better Auth `1.7.2` dipasang dengan Drizzle adapter `1.7.2` dan catch-all handler pada `/api/auth/*`.
- Public signup dinonaktifkan; login hanya untuk akun BEM pada `bem_users` yang berstatus `ACTIVE`.
- Tabel persistence auth ditambahkan melalui migration lokal: `auth_sessions`, `auth_accounts`, dan `auth_verifications`; `bem_users` mendapat `email_verified` dan `image` sesuai mapping Better Auth.
- Role `EDITOR`, `ADVOCATE`, dan `ADMIN` beserta permission matrix eksplisit berada di `src/server/auth/roles.ts`.
- `src/server/auth/session.ts` adalah pemeriksaan server-side untuk user aktif dan permission. `src/proxy.ts` hanya redirect optimistis dan tidak menjadi authorization boundary.
- `/admin/login` menyediakan form login; `/admin` menyediakan shell dengan identity, role, logout, revoke-other-sessions, serta link antrean sesuai permission. M6 menambahkan `/admin/laporan` dan detail kasus privat dengan guard server-side.
- Event login failure, logout, dan session revoke dicatat melalui allowlist audit tanpa password, session token, atau request body.

### Bootstrap dan migration

- `scripts/auth-bootstrap.mjs` menyediakan one-time bootstrap akun `ADMIN` dari environment; script menolak environment selain `development`/`preview` dan tidak memiliki credential hardcoded.
- Migration M4 tersedia di `drizzle/20260830054722_wise_dexter_bennett/migration.sql`, lulus `db:check`, dan sudah diterapkan/idempotent pada Neon `development` serta `preview`.
- Akun `ADMIN` sintetis dibuat pada kedua branch non-production. Plaintext password tidak masuk database, log, dokumentasi, atau repository.
- `src/server/auth/user-management.ts` membatasi perubahan role/status kepada ADMIN aktif, mencabut seluruh sesi target, menulis audit, serta mencegah self-lockout dan penghapusan last active ADMIN.

## Implementasi Milestone 5

### Submission dan tracking privat

- `/aspirasi/kirim` menggantikan preview dengan form empat tahap: identity minimal, detail aspirasi, privacy/ethics, review, Turnstile, dan receipt kode + token rahasia satu kali. Upload evidence sengaja belum tersedia karena R2 private dan aturan file belum disetujui.
- `POST /api/aspirasi` memvalidasi allowlist field, panjang/nilai enum, origin browser, honeypot, Idempotency-Key UUID, bucket rate limit, dan Siteverify Turnstile sebelum mutation.
- Satu transaksi membuat report `RECEIVED`, identity restricted, status event reporter-visible, serta audit `PUBLIC_REPORT_SUBMITTED`. Token 256-bit hanya masuk response receipt; database menyimpan hash `scrypt` salted.
- `POST /api/aspirasi/lacak` menerima code + token pada body, selalu memberi kegagalan generik, memakai `no-store`/`no-referrer`, dan hanya mengembalikan status/timeline reporter-safe tanpa identity, title, chronology, note internal, atau route.
- `public_rate_limit_buckets` menggunakan HMAC signal dan unique bucket atomik di Neon untuk submission IP, tracking IP, tracking code, serta circuit breaker global. Raw IP, raw tracking token, dan request body tidak disimpan.
- `scripts/m5-smoke.mjs` memverifikasi receipt, duplicate idempotency, kegagalan tracking generik, projection privacy, hash persistence, initial event, dan audit; semua artefak report sintetis dibersihkan saat test selesai.

### Provider dan environment

- Local/preview memakai dummy key Cloudflare Turnstile resmi agar Siteverify dan automated testing dapat dilakukan tanpa production credential. Respons dummy `example.com` hanya diterima pada `DATABASE_ENVIRONMENT=development`/`preview` dengan dummy secret persis; selain itu hostname request harus sama.
- `TURNSTILE_SECRET_KEY` tetap server-only. `PUBLIC_ABUSE_SIGNAL_SECRET` adalah salt HMAC terpisah dari Better Auth dan harus berbeda pada setiap environment.
- Widget/key Turnstile produksi, domain resmi, monitoring production, R2 bucket, dan upload evidence tidak termasuk acceptance M5 saat ini.

## Implementasi Milestone 6

### Case management BEM

- `/admin/laporan` adalah queue privat dengan pagination dan filter status, kategori, urgensi, tanggal diterima, assignment, PIC spesifik, arsip, dan pencarian judul/lokasi/kode.
- `/admin/laporan/[id]` memisahkan original report, restricted identity, metadata evidence, internal notes, reporter-visible status/message, assignment history, lifecycle, dan audit projection.
- `GET /api/admin/reports` hanya membutuhkan `VIEW_REPORTS`; `GET/POST /api/admin/reports/[id]` mengulang session/permission check pada server dan menggunakan response `no-store`, `no-referrer`, serta `X-Robots-Tag: noindex`.
- `PROCESS_REPORT` mengizinkan status, classification, assignment, internal note, dan reporter-visible message untuk Advocate/Admin. `ARCHIVE_REPORT` dan `REOPEN_REPORT` hanya Admin.
- Status transition dijaga server-side mengikuti state machine PRD. `NEEDS_CLARIFICATION` memerlukan pesan reporter-visible; `CANNOT_PROCESS`, archive, dan reopen memerlukan reason code.
- Semua mutation memakai transaksi dan optimistic concurrency berbasis `updatedAt`; versi stale menghasilkan `CONFLICT` dan tidak menimpa perubahan actor lain.
- Internal note memakai soft-delete dengan deletion reason. Body note yang sudah dihapus dan message dari event internal tidak dikirim ke DTO client.
- Audit case management memakai metadata allowlist: view queue/detail, status, classification, assignment, note, reporter message, archive, dan reopen. Isi report, identity, note, object key, signed URL, dan secret tidak disalin ke audit.
- Evidence pada M6 hanya metadata restricted. Upload/download binary, R2, quarantine, signed URL, dan malware scanning tetap ditunda.

### Batas database dan acceptance

- Tidak ada migration M6 karena `aspiration_reports`, `reporter_identities`, `report_evidence`, `report_status_events`, `internal_notes`, `report_assignments`, dan `audit_events` sudah tersedia sejak M3.
- Regression test M6 mencakup transition valid/invalid, default/filter queue, UUID, tanggal, pagination, search boundary, serta role matrix.
- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:check`, dan `npm run build` lulus pada working tree ini.
- Smoke mutation end-to-end terhadap Neon non-production belum dijalankan pada sesi ini karena memerlukan explicit approval owner untuk membuat dan membersihkan report sintetis. Neon main/production tetap tidak disentuh.

## Implementasi Milestone 7

### Publication workflow

- `src/server/content/publication.ts` menjadi boundary domain untuk validasi, slug uniqueness, status transition, optimistic concurrency, audit, admin list/detail, dan public projection.
- Workflow yang aktif adalah `DRAFT -> IN_REVIEW -> PUBLISHED -> ARCHIVED` untuk kedua jenis konten. Editor dapat mengelola Info Mahasiswa; Advocate dapat mengelola kedua jenis sesuai permission; hanya Admin dengan `APPROVE_PUBLICATION` yang dapat publish/archive.
- Student info mendukung kategori PRD dan pin. Scheduler tidak ditawarkan karena belum tersedia; direct publish setelah approval adalah satu-satunya jalur.
- `save_draft` pada konten yang sedang review/terbit kembali ke `DRAFT`, sehingga perubahan baru selalu melewati review lagi. Setiap submit, edit, publish, dan archive menulis audit metadata tanpa body/PII.

### Public projection dan privacy

- `/update` dan `/info-mahasiswa` membaca hanya baris `PUBLISHED`, dengan filter kategori, pagination, empty state, dan error state.
- Detail publik mengambil slug yang `PUBLISHED` saja dan merender body sebagai teks biasa; query publik tidak mengakses join `advocacy_update_reports`, identity, evidence, note, assignment, atau audit privat.
- R2 editorial, cover upload, external email/WhatsApp, dan scheduled publish sengaja ditunda ke milestone terpisah sesuai keputusan owner.

### Admin surface

- `/admin/update` dan `/admin/info-mahasiswa` memakai protected shell dan guard permission server-side, menyediakan editor draf, submit review, approval publish, archive confirmation, source attribution, dan pin.
- `POST/PATCH /api/admin/content/[kind]` memvalidasi origin, session, role, input, status transition, slug conflict, dan `expectedUpdatedAt`; response admin selalu no-store/noindex.

### Validasi Milestone 7

- Unit regression publication mencakup lifecycle tanpa scheduler, enum parsing, slug/category normalization, URL protocol, pin type, plain-text body, dan status guard.
- Quality gates source: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:check`, dan `npm run build` harus lulus sebelum deploy preview.
- Tidak ada migration baru atau mutation Neon yang dijalankan untuk M7; schema content dari M3 sudah mencukupi. Neon `main`/production tetap tidak disentuh.

### File Milestone 7

- `src/server/content/publication.ts` dan `src/server/content/publication.test.ts` — service, projection, workflow, audit boundary, dan regression tests.
- `src/app/api/admin/content/` — route handler list/create/detail/mutation dengan session, permission, CSRF-origin, validation, dan safe errors.
- `src/components/admin/content-manager.tsx` dan `content-manager-page.tsx` — admin editor dan server page guard.
- `src/app/admin/(protected)/update/page.tsx`, `info-mahasiswa/page.tsx`, shell/navigation changes — admin publication surface.
- `src/app/update/`, `src/app/info-mahasiswa/`, `src/components/public/content-pagination.tsx`, dan `src/lib/public-content.ts` — database-backed public archive/detail projection.

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
- `src/server/aspirations/*`, `src/app/api/aspirasi/*`, `src/components/aspirations/*`, dan route publik aspirasi — use case M5, crypto, validation, Turnstile, rate limit, receipt, dan tracking UI/API.
- `drizzle/20260830113406_lowly_spirit/` dan `scripts/m5-smoke.mjs` — migration additive M5 serta acceptance script yang membuat/membersihkan data sintetis.
- `src/server/aspirations/case-management.ts`, `src/server/aspirations/case-management.test.ts`, dan `src/server/aspirations/admin-response.ts` — use case, policy test, DTO projection, optimistic concurrency, dan safe response M6.
- `src/app/api/admin/reports/`, `src/app/admin/(protected)/laporan/`, serta `src/components/admin/report-queue.tsx` dan `report-detail.tsx` — queue/detail/mutation API dan UI case management M6.
- `package.json`, `package-lock.json`, `.env.example`, `.prettierignore`, dan `README.md` — command, dependency driver WebSocket, template environment aman, dan dokumentasi operasional.
- `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md`, `docs/SECURITY_PRIVACY.md`, `docs/DEPLOYMENT_RUNBOOK.md`, `docs/MILESTONE_ROADMAP.md`, `docs/UX_UI_DESIGN_SYSTEM.md`, `README.md`, dan dokumen status ini — status M6 serta batas M7 diselaraskan.

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

## Validasi Milestone 5 (selesai non-production)

| Pemeriksaan                                   | Hasil                                                                                                                                                                    |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Schema generate/check                         | Lulus; migration additive M5 direview tanpa perubahan destructive.                                                                                                       |
| Validation/crypto/Turnstile unit tests        | Lulus: unexpected/oversized input, consent, hash-only, wrong token, hostname, expiry/duplicate response, dan missing secret fail-closed.                                 |
| Lint dan TypeScript                           | Lulus pada source M5.                                                                                                                                                    |
| Full test suite                               | Lulus: 29 test, 3 integration skip yang memang bergantung environment.                                                                                                   |
| Production build                              | Lulus setelah font dependency dapat diakses.                                                                                                                             |
| Browser UI local                              | Lulus desktop: form empat tahap, data warning, privacy copy, dan tracking form terlihat.                                                                                 |
| Migration + M5 smoke Neon development/preview | Lulus: migration M5 ada di kedua environment; smoke development lulus untuk receipt, idempotency, hash/event/audit, dan tracking privat. Main/production tidak disentuh. |

## Implementasi Milestone 8 Wave 1

Wave ini hanya mencakup hardening yang dimiliki kode dan dapat diuji tanpa resource production. Tidak ada migration dibuat/diterapkan, tidak ada resource Neon `main`/production disentuh, tidak ada secret production ditambahkan, dan tidak ada aksi merge/deploy Netlify atau GitHub dilakukan.

### Yang berubah

- `src/lib/security-headers.ts` (baru) menjadi satu sumber kebenaran untuk header keamanan, dipasang untuk `source: "/:path*"` melalui `next.config.ts`. Header enforcing: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal, `Cross-Origin-Opener-Policy: same-origin`, dan `X-DNS-Prefetch-Control: off`.
- `Content-Security-Policy-Report-Only` mengikuti instruksi "CSP bertahap" pada `SECURITY_PRIVACY.md` bagian 10, sehingga policy yang salah tidak dapat mematikan form publik atau Turnstile sebelum QA browser. Satu-satunya origin pihak ketiga adalah `https://challenges.cloudflare.com`; font Google di-self-host oleh `next/font`.
- `src/server/security/origin.ts` (baru) menggantikan empat salinan identik fungsi `sameOrigin` pada route handler. Perilaku sengaja dibuat identik dengan salinan yang diganti sehingga konsolidasi ini bukan perubahan perilaku.
- `POST /api/aspirasi/lacak` sekarang memiliki origin guard yang sebelumnya tidak ada, padahal endpoint ini mengembalikan timeline privat pelapor. Penolakan memakai response generic yang sama dengan kode/token salah agar tidak menjadi jalur enumeration.

### Yang sengaja tidak dikerjakan

- HSTS tidak dipasang dari aplikasi: `max-age` yang salah di-cache browser dan tidak dapat dibatalkan dari sisi kode. Ini keputusan owner/deploy.
- CSP tidak dipromosikan ke enforcing tanpa QA browser pada Deploy Preview.
- `'unsafe-inline'` pada `script-src` masih diperlukan karena Next.js menyuntikkan inline hydration script; menghapusnya membutuhkan nonce per-request melalui proxy/middleware dan merupakan scope tersendiri.
- Scheduler, notifikasi eksternal, R2, MFA/recovery, retention, dan kebijakan environment production tidak disentuh sama sekali.

### Validasi Milestone 8 Wave 1

| Pemeriksaan            | Hasil                                                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | Lulus.                                                                                                                |
| `npm run lint`         | Lulus (`--max-warnings=0`).                                                                                           |
| `npm run typecheck`    | Lulus.                                                                                                                |
| `npm test`             | Lulus: 58 test, 3 integration skip yang memang bergantung environment. Sebelum wave ini 45 test.                      |
| `npm run db:check`     | Lulus; tidak ada migration dibuat atau diterapkan.                                                                    |
| `npm run build`        | Lulus. Header terverifikasi ada pada `.next/routes-manifest.json` untuk `/:path*`, dan CSP build tanpa `unsafe-eval`. |

Regression test yang ditambahkan: `src/lib/security-headers.test.ts` mengunci directive CSP yang membatasi injeksi, membuktikan Turnstile adalah satu-satunya origin off-origin, memastikan `'unsafe-eval'` tidak pernah masuk policy production, dan menegaskan CSP masih report-only serta HSTS tidak dipasang dari aplikasi. `src/server/security/origin.test.ts` menutup kasus negatif akses: origin lintas domain, subdomain mirip, suffix domain yang menyerupai, skema `http` versus `https`, origin `null`, dan perbedaan port.

## Implementasi Milestone 8 Wave 2

Wave ini hanya menambah regression coverage untuk loop publikasi BEM-ke-mahasiswa. **Tidak ada file production yang diubah**: test tidak menemukan defect yang memerlukan perbaikan, dan tidak ada perubahan dibuat hanya agar wave ini terlihat produktif. Tidak ada migration, secret, deploy, atau merge.

### Teknik: menguji SQL, bukan stub

`src/server/content/public-query-isolation.test.ts` merender `where` clause yang benar-benar dibangun melalui `PgDialect.sqlToQuery()`, lalu memeriksa SQL dan bound parameter-nya. Ini penting karena database palsu hanya dapat membuktikan database palsu itu sendiri: ia mengembalikan baris apa pun yang diberikan test. Dengan merender query aslinya, test membuktikan query-nya.

Yang sekarang terkunci pada setiap public read path (`listPublishedContent` dan `getPublishedContent`, untuk advocacy dan student info):

- tabel yang disentuh persis `advocacy_updates` + `categories` atau `student_info_posts`, dan **bukan** `aspiration_reports`, `reporter_identities`, `report_evidence`, `report_status_events`, `internal_notes`, `report_assignments`, `audit_events`, `advocacy_update_reports`, `bem_users`, `auth_sessions`, atau `auth_accounts`;
- `publication_status` dibandingkan dengan parameter terikat bernilai `"PUBLISHED"`, dan `published_at is not null` ada, **pada query baris maupun query count** — filter yang hanya dipasang pada salah satunya adalah bug yang di-assert di sini;
- tidak ada satu pun status non-publik (`DRAFT`, `IN_REVIEW`, `SCHEDULED`, `ARCHIVED`) yang pernah terikat sebagai parameter pada path publik;
- filter kategori publik tetap sebagai bound parameter, bukan interpolasi string;
- kategori student info yang tidak dikenal ditolak tanpa membangun query sama sekali.

### Coverage yang ditambahkan

`src/server/content/publication-flow.test.ts` (28 test) menutup optimistic concurrency dengan expectation basi, `UPDATE ... WHERE updated_at = expected` yang tidak mengenai baris, `NOT_FOUND`, `SLUG_TAKEN`, enam pasangan transition terlarang yang harus gagal tanpa menerbitkan write, penurunan status kembali ke `DRAFT` saat konten live diedit (diuji terpisah untuk advocacy dan student info karena keduanya cabang independen), stamping `reviewerUserId`/`publishedByUserId` saat publish, penolakan markup pada body, penolakan skema URL berbahaya, serta clamping pagination publik.

`src/server/content/content-route.test.ts` (19 test) menutup batas role pada route handler: origin lintas domain ditolak sebelum autentikasi dijalankan, `EDITOR` dan `ADVOCATE` tidak dapat publish/archive, non-approver tidak dapat mengedit konten yang sudah terbit, `EDITOR` tidak dapat menautkan `reportIds` (termasuk array kosong), stale `expectedUpdatedAt` menjadi 409, kegagalan tak terduga menjadi 500 generic tanpa membocorkan pesan asli, dan response admin membawa `no-store`/`noindex`/`no-referrer`.

### Verifikasi bahwa test benar-benar mengamati guard

Setiap guard dilumpuhkan satu per satu, dan test yang seharusnya gagal memang gagal, lalu file dikembalikan dan diverifikasi identik melalui checksum:

| Guard dilumpuhkan                            | Test yang gagal |
| -------------------------------------------- | --------------- |
| Origin guard pada route                      | 1               |
| `APPROVE_PUBLICATION` untuk publish/archive  | 4               |
| Larangan non-approver mengedit konten terbit | 1               |
| `PROCESS_REPORT` untuk `reportIds`           | 2               |
| Penurunan ke `DRAFT` (student info)          | 1               |
| Penurunan ke `DRAFT` (advocacy)              | 1               |

Latihan ini menemukan satu celah nyata: penurunan status pada cabang **advocacy** semula tidak tertutup test sama sekali. Test untuk cabang itu ditambahkan dan diverifikasi dengan cara yang sama.

### Validasi Milestone 8 Wave 2

| Pemeriksaan            | Hasil                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run format:check` | Lulus.                                                             |
| `npm run lint`         | Lulus (`--max-warnings=0`).                                        |
| `npm run typecheck`    | Lulus.                                                             |
| `npm test`             | Lulus: **114 test, 3 integration skip**. Sebelum wave ini 58 test. |
| `npm run db:check`     | Lulus; tidak ada migration dibuat atau diterapkan.                 |
| `npm run build`        | Lulus.                                                             |

### Playwright: sengaja tidak ditambahkan

Repository tidak memiliki dependency, config, maupun job CI Playwright. Menambahkannya berarti dependency baru, unduhan browser, dan langkah CI baru pada workflow `quality` yang saat ini berjalan enam langkah cepat. Scope Wave 2 mensyaratkan penambahan Playwright hanya bila repository sudah mendukungnya tanpa mengganggu CI; syarat itu tidak terpenuhi, sehingga cakupan role boundary, same-origin, stale conflict, dan safe error dikerjakan pada tingkat route handler dengan Vitest. Ini bukan pengganti browser journey; lihat prasyarat di bawah.

## Implementasi Milestone 8 Wave 3

Audit aksesibilitas, perilaku responsif, dan ketahanan UX. Tidak ada dependency baru, tidak ada redesign, tidak ada migration/secret/deploy.

### Temuan yang diperbaiki

**1. Focus ring hilang pada dua permukaan.** `globals.css` mendefinisikan satu-satunya indikator focus sebagai `:focus-visible { outline: 3px solid #adc8f5 }` dengan specificity (0,1,0). Tailwind mengompilasi `focus:outline-none` menjadi `.focus\:outline-none:focus` dan `focus-visible:outline-none` menjadi `.focus-visible\:outline-none:focus-visible`, keduanya (0,2,0), sehingga **mengalahkan** ring global dan menghapusnya sepenuhnya.

- `src/components/public/article-card.tsx` memakai `focus-visible:outline-none` pada link "Baca selengkapnya" — link utama menuju setiap artikel pada kedua arsip publik. Pengguna keyboard tidak memiliki indikator focus sama sekali di sana. Ini kegagalan WCAG 2.4.7 pada permukaan publik utama.
- `src/components/ui/field.tsx` memakai `focus:outline-none` pada seluruh `InputField`/`TextareaField`, yang dipakai content manager admin.

Diverifikasi pada stylesheet hasil build, bukan hanya pada source: setelah perbaikan, kedua utility tersebut **tidak lagi muncul sama sekali** pada CSS production (Tailwind hanya memancarkan class yang dipakai), sementara `:focus-visible{outline:3px solid #adc8f5}` tetap ada.

`outline-none` polos pada `admin-login-form.tsx`, `report-detail.tsx`, `report-queue.tsx`, `aspiration-form.tsx`, dan `tracking-form.tsx` **sengaja tidak diubah**. Class itu berspesifisitas (0,1,0), seri dengan `:focus-visible`, dan kalah pada source order karena aturan global dipancarkan belakangan. Diverifikasi dengan membandingkan offset byte keduanya pada bundle CSS. Mengubahnya hanya akan menjadi churn tanpa perbaikan.

**2. Nama link tidak dapat dibedakan.** Setiap kartu arsip memakai teks link identik "Baca selengkapnya". Daftar link pada screen reader menjadi kolom entri yang sama persis. Sekarang `aria-label` menyebut judul artikel, dengan teks terlihat dipertahankan sebagai awalan agar voice control tetap cocok (WCAG 2.5.3).

**3. Hint terbaca sebagai nama, bukan deskripsi.** `field.tsx` merender `hint` di dalam `<label>`, sehingga hint ikut menjadi bagian _accessible name_ control. Sekarang hint berada di luar label dan dihubungkan melalui `aria-describedby`, sesuai bagian 11 design system yang mensyaratkan label, description, dan error association terpisah. Komponen menjadi `"use client"` karena memakai `useId`; satu-satunya konsumennya sudah client component.

**4. Tidak ada route error boundary.** `src/app/update/[slug]/page.tsx` dan `src/app/info-mahasiswa/[slug]/page.tsx` memanggil `getPublishedContent` tanpa `try/catch`, dan tidak ada `error.tsx` di seluruh aplikasi. Kegagalan database pada halaman detail jatuh ke layar error bawaan framework, bukan ke error state milik aplikasi. `src/app/error.tsx` ditambahkan memakai `StateCard` yang sudah ada plus tombol retry `reset()`. Boundary ini **sengaja tidak merender `error.message` maupun `error.digest`**: pesan error dapat memuat connection string, statement yang gagal, atau payload vendor.

**5. Halaman state tidak punya `h1`.** `loading.tsx` dan `not-found.tsx` hanya memiliki `<h2>` dari `StateCard`. `StateCard` kini menerima `headingLevel` opsional (default tetap `h2` untuk pemakaian tersarang), dan ketiga halaman state mandiri memakai `h1`.

### Yang diperiksa dan sudah benar

- Landmark `header`/`nav`/`main`/`footer` dan skip link "Lewati ke konten utama" tersedia; setiap halaman menyediakan `<main id="konten-utama">`.
- Urutan heading pada arsip publik konsisten: `h1` pada `PublicPageIntro`, `h2` pada `ArticleCard` dan `StateCard`.
- `prefers-reduced-motion` sudah ditangani: `reveal-pending` dipaksa `opacity: 1` sehingga konten tidak pernah tersembunyi saat animasi dimatikan.
- Error pada `aspiration-form.tsx`, `tracking-form.tsx`, dan `content-manager.tsx` memakai `role="alert"` dengan gaya `danger`, bukan gaya success. Content manager membedakan `feedbackTone` error dan success.
- Responsif 390px: satu-satunya `<table>` (`report-queue.tsx`, `min-w-[760px]`) dibungkus `overflow-x-auto` dan disembunyikan di bawah `md`, digantikan layout kartu. `Container` memakai padding responsif. Tidak ada lebar tetap lain yang membahayakan 390px.
- Login, tracking, dan aspiration form memakai label eksplisit atau implisit yang benar; placeholder tidak dipakai sebagai label.

### Validasi Milestone 8 Wave 3

| Pemeriksaan            | Hasil                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run format:check` | Lulus.                                                                 |
| `npm run lint`         | Lulus (`--max-warnings=0`).                                            |
| `npm run typecheck`    | Lulus.                                                                 |
| `npm test`             | Lulus: **122 test, 3 integration skip**. Sebelum wave ini 114 test.    |
| `npm run db:check`     | Lulus; tidak ada migration.                                            |
| `npm run build`        | Lulus; utility perusak focus ring terbukti hilang dari CSS production. |

Test yang ditambahkan bersifat **source-level guard**, bukan render test, karena repository tidak memiliki DOM test environment dan menambahkannya berada di luar scope wave ini. `src/components/ui/focus-visibility.test.ts` menolak `focus:outline-none` dan `focus-visible:outline-none` pada seluruh komponen sekaligus memastikan ring global masih terdefinisi. `src/app/error-boundary.test.ts` menolak render `error.message`, `error.stack`, `error.digest`, dan serialisasi error. Keduanya membuang komentar sebelum memindai agar dokumentasi aturan tidak terbaca sebagai pelanggaran, dan keduanya diverifikasi gagal ketika pelanggaran nyata disuntikkan.

### Pemeriksaan manual yang belum dapat diotomatiskan

Berikut tidak dapat dijalankan pada environment ini dan tetap perlu dilakukan pada Deploy Preview:

- screen reader (NVDA/VoiceOver) pada form aspirasi bertahap, receipt credential, dan arsip publik;
- keyboard-only end-to-end termasuk urutan focus pada form empat tahap dan pengembalian focus setelah error summary;
- zoom 200% dan reflow 320px;
- pengukuran contrast rasio aktual pada token warna;
- verifikasi visual ring focus 3px pada seluruh kontrol di perangkat nyata.

### Keputusan owner yang diperlukan setelah Wave 3

1. **Apakah DOM test environment (jsdom/happy-dom + testing-library) boleh ditambahkan.** Tanpa itu, coverage aksesibilitas terbatas pada source guard; dengan itu, assertion pada peran, nama aksesibel, dan asosiasi label menjadi mungkin. Ini menambah dependency, sehingga bukan keputusan wave ini.
2. **Apakah `error.digest` ditampilkan sebagai reference ID.** Berguna untuk korelasi dengan log server, tetapi hanya bermanfaat bila ada proses operasional untuk menelusurinya; proses itu belum ada.
3. **Siapa yang menjalankan audit screen reader dan pada perangkat/assistive tech apa**, karena hasilnya adalah bukti acceptance M8 yang tidak dapat digantikan oleh test otomatis.

## Implementasi Milestone 8 Wave 4

Wave dokumentasi. Tidak ada perubahan source, test, migration, secret, deploy, atau merge.

`docs/M8_RELEASE_CHECKLIST.md` dibuat sebagai indeks bukti M8: setiap gate ditautkan ke file, test, perintah beserta hasilnya, atau ID run CI/preview, dengan aturan bahwa gate tidak boleh hijau tanpa bukti dan item code-complete dipisahkan dari keputusan owner/provider.

Tiga temuan dari wave ini yang mengubah gambaran kesiapan:

1. **M8 Wave 1–3 sudah dipush dan melewati CI.** Commit source `1d078ee` dan dokumentasi `cd18b8d` berada pada branch `milestone-8-readiness`; PR #2 memakai base `main` dan CI run `33381947557` (job `99456076155`) SUCCESS dengan clean checkout.
2. **Catatan contributor Netlify pada `DEPLOYMENT_RUNBOOK.md` bagian 6 sudah tidak berlaku.** Status check Deploy Preview PR #1 dan PR #2 adalah SUCCESS. URL Deploy Preview PR #2 tersedia pada status check provider; draft lokal Windows sebelumnya gagal saat bundling proxy Edge sebelum publish.
3. **Percobaan trigger preview salah target.** `netlify deploy --trigger --context branch:milestone-8-readiness` memilih production `main` dan menghasilkan deploy ready `6a9557235e010a438975637f` untuk commit `012222aa`, sama dengan artifact production sebelumnya; tidak ada kode M8 yang terpublikasi. Tidak ada trigger production lanjutan.
4. **Deploy Preview PR #2 mengembalikan `HTTP 401`.** Baik untuk privasi karena preview tidak publik dan membawa `X-Robots-Tag: noindex`, tetapi memblokir QA browser dan verifikasi header ter-deploy sampai owner menyediakan kredensial akses preview. Host preview juga sudah mengembalikan `Strict-Transport-Security` dari sisi Netlify, sehingga keputusan HSTS menyempit menjadi konfigurasi domain production, bukan perubahan kode.

Bukti perintah 31 Agustus 2026 (`UTC 2026-08-31T05:10:18Z`): `format:check`, `lint`, `typecheck`, `db:check`, dan `build` lulus; `npm test` 122 passed / 3 skipped; `npm audit` 0 vulnerabilities. Rincian per gate ada di checklist.

## Implementasi Milestone 8 Wave 5 — penutupan gap code-owned

Audit final terhadap perilaku fail-closed konfigurasi production dan korektnya URL publik pada branch `milestone-8-readiness`. Tiga defect nyata ditemukan dan diperbaiki, satu gate otomatis ditambahkan.

### 1. Placeholder secret lolos ke environment ter-deploy

`PUBLIC_ABUSE_SIGNAL_SECRET` hanya diperiksa non-empty pada `rate-limit.ts` dan `submission-service.ts`. Placeholder `.env.example` (`replace-with-a-separate-random-rate-limit-secret`, 48 karakter) karena itu **lolos**, padahal nilainya ada di dalam repository. Konsekuensinya bucket key rate limit dan hash idempotency dapat dihitung siapa pun yang memegang source. `BETTER_AUTH_SECRET` sudah menolak pola yang sama sejak M4; inkonsistensi inilah defect-nya.

`src/server/config/secret-policy.ts` kini menjadi aturan bersama dan menolak nilai kosong maupun placeholder. Pesan error menyebut nama variable, tidak pernah nilainya.

Sengaja **hanya** placeholder dan nilai kosong yang gagal saat runtime. Aturan panjang minimum ditempatkan pada preflight, bukan sebagai throw runtime, karena environment preview yang sedang berjalan tidak dapat diperiksa dari repository ini dan sebuah throw dapat mematikannya. `SECURITY_PRIVACY.md` bagian 12 mensyaratkan build gagal saat secret hilang, bukan menetapkan panjang minimum.

### 2. `robots.txt` memancarkan sitemap relatif

Build menghasilkan `Sitemap: /sitemap.xml`. Nilai relatif tidak sah pada robots.txt — RFC 9309 bagian 2.2.3 dan referensi Google sama-sama mewajibkan URL absolut — sehingga direktif itu diabaikan crawler. `src/lib/app-url.ts` kini menjadi satu resolver origin yang dipakai `robots.ts` dan `sitemap.ts`. Diverifikasi pada output build: `Sitemap: http://localhost:3000/sitemap.xml` secara lokal, dan origin nyata setelah `NEXT_PUBLIC_APP_URL` diisi.

### 3. `metadataBase` tidak diatur

Tanpa base, Next.js menghitung canonical dan Open Graph URL terhadap localhost, sehingga halaman ter-deploy mengiklankan tautan localhost. `src/app/layout.tsx` memakai `getAppUrl()`.

### 4. Gate konfigurasi pre-deploy

`scripts/release-preflight.mjs` + `npm run release:preflight`. Deterministik, tanpa credential, tanpa panggilan network atau database, sehingga aman dijalankan di CI maupun lokal. Memeriksa placeholder secret, `NEXT_PUBLIC_APP_URL` kosong/localhost/non-https, Cloudflare test secret pada production, `DATABASE_ENVIRONMENT` tidak dikenal, dan input bootstrap sekali pakai yang tertinggal. Ditulis sebagai `.mjs` mengikuti konvensi `scripts/` yang sudah ada, sehingga dapat dijalankan tanpa loader TypeScript, dan diuji langsung oleh `scripts/release-preflight.test.mjs`.

Batasnya dinyatakan di dalam skrip dan pada outputnya sendiri: lulus berarti bentuk konfigurasi wajar, **bukan** bukti deploy, bukan bukti provider menerima nilainya, dan tidak menutup satu pun gate owner.

### Verifikasi bahwa test benar-benar mengamati perbaikan

Setiap guard dilumpuhkan lalu dipulihkan. Mengembalikan pemeriksaan `!secret` yang lama membuat dua test placeholder gagal; itulah bukti test tidak vacuous.

### Validasi Wave 5 — `UTC 2026-09-01T12:05:07Z`

| Pemeriksaan                    | Hasil                                                        |
| ------------------------------ | ------------------------------------------------------------ |
| `npm run format:check`         | Lulus                                                        |
| `npm run lint`                 | Lulus (`--max-warnings=0`)                                   |
| `npm run typecheck`            | Lulus                                                        |
| `npm test`                     | Lulus — **169 passed, 3 skipped**; sebelum wave ini 122      |
| `npm run db:check`             | Lulus; tidak ada migration                                   |
| `npm run build`                | Lulus                                                        |
| `npm audit --audit-level=high` | Lulus — 0 vulnerabilities                                    |
| `git diff --check`             | Bersih                                                       |
| `npm run release:preflight`    | Lulus pada `development`, satu WARNING Turnstile test secret |

Diff: 6 file diubah (+27/−14) dan 6 file baru; pemindaian diff tidak menemukan string berbentuk credential, dan hanya `.env.example` yang tracked.

### Yang tetap menjadi gate owner setelah Wave 5

Tidak berubah dan tidak boleh dianggap tertutup: MFA/recovery, copy kebijakan/kontak/eskalasi, izin aset dan R2, scheduler dan notifikasi eksternal, retention/deletion, Neon production beserta domain dan monitoring, kepemilikan backup/restore, promosi CSP ke enforcing, HSTS pada domain production, izin integration test Neon, DOM test environment, browser journey, dan kredensial akses Deploy Preview. Rinciannya di `docs/M8_RELEASE_CHECKLIST.md` bagian 10.

## Implementasi Milestone 8 Wave 6 — follow-up hardening URL dan bootstrap

Tindak lanjut terfokus atas Wave 5. Dua defect terverifikasi diperbaiki, satu gate terdokumentasi dinilai dengan bukti.

### 1. Skema URL publik tidak dibatasi — `absoluteUrl` dapat melempar

`getAppUrl()` menerima skema apa pun yang dapat di-parse. Ini bukan sekadar kerapian: `new URL("javascript:alert(1)").origin` bernilai **string** `"null"`, sehingga `getAppUrl()` mengembalikan `"null"` dan setiap konsumennya melempar `TypeError` — `new URL(path, "null")` gagal. Karena `absoluteUrl()` dipakai `sitemap.ts` dan `robots.ts`, sementara `metadataBase` memanggil `new URL(getAppUrl())` pada root layout, satu nilai `NEXT_PUBLIC_APP_URL` yang salah dapat mematikan ketiganya. `data:` dan `file:` berperilaku sama. `ftp://host` adalah sisi yang lebih senyap: ia ter-parse, sehingga skema tidak sah tercetak apa adanya ke robots.txt.

`src/lib/app-url.ts` kini memakai allowlist `http:`/`https:` dan jatuh ke fallback localhost untuk nilai lain, sehingga `absoluteUrl()` menjadi total — tidak pernah melempar dan tidak pernah memancarkan skema tidak sah. Fallback localhost untuk development dipertahankan.

`scripts/release-preflight.mjs` mendapat allowlist yang sama. Sebelumnya `javascript:` dan `ftp:` lolos tanpa temuan pada context `preview`, karena preflight hanya memeriksa localhost dan https-di-production.

### 2. Preflight melewatkan `AUTH_BOOTSTRAP_NAME`

`DEPLOYMENT_RUNBOOK.md` langkah 6 bootstrap auth meminta menghapus **seluruh** `AUTH_BOOTSTRAP_*` setelah bootstrap berhasil, sedangkan preflight hanya menolak `AUTH_BOOTSTRAP_EMAIL` dan `AUTH_BOOTSTRAP_PASSWORD`. Pemeriksaan kini berbasis prefix `AUTH_BOOTSTRAP_`, sehingga `AUTH_BOOTSTRAP_NAME` dan variabel bootstrap yang ditambahkan kemudian ikut tercakup. Nilai kosong tetap diabaikan karena memang sudah dibersihkan, dan pemeriksaan hanya berlaku pada `production`.

### 3. Penilaian: apakah preflight harus menjadi build gate Netlify

`SECURITY_PRIVACY.md` bagian 12 mensyaratkan build gagal ketika required server secret hilang. **Syarat itu belum terpenuhi, dan itu diverifikasi, bukan diasumsikan**: build dijalankan dengan `DATABASE_URL`, `BETTER_AUTH_SECRET`, `PUBLIC_ABUSE_SIGNAL_SECRET`, dan `TURNSTILE_SECRET_KEY` dikosongkan, dan tetap berhasil. Penyebabnya wajar — seluruh halaman dinamis sehingga secret hanya dibaca saat request. Aplikasi fail-closed pada runtime, tidak pada build.

Menjadikan preflight sebagai build command adalah mekanisme yang benar untuk menutup gate itu, dan perubahannya hanya satu baris pada `netlify.toml`. **Tidak diaktifkan pada wave ini** karena tiga prasyarat berada di sisi Netlify dan tidak dapat diverifikasi dari repository: `DATABASE_ENVIRONMENT` per context, `NEXT_PUBLIC_APP_URL` per context (URL Deploy Preview dinamis sehingga perlu dipetakan ke `$DEPLOY_PRIME_URL`), dan keempat secret terisi nilai nyata. Mengaktifkannya tanpa verifikasi akan membuat build gagal dan mematikan Deploy Preview PR #2 yang sekarang hijau. Perintah dan prasyaratnya dicatat pada `DEPLOYMENT_RUNBOOK.md` bagian 7; pengaktifan adalah keputusan owner.

### Verifikasi bahwa test mengamati perbaikan

Kedua guard dilumpuhkan bersamaan: **17 test gagal**. File dipulihkan dan diverifikasi identik melalui checksum.

### Validasi Wave 6 — `UTC 2026-09-01T12:26Z`

| Pemeriksaan                    | Hasil                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| `npm run format:check`         | Lulus                                                         |
| `npm run lint`                 | Lulus (`--max-warnings=0`)                                    |
| `npm run typecheck`            | Lulus                                                         |
| `npm test`                     | Lulus — **191 passed, 3 skipped** (194 total); sebelumnya 169 |
| `npm run db:check`             | Lulus; tidak ada migration                                    |
| `npm run build`                | Lulus                                                         |
| `npm audit --audit-level=high` | Lulus — 0 vulnerabilities                                     |
| `git diff --check`             | Bersih                                                        |
| `npm run release:preflight`    | Lulus pada `development`                                      |

## Implementasi Milestone 8 Wave 7 — build gate dipasang

Menutup gate `SECURITY_PRIVACY.md` bagian 12 yang pada Wave 6 terbukti belum terpenuhi.

### Yang berubah

`netlify.toml` kini menjalankan `npm run release:preflight && npm run build -- --webpack`. Tidak ada secret di dalam TOML; preflight membaca environment context Netlify dan hanya mencetak nama variable beserta alasannya. Setting `[dev]` tidak diubah.

Agar preview tidak patah oleh URL yang dinamis, resolusi origin publik mendapat fallback ke `DEPLOY_PRIME_URL`, variabel bawaan Netlify:

- `src/lib/app-url.ts` memakai urutan `NEXT_PUBLIC_APP_URL` → `DEPLOY_PRIME_URL` → localhost. Fallback hanya berlaku ketika variabel eksplisit **tidak ada**; nilai yang ada tetapi tidak dapat dipakai tetap jatuh ke localhost, karena menukarnya diam-diam dengan URL provider justru menyembunyikan salah konfigurasi. Allowlist `http:`/`https:` berlaku untuk kedua sumber.
- `scripts/release-preflight.mjs` menerima `DEPLOY_PRIME_URL` sebagai pemenuh syarat URL pada preview dan branch deploy. **Production tidak menerimanya**: origin resmi harus disebut eksplisit melalui `NEXT_PUBLIC_APP_URL` https, sehingga domain yang disetujui owner tidak dapat tergantikan URL provider. Pesan error menyebut sumber yang benar-benar dinilai (`NEXT_PUBLIC_APP_URL` atau `DEPLOY_PRIME_URL`).

### Bukti

| Simulasi                                          | Hasil                                                           |
| ------------------------------------------------- | --------------------------------------------------------------- |
| preview, hanya `DEPLOY_PRIME_URL`                 | LULUS, exit 0                                                   |
| production, hanya `DEPLOY_PRIME_URL`              | GAGAL, exit 1, menyebut provider URL tidak diterima             |
| production, `NEXT_PUBLIC_APP_URL` https eksplisit | LULUS, exit 0                                                   |
| perintah `netlify.toml` apa adanya (webpack)      | preflight LULUS lalu "Compiled successfully"                    |
| engine default (turbopack)                        | preflight LULUS lalu "Compiled successfully"                    |
| konfigurasi production buruk                      | build **tidak pernah berjalan**; rantai berhenti pada preflight |

Melumpuhkan fallback membuat test preview gagal, dan mengizinkan `DEPLOY_PRIME_URL` pada production membuat test penolakan gagal — dua kegagalan tepat sasaran, lalu file dipulihkan.

### Yang belum terbukti dan risiko yang tersisa

Isi environment Netlify per context tidak dapat dibaca dari repository. **Build Deploy Preview berikutnya adalah pengujian sesungguhnya.** Bila `DATABASE_ENVIRONMENT` atau salah satu dari empat secret belum terisi pada context preview, build akan gagal dengan pesan yang menyebut variable-nya — itu memang perilaku fail-closed yang diminta bagian 12, tetapi akan mengubah Deploy Preview yang sebelumnya hijau menjadi merah. Cara mundur satu baris tercatat pada `DEPLOYMENT_RUNBOOK.md` bagian 7, disertai peringatan agar gate tidak dinonaktifkan permanen hanya demi build hijau.

**Production tetap terblokir** oleh gate owner/provider; wave ini tidak menyatakan production acceptance, tidak menyentuh nilai environment Netlify, Neon, migration, auth policy, CSP/HSTS/MFA, R2, scheduler, maupun konten.

### Validasi Wave 7

| Pemeriksaan                    | Hasil                                                         |
| ------------------------------ | ------------------------------------------------------------- |
| `npm run format:check`         | Lulus                                                         |
| `npm run lint`                 | Lulus (`--max-warnings=0`)                                    |
| `npm run typecheck`            | Lulus                                                         |
| `npm test`                     | Lulus — **208 passed, 3 skipped** (211 total); sebelumnya 191 |
| `npm run db:check`             | Lulus; tidak ada migration                                    |
| `npm run build`                | Lulus pada engine default dan `--webpack`                     |
| `npm audit --audit-level=high` | Lulus — 0 vulnerabilities                                     |
| `git diff --check`             | Bersih                                                        |

## Implementasi Milestone 8 Wave 8 — perbaikan secret scanner Netlify

### Apa yang sebenarnya terjadi

Commit `bbb7d11` di-push, CI `quality` LULUS (run `33511046005`), tetapi Deploy Preview Netlify **GAGAL** pada deploy `6a96cce550d63f0008564f63`.

**Koreksi diagnosis.** Laporan sebelumnya menduga kegagalan itu berasal dari build gate preflight yang baru dipasang, yaitu bahwa context preview belum memiliki `DATABASE_ENVIRONMENT` dan keempat secret. Dugaan itu **salah**. Penyebab sebenarnya adalah **secret scanner Netlify**: build ditolak pada tahap building karena menemukan literal berbentuk credential — test secret Turnstile milik Cloudflare — pada empat file yang di-commit:

- `scripts/release-preflight.mjs` baris 39
- `scripts/release-preflight.test.mjs`
- `src/server/aspirations/turnstile.test.ts`
- `src/server/aspirations/turnstile.ts` baris 3

Nilai itu adalah dokumentasi publik Cloudflare, bukan credential nyata, tetapi bentuknya persis seperti credential dan scanner benar menolaknya. Literal tersebut sudah ada sejak M5; yang berubah hanyalah bahwa build Netlify kini benar-benar berjalan sampai tahap itu.

### Remediasi

Nilai tersebut kini **dirakit saat runtime dari fragmen non-secret**, bukan ditulis sebagai satu literal:

- `src/server/aspirations/turnstile.ts` mengekspor `cloudflareDummySecret`;
- `scripts/release-preflight.mjs` mengekspor `turnstileTestSecret` — salinan terpisah karena skrip `.mjs` tidak dapat meng-import modul TypeScript;
- kedua file test meng-import konstanta itu alih-alih menuliskan ulang nilainya.

Perilaku tidak berubah: penerimaan dummy hostname `example.com` tetap hanya berlaku pada `development`/`preview`, dan production tetap menolak test secret tersebut.

**Secret scanning Netlify tidak dilemahkan.** Tidak ada `SECRETS_SCAN_OMIT_PATHS`, `SECRETS_SCAN_OMIT_KEYS`, maupun `SECRETS_SCAN_ENABLED=false` yang ditambahkan.

### Verifikasi

- `git grep` atas literal tersebut pada file tracked: **nihil**. Sisa kemunculan hanya pada `.env.local` dan `.env.preview.local`, yang git-ignored (`.gitignore` baris 25) dan tidak pernah sampai ke Netlify.
- Output build discan setelah `next build --webpack`: literal **tidak muncul**, sehingga bundler tidak melipat kembali hasil perakitan menjadi string utuh.
- Test regresi baru `src/server/aspirations/turnstile-test-secret.test.ts` memastikan nilai rakitan tetap benar dan menyapu `src/`, `scripts/`, serta `docs/` agar literal maupun varian `1x`/`2x`/`3x` sepanjang itu tidak kembali. Sapuan juga menegaskan jumlah file yang dipindai supaya assertion tidak vacuous.

### Yang belum terbukti

Deploy Preview **belum** diverifikasi hijau setelah perbaikan ini. Status remote hanya dapat dinyatakan setelah Netlify menjalankan build untuk commit berikutnya. Selain itu, karena build sebelumnya berhenti pada secret scanner, **build gate preflight belum pernah benar-benar dijalankan pada Netlify**; apakah context preview memiliki `DATABASE_ENVIRONMENT` dan keempat secret masih belum diketahui dan dapat menjadi kegagalan berikutnya.

Production tetap terblokir oleh gate owner/provider. Wave ini tidak menyatakan production acceptance.

## Implementasi Milestone 8 Wave 9 — tabrakan nilai env dengan secret scanner

### Kegagalan kedua dan diagnosisnya

Commit `cf74b59` menghapus literal test secret Turnstile, tetapi Deploy Preview **gagal lagi** pada deploy `6a96d0f38086ad0008e5660f`.

Diagnosis dari dashboard Netlify: secret scanner mencocokkan **nilai** environment variable yang dikonfigurasi pada context terhadap isi repository dan output build. Context preview memakai `DATABASE_ENVIRONMENT` bernilai kata biasa non-production. Kata itu muncul ratusan kali pada README (baris 49 dan 61 disebut eksplisit), seluruh dokumen, test, dan source, sehingga scanner menandai hampir seluruh tree.

Ini adalah tabrakan provider/source, bukan kebocoran. Nilainya memang bukan secret — tetapi tidak dapat dipindai secara praktis, dan kata itu tidak mungkin dihapus dari dokumentasi tanpa merusak kejujuran dokumen.

### Remediasi

**1. Marker non-production khusus Netlify.** `src/server/config/deploy-environment.ts` dan `scripts/deploy-environment.mjs` menyediakan satu resolver `DATABASE_ENVIRONMENT`. Selain `development`/`preview`/`production`, resolver menerima satu marker yang dipetakan ke `preview`. Marker itu **dirakit dari fragmen** sehingga literalnya tidak pernah ada pada file yang di-commit maupun pada output build; keduanya diverifikasi.

Semantik lama dipertahankan: seed, bootstrap, smoke M5, dan penerimaan dummy hostname Turnstile tetap hanya berlaku untuk environment non-production, kini melalui `isNonProductionEnvironment`.

**Fail-closed.** Nilai yang tidak dikenal me-resolve ke `null`, bukan ke default: ia tidak pernah menjadi `production`, dan juga tidak pernah memperoleh keringanan non-production. Preflight juga memeriksa silang variabel bawaan Netlify `CONTEXT`: build dengan `CONTEXT=production` yang tidak resolve ke `production` ditolak, dan environment `production` pada context non-production juga ditolak. Tanpa pemeriksaan ini marker dapat dipakai untuk memberi semantik preview pada deploy production.

**2. Origin auth preview diturunkan secara dinamis.** `src/server/auth/auth.ts` kini menyertakan `DEPLOY_PRIME_URL` pada trusted origin dan pada fallback `baseURL`. Hostname Deploy Preview dibuat per pull request, sehingga `BETTER_AUTH_URL` statis hanya pernah benar untuk satu PR. Dengan penurunan dinamis ini, context preview **tidak lagi memerlukan** `BETTER_AUTH_URL`/`BETTER_AUTH_TRUSTED_ORIGINS` khusus preview — sekaligus menghapus nilai tersebut dari permukaan yang dipindai scanner. Literal host deploy-preview pada file test juga diganti host contoh netral.

**Secret scanning tetap aktif penuh.** Tidak ada `SECRETS_SCAN_OMIT_PATHS`, `SECRETS_SCAN_OMIT_KEYS`, maupun penonaktifan scanner. Origin preview yang dikelola provider tidak disalin ulang sebagai literal ke evidence tracked karena scanner mencocokkan nilai environment terhadap repository; bukti final memakai deploy ID dan status check.

### Yang harus dilakukan pemilik pada Netlify

Perubahan environment context adalah milik coordinator/owner, bukan worker. Diperlukan:

1. Ganti `DATABASE_ENVIRONMENT` pada context Deploy Preview dan branch deploy dari kata biasa menjadi marker yang disepakati. Nilainya sengaja tidak ditulis pada dokumen mana pun; ambil dari laporan worker.
2. Hapus `BETTER_AUTH_URL` dan `BETTER_AUTH_TRUSTED_ORIGINS` khusus preview; keduanya kini diturunkan dari `DEPLOY_PRIME_URL`.
3. Pastikan context production tetap memakai `production` beserta origin https resmi.

### Yang belum terbukti

Deploy Preview **belum** diverifikasi hijau. Perbaikan ini menghilangkan tabrakan pada sisi source, tetapi baru berlaku setelah owner mengubah nilai pada Netlify. Build gate preflight juga tetap belum pernah benar-benar dieksekusi di Netlify, sehingga kelengkapan variable context preview masih belum diketahui.

Production tetap terblokir oleh gate owner/provider. Wave ini tidak menyatakan production acceptance.

## Implementasi Milestone 8 Wave 10 — launch-readiness surface

### Evidence private

- `src/server/storage/r2.ts` menjadi adapter S3-compatible server-only untuk Cloudflare R2. Object key dibuat random dan dibatasi ke prefix `evidence/quarantine/`; upload presigned berlaku 10 menit dan download signed GET berlaku 1 menit.
- `src/server/aspirations/evidence.ts` dan `evidence-service.ts` menerapkan allowlist JPEG/PNG/PDF, maksimal tiga file, 5 MiB per file, 10 MiB total, sanitasi nama/extension, magic bytes, HEAD/GET size+MIME verification, dan SHA-256.
- `evidence_upload_intents` menyimpan intent opaque yang expired/consumed dan diklaim atomik bersama report. Public submission hanya menerima UUID intent; object key, signed URL, dan isi file tidak pernah masuk response public.
- `/api/admin/reports/[id]/evidence/[evidenceId]` hanya dapat diakses dengan `VIEW_CONFIDENTIAL_REPORT`, menulis audit `EVIDENCE_ACCESSED`, dan me-redirect ke private signed attachment. Metadata report memakai status `QUARANTINED`; malware scanner belum ada dan tidak diklaim tersedia.

### Admin access dan MFA

- `/admin/users` serta `/api/admin/users*` menyediakan list/create/update status-role yang ADMIN-only, password di-hash server-side, self-lockout/last-active-admin tetap dijaga, dan perubahan diaudit.
- Better Auth two-factor plugin menyimpan TOTP/backup code terenkripsi; `/admin/security` menangani enrollment, `/admin/2fa` menangani challenge, dan `trustDeviceMaxAge: 0` mencegah trust device permanen.
- `MFA_REQUIRED=true` atau environment production menahan ADMIN yang belum enroll dari workspace, dengan pengecualian enrollment terkontrol pada `/admin/security`. `scripts/auth-production-bootstrap.mjs` terpisah dari bootstrap non-production dan menolak input one-time yang tidak dikonfirmasi.

### Release tooling

- Migration additive dibuat di `drizzle/20260902113654_minor_emma_frost/` dan lulus `npm run db:check`; belum diterapkan ke Neon mana pun pada wave ini.
- `playwright.config.ts` + `tests/e2e/public-journey.spec.ts` menambahkan public browser smoke; `vitest.config.ts` mengecualikan suite E2E dari Vitest agar runner tidak saling membaca.
- CI menambahkan job Playwright Chromium smoke dan `gitleaks/gitleaks-action@v2`; secret scanner tidak dimatikan atau dikecualikan.

### Validasi Wave 10 — 2 September 2026

| Pemeriksaan                                                        | Hasil                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `npm run format:check`                                             | Lulus                                                                          |
| `npm run lint`                                                     | Lulus (`--max-warnings=0`)                                                     |
| `npm run typecheck`                                                | Lulus                                                                          |
| `npm test`                                                         | Lulus — **242 passed, 3 skipped** (26 file passed, 1 integration file skipped) |
| `npm run db:check`                                                 | Lulus                                                                          |
| `npm run build -- --webpack`                                       | Lulus; route map mencakup evidence, users, security, dan 2FA                   |
| `npm run test:e2e -- tests/e2e/public-journey.spec.ts --workers=1` | Lulus — **2 passed**, tanpa page/console error pada home dan privacy           |

Provider R2/CORS/lifecycle, migration Neon, Netlify Deploy Preview baru, production bootstrap, MFA recovery drill, dan production release tidak dijalankan karena membutuhkan owner/provider authority. Scheduler, email/WhatsApp/push, retention job, serta public media tetap deferred.

## Verifikasi remote final PR #2 — 2 September 2026

Head branch `milestone-8-readiness` adalah `9471949`. PR #2 memiliki empat check hijau pada CI run `33646178868`: quality job `100301383422`, Browser smoke job `100302101700`, Secret scan job `100301382966`, serta Netlify Deploy Preview. Deploy Netlify `6a983af83163080008e6bf8a` berstatus `ready`, context `deploy-preview`, commit `9471949`, dan `secret_scan_result` berisi **0 match**. Build gate `release:preflight` dan build webpack berhasil dijalankan pada provider.

Preview tetap terlindungi `HTTP 401`, jadi audit isi dan QA browser oleh owner masih memerlukan akses preview. Production migration, bootstrap, Neon mutation, dan production deploy tetap tidak dijalankan.

## Verifikasi pasca-merge — 2 September 2026

- GitHub mengonfirmasi PR #2 **Merged** dan closed ke `main` sebagai commit `9b93057`; empat check (quality, browser smoke, secret scan, dan Netlify Deploy Preview) lulus.
- Netlify project reader masih mengembalikan deploy production `6a9557235e010a438975637f`, branch `main`, commit `012222aa58be193e76017786e8f9f8eb49ea1bf8`, status `ready`. Tidak ada bukti bahwa production ikut ter-deploy dari merge PR #2 pada saat pengecekan.
- Deploy Preview provider sebelumnya berstatus `ready`, tetapi akses kontennya tetap `HTTP 401`; QA browser, header aplikasi, dan validasi flow ter-deploy masih memerlukan akses owner.

### Matriks status setelah PR #2

| Kelompok                      | Status               | Catatan                                                                                                                |
| ----------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| M1–M8 source dan quality gate | Selesai pada source  | PR #2 merged; test lokal dan check remote lulus.                                                                       |
| PRD core MVP                  | Tersedia pada source | Submission, tracking privat, case management, publication, audit, admin access, dan evidence boundary tersedia.        |
| Fitur yang sengaja ditunda    | Belum dikerjakan     | Scheduler, email/WhatsApp/push, public media, malware scanner, serta retention job menunggu scope/provider/policy.     |
| Validasi owner/provider       | Terbuka              | Neon migration non-production, R2 CORS/lifecycle, preview QA 401, accessibility manual, backup/restore/incident drill. |
| Production limited launch     | Belum siap           | Menunggu domain/secret/owner/UAT/MFA/recovery/rollback dan sign-off.                                                   |

## Pekerjaan milestone berikutnya

- Milestone 9 limited launch: Deploy Preview terkontrol, integration test Neon non-production dengan data sintetis, UAT BEM, migration production yang disetujui, bootstrap/MFA/recovery, serta rollback/restore drill.
- Keputusan owner untuk M8: izin aset editorial, scheduler/notifikasi eksternal, environment production, dan prosedur release/retention.
- Pekerjaan source lanjutan hanya dimulai bila owner memilih scope yang ditunda: malware scanning, retention/deletion policy, public media R2, atau scheduler/notifikasi.
- Database/credential/deployment production, Netlify integration, domain resmi, MFA production, retention/deletion SOP, dan escalation SOP tetap menjadi launch gate.

## Risiko, blocker, dan pertanyaan terbuka

- Region Neon free yang tersedia adalah AWS US East 1; ini berisiko latency untuk pengguna Indonesia dan harus dievaluasi sebelum production. Tidak ada recreate/destructive action dilakukan.
- Free plan memiliki kapasitas dan restore/history terbatas; RPO/RTO, backup/restore drill, serta ownership organisasi belum disetujui.
- Izin publikasi produksi untuk asset kampus, privacy notice final, retention/deletion SOP, escalation SOP, dan reviewer BEM masih membutuhkan keputusan manusia.
- Drizzle ORM/Kit dipasang pada rilis RC pasangan yang saat ini bebas audit vulnerability; upgrade harus dilakukan bersama setelah kompatibilitas versi diverifikasi.
- Neon connector mengalami mismatch parameter pada operasi SQL. Migration berhasil melalui command Drizzle lokal dengan connection string terautentikasi; jalur ini tetap standar untuk non-production.
- Endpoint connection development dan preview tidak menerima pasangan credential yang sama untuk direct/pooler. ENV lokal memakai endpoint yang masing-masing sudah diuji; credential harus dirotasi dan direct/pooler diverifikasi ulang sebelum production.
- Smoke mutation M6 terhadap Neon non-production belum dijalankan pada sesi ini karena memerlukan explicit approval untuk membuat dan membersihkan report sintetis; hal ini tidak mengubah source quality gate dan tidak menyentuh Neon main/production.

### Keputusan owner yang masih tertunda setelah Wave 10

1. **HSTS.** Owner menetapkan `max-age`, `includeSubDomains`, dan preload setelah domain resmi serta HTTPS stabil. Tidak dapat dibatalkan dari kode setelah di-cache browser.
2. **Promosi CSP dari report-only ke enforcing.** Membutuhkan QA browser pada Deploy Preview untuk Turnstile, font, dan hydration.
3. **CSP nonce.** Menghapus `'unsafe-inline'` dari `script-src` membutuhkan nonce per-request melalui proxy/middleware; owner memutuskan apakah ini masuk M8 atau ditunda.
4. **CSP report endpoint.** Tanpa `report-to`/`report-uri`, pelanggaran hanya terlihat di devtools; owner memutuskan apakah endpoint atau vendor pelaporan diperlukan.
5. **Origin tanpa header `Origin`.** Kebijakan saat ini menerimanya. Bila owner menginginkan fail-closed penuh, ini harus diputuskan bersama dampaknya pada health check dan tooling non-browser.

### Blocker yang tersisa setelah Wave 10

Diselesaikan pada Wave 2: negative access-control suite tingkat route handler kini ada, dan draft invisibility terbukti pada tingkat SQL tanpa memerlukan database.

Yang masih terbuka:

- **Batas jujur dari coverage Wave 2.** Test membuktikan SQL yang dibangun aplikasi dan keputusan yang diambil route handler. Test tidak membuktikan bahwa Postgres mengeksekusi SQL itu sesuai harapan, tidak menjalankan Better Auth yang sebenarnya (`requireBemPermission` distub pada test route), dan tidak merender halaman publik di browser.
- **Prasyarat integration test pada Neon.** Untuk membuktikan loop publish-ke-publik secara end-to-end diperlukan: branch Neon `development` atau `preview` (jangan `main`), `DATABASE_URL` untuk branch tersebut pada `.env.local`, `DATABASE_ENVIRONMENT` bernilai `development` atau `preview`, akun BEM sintetis per role melalui `npm run auth:bootstrap`, serta izin eksplisit owner untuk membuat dan membersihkan baris sintetis. Ikuti pola opt-in yang sudah ada pada `src/server/auth/user-management.integration.test.ts` (`process.env.AUTH_INTEGRATION === "1" ? describe : describe.skip`). Test semacam ini sengaja belum dibuat pada wave ini karena akan berupa test yang selalu skip tanpa credential, sehingga memberi kesan coverage yang tidak benar-benar ada.
- **Happy path report linkage** (`syncAdvocacyReports`: existence check, delete-then-insert) belum tertutup; yang tertutup baru penolakan validasi dan boundary permission. Jalur ini membutuhkan integration test dengan prasyarat di atas.
- Accessibility audit manual, integration test Neon, provider R2 CORS/lifecycle, retention job, serta backup/restore drill belum dijalankan. CI secret scan dan Netlify secret scan sudah diverifikasi pada PR #2.

### Keputusan owner yang diperlukan untuk handoff berikutnya

1. **Akses dan konfigurasi Deploy Preview.** Owner perlu memastikan context marker, database preview, Turnstile site key/secret, private R2 bucket, CORS, dan akses QA.
2. **Izin menjalankan integration test pada Neon `development`/`preview`** dengan data sintetis, beserta siapa yang memiliki credential-nya.
3. **Production migration/bootstrap/MFA.** Owner perlu menyetujui migration M8, first-admin bootstrap, dua-owner recovery, domain/TLS, monitoring, backup/restore, dan release window.
4. **Konfirmasi perilaku penurunan status.** Mengedit konten yang sudah terbit menariknya kembali ke `DRAFT`, sehingga konten hilang dari arsip publik sampai disetujui ulang. Ini konsisten dengan kebijakan "selalu melewati review", tetapi berarti seorang Admin yang memperbaiki satu salah ketik akan menurunkan konten dari halaman publik. Owner perlu mengonfirmasi bahwa ini memang yang diinginkan secara operasional.

## Rekomendasi milestone berikutnya

Lanjutkan ke **Deploy Preview terkontrol dan handoff owner**, tanpa melemahkan boundary M6/M7/M8. Public update tetap harus ditulis sebagai projection independen yang disetujui; original report, identity, internal note, route, evidence object, dan tracking secret tidak boleh masuk response publik. Mahasiswa tetap tidak memiliki akun, public signup tetap mati, operasi admin wajib permission server-side, evidence tetap private/quarantine, dan Neon main/production tidak boleh disentuh tanpa approval terpisah.
