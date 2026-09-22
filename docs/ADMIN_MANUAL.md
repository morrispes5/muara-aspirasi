# Panduan singkat admin dan mahasiswa

## Alur mahasiswa

1. Buka **Kirim Aspirasi**. Isi nama, NIM tepat 10 angka, email dan WhatsApp. Semua kolom isian wajib; contoh bukan data otomatis.
2. Pilih kategori, tulis judul, lokasi, kronologi, dampak dan usulan. Jika belum tahu solusinya, tulis bahwa kamu meminta bantuan BEM menentukan solusi.
3. Pilih privasi. Default identitas hanya untuk BEM. Izin dihubungi dan berbagi terbatas tidak wajib dicentang. Setujui etika, periksa ulang, lalu verifikasi anti-spam dan kirim sekali.
4. Simpan bukti `.txt`. Opsional: pilih **Simpan di perangkat pribadi ini** (jangan pada komputer bersama).
5. Di **Lacak Aspirasi**, tempel bukti, buka file `.txt`, atau pilih **Bukti di perangkat ini**. Tekan **Lacak aspirasi** untuk membaca status dan pesan BEM. Ini tidak menampilkan catatan internal.

Tidak ada akun mahasiswa. Bukti memuat kunci akses privat. File tidak diunggah saat dibuka, tetapi kode/kunci dikirim melalui POST HTTPS ketika melakukan pelacakan. Cadangan browser tidak tersinkron, dapat hilang saat data browser dibersihkan, dibatasi 20 bukti/90 hari, dan hanya berlaku di browser/origin yang sama. Jika seluruh salinan hilang, belum ada reset otomatis melalui email atau NIM. Jangan mengirim laporan duplikat sebagai cara memulihkan token.

## Alur admin

1. Login dengan satu email pemilik, password dan MFA. Sesi aktif membuat browser tidak perlu login di setiap navigasi. Gunakan **Keluar** di perangkat bersama.
2. `/admin` membuka **Tabel aspirasi**. Cari nama/NIM/email/judul/kode, pilih status, lalu **Cari / terapkan**. Filter lanjutan menyediakan tanggal, kategori dan arsip. Di layar kecil geser tabel ke samping.
3. **Lihat / edit** membuka isi ringkas. Pada **Tindak lanjut**, pilih status yang diizinkan, tulis kabar mahasiswa dan simpan. Untuk pesan saja, pilih status yang sama. Klarifikasi memerlukan pesan; menolak laporan memerlukan alasan.
4. **Edit data laporan & identitas** untuk koreksi yang telah dikonfirmasi mahasiswa, bukan mengganti cerita. Isi alasan. Versi lama yang terbuka di tab lain akan ditolak; muat ulang sebelum mengedit lagi. Kontak kosong di laporan lama tidak boleh dikarang.
5. **+ Tambah laporan** untuk aspirasi yang disampaikan langsung kepada BEM. Konfirmasikan sepengetahuan dan persetujuan pelapor. Bukti yang muncul disampaikan hanya kepada pelapor melalui kanal privat terverifikasi.
6. **Hapus ke arsip** menyembunyikan laporan dari antrean aktif, bukan menghapus permanen. Pilih filter **Arsip / terhapus** lalu **Pulihkan** untuk meninjau kembali. Riwayat tetap ada.
7. **Ekspor Excel (.xlsx)** memakai filter yang sudah diterapkan, termasuk halaman lain, maksimal 2.000 laporan. File berisi kode, nama, NIM, email, judul, kategori, status, tanggal WIB dan status arsip. NIM tetap teks. Jangan unggah file ini ke repo publik/layanan lain. Tidak ada fitur impor spreadsheet ke database.

## Cek manual sebelum soft launch

- Incognito: `/admin` menuju login; akses API admin tanpa sesi ditolak, termasuk ekspor/tambah/edit.
- Form: NIM kosong, bukan angka, 9 atau 11 angka, email kosong/salah dan solusi kosong harus ditolak. NIM tepat 10 angka diterima; angka nol di depan dipertahankan. Uji dengan data sintetis pada Preview yang diizinkan, bukan identitas nyata.
- Setelah satu kiriman sintetis: file bukti dapat membuka progres; tidak ada token di alamat URL. Tanpa memilih simpan, browser tidak otomatis memiliki cadangan. Cadangan yang sengaja disimpan bisa dipilih dan dihapus tanpa menghapus laporan di BEM.
- Admin: cari laporan sintetis, koreksi sesuai konfirmasi pelapor, tambahkan pesan, lalu baca pesan lewat pelacakan. Catatan internal tidak terlihat mahasiswa.
- Ekspor: periksa nama/NIM/email dan filter pada Excel. NIM panjang/berawalan nol tetap sama. Teks yang diawali `=` tetap teks, bukan rumus.
- Arsipkan laporan sintetis, pastikan hilang dari aktif lalu pulihkan dari arsip. Pengujian otomatis memakai mock/synthetic fixtures; perubahan Production perlu izin pengelola.

## Anti-spam dan batasnya

Turnstile diverifikasi server-side, honeypot, idempotency, validasi ukuran/form, serta rate limit database tetap aktif. Pengiriman publik dibatasi 5 percobaan/jaringan/jam dan circuit breaker global; login/MFA/pelacakan punya batas tersendiri. Jaringan kampus bersama dapat berbagi kuota. Ini bukan bukti identitas mahasiswa dan bukan jaminan nol spam. NIM/email berformat valid belum berarti telah diverifikasi. Admin meninjau isi sebelum menindaklanjuti.

## Perbaikan navigasi admin - 22 September 2026

- `/admin` tetap mengarah ke `/admin/laporan`. Menu duplikat Beranda admin dihapus agar tidak terlihat seperti dua halaman berbeda.
- Tabel aspirasi ditandai aktif saat tabel, tambah, atau detail laporan dibuka. Menu lain mengikuti alamat halaman, termasuk navigasi kembali/maju browser. Penanda tidak berpindah hanya karena hover.
- Perpindahan halaman menampilkan status memuat dan loading di area konten, sambil mempertahankan menu admin. Transisi hanya warna, tanpa menggeser tata letak, dan menghormati reduced motion.
- Di layar kecil menu dapat digeser mendatar; kontrol akun/sesi tersedia melalui Akun & sesi agar tabel tidak terdorong jauh ke bawah.
- Verifikasi manual: buka tabel, Update advokasi, Tabel aspirasi, detail, lalu kembali; periksa satu menu aktif, fokus keyboard, status loading, dan tabel pada desktop serta ponsel. Tidak perlu mengubah laporan untuk pengujian ini.

## Pencarian dan tindak lanjut admin - 22 September 2026

- Pencarian nama menerima beberapa kata dengan urutan bebas dan merapikan spasi berlebih. Setiap kata harus ditemukan dalam nama, NIM, email, judul, lokasi atau kode yang boleh dilihat oleh peran pengguna. NIM mempertahankan digit dan nol di depan; salah atau kurang digit tidak dikoreksi otomatis. Laporan lama tanpa identitas perlu dicari melalui judul atau kode.
- Tekan **Cari / terapkan** setelah mengubah isian. Ringkasan **Filter diterapkan** menunjukkan cakupan hasil, termasuk tanggal dan arsip. Hasil kosong menyediakan **Cari di semua status & arsip**, yang mempertahankan kata pencarian sambil melepas filter lain. Gangguan server ditampilkan sebagai kegagalan memuat, bukan hasil nol.
- **Tindak lanjut** adalah satu formulir untuk mengubah status atau menambahkan kabar. Pilihan awal mempertahankan status saat ini; admin harus memilih tahap berikutnya secara sengaja. Mengirim pesan dengan status yang sama tetap menambah riwayat.
- Setelah simpan berhasil, konfirmasi hijau tetap terlihat sesudah data diperbarui dan dapat ditutup. Saat menyimpan, pengiriman berikutnya dikunci. Jika gagal, pesan kesalahan tampil dan draft dipertahankan; pada konflik versi, gunakan **Muat data terbaru** sebelum meninjau dan mengirim ulang.
- **Progres & riwayat tanggapan** selalu ditampilkan: status saat ini, petunjuk tindak lanjut, kabar terakhir, waktu WIB, pelaku, alasan, dan riwayat terbaru dahulu. Pesan tersedia pada halaman pelacakan mahasiswa; ini tidak membuktikan sudah dibaca dan tidak mengirim email/WhatsApp.
- PIC, klasifikasi, catatan internal, arsip dan audit tetap tersedia di pengelolaan lanjutan. Catatan internal tetap privat. Koreksi laporan memiliki konfirmasi tersendiri tanpa menghapus persetujuan atau riwayat.
- Regresi otomatis menggunakan identitas sintetis: SQL pencarian berizin dan count konsisten, spasi/kata/karakter literal, refresh halaman setelah simpan, draft saat gagal, konflik versi, klik ganda, koreksi, dan perluasan cakupan pencarian. Verifikasi Production dilakukan hanya dengan membaca data; tidak menambahkan tanggapan percobaan ke laporan mahasiswa.

Validasi lokal perubahan ini: 365 tes lulus, 3 tes integrasi opsional dilewati; lint, pemeriksaan tipe, pemeriksaan migrasi dan build Production lulus. Tes penyimpanan memakai API mock dan tidak membuktikan pengiriman pesan Production.

## Identitas dan pencarian salah ketik - 22 September 2026

- NIM wajib tepat **10 angka** pada pengiriman mahasiswa, pencatatan admin, dan koreksi identitas. Aturan panjang mengikuti [petunjuk resmi E-Learning Budi Luhur](https://elearning.budiluhur.ac.id/). Nol di depan tetap disimpan. Arti kode jurusan/kampus tidak disimpulkan; format bukan bukti keaktifan mahasiswa. Input lebih panjang ditolak, bukan dipotong otomatis menjadi NIM lain.
- Nama/NIM yang cocok tetap dicari pada seluruh laporan sesuai filter sebelum pagination. Jika hasil pasti kosong, API admin mencoba kandidat identitas mirip: NIM berbeda satu pengetikan, atau setiap kata nama berbeda sedikit (maksimal dua untuk kata tujuh huruf atau lebih). Hasil muncul sebagai **Kemungkinan cocok — periksa identitas**, disertai nilai tersimpan dan tautan laporan, bukan sebagai kecocokan pasti atau perubahan data otomatis.
- Kandidat diproses server-side dengan izin identitas privat, mengikuti filter status, kategori, tanggal, assignment dan arsip. Pencarian kandidat mengambil maksimum 1.000 laporan dari database setelah penyaringan awal, bukan 25 baris halaman tabel; tampil maksimal 10 kandidat terdekat. Jika batas pemeriksaan tercapai, UI meminta filter dipersempit dan tidak mengklaim seluruh data sudah diperiksa. Kandidat tidak masuk ekspor Excel atau pelacakan publik.
- NIM lama dengan format berbeda tetap dapat dibaca/dicari dan ditandai **perlu dikonfirmasi**. Admin dapat memeriksa identitas dengan pelapor dan memakai koreksi beralasan yang diaudit. Tidak ada perbaikan massal, penyatuan identitas, perubahan nama/NIM asli, atau migrasi data otomatis.
- Regresi mencakup kandidat sesudah 300 laporan sintetis, digit hilang/berlebih/tertukar, dua salah ketik berdekatan pada nama, izin, filter, batas pemeriksaan, pemisahan hasil pasti/kandidat, serta validasi NIM di klien dan server. Identitas nyata tidak dipakai sebagai fixture publik.

Validasi lokal perbaikan identitas: 386 tes lulus, 3 integrasi opsional dilewati; lint, TypeScript dan build Production lulus. Pemeriksaan browser dengan input masalah dan bukti deploy dicatat pada PR rilis.
