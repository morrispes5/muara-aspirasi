# UX/UI Design System — Muara Aspirasi

> Status: token dan arahan visual menjadi baseline UI M1–M6; queue/detail case management M6 sudah diimplementasikan. Publication publik, R2, dan polish release masih mengikuti milestone berikutnya.
> Lima gambar di `docs/assets` adalah referensi visual, bukan production asset.

## 1. Arah pengalaman

Muara Aspirasi harus terasa seperti layanan kampus yang modern, profesional, hangat, dan dapat dipercaya—bukan social-media complaint wall dan bukan dashboard birokrasi yang dingin.

Prinsip desain:

1. **Aman sebelum menarik:** jelaskan privacy, scope, dan proses sebelum meminta data.
2. **Tugas utama terlihat:** `Kirim Aspirasi` dan `Lacak Aspirasi` mudah ditemukan di mobile maupun desktop.
3. **Bahasa manusia:** gunakan Bahasa Indonesia yang tenang, jelas, tidak defensif, dan tidak menjanjikan hasil.
4. **Transparansi bertahap:** bedakan “laporan diterima”, “BEM sedang berkoordinasi”, dan “aksi telah dilakukan”.
5. **Privasi terlihat:** selalu jelaskan data mana yang optional, siapa yang dapat melihatnya, dan bahwa laporan bukan public post.
6. **Mobile-first:** flow submission target dapat selesai kurang dari lima menit pada layar kecil.
7. **Aksesibel sebagai default:** semantic structure, keyboard, focus, contrast, label, dan feedback bukan tambahan akhir.

## 2. Pengguna dan mental model

| Pengguna             | Mental model yang harus dibantu                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| Pengunjung/mahasiswa | “Saya memahami program, dapat mengirim tanpa akun, dan laporan saya tidak langsung menjadi publik.”       |
| Pelapor              | “Saya menyimpan code + secret token dan hanya melihat update yang aman untuk saya.”                       |
| BEM Editor           | “Saya menyusun informasi publik tanpa melihat data pelapor yang tidak diperlukan.”                        |
| BEM Advocate         | “Saya memproses case privat, memisahkan internal note dari reporter message, dan mengetahui next action.” |
| BEM Admin            | “Saya mengelola approval, user, policy, dan audit dengan guardrail yang jelas.”                           |

Tidak ada akun mahasiswa dan tidak ada moderator role terpisah pada MVP.

## 3. Struktur navigasi

### Institution bar

- Identitas tekstual Universitas Budi Luhur, FTI, dan BEM FTI.
- Logo hanya digunakan setelah izin serta file resmi dikonfirmasi.
- Tidak boleh mengambil ruang berlebihan pada mobile.

### Header utama

- Brand teks `Muara Aspirasi`.
- Navigasi: `Beranda`, `Update Advokasi`, `Info Mahasiswa`, `Tentang`.
- Secondary action: `Lacak Aspirasi`.
- Primary action: `Kirim Aspirasi`.
- Mobile: tombol menu berlabel, focusable, dan mengumumkan state expand/collapse.

### Footer

- Penjelasan singkat program dan ownership BEM FTI.
- Link Tentang, Privacy, Etika Pelaporan, contact resmi, dan emergency disclaimer.
- Source/credit serta legal/permission logo bila sudah disetujui.

Admin memakai shell terpisah agar navigasi publik tidak bercampur dengan case management.

## 4. Halaman publik

| Route                    | Tujuan UX                          | Content minimum                                                                                                   |
| ------------------------ | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/`                      | Memahami program dan memilih aksi  | Hero, scope, category, cara kerja, latest update/info, commitment, CTA.                                           |
| `/aspirasi/kirim`        | Mengirim laporan aman dan terarah  | Step/progress, fields, identity mode, evidence rules, ethics/Turnstile, review, success with tracking credential. |
| `/aspirasi/lacak`        | Membuka timeline privat            | Code + secret token form, generic failure, safe timeline, last update, scope reminder.                            |
| `/update`                | Membaca update advokasi            | Filter category/status, cards, pagination, empty state.                                                           |
| `/update/[slug]`         | Memahami satu update               | Safe article, progress label, date, category, source/credit.                                                      |
| `/info-mahasiswa`        | Menemukan informasi berguna        | Category/filter, pinned content, cards, pagination.                                                               |
| `/info-mahasiswa/[slug]` | Membaca detail informasi           | Article, date, source link, related information.                                                                  |
| `/tentang`               | Memahami scope dan proses          | Program, FAQ, process, ethics, contact, non-emergency statement.                                                  |
| `/kebijakan-privasi`     | Memahami pemrosesan data           | Data collected, purpose, access, retention, rights/channel, version/date.                                         |
| `/etika-pelaporan`       | Mencegah misuse dan unsafe content | Content rules, prohibited data, urgent escalation direction.                                                      |

Halaman privacy/ethics tidak boleh memakai placeholder pada public launch.

## 5. Halaman setelah login BEM

| Route konseptual        | Pengguna              | Tujuan                                                                                              |
| ----------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `/admin/login`          | BEM                   | Login tanpa public signup.                                                                          |
| `/admin`                | Semua role BEM        | Ringkasan tugas sesuai role, bukan expose seluruh data.                                             |
| `/admin/laporan`        | Advocate/Admin        | Queue, filter, pagination, urgency, tanggal, assignment/PIC, arsip, dan reset filter.               |
| `/admin/laporan/[id]`   | Advocate/Admin        | Case detail dengan section jelas untuk report, identity, evidence metadata, timeline, notes, audit. |
| `/admin/update`         | Editor/Advocate/Admin | Draft/review/publish advocacy updates sesuai permission.                                            |
| `/admin/info-mahasiswa` | Editor/Advocate/Admin | Draft/review/schedule/publish student info.                                                         |
| `/admin/users`          | Admin                 | Manage user, role, suspension, session.                                                             |
| `/admin/audit`          | Admin                 | Search audit events tanpa menampilkan secret/PII berlebihan.                                        |
| `/admin/settings`       | Admin                 | Policy version dan konfigurasi non-secret yang disetujui.                                           |

Admin UI harus membedakan secara visual:

- original report;
- restricted identity/evidence;
- internal note;
- reporter-visible message;
- proposed public update.

## 6. Komponen yang distandarkan

### Global

- `Container`, `Stack`, `Cluster`, `Section`;
- institution bar, public header, mobile menu, admin sidebar, footer;
- button variants: primary, secondary, ghost, danger;
- link, icon button, skip link;
- card, badge, divider, callout;
- heading, body, caption, metadata row.

### Form

- label, hint, required/optional marker;
- text input, textarea, select, radio/card choice, checkbox;
- file picker dengan aturan dan progress;
- field error dan form summary error;
- multi-step progress;
- review panel;
- Turnstile slot;
- success credential panel dengan copy/download/print guidance.

### Content

- update card, information card, article header;
- category badge, progress/status badge;
- filter bar/drawer, pagination;
- source/credit block;
- timeline dan timeline item.

### Admin

- data table/list responsive;
- filter, sort, pagination;
- confidential-data notice;
- assignment control;
- internal note composer;
- reporter update composer;
- confirm dialog dengan reason field;
- permission denied state;
- audit event list.

Tambahkan shadcn/ui per komponen yang benar-benar dipakai; jangan menginstal seluruh library.

## 7. Design tokens — Proposed Default

Token berikut adalah starting point, bukan brand approval.

### Warna

| Token          | Nilai awal | Penggunaan                                                      |
| -------------- | ---------- | --------------------------------------------------------------- |
| `canvas`       | `#F6F8FB`  | Background halaman.                                             |
| `surface`      | `#FFFFFF`  | Card, dialog, form.                                             |
| `ink`          | `#102A43`  | Heading dan teks utama pada surface terang.                     |
| `muted-ink`    | `#52606D`  | Teks sekunder; tetap uji contrast.                              |
| `primary`      | `#155EEF`  | CTA/link/focus pada background terang.                          |
| `primary-soft` | `#EAF2FF`  | Highlight informatif.                                           |
| `warm-accent`  | `#F97316`  | Accent kampanye; bukan body text di putih tanpa contrast check. |
| `success`      | `#157A55`  | Success state.                                                  |
| `warning`      | `#9A6700`  | Warning/needs attention.                                        |
| `danger`       | `#B42318`  | Destructive/error.                                              |
| `border`       | `#D9E2EC`  | Border subtle.                                                  |

Aturan:

- Jangan menganggap warna pada JPG sebagai official brand token.
- Status tidak boleh dibedakan hanya dengan warna; selalu tambahkan label/icon/description.
- Target contrast WCAG AA: minimal 4.5:1 untuk teks normal dan 3:1 untuk teks besar/komponen grafis yang relevan.

### Tipografi

- Default aman: system sans-serif stack yang sudah dipakai foundation.
- Proposed Milestone 1: gunakan satu sans-serif yang dilayani melalui `next/font` atau local font yang memiliki izin; jangan memuat font pihak ketiga saat runtime tanpa keputusan privacy/performance.
- Base text 16px, line-height sekitar 1.5–1.7.
- Heading memakai hierarchy konsisten, bukan sekadar perubahan size.
- Batasi body article sekitar 65–75 karakter per baris pada desktop.

### Spacing

Gunakan base scale 4px: `4, 8, 12, 16, 24, 32, 48, 64`.

- control gap: 8–12px;
- card padding: 16px mobile, 20–24px desktop;
- section gap: 48px mobile, 64–96px desktop;
- container horizontal padding: 16–20px mobile, 24–32px tablet/desktop.

### Radius dan shadow

- control: 8px;
- card: 12–16px;
- dialog/large panel: 16px;
- pill hanya untuk badge/filter yang sesuai;
- gunakan border sebagai default; shadow tipis hanya untuk elevation nyata seperti dropdown/dialog.
- Hindari glow, glassmorphism berat, atau shadow dekoratif berlebihan.

## 8. Responsivitas

### Mobile, 320–639px

- satu kolom;
- CTA utama terlihat tanpa horizontal scroll;
- navigation menjadi accessible menu;
- table admin berubah menjadi stacked list atau horizontal container yang diberi affordance jelas;
- form action sticky hanya bila tidak menutup content/focus;
- touch target minimum 44 × 44px.

### Tablet, 640–1023px

- content grid dua kolom bila urutan baca tetap masuk akal;
- filter boleh menjadi drawer/popover;
- admin sidebar dapat collapsible.

### Desktop, ≥1024px

- container terkontrol, tidak meregangkan text line;
- dashboard dapat memakai sidebar + main content;
- detail report dapat memakai summary rail, tetapi restricted data tetap tidak mendominasi layar.

Uji minimum pada 320, 360, 768, 1024, dan 1440px serta zoom 200%.

## 9. State dan feedback

### Loading

- gunakan skeleton yang mengikuti layout, bukan spinner penuh untuk semua halaman;
- tombol mutation menunjukkan progress dan mencegah double submit;
- jangan menampilkan tracking credential sebelum transaksi benar-benar berhasil.

### Empty

- jelaskan mengapa kosong dan next action;
- contoh: “Belum ada update pada kategori ini” + reset filter;
- admin empty queue tidak boleh menyiratkan sistem error.

### Error

- pesan dekat field dan error summary pada form panjang;
- gunakan bahasa aman dan actionable;
- tracking failure generik: jangan membedakan code invalid vs token invalid;
- provider/database error tidak mengekspos detail internal;
- sertakan correlation/reference ID bila operasional siap.

### Success

- submission success menampilkan tracking code dan one-time secret token dengan instruksi penyimpanan yang sangat jelas;
- copy action memberi visual serta screen-reader feedback;
- status mutation admin menampilkan perubahan dan actor/time;
- destructive action selalu memakai confirmation dan reason bila diwajibkan.

### Offline/timeout

- jangan mengklaim submit berhasil tanpa response server;
- sediakan retry yang aman/idempotent;
- pertahankan draft form hanya jika privacy risk dan storage policy sudah disetujui. Default: jangan menyimpan chronology/PII otomatis di localStorage.

## 10. Content design

Gunakan istilah konsisten:

- “aspirasi” untuk report dari mahasiswa;
- “update advokasi” untuk public publication;
- “pesan untuk pelapor” untuk reporter-visible message;
- “catatan internal” untuk note yang tidak terlihat pelapor;
- “kode pelacakan” dan “token rahasia” sebagai dua credential berbeda.

Copy harus:

- menghindari janji bahwa BEM pasti menyelesaikan masalah;
- membedakan fakta terverifikasi, tindakan BEM, dan langkah selanjutnya;
- menyebut bahwa portal bukan layanan darurat;
- menghindari nada menyalahkan pelapor;
- tidak mengulang PII di notification/toast.

## 11. Aksesibilitas dasar

- Gunakan landmarks `header`, `nav`, `main`, `aside`, `footer` dan satu `h1` yang jelas per halaman.
- Sediakan skip link.
- Semua fungsi dapat digunakan dengan keyboard tanpa keyboard trap.
- Focus indicator terlihat dan tidak dihapus.
- Setiap form control memiliki programmatic label, description, dan error association.
- Jangan mengandalkan placeholder sebagai label.
- Error summary memindahkan focus secara tepat setelah submit gagal.
- Icon-only button memiliki accessible name.
- Dialog mengelola focus, Escape, dan return focus.
- Perubahan async penting diumumkan melalui live region yang tidak berisik.
- Hormati `prefers-reduced-motion`; animation tidak menjadi satu-satunya feedback.
- Gambar meaningful memiliki alt text; dekoratif memakai alt kosong.
- Caption, source, dan credit tersedia untuk media editorial.
- Uji screen reader dasar, keyboard-only, zoom 200%, contrast, dan reduced motion.

## 12. Penggunaan lima aset referensi

| File                               | Arahan yang boleh dipelajari                          | Larangan milestone ini                                                             |
| ---------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `BUDI LUHUR DEEPAN.jpg`            | Atmosfer kampus dan komposisi institusional.          | Jangan dipindahkan ke `public` atau dipakai sebagai hero tanpa izin foto tertulis. |
| `logo FTI.jpg`                     | Bentuk identitas FTI dan warna referensi.             | Jangan dianggap master logo resmi.                                                 |
| `muara aspirasi.jpg`               | Nuansa kampanye biru, pesan mahasiswa, motif megafon. | Jangan menyalin artwork/tipografi ke UI production tanpa file dan izin resmi.      |
| `Screenshot 2026-08-29 133950.png` | Referensi lockup horizontal institusi.                | Screenshot bukan production logo asset.                                            |
| `Screenshot 2026-08-29 134007.png` | Referensi identitas BEM FTI.                          | Screenshot bukan production logo asset.                                            |

Status sebelumnya: **referensi — belum digunakan di UI**. Status ini digantikan pada 29 Agustus 2026 setelah pengguna memberi persetujuan eksplisit untuk pemakaian lokal Milestone 1. Salinan kerja kelima file dipakai melalui `public/images`; sumber asli tidak dipindahkan atau diubah. Izin master resmi dan hak publikasi tetap wajib diverifikasi sebelum deploy.

Sebelum penggunaan production, owner harus menyediakan:

- file resmi (prefer vector/transparent bila tersedia);
- izin tertulis dan aturan brand;
- alt text serta source/credit;
- keputusan cropping/responsive treatment;
- kepastian bahwa wajah/nomor kendaraan/data lain pada foto boleh dipublikasikan.

## 13. Checklist review Milestone UI

- [ ] Halaman tetap terbaca pada 320px tanpa horizontal overflow.
- [ ] Semua CTA, field, menu, dialog, dan filter dapat digunakan keyboard.
- [ ] Heading/landmark hierarchy benar.
- [ ] Contrast token dan setiap state diuji, bukan hanya palette.
- [ ] Loading, empty, error, success, unauthorized, dan not-found tersedia.
- [ ] Reporter-visible vs internal content dibedakan melalui wording dan layout.
- [ ] Tidak ada PII pada card publik, toast, analytics, atau URL.
- [x] Identitas lokal diperlakukan proporsional; wordmark tetap menjadi brand utama dan logo tidak mendominasi UI.
- [ ] `npm run format:check`, lint, type-check, test, dan build lulus.
- [ ] Browser QA mobile/desktop dan accessibility smoke test dicatat.

## 14. Open Question dan Proposed Default

| Open Question                                         | Proposed Default                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Master logo dan brand guideline resmi?                | Jalankan Milestone 1 dengan wordmark teks/no-logo sampai file dan izin resmi diberikan.                                      |
| Font resmi?                                           | Gunakan system sans-serif terlebih dahulu; evaluasi local/`next/font` setelah brand review.                                  |
| Apakah homepage menampilkan foto kampus?              | Tidak pada first implementation; gunakan layout, illustration shape, atau neutral placeholder yang tidak memerlukan lisensi. |
| Progress label public final?                          | Gunakan istilah dari status PRD tetapi tulis copy publik non-teknis dan non-inflammatory setelah review BEM.                 |
| Apakah editor dapat melihat sanitized report summary? | Tidak secara default; buka hanya jika workflow editorial membutuhkannya dan permission disetujui.                            |
| Apakah form menyimpan draft lokal?                    | Tidak, untuk menghindari PII di browser; evaluasi encrypted/server draft hanya bila kebutuhan riset membuktikan perlu.       |
| Contact resmi dan urgent escalation copy?             | Tampilkan placeholder hanya di development; public launch diblokir sampai contact/SOP resmi tersedia.                        |

## 15. Referensi

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist)
- `ASSET_MANIFEST.md`
- `SECURITY_PRIVACY.md`

## 16. Keputusan implementasi Milestone 1

Keputusan berikut mengikat public shell yang sudah dibangun pada 29 Agustus 2026. Ia melengkapi rencana konseptual di atas tanpa mengubah route dan fitur yang masih ditunda.

- Header memprioritaskan wordmark teks `Muara Aspirasi`; setelah persetujuan eksplisit pengguna, lockup institusi kecil tampil pada desktop dan foto kampus dipakai di hero lokal. Izin produksi/master resmi masih wajib diverifikasi.
- Navigasi awal M1 kini dilanjutkan oleh route canonical M2/M4: `Kirim Aspirasi` menuju `/aspirasi/kirim`, `Lacak Aspirasi` menuju `/aspirasi/lacak`, dan `Masuk BEM` menuju `/admin/login`. Public signup tetap tidak tersedia.
- Menu mobile memakai state klien yang sangat terbatas untuk membuka/menutup navigasi; kontrol berlabel memiliki target sentuh minimal 44px dan tetap dapat dioperasikan keyboard.
- Token awal diterapkan melalui Tailwind CSS v4 di `globals.css`: canvas `#F6F8FB`, ink `#102A43`, primary `#155EEF`, border `#D9E2EC`, radius control 8px, radius card 16px, dan skala 4px. Untuk teks/icon accent, warm diperdalam menjadi `#C2410C` agar tidak memakai `#F97316` sebagai teks pada putih.
- Breakpoint shell menggunakan satu kolom sampai bawah `lg` dan navigasi desktop pada `lg` (1024px ke atas). Container memakai padding 20px mobile, 32px tablet, dan 40px desktop.
- Input dan textarea dapat dipakai sebagai komponen visual read-only pada placeholder, tetapi tidak berada dalam form, tidak memiliki submit, dan tidak mengirim atau menyimpan data.
- Data transparansi pada homepage dan route `/transparansi` selalu diberi label “contoh tampilan” atau “bukan data nyata”.

## 17. Arah visual kampus — pembaruan 29 Agustus 2026

- Hero memakai foto gerbang kampus dengan overlay navy agar copy tetap terbaca. Foto tersebut menjadi konteks tempat, bukan informasi operasional.
- Ilustrasi mahasiswa memakai karya orisinal lokal `student-voices-editorial.png`: tiga mahasiswa berdiskusi dengan megafon, buku, dan tablet. Gerak naik-turun ringan hanya berjalan bila pengguna tidak mengaktifkan `prefers-reduced-motion`.
- Poster Muara Aspirasi ditampilkan sebagai arsip kampanye; logo Universitas/FTI/BEM dibatasi pada lockup kecil di header, section kolaborasi, dan footer supaya komposisi tetap editorial dan tidak tampak seperti halaman institusi generik.
- Seluruh gambar memakai `next/image`, ukuran responsif, dan alt text. Tidak ada aset eksternal, gambar stok, logo Velorah, atau salinan desain/template pihak lain.

## 18. Keputusan IA Milestone 2

- Navigasi publik sekarang mengikuti informasi yang tersedia: `Beranda`, `Update Advokasi`, `Info Mahasiswa`, dan `Tentang`; `Lacak Aspirasi` menjadi aksi sekunder, sedangkan `Kirim Aspirasi` menjadi CTA utama.
- URL canonical alur mahasiswa adalah `/aspirasi/kirim` dan `/aspirasi/lacak`. Route singkat Milestone 1 (`/aspirasi` dan `/lacak`) dipertahankan hanya sebagai redirect server-side untuk kompatibilitas tautan.
- Milestone 5 menggantikan preview pada `/aspirasi/kirim` dan `/aspirasi/lacak` dengan form empat tahap, warning privasi/evidence, receipt code + token rahasia, dan form tracking privat. Form mempertahankan jawaban antar-tahap, memisahkan review dari pengiriman, serta tidak menampilkan PII kembali pada timeline. Upload bukti tetap tidak tersedia sampai R2 private dan aturan file disetujui.
- Archive dan detail `Update Advokasi` serta `Info Mahasiswa` memakai data contoh berlabel eksplisit. Card cukup memakai garis, ruang, dan tipografi; tidak ditambah glass atau metrik palsu.
- Setiap halaman publik statis memiliki satu `h1` melalui `PublicPageIntro`, sementara judul di dalam section memakai tingkat heading lanjutan.

## 19. Keputusan UI Milestone 6

- Queue memakai table pada desktop dan stacked card pada mobile; filter mencakup status, urgensi, kategori, tanggal diterima, assignment, PIC spesifik, arsip, dan pencarian.
- Queue memiliki loading, empty, error, pagination, dan reset state. Empty state tidak menyiratkan sistem gagal dan selalu memberi next action yang jelas.
- Detail memakai section terpisah untuk isi original, identity restricted, metadata evidence, klasifikasi internal, workflow, reporter-visible message, internal note, assignment, lifecycle, dan audit.
- Identity/evidence diberi notice restricted dan tidak dicampur dengan copy reporter-visible. Evidence M6 hanya metadata; tidak ada object URL atau download UI.
- Semua form mutation memiliki label, feedback `aria-live`, status disabled saat menyimpan, dan conflict message ketika versi report stale.
- Archive/reopen memakai reason selector dan confirmation dialog. Soft-delete note memakai alasan dan menampilkan tombstone, bukan body note lama.
- `EDITOR` dapat melihat shell BEM sesuai permission, tetapi tidak melihat antrean/detail report. UI tidak mengandalkan hidden link sebagai authorization; server tetap menjadi boundary.
