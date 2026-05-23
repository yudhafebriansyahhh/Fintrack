# Rangkuman Konteks Dompet FinTrack

Dokumen ini merangkum konteks pekerjaan fitur dompet yang sudah dilakukan agar pengembangan berikutnya bisa dilanjutkan tanpa membaca seluruh percakapan sebelumnya.

## Scope dan Keputusan Produk

1. Scope tipe dompet saat ini adalah:
   - `cash` untuk tunai.
   - `bank` untuk rekening bank.
   - `e-wallet` untuk dompet digital.
   - `other` untuk dompet lain yang tidak masuk tiga tipe utama.

2. Tabungan dan bisnis tidak dimasukkan sebagai tipe dompet.
   - Keduanya diputuskan menjadi modul terpisah pada tahap berikutnya.
   - Modul tabungan/bisnis nantinya tetap dapat terhubung ke dompet sebagai sumber atau tujuan dana.

3. Transfer antar dompet tetap memakai tabel `wallet_transfers`.
   - Transfer tidak dihitung sebagai pemasukan atau pengeluaran.
   - Transfer tetap ditampilkan ke user sebagai activity/riwayat agar perpindahan saldo terlihat.
   - Summary, chart, cashflow, dan laporan income/expense tetap hanya menghitung transaksi `income` dan `expense`.

## Implementasi Dompet Saat Ini

### Backend

- `app/Http/Controllers/WalletController.php`
  - `index()` mengirim daftar wallet, provider aktif, total saldo aktif, dan transfer terbaru.
  - `show()` mengirim detail wallet, transaksi paginated, dan prop `activities` hasil gabungan transaksi + transfer terkait wallet.
  - `store()` membuat wallet dan mengisi `current_balance` dari `initial_balance`.
  - `update()` memperbarui data wallet, provider, logo custom, status utama, dan status aktif.
  - `destroy()`:
    - Jika wallet punya transaksi atau transfer, wallet dinonaktifkan.
    - Jika wallet kosong, wallet dihapus permanen dan redirect ke `wallets.index` agar tidak kembali ke detail wallet yang sudah hilang.

- `app/Http/Controllers/TransactionController.php`
  - Transaksi manual tetap hanya `income` dan `expense`.
  - `ownWallet()` sekarang mengubah kasus wallet nonaktif menjadi validation error pada field `wallet_id`, bukan `HttpException` mentah.
  - Efek saldo tetap dijalankan dengan membalik transaksi lama saat update dan menerapkan nominal baru.

- `app/Http/Controllers/WalletTransferController.php`
  - Transfer memindahkan saldo antar wallet dan menyimpan record ke `wallet_transfers`.
  - Transfer menjadi sumber data activity pada halaman detail wallet.

### Frontend

- `resources/js/Pages/Wallets/Index.jsx`
  - Halaman index dompet menampilkan dompet dikelompokkan berdasarkan tipe.
  - Modal tambah dompet sudah dinamis berdasarkan tipe.
  - Tipe dompet memakai `FormDropdown`.
  - Provider bank/e-wallet memakai `Autocomplete` dengan logo provider.
  - Tipe `other` mendukung upload logo custom.

- `resources/js/Pages/Wallets/Show.jsx`
  - Halaman detail dompet menampilkan ringkasan, chart, riwayat activity, dan aksi utama.
  - Aksi utama: tambah transaksi, transfer, edit dompet, dan hapus/nonaktifkan dompet.
  - Modal edit dompet memakai `FormDropdown` dan `Autocomplete` provider berlogo.
  - Modal transaksi memakai `FormDropdown`, `Autocomplete`, dan `DatePicker`.
  - Modal transfer memakai `Autocomplete` untuk tujuan dan `DatePicker` untuk tanggal.
  - Transfer tampil di “Transaksi Terakhir” sebagai item netral berwarna biru, bukan income/expense.

## Komponen Reusable yang Dibuat/Dipakai

- `resources/js/Components/FormDropdown.jsx`
  - Dropdown custom untuk form.
  - Dipakai untuk tipe dompet dan tipe transaksi.
  - Menghindari tampilan native `<select>` browser.

- `resources/js/Components/Autocomplete.jsx`
  - Input searchable untuk memilih opsi.
  - Dipakai untuk provider, wallet, kategori, dan tujuan transfer.
  - Menutup saat fokus keluar.
  - Menyinkronkan label ketika `value` berubah.
  - Mendukung `getOptionImage` untuk menampilkan logo provider di opsi dan field terpilih.

- `resources/js/Components/DatePicker.jsx`
  - Datepicker custom berbasis popup kalender.
  - Dipakai untuk tanggal transaksi dan transfer.
  - Menghindari native `type="date"` browser.

## Perbaikan UI/UX yang Sudah Dilakukan

1. SweetAlert delete confirmation diperbaiki.
   - Button konfirmasi dan batal sekarang memakai styling bawaan SweetAlert dengan warna eksplisit.
   - Button batal dibuat terlihat dengan warna slate.

2. Tombol aksi detail dompet dirapikan.
   - Mobile memakai layout grid yang lebih rapi.
   - Warna aksi dibedakan untuk transaksi, transfer, edit, dan hapus.

3. Modal transaksi dirapikan.
   - Tipe transaksi menjadi dropdown custom.
   - Kategori dan dompet menjadi autocomplete.
   - Tanggal memakai datepicker custom.

4. Modal transfer dirapikan.
   - Tujuan transfer menjadi autocomplete.
   - Tanggal transfer memakai datepicker custom.

5. Provider bank/e-wallet memakai logo.
   - Logo tampil pada autocomplete saat memilih provider.
   - Logo juga tetap tampil di kartu/index dan detail wallet.

## Bug yang Sudah Diperbaiki

1. SweetAlert delete button tidak terlihat.
   - Penyebab: custom class/Tailwind tidak diterapkan seperti yang diharapkan.
   - Solusi: gunakan `buttonsStyling: true`, `confirmButtonColor`, dan `cancelButtonColor`.

2. Datepicker tidak muncul.
   - Penyebab: implementasi sebelumnya masih bergantung pada native date input atau text input tanpa popup.
   - Solusi: buat `DatePicker` custom.

3. Transfer tidak muncul di riwayat detail dompet.
   - Penyebab: detail wallet hanya menampilkan data dari `transactions`.
   - Solusi: `WalletController@show` membuat prop `activities` gabungan transaksi dan transfer.

4. Transaksi pada wallet nonaktif menampilkan halaman exception.
   - Penyebab: `abort_unless($wallet->is_active, 422, 'Dompet tidak aktif.')`.
   - Solusi: ubah menjadi `ValidationException::withMessages()` dan tampilkan toast error di frontend.

5. Reactivasi wallet dari modal edit tidak stabil.
   - Penyebab: payload boolean pada multipart/FormData perlu dibuat eksplisit.
   - Solusi: kirim `is_primary` dan `is_active` sebagai `1/0` saat submit edit wallet.

6. Error `Cannot read properties of undefined (reading 'post')` saat submit edit wallet.
   - Penyebab: `walletForm.transform().post(...)` tidak aman karena `transform()` tidak mengembalikan form object pada versi Inertia yang dipakai.
   - Solusi: panggil `walletForm.transform(...)` dan `walletForm.post(...)` secara terpisah.

7. Logo provider hilang setelah memakai autocomplete reusable.
   - Penyebab: `Autocomplete` awalnya hanya mendukung icon generik.
   - Solusi: tambahkan prop `getOptionImage` dan gunakan untuk provider bank/e-wallet.

8. Delete wallet kosong dari halaman detail menghasilkan 404.
   - Penyebab: backend menghapus wallet lalu `return back()`, sehingga browser kembali ke halaman detail wallet yang sudah tidak ada.
   - Solusi: redirect ke `wallets.index` setelah wallet kosong berhasil dihapus.

## Dokumentasi Terkait

- `dokumen/Checklist_Status_Fitur_FinTrack.md`
  - Checklist status implementasi terhadap PRD, alur kerja, dan ERD.
  - Sudah diperbarui untuk status form dompet reusable, transfer sebagai activity, dan bugfix terbaru.

- `dokumen/PRD_Revisi_FinTrack.md`
  - Sumber scope produk dan roadmap umum.

- `dokumen/Rancangan_Alur_Kerja_FinTrack.md`
  - Sumber alur penggunaan fitur.

- `dokumen/Rancangan_ERD_FinTrack.md`
  - Sumber rancangan database ideal.
  - Masih ada perbedaan penting dengan implementasi: transfer, bill, dan bot integration.

## Verifikasi yang Pernah Dilakukan

- `npm run build` berhasil beberapa kali setelah perubahan frontend.
- `php -l app/Http/Controllers/WalletController.php` berhasil.
- `php -l app/Http/Controllers/TransactionController.php` berhasil.
- Test PHP formal belum tersedia pada environment ini saat dicek:
  - `php artisan test ...` pernah gagal karena command `test` tidak tersedia.
  - `./vendor/bin/phpunit ...` pernah gagal karena binary tidak ditemukan.

## Catatan Arsitektur Penting

1. Transfer sekarang adalah activity, bukan transaksi income/expense.
   - Jika nanti export Excel/PDF dibuat, gunakan pola `activities` agar transfer ikut tampil tanpa mengubah total income/expense.

2. `wallet_transfers` adalah keputusan implementasi saat ini.
   - ERD merancang transfer sebagai `transactions.type = transfer` dengan `destination_wallet_id`.
   - Sebelum membangun export final atau laporan lanjutan, perlu diputuskan apakah tetap memakai `wallet_transfers` atau migrasi ke struktur transaksi.

3. `is_active` masih dipakai untuk status wallet.
   - ERD mengarah ke status enum.
   - Untuk saat ini `is_active` dipertahankan karena sudah terpakai di UI, total saldo, dan filter transaksi.

4. Provider custom user belum selesai.
   - Struktur `wallet_providers.user_id` sudah mendukung custom provider.
   - UI/API untuk tambah provider custom bank/e-wallet belum dibuat.

## Rekomendasi Langkah Berikutnya

1. Buat flow provider custom user untuk bank/e-wallet.
   - Dari modal tambah/edit dompet, user bisa menambah provider baru jika tidak menemukan bank/e-wallet.
   - Sertakan upload logo provider custom jika dibutuhkan.

2. Rapikan kategori transaksi.
   - Tambahkan `is_active/status`, `is_default`, icon, dan color.
   - Ubah delete kategori yang sudah dipakai menjadi nonaktif, bukan ditolak atau hard delete.

3. Samakan pembayaran tagihan web dengan Telegram.
   - Web harus memilih wallet saat bayar tagihan.
   - Pembayaran tagihan web harus membuat transaksi expense otomatis dan mengurangi saldo.
   - Tambahkan riwayat pembayaran atau mapping setara dengan struktur bill yang ada.

4. Putuskan arsitektur final transfer untuk export.
   - Opsi saat ini: tetap `wallet_transfers` + merge `activities`.
   - Alternatif: migrasi ke `transactions.type = transfer` dan pastikan laporan tetap exclude transfer.

5. Tambahkan source dan status transaksi.
   - Source minimal: manual, telegram, whatsapp, dan nanti ocr.
   - Status minimal: success, pending, cancelled jika fitur cancel/pending mulai dibutuhkan.

6. Setelah core stabil, lanjut ke budget, saving goals, export PDF/Excel, dan smart finance.
