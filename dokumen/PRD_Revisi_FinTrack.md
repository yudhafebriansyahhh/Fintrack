# Product Requirements Document (PRD) Revisi

**FinTrack - Personal Finance Management System**

## 1. Ringkasan Produk

FinTrack adalah aplikasi pencatatan dan manajemen keuangan pribadi yang membantu pengguna mengelola pemasukan, pengeluaran, saldo dompet, tagihan, cicilan, laporan keuangan, serta pencatatan cepat melalui bot. Produk ini berfokus pada pencatatan manual yang praktis, pemantauan saldo lintas dompet, pengelolaan tagihan, dan insight sederhana agar pengguna memahami kondisi keuangannya.

PRD revisi ini menjadi acuan pengembangan setelah fitur core mulai berjalan. Dokumen ini juga menegaskan keputusan produk terbaru: dompet hanya mencakup `cash`, `bank`, `e_wallet`, dan `other`; sedangkan tabungan, bisnis, budget, dan smart finance menjadi modul terpisah pada tahap lanjutan.

## 2. Tujuan Produk

- Membantu pengguna mencatat pemasukan dan pengeluaran secara mudah melalui web maupun bot.
- Membantu pengguna mengetahui posisi saldo dari beberapa dompet seperti tunai, bank, dan e-wallet.
- Membantu pengguna mengelola tagihan dan cicilan agar tidak terlambat membayar.
- Menyediakan dashboard dan laporan yang menampilkan kondisi keuangan secara ringkas.
- Memberikan insight sederhana berdasarkan pemasukan, pengeluaran, saldo, dan tagihan.
- Menjadi fondasi pengembangan fitur lanjutan seperti budget, target tabungan, financial health score, OCR struk, WhatsApp, export laporan, dan rekomendasi otomatis.

## 3. Latar Belakang Masalah

Banyak pengguna sulit mengontrol keuangan pribadi karena transaksi harian tidak tercatat secara konsisten. Penggunaan beberapa sumber uang seperti cash, rekening bank, dan e-wallet membuat total saldo sulit dipantau. Pengguna juga sering lupa terhadap tagihan atau cicilan yang mendekati jatuh tempo. Karena itu, dibutuhkan sistem yang praktis, terpusat, dan mudah digunakan untuk mencatat transaksi, memantau saldo, mengelola tagihan, serta melihat laporan keuangan.

## 4. Target Pengguna

| Pengguna | Kebutuhan Utama |
|---|---|
| Mahasiswa | Mengatur uang bulanan, mencatat pengeluaran harian, dan mengontrol saldo. |
| Pekerja | Mengelola gaji, tagihan, cicilan, tabungan, dan cashflow. |
| Freelancer | Mencatat pemasukan tidak tetap dan mengevaluasi arus kas. |
| Pelaku usaha kecil | Memisahkan uang pribadi dan operasional sederhana. |
| Pengguna umum | Mengontrol pengeluaran, saldo, dan tagihan rutin. |

## 5. Ruang Lingkup Produk

### 5.1 Ruang Lingkup Core

- Autentikasi pengguna.
- Dashboard keuangan.
- Manajemen dompet fleksibel untuk `cash`, `bank`, `e_wallet`, dan `other`.
- Provider default dan provider custom untuk bank/e-wallet.
- Manajemen kategori transaksi.
- Pencatatan pemasukan dan pengeluaran.
- Transfer antar dompet tanpa memengaruhi cashflow.
- Manajemen tagihan dan cicilan.
- Laporan dan grafik transaksi.
- Insight keuangan sederhana.
- Integrasi Telegram bot.
- Pengaturan profil dan keamanan akun.

### 5.2 Ruang Lingkup Lanjutan

- Budget bulanan.
- Target tabungan.
- Modul bisnis/usaha kecil.
- Reminder tagihan multi-channel.
- Financial health score.
- Rekomendasi keuangan otomatis.
- WhatsApp integration.
- OCR scan struk.
- Export laporan PDF/Excel.
- Gamifikasi.

### 5.3 Di Luar Ruang Lingkup Awal

- Integrasi langsung dengan rekening bank.
- Sinkronisasi otomatis dengan e-wallet.
- Pembayaran tagihan eksternal secara langsung dari aplikasi.
- Investasi saham, crypto, atau reksadana.
- Konsultasi keuangan profesional secara langsung.

## 6. Kondisi Sistem Saat Ini

| Modul | Status | Keterangan |
|---|---|---|
| Dashboard | Tersedia | Menampilkan ringkasan saldo, pemasukan, pengeluaran, tagihan, cashflow, transaksi terbaru, saldo per dompet, dan insight sederhana. |
| Dompet | Tersedia | CRUD dompet sudah mendukung cash, bank, e-wallet, other, provider default, logo, saldo awal/current, dompet utama, aktif/nonaktif, dan form dinamis. |
| Provider dompet | Tersedia | Provider default tersedia. User dapat menambah provider custom bank/e-wallet dari form tambah/edit dompet dengan logo opsional. |
| Kategori | Parsial | CRUD kategori tersedia, tetapi metadata `is_default`, `status/is_active`, icon, dan color belum lengkap. |
| Transaksi | Tersedia/Parsial | Income dan expense manual sudah mengubah saldo. Source, status, attachment, dan transfer dalam schema transactions belum lengkap. |
| Transfer | Tersedia sebagai alternatif | Transfer memakai `wallet_transfers`, tidak masuk cashflow, dan tampil sebagai activity pada detail dompet. |
| Tagihan | Parsial | Tagihan/cicilan tersedia, tetapi pembayaran web belum konsisten karena belum membuat transaksi expense otomatis dan riwayat pembayaran. |
| Telegram | Tersedia | Mendukung link akun, pencatatan transaksi, saldo, tagihan, transfer, ringkasan, top kategori, dan bayar tagihan. Source transaksi belum tersimpan di schema. |
| WhatsApp | Ekstra/lanjutan | Kode integration, parser, webhook, dan gateway sudah ada meski roadmap menempatkannya sebagai tahap lanjutan. |
| Laporan | Tersedia | Menampilkan ringkasan, grafik, filter, tren, kategori, dompet, dan export CSV client-side. PDF/Excel masih lanjutan. |
| Insight sederhana | Tersedia | Insight dashboard berdasarkan kondisi pemasukan, pengeluaran, saldo, dan tagihan. |

## 7. Kebutuhan Fungsional

### 7.1 Autentikasi Pengguna

Pengguna dapat register, login, logout, reset password, verifikasi email, mengubah password, dan menggunakan PIN aplikasi jika fitur keamanan tambahan diaktifkan.

Acceptance Criteria:

- Pengguna dapat membuat akun baru.
- Pengguna dapat login menggunakan email dan password.
- Data setiap pengguna terpisah berdasarkan user ID.
- Sistem menolak login jika kredensial salah.
- PIN aplikasi menjadi fitur tambahan yang dapat dikembangkan setelah core stabil.

### 7.2 Dashboard Keuangan

Dashboard menampilkan ringkasan kondisi keuangan pengguna dalam satu halaman.

Acceptance Criteria:

- Menampilkan total saldo dompet aktif.
- Menampilkan total pemasukan dan pengeluaran bulan berjalan.
- Menampilkan tagihan aktif, tagihan mendekati jatuh tempo, dan tagihan terlambat.
- Menampilkan grafik cashflow.
- Menampilkan transaksi atau activity terbaru.
- Menampilkan insight singkat.

### 7.3 Manajemen Dompet Fleksibel

Pengguna dapat mengelola dompet dengan tipe `cash`, `bank`, `e_wallet`, dan `other`. Form tambah/edit dompet berubah sesuai tipe yang dipilih. Tabungan dan bisnis bukan tipe dompet, tetapi modul terpisah yang dapat terhubung ke dompet sebagai sumber atau tujuan dana.

Acceptance Criteria:

- Pengguna dapat menambahkan, melihat, mengedit, menonaktifkan, dan menghapus dompet kosong.
- Jika memilih Tunai, form hanya menampilkan nama dompet, saldo awal, dan status dompet utama.
- Jika memilih Bank, sistem menampilkan daftar bank default atau opsi tambah bank sendiri.
- Jika memilih E-Wallet, sistem menampilkan daftar e-wallet default atau opsi tambah e-wallet sendiri.
- Jika memilih Lainnya, pengguna dapat mengisi nama dompet, saldo awal, dan logo custom opsional.
- Logo provider default tampil otomatis dari data sistem.
- Saldo awal menjadi `initial_balance` dan `current_balance`.
- Dompet yang sudah memiliki transaksi atau transfer tidak dihapus permanen, tetapi dinonaktifkan.

### 7.4 Provider Bank dan E-Wallet

Sistem menyediakan provider default bank/e-wallet dan memungkinkan pengguna membuat provider custom jika provider belum tersedia.

Acceptance Criteria:

- Provider default memiliki `user_id` null dan `is_default` true.
- Provider custom memiliki `user_id` sesuai pemilik dan hanya tampil untuk user tersebut.
- Provider default menggunakan logo SVG dari sistem.
- Provider custom dapat memiliki logo PNG/JPG/WebP yang divalidasi.
- Provider yang sudah digunakan tidak dihapus permanen, tetapi dinonaktifkan.

### 7.5 Pencatatan Transaksi

Pengguna dapat mencatat pemasukan dan pengeluaran. Transfer antar dompet dicatat sebagai perpindahan saldo dan tidak dihitung sebagai pemasukan/pengeluaran.

Acceptance Criteria:

- Transaksi pemasukan menambah saldo dompet.
- Transaksi pengeluaran mengurangi saldo dompet.
- Transfer antar dompet mengurangi saldo sumber dan menambah saldo tujuan.
- Transfer tidak dihitung dalam total income/expense dan cashflow.
- Saldo menyesuaikan jika transaksi diedit atau dihapus.
- Transaksi memiliki sumber pencatatan: manual, telegram, whatsapp, atau ocr jika schema sudah diperluas.
- Transaksi dapat memiliki status success, pending, atau cancelled jika fitur status transaksi diaktifkan.

### 7.6 Manajemen Kategori

Pengguna dapat mengelompokkan transaksi berdasarkan kategori default dan kategori custom.

Acceptance Criteria:

- Sistem menyediakan kategori default.
- Pengguna dapat menambahkan kategori custom.
- Kategori dipisahkan berdasarkan income dan expense.
- Kategori dapat memiliki icon dan color.
- Kategori yang sudah digunakan tidak dihapus permanen, tetapi dinonaktifkan.

### 7.7 Tagihan dan Cicilan

Pengguna dapat mencatat tagihan, cicilan, jatuh tempo, nominal, status pembayaran, dan dompet pembayaran.

Acceptance Criteria:

- Pengguna dapat menambahkan tagihan dan cicilan.
- Sistem menampilkan tagihan belum dibayar, terlambat, dan mendekati jatuh tempo.
- Pengguna dapat memilih dompet saat membayar tagihan.
- Saat tagihan dibayar, sistem membuat transaksi pengeluaran otomatis.
- Pembayaran tagihan mengurangi saldo dompet pembayaran.
- Tagihan berulang memiliki riwayat pembayaran.

### 7.8 Laporan Keuangan

Sistem menampilkan laporan transaksi dalam bentuk tabel dan grafik berdasarkan periode, kategori, tipe, dan dompet.

Acceptance Criteria:

- Laporan dapat difilter berdasarkan tanggal.
- Laporan dapat difilter berdasarkan kategori, tipe transaksi, dan dompet.
- Sistem menampilkan total pemasukan dan pengeluaran.
- Sistem menampilkan grafik transaksi dan perbandingan cashflow.
- Transfer tetap dapat muncul sebagai activity/riwayat, tetapi tidak masuk perhitungan income/expense.
- Export PDF/Excel menjadi pengembangan lanjutan.

### 7.9 Integrasi Telegram Bot

Pengguna dapat mencatat transaksi melalui Telegram setelah akun terhubung dengan bot.

Acceptance Criteria:

- Pengguna dapat menghubungkan akun dengan Telegram.
- Bot dapat membaca format transaksi sederhana.
- Bot dapat membaca perintah saldo, tagihan, transfer, ringkasan, dan top kategori.
- Bot memberikan konfirmasi transaksi.
- Jika format tidak dikenali, bot mengirim contoh format yang benar.
- Transaksi dari Telegram disimpan dengan source telegram setelah schema source tersedia.

### 7.10 Insight Keuangan Sederhana

Sistem memberikan informasi ringkas berdasarkan kondisi pemasukan, pengeluaran, saldo, dan tagihan.

Acceptance Criteria:

- Insight muncul di dashboard.
- Insight dapat mendeteksi jika pengeluaran lebih besar dari pemasukan.
- Insight dapat memberi peringatan tagihan atau cashflow.
- Financial health score dan rekomendasi otomatis menjadi tahap lanjutan.

## 8. Role Pengguna

| Role | Hak Akses |
|---|---|
| User | Mengelola akun, dompet, kategori, transaksi, tagihan, laporan, Telegram bot, dan pengaturan. |
| Admin | Mengelola kategori/provider default, statistik pengguna, laporan bug, template insight, dan konfigurasi sistem. |

## 9. Struktur Menu Aplikasi

| Menu | Fungsi |
|---|---|
| Dashboard | Ringkasan saldo, pemasukan, pengeluaran, tagihan, transaksi/activity terbaru, dan insight. |
| Dompet | Kelola dompet tunai, bank, e-wallet, lainnya, provider, saldo, dan transfer. |
| Kategori | Kelola kategori pemasukan dan pengeluaran. |
| Transaksi | Catat dan kelola pemasukan serta pengeluaran. |
| Tagihan | Kelola tagihan, cicilan, dan pembayaran. |
| Telegram | Hubungkan akun dan kelola pencatatan melalui bot Telegram. |
| Laporan | Lihat grafik dan laporan transaksi. |
| Settings | Kelola profil, keamanan, dan preferensi sistem. |

Catatan: WhatsApp dapat disembunyikan atau ditampilkan sebagai fitur eksperimen sampai keputusan produk final dibuat.

## 10. Aturan Bisnis Utama

- Setiap data finansial wajib terhubung dengan user.
- Setiap transaksi pemasukan menambah saldo dompet.
- Setiap transaksi pengeluaran mengurangi saldo dompet.
- Transfer antar dompet tidak dihitung sebagai pemasukan atau pengeluaran.
- Saldo dompet harus disesuaikan jika transaksi diedit, dihapus, atau dibatalkan.
- Kategori, provider, atau dompet yang memiliki relasi penting tidak dihapus permanen, tetapi dinonaktifkan.
- Provider bank/e-wallet default disediakan oleh sistem, sedangkan provider custom hanya dapat diakses oleh user pembuatnya.
- Logo default sistem menggunakan SVG, sedangkan logo upload user dibatasi ke format aman seperti PNG/JPG/WebP.
- Pembayaran tagihan adalah pencatatan pembayaran, bukan pembayaran langsung ke pihak eksternal.

## 11. Struktur Data Utama

| Tabel | Fungsi |
|---|---|
| users | Menyimpan data pengguna. |
| wallet_providers | Menyimpan daftar bank dan e-wallet, termasuk logo default/custom. |
| wallets | Menyimpan dompet user. |
| categories | Menyimpan kategori transaksi. |
| transactions | Menyimpan pemasukan dan pengeluaran; dapat diperluas untuk source, status, attachment, dan transfer jika diputuskan. |
| wallet_transfers | Menyimpan transfer antar dompet pada implementasi saat ini. |
| bill_groups / bill_items | Menyimpan tagihan dan cicilan pada implementasi saat ini. |
| bill_payments | Target struktur untuk menyimpan riwayat pembayaran tagihan. |
| budgets | Menyimpan budget bulanan pada tahap lanjutan. |
| saving_goals | Menyimpan target tabungan pada tahap lanjutan. |
| saving_goal_deposits | Menyimpan riwayat setoran target tabungan pada tahap lanjutan. |
| bot_integrations | Target struktur untuk integrasi Telegram/WhatsApp yang lebih rapi. |

## 12. Roadmap Pengembangan

| Tahap | Fokus Pengembangan |
|---|---|
| Tahap 1 - Stabilitas Core | Stabilkan auth, dashboard, dompet, provider, kategori, transaksi, transfer, tagihan, laporan dasar, dan Telegram bot. |
| Tahap 2 - Konsistensi Data Finansial | Rapikan source/status transaksi, pembayaran tagihan web, riwayat pembayaran, kategori inactive/default, dan reminder tagihan. |
| Tahap 3 - Kontrol Keuangan | Implementasi budget bulanan, target tabungan, laporan bulanan lebih detail, dan export awal. |
| Tahap 4 - Smart Finance | Uang aman harian, financial health score, insight otomatis, dan rekomendasi keuangan. |
| Tahap 5 - Integrasi dan Otomatisasi | WhatsApp stabil, OCR scan struk, export PDF/Excel, gamifikasi, dan integrasi lanjutan. |

## 13. Rekomendasi Aset Logo Dompet

Logo bawaan sistem untuk bank dan e-wallet disarankan menggunakan SVG karena tajam di berbagai ukuran, ringan, dan cocok untuk UI. Logo custom yang diunggah user disarankan dibatasi pada PNG/JPG/WebP untuk alasan keamanan dan kemudahan validasi. Jika sistem menerima upload SVG dari user, file harus disanitasi terlebih dahulu.

## 14. Keputusan Arsitektur yang Perlu Dijaga

- Transfer saat ini menggunakan `wallet_transfers`, bukan `transactions.type = transfer`.
- Transfer tetap tampil sebagai activity/riwayat, tetapi tidak masuk perhitungan cashflow.
- Dompet memakai `is_active` pada implementasi saat ini meskipun ERD ideal memakai `status` enum.
- Tagihan memakai struktur `bill_groups` dan `bill_items`; perlu keputusan apakah struktur ini menjadi standar final atau disesuaikan ke `bills` dan `bill_payments`.
- Integrasi bot saat ini sebagian masih tersimpan di `users` dan log pesan; `bot_integrations` menjadi target perapihan jika multi-platform distabilkan.

## 15. Kesimpulan

PRD revisi ini menegaskan arah FinTrack sebagai aplikasi pencatatan dan manajemen keuangan pribadi yang fokus pada core finansial terlebih dahulu. Prioritas terdekat adalah menutup gap provider custom, kategori inactive/default, source/status transaksi, konsistensi pembayaran tagihan, dan riwayat pembayaran sebelum masuk ke budget, target tabungan, smart finance, dan integrasi lanjutan.
