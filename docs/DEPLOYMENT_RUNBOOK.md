# Deployment Runbook — Muara Aspirasi

> Status: deployment plan untuk MVP. Project Neon development/preview Muara Aspirasi sudah diprovision terpisah; migration M3/M4/M5, seed sintetis, bootstrap auth, dan acceptance M4/M5 telah diverifikasi pada keduanya. M6 tidak menambah migration dan quality gate source sudah lulus. Deployment dan seluruh konfigurasi production belum dilakukan.

> Addendum 31 Agustus 2026: M7 source sekarang memiliki admin/public publication routes dan regression tests. Preview deploy boleh dilakukan setelah quality gates lulus; jangan menjalankan migration baru, memasukkan credential production, atau mempublikasikan konten nyata sebelum owner approval.

## 1. Tujuan dan ownership

Runbook ini menetapkan cara membawa aplikasi dari development ke preview lalu production tanpa mencampur data/credential atau melewati quality gate.

Prinsip ownership:

- GitHub, Netlify, Neon, Cloudflare, domain, dan mailbox recovery dimiliki organisasi BEM/FTI, bukan satu akun personal;
- minimal dua owner manusia memiliki recovery access;
- role vendor menerapkan least privilege;
- perubahan production dapat ditelusuri ke pull request, actor, dan deployment;
- production database/storage tidak digunakan untuk development atau preview.

## 2. Platform target

| Kebutuhan         | Rekomendasi                                                               | Status                                                                                                                             |
| ----------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Source control/CI | GitHub + workflow `.github/workflows/ci.yml`                              | Repository privat terhubung; perubahan saat ini langsung ke `main`.                                                                |
| Web hosting       | Netlify Next.js runtime                                                   | `netlify.toml` baseline tersedia.                                                                                                  |
| Database          | Neon PostgreSQL                                                           | Project `muara-aspirasi` free; branch development/preview sudah dimigrasikan dan diberi seed sintetis. M6 memakai schema yang ada. |
| ORM/migration     | Drizzle ORM + Drizzle Kit                                                 | Schema, migration reviewable, data access awal, dan command operasional M3 tersedia.                                               |
| Auth              | Better Auth pada Next.js                                                  | Milestone 4 selesai pada development/preview; production belum dikonfigurasi.                                                      |
| Anti-spam         | Cloudflare Turnstile                                                      | Kode M5 memakai Siteverify; dummy key resmi hanya ada di development/preview, widget production belum dibuat.                      |
| Object storage    | Cloudflare R2                                                             | Belum dikonfigurasi.                                                                                                               |
| DNS/TLS           | Domain organisasi melalui provider yang disetujui                         | Domain belum diputuskan.                                                                                                           |
| Monitoring        | Netlify logs/metrics + application error/health monitoring yang disetujui | Provider tambahan belum dipilih.                                                                                                   |

Netlify mendukung App Router/Server Components melalui adapter Next.js yang dikelola platform. Tidak perlu menambahkan adapter manual kecuali dokumentasi Netlify versi yang dipakai meminta perubahan.

## 3. Environment

| Environment | Source                  | App URL                    | Database                                         | Storage                           | Data policy                                  |
| ----------- | ----------------------- | -------------------------- | ------------------------------------------------ | --------------------------------- | -------------------------------------------- |
| Development | Working tree lokal      | `localhost`                | Dedicated development branch/database            | Dev bucket/prefix                 | Synthetic data; jangan salin PII production. |
| Preview     | Pull request            | Netlify Deploy Preview URL | Per-PR Neon branch atau dedicated preview branch | Preview bucket/prefix             | Synthetic/sanitized data only.               |
| Production  | `main` setelah approval | Domain resmi HTTPS         | Protected production branch                      | Production private/public buckets | Real data sesuai privacy/retention policy.   |

Aturan:

- branch/database writable terpisah per environment;
- credential dan Turnstile key terpisah per context;
- migration diuji pada development/preview sebelum production;
- preview tidak mengirim notifikasi nyata;
- preview admin/login harus dibatasi dan tidak memakai real BEM account kecuali UAT terkontrol.

## 4. Environment variable terencana

Daftar berikut hanya nama dan fungsi. Placeholder database dan auth tersedia di `.env.example`; value nyata tetap hanya berada di `.env.local`/secret store.

| Nama                                   | Scope            | Fungsi                                                        |                            Secret? |
| -------------------------------------- | ---------------- | ------------------------------------------------------------- | ---------------------------------: |
| `NEXT_PUBLIC_APP_URL`                  | Client + server  | Base URL/canonical origin aplikasi.                           |                              Tidak |
| `DATABASE_URL`                         | Server           | Neon pooled connection string untuk runtime aplikasi.         |                                 Ya |
| `DATABASE_URL_UNPOOLED`                | Build/ops server | Direct connection untuk migration terkontrol.                 |                                 Ya |
| `BETTER_AUTH_SECRET`                   | Server           | Signing/encryption secret Better Auth.                        |                                 Ya |
| `BETTER_AUTH_URL`                      | Server           | Trusted canonical auth origin.                                | Tidak, tetapi environment-specific |
| `BETTER_AUTH_TRUSTED_ORIGINS`          | Server           | Comma-separated origin allowlist untuk callback/auth request. | Tidak, tetapi environment-specific |
| `BEM_ALLOWED_EMAIL_DOMAINS`            | Ops              | Optional domain allowlist untuk bootstrap admin BEM.          |                              Tidak |
| `AUTH_BOOTSTRAP_NAME`                  | One-time ops     | Nama admin awal; hapus setelah bootstrap.                     |                              Tidak |
| `AUTH_BOOTSTRAP_EMAIL`                 | One-time ops     | Email admin awal; hapus setelah bootstrap.                    |                              Tidak |
| `AUTH_BOOTSTRAP_PASSWORD`              | One-time ops     | Password admin awal; hapus setelah bootstrap.                 |                                 Ya |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`       | Client + server  | Public Turnstile widget site key.                             |                              Tidak |
| `TURNSTILE_SECRET_KEY`                 | Server           | Server-side Siteverify credential.                            |                                 Ya |
| `R2_ACCOUNT_ID`                        | Server           | Cloudflare account identifier.                                |                  Restricted config |
| `R2_ACCESS_KEY_ID`                     | Server           | R2 S3 API credential ID.                                      |                                 Ya |
| `R2_SECRET_ACCESS_KEY`                 | Server           | R2 S3 API credential secret.                                  |                                 Ya |
| `R2_EVIDENCE_BUCKET`                   | Server           | Private evidence bucket name.                                 |                  Restricted config |
| `R2_EDITORIAL_BUCKET`                  | Server           | Approved editorial media bucket name.                         |                  Restricted config |
| `NEXT_PUBLIC_EDITORIAL_ASSET_BASE_URL` | Client + server  | Public base URL media editorial jika custom domain disetujui. |                              Tidak |
| `LOG_LEVEL`                            | Server           | Logging verbosity tanpa menyalakan body/PII logging.          |                              Tidak |

Variable future untuk email/WhatsApp tidak ditetapkan sampai kanal notifikasi disetujui.

Policy:

- tidak ada value nyata pada repository, Markdown, `netlify.toml`, atau workflow;
- local memakai `.env.local` yang di-ignore;
- Netlify memakai scoped environment variables untuk development/preview/production;
- hanya variable aman untuk browser memakai `NEXT_PUBLIC_`;
- secret berbeda per environment, least privilege, revocable, dan memiliki owner/rotation record;
- build tidak boleh fallback dari missing preview secret ke production secret.

## 5. Local development

### Fondasi saat ini

```bash
npm ci
npm run dev
```

Quality gate:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

`npm run db:migrate` memerlukan `DATABASE_URL_UNPOOLED` eksplisit dan gagal aman bila secret tidak tersedia. Migration M3, M4, dan M5 sudah diuji di branch Neon `development` dan `preview`; M6 tidak menghasilkan migration baru. Jangan menjalankan migration atau smoke yang menulis data ke database mana pun tanpa memastikan target non-production dan approval yang sesuai.

### Setelah database milestone (status M3)

Proposed sequence:

1. gunakan branch Neon `development` yang sudah tersedia (buat branch per-PR bila workflow preview berubah);
2. isi local secret pada `.env.local`;
3. gunakan `npm run db:generate`, review SQL serta data-loss statement, lalu `npm run db:check`;
4. apply melalui `npm run db:migrate` hanya ke branch development;
5. jalankan `npm run db:seed` hanya dengan `DATABASE_ENVIRONMENT=development` atau `preview`;
6. uji migration/constraint/transaction pada development, lalu ulangi di preview;
7. jangan memakai `push` langsung ke production.

### Auth local/preview (Milestone 4)

1. Isi `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `DATABASE_ENVIRONMENT`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, dan `BETTER_AUTH_TRUSTED_ORIGINS` untuk environment non-production.
2. Review migration M4 di `drizzle/20260830054722_wise_dexter_bennett/migration.sql`, lalu jalankan `npm run db:migrate` hanya terhadap branch development/preview yang dipilih.
3. Set `AUTH_BOOTSTRAP_NAME`, `AUTH_BOOTSTRAP_EMAIL`, dan `AUTH_BOOTSTRAP_PASSWORD`; bila dipakai, isi `BEM_ALLOWED_EMAIL_DOMAINS`.
4. Jalankan `npm run auth:bootstrap` satu kali. Script menolak environment selain `development`/`preview`, membuat akun `ADMIN`, dan tidak mencetak password.
5. Jalankan `npm run test:auth-integration` dan, saat server lokal aktif, `npm run auth:smoke`.
6. Hapus seluruh `AUTH_BOOTSTRAP_*` dari environment setelah berhasil. Uji visual `/admin/login`, `/admin`, logout, dan layout mobile secara terkontrol.
7. Jangan memakai akun BEM production pada local/preview kecuali UAT sudah disetujui owner.

### Case management local/preview (Milestone 6)

1. Pastikan aplikasi memakai `DATABASE_URL` pooled dan environment non-production; `DATABASE_URL_UNPOOLED` hanya dipakai untuk operasi database yang memang diperlukan.
2. Jalankan `npm run db:check`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build`.
3. Uji `/admin/laporan` sebagai `ADVOCATE` dan `ADMIN`; `EDITOR` boleh membuka shell BEM tetapi tidak boleh melihat antrean atau detail report.
4. Verifikasi filter status, kategori, urgensi, tanggal diterima, assignment/PIC, arsip, pencarian, pagination, dan reset filter.
5. Verifikasi detail memisahkan original report, identity/evidence metadata restricted, internal note, reporter-visible message, assignment history, dan audit projection.
6. Verifikasi status guard, reason untuk `CANNOT_PROCESS`/archive/reopen, soft-delete note, stale `updatedAt` conflict, dan admin-only archive/reopen.
7. Smoke end-to-end yang membuat report sintetis hanya boleh dijalankan terhadap Neon `development`/`preview` setelah owner memberi izin eksplisit; script wajib membersihkan seluruh row turunan dan report sintetis.

M6 tidak memerlukan `npm run db:migrate`: tabel `aspiration_reports`, `reporter_identities`, `report_evidence`, `report_status_events`, `internal_notes`, `report_assignments`, dan `audit_events` sudah tersedia dari foundation M3. R2 binary upload/download tetap belum aktif.

## 6. Pull request dan Deploy Preview

1. Buat branch `feat/<short-name>` atau `fix/<short-name>`.
2. Pastikan working tree tidak memuat `.env`, secret, build output, atau data export.
3. Jalankan quality gate lokal.
4. Push branch dan buka pull request.
5. GitHub Actions menjalankan format, lint, type-check, test, dan build.
6. Netlify membuat Deploy Preview dari pull request.
7. Bila milestone mengubah schema, provision/reset Neon preview branch dan jalankan migration terhadap branch itu. M6 tidak mengubah schema.
8. Gunakan synthetic/sanitized seed.
9. Jalankan browser, responsive, accessibility, authorization, dan privacy checks di Preview.
10. Hapus preview database/storage resource setelah PR ditutup sesuai automation/policy.

Deploy Preview tidak boleh terhubung ke production database atau evidence bucket.

## 7. Production release process

### Gate sebelum merge

- seluruh required review selesai;
- CI hijau;
- Deploy Preview lulus acceptance milestone;
- migration SQL direview dan diuji pada blank serta representative preview database;
- security/privacy checklist relevan lulus;
- backup/restore dan rollback plan siap;
- content, contact, privacy notice, asset permission, dan escalation SOP disetujui;
- release owner dan on-call contact ditetapkan.

### Release

1. Buat release note: scope, migration, environment change, risk, rollback owner.
2. Ambil/verifikasi restore point atau backup sesuai Neon plan.
3. Terapkan backward-compatible migration ke production melalui credential migration khusus.
4. Verifikasi schema/migration record.
5. Merge approved pull request ke `main`.
6. Netlify membangun production dari immutable commit.
7. Jalankan smoke test production tanpa membuat real sensitive report kecuali UAT terkontrol.
8. Monitor error, latency, auth failure, submission/Turnstile failure, dan database health.
9. Catat release outcome serta siapa yang menyetujui.

Migration destructive atau data backfill tidak boleh disisipkan diam-diam ke build command. Gunakan langkah operasional terpisah dengan approval.

## 8. Domain dan HTTPS

- Domain resmi dan account owner harus diputuskan owner.
- Gunakan HTTPS dan redirect HTTP ke HTTPS.
- Verifikasi DNS ownership, TLS certificate, canonical origin, auth trusted origins, Turnstile hostname, R2 CORS, dan asset domain.
- Jangan menaruh tracking token pada query string atau fragment domain.
- Aktifkan HSTS hanya setelah HTTPS/domain stabil dan rollback dipahami.
- Preview URLs tidak boleh terindeks; production sitemap/robots disiapkan pada milestone public content.

## 9. Migration, backup, dan restore

### Database

- Gunakan forward migration yang reviewable dan additive bila memungkinkan.
- Uji migration dari blank database serta snapshot/branch representatif.
- Neon branch preview mengisolasi test dari production.
- Restore capability/window bergantung Neon plan dan harus diverifikasi sebelum launch.
- Untuk kebutuhan di luar restore window, tentukan encrypted logical backup, storage, retention, dan restore drill.
- Backup dianggap valid hanya setelah restore test berhasil.

### R2

- Evidence dan editorial media dipisahkan.
- Tentukan retention/lifecycle serta deletion workflow.
- Simpan metadata/checksum di database untuk rekonsiliasi.
- Tentukan apakah backup kedua diperlukan berdasarkan risk dan provider capability; jangan mengklaim object versioning tanpa verifikasi konfigurasi.

### Configuration

- `netlify.toml`, schema/migration, dan infrastructure notes berada di source control.
- Secret tidak dibackup ke repository; recovery mengikuti vendor secret-management process.

## 10. Rollback

### Application-only issue

1. Pause merge/deploy baru.
2. Pilih last known good Netlify deploy/commit.
3. Rollback application deploy.
4. Verifikasi public, auth, tracking, dan admin smoke checks.

### Application + migration issue

- Jangan rollback code ke versi yang tidak kompatibel dengan schema baru.
- Prefer forward fix atau expand/contract migration.
- Bila restore database diperlukan, hentikan write path, dokumentasikan data-loss window, dapatkan explicit approval, lalu restore sesuai Neon procedure.
- Reconcile R2 object yang dibuat setelah restore point.

### Credential compromise

- Revoke/rotate credential;
- update scoped secret store;
- redeploy affected environment;
- revoke sessions bila relevant;
- audit access dan follow incident process.

## 11. Monitoring dan alert minimum

Pantau:

- availability dan latency public/admin routes;
- build/deploy failure;
- server error rate dan correlation ID;
- Better Auth login failure, session revocation, role change;
- Turnstile validation failure dan rate-limit rejection secara agregat;
- submission success/failure tanpa logging content;
- tracking brute-force signal;
- database connection/query latency, storage, dan migration failure;
- R2 upload/download validation failure;
- publication/admin sensitive audit events.

Alert harus memiliki owner, severity, acknowledgment path, dan link ke runbook. Jangan mengirim PII/secret pada alert payload.

## 12. Production checklist

### Ownership dan accounts

- [ ] GitHub, Netlify, Neon, Cloudflare, domain, dan recovery mailbox dimiliki organisasi.
- [ ] Minimal dua owner; least privilege untuk anggota lain.
- [ ] MFA/recovery process diuji untuk critical accounts.

### Build dan source

- [ ] `npm ci`, format check, lint, type-check, test, dan build lulus dari clean checkout.
- [ ] Lockfile committed dan dependency/security review dilakukan.
- [ ] Secret scan lulus; tidak ada `.env`/dump/log/build output ter-commit.
- [ ] CI dan branch protection aktif.

### Data dan security

- [ ] Database/storage/credential terpisah per environment.
- [ ] Migration diuji dan restore point tersedia.
- [ ] Auth/role negative tests lulus; public signup off.
- [ ] Turnstile server validation dan cross-instance rate limit lulus.
- [ ] Tracking token hash/no-URL/no-log tests lulus.
- [ ] Evidence private access, validation, CORS, dan authorization tests lulus.
- [ ] Security headers, TLS, CSRF, XSS, SQL injection, access control, dan audit checks lulus.
- [ ] Retention/deletion workflow dan privacy notice disetujui.

### Product dan content

- [ ] BEM contact, escalation SOP, policy copy, dan ownership disetujui.
- [ ] Logo/photo permission dan production asset final tersedia.
- [ ] Accessibility/responsive review lulus.
- [ ] Draft content tidak public; publication approval tested.

### Operations

- [ ] Monitoring/alerts dan on-call owner aktif.
- [ ] Application rollback dan database restore drill dilakukan.
- [ ] Incident contact list tersedia secara restricted.
- [ ] Limited UAT desktop/mobile selesai dan findings ditutup.

## 13. Penanganan insiden

1. Deklarasikan incident lead, severity, waktu mulai, dan channel restricted.
2. Contain: pause deploy/form/publication, revoke session/credential, atau restrict route sesuai kasus.
3. Lindungi bukti: audit/log relevant, jangan menyebarkan PII.
4. Tentukan affected environment, account, record, object, dan time window.
5. Patch atau rollback dengan approval yang tepat.
6. Rotate secret dan invalidate session jika dibutuhkan.
7. Verifikasi recovery serta monitor recurrence.
8. Lakukan komunikasi owner dan kewajiban notification berdasarkan kebijakan/legal review.
9. Tulis post-incident review serta update dokumen/test.

## 14. Open Question dan Proposed Default

| Open Question                    | Proposed Default                                                                                                                                               |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain dan vendor account owner? | Akun organisasi dengan dua owner; jangan deploy production sebelum dipastikan.                                                                                 |
| Neon plan/region/restore window? | Pilih region terdekat yang memenuhi kebutuhan latency/residency dan plan dengan restore window yang memungkinkan recovery target; verifikasi sebelum purchase. |
| Preview database automation?     | Per-PR branch dengan synthetic seed dan auto-delete saat PR ditutup.                                                                                           |
| Monitoring/error provider?       | Mulai dari platform logs/metrics dan structured application logs; pilih error tracker hanya setelah privacy review.                                            |
| RPO/RTO?                         | Proposed launch target: RPO ≤24 jam dan RTO ≤4 jam, tetapi owner harus menyetujui berdasarkan dampak operasional.                                              |
| Notifikasi eksternal?            | Tidak ada pada MVP; jangan membuat SMTP/provider variable sampai keputusan dibuat.                                                                             |
| Production migration approver?   | Minimal developer implementer + owner/reviewer berbeda untuk migration berisiko.                                                                               |

## 15. Referensi

- [Netlify Next.js overview](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Netlify Deploy Previews](https://docs.netlify.com/deploy/deploy-types/deploy-previews/)
- [Neon branching workflow](https://neon.com/docs/get-started-with-neon/workflow-primer)
- [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)
- [Drizzle PostgreSQL migrations](https://orm.drizzle.team/docs/get-started/postgresql-existing)
- [Cloudflare Turnstile testing](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
- [Cloudflare R2 presigned URLs](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
