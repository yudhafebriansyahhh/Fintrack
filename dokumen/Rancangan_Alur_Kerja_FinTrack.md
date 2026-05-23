# Dokumen Rancangan Alur Kerja Sistem

**FinTrack - Personal Finance Management System**

## 1. Pendahuluan

Dokumen ini menjelaskan alur kerja utama FinTrack dari sudut pandang pengguna dan sistem. Dokumen ini melengkapi PRD dan rancangan ERD agar proses bisnis aplikasi lebih mudah dipahami sebelum pengembangan lanjutan.

Alur kerja disusun berdasarkan keputusan produk terbaru: dompet hanya terdiri dari `cash`, `bank`, `e_wallet`, dan `other`; tabungan dan bisnis menjadi modul terpisah; transfer antar dompet tidak dihitung sebagai cashflow; dan pembayaran tagihan harus menghasilkan transaksi pengeluaran agar laporan tetap akurat.

## 2. Daftar Alur Kerja Utama

| No | Alur Kerja | Prioritas | Status Implementasi | Keterangan |
|---|---|---|---|---|
| 1 | Register dan Login | P0 | Tersedia | Akses awal pengguna ke sistem. |
| 2 | Tambah/Edit Dompet Fleksibel | P0 | Tersedia | Form menyesuaikan jenis dompet. |
| 3 | Tambah Provider Bank/E-Wallet Custom | P1 | Parsial | Struktur tersedia, flow UI/API belum selesai. |
| 4 | Catat Pemasukan | P0 | Tersedia | Menambah saldo dompet. |
| 5 | Catat Pengeluaran | P0 | Tersedia | Mengurangi saldo dompet. |
| 6 | Transfer Antar Dompet | P0 | Tersedia/Alternatif | Memindahkan saldo tanpa memengaruhi cashflow, disimpan di wallet_transfers. |
| 7 | Bayar Tagihan | P1 | Parsial | Target flow harus membuat transaksi pengeluaran otomatis. |
| 8 | Transaksi via Telegram | P1 | Tersedia | Pencatatan cepat melalui bot. |
| 9 | Lihat Dashboard | P0 | Tersedia | Melihat ringkasan kondisi keuangan. |
| 10 | Lihat Laporan | P1 | Tersedia | Menganalisis transaksi per periode. |
| 11 | Nonaktifkan Data Berelasi | P0/P1 | Parsial | Dompet sudah, kategori/provider perlu dilengkapi. |

## 3. Alur Register dan Login

1. Pengguna membuka aplikasi FinTrack.
2. Pengguna memilih menu Register.
3. Pengguna mengisi nama, email, password, dan data pendukung.
4. Sistem melakukan validasi data.
5. Sistem menyimpan akun dengan password yang sudah di-hash.
6. Pengguna melakukan login.
7. Sistem memvalidasi email dan password.
8. Jika valid, sistem mengarahkan pengguna ke dashboard.
9. Setiap data finansial yang dibuat setelah login harus terhubung ke user tersebut.

## 4. Alur Tambah/Edit Dompet Fleksibel

1. Pengguna membuka halaman Dompet.
2. Pengguna menekan tombol Tambah Dompet atau Edit Dompet.
3. Sistem menampilkan modal/form dompet.
4. Pengguna memilih jenis dompet: Tunai, Bank, E-Wallet, atau Lainnya.
5. Sistem menampilkan field sesuai jenis dompet yang dipilih.
6. Pengguna mengisi data dompet.
7. Sistem melakukan validasi.
8. Sistem menyimpan perubahan dompet.
9. Saat membuat dompet baru, saldo awal disimpan sebagai `initial_balance` dan `current_balance`.
10. Dompet tampil pada daftar dompet dan total saldo aktif diperbarui.

### 4.1 Kondisi Form Berdasarkan Jenis Dompet

| Jenis Dompet | Field yang Muncul | Catatan |
|---|---|---|
| Tunai | Nama dompet, saldo awal, dompet utama | Form sederhana, tanpa provider/logo khusus. |
| Bank | Pilih bank, nama dompet, nomor rekening opsional, nama pemilik rekening opsional, saldo awal, dompet utama | Logo otomatis mengikuti provider bank. User dapat menambah bank sendiri jika belum tersedia. |
| E-Wallet | Pilih e-wallet, nama dompet, nomor HP opsional, saldo awal, dompet utama | Logo otomatis mengikuti provider e-wallet. User dapat menambah e-wallet sendiri jika belum tersedia. |
| Lainnya | Nama dompet, saldo awal, logo opsional, dompet utama | Untuk dompet yang tidak termasuk cash/bank/e-wallet. |

### 4.2 Alur Tambah Provider Custom

1. Pengguna memilih jenis Bank atau E-Wallet.
2. Sistem menampilkan daftar provider default dan provider custom milik user.
3. Jika provider tidak tersedia, pengguna memilih Tambah Provider Sendiri.
4. Pengguna mengisi nama provider.
5. Pengguna dapat mengunggah logo provider custom jika fitur upload diaktifkan.
6. Sistem memvalidasi nama, tipe provider, dan format logo.
7. Sistem menyimpan provider dengan `user_id` pengguna dan `is_default = false`.
8. Provider custom tampil di daftar pilihan hanya untuk pengguna tersebut.
9. Pengguna melanjutkan pengisian data dompet.

Status saat ini: flow tambah provider custom sudah tersedia dari form tambah/edit dompet. Provider custom disimpan sebagai milik user, dapat memakai logo opsional, lalu otomatis tersedia di pilihan provider.

## 5. Alur Catat Pemasukan

1. Pengguna membuka menu Transaksi atau menekan tombol Tambah Transaksi dari halaman terkait.
2. Pengguna memilih jenis Pemasukan.
3. Pengguna memilih dompet tujuan.
4. Pengguna memilih kategori pemasukan.
5. Pengguna mengisi nominal, tanggal, dan catatan opsional.
6. Sistem memvalidasi dompet aktif, kategori, nominal, dan tanggal.
7. Sistem menyimpan transaksi dengan type `income`.
8. Sistem menambah `current_balance` pada dompet terkait.
9. Dashboard, laporan, dan insight diperbarui.
10. Setelah schema diperluas, transaksi manual harus menyimpan `source = manual` dan `status = success`.

## 6. Alur Catat Pengeluaran

1. Pengguna membuka menu Transaksi atau menekan tombol Tambah Transaksi dari halaman terkait.
2. Pengguna memilih jenis Pengeluaran.
3. Pengguna memilih dompet sumber.
4. Pengguna memilih kategori pengeluaran.
5. Pengguna mengisi nominal, tanggal, dan catatan opsional.
6. Sistem memvalidasi dompet aktif, kategori, nominal, tanggal, dan aturan saldo minus.
7. Sistem menyimpan transaksi dengan type `expense`.
8. Sistem mengurangi `current_balance` pada dompet terkait.
9. Dashboard, laporan, dan insight diperbarui.
10. Setelah schema diperluas, transaksi manual harus menyimpan `source = manual` dan `status = success`.

## 7. Alur Edit dan Hapus Transaksi

1. Pengguna membuka detail atau daftar transaksi.
2. Pengguna memilih transaksi yang ingin diedit atau dihapus.
3. Jika transaksi diedit, sistem membalik efek saldo transaksi lama.
4. Sistem menerapkan data transaksi baru dan menghitung ulang efek saldo.
5. Jika transaksi dihapus, sistem membalik efek saldo transaksi tersebut.
6. Dashboard, laporan, saldo dompet, dan insight diperbarui.
7. Jika status `cancelled` diaktifkan, sistem dapat membatalkan transaksi tanpa hard delete.

## 8. Alur Transfer Antar Dompet

1. Pengguna membuka form Transfer.
2. Pengguna memilih dompet sumber.
3. Pengguna memilih dompet tujuan.
4. Pengguna mengisi nominal transfer, tanggal, dan catatan opsional.
5. Sistem memvalidasi dompet sumber dan tujuan milik user, aktif, dan berbeda.
6. Sistem memvalidasi saldo dompet sumber sesuai aturan saldo minus.
7. Sistem mengurangi saldo dompet sumber.
8. Sistem menambah saldo dompet tujuan.
9. Sistem menyimpan record transfer.
10. Transfer tampil sebagai activity/riwayat pada detail dompet.
11. Transfer tidak dihitung sebagai pemasukan atau pengeluaran pada dashboard, laporan, dan cashflow.

Catatan arsitektur saat ini: implementasi memakai tabel `wallet_transfers`. ERD ideal menyediakan opsi transfer di `transactions.type = transfer`, tetapi keputusan implementasi saat ini tetap memisahkan transfer agar cashflow lebih aman.

## 9. Alur Bayar Tagihan

1. Pengguna membuka halaman Tagihan.
2. Pengguna memilih tagihan/cicilan yang belum dibayar atau terlambat.
3. Pengguna menekan tombol Bayar.
4. Sistem menampilkan form pembayaran.
5. Pengguna memilih dompet pembayaran.
6. Pengguna mengisi tanggal pembayaran dan nominal jika pembayaran parsial diizinkan.
7. Sistem memvalidasi tagihan, dompet aktif, nominal, dan saldo.
8. Sistem membuat transaksi pengeluaran otomatis.
9. Sistem mengurangi saldo dompet pembayaran.
10. Sistem membuat riwayat pembayaran pada `bill_payments` atau struktur setara.
11. Sistem mengubah status item tagihan menjadi paid, partial, atau status lain sesuai aturan.
12. Dashboard, daftar tagihan, laporan, dan insight diperbarui.

Status saat ini: Telegram sudah membuat transaksi expense saat bayar tagihan, tetapi flow web masih perlu disamakan karena baru menandai paid dan paid_date.

## 10. Alur Transaksi Melalui Telegram Bot

1. Pengguna membuka halaman Telegram di aplikasi.
2. Sistem membuat OTP/linking code.
3. Pengguna mengirim kode ke bot Telegram.
4. Sistem menyimpan chat_id dan status koneksi.
5. Pengguna mengirim pesan transaksi, misalnya `makan ayam geprek 18000 cash`.
6. Bot melakukan parsing pesan untuk mendeteksi nominal, kategori, dompet, tipe, dan catatan.
7. Jika data jelas, bot menyimpan transaksi dan memperbarui saldo.
8. Bot mengirim konfirmasi transaksi berhasil.
9. Jika data kurang jelas atau format tidak dikenali, bot mengirim contoh format yang benar.
10. Transaksi yang berhasil dari Telegram harus menyimpan `source = telegram` setelah schema source tersedia.
11. Dashboard dan laporan diperbarui.

Telegram juga dapat mendukung perintah saldo, daftar dompet, tagihan, bayar tagihan, transfer, ringkasan, dan top kategori.

## 11. Alur Lihat Dashboard

1. Pengguna membuka Dashboard.
2. Sistem mengambil total saldo dompet aktif.
3. Sistem menghitung pemasukan dan pengeluaran bulan berjalan.
4. Sistem mengambil tagihan aktif, mendekati jatuh tempo, dan terlambat.
5. Sistem mengambil transaksi atau activity terbaru.
6. Sistem menghitung cashflow dan insight sederhana.
7. Sistem menampilkan grafik pemasukan vs pengeluaran.
8. Transfer tidak dimasukkan ke total income/expense, tetapi dapat muncul sebagai activity jika konteks halaman mendukung.

## 12. Alur Lihat Laporan

1. Pengguna membuka halaman Laporan.
2. Pengguna memilih filter tanggal, kategori, tipe transaksi, atau dompet.
3. Sistem mengambil transaksi sesuai filter.
4. Sistem menghitung total pemasukan dan pengeluaran.
5. Sistem menampilkan grafik tren, kategori, dan ringkasan dompet.
6. Sistem menampilkan status tagihan jika laporan mendukung.
7. Sistem menyediakan export CSV client-side pada implementasi saat ini.
8. Export PDF/Excel server-side menjadi pengembangan lanjutan.
9. Transfer tetap dikecualikan dari cashflow walaupun nantinya ditampilkan pada export activity.

## 13. Alur Nonaktifkan Data Berelasi

### 13.1 Dompet

1. Pengguna memilih hapus dompet.
2. Sistem memeriksa apakah dompet memiliki transaksi atau transfer.
3. Jika tidak memiliki relasi, dompet dapat dihapus permanen.
4. Jika memiliki relasi, dompet dinonaktifkan.
5. Dompet nonaktif tidak digunakan untuk transaksi baru.
6. Riwayat lama tetap dapat ditampilkan untuk keperluan audit.

### 13.2 Kategori

1. Pengguna memilih hapus kategori.
2. Sistem memeriksa apakah kategori memiliki transaksi.
3. Jika belum digunakan, kategori dapat dihapus permanen.
4. Jika sudah digunakan, kategori dinonaktifkan.
5. Kategori nonaktif tidak muncul sebagai pilihan transaksi baru.
6. Transaksi lama tetap mempertahankan kategori tersebut.

Status saat ini: dompet sudah mengikuti pola ini; kategori masih perlu diubah karena saat ini delete kategori yang sudah dipakai masih ditolak.

### 13.3 Provider

1. Pengguna atau admin memilih hapus/nonaktifkan provider.
2. Sistem memeriksa apakah provider digunakan oleh dompet.
3. Jika belum digunakan, provider custom dapat dihapus permanen.
4. Jika sudah digunakan, provider dinonaktifkan.
5. Provider nonaktif tidak muncul untuk dompet baru, tetapi dompet lama tetap menyimpan relasinya.

## 14. Kondisi Alternatif dan Validasi

| Kondisi | Respons Sistem |
|---|---|
| Saldo tidak cukup saat pengeluaran/transfer/bayar tagihan | Sistem menolak transaksi atau menampilkan peringatan sesuai aturan saldo minus. |
| Dompet nonaktif dipakai transaksi baru | Sistem menolak dan menampilkan validation/toast error. |
| Kategori tidak tersedia | Pengguna dapat memilih kategori lain atau membuat kategori baru. |
| Provider bank/e-wallet tidak tersedia | Pengguna dapat menambahkan provider custom. |
| Format pesan Telegram tidak dikenali | Bot mengirim contoh format yang benar. |
| Dompet sudah memiliki transaksi/transfer | Dompet tidak dihapus permanen, hanya dinonaktifkan. |
| Kategori/provider sudah digunakan | Data tidak dihapus permanen, tetapi dinonaktifkan. |
| Tagihan melewati jatuh tempo | Status ditampilkan sebagai terlambat dan muncul pada daftar prioritas. |
| Transfer ditampilkan pada laporan | Transfer boleh tampil sebagai activity, tetapi tidak masuk total income/expense. |

## 15. Rekomendasi Format Logo Provider

Untuk logo bawaan sistem, gunakan SVG karena ringan, tajam, dan cocok untuk dashboard modern. Untuk logo yang diunggah user, batasi ke PNG/JPG/WebP agar lebih aman dan mudah divalidasi. Jika upload SVG dibuka untuk user, file harus disanitasi agar tidak membawa script berbahaya.

## 16. Kesimpulan

Alur kerja FinTrack dirancang agar setiap proses utama saling terhubung dengan saldo, laporan, tagihan, dan insight. Prioritas terdekat adalah menutup gap provider custom, kategori inactive, source transaksi, dan pembayaran tagihan web agar core finansial konsisten sebelum masuk ke budget, target tabungan, smart finance, dan integrasi lanjutan.
