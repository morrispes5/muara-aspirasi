# M8 Release Checklist dan Evidence Index — Muara Aspirasi

> Dokumen ini adalah indeks bukti untuk Milestone 8, bukan pengganti `DEPLOYMENT_RUNBOOK.md` bagian 12 (production checklist) atau `SECURITY_PRIVACY.md` bagian 15 (pre-production security acceptance). Keduanya tetap menjadi kontrak rilis; dokumen ini mencatat **apa yang sudah benar-benar dijalankan dan di mana buktinya**.

## Aturan pengisian

1. Sebuah gate hanya boleh ditandai **Lulus** bila ada bukti yang dapat ditelusuri: nama file, nama test, perintah beserta hasilnya, atau ID run CI/preview.
2. Bila kontrol sudah ada di source tetapi belum diverifikasi pada environment nyata, statusnya **Code-complete**, bukan Lulus.
3. Bila gate menunggu manusia, vendor, atau credential, statusnya **Keputusan owner** dan tidak pernah dihitung sebagai kemajuan teknis.
4. Tidak ada gate yang ditandai hijau karena "sudah tertulis di dokumen".

Kosakata status: **Lulus** · **Code-complete** · **Belum dijalankan** · **Keputusan owner** · **Diblokir**.

---

## Evidence run — 31 Agustus 2026

Dijalankan lokal pada worktree aktif `C:/Users/USER/Documents/muara aspirasi`, Windows, Node 22.16.0, stempel waktu `UTC 2026-08-31T05:10:18Z`. Seluruh perintah bersifat read-only terhadap remote dan tidak menyentuh resource production.

| Perintah               | Hasil                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run format:check` | Lulus — "All matched files use Prettier code style!"               |
| `npm run lint`         | Lulus — `eslint . --max-warnings=0`, tanpa output                  |
| `npm run typecheck`    | Lulus — `tsc --noEmit`, tanpa output                               |
| `npm test`             | Lulus — **122 passed, 3 skipped** (125 total, 20 file)             |
| `npm run db:check`     | Lulus — "Everything's fine"; tidak ada migration dibuat/diterapkan |
| `npm run build`        | Lulus — "Compiled successfully"                                    |
| `npm audit`            | Lulus — **found 0 vulnerabilities**                                |

Tiga test yang skip adalah integration test opt-in pada `src/server/auth/user-management.integration.test.ts`, yang hanya berjalan bila `AUTH_INTEGRATION=1` beserta credential Neon non-production. Skip ini disengaja, bukan kegagalan.

### Status source control yang perlu diketahui sebelum membaca tabel di bawah

Ini menentukan gate mana yang **tidak** memiliki bukti CI.

- `HEAD` lokal = `278d3c2`, sama dengan head PR #1 (`milestone-7-publication`).
- `origin/main` masih di `012222a` (Milestone 6). Dua commit (`c4fc6b3` M7, `278d3c2` docs) ada pada branch PR, belum pada `main`.
- **Seluruh pekerjaan M8 Wave 1–3 masih uncommitted** pada worktree (13 file modified, 8 file baru). Konsekuensinya: **tidak ada run CI maupun Deploy Preview yang mencakup M8 Wave 1–3.** Bukti CI/preview di bawah hanya berlaku untuk M7 pada `278d3c2`.

---

## 1. Quality gates

| Gate                                 | Status               | Bukti                                                                                                                                                                                                                                                                                          |
| ------------------------------------ | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, lint, typecheck, test, build | Lulus                | Tabel evidence run di atas, dijalankan lokal 31 Agustus 2026.                                                                                                                                                                                                                                  |
| `db:check` tanpa migration baru      | Lulus                | Evidence run; M8 tidak membuat migration.                                                                                                                                                                                                                                                      |
| CI hijau pada commit yang di-push    | Lulus (M7 saja)      | GitHub Actions workflow `CI`, job `quality`, run `33337642476`, job `99327326513`, conclusion SUCCESS, selesai 2026-08-30T21:55:00Z pada PR #1.                                                                                                                                                |
| CI hijau mencakup M8 Wave 1–3        | **Belum dijalankan** | Wave 1–3 uncommitted; belum ada commit/branch/PR sehingga CI belum pernah menjalankannya.                                                                                                                                                                                                      |
| Clean-checkout `npm ci` + full gate  | Lulus (M7 saja)      | Workflow `CI` menjalankan `npm ci` lalu format, lint, typecheck, test, db:check, dan build pada checkout bersih Ubuntu; run `33337642476` SUCCESS. Belum pernah dijalankan untuk M8 Wave 1–3. Evidence run lokal di atas memakai `node_modules` yang sudah ada, jadi bukan pengganti gate ini. |

## 2. Auth, role, dan permission

| Gate                                          | Status               | Bukti                                                                                                                                                                                                                                                      |
| --------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matrix permission `EDITOR`/`ADVOCATE`/`ADMIN` | Lulus                | `src/server/auth/roles.test.ts` (4 test).                                                                                                                                                                                                                  |
| Public signup nonaktif                        | Lulus                | `src/server/auth/auth.test.ts`; konfigurasi `src/server/auth/auth.ts`.                                                                                                                                                                                     |
| Redirect optimistis bukan authorization       | Lulus                | `src/server/auth/redirect.test.ts`; `src/proxy.ts` hanya redirect, guard di `session.ts`.                                                                                                                                                                  |
| Negative access control tingkat route         | Lulus                | `src/server/content/content-route.test.ts` (19 test): EDITOR/ADVOCATE ditolak publish dan archive, non-approver ditolak mengedit konten terbit, EDITOR ditolak menautkan `reportIds`. Setiap kasus negatif juga menegaskan service tidak pernah dipanggil. |
| Guard terbukti benar-benar diamati            | Lulus                | Wave 2 melumpuhkan enam guard satu per satu dan mencatat test yang gagal, lalu memulihkan file dan memverifikasi checksum. Tabel ada pada `IMPLEMENTATION_STATUS.md` bagian Wave 2.                                                                        |
| Akses management/self-lockout pada Neon       | **Belum dijalankan** | `user-management.integration.test.ts` skip tanpa `AUTH_INTEGRATION=1`.                                                                                                                                                                                     |
| MFA `ADMIN` dan recovery SOP                  | **Keputusan owner**  | Belum diimplementasikan. `SECURITY_PRIVACY.md` bagian 7 menyebutnya Proposed Default.                                                                                                                                                                      |

## 3. Publication privacy dan public projection

| Gate                                               | Status                 | Bukti                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public query tidak menyentuh tabel privat          | Lulus                  | `src/server/content/public-query-isolation.test.ts` (9 test). SQL yang dibangun dirender melalui `PgDialect.sqlToQuery()`, lalu tabel yang disentuh di-assert **sama persis** dengan `advocacy_updates`+`categories` atau `student_info_posts`, dan diperiksa terhadap denylist 11 tabel: `aspiration_reports`, `reporter_identities`, `report_evidence`, `report_status_events`, `internal_notes`, `report_assignments`, `audit_events`, `advocacy_update_reports`, `bem_users`, `auth_sessions`, `auth_accounts`. |
| Draft invisibility pada setiap public path         | Lulus                  | File yang sama: `publication_status` dibandingkan dengan bound parameter `"PUBLISHED"` dan `published_at is not null`, **pada query baris maupun query count**; tidak ada status non-publik (`DRAFT`, `IN_REVIEW`, `SCHEDULED`, `ARCHIVED`) yang pernah terikat pada path publik.                                                                                                                                                                                                                                   |
| Ringkasan publik tidak memuat `body`               | Lulus                  | `src/server/content/publication.test.ts` — key set arsip di-assert eksak, plus pemeriksaan terhadap 15 nama kolom internal. Diverifikasi non-vacuous dengan menyuntikkan `body` ke daftar harapan dan memastikan test gagal.                                                                                                                                                                                                                                                                                        |
| Transition draft/review/publish/archive            | Lulus                  | `publication.test.ts` (matrix penuh status × aksi) dan `publication-flow.test.ts` (28 test) yang menegaskan enam pasangan terlarang gagal **tanpa menerbitkan write**.                                                                                                                                                                                                                                                                                                                                              |
| Optimistic concurrency / stale `expectedUpdatedAt` | Lulus                  | `publication-flow.test.ts`: expectation basi ditolak sebelum write, dan `UPDATE ... WHERE updated_at = expected` yang tidak mengenai baris dilaporkan sebagai konflik.                                                                                                                                                                                                                                                                                                                                              |
| Validasi report linkage                            | Lulus (penolakan saja) | `publication.test.ts` dan `content-route.test.ts`. **Happy path `syncAdvocacyReports` belum tertutup** — butuh integration test.                                                                                                                                                                                                                                                                                                                                                                                    |
| Konten plain-text, tanpa HTML                      | Lulus                  | `publication-flow.test.ts`: markup pada body ditolak; skema URL `javascript:`, `data:`, `vbscript:`, `file:` ditolak.                                                                                                                                                                                                                                                                                                                                                                                               |
| Loop publish→terlihat publik end-to-end            | **Belum dijalankan**   | Properti tingkat database. Prasyarat Neon tercatat di `IMPLEMENTATION_STATUS.md` bagian Wave 2.                                                                                                                                                                                                                                                                                                                                                                                                                     |

## 4. Accessibility dan responsive

| Gate                                                      | Status               | Bukti                                                                                                                                                                                                                                               |
| --------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focus ring tidak dibatalkan komponen                      | Lulus                | `src/components/ui/focus-visibility.test.ts` (5 test). Diverifikasi juga pada CSS hasil build: `focus\:outline-none` dan `focus-visible\:outline-none` **nol kemunculan**, sementara `:focus-visible{outline:3px solid #adc8f5}` tetap dipancarkan. |
| Landmark, skip link, urutan heading                       | Lulus (audit source) | Wave 3: setiap halaman menyediakan `<main id="konten-utama">`, skip link ada di `site-header.tsx`, `h1` ditambahkan pada `loading.tsx`, `not-found.tsx`, `error.tsx` melalui `StateCard headingLevel`.                                              |
| Nama aksesibel link arsip                                 | Lulus                | `src/components/public/article-card.tsx` — `aria-label` menyebut judul artikel; diverifikasi ada pada bundle server hasil build.                                                                                                                    |
| Label dan description form                                | Lulus                | `src/components/ui/field.tsx` — hint dipindah ke `aria-describedby` agar tidak menjadi bagian accessible name.                                                                                                                                      |
| `prefers-reduced-motion`                                  | Lulus (audit source) | `src/app/globals.css` memaksa `reveal-pending` menjadi `opacity: 1`.                                                                                                                                                                                |
| Layout 390px                                              | Lulus (audit source) | Satu-satunya `<table>` dibungkus `overflow-x-auto` dan disembunyikan di bawah `md`.                                                                                                                                                                 |
| Screen reader, keyboard-only, zoom 200%, contrast terukur | **Belum dijalankan** | Tidak dapat diotomatiskan pada environment ini. Daftar rinci ada di `IMPLEMENTATION_STATUS.md` bagian Wave 3.                                                                                                                                       |
| Lighthouse / audit accessibility otomatis                 | **Belum dijalankan** | Disyaratkan `MILESTONE_ROADMAP.md` M8.                                                                                                                                                                                                              |

Catatan jujur: test aksesibilitas yang ada adalah **source-level guard**, bukan render test. Repository tidak memiliki DOM test environment, dan menambahkannya adalah keputusan owner (lihat bagian 10).

## 5. Safe error, headers, dan CSP

| Gate                                     | Status                      | Bukti                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Error publik tidak membocorkan internal  | Lulus                       | `content-route.test.ts`: kegagalan tak terduga menjadi 500 generic; body di-assert tidak memuat pesan asli maupun password pada connection string.                                                                                                                                                                                           |
| Error boundary tidak merender error      | Lulus                       | `src/app/error-boundary.test.ts` (3 test) menolak `error.message`, `error.stack`, `error.digest`, dan serialisasi error. Diverifikasi non-vacuous dengan menyuntikkan pelanggaran nyata.                                                                                                                                                     |
| Tracking failure generic                 | Lulus                       | `src/app/api/aspirasi/lacak/route.ts` memakai satu `genericTrackingFailure()` untuk origin ditolak, input invalid, dan kombinasi salah.                                                                                                                                                                                                      |
| Error tidak bergaya success              | Lulus (audit source)        | `content-manager.tsx` memisahkan `feedbackTone`, memakai `role="alert"` dan gaya `danger`.                                                                                                                                                                                                                                                   |
| Security headers baseline                | Code-complete               | `src/lib/security-headers.ts` + `next.config.ts`; `src/lib/security-headers.test.ts` (9 test); diverifikasi ada pada `.next/routes-manifest.json` untuk `/:path*`. **Belum diverifikasi pada environment ter-deploy** karena Wave 1 belum masuk preview.                                                                                     |
| CSP                                      | Code-complete (report-only) | Sengaja report-only sesuai `SECURITY_PRIVACY.md` bagian 10 ("bertahap"). Promosi ke enforcing menunggu QA browser.                                                                                                                                                                                                                           |
| Origin guard pada mutation sensitif      | Lulus                       | `src/server/security/origin.test.ts` (4 test) mencakup lintas domain, downgrade skema, subdomain, suffix mirip, origin `null`, dan perbedaan port.                                                                                                                                                                                           |
| `no-store`/`noindex` pada response admin | Lulus                       | `content-route.test.ts` meng-assert `cache-control: no-store`, `x-robots-tag: noindex`, `referrer-policy: no-referrer`.                                                                                                                                                                                                                      |
| HSTS                                     | **Keputusan owner**         | Tidak dipasang dari aplikasi karena `max-age` salah tidak dapat dibatalkan. Catatan lapangan: host preview Netlify **sudah** mengembalikan `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`. Apakah domain production kustom mendapat header yang sama adalah setting Netlify/DNS terpisah yang harus diverifikasi. |

## 6. Dependency dan secret scan

| Gate                                 | Status               | Bukti                                                                                                                                                    |
| ------------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency vulnerability scan        | Lulus                | `npm audit` — 0 vulnerabilities, 31 Agustus 2026.                                                                                                        |
| Lockfile ter-commit                  | Lulus                | `package-lock.json` tracked.                                                                                                                             |
| Tidak ada `.env`/dump/log ter-commit | Lulus                | `git ls-files` hanya memuat `.env.example`; `.gitignore` mencakup `.env`, `.env.*`, `/.next/`, `/.netlify/`, `*.log`.                                    |
| Tidak ada secret hardcoded di source | Lulus                | Pemindaian pola pada `src/` dan `scripts/` hanya menemukan `postgresql://runtime-placeholder` di `src/server/db/client.test.ts`, yaitu placeholder test. |
| Secret scanning otomatis di CI       | **Belum dijalankan** | Workflow `CI` saat ini hanya menjalankan format, lint, typecheck, test, db:check, build.                                                                 |

## 7. Environment separation

| Gate                                      | Status              | Bukti                                                                                                               |
| ----------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Neon `main`/production tidak disentuh     | Lulus               | Tidak ada migration dibuat/diterapkan pada M8; `db:check` bersih. Waves 1–4 tidak menjalankan perintah mutasi Neon. |
| Branch non-production terpisah            | Lulus               | `development` dan `preview` terdokumentasi di `IMPLEMENTATION_STATUS.md` bagian M3.                                 |
| Secret hanya server-side                  | Lulus               | `src/server/db/client.ts` membaca `DATABASE_URL` server-side; tidak ada prefix `NEXT_PUBLIC_` pada secret.          |
| Deploy Preview tidak menyentuh production | Code-complete       | Dinyatakan pada `DEPLOYMENT_RUNBOOK.md` bagian 6; belum diverifikasi ulang pada wave ini.                           |
| Credential production                     | **Keputusan owner** | Belum ada dan tidak boleh dibuat oleh worker.                                                                       |

## 8. CI dan Netlify preview

| Gate                         | Status               | Bukti                                                                                                                                                                    |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CI workflow aktif            | Lulus                | `.github/workflows` job `quality`: format, lint, typecheck, test, db:check, build.                                                                                       |
| CI hijau pada PR #1          | Lulus                | Run `33337642476`, conclusion SUCCESS, 2026-08-30T21:55:00Z.                                                                                                             |
| Deploy Preview tersedia      | Lulus                | Status check `netlify/muaraaspirasi/deploy-preview` = SUCCESS, `https://deploy-preview-1--muaraaspirasi.netlify.app`.                                                    |
| Preview tidak publik         | Lulus                | `GET` read-only pada 2026-08-31T05:10Z mengembalikan `HTTP 401` beserta `X-Robots-Tag: noindex`. Preview terlindungi akses.                                              |
| Verifikasi konten preview    | **Diblokir**         | Preview mengembalikan 401, sehingga isi halaman, header aplikasi, dan QA browser tidak dapat diverifikasi otomatis dari sini. Butuh kredensial akses preview dari owner. |
| Preview mencakup M8 Wave 1–3 | **Belum dijalankan** | Preview dibangun dari `278d3c2`, yang **tidak** memuat Wave 1–3 (masih uncommitted).                                                                                     |

> **Koreksi dokumen.** `DEPLOYMENT_RUNBOOK.md` bagian 6 masih mencatat blocker "Netlify team menolak Deploy Preview dengan `Unrecognized Git contributor`". Per pemeriksaan 31 Agustus 2026 status check deploy preview PR #1 adalah **SUCCESS**, sehingga catatan blocker itu sudah usang dan perlu diperbarui oleh pemilik dokumen.

## 9. Rollback, backup/restore, dan incident — placeholder

Belum satu pun dijalankan. Semua membutuhkan environment dan owner, bukan perubahan kode.

| Latihan                                   | Status               | Prasyarat                                                                |
| ----------------------------------------- | -------------------- | ------------------------------------------------------------------------ |
| Application rollback drill                | **Belum dijalankan** | Production/preview stabil + release owner ditetapkan.                    |
| Database restore drill dari restore point | **Belum dijalankan** | Neon plan dengan restore window yang disetujui; RPO/RTO disetujui owner. |
| Credential rotation drill                 | **Belum dijalankan** | Kepemilikan akun organisasi dan daftar credential.                       |
| Incident response tabletop                | **Belum dijalankan** | Incident lead, channel restricted, dan contact list.                     |
| Migration rollback pada preview branch    | **Belum dijalankan** | Tidak ada migration M8; relevan kembali saat schema berubah.             |

Prosedurnya sudah tertulis di `DEPLOYMENT_RUNBOOK.md` bagian 9, 10, dan 13. Yang belum ada adalah **bukti pelaksanaan**.

## 10. Keputusan owner dan provider yang masih terbuka

Dipisahkan dari pekerjaan teknis karena tidak satu pun dapat diselesaikan dengan menulis kode.

| #   | Keputusan                                                  | Kenapa memblokir                                                                                  |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | MFA `ADMIN` dan SOP recovery                               | `SECURITY_PRIVACY.md` bagian 7 menyebutnya syarat production; butuh minimal dua owner organisasi. |
| 2   | Copy kebijakan, kontak BEM, dan SOP eskalasi               | Konten nyata tidak boleh dikarang oleh worker.                                                    |
| 3   | Izin aset dan file master resmi                            | `UX_UI_DESIGN_SYSTEM.md` bagian 12; screenshot bukan asset production.                            |
| 4   | R2 atau provider aset lain beserta credential              | Evidence binary tetap menunggu desain R2; jangan mengaktifkan tanpa scope terpisah.               |
| 5   | Scheduler dan notifikasi eksternal                         | Sengaja tidak ada di MVP; `parseContentAction("schedule")` fail-closed dan diuji.                 |
| 6   | Kebijakan retention/deletion dan privacy notice final      | Butuh review kebijakan, bukan implementasi.                                                       |
| 7   | Neon production, environment, domain, monitoring           | Termasuk plan/region, RPO/RTO, dan siapa pemilik akun.                                            |
| 8   | Kepemilikan backup/restore dan on-call                     | Tanpa ini, latihan pada bagian 9 tidak dapat dijadwalkan.                                         |
| 9   | Promosi CSP ke enforcing dan nonce per-request             | Butuh QA browser pada preview; menghapus `'unsafe-inline'` butuh nonce melalui proxy/middleware.  |
| 10  | HSTS pada domain production                                | `max-age` yang salah di-cache browser dan tidak dapat dibatalkan dari kode.                       |
| 11  | Izin menjalankan integration test pada Neon non-production | Membuka draft invisibility end-to-end dan happy path report linkage.                              |
| 12  | Apakah DOM test environment boleh ditambahkan              | Menentukan apakah coverage aksesibilitas dapat melampaui source guard.                            |
| 13  | Apakah browser journey (Playwright) masuk M8               | Disyaratkan `MILESTONE_ROADMAP.md` M8; menambah dependency dan langkah CI.                        |
| 14  | Kredensial akses Deploy Preview                            | Preview mengembalikan 401, sehingga QA browser dan verifikasi header ter-deploy terhambat.        |

## 11. Ringkasan kesiapan M8

- **Sudah code-complete dengan bukti test**: isolasi query publik, draft invisibility tingkat SQL, transition dan approval, optimistic concurrency, origin guard, safe error, security headers baseline, CSP report-only, perbaikan focus ring dan label.
- **Belum dijalankan sama sekali**: browser journey, Lighthouse/screen reader/keyboard/zoom/contrast, clean-checkout `npm ci`, secret scanning di CI, integration test Neon, serta seluruh latihan rollback/restore/incident.
- **Blocker paling dekat**: M8 Wave 1–3 masih uncommitted sehingga belum pernah melewati CI atau Deploy Preview. Sampai perubahan itu masuk branch/PR, tidak ada bukti CI untuk M8.
- **Sesuai `MILESTONE_ROADMAP.md` M8**, acceptance "No high-severity known gap" belum dapat dinyatakan tercapai karena beberapa validasi wajib di atas belum dijalankan.

Milestone 9 (deployment dan limited launch) tidak boleh dimulai sebelum bagian 9 dan 10 dokumen ini memiliki isi, bukan placeholder.
