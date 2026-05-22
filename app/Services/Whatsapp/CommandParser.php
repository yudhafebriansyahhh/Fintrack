<?php

namespace App\Services\Whatsapp;

use App\Models\BillItem;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CommandParser
{
    public function handle(User $user, string $message): string
    {
        $body = trim($message);
        if ($body === '') {
            return $this->help();
        }

        $segments = preg_split('/\s+/u', $body);
        $keyword = Str::of($segments[0] ?? '')->lower()->trim()->ltrim('/')->__toString();
        $args = array_slice($segments, 1);

        return match ($keyword) {
            'start', 'menu', 'bantuan', 'help' => $this->help(),
            'saldo' => $this->balance($user),
            'bill', 'bills', 'tagihan' => $this->bills($user),
            'income', 'pemasukan', 'masuk' => $this->record($user, 'income', $args),
            'expense', 'pengeluaran', 'keluar' => $this->record($user, 'expense', $args),
            'transfer' => $this->transfer($user, $args),
            default => "Perintah tidak dikenal. Ketik help untuk melihat daftar perintah.",
        };
    }

    public function help(): string
    {
        return implode("\n", [
            'Perintah FinTrack:',
            '- masuk <nominal> <kategori> [catatan] via <dompet>',
            '- keluar <nominal> <kategori> [catatan] via <dompet>',
            '- transfer <nominal> <dari> ke <ke>',
            '- saldo',
            '- tagihan',
            '- help',
            '',
            'Contoh:',
            '- keluar 25rb makan siang via Cash',
            '- masuk 1,5jt gaji bulanan via BCA',
            '- transfer 250000 BCA ke DANA',
        ]);
    }

    private function balance(User $user): string
    {
        $wallets = $user->wallets()->where('is_active', true)->orderBy('name')->get();

        if ($wallets->isEmpty()) {
            return 'Belum ada dompet aktif. Tambahkan dompet di aplikasi terlebih dahulu.';
        }

        $lines = ['Saldo dompet aktif:'];
        $total = 0.0;
        foreach ($wallets as $wallet) {
            $total += (float) $wallet->current_balance;
            $lines[] = sprintf('- %s: %s', $wallet->name, $this->rupiah($wallet->current_balance));
        }
        $lines[] = sprintf('Total: %s', $this->rupiah($total));

        return implode("\n", $lines);
    }

    private function bills(User $user): string
    {
        $today = Carbon::now()->toDateString();

        $items = BillItem::query()
            ->whereHas('billGroup', fn ($q) => $q->where('user_id', $user->id))
            ->with('billGroup:id,name,user_id')
            ->where('status', 'unpaid')
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        if ($items->isEmpty()) {
            return 'Tidak ada tagihan aktif.';
        }

        $lines = ['Tagihan terdekat:'];
        foreach ($items as $item) {
            $isLate = $item->due_date && $item->due_date->lt($today);
            $lines[] = sprintf(
                '- %s (%s) %s | jatuh tempo %s%s',
                $item->title,
                $item->billGroup?->name ?? '-',
                $this->rupiah($item->amount),
                optional($item->due_date)->translatedFormat('d M Y'),
                $isLate ? ' [terlambat]' : '',
            );
        }
        return implode("\n", $lines);
    }

    private function record(User $user, string $type, array $args): string
    {
        if (count($args) < 2) {
            return "Format salah. Contoh: " . ($type === 'income' ? 'masuk 1500000 gaji' : 'keluar 25000 makan');
        }

        $amount = $this->parseAmount($args[0]);
        if ($amount === null) {
            return 'Nominal tidak valid. Gunakan angka, contoh 25000.';
        }

        [$categoryName, $note, $walletName] = $this->parseRecordDetails(array_slice($args, 1));

        $wallet = $walletName
            ? $this->findWallet($user, $walletName)
            : $this->defaultWalletForRecord($user);
        if (! $wallet) {
            return $walletName
                ? "Dompet {$walletName} tidak ditemukan atau tidak aktif."
                : $this->walletRequiredMessageForType($user, $type);
        }

        $category = Category::firstOrCreate(
            [
                'user_id' => $user->id,
                'type' => $type,
                'name' => Str::headline($categoryName),
            ],
        );

        DB::transaction(function () use ($user, $wallet, $category, $type, $amount, $note) {
            Transaction::create([
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'type' => $type,
                'amount' => $amount,
                'transaction_date' => Carbon::now()->toDateString(),
                'description' => $note ?: null,
            ]);

            $delta = $type === 'income' ? $amount : -$amount;
            $wallet->forceFill([
                'current_balance' => (float) $wallet->current_balance + $delta,
            ])->save();
        });

        $verb = $type === 'income' ? 'pemasukan' : 'pengeluaran';

        return sprintf(
            "Tercatat %s %s pada kategori %s (dompet %s).%s",
            $verb,
            $this->rupiah($amount),
            $category->name,
            $wallet->name,
            $note ? " Catatan: {$note}." : '',
        );
    }

    private function transfer(User $user, array $args): string
    {
        if (count($args) < 3) {
            return 'Format: transfer <nominal> <dompet asal> <dompet tujuan>.';
        }

        $amount = $this->parseAmount($args[0]);
        if ($amount === null) {
            return 'Nominal transfer tidak valid.';
        }

        $fromName = $args[1];
        [$fromName, $toName] = $this->parseTransferWallets(array_slice($args, 1));

        $from = $this->findWallet($user, $fromName);
        $to = $this->findWallet($user, $toName);

        if (! $from || ! $to) {
            return 'Dompet asal atau tujuan tidak ditemukan.';
        }

        if ($from->id === $to->id) {
            return 'Dompet asal dan tujuan tidak boleh sama.';
        }

        if ((float) $from->current_balance < $amount) {
            return 'Saldo dompet asal tidak cukup.';
        }

        DB::transaction(function () use ($user, $from, $to, $amount) {
            $from->forceFill([
                'current_balance' => (float) $from->current_balance - $amount,
            ])->save();
            $to->forceFill([
                'current_balance' => (float) $to->current_balance + $amount,
            ])->save();

            $user->walletTransfers()->create([
                'from_wallet_id' => $from->id,
                'to_wallet_id' => $to->id,
                'amount' => $amount,
                'transfer_date' => Carbon::now()->toDateString(),
                'description' => 'Transfer via bot chat',
            ]);
        });

        return sprintf(
            'Transfer %s dari %s ke %s berhasil.',
            $this->rupiah($amount),
            $from->name,
            $to->name,
        );
    }

    private function parseAmount(string $value): ?float
    {
        $normalized = Str::of($value)->lower()->replaceMatches('/\s+/u', '')->__toString();
        $multiplier = 1;

        if (preg_match('/(rb|ribu|k)$/u', $normalized)) {
            $multiplier = 1000;
            $normalized = preg_replace('/(rb|ribu|k)$/u', '', $normalized) ?? $normalized;
        } elseif (preg_match('/(jt|juta|m)$/u', $normalized)) {
            $multiplier = 1000000;
            $normalized = preg_replace('/(jt|juta|m)$/u', '', $normalized) ?? $normalized;
        }

        $clean = preg_replace('/[^0-9.,-]/u', '', $normalized);
        if ($clean === '' || $clean === null) {
            return null;
        }

        if (str_contains($clean, ',') && str_contains($clean, '.')) {
            $clean = str_replace('.', '', $clean);
            $clean = str_replace(',', '.', $clean);
        } elseif (str_contains($clean, ',')) {
            $clean = str_replace(',', '.', $clean);
        } elseif (substr_count($clean, '.') > 1) {
            $clean = str_replace('.', '', $clean);
        }

        if (! is_numeric($clean) || (float) $clean <= 0) {
            return null;
        }

        return (float) $clean * $multiplier;
    }

    /** @return array{0:string,1:string,2:string|null} */
    private function parseRecordDetails(array $args): array
    {
        $walletName = null;
        $walletIndex = $this->connectorIndex($args, ['dari', 'via', 'dompet']);

        if ($walletIndex !== null) {
            $walletName = trim(implode(' ', array_slice($args, $walletIndex + 1))) ?: null;
            $args = array_slice($args, 0, $walletIndex);
        }

        $categoryName = $args[0] ?? '';
        $note = trim(implode(' ', array_slice($args, 1)));

        return [$categoryName, $note, $walletName];
    }

    /** @return array{0:string,1:string} */
    private function parseTransferWallets(array $args): array
    {
        $fromIndex = $this->connectorIndex($args, ['dari']);
        if ($fromIndex === 0) {
            $args = array_slice($args, 1);
        }

        $toIndex = $this->connectorIndex($args, ['ke', 'to']);
        if ($toIndex !== null) {
            return [
                trim(implode(' ', array_slice($args, 0, $toIndex))),
                trim(implode(' ', array_slice($args, $toIndex + 1))),
            ];
        }

        return [
            $args[0] ?? '',
            trim(implode(' ', array_slice($args, 1))),
        ];
    }

    private function connectorIndex(array $args, array $connectors): ?int
    {
        foreach ($args as $index => $arg) {
            if (in_array(Str::lower($arg), $connectors, true)) {
                return $index;
            }
        }

        return null;
    }

    private function findWallet(User $user, string $name): ?Wallet
    {
        $needle = Str::of($name)->lower()->squish()->__toString();
        if ($needle === '') {
            return null;
        }

        return $user->wallets()
            ->where('is_active', true)
            ->get()
            ->first(fn (Wallet $wallet) => Str::of($wallet->name)->lower()->squish()->__toString() === $needle);
    }

    private function defaultWalletForRecord(User $user): ?Wallet
    {
        $wallets = $user->wallets()->where('is_active', true)->orderBy('name')->get();

        if ($wallets->count() !== 1) {
            return null;
        }

        return $wallets->first();
    }

    private function walletRequiredMessageForType(User $user, string $type): string
    {
        $wallets = $user->wallets()->where('is_active', true)->orderBy('name')->pluck('name');

        if ($wallets->isEmpty()) {
            return 'Belum ada dompet aktif untuk mencatat transaksi.';
        }

        $keyword = $type === 'income' ? 'masuk' : 'keluar';
        $exampleCategory = $type === 'income' ? 'gaji bulanan' : 'makan siang';

        return implode("\n", [
            'Pilih dompet dulu agar transaksi tidak masuk ke dompet yang salah.',
            "Format: {$keyword} <nominal> <kategori> [catatan] via <dompet>",
            "Contoh: {$keyword} 25rb {$exampleCategory} via " . $wallets->first(),
            '',
            'Dompet aktif: ' . $wallets->implode(', '),
        ]);
    }

    private function rupiah(float|string $value): string
    {
        return 'Rp' . number_format((float) $value, 0, ',', '.');
    }
}
