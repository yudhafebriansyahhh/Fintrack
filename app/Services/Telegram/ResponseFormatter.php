<?php

namespace App\Services\Telegram;

use App\Models\Wallet;
use Illuminate\Support\Collection;

class ResponseFormatter
{
    public static function rupiah(float|int|string $value): string
    {
        return 'Rp' . number_format((float) $value, 0, ',', '.');
    }

    public function start(): string
    {
        return implode("\n", [
            '👋 Haii, selamat datang di FinTrack Bot!',
            '',
            'Bot ini bantu kamu nyatet duit masuk, duit keluar, sampai cek saldo langsung dari Telegram. Anti ribet, anti drama 💸',
            '',
            'Coba mulai dengan:',
            '• /saldo  — cek isi dompet',
            '• /dompet — list dompet aktif',
            '• /bantuan — panduan singkat',
            '',
            'Contoh nyatet pengeluaran:',
            'keluar 20000 makan siang via BCA',
            '',
            'Contoh nyatet pemasukan:',
            'masuk 50000 freelance via DANA',
            '',
            'Tips: tulis nama kategori (Makan & Minum, Transportasi, Gaji, dst.) di catatan, bot otomatis pilih kategori yang sesuai di akunmu.',
        ]);
    }

    public function help(): string
    {
        return implode("\n", [
            '👋 Bantuan FinTrack Bot',
            '',
            '📥 Catat pengeluaran:',
            'keluar [nominal] [kategori/catatan] via [dompet]',
            'Contoh:',
            '• keluar 25000 makan siang via BCA',
            '• keluar 150rb Transportasi via Cash',
            '',
            '📤 Catat pemasukan:',
            'masuk [nominal] [kategori/catatan] via [dompet]',
            'Contoh:',
            '• masuk 5jt gaji via BCA',
            '• masuk 200000 Freelance via Jenius',
            '',
            'ℹ️ Tips kategori:',
            'Tulis nama kategori (mis. "Makan & Minum", "Transportasi") di catatan agar bot otomatis memilih kategori yang sudah ada di akunmu. Kalau tidak ketemu, transaksi masuk ke "Pengeluaran Lainnya" / "Pemasukan Lainnya" dan bisa kamu rapikan dari aplikasi web.',
            '',
            'Perintah lainnya:',
            '• /saldo                — cek saldo dompet aktif',
            '• /dompet               — lihat daftar dompet aktif',
            '• /tagihan              — lihat tagihan terdekat',
            '• /lunas <id> via [dompet] — tandai tagihan lunas',
            '• /transfer 50rb dari BCA ke DANA',
            '• /ringkasan minggu     — rekap mingguan / bulan / hari',
            '• /top                  — top 5 kategori pengeluaran bulan ini',
            '• /bantuan              — buka panduan kayak gini',
        ]);
    }

    /**
     * @param  Collection<int, Wallet>|iterable<int, Wallet>  $wallets
     */
    public function balance(iterable $wallets): string
    {
        $list = $this->collect($wallets);
        if ($list->isEmpty()) {
            return implode("\n", [
                '🪙 Belum ada dompet aktif nih.',
                '',
                'Tambahin dompet dulu di aplikasi web FinTrack biar bisa langsung pantau saldo dari sini.',
            ]);
        }

        $longest = (int) $list->max(fn (Wallet $wallet) => mb_strlen($wallet->name));
        $lines = ['💰 Saldo Dompet Aktif', ''];
        $total = 0.0;
        foreach ($list as $wallet) {
            $total += (float) $wallet->current_balance;
            $name = str_pad($wallet->name, $longest);
            $lines[] = sprintf('• %s : %s', $name, self::rupiah($wallet->current_balance));
        }
        $lines[] = '';
        $lines[] = 'Total: ' . self::rupiah($total);

        return implode("\n", $lines);
    }

    /**
     * @param  Collection<int, Wallet>|iterable<int, Wallet>  $wallets
     */
    public function walletList(iterable $wallets): string
    {
        $list = $this->collect($wallets);
        if ($list->isEmpty()) {
            return implode("\n", [
                '💼 Belum ada dompet aktif.',
                '',
                'Buat dompet dulu di aplikasi web FinTrack ya, baru deh bisa nyatet transaksi dari Telegram.',
            ]);
        }

        $lines = ['💼 Dompet Aktif Kamu', ''];
        foreach ($list as $wallet) {
            $lines[] = '• ' . $wallet->name;
        }
        $lines[] = '';
        $lines[] = 'Pakai nama dompet di atas pas nyatet transaksi.';
        $lines[] = '';
        $lines[] = 'Contoh:';
        $lines[] = 'keluar 20000 makan siang via ' . $list->first()->name;

        return implode("\n", $lines);
    }

    /**
     * @param  Collection<int, Wallet>|iterable<int, Wallet>  $wallets
     */
    public function walletNotFound(?string $walletKeyword, iterable $wallets): string
    {
        $list = $this->collect($wallets);
        $keyword = trim((string) $walletKeyword) !== '' ? trim((string) $walletKeyword) : 'yang kamu sebut';

        $lines = [
            '⚠️ Dompetnya nggak ketemu',
            '',
            sprintf('Dompet "%s" belum ada atau lagi nonaktif.', $keyword),
        ];

        if ($list->isNotEmpty()) {
            $lines[] = '';
            $lines[] = 'Dompet aktif kamu:';
            foreach ($list as $wallet) {
                $lines[] = '• ' . $wallet->name;
            }
            $lines[] = '';
            $lines[] = 'Pakai nama persis kayak di atas ya.';
            $lines[] = '';
            $lines[] = 'Contoh:';
            $lines[] = 'keluar 20000 makan siang via ' . $list->first()->name;
        } else {
            $lines[] = '';
            $lines[] = 'Buat dompet dulu di aplikasi web FinTrack biar bot bisa nyimpen transaksinya.';
        }

        return implode("\n", $lines);
    }

    public function transactionSuccess(array $transactionData): string
    {
        $type = $transactionData['type'] ?? 'expense';
        $title = $type === 'income' ? '✅ Pemasukan Berhasil Dicatat' : '✅ Pengeluaran Berhasil Dicatat';
        $verb = $type === 'income' ? 'Cuan masuk!' : 'Catatan pengeluaran tersimpan!';

        $note = trim((string) ($transactionData['note'] ?? '-'));
        if ($note === '') {
            $note = '-';
        }

        $lines = [
            $title,
            '',
            'Nominal  : ' . self::rupiah((float) ($transactionData['amount'] ?? 0)),
            'Kategori : ' . ($transactionData['category'] ?? '-'),
            'Dompet   : ' . ($transactionData['walletName'] ?? '-'),
            'Catatan  : ' . $note,
            '',
            sprintf('Saldo %s sekarang:', $transactionData['walletName'] ?? '-'),
            self::rupiah((float) ($transactionData['walletBalance'] ?? 0)),
            '',
            $verb,
        ];

        return implode("\n", $lines);
    }

    public function invalidCommand(): string
    {
        return implode("\n", [
            'Hmm, format pesannya belum sesuai 😅',
            '',
            'Coba pakai format ini ya:',
            'keluar [nominal] [catatan] via [dompet]',
            '',
            'Contoh:',
            '• keluar 20000 makan siang via Bank BCA',
            '• masuk 50000 transferan teman via DANA',
            '',
            'Ketik /bantuan kalau mau lihat panduan lengkap.',
        ]);
    }

    public function invalidAmount(): string
    {
        return implode("\n", [
            '🤔 Nominalnya kebaca aneh nih.',
            '',
            'Pakai angka aja ya, contoh: 20000, 20.000, 25rb, 1jt, atau Rp20.000.',
            '',
            'Contoh lengkap:',
            'keluar 25000 kopi sore via Cash',
        ]);
    }

    public function missingWallet(): string
    {
        return implode("\n", [
            '🪙 Dompetnya belum disebut nih.',
            '',
            'Tambahin "via [nama dompet]" di akhir biar bot tahu mau dipotong dari mana.',
            '',
            'Contoh:',
            '• keluar 20000 makan siang via Bank BCA',
            '• masuk 50000 bonus via DANA',
        ]);
    }

    public function unauthorized(): string
    {
        return implode("\n", [
            '🔐 Akun Belum Terhubung',
            '',
            'Telegram kamu belum nyambung sama akun FinTrack.',
            '',
            'Login dulu ke aplikasi web FinTrack, buka menu Integrasi Telegram, lalu kirim kode OTP 6 digit ke bot ini.',
            '',
            'Setelah terhubung, kamu bisa langsung nyatet transaksi dari sini 😉',
        ]);
    }

    public function linked(): string
    {
        return implode("\n", [
            '🎉 Asik, akun kamu udah terhubung!',
            '',
            'Sekarang kamu bisa nyatet transaksi dan cek saldo langsung dari Telegram. Ketik /bantuan kalau lupa formatnya.',
        ]);
    }

    public function genericError(string $message): string
    {
        return implode("\n", [
            '⚠️ Ada yang nggak beres.',
            '',
            $message,
            '',
            'Kalau bingung, ketik /bantuan untuk lihat format yang benar.',
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     */
    public function bills(array $items): string
    {
        $lines = ['📋 Tagihan Terdekat', ''];
        foreach ($items as $item) {
            $tag = $item['is_late'] ? ' ⚠️ telat' : '';
            $group = $item['group'] ? ' (' . $item['group'] . ')' : '';
            $lines[] = sprintf(
                '#%d %s%s — %s · jt %s%s',
                $item['id'],
                $item['title'],
                $group,
                self::rupiah($item['amount']),
                $item['due_date'],
                $tag,
            );
        }
        $lines[] = '';
        $lines[] = 'Cara tandai lunas dari sini:';
        $lines[] = sprintf('lunas %d via Bank BCA', $items[0]['id'] ?? 1);

        return implode("\n", $lines);
    }

    public function noBills(): string
    {
        return implode("\n", [
            '🎉 Mantap, nggak ada tagihan aktif!',
            '',
            'Bot bakal kabarin lagi kalau ada tagihan baru jatuh tempo.',
        ]);
    }

    public function billInvalidId(): string
    {
        return implode("\n", [
            '🤔 ID tagihannya kebaca aneh.',
            '',
            'Cek dulu /tagihan untuk lihat nomor ID, terus tandai lunas pakai:',
            'lunas 12 via Bank BCA',
        ]);
    }

    public function billNotFound(int $id): string
    {
        return implode("\n", [
            sprintf('❓ Tagihan #%d nggak ketemu.', $id),
            '',
            'Cek dulu /tagihan untuk lihat tagihan aktif.',
        ]);
    }

    public function billAlreadyPaid($billItem): string
    {
        return implode("\n", [
            sprintf('✅ Tagihan "%s" sudah lunas dari sebelumnya.', $billItem->title ?? '-'),
            '',
            'Kamu bisa cek tagihan lain pakai /tagihan.',
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function billPaid(array $payload): string
    {
        return implode("\n", [
            '✅ Tagihan Berhasil Dilunasi',
            '',
            'Tagihan : ' . ($payload['title'] ?? '-'),
            'Grup    : ' . ($payload['group'] ?? '-'),
            'Nominal : ' . self::rupiah((float) ($payload['amount'] ?? 0)),
            'Dompet  : ' . ($payload['walletName'] ?? '-'),
            '',
            sprintf('Saldo %s sekarang:', $payload['walletName'] ?? '-'),
            self::rupiah((float) ($payload['walletBalance'] ?? 0)),
            '',
            'Tagihan diem-diem makin sat-set 💸',
        ]);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function transferSuccess(array $payload): string
    {
        return implode("\n", [
            '✅ Transfer Berhasil',
            '',
            'Nominal : ' . self::rupiah((float) ($payload['amount'] ?? 0)),
            'Dari    : ' . ($payload['fromName'] ?? '-'),
            'Ke      : ' . ($payload['toName'] ?? '-'),
            '',
            'Saldo terkini:',
            sprintf('• %s : %s', $payload['fromName'] ?? '-', self::rupiah((float) ($payload['fromBalance'] ?? 0))),
            sprintf('• %s : %s', $payload['toName'] ?? '-', self::rupiah((float) ($payload['toBalance'] ?? 0))),
        ]);
    }

    public function transferInvalid(): string
    {
        return implode("\n", [
            'Hmm, format transfernya belum sesuai 😅',
            '',
            'Coba pakai format ini ya:',
            'transfer [nominal] dari [dompet asal] ke [dompet tujuan]',
            '',
            'Contoh:',
            '• transfer 50rb dari Bank BCA ke DANA',
            '• transfer 100000 BCA ke Cash',
        ]);
    }

    public function transferSameWallet(): string
    {
        return implode("\n", [
            '⚠️ Dompet asal dan tujuan sama nih.',
            '',
            'Coba pilih dompet tujuan yang beda ya.',
        ]);
    }

    public function transferInsufficient(Wallet $from): string
    {
        return implode("\n", [
            sprintf('💸 Saldo %s belum cukup buat transfer.', $from->name),
            '',
            sprintf('Saldo sekarang: %s', self::rupiah((float) $from->current_balance)),
        ]);
    }

    /**
     * @param  array<string, mixed>  $stats
     */
    public function summary(string $rangeLabel, array $stats): string
    {
        $net = (float) ($stats['net'] ?? 0);
        $netLine = $net >= 0
            ? '🤑 Net: +' . self::rupiah(abs($net))
            : '⚠️ Net: -' . self::rupiah(abs($net));

        $vibe = $net >= 0
            ? 'Kabar baik, cashflow masih sehat!'
            : 'Hati-hati, pengeluaran lebih gede dari pemasukan.';

        return implode("\n", [
            '📊 Ringkasan ' . $rangeLabel,
            '',
            '⬇️ Pemasukan : ' . self::rupiah((float) ($stats['income'] ?? 0)),
            '⬆️ Pengeluaran: ' . self::rupiah((float) ($stats['expense'] ?? 0)),
            $netLine,
            '🧾 Transaksi : ' . (int) ($stats['count'] ?? 0),
            '',
            $vibe,
        ]);
    }

    public function summaryInvalidRange(): string
    {
        return implode("\n", [
            '🤔 Periode ringkasan belum dikenali.',
            '',
            'Coba pakai salah satu:',
            '• /ringkasan hari',
            '• /ringkasan minggu',
            '• /ringkasan bulan',
        ]);
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     */
    public function topCategories(array $rows, string $monthLabel, float $total = 0.0): string
    {
        if (count($rows) === 0) {
            return implode("\n", [
                sprintf('📊 Top Kategori — %s', $monthLabel),
                '',
                'Belum ada pengeluaran tercatat bulan ini.',
                '',
                'Yuk mulai catat pakai: keluar 25000 kopi via Cash',
            ]);
        }

        $lines = [sprintf('📊 Top Kategori Pengeluaran — %s', $monthLabel), ''];
        foreach ($rows as $index => $row) {
            $rank = $index + 1;
            $lines[] = sprintf(
                '%d. %s — %s (%.1f%%)',
                $rank,
                $row['category'],
                self::rupiah((float) $row['total']),
                (float) ($row['percent'] ?? 0),
            );
        }
        $lines[] = '';
        $lines[] = 'Total pengeluaran bulan ini: ' . self::rupiah($total);

        return implode("\n", $lines);
    }

    /**
     * @param  Collection<int, Wallet>|iterable<int, Wallet>  $wallets
     * @return Collection<int, Wallet>
     */
    private function collect(iterable $wallets): Collection
    {
        $collection = $wallets instanceof Collection ? $wallets : collect($wallets);

        return $collection->filter(fn (Wallet $wallet) => $wallet->is_active)
            ->sortBy('name')
            ->values();
    }
}
