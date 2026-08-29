# Milestone Roadmap — Muara Aspirasi

> Status: execution roadmap yang memperinci `IMPLEMENTATION_ROADMAP.md`; dokumen ini tidak mengganti PRD atau mengizinkan implementasi lintas milestone.

## 1. Cara menggunakan roadmap

- Kerjakan satu milestone pada satu branch/pull request.
- Baca seluruh requirement dan `IMPLEMENTATION_STATUS.md` sebelum editing.
- Jangan memulai milestone berikutnya sebelum acceptance milestone aktif lulus.
- Seluruh milestone menjalankan baseline: `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, dan `npm run build`.
- Update dokumentasi status serta keputusan material pada setiap milestone.
- Deployment/account/resource eksternal memerlukan instruksi eksplisit owner.

### Pemetaan roadmap lama

| Roadmap ini   | `IMPLEMENTATION_ROADMAP.md` |
| ------------- | --------------------------- |
| Milestone 1–2 | Memperinci Milestone 1 lama |
| Milestone 3–4 | Memperinci Milestone 2 lama |
| Milestone 5   | Milestone 3 lama            |
| Milestone 6–7 | Milestone 4–6 lama          |
| Milestone 8   | Milestone 7 lama            |
| Milestone 9   | Milestone 8 lama            |

## Milestone 1 — UI foundation dan public shell

### Tujuan

Membangun design tokens, layout primitives, institution bar, responsive header, footer, dan komponen dasar tanpa data/API bisnis.

### Scope

- Implement token warna/spacing/radius/type dari `UX_UI_DESIGN_SYSTEM.md`.
- No-logo/wordmark mode sampai izin aset tersedia.
- Container, section, stack, button, link, card, badge, callout.
- Public header/navigation/mobile menu/footer.
- Loading/error/not-found primitives dan focus styles.
- Tambahkan hanya komponen shadcn/ui yang benar-benar digunakan.

### Dependency

- `UX_UI_DESIGN_SYSTEM.md` disetujui.
- Keputusan sementara no-logo atau file/izin brand resmi.

### Validasi wajib

- Baseline quality commands.
- Browser QA pada 320/360/768/1024/1440px.
- Keyboard navigation, focus, landmarks, heading, contrast, reduced motion.
- Tidak ada asset dari `docs/assets` dipakai tanpa approval.

### Risiko utama

- Brand approval belum ada.
- Mengunci terlalu banyak component abstraction sebelum halaman nyata.
- Mobile navigation/focus regression.

## Milestone 2 — Halaman publik statis

### Tujuan

Menyediakan informasi program yang lengkap tanpa database atau mutation.

### Scope

- Home, Tentang, Kebijakan Privasi draft, dan Etika Pelaporan.
- Static/sample Update Advokasi dan Info Mahasiswa archive/detail.
- Emergency disclaimer, scope, FAQ, process, serta CTA kirim/lacak sebagai non-functional preview atau guarded placeholder yang jelas.
- Metadata dasar, robots/sitemap decision, 404/error states.

### Dependency

- Milestone 1 lulus.
- BEM memberi contact/escalation copy untuk production; development boleh memakai label draft yang tidak menyesatkan.
- Privacy/ethics copy direview owner sebelum public deploy.

### Validasi wajib

- Baseline quality commands.
- Visual regression/screenshot review mobile dan desktop.
- Link, heading, landmarks, alt text, content overflow, no-JS reading.
- Tidak ada form yang terlihat sukses palsu.

### Risiko utama

- Placeholder policy lolos ke production.
- Copy menjanjikan outcome yang tidak dapat dipenuhi.
- Penggunaan logo/foto tanpa izin.

## Milestone 3 — Database dan ORM foundation

### Tujuan

Mengimplementasikan Neon + Drizzle schema/migration dari `DATA_MODEL.md` pada environment non-production.

### Scope

- Provision development dan preview Neon branches; production belum disentuh tanpa approval.
- Install Drizzle ORM/Kit dan driver Neon yang sesuai runtime.
- Schema: category, report, reporter identity, evidence metadata, status event, note, assignment, audit, advocacy update, join, student info.
- Reviewable migration, sanitized seed, repository/data-access layer.
- Database health check internal dan transaction helpers.

### Dependency

- `DATA_MODEL.md`, retention, identity modes, urgency, transition, dan file limits dikonfirmasi.
- Neon ownership/region/plan decision.
- Secret names ditambahkan ke `.env.example` tanpa real value.

### Validasi wajib

- Baseline quality commands.
- Generate migration dan inspect SQL.
- Apply ke blank development branch dan representative preview branch.
- Constraint/index/transaction/repository tests.
- Verify no production connection digunakan.

### Risiko utama

- Schema privacy boundary salah.
- Destructive migration/data-loss.
- Connection exhaustion bila pooling salah.
- Test memakai data production.

## Milestone 4 — Better Auth dan role enforcement

### Tujuan

Membuat login BEM-only dan protected admin shell dengan permission server-side.

### Scope

- Install/configure Better Auth dengan Drizzle adapter sesuai versi saat implementasi.
- Auth Route Handler, login/logout, session revoke.
- Public signup off; bootstrap admin melalui prosedur aman/seed non-hardcoded.
- Role `EDITOR`, `ADVOCATE`, `ADMIN` dan permission helpers.
- Protected admin layout; `proxy.ts` hanya redirect optimistis.
- Negative/positive authorization tests.

### Dependency

- Milestone 3 lulus.
- Admin bootstrap owner, email/domain allowlist, MFA/recovery decision.
- Permission matrix `SECURITY_PRIVACY.md` disetujui.

### Validasi wajib

- Baseline quality commands.
- Unauthenticated/unauthorized route, page, Server Action, dan Route Handler tests.
- Role matrix tests.
- Session revocation, suspended user, CSRF/origin behavior, cookie security.
- Tidak ada password/secret pada seed, log, atau repository.

### Risiko utama

- Mengandalkan route redirect tanpa authorization di handler.
- Public registration aktif tanpa sengaja.
- Account recovery hanya dimiliki satu orang.

## Milestone 5 — Kirim dan lacak aspirasi

### Tujuan

Mengimplementasikan loop mahasiswa: submission aman, tracking credential, dan reporter-visible timeline.

### Scope

- Guided form: nama/NIM wajib untuk BEM, email/WhatsApp opsional, mode default `CONFIDENTIAL_BEM_ONLY`, consent limited share, ethics, review, dan success credential screen.
- Server validation, honeypot, Turnstile server verification, rate limit, idempotency/deduplication.
- Tracking code + one-time random secret; hash-only persistence.
- Tracking via POST, generic failure, no-store response.
- Evidence upload hanya jika R2 private validation design dan file limit telah disetujui; bila belum, launch form tanpa evidence dan jelaskan scope.
- Initial `RECEIVED` status event dan audit.

### Dependency

- Milestone 3 lulus; auth tidak diperlukan untuk pelapor tetapi admin processing bergantung Milestone 4.
- Turnstile/R2 development credential dan provider ownership.
- File limit, consent, retention, deletion channel, escalation copy disetujui.
- Cross-instance rate-limit store dipilih.

### Validasi wajib

- Baseline quality commands.
- Valid/invalid/oversized/unexpected input tests.
- Turnstile success/fail/expired/duplicate tests.
- Rate-limit/honeypot/idempotency tests.
- Tracking requires exact code + token, hash-only/no URL/no log tests.
- Evidence access/type/size/count/magic-byte/CORS tests bila upload aktif.
- Mobile/browser E2E submission dan tracking.

### Risiko utama

- Token bocor melalui URL/log/analytics.
- Enumeration dan brute force.
- Spam burst lintas instance.
- Malicious upload atau evidence public.
- Pelapor kehilangan one-time secret.

## Milestone 6 — Moderasi dan admin case management

### Tujuan

Memungkinkan BEM memproses report end-to-end dengan pemisahan data dan audit.

### Scope

- Queue dengan filter/pagination.
- Detail report dengan separation original/identity/evidence/internal/reporter-visible.
- Assignment history, internal note, reporter message.
- State machine dan guarded transition.
- Required reason untuk cannot-process, archive, reopen, dan sensitive actions.
- Evidence authorized read dan audit.
- Sanitized summary boundary bila editor benar-benar membutuhkan bantuan report.

### Dependency

- Milestone 4–5 lulus.
- Transition tambahan dan escalation SOP dikonfirmasi.
- Permission/approval matrix final.

### Validasi wajib

- Baseline quality commands.
- State transition unit/property tests.
- Role/access negative tests untuk PII/evidence/note/audit.
- Assignment concurrency dan transaction tests.
- E2E advocate workflow dan admin reopen/approval.
- Public response privacy scan.

### Risiko utama

- PII terlihat role yang salah.
- Internal note terkirim ke pelapor.
- Concurrent update menimpa status/assignment.
- Serious-risk case diproses tanpa SOP.

## Milestone 7 — Public publishing, notifikasi, dan polish

### Tujuan

Menyelesaikan BEM-to-student loop melalui publication yang disetujui dan UX yang matang.

### Scope

- Advocacy update dan student info draft/review/publish/archive.
- Archive/detail/filter/pagination public dari database.
- Independent public summary; internal report relation tidak diekspos.
- Editorial R2 media dengan alt/source/credit.
- Pin/schedule hanya bila scheduler benar-benar tersedia dan diuji.
- Notification default: in-app tracking timeline dan success feedback.
- External email/WhatsApp hanya jika owner menyetujui scope/privacy/provider.
- Empty/loading/error/offline/timeout/unauthorized polish.

### Dependency

- Milestone 6 lulus.
- Publication approver, real content, asset permission, scheduler/notifikasi decision.

### Validasi wajib

- Baseline quality commands.
- Draft invisibility, approval, publish, archive, schedule tests.
- Public query cannot join/expose private report.
- Media permission/alt/source/credit checks.
- E2E editor/advocate/admin publication flow.
- Responsive/accessibility/visual review.

### Risiko utama

- Original report tersalin ke public content.
- Draft atau internal relation bocor.
- Scheduler tidak reliable.
- External notification membocorkan PII.

## Milestone 8 — Security, privacy, accessibility, dan release testing

### Tujuan

Membuktikan MVP memenuhi checklist sebelum deployment terbatas.

### Scope

- Unit/integration/E2E untuk validation, permission, transition, tracking, auth, publication, upload.
- Security checklist `SECURITY_PRIVACY.md`.
- Secret/dependency scan dan security headers/CSP.
- Accessibility audit dan device/browser matrix.
- Retention/deletion job serta audit.
- Backup/restore, rollback, credential rotation, dan incident drill.
- Real policy/contact/escalation copy review.

### Dependency

- Milestone 1–7 feature freeze.
- Owner BEM tersedia untuk policy/UAT.
- Monitoring dan production-like preview environment.

### Validasi wajib

- Baseline quality commands dan full CI.
- Playwright critical journeys.
- Negative access control/security regression suite.
- Lighthouse/accessibility/manual screen-reader/keyboard review.
- Restore/rollback/incident exercise with evidence.
- No high-severity known gap.

### Risiko utama

- Menunda security finding ke setelah launch.
- Checklist ditandai tanpa evidence.
- Retention/privacy policy belum disetujui.

## Milestone 9 — Deployment dan limited launch

### Tujuan

Men-deploy MVP secara aman dan melakukan UAT terbatas dengan BEM sebelum broad announcement.

### Scope

- Hubungkan GitHub, Netlify, Neon production, Cloudflare Turnstile/R2/DNS melalui akun organisasi.
- Configure scoped production secrets, domain, HTTPS, headers, monitoring, alerts.
- Apply reviewed production migration dan sanitized/approved seed.
- Limited UAT mobile/desktop dengan real BEM accounts.
- Rollback/restore verification dan launch monitoring routine.
- Launch announcement hanya setelah owner sign-off.

### Dependency

- Milestone 8 lulus tanpa high-severity gap.
- Production checklist `DEPLOYMENT_RUNBOOK.md` lengkap.
- Domain, owner, privacy, retention, contact, SOP, content, dan asset approval final.

### Validasi wajib

- Clean production build/CI/Deploy Preview.
- Production smoke test untuk public, auth, submission, tracking, admin, publication.
- TLS/domain/Turnstile hostname/R2 CORS/security headers.
- Monitoring/alert delivery.
- Real end-to-end report hanya dalam UAT terkontrol dan segera ditangani sesuai policy.

### Risiko utama

- Vendor account dimiliki personal.
- Preview/production credential tertukar.
- Migration dan code incompatibility.
- Monitoring/incident ownership tidak jelas.

## 3. Definition of done lintas milestone

- Scope hanya milestone aktif.
- Tidak ada unrelated refactor/dependency bloat.
- Requirement/status docs diperbarui.
- Quality commands benar-benar dijalankan dan hasil dilaporkan.
- Negative/security/privacy checks proporsional dengan surface yang berubah.
- Tidak ada secret, PII fixture nyata, atau unauthorized asset.
- Perubahan siap human review dan, setelah repository terhubung, Deploy Preview.

## 4. Open Question sebelum Milestone 1

- Apakah no-logo mode disetujui sampai aset resmi tersedia?
- Apakah warna proposed default dapat dipakai sebagai non-brand palette sementara?
- Siapa reviewer UI/content dari BEM?
- Contact dan escalation copy mana yang boleh tampil pada static page?
- Apakah static page milestone boleh memakai sample content yang diberi label jelas sebagai demo?

Proposed Default: bangun public shell dengan wordmark teks, palette sementara yang accessible, dan sample content berlabel development; jangan memakai lima aset referensi atau placeholder contact pada production.
