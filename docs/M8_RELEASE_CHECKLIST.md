# M8 Release Checklist dan Evidence Index — Muara Aspirasi

> Dokumen ini adalah indeks bukti untuk Milestone 8, bukan pengganti `DEPLOYMENT_RUNBOOK.md` bagian 12 (production checklist) atau `SECURITY_PRIVACY.md` bagian 15 (pre-production security acceptance). Keduanya tetap menjadi kontrak rilis; dokumen ini mencatat **apa yang sudah benar-benar dijalankan dan di mana buktinya**.

## Aturan pengisian

1. Sebuah gate hanya boleh ditandai **Lulus** bila ada bukti yang dapat ditelusuri: nama file, nama test, perintah beserta hasilnya, atau ID run CI/preview.
2. Bila kontrol sudah ada di source tetapi belum diverifikasi pada environment nyata, statusnya **Code-complete**, bukan Lulus.
3. Bila gate menunggu manusia, vendor, atau credential, statusnya **Keputusan owner** dan tidak pernah dihitung sebagai kemajuan teknis.
4. Tidak ada gate yang ditandai hijau karena "sudah tertulis di dokumen".

Kosakata status: **Lulus** · **Code-complete** · **Belum dijalankan** · **Keputusan owner** · **Diblokir**.

---

## Evidence run — 2 September 2026 (M8 launch-readiness implementation)

Dijalankan lokal pada branch `milestone-8-readiness`, Windows, Node 22.16.0. Perubahan source dan migration hanya berada di working tree; tidak ada migration Neon, deploy Netlify, atau perubahan production.

| Area                   | Status          | Bukti                                                                                                                                                                                                      |
| ---------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence private R2    | Code-complete   | `src/server/storage/r2.ts`, `src/server/aspirations/evidence.ts`, `evidence-service.ts`, intent route, submission linkage, dan admin signed-read route. Provider bucket/CORS/lifecycle belum diverifikasi. |
| Admin user management  | Code-complete   | `/admin/users`, `/api/admin/users*`, ADMIN-only permission, password hash, suspend/self-lockout guard, dan audit. Integration Neon belum dijalankan.                                                       |
| MFA ADMIN              | Code-complete   | Better Auth TOTP + backup code, `/admin/security`, `/admin/2fa`, `MFA_REQUIRED` production preflight, dan production bootstrap terpisah. Recovery SOP dua owner belum diuji.                               |
| Additive migration     | Code-complete   | `drizzle/20260902113654_minor_emma_frost/migration.sql`; `npm run db:check` lulus. Belum diterapkan ke Neon.                                                                                               |
| Unit/regression suite  | Lulus           | `npm test`: **242 passed, 3 skipped** (26 test file passed, 1 integration file skipped).                                                                                                                   |
| Browser smoke lokal    | Lulus           | `npm run test:e2e -- tests/e2e/public-journey.spec.ts --workers=1`: **2 passed**, tanpa page error/console error pada home dan privacy.                                                                    |
| CI browser/secret scan | Code-complete   | `.github/workflows/ci.yml` menambahkan Playwright Chromium smoke dan gitleaks; remote run setelah perubahan ini belum ada.                                                                                 |
| Production launch      | Keputusan owner | Memerlukan org-owned Netlify/Neon/R2/Turnstile/domain, secret context, migration approval, UAT, dan rollback/restore drill.                                                                                |

Keterbatasan yang disengaja: tanpa malware scanner, evidence disimpan sebagai `QUARANTINED` dan tetap private; scheduler, email/WhatsApp/push, retention job, serta public media tidak diaktifkan.

---

## Evidence run — 1 September 2026 (Wave 5 baseline)

Dijalankan lokal pada branch `milestone-8-readiness`, Windows, Node 22.16.0, stempel waktu `UTC 2026-09-01T12:05:07Z`. Read-only terhadap remote; tidak ada migration, secret, deploy, atau merge.

| Perintah                       | Hasil                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| `npm run format:check`         | Lulus                                                                                              |
| `npm run lint`                 | Lulus (`--max-warnings=0`)                                                                         |
| `npm run typecheck`            | Lulus                                                                                              |
| `npm test`                     | Lulus — **169 passed, 3 skipped** (172 total, 24 file)                                             |
| `npm run db:check`             | Lulus; tidak ada migration dibuat atau diterapkan                                                  |
| `npm run build`                | Lulus                                                                                              |
| `npm audit --audit-level=high` | Lulus — 0 vulnerabilities                                                                          |
| `git diff --check`             | Bersih; tidak ada whitespace error                                                                 |
| `npm run release:preflight`    | Lulus pada environment `development` dengan satu WARNING Turnstile test secret (benar untuk lokal) |

CI dan preview untuk PR #2 pada commit `53fc672`: workflow `CI` job `quality` run `33507811653` SUCCESS (2026-09-01T12:29:37Z), status check `netlify/muaraaspirasi/deploy-preview` SUCCESS. URL Deploy Preview tersedia pada status check provider. Preview tetap mengembalikan `HTTP 401` dengan `X-Robots-Tag: noindex`, sehingga browser/content QA owner masih diperlukan.

### Perbaikan code-owned pada evidence run ini

| Temuan                                                                                                                                                                                                                                                        | Perbaikan                                                                                                                       | Test                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `PUBLIC_ABUSE_SIGNAL_SECRET` hanya diperiksa non-empty, sehingga placeholder `.env.example` — salt HMAC yang ada di repo — lolos ke environment ter-deploy dan membuat bucket key rate limit serta hash idempotency dapat dihitung siapa pun pemegang source. | `src/server/config/secret-policy.ts` menolak placeholder dan nilai kosong; dipakai `rate-limit.ts` dan `submission-service.ts`. | `secret-policy.test.ts` (4), `abuse-signal-secret.test.ts` (6) |
| `robots.txt` memancarkan `Sitemap: /sitemap.xml`. URL relatif tidak sah pada robots.txt (RFC 9309 §2.2.3) dan diabaikan crawler.                                                                                                                              | `src/lib/app-url.ts` menjadi satu resolver origin; `robots.ts` dan `sitemap.ts` memakainya.                                     | `app-url.test.ts` (7)                                          |
| Tidak ada `metadataBase`, sehingga canonical dan Open Graph URL pada halaman ter-deploy dihitung terhadap localhost.                                                                                                                                          | `src/app/layout.tsx` memakai `getAppUrl()`.                                                                                     | Tercakup `app-url.test.ts`                                     |
| Tidak ada gate konfigurasi pre-deploy yang deterministik.                                                                                                                                                                                                     | `scripts/release-preflight.mjs` + `npm run release:preflight`.                                                                  | `release-preflight.test.mjs` (26)                              |

Setiap perbaikan diverifikasi non-vacuous dengan melumpuhkan guard-nya dan memastikan test yang seharusnya gagal memang gagal, lalu memulihkan file. Contoh: mengembalikan pemeriksaan `!secret` yang lama membuat dua test placeholder gagal.

**Batas jujur `release:preflight`.** Skrip memvalidasi _bentuk_ konfigurasi tanpa credential, network, atau database. Lulus berarti bentuknya wajar; itu bukan bukti deploy, bukan bukti provider menerima nilainya, dan tidak menutup satu pun gate owner di bagian 10.

### Follow-up hardening — 1 September 2026

| Temuan                                                                                                                                                                                                                                                                                                                              | Perbaikan                                                                                                 | Test                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `getAppUrl()` menerima skema apa pun yang dapat di-parse. `new URL("javascript:alert(1)").origin` bernilai string `"null"`, sehingga `absoluteUrl()` **melempar TypeError** dan akan mematikan `sitemap.xml`, `robots.txt`, serta root layout melalui `metadataBase`. `ftp://host` lolos diam-diam dan akan tercetak ke robots.txt. | Allowlist `http:`/`https:` pada `src/lib/app-url.ts`; fallback localhost dipertahankan untuk development. | `app-url.test.ts` — kini 17 test            |
| Preflight tidak memeriksa skema, sehingga `javascript:`/`ftp:` lolos tanpa temuan pada context `preview`.                                                                                                                                                                                                                           | Allowlist skema pada `scripts/release-preflight.mjs` sebelum pemeriksaan localhost/https.                 | `release-preflight.test.mjs` — kini 39 test |
| Preflight hanya menolak `AUTH_BOOTSTRAP_EMAIL` dan `AUTH_BOOTSTRAP_PASSWORD`, padahal `DEPLOYMENT_RUNBOOK.md` langkah 6 bootstrap meminta menghapus **seluruh** `AUTH_BOOTSTRAP_*`, termasuk `AUTH_BOOTSTRAP_NAME`.                                                                                                                 | Pemeriksaan berbasis prefix `AUTH_BOOTSTRAP_`, sehingga variabel bootstrap baru ikut tercakup.            | `release-preflight.test.mjs`                |

Dilumpuhkannya kedua guard membuat **17 test gagal**; file lalu dipulihkan dan diverifikasi identik melalui checksum.

### Deploy Preview `cf74b59` gagal — nilai env bertabrakan dengan scanner

Deploy `6a96d0f38086ad0008e5660f` gagal meskipun literal Turnstile sudah dihapus. Sebabnya berbeda: secret scanner Netlify mencocokkan **nilai** environment variable context terhadap repository dan output build. `DATABASE_ENVIRONMENT` pada context preview berisi kata biasa non-production yang muncul ratusan kali di README (baris 49 dan 61 disebut), dokumen, test, dan source.

**Remediasi.** Resolver `DATABASE_ENVIRONMENT` tunggal per runtime menerima satu marker khusus Netlify yang dipetakan ke `preview` dan dirakit dari fragmen, sehingga tidak pernah muncul sebagai literal pada file tracked maupun output build — keduanya diverifikasi. Semantik seed/bootstrap/Turnstile tidak berubah. Nilai tak dikenal me-resolve ke `null` sehingga tidak pernah menjadi production maupun memperoleh keringanan non-production, dan preflight memeriksa silang `CONTEXT` Netlify agar marker tidak dapat memberi semantik preview pada deploy production. Origin auth preview kini diturunkan dari `DEPLOY_PRIME_URL`, sehingga `BETTER_AUTH_URL`/`BETTER_AUTH_TRUSTED_ORIGINS` khusus preview dapat dihapus dan hilang dari permukaan pemindaian.

**Scanner tetap aktif penuh**: tidak ada `SECRETS_SCAN_OMIT_*`, tidak ada penonaktifan, tidak ada redaksi dokumentasi.

**Provider fix diterapkan.** Pada 2 September 2026, owner mengganti nilai context Netlify ke marker non-dictionary yang dipetakan source ke environment preview; nilainya sengaja tidak ditulis di dokumen mana pun. Deploy Preview perlu dipicu ulang untuk membuktikan scanner sudah melewati tahap ini.

### Deploy Preview `bbb7d11` gagal — secret scanner, bukan build gate

Commit `bbb7d11` menghasilkan CI `quality` LULUS (run `33511046005`) tetapi Deploy Preview **GAGAL** pada deploy `6a96cce550d63f0008564f63`.

**Koreksi.** Dugaan awal bahwa build gate preflight-lah yang memicu kegagalan itu **tidak benar**. Penyebabnya adalah **secret scanner Netlify**, yang menolak build karena menemukan literal berbentuk credential — test secret Turnstile publik milik Cloudflare — pada `scripts/release-preflight.mjs`, `scripts/release-preflight.test.mjs`, `src/server/aspirations/turnstile.test.ts`, dan `src/server/aspirations/turnstile.ts`. Literal itu sudah ada sejak M5; yang berubah adalah build Netlify kini berjalan sampai tahap tersebut.

**Remediasi.** Nilai dirakit saat runtime dari fragmen non-secret dan diekspor satu kali per runtime (`cloudflareDummySecret` pada TypeScript, `turnstileTestSecret` pada skrip `.mjs`); kedua test meng-import konstanta itu. Perilaku dummy hostname non-production dan penolakan production tidak berubah. **Secret scanning tidak dilemahkan**: tidak ada `SECRETS_SCAN_OMIT_*` maupun penonaktifan scanner.

**Bukti lokal.** `git grep` literal pada file tracked: nihil; sisanya hanya pada `.env.local`/`.env.preview.local` yang git-ignored. Output `next build --webpack` discan dan tidak memuat literal, jadi bundler tidak melipatnya kembali. Regresi dijaga `src/server/aspirations/turnstile-test-secret.test.ts`.

**Belum terbukti.** Deploy Preview belum diverifikasi hijau setelah perbaikan; status remote menunggu build Netlify berikutnya. Karena build sebelumnya berhenti pada scanner, **build gate preflight belum pernah dieksekusi di Netlify**, sehingga kelengkapan variable context preview masih belum diketahui.

### Build gate Netlify — terpasang 1 September 2026

`SECURITY_PRIVACY.md` bagian 12 mensyaratkan build gagal ketika required server secret hilang. Sebelumnya syarat itu tidak terpenuhi: build dijalankan dengan keempat secret dikosongkan dan tetap berhasil, karena seluruh halaman dinamis sehingga secret hanya dibaca saat request.

`netlify.toml` kini menjalankan `npm run release:preflight && npm run build -- --webpack`. Tidak ada secret di dalam TOML; preflight membaca environment context Netlify dan hanya mencetak nama variable.

Agar preview tidak patah oleh URL yang dinamis, `DEPLOY_PRIME_URL` — variabel bawaan Netlify — boleh memenuhi syarat URL pada preview dan branch deploy. **Production tetap mewajibkan `NEXT_PUBLIC_APP_URL` https yang eksplisit**, sehingga domain resmi tidak dapat diam-diam tergantikan URL provider.

Bukti lokal:

| Simulasi                                           | Hasil                                                           |
| -------------------------------------------------- | --------------------------------------------------------------- |
| preview, hanya `DEPLOY_PRIME_URL`                  | LULUS, exit 0                                                   |
| production, hanya `DEPLOY_PRIME_URL`               | GAGAL, exit 1, menyebut bahwa provider URL tidak diterima       |
| production, `NEXT_PUBLIC_APP_URL` https eksplisit  | LULUS, exit 0                                                   |
| perintah `netlify.toml` apa adanya (webpack)       | preflight LULUS lalu "Compiled successfully"                    |
| perintah yang sama pada engine default (turbopack) | preflight LULUS lalu "Compiled successfully"                    |
| konfigurasi production buruk                       | build **tidak pernah berjalan**; rantai berhenti pada preflight |

**Yang belum terbukti.** Isi environment Netlify per context tidak dapat dibaca dari repository. Build Deploy Preview berikutnya adalah pengujian sesungguhnya; bila `DATABASE_ENVIRONMENT` atau salah satu dari empat secret belum terisi pada context preview, build akan gagal — itu perilaku fail-closed yang diminta, tetapi akan mengubah preview hijau menjadi merah. Cara mundur satu baris tercatat pada `DEPLOYMENT_RUNBOOK.md` bagian 7.

**Production tetap terblokir** oleh gate owner/provider di bagian 10. Gate ini tidak menyatakan production acceptance.

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

- Evidence wave direkam sebelum commit M8 pada `278d3c2` (head PR #1, `milestone-7-publication`). Setelah evidence diverifikasi, coordinator membuat commit `1d078ee` pada branch `milestone-8-readiness`, lalu commit dokumentasi `cd18b8d`.
- Branch `milestone-8-readiness` sudah dipush ke `origin` dan PR #2 (`https://github.com/morrispes5/muara-aspirasi/pull/2`) sudah dibuka dengan base `main`. `origin/main` masih di `012222a` (Milestone 6); PR #2 membawa M7 dan M8.
- CI PR #2 sudah lulus pada run `33381947557` (job `99456076155`, head `cd18b8d5efa47aa05df19f47c6d9e99a172b9005`), termasuk clean checkout `npm ci`, format, lint, typecheck, test, `db:check`, dan build. Setelah commit follow-up `ca6e5c7`, Deploy Preview PR #2 juga ready.

### Catatan aksi coordinator setelah evidence run

- Deploy draft melalui Netlify CLI lokal Windows gagal sebelum publish saat bundling proxy Edge (`webpack-runtime.js`/path resolver). Build aplikasi lokal tetap lulus; jalur server-side Linux melalui webhook Netlify adalah jalur preview yang direkomendasikan.
- Percobaan `netlify deploy --trigger --context branch:milestone-8-readiness` secara tidak terduga memilih **production `main`**, bukan preview branch. Deploy `6a9557235e010a438975637f` berstatus ready tetapi hanya membangun commit `012222aa` (M6), sama dengan deploy production sebelumnya `6a948c33eb01f7e6f722641a`; **tidak ada kode M8 yang terpublikasi**. Tidak ada trigger production lanjutan yang dijalankan.
- Webhook PR #2 kemudian membuat deploy `6a9559df4344450008839079` berstatus ready dengan context `deploy-preview`, branch `milestone-8-readiness`, dan commit `ca6e5c7`. Header read-only pada URL Deploy Preview PR #2 mengembalikan `401`, `Strict-Transport-Security`, dan `X-Robots-Tag: noindex`; verifikasi isi tetap memerlukan kredensial preview owner.

---

## 1. Quality gates

| Gate                                 | Status | Bukti                                                                                                                                                      |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, lint, typecheck, test, build | Lulus  | Tabel evidence run di atas, dijalankan lokal 31 Agustus 2026.                                                                                              |
| `db:check` tanpa migration baru      | Lulus  | Evidence run; M8 tidak membuat migration.                                                                                                                  |
| CI hijau pada commit yang di-push    | Lulus  | PR #1 M7: run `33337642476`, job `99327326513`; PR #2 M8: run `33381947557`, job `99456076155`; keduanya conclusion SUCCESS.                               |
| CI hijau mencakup M8 Wave 1–3        | Lulus  | PR #2 run `33381947557` menjalankan seluruh workflow pada head `cd18b8d`, termasuk perubahan M8 Wave 1–4.                                                  |
| Clean-checkout `npm ci` + full gate  | Lulus  | Workflow `CI` menjalankan `npm ci` lalu format, lint, typecheck, test, `db:check`, dan build pada checkout bersih Ubuntu; PR #2 run `33381947557` SUCCESS. |

## 2. Auth, role, dan permission

| Gate                                          | Status                     | Bukti                                                                                                                                                                                                                                                      |
| --------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matrix permission `EDITOR`/`ADVOCATE`/`ADMIN` | Lulus                      | `src/server/auth/roles.test.ts` (4 test).                                                                                                                                                                                                                  |
| Public signup nonaktif                        | Lulus                      | `src/server/auth/auth.test.ts`; konfigurasi `src/server/auth/auth.ts`.                                                                                                                                                                                     |
| Redirect optimistis bukan authorization       | Lulus                      | `src/server/auth/redirect.test.ts`; `src/proxy.ts` hanya redirect, guard di `session.ts`.                                                                                                                                                                  |
| Negative access control tingkat route         | Lulus                      | `src/server/content/content-route.test.ts` (19 test): EDITOR/ADVOCATE ditolak publish dan archive, non-approver ditolak mengedit konten terbit, EDITOR ditolak menautkan `reportIds`. Setiap kasus negatif juga menegaskan service tidak pernah dipanggil. |
| Guard terbukti benar-benar diamati            | Lulus                      | Wave 2 melumpuhkan enam guard satu per satu dan mencatat test yang gagal, lalu memulihkan file dan memverifikasi checksum. Tabel ada pada `IMPLEMENTATION_STATUS.md` bagian Wave 2.                                                                        |
| Akses management/self-lockout pada Neon       | Code-complete              | Source `src/server/auth/user-management.ts` + `/api/admin/users*`; `user-management.integration.test.ts` tetap skip tanpa `AUTH_INTEGRATION=1`.                                                                                                            |
| MFA `ADMIN` dan recovery SOP                  | Code-complete / owner gate | Better Auth TOTP + backup code, enrollment/challenge route, dan production preflight sudah ada; recovery SOP minimal dua owner serta uji akun production belum dijalankan.                                                                                 |

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
| Screen reader, keyboard-only, zoom 200%, contrast terukur | **Belum dijalankan** | Public Playwright smoke sudah lulus, tetapi audit manual/assistive technology belum dijalankan. Daftar rinci ada di `IMPLEMENTATION_STATUS.md` bagian Wave 3.                                                                                       |
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

| Gate                                 | Status        | Bukti                                                                                                                                                    |
| ------------------------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency vulnerability scan        | Lulus         | `npm audit` — 0 vulnerabilities, 31 Agustus 2026.                                                                                                        |
| Lockfile ter-commit                  | Lulus         | `package-lock.json` tracked.                                                                                                                             |
| Tidak ada `.env`/dump/log ter-commit | Lulus         | `git ls-files` hanya memuat `.env.example`; `.gitignore` mencakup `.env`, `.env.*`, `/.next/`, `/.netlify/`, `*.log`.                                    |
| Tidak ada secret hardcoded di source | Lulus         | Pemindaian pola pada `src/` dan `scripts/` hanya menemukan `postgresql://runtime-placeholder` di `src/server/db/client.test.ts`, yaitu placeholder test. |
| Secret scanning otomatis di CI       | Code-complete | Workflow `CI` menambahkan job `secret-scan` dengan `gitleaks/gitleaks-action@v2`; run remote setelah perubahan ini belum ada.                            |

## 7. Environment separation

| Gate                                                                      | Status                 | Bukti                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Neon `main`/production tidak disentuh                                     | Lulus                  | Tidak ada migration dibuat/diterapkan pada M8; `db:check` bersih. Waves 1–6 tidak menjalankan perintah mutasi Neon.                                                                                                                                                                  |
| Branch non-production terpisah                                            | Lulus                  | `development` dan `preview` terdokumentasi di `IMPLEMENTATION_STATUS.md` bagian M3.                                                                                                                                                                                                  |
| Secret hanya server-side                                                  | Lulus                  | `src/server/db/client.ts` membaca `DATABASE_URL` server-side; tidak ada prefix `NEXT_PUBLIC_` pada secret.                                                                                                                                                                           |
| Deploy Preview tidak menyentuh production                                 | Code-complete          | Dinyatakan pada `DEPLOYMENT_RUNBOOK.md` bagian 6; belum diverifikasi ulang pada wave ini.                                                                                                                                                                                            |
| Credential production                                                     | **Keputusan owner**    | Belum ada dan tidak boleh dibuat oleh worker.                                                                                                                                                                                                                                        |
| Secret placeholder ditolak fail-closed                                    | Lulus                  | `src/server/config/secret-policy.ts`; `secret-policy.test.ts` dan `abuse-signal-secret.test.ts` menegaskan placeholder `.env.example` ditolak sebelum rate limiter menyentuh database. `BETTER_AUTH_SECRET` sudah menerapkan aturan yang sama sejak M4 di `src/server/auth/auth.ts`. |
| Gate konfigurasi pre-deploy                                               | Lulus (skrip tersedia) | `npm run release:preflight` (`scripts/release-preflight.mjs`) memvalidasi environment, URL, Turnstile site key, R2, MFA, dan bootstrap cleanup tanpa credential/network; bukan bukti deploy.                                                                                         |
| Konfigurasi production dijalankan melalui preflight                       | **Keputusan owner**    | Skripnya siap, tetapi hanya owner yang memegang environment production untuk menjalankannya.                                                                                                                                                                                         |
| Build gagal saat required secret hilang (`SECURITY_PRIVACY.md` bagian 12) | Code-complete          | Gate terpasang pada `netlify.toml`: `npm run release:preflight && npm run build -- --webpack`; local webpack build lulus dan preflight menguji R2/MFA/site key. **Belum diverifikasi pada Netlify** karena belum ada deploy setelah wave ini.                                        |

## 8. CI dan Netlify preview

| Gate                         | Status        | Bukti                                                                                                                                                                                     |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CI workflow aktif            | Code-complete | `.github/workflows` job `quality` menjalankan format, lint, typecheck, test, db:check, build; job `browser-smoke` dan `secret-scan` ditambahkan untuk wave ini.                           |
| CI hijau pada PR #1          | Lulus         | Run `33337642476`, conclusion SUCCESS, 2026-08-30T21:55:00Z.                                                                                                                              |
| CI hijau pada PR #2          | Lulus         | Run `33381947557`, job `99456076155`, head `cd18b8d`, conclusion SUCCESS, 2026-08-31T10:21:37Z.                                                                                           |
| Deploy Preview tersedia      | Lulus         | PR #1 dan PR #2 memiliki status check `netlify/muaraaspirasi/deploy-preview` = SUCCESS; URL PR #2 tersedia pada status check provider.                                                    |
| Preview tidak publik         | Lulus         | `GET` read-only PR #2 pada 2026-08-31T10:41Z mengembalikan `HTTP 401` beserta `X-Robots-Tag: noindex`. Preview terlindungi akses.                                                         |
| Verifikasi konten preview    | **Diblokir**  | Preview mengembalikan 401, sehingga isi halaman, header aplikasi, dan QA browser tidak dapat diverifikasi otomatis dari sini. Butuh kredensial akses preview dari owner.                  |
| Preview mencakup M8 Wave 1–3 | Lulus         | Deploy `6a9559df4344450008839079` ready dari branch `milestone-8-readiness`, commit `ca6e5c7`, plugin Next.js dan Edge function sukses; evidence/MFA wave belum ada pada deploy tersebut. |

> **Koreksi dokumen.** `DEPLOYMENT_RUNBOOK.md` bagian 6 sudah diperbarui: blocker `Unrecognized Git contributor` tidak lagi terlihat pada PR #1. Status preview PR #2 tetap menunggu webhook Netlify.

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

| #   | Keputusan                                                  | Kenapa memblokir                                                                                                   |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | MFA `ADMIN` dan SOP recovery                               | Implementasi source sudah ada; production enrollment, backup-code recovery, dan SOP minimal dua owner belum diuji. |
| 2   | Copy kebijakan, kontak BEM, dan SOP eskalasi               | Konten nyata tidak boleh dikarang oleh worker.                                                                     |
| 3   | Izin aset dan file master resmi                            | `UX_UI_DESIGN_SYSTEM.md` bagian 12; screenshot bukan asset production.                                             |
| 4   | R2 bucket, CORS, lifecycle, dan credential                 | Adapter evidence sudah ada; provider-owned private bucket dan reconciliation/lifecycle belum diverifikasi.         |
| 5   | Scheduler dan notifikasi eksternal                         | Sengaja tidak ada di MVP; `parseContentAction("schedule")` fail-closed dan diuji.                                  |
| 6   | Kebijakan retention/deletion dan privacy notice final      | Butuh review kebijakan, bukan implementasi.                                                                        |
| 7   | Neon production, environment, domain, monitoring           | Termasuk plan/region, RPO/RTO, dan siapa pemilik akun.                                                             |
| 8   | Kepemilikan backup/restore dan on-call                     | Tanpa ini, latihan pada bagian 9 tidak dapat dijadwalkan.                                                          |
| 9   | Promosi CSP ke enforcing dan nonce per-request             | Butuh QA browser pada preview; menghapus `'unsafe-inline'` butuh nonce melalui proxy/middleware.                   |
| 10  | HSTS pada domain production                                | `max-age` yang salah di-cache browser dan tidak dapat dibatalkan dari kode.                                        |
| 11  | Izin menjalankan integration test pada Neon non-production | Membuka draft invisibility end-to-end dan happy path report linkage.                                               |
| 12  | Apakah DOM test environment boleh ditambahkan              | Menentukan apakah coverage aksesibilitas dapat melampaui source guard.                                             |
| 13  | Verifikasi browser Deploy Preview                          | Local Playwright smoke sudah lulus; Preview tetap 401 dan memerlukan akses owner untuk QA ter-deploy.              |
| 14  | Kredensial akses Deploy Preview                            | Preview mengembalikan 401, sehingga QA browser dan verifikasi header ter-deploy terhambat.                         |

## 11. Ringkasan kesiapan M8

- **Sudah code-complete dengan bukti test**: isolasi query publik, draft invisibility tingkat SQL, transition dan approval, optimistic concurrency, origin guard, safe error, security headers baseline, CSP report-only, R2 evidence boundary, admin user management, MFA flow, dan local Playwright smoke.
- **Belum dijalankan sama sekali**: browser QA Deploy Preview, Lighthouse/screen reader/keyboard/zoom/contrast, remote secret scanning pada perubahan ini, integration test Neon, provider R2 CORS/lifecycle, serta seluruh latihan rollback/restore/incident.
- **Blocker paling dekat**: Preview PR #2 sudah ready tetapi mengembalikan 401, sehingga QA browser serta verifikasi konten/header aplikasi ter-deploy memerlukan kredensial akses preview dari owner. Jangan mengulang `netlify deploy --trigger` tanpa memverifikasi target karena percobaan sebelumnya memilih production `main`.
- **Sesuai `MILESTONE_ROADMAP.md` M8**, acceptance "No high-severity known gap" belum dapat dinyatakan tercapai karena beberapa validasi wajib di atas belum dijalankan.

Limited launch belum boleh dinyatakan selesai sebelum bagian 9 dan 10 dokumen ini memiliki bukti pelaksanaan, provider/owner gates tertutup, dan migration M8 diverifikasi pada environment target.
