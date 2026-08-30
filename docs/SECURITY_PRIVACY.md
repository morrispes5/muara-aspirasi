# Security and Privacy — Muara Aspirasi

> Status: kebijakan dan acceptance target untuk MVP. Authentication/role Milestone 4 sudah lulus acceptance non-production; migration M5 telah diterapkan pada Neon development dan preview, sementara smoke end-to-end development lulus dengan data sintetis yang dibersihkan otomatis. Kesiapan production belum selesai dan Neon main/production tidak disentuh.
> Dokumen ini bukan nasihat hukum; privacy notice, retention, dan consent final memerlukan persetujuan owner serta review kebijakan yang berlaku.

## 1. Tujuan

Muara Aspirasi memproses laporan yang dapat memuat identity, contact, pengalaman pribadi, dan evidence. Keamanan MVP harus mengutamakan:

- kerahasiaan pelapor;
- integritas status, assignment, dan publication;
- pembatasan akses staf berdasarkan tugas;
- ketersediaan form publik tanpa membiarkan spam mengganggu operasi;
- transparansi tentang data yang dikumpulkan dan bagaimana data dipakai;
- pemisahan yang tegas antara original report dan public advocacy update.

## 2. Status implementasi kontrol

| Kontrol                                                    | Status saat dokumen dibuat                                                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `.gitignore`, `.env.example`, secret pattern scan baseline | Sudah tersedia                                                                                                         |
| TypeScript strict, lint, test, production build            | Sudah tersedia                                                                                                         |
| Authentication, session, role enforcement                  | Milestone 4 selesai dan diuji pada Neon development/preview; production belum ada                                      |
| Database/schema/migration                                  | Foundation M3 + migration auth M4 selesai pada development/preview; production belum ada                               |
| Tracking token generation/hash                             | M5 selesai non-production: token 256-bit, `scrypt` salted hash, verifikasi constant-time; smoke tracking privat lulus  |
| Turnstile, honeypot, rate limiting                         | M5 selesai non-production: widget + server Siteverify, honeypot, bucket Neon HMAC, idempotency; smoke submission lulus |
| R2 upload/download validation                              | Belum diimplementasikan                                                                                                |
| Security headers, CSP, production monitoring               | Belum diimplementasikan                                                                                                |
| Retention/deletion automation                              | Belum diimplementasikan                                                                                                |

Tidak boleh menandai security checklist selesai hanya karena kontrol tertulis di dokumen ini.

## 3. Data yang boleh dikumpulkan

### Wajib untuk laporan

- category;
- title;
- location/area;
- chronology;
- impact;
- acceptance terhadap reporting ethics dan privacy notice version.

### Opsional

- suggested solution;
- name;
- NIM;
- email;
- WhatsApp;
- maksimal tiga evidence sesuai allowlist dan size limit;
- consent tentang apakah identity hanya untuk BEM atau boleh dibagikan secara terbatas kepada unit tujuan.

### Metadata operasional minimum

- timestamp;
- tracking code dan hash dari secret token;
- status event, assignment, dan audit event;
- abuse-prevention signal yang diminimalkan dan memiliki retention pendek;
- file metadata seperti MIME, size, checksum, dan random object key.

## 4. Data yang tidak boleh diminta atau disimpan

- password, OTP, PIN, recovery code, atau credential sistem kampus;
- foto/scan kartu identitas kecuali ada requirement resmi baru dan privacy review khusus;
- full payment card, bank credential, atau data finansial yang tidak relevan;
- private document yang tidak berhubungan dengan laporan;
- medical diagnosis rinci atau data sangat sensitif lain yang tidak diperlukan untuk advokasi;
- daftar kontak perangkat, location tracking berkelanjutan, atau biometric data;
- raw tracking secret setelah ditampilkan satu kali;
- request body lengkap, session token, presigned URL, database URL, atau secret pada log;
- nama individu pada public post kecuali komunikasi resmi yang disetujui dan memiliki alasan jelas.

Form harus memberi peringatan agar pelapor tidak memasukkan secret/OTP atau data pihak ketiga yang tidak diperlukan.

## 5. Anonimitas dan consent identity

### Mode yang dipilih untuk foundation Milestone 3

1. **Confidential BEM only (default):** pelapor memberi nama dan NIM untuk verifikasi BEM. Hanya role berwenang dengan need-to-know yang dapat melihatnya; identity tidak dibagikan ke unit tujuan atau publik.
2. **Consented limited share:** pelapor memberi consent eksplisit agar field identity minimum dapat disampaikan ke unit tujuan yang disebutkan untuk follow-up privat. Default tetap field minimum, bukan seluruh identity/report.

Keputusan ini menjadi default implementasi untuk development/preview. Privacy notice final, batas kewajiban hukum, dan SOP serious-risk tetap memerlukan review owner sebelum production.

Kontrak mode:

- `CONFIDENTIAL_BEM_ONLY` adalah default dan berarti identity hanya tersedia untuk BEM berwenang dengan need-to-know.
- `CONSENTED_LIMITED_SHARE` memerlukan consent eksplisit, tujuan/unit tujuan yang tercatat, dan hanya field identity minimum.
- Tidak ada mode yang mengizinkan identity tampil pada publik atau public advocacy update.

Foundation evidence default untuk development/preview adalah maksimal tiga file JPEG, PNG, atau PDF, dengan batas 5 MiB per file dan 10 MiB total. File harus lolos pemeriksaan extension, MIME, magic bytes, dan checksum, lalu tetap berada pada private/quarantine storage ketika Milestone 6 dikerjakan. Batas ini dapat diperketat setelah review operasional sebelum production.

Aturan mutlak:

- identity/contact tidak pernah public;
- email/WhatsApp yang tidak diisi tidak menurunkan prioritas laporan secara otomatis;
- tracking code bukan secret; tracking membutuhkan code + secret token;
- response tracking tidak mengungkap apakah code valid sebelum kombinasi token benar;
- public advocacy update ditulis independen dan tidak merender original report;
- BEM tidak menjanjikan anonimitas terhadap hukum atau proses resmi yang belum didefinisikan; batas kebijakan tersebut harus dijelaskan pada privacy notice final.

## 6. Role dan hak akses

| Capability                            |        Public / pelapor |                         `EDITOR` |         `ADVOCATE` |          `ADMIN` |
| ------------------------------------- | ----------------------: | -------------------------------: | -----------------: | ---------------: |
| Baca public content                   |                      Ya |                               Ya |                 Ya |               Ya |
| Submit report                         |                      Ya |                               Ya |                 Ya |               Ya |
| Track satu report dengan code + token |                      Ya |                               Ya |                 Ya |               Ya |
| Draft/edit student info               |                   Tidak |                               Ya |                 Ya |               Ya |
| Draft public advocacy update          |                   Tidak | Proposed: summary sanitized only |                 Ya |               Ya |
| Baca original report                  | Hanya own safe timeline |             Tidak secara default |                 Ya |               Ya |
| Baca identity/contact/evidence        |                   Tidak |                            Tidak |   Ya, need-to-know | Ya, need-to-know |
| Ubah status/assignment/note           |                   Tidak |                            Tidak |                 Ya |               Ya |
| Approve publish/archive/reopen        |                   Tidak |                            Tidak | Proposed: terbatas |               Ya |
| Kelola akun/role/policy               |                   Tidak |                            Tidak |              Tidak |               Ya |
| Baca audit security penuh             |                   Tidak |                            Tidak | Terbatas pada case |               Ya |

`EDITOR` disebut dapat membantu laporan pada PRD, tetapi scope bantuan belum rinci. Proposed Default adalah editor hanya melihat sanitized summary yang sengaja disediakan; editor tidak melihat PII, evidence, atau internal note.

Tidak ada role moderator terpisah pada MVP.

## 7. Authentication dan session

- Better Auth hanya untuk akun BEM; signup publik harus dinonaktifkan.
- Akun dibuat, dinonaktifkan, dan role-nya diubah oleh `ADMIN` dengan audit event.
- Email BEM yang diizinkan dan proses bootstrap admin pertama harus didokumentasikan sebelum deploy.
- Session cookie harus `HttpOnly`, `Secure` pada HTTPS, dan memiliki kebijakan `SameSite` yang sesuai.
- Session divalidasi terhadap server/database untuk setiap protected operation.
- Pemeriksaan keberadaan cookie pada Next.js `proxy.ts` hanya boleh menjadi redirect optimistis, bukan authorization final.
- Sensitive actions dapat meminta recent authentication/re-authentication.
- Session dapat direvoke; role change/suspension harus membatalkan session aktif yang relevan.
- Proposed Default: MFA diwajibkan untuk `ADMIN` sebelum production, subject to recovery SOP dan kemampuan library yang diuji.

Implementasi M4 mengikuti boundary di atas:

- `src/server/auth/auth.ts` mengonfigurasi Better Auth dengan Drizzle adapter, signup publik nonaktif, password 12–128 karakter, trusted origin eksplisit, dan cookie `HttpOnly`/`SameSite`/`Secure` sesuai environment;
- `src/proxy.ts` hanya melakukan redirect optimistis untuk `/admin`, sedangkan `src/server/auth/session.ts` memeriksa user aktif dan permission di server;
- `src/server/auth/roles.ts` mengunci matrix permission `EDITOR`, `ADVOCATE`, dan `ADMIN`;
- `src/app/api/auth/[...all]/route.ts` menyediakan handler auth dan audit login failure, logout, serta session revoke tanpa mencatat password atau token;
- `src/server/auth/user-management.ts` membatasi perubahan role/status kepada `ADMIN` aktif, mencabut sesi target, mencatat audit, dan mencegah self-lockout/last-active-admin;
- migration auth dan bootstrap sintetis sudah diterapkan pada Neon development/preview; smoke test memvalidasi signup tertutup, trusted origin, cookie `HttpOnly`/`SameSite=Lax`, login, protected page, revoke session, dan logout;
- keputusan production: MFA wajib untuk `ADMIN`, recovery wajib dimiliki minimal dua owner organisasi, dan akun production harus memakai domain BEM resmi yang disetujui. M4 tidak membuat akun production.

## 8. Input validation dan content safety

- Semua input dianggap untrusted, termasuk form, query/search params, headers, cookie, file metadata, dan data dari provider.
- Gunakan schema server-side dengan allowlist enum, batas panjang, normalisasi whitespace, dan pesan error aman.
- Client validation hanya untuk UX; server validation tetap otoritatif.
- Reject field tambahan yang tidak diharapkan pada endpoint sensitif.
- Gunakan plain/structured text sebagai default. Jangan menerima atau merender raw HTML.
- React output escaping membantu mencegah XSS, tetapi tidak menggantikan sanitization bila rich text ditambahkan.
- URL sumber editorial harus memvalidasi protocol/host policy untuk mencegah `javascript:` URL dan abuse.
- Error publik tidak mengembalikan stack trace, query, provider response, atau detail yang membantu enumeration.

## 9. Spam, rate limiting, dan CAPTCHA

Layer minimum untuk submission/tracking publik:

1. hidden honeypot field;
2. Cloudflare Turnstile widget;
3. mandatory server-side Siteverify sebelum mutation;
4. per-IP/network signal dan per-tracking-code throttling;
5. global circuit breaker untuk burst ekstrem;
6. idempotency key atau duplicate detection untuk retry;
7. generic response untuk tracking failure;
8. monitoring rejection rate tanpa menyimpan form content.

Turnstile token bersifat short-lived dan single-use; client success saja tidak cukup. Development/automated tests menggunakan test keys resmi, bukan production secret. Dummy key Cloudflare mengembalikan hostname `example.com`; pengecualian itu diterima hanya bila secret dummy persis dipakai bersama `DATABASE_ENVIRONMENT=development` atau `preview`. Di luar kondisi tersebut, hostname request tetap wajib cocok.

Rate limiting M5 memakai tabel bucket Neon dengan unique key atomik, sehingga tidak bergantung pada in-memory map dan bekerja lintas instance yang mengarah ke database environment yang sama. Kapasitas/latensi Neon tetap harus dipantau sebelum production.

Raw IP bukan bagian permanen dari report. Bila diperlukan untuk abuse prevention, simpan signal pseudonymous/truncated dengan salt terpisah dan retention pendek yang disetujui.

## 10. Perlindungan kelas serangan

### XSS

- Hindari `dangerouslySetInnerHTML` dan raw HTML.
- Sanitize rich text dengan allowlist bila fitur tersebut disetujui kemudian.
- Terapkan Content Security Policy bertahap dan uji compatibility.
- Encode output sesuai context; jangan menaruh user input di inline script/style.
- Media user-generated tidak disajikan dari origin aplikasi dengan active content.

### CSRF

- Gunakan cookie session dengan SameSite dan HTTPS.
- Semua mutation menggunakan non-GET method.
- Verifikasi Origin/Host untuk request browser sensitif.
- Gunakan perlindungan CSRF yang disediakan Better Auth sesuai konfigurasinya.
- Perlakukan Server Actions sebagai public endpoints; auth, authorization, validation, dan audit tetap dilakukan dalam action.
- Protect upload/signing endpoint dan auth endpoints dari cross-origin abuse.

### SQL injection

- Gunakan Drizzle query builder/parameter binding.
- Raw SQL hanya bila tidak dapat dihindari, menggunakan parameter, test, dan review khusus.
- Database role runtime menggunakan least privilege dan berbeda dari migration role bila operasional memungkinkan.
- Jangan menerima column/table/order expression langsung dari user tanpa allowlist.

### Secret leakage

- Secret hanya berada di `.env.local` untuk lokal dan secret store/context platform untuk preview/production.
- Hanya nilai yang aman untuk browser memakai prefix `NEXT_PUBLIC_`.
- `.env*` nyata, key, certificate, Netlify/Vercel state, dan log di-ignore.
- Jangan memasukkan secret pada source, docs, test fixture, screenshot, commit, analytics, atau error.
- Gunakan credential terpisah per environment dan least privilege.
- Rotasi segera jika secret dicurigai bocor; revoke yang lama dan audit penggunaan.
- Scan secret sebelum commit/release.

### Malicious file upload

- Allowlist extension dan MIME; verifikasi magic bytes, jangan percaya `Content-Type` browser.
- Batas file count, per-file bytes, dan total bytes; reject archive/executable/active content secara default.
- Randomize object key dan simpan original filename hanya sebagai metadata restricted yang disanitasi.
- Upload ke private bucket/quarantine; jangan public sebelum validation selesai.
- Gunakan checksum, status validation, dan authorized read path.
- Presigned URL harus short-lived, operation-specific, object-specific, dan diperlakukan sebagai bearer token.
- Konfigurasi R2 CORS hanya untuk origin serta method yang dibutuhkan.
- Malware scanning/provider merupakan launch Open Question; tanpa scanner, allowlist harus sempit dan evidence tetap private.

## 11. Logging dan audit

### Application logs

Boleh memuat:

- timestamp, environment, level;
- request correlation ID;
- route/use-case identifier;
- outcome/status code dan latency;
- error code yang terkontrol;
- pseudonymous abuse signal bila disetujui.

Tidak boleh memuat:

- chronology, identity/contact, NIM;
- evidence content/object signed URL;
- tracking token/hash;
- password, session cookie, auth token;
- database URL, API key, encryption key;
- raw request/response body.

### Audit events

Audit bersifat append-oriented dan mencatat actor, action, target, result, reason, serta waktu. Wajib untuk login, role/user management, sensitive report access, status transition, assignment, evidence access, publication, archive/reopen, dan deletion/retention operation.

Audit metadata memakai allowlist agar audit log tidak menjadi secondary PII store.

## 12. Environment variable policy

- `.env.example` hanya berisi nama dan placeholder aman.
- `.env.local` tidak dikomit.
- Preview dan production memakai value terpisah melalui Netlify environment context.
- Secret server-only tidak boleh memakai `NEXT_PUBLIC_`.
- Jangan menaruh secret dalam `netlify.toml`, GitHub workflow, package script, atau Markdown.
- Credential production tidak digunakan di development/preview.
- Owner setiap secret, scope, rotation procedure, dan incident contact harus dicatat di runbook internal.
- Build harus gagal dengan pesan aman ketika required server secret hilang; jangan fallback ke production credential.

Daftar nama variable terencana berada di `DEPLOYMENT_RUNBOOK.md` dan belum otomatis ditambahkan ke `.env.example` pada milestone dokumentasi ini.

## 13. Privacy lifecycle

1. Tampilkan privacy notice dan reporting ethics sebelum submit.
2. Catat version serta acceptance timestamp.
3. Kumpulkan field minimum sesuai mode identity.
4. Batasi akses dan share hanya berdasarkan consent/need-to-know.
5. Tampilkan hanya reporter-safe timeline dan approved publication.
6. Terapkan retention job setelah durasi disetujui.
7. Sediakan deletion/correction request channel sebelum public launch.
8. Audit deletion/retention tanpa mempertahankan data yang diminta dihapus pada metadata.

Proposed Default retention: report/contact/evidence 180 hari setelah closure dan audit metadata 365 hari. Ini belum kebijakan final.

## 14. Security headers dan transport

Sebelum production:

- HTTPS-only dan redirect HTTP ke HTTPS;
- HSTS setelah domain/HTTPS stabil;
- `Content-Security-Policy` yang diuji;
- `X-Content-Type-Options: nosniff`;
- anti-clickjacking melalui `frame-ancestors` CSP;
- `Referrer-Policy` yang membatasi leakage;
- `Permissions-Policy` minimal;
- cache policy `no-store` untuk admin, auth, submission response, dan tracking response;
- public static assets/content boleh menggunakan caching yang terkontrol.

Header untuk dynamic/function responses harus dikonfigurasi di aplikasi bila header Netlify statis tidak mencakupnya.

## 15. Pre-production security acceptance

- [ ] Public registration benar-benar tidak tersedia.
- [ ] Seluruh protected page, action, dan route memiliki server-side session + permission test.
- [ ] Role matrix `EDITOR`, `ADVOCATE`, `ADMIN` memiliki positive dan negative tests.
- [ ] Tracking gagal tanpa code + token dan tidak dapat dienumerasi.
- [ ] Tracking token hanya disimpan sebagai hash serta tidak masuk URL/log/analytics.
- [ ] Turnstile success, failure, expiry, dan duplicate token diuji server-side.
- [ ] Rate limit bekerja lintas instance dan tidak menyimpan raw PII berlebihan.
- [ ] Validation boundary diuji dengan oversized, malformed, unexpected, dan hostile input.
- [ ] Upload count/type/size/magic-bytes/path/object-key/CORS/authorization diuji.
- [ ] Evidence tidak dapat diakses melalui unauthenticated direct URL.
- [ ] Public response scan membuktikan tidak ada PII, report body, internal note, atau relation ID.
- [ ] CSRF, XSS, SQL injection, access control, session revocation, dan secret scan diuji.
- [ ] Security headers serta TLS diperiksa pada Deploy Preview/production candidate.
- [ ] Audit event ada untuk seluruh sensitive action dan tidak memuat secret/PII berlebihan.
- [ ] Backup/restore, migration rollback, application rollback, dan incident drill dijalankan.
- [ ] Privacy notice, retention, deletion channel, escalation SOP, dan asset permission disetujui manusia.
- [ ] Tidak ada high-severity known gap sebelum limited launch.

## 16. Incident response sederhana

1. **Triage:** catat waktu, environment, affected component, dan owner; jangan menyalin PII ke chat/ticket terbuka.
2. **Contain:** pause submission/publication bila perlu, revoke session/credential, batasi storage/database access.
3. **Preserve evidence:** simpan audit/log relevan secara restricted; jangan mengubah production data sembarangan.
4. **Assess:** tentukan data/akun yang terkena, duration, entry point, dan blast radius.
5. **Recover:** patch, rotate secret, restore/rollback, revalidate controls, dan monitor recurrence.
6. **Communicate:** eskalasi ke owner organisasi serta ikuti kewajiban kebijakan/hukum yang telah direview.
7. **Learn:** dokumentasikan root cause, action item, owner, due date, dan update checklist/runbook.

## 17. Open Question dan Proposed Default

| Open Question                          | Proposed Default                                                                                                        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Retention dan deletion channel resmi?  | 180 hari setelah closure untuk report/contact/evidence, 365 hari audit metadata; owner/legal review wajib.              |
| Siapa boleh melihat identity/evidence? | `ADVOCATE` dan `ADMIN` hanya saat need-to-know; setiap evidence access diaudit.                                         |
| Apakah `ADVOCATE` boleh publish?       | Dapat menyiapkan/update; `ADMIN` menjadi approver default sampai policy approval final.                                 |
| MFA dan recovery?                      | MFA wajib untuk `ADMIN`; recovery melalui dua owner organisasi, bukan satu akun personal.                               |
| Rate-limit provider?                   | Store terkelola yang bekerja lintas Netlify instances; belum memilih vendor.                                            |
| Malware scanning?                      | Wajib diputuskan sebelum menerima format luas; tanpa scanner gunakan image/PDF allowlist sempit dan private quarantine. |
| Encryption field-level PII?            | Evaluasi sebelum production; jangan menambah key tanpa rotation/recovery design.                                        |
| Escalation contact/SOP?                | Portal hanya menampilkan bahwa layanan bukan emergency; contact dan SOP harus diberikan BEM sebelum launch.             |

## 18. Referensi

- [Next.js data security](https://nextjs.org/docs/app/guides/data-security)
- [Better Auth security](https://better-auth.com/docs/reference/security)
- [Cloudflare Turnstile server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
- [Cloudflare R2 presigned URL security](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)
- [OWASP Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
