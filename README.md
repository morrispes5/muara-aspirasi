# Muara Aspirasi

**Suaramu didengar. Perubahannya dikawal.**

[Buka website](https://muaraaspirasi.netlify.app) · [Kirim aspirasi](https://muaraaspirasi.netlify.app/aspirasi/kirim) · [Lacak aspirasi](https://muaraaspirasi.netlify.app/aspirasi/lacak)

Muara Aspirasi adalah portal aspirasi dan informasi mahasiswa BEM FTI Universitas Budi Luhur. Mahasiswa dapat menyampaikan masalah, kritik, saran, dan ide tentang pengalaman kuliah; BEM mengelola tindak lanjutnya dan menerbitkan perkembangan advokasi yang aman dibaca publik.

Portal ini membantu agar aspirasi tidak tenggelam dalam percakapan chat dan mahasiswa bisa mengetahui perkembangannya. Laporan asli bukan unggahan publik. Muara Aspirasi bukan pengganti sistem akademik atau layanan darurat, dan tidak menjanjikan semua persoalan pasti selesai.

## Untuk siapa?

| Pengguna                        | Yang dapat dilakukan                                                                               |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Mahasiswa aktif FTI             | Mengirim aspirasi, menyimpan bukti pelacakan, dan memeriksa progres tanpa membuat akun.            |
| Pengelola BEM yang diberi akses | Memverifikasi laporan, mencatat tindak lanjut, menjaga identitas pelapor, dan mengelola publikasi. |
| Pengunjung umum                 | Membaca informasi mahasiswa dan pembaruan advokasi yang sudah disetujui untuk dipublikasikan.      |

Kategori aspirasi meliputi fasilitas, laboratorium, ruang belajar, proses akademik, perpustakaan, kesejahteraan mahasiswa non-darurat, dan usulan perbaikan.

## Cara menggunakan

1. Buka **Kirim Aspirasi**, isi nama/NIM dan detail masalah atau ide.
2. Tentukan persetujuan penggunaan identitas, baca etika pelaporan, dan selesaikan verifikasi anti-spam.
3. Setelah berhasil, **salin atau unduh bukti pelacakan pribadi**. Simpan di tempat pribadi; bukti ini tidak dapat diterbitkan ulang oleh BEM.
4. Buka **Lacak Aspirasi** dan tempel bukti untuk membaca status serta pesan dari BEM. Kode dan token versi sebelumnya tetap didukung.

Bukti pelacakan menggabungkan kode laporan dan kunci rahasia dalam satu teks. Kunci tidak dimasukkan ke URL, disimpan otomatis di browser, atau dipublikasikan. Orang yang memegang bukti dapat membaca progresnya, jadi jangan membagikannya.

## Privasi dan akses admin

Identitas pelapor secara default hanya dapat dilihat pengelola BEM yang berwenang. Pembagian identitas minimum kepada unit terkait membutuhkan persetujuan pelapor. Catatan internal, kontak, dan laporan asli tidak menjadi konten publik.

Halaman `/admin/login` dapat dibuka dari internet, tetapi membuka halaman login tidak memberikan akses dashboard. Login memakai email pemilik yang ditetapkan melalui konfigurasi server, kata sandi, dan kode authenticator. Pendaftaran publik dinonaktifkan. Server memeriksa email, status akun, sesi, MFA, dan izin untuk akses administrasi. Email pemilik, password, dan kode pemulihan tidak disertakan dalam source.

Anti-spam memakai validasi server, Cloudflare Turnstile, honeypot, idempotency key untuk mencegah pengiriman ganda, dan rate limit bersama di PostgreSQL. Batas pengiriman adalah 5 percobaan per jaringan per jam; jaringan kampus bersama dapat berbagi batas ini. Login, MFA, dan pelacakan juga dibatasi. Respons pembatasan menyertakan waktu tunggu. Kontrol ini mengurangi penyalahgunaan, bukan jaminan bahwa spam mustahil terjadi.

## Status layanan

Website tersedia di Netlify. Alur utama mencakup pengiriman, pelacakan privat, pengelolaan laporan, informasi mahasiswa, dan publikasi advokasi. Lampiran bukti belum dibuka pada layanan saat ini; notifikasi email/WhatsApp dan penjadwalan retensi otomatis belum diaktifkan.

Source pada branch revisi dapat mendahului deployment aktif. Pull request dan status deployment menjadi acuan apakah perubahan terbaru sudah tersedia di website.

## Source, aset, dan publikasi GitHub

**Setiap file dan riwayat commit dalam repository publik dapat di-clone. GitHub tidak memiliki izin clone per folder.** `.gitignore`, `export-ignore`, dan pemberitahuan hak cipta tidak membatasi akses clone.

Repository operasional menyimpan aset asli kampus/BEM dan harus tetap privat selama aset itu ada di riwayatnya. Untuk membagikan kode, buat paket source terpisah:

```sh
npm run export:source
```

Perintah ini mengekspor **commit HEAD**, bukan perubahan lokal yang belum di-commit, ke `dist/muara-aspirasi-source.zip`. Paket tidak membawa `.git`/riwayat, dokumentasi operasional, gambar asli, `.env.local`, credential provider, atau data database. Aset pada `public/images` sengaja tidak disertakan: gunakan materi milik sendiri jika menjalankan source tersebut. Paket belum otomatis diunggah atau menjadi repository publik.

Gunakan paket yang sudah diperiksa sebagai awal repository publik baru tanpa riwayat repository operasional. Jangan mengubah repository operasional langsung menjadi public untuk mencoba menyembunyikan beberapa folder. Gambar yang ditampilkan website tetap dapat diunduh pengunjung website.

Belum ada lisensi open-source yang diberikan. Lihat [pemberitahuan penggunaan](SOURCE_NOTICE.md); logo, foto, identitas institusi, dan materi kampanye tidak otomatis mendapat izin penggunaan ulang.

## Pengembangan lokal

Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Better Auth, Drizzle ORM, Neon PostgreSQL, Cloudflare Turnstile, dan Netlify.

Gunakan Node.js sesuai `.nvmrc`, lalu:

```sh
npm ci
```

Salin `.env.example` menjadi `.env.local` dan isi konfigurasi untuk database development milik sendiri. Jangan memakai credential Production. `BEM_OWNER_EMAIL` adalah satu email yang boleh login; pada Preview/Production, konfigurasi kosong menolak akses. `BETTER_AUTH_SECRET` dan `PUBLIC_ABUSE_SIGNAL_SECRET` harus berbeda dan acak. Cloudflare test keys hanya untuk development/Preview.

```sh
npm run dev
```

Tanpa konfigurasi database, beberapa halaman publik dapat ditinjau tetapi pengiriman dan login tidak berfungsi. Migration dan bootstrap dijalankan terpisah oleh pengelola environment; meng-clone source tidak membuat akun admin atau memberi akses layanan asli.

## Pemeriksaan perubahan

```sh
npm run lint
npm run typecheck
npm test
npm run db:check
npm run build
npm run test:e2e
```

CI memeriksa kualitas source, browser smoke, dan pola secret di riwayat Git. Jangan memasukkan laporan mahasiswa, token pelacakan, atau credential ke issue, screenshot, log, dan pull request.
