# M9 — Limited UAT sampai production launch

> Status source: siap untuk Deploy Preview dan UAT setelah migration diterapkan **hanya** ke Neon preview. Production belum disentuh oleh dokumen ini.

## Keputusan yang dikunci

- Akun Netlify, Neon, Cloudflare/R2, domain, dan mailbox saat ini adalah akun pribadi owner melalui MCP. Hal ini hanya diterima untuk preview/UAT.
- Public production berhenti sampai dua recovery owner BEM tersedia untuk Netlify, Neon, Cloudflare/R2, domain registrar, GitHub, dan mailbox; catat lokasi recovery/internal handoff tanpa menaruh secret di repository.
- Retensi adalah 12 bulan sejak report terminal. Report aktif atau memiliki hold tidak dihapus.
- Evidence upload tetap `R2_EVIDENCE_ENABLED=false`; scanner, public media, scheduler provider, dan channel notifikasi tidak masuk launch ini.
- UAT internal BEM berlangsung dua hari. CSP report-only dipakai di UAT; production hanya boleh memakai `CSP_MODE=enforce`. HSTS production adalah 30 hari tanpa preload.

## Implementasi source

- Migration `drizzle/20260903040322_mixed_thor_girl/` menambahkan `closedAt`, tombstone deletion pada report, history hold, request deletion dari mailbox, dan antrean review retensi. Backfill hanya memberi `closedAt` untuk report terminal lama, tidak menghapus data.
- `POST /api/internal/retention/candidates` hanya membuat kandidat; endpoint mengharuskan `Authorization: Bearer <RETENTION_REVIEW_JOB_SECRET>` dan tidak menghapus apa pun.
- `POST /api/admin/privacy/retention` hanya menerima ADMIN yang TOTP-nya sudah aktif. Urutan aman: `record-mailbox-request` → `verify-request` → `approve-request` → `execute-deletion`. `place-hold` dan `release-hold` dapat digunakan kapan saja oleh ADMIN MFA.
- Penghapusan menghapus row identity dan evidence serta object R2, kemudian men-tombstone content report. Bila evidence ada tetapi R2 tidak aktif, proses berhenti sebelum database berubah.

## Preview dan UAT (owner-run)

1. Buat atau pilih Neon preview yang terpisah dari `main`; verifikasi `DATABASE_URL_UNPOOLED` menunjuk target itu sebelum menjalankan migration.
2. Simpan restore point/branch, kemudian jalankan `npm run db:migrate`; verifikasi record `drizzle.__drizzle_migrations` dan restore drill pada branch preview.
3. Isi Netlify Deploy Preview dengan secret khusus preview, `MFA_REQUIRED=true`, `R2_EVIDENCE_ENABLED=false`, `CSP_MODE=report-only`, mailbox BEM, dan Turnstile preview. Jangan gunakan database/evidence production.
4. Bootstrap hanya akun BEM sintetis, aktifkan MFA, dan beri akses SSO sementara ke tester BEM.
5. Jalankan UAT dua hari: form + tracking, role/admin/MFA, publication linkage, mailbox deletion + hold, keyboard/zoom/screen-reader, mobile/desktop, Turnstile, privacy projection, dan headers. Rekam temuan; critical/high harus selesai, medium membutuhkan keputusan owner.

## Production (hard gate owner-run)

1. Verifikasi recovery owner kedua dan handoff organisasi untuk seluruh layanan penting. Tidak cukup hanya akun pribadi owner.
2. Isi origin HTTPS/domain, mailbox BEM, privacy notice, retention policy, escalation SOP, secret production, `MFA_REQUIRED=true`, `R2_EVIDENCE_ENABLED=false`, dan `CSP_MODE=enforce`; jalankan `npm run release:preflight`.
3. Ambil restore point Neon, jalankan migration via direct connection, verifikasi schema/migration record, bootstrap admin production sekali, enroll MFA/recovery, lalu hapus seluruh `AUTH_PRODUCTION_BOOTSTRAP_*`.
4. Pastikan Git integration Netlify menunjuk `main`, merge commit immutable yang disetujui, dan tunggu provider deploy. Jangan menggunakan trigger CLI manual.
5. Verifikasi HTTPS/TLS, HSTS, CSP enforcing, Turnstile, public/admin smoke, monitoring, rollback deploy, dan rollback owner sebelum membuka website.

## Bukti yang masih harus dikumpulkan di luar repository

- hasil migration dan restore drill preview;
- screenshot/log UAT dua hari serta keputusan setiap finding medium;
- bukti dua recovery owner dan handoff organisasi;
- Netlify deploy dari commit `main`, domain TLS, monitoring, rollback, serta public/admin smoke production.
