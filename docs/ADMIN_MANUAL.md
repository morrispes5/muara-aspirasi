# Panduan singkat admin dan mahasiswa

## Alur mahasiswa

1. Buka **Kirim Aspirasi**. Isi nama, NIM 7–20 angka (biasanya 10), email dan WhatsApp. Semua kolom isian wajib; contoh bukan data otomatis.
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
- Form: NIM 6 angka, huruf, email kosong/salah dan solusi kosong harus ditolak. NIM 7/10/20 angka diterima; angka nol di depan dipertahankan. Uji dengan data sintetis pada Preview yang diizinkan, bukan identitas nyata.
- Setelah satu kiriman sintetis: file bukti dapat membuka progres; tidak ada token di alamat URL. Tanpa memilih simpan, browser tidak otomatis memiliki cadangan. Cadangan yang sengaja disimpan bisa dipilih dan dihapus tanpa menghapus laporan di BEM.
- Admin: cari laporan sintetis, koreksi sesuai konfirmasi pelapor, tambahkan pesan, lalu baca pesan lewat pelacakan. Catatan internal tidak terlihat mahasiswa.
- Ekspor: periksa nama/NIM/email dan filter pada Excel. NIM panjang/berawalan nol tetap sama. Teks yang diawali `=` tetap teks, bukan rumus.
- Arsipkan laporan sintetis, pastikan hilang dari aktif lalu pulihkan dari arsip. Pengujian otomatis memakai mock/synthetic fixtures; perubahan Production perlu izin pengelola.

## Anti-spam dan batasnya

Turnstile diverifikasi server-side, honeypot, idempotency, validasi ukuran/form, serta rate limit database tetap aktif. Pengiriman publik dibatasi 5 percobaan/jaringan/jam dan circuit breaker global; login/MFA/pelacakan punya batas tersendiri. Jaringan kampus bersama dapat berbagi kuota. Ini bukan bukti identitas mahasiswa dan bukan jaminan nol spam. NIM/email berformat valid belum berarti telah diverifikasi. Admin meninjau isi sebelum menindaklanjuti.
