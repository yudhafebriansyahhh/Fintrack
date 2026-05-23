# Checklist Status Fitur FinTrack

Dokumen ini melacak kesesuaian fitur FinTrack terhadap PRD, rancangan alur kerja, dan rancangan ERD. Checklist harus diperbarui setiap kali fitur selesai, scope berubah, atau prioritas teknis bergeser.

## Ringkasan Status

| Status | Arti |
|---|---|
| Selesai | Fitur utama sudah tersedia dan sesuai kebutuhan inti dokumen. |
| Parsial | Fitur sudah ada, tetapi belum sepenuhnya sesuai PRD/alur/ERD. |
| Belum Ada | Fitur belum ditemukan pada implementasi saat ini. |
| Ekstra | Fitur ada di kode, tetapi berada di luar scope awal atau masuk scope lanjutan. |
| Alternatif | Implementasi berbeda dari ERD, tetapi sengaja dipakai sebagai pendekatan saat ini. |

## Prioritas Berikutnya

1. Samakan aturan pembayaran tagihan web agar memilih wallet, membuat transaksi pengeluaran otomatis, dan mencatat riwayat pembayaran.
2. Tambahkan source transaksi untuk manual, telegram, whatsapp, dan nanti ocr.
3. Putuskan status transaksi dan pola cancel/delete sebelum menambahkan fitur attachment/export final.
4. Dokumentasikan keputusan transfer: tetap `wallet_transfers` + activity merge, atau migrasi ke `transactions.type = transfer`.
5. Setelah core stabil, lanjutkan budget, target tabungan, reminder lanjutan, dan smart finance.

## Checklist Fitur Core

| No | Modul/Fitur | Prioritas | Status | Bukti Implementasi Saat Ini | Gap / Catatan | Langkah Selanjutnya |
|---|---|---|---|---|---|---|
| 1 | Register dan login | P0 | Selesai | Auth tersedia melalui Breeze, route dashboard dilindungi auth dan verified. | PIN aplikasi belum masuk core berjalan. | Pertahankan, tambah PIN jika masuk scope keamanan. |
| 2 | Reset password dan verifikasi email | P0 | Selesai | Fitur bawaan Breeze tersedia. | Perlu cek ulang UI final bila auth diubah. | Jalankan test auth saat perubahan auth dilakukan. |
| 3 | Pemisahan data per user | P0 | Selesai | Model utama memiliki user_id dan controller banyak memakai relasi user. | Query baru tetap perlu audit agar tidak bocor antar user. | Jadikan user scope wajib untuk fitur finansial. |
| 4 | Dashboard keuangan | P0 | Selesai | Dashboard menghitung saldo, income/expense bulan ini, cashflow, transaksi terbaru, tagihan, saldo dompet, dan insight. | Insight masih sederhana. | Tingkatkan setelah core transaksi/tagihan stabil. |
| 5 | Manajemen dompet dasar | P0 | Selesai | Wallet CRUD mendukung cash, bank, e-wallet, other, provider, detail akun, saldo awal/current, is_primary, is_active, edit lengkap, hapus/nonaktifkan. | Implementasi memakai is_active, bukan status enum ERD. | Pertahankan is_active atau migrasi setelah keputusan arsitektur. |
| 6 | Form dompet dinamis | P0 | Selesai | Form berubah berdasarkan type; bank/e-wallet memakai autocomplete provider berlogo; other mendukung logo custom; modal scrollable. | Provider custom sudah bisa dibuat dari form tambah/edit dompet. | Uji create/edit cash, bank, e-wallet, other, dan provider custom. |
| 7 | Saldo awal dompet | P0 | Selesai | Store wallet mengisi current_balance dari initial_balance. | Edit initial_balance tidak disediakan. | Pertahankan aturan ini kecuali ada fitur koreksi saldo. |
| 8 | Nonaktifkan dompet yang sudah berelasi | P0 | Selesai | Destroy wallet menonaktifkan dompet jika punya transaksi/transfer; wallet kosong dihapus permanen dan redirect ke index. | Nama field masih is_active. | Pastikan semua query hanya memakai dompet aktif saat perlu. |
| 9 | Wallet provider default | P1 | Selesai | wallet_providers table/model/seeder membaca logo default bank/e-wallet dan form memakai pilihan provider. | Seeder perlu dijalankan ulang jika logo provider bertambah. | Jalankan `php artisan db:seed --class=WalletProviderSeeder` setelah menambah logo. |
| 10 | Wallet provider custom user | P1 | Selesai | Struktur wallet_providers mendukung user_id nullable dan is_default; endpoint store tersedia; form tambah/edit dompet dapat menambah provider custom user. | Belum ada fitur edit/nonaktifkan provider custom. | Pertahankan create flow, tambah manajemen provider jika diperlukan. |
| 11 | Logo provider/default/custom | P1 | Selesai | Logo default tampil pada kartu/detail/autocomplete; dompet other dan provider custom mendukung upload logo PNG/JPG/WebP. | Edit logo provider custom belum tersedia. | Tambah manajemen provider jika diperlukan. |
| 12 | Kategori transaksi dasar | P0 | Selesai | Category CRUD tersedia, type income/expense, icon, color, is_default, is_active, seed defaults per user, dan icon picker visual pada form. | Default masih clone per user, bukan master global user_id null; warna tidak ditampilkan sebagai input user. | Pertahankan clone per user kecuali admin default global diprioritaskan. |
| 13 | Kategori default sistem | P0 | Selesai | Action seed-defaults menambahkan kategori bawaan dengan is_default, icon, color, dan is_active. | Default belum berupa master global user_id null. | Putuskan default global saat fitur admin dibuat. |
| 14 | Nonaktifkan kategori yang sudah dipakai | P0 | Selesai | Destroy kategori yang punya transaksi mengubah is_active menjadi false; kategori kosong tetap dihapus permanen. | Kategori nonaktif tidak muncul pada pilihan transaksi baru. | Uji create/edit/nonaktif/reaktif kategori. |
| 15 | Catat pemasukan manual | P0 | Selesai | Transaction store income membuat transaksi dan menambah saldo wallet. | Belum ada source/status. | Tambah source manual dan status success setelah schema diperluas. |
| 16 | Catat pengeluaran manual | P0 | Selesai | Transaction store expense membuat transaksi dan mengurangi saldo wallet. | Aturan saldo minus perlu diputuskan. | Tambah validasi saldo bila saldo negatif tidak diizinkan. |
| 17 | Edit transaksi menyesuaikan saldo | P0 | Selesai | Update membalik efek transaksi lama lalu menerapkan transaksi baru. | Perlu test regresi pindah wallet/type/amount. | Tambah test transaksi. |
| 18 | Hapus transaksi menyesuaikan saldo | P0 | Selesai | Destroy membalik saldo sebelum delete. | Belum memakai status cancelled. | Putuskan hard delete vs cancelled status. |
| 19 | Transfer antar dompet | P0 | Alternatif | WalletTransferController memindahkan saldo dan menyimpan wallet_transfers; Telegram/WhatsApp juga mendukung transfer; detail dompet menampilkan transfer sebagai activity. | ERD ideal menyimpan transfer di transactions.type transfer. | Dokumentasikan keputusan final sebelum export/report lanjutan. |
| 20 | Transfer tidak masuk cashflow | P0 | Selesai | Transfer dipisah dari transactions income/expense sehingga summary/chart/laporan tidak menghitung transfer. | Transfer tetap perlu tampil sebagai activity. | Gunakan pola activities untuk export. |
| 21 | Filter dan daftar transaksi | P0 | Selesai | Halaman transaksi memiliki filter type, wallet, category, tanggal, search, chart kategori dan trend. | Transfer tidak tampil di halaman transaksi. | Tambahkan tab/riwayat transfer jika dibutuhkan. |
| 22 | Attachment/bukti transaksi | P1 | Belum Ada | transactions belum punya attachment. | Upload bukti belum tersedia. | Tambah field dan upload aman bila masuk prioritas. |
| 23 | Source transaksi | P1 | Parsial | Telegram/WhatsApp membuat transaksi, tetapi schema tidak menyimpan source. | ERD mengharapkan manual/telegram/whatsapp/ocr. | Tambah source dan isi dari semua channel. |
| 24 | Status transaksi | P1 | Belum Ada | transactions belum punya status. | ERD mengharapkan success/pending/cancelled. | Tambah status jika fitur cancel/pending dibutuhkan. |
| 25 | Tagihan/cicilan dasar | P1 | Parsial | Ada bill_groups dan bill_items untuk tagihan/cicilan, jatuh tempo, status, dan generated installments. | Struktur berbeda dari ERD bills/bill_payments. | Putuskan mempertahankan bill_groups/items atau migrasi. |
| 26 | Daftar tagihan belum dibayar/telat | P1 | Selesai | Dashboard dan Telegram menampilkan unpaid/late bill items. | Web perlu dipastikan memprioritaskan overdue dengan jelas. | Uji kasus overdue. |
| 27 | Bayar tagihan via web | P1 | Parsial | BillItemController markPaid mengubah status dan paid_date. | Belum memilih wallet, belum membuat expense transaction, belum mencatat payment history. | Ubah flow web bayar tagihan. |
| 28 | Bayar tagihan via Telegram | P1 | Parsial | Telegram bill_paid membuat expense transaction, mengurangi wallet, dan menandai item paid. | Belum ada bill_payments/history; source transaksi belum tersimpan. | Tambah payment history dan source telegram. |
| 29 | Riwayat pembayaran tagihan | P1 | Belum Ada | Belum ada bill_payments table/model. | Perlu untuk audit pembayaran dan link ke transaksi expense. | Tambah bill_payments atau mapping setara pada bill_items. |
| 30 | Laporan keuangan | P1 | Selesai | Reports mendukung periode, filter kategori/type, summary, tren, kategori, dompet, status tagihan, dan CSV client-side. | PDF/Excel belum ada. | Tambah export server-side saat tahap lanjutan. |
| 31 | Insight keuangan sederhana | P0 | Selesai | Dashboard memberi insight berdasarkan net bulan ini dan kondisi tagihan/cashflow. | Belum health score/rekomendasi. | Tingkatkan di tahap smart finance. |
| 32 | Integrasi Telegram link akun | P1 | Selesai | TelegramController membuat OTP, webhook menyimpan chat_id, halaman Telegram menampilkan status. | Data integrasi belum di bot_integrations. | Pertimbangkan migrasi saat multi-platform distabilkan. |
| 33 | Telegram pencatatan transaksi | P1 | Selesai | TelegramBot parse transaksi, resolve wallet/category, simpan transaksi, update saldo. | Source telegram belum tersimpan. | Tambah source setelah schema diperluas. |
| 34 | Telegram format tidak dikenali | P1 | Selesai | TelegramBot mengembalikan invalidCommand/help sesuai parser. | Confirmation flow untuk ambigu belum lengkap. | Tambah jika parsing ambigu jadi prioritas. |
| 35 | Telegram saldo, tagihan, ringkasan, top kategori | P1 | Selesai | TelegramBot mendukung balance, bills, summary, top_categories, transfer, dan bill paid. | Fitur melebihi acceptance minimal. | Tambah test bot. |
| 36 | Settings/profile | P0/P1 | Parsial | Route settings dan profile tersedia. | PIN dan preferensi sistem belum dipetakan detail. | Audit Settings UI setelah core stabil. |
| 37 | Admin role dan fitur admin | P1 | Belum Ada | Belum ditemukan role admin/fitur admin dalam ringkasan implementasi. | PRD menyebut admin untuk provider/kategori default, statistik, bug, insight template. | Implementasi setelah core user selesai. |

## Checklist Fitur Scope Lanjutan

| No | Fitur | Tahap Roadmap | Status | Bukti Implementasi Saat Ini | Gap / Catatan | Langkah Selanjutnya |
|---|---|---|---|---|---|---|
| 1 | Budget bulanan | Tahap 3 | Belum Ada | Tidak ditemukan model/table budgets. | ERD sudah merancang budgets. | Implementasi setelah kategori/transaksi/laporan stabil. |
| 2 | Target tabungan | Tahap 3 | Belum Ada | Tidak ditemukan saving_goals dan saving_goal_deposits. | Tabungan bukan tipe dompet; harus modul tersendiri terhubung ke wallet. | Implementasi setelah transfer stabil. |
| 3 | Modul bisnis/usaha kecil | Tahap 3/4 | Belum Ada | Belum ada modul bisnis khusus. | Bisnis bukan tipe dompet; perlu scope terpisah. | Rancang setelah core personal finance stabil. |
| 4 | Reminder tagihan | Tahap 2 | Parsial | Ada BillReminder model dan scheduler/test reminder. | Perlu audit end-to-end pengiriman dan UI pengaturan reminder. | Validasi scheduler dan channel notifikasi. |
| 5 | Financial health score | Tahap 4 | Belum Ada | Belum ada modul skor kesehatan finansial. | Baru ada insight sederhana. | Rancang formula setelah data historis cukup. |
| 6 | Rekomendasi otomatis | Tahap 4 | Belum Ada | Belum ada modul rekomendasi. | Scope lanjutan. | Implementasi setelah score/insight matang. |
| 7 | WhatsApp integration | Tahap 5 | Ekstra | WhatsappController, webhook, parser, gateway, dan tests tersedia. | PRD menempatkan WhatsApp sebagai lanjutan, tetapi kode sudah ada. | Putuskan stabilkan sekarang atau sembunyikan dari menu utama. |
| 8 | OCR scan struk | Tahap 5 | Belum Ada | Tidak ditemukan OCR. | Butuh source transaksi dan attachment. | Tambah setelah source/attachment tersedia. |
| 9 | Export PDF/Excel | Tahap 5 | Parsial | Reports memiliki export CSV client-side. | PDF/Excel belum ada. | Tambah export server-side bila dibutuhkan. |
| 10 | Gamifikasi | Tahap 5 | Belum Ada | Tidak ditemukan gamifikasi. | Future scope. | Tunda sampai core matang. |
| 11 | Direct bank/e-wallet sync | Di luar scope awal | Belum Ada | Tidak ditemukan integrasi langsung bank/e-wallet. | Sesuai PRD: di luar scope awal. | Jangan implementasikan kecuali scope berubah. |
| 12 | Pembayaran tagihan eksternal langsung | Di luar scope awal | Belum Ada | Tidak ada payment gateway pembayaran eksternal. | Core hanya pencatatan pembayaran, bukan pembayaran real. | Hindari integrasi payment sebelum requirement baru. |

## Checklist Struktur Database terhadap ERD

| Entitas ERD | Status | Implementasi Saat Ini | Gap / Keputusan |
|---|---|---|---|
| users | Parsial | Users ada dengan auth fields, phone/OTP, whatsapp_chat_id, telegram_chat_id. | PIN hash belum jelas; bot_integrations belum dipisah. |
| wallet_providers | Selesai | Table/model/seeder tersedia untuk provider default dan provider custom; flow tambah provider custom user tersedia dari form dompet. | Edit/nonaktifkan provider custom belum dibuat karena belum menjadi kebutuhan core. |
| wallets | Parsial | Mendukung wallet_provider_id, account_name, phone_number, custom_logo, is_primary, cash/bank/e-wallet/other, balances, dan is_active. | Status enum ERD belum dipakai; implementasi memilih is_active. |
| categories | Selesai/Alternatif | Ada user_id, name, type, icon, color, is_default, dan is_active. | Implementasi memakai is_active dan clone default per user, bukan status enum/user_id null global. |
| transactions | Parsial | Ada income/expense. | Belum transfer, destination_wallet_id, source, status, attachment. |
| wallet_transfers | Alternatif | Ada table khusus transfer. | Dipakai sebagai keputusan implementasi saat ini; perlu dokumentasi final. |
| bills | Alternatif/Parsial | Diimplementasikan sebagai bill_groups dan bill_items. | Perlu keputusan apakah struktur ini menggantikan bills ERD atau perlu migrasi. |
| bill_payments | Belum Ada | Belum ditemukan table/model. | Perlu untuk history pembayaran dan link transaction expense. |
| budgets | Belum Ada | Belum ditemukan. | Scope lanjutan. |
| saving_goals | Belum Ada | Belum ditemukan. | Scope lanjutan. |
| saving_goal_deposits | Belum Ada | Belum ditemukan. | Scope lanjutan. |
| bot_integrations | Belum Ada | Integrasi bot disimpan di users dan pesan/log. | Perlu jika multi-platform ingin mengikuti ERD. |
| debts | Ekstra | Ada fitur hutang/piutang. | Tidak eksplisit di ERD, tetapi relevan dengan tagihan/cicilan. |
| bill_reminders | Ekstra | Ada model reminder tagihan. | Mendukung roadmap reminder. |
| whatsapp_messages | Ekstra | Dipakai untuk log WhatsApp/Telegram. | Bisa dipisahkan/dirapikan saat bot_integrations dibuat. |

## Risiko dan Catatan Arsitektur

1. Perbedaan terbesar dengan ERD adalah transfer, bill, dan bot integration.
   - Transfer saat ini memakai `wallet_transfers`, bukan `transactions.type = transfer`.
   - Tagihan saat ini memakai `bill_groups` dan `bill_items`, bukan `bills` dan `bill_payments` murni.
   - Telegram/WhatsApp saat ini memakai field di `users` dan log pesan, bukan `bot_integrations`.

2. Operasi saldo sudah berjalan dari beberapa jalur.
   - Manual transaction, wallet transfer, debt payment, Telegram, dan WhatsApp dapat memengaruhi saldo.
   - Setiap perubahan schema transaksi harus menjaga semua jalur tetap konsisten.

3. Pembayaran tagihan belum konsisten antar channel.
   - Telegram membuat transaksi expense dan mengurangi saldo.
   - Web hanya menandai paid tanpa transaksi expense.
   - Ini prioritas karena berdampak langsung ke cashflow dan laporan.

4. Provider custom create flow sudah selesai untuk kebutuhan dompet fleksibel.
   - Struktur database, endpoint store, upload logo opsional, dan UI tambah dari form dompet sudah tersedia.
   - Manajemen edit/nonaktifkan provider custom belum dibuat karena belum menjadi kebutuhan core.

5. WhatsApp sudah ada meski roadmap menempatkannya sebagai lanjutan.
   - Perlu keputusan produk apakah distabilkan sekarang, dijadikan fitur eksperimen, atau disembunyikan.

## Rekomendasi Urutan Kerja Teknis

### Tahap A - Rapikan Core Dompet dan Kategori

- [x] Tambahkan wallet_providers table/model/seeder.
- [x] Perluas wallets agar mendukung provider, account_name, phone_number, custom_logo, dan is_primary.
- [x] Ubah form wallet menjadi dinamis sesuai type.
- [x] Tampilkan transfer sebagai activity detail dompet tanpa masuk cashflow.
- [x] Tambahkan flow provider custom user untuk bank/e-wallet.
- [x] Tambahkan kategori status/is_default/icon/color atau minimal status inactive dulu.
- [x] Ubah delete kategori yang sudah dipakai menjadi inactive.

### Tahap B - Konsistensi Transaksi dan Tagihan

- [ ] Putuskan standar transfer: tetap `wallet_transfers` atau migrasi ke `transactions.type = transfer`.
- [ ] Tambahkan source transaksi.
- [ ] Tambahkan status transaksi jika pola cancel/pending dibutuhkan.
- [ ] Samakan transaksi dari manual, Telegram, dan WhatsApp agar source terisi.
- [ ] Ubah bayar tagihan web agar memilih wallet dan membuat expense transaction.
- [ ] Tambahkan bill_payments/payment history atau mapping setara pada struktur bill_items.

### Tahap C - Penguatan Bot dan Laporan

- [ ] Tambah test untuk Telegram transaction, transfer, bill paid, summary, dan invalid format.
- [ ] Pastikan laporan tetap exclude transfer jika transfer masuk transactions.
- [ ] Audit WhatsApp sebagai fitur ekstra: stabilkan atau tetap sembunyikan dari menu utama.
- [ ] Tambahkan bot_integrations jika multi-platform ingin mengikuti ERD.
- [ ] Tambah export server-side jika kebutuhan laporan final mulai dikerjakan.

### Tahap D - Roadmap Lanjutan

- [ ] Implementasi budgets.
- [ ] Implementasi saving goals dan saving goal deposits.
- [ ] Rancang modul bisnis/usaha kecil jika scope disetujui.
- [ ] Tingkatkan insight menjadi financial health score.
- [ ] Tambah rekomendasi otomatis.
- [ ] Tambah OCR struk.
- [ ] Tambah export PDF/Excel.
- [ ] Tambah gamifikasi jika core sudah stabil.

## Log Update

| Tanggal | Update |
|---|---|
| 2026-05-22 | Dokumen checklist awal dibuat berdasarkan PRD, rancangan alur kerja, rancangan ERD, dan inventaris kode Laravel/Inertia saat ini. |
| 2026-05-22 | Implementasi awal wallet provider default dan form dompet dinamis selesai; provider custom user dan upload logo custom masih menjadi next step. |
| 2026-05-22 | Scope dompet dikoreksi menjadi cash, bank, e-wallet, dan lainnya; tabungan/bisnis dipisahkan sebagai modul tersendiri yang terhubung ke dompet. |
| 2026-05-23 | Modal tambah dompet dibuat scrollable dan dompet Lainnya mendukung upload logo custom yang tampil di index/detail. |
| 2026-05-23 | Halaman detail dompet memakai tombol aksi biasa untuk tambah transaksi, transfer, edit dompet lengkap, dan hapus/nonaktifkan dompet. |
| 2026-05-23 | Fitur dompet memakai komponen reusable FormDropdown, Autocomplete, dan DatePicker pada modal tambah/edit dompet, transaksi, dan transfer. |
| 2026-05-23 | Error transaksi pada dompet nonaktif diubah menjadi validation/toast error, dan transfer tampil di riwayat detail dompet tanpa masuk cashflow. |
| 2026-05-23 | Autocomplete provider menampilkan logo bank/e-wallet pada opsi dan field terpilih; delete wallet kosong diarahkan kembali ke index dompet agar tidak 404. |
| 2026-05-23 | Checklist dirapikan agar prioritas berikutnya fokus pada provider custom, kategori inactive/default, source transaksi, dan pembayaran tagihan web. |
| 2026-05-23 | Flow provider custom bank/e-wallet selesai: user dapat menambah provider dari form tambah/edit dompet dengan logo opsional, lalu provider otomatis tersedia di pilihan. |
| 2026-05-23 | Autocomplete diperbaiki agar input search bisa diketik tanpa reset saat dropdown aktif. |
| 2026-05-23 | Kategori transaksi dirapikan dengan icon, color, is_default, is_active, dan delete kategori berelasi berubah menjadi nonaktif. |
| 2026-05-23 | Form kategori memakai icon picker visual berbasis Lucide React dengan daftar icon yang diperbanyak, sementara input warna disembunyikan dari UI. |
