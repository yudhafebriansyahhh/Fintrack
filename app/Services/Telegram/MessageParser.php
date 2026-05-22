<?php

namespace App\Services\Telegram;

use Illuminate\Support\Str;

class MessageParser
{
    private const EXPENSE_KEYWORDS = ['keluar', 'pengeluaran', 'expense', 'belanja', 'bayar'];

    private const INCOME_KEYWORDS = ['masuk', 'pemasukan', 'income', 'terima', 'dapat'];

    private const WALLET_SEPARATORS = ['via', 'dari', 'pakai', 'pake', 'menggunakan'];

    private const COMMAND_BALANCE = ['saldo', 'balance'];

    private const COMMAND_HELP = ['bantuan', 'help', 'menu'];

    private const COMMAND_WALLETS = ['dompet', 'wallets', 'wallet'];

    private const COMMAND_BILLS = ['tagihan', 'bills', 'bill'];

    private const COMMAND_BILL_PAID = ['lunas', 'bayar_tagihan', 'bayartagihan'];

    private const COMMAND_TRANSFER = ['transfer', 'pindah', 'tf'];

    private const COMMAND_SUMMARY = ['ringkasan', 'summary', 'rekap'];

    private const COMMAND_TOP = ['top', 'kategori', 'topkategori'];

    private const COMMAND_START = ['start'];

    public static function normalizeText(string $value): string
    {
        return Str::of($value)
            ->replace("\xc2\xa0", ' ')
            ->replaceMatches('/\s+/u', ' ')
            ->trim()
            ->__toString();
    }

    public static function normalizeAmount(string $value): ?int
    {
        $normalized = Str::of($value)->lower()->replaceMatches('/\s+/u', '')->__toString();
        $multiplier = 1;

        if (preg_match('/(rb|ribu|k)$/u', $normalized)) {
            $multiplier = 1000;
            $normalized = preg_replace('/(rb|ribu|k)$/u', '', $normalized) ?? $normalized;
        } elseif (preg_match('/(jt|juta)$/u', $normalized)) {
            $multiplier = 1_000_000;
            $normalized = preg_replace('/(jt|juta)$/u', '', $normalized) ?? $normalized;
        }

        $clean = preg_replace('/[^0-9.,-]/u', '', $normalized);
        if ($clean === null || $clean === '') {
            return null;
        }

        if (str_contains($clean, ',')) {
            $clean = str_replace('.', '', $clean);
            $clean = str_replace(',', '.', $clean);
        } else {
            $clean = str_replace('.', '', $clean);
        }

        if (! is_numeric($clean) || (float) $clean <= 0) {
            return null;
        }

        $value = (float) $clean * $multiplier;

        return (int) round($value);
    }

    /**
     * @return array{
     *     command:string,
     *     transactionType:?string,
     *     amount:?int,
     *     note:string,
     *     walletKeyword:?string,
     *     rawMessage:string,
     *     error:?string
     * }
     */
    public function parse(string $message): array
    {
        $rawMessage = trim($message);
        $normalized = self::normalizeText($rawMessage);

        $base = [
            'command' => 'unknown',
            'transactionType' => null,
            'amount' => null,
            'note' => '-',
            'walletKeyword' => null,
            'rawMessage' => $rawMessage,
            'error' => null,
        ];

        if ($normalized === '') {
            return ['command' => 'unknown', 'rawMessage' => $rawMessage, 'error' => 'EMPTY_MESSAGE'] + $base;
        }

        $segments = preg_split('/\s+/u', $normalized) ?: [];
        $first = Str::of($segments[0] ?? '')->lower()->ltrim('/')->__toString();

        if (in_array($first, self::COMMAND_START, true)) {
            return ['command' => 'start'] + $base;
        }

        if (in_array($first, self::COMMAND_BALANCE, true)) {
            return ['command' => 'balance'] + $base;
        }

        if (in_array($first, self::COMMAND_HELP, true)) {
            return ['command' => 'help'] + $base;
        }

        if (in_array($first, self::COMMAND_WALLETS, true)) {
            return ['command' => 'wallets'] + $base;
        }

        if (in_array($first, self::COMMAND_BILLS, true)) {
            return ['command' => 'bills'] + $base;
        }

        if (in_array($first, self::COMMAND_BILL_PAID, true)) {
            return $this->parseBillPaid(array_slice($segments, 1), $rawMessage);
        }

        if (in_array($first, self::COMMAND_TRANSFER, true)) {
            return $this->parseTransfer(array_slice($segments, 1), $rawMessage);
        }

        if (in_array($first, self::COMMAND_SUMMARY, true)) {
            return $this->parseSummary(array_slice($segments, 1), $rawMessage);
        }

        if (in_array($first, self::COMMAND_TOP, true)) {
            return ['command' => 'top_categories'] + $base;
        }

        if (in_array($first, self::EXPENSE_KEYWORDS, true)) {
            return $this->parseTransaction('expense', array_slice($segments, 1), $rawMessage);
        }

        if (in_array($first, self::INCOME_KEYWORDS, true)) {
            return $this->parseTransaction('income', array_slice($segments, 1), $rawMessage);
        }

        return ['command' => 'unknown', 'error' => 'UNKNOWN_COMMAND'] + $base;
    }

    /**
     * @param  array<int, string>  $args
     * @return array<string, mixed>
     */
    private function parseTransaction(string $type, array $args, string $rawMessage): array
    {
        $base = [
            'command' => 'transaction',
            'transactionType' => $type,
            'amount' => null,
            'note' => '-',
            'walletKeyword' => null,
            'rawMessage' => $rawMessage,
            'error' => null,
        ];

        while (count($args) > 0 && Str::lower((string) $args[0]) === 'rp') {
            $args = array_slice($args, 1);
        }

        if (count($args) === 0) {
            return ['error' => 'INVALID_AMOUNT'] + $base;
        }

        $amount = self::normalizeAmount($args[0]);
        if ($amount === null) {
            return ['error' => 'INVALID_AMOUNT'] + $base;
        }

        $rest = array_slice($args, 1);
        $separatorIndex = $this->separatorIndex($rest);

        $walletKeyword = null;
        $noteParts = $rest;
        if ($separatorIndex !== null) {
            $walletKeyword = self::normalizeText(implode(' ', array_slice($rest, $separatorIndex + 1)));
            $noteParts = array_slice($rest, 0, $separatorIndex);
        }

        $note = self::normalizeText(implode(' ', $noteParts));
        if ($note === '') {
            $note = '-';
        }

        if (! $walletKeyword) {
            return [
                'command' => 'transaction',
                'transactionType' => $type,
                'amount' => $amount,
                'note' => $note,
                'walletKeyword' => null,
                'rawMessage' => $rawMessage,
                'error' => 'MISSING_WALLET',
            ];
        }

        return [
            'command' => 'transaction',
            'transactionType' => $type,
            'amount' => $amount,
            'note' => $note,
            'walletKeyword' => $walletKeyword,
            'rawMessage' => $rawMessage,
            'error' => null,
        ];
    }

    /**
     * @param  array<int, string>  $args
     */
    private function separatorIndex(array $args): ?int
    {
        foreach ($args as $index => $arg) {
            if (in_array(Str::lower($arg), self::WALLET_SEPARATORS, true)) {
                return $index;
            }
        }

        return null;
    }

    /**
     * @param  array<int, string>  $args
     * @return array<string, mixed>
     */
    private function parseBillPaid(array $args, string $rawMessage): array
    {
        $base = [
            'command' => 'bill_paid',
            'transactionType' => null,
            'amount' => null,
            'note' => '-',
            'walletKeyword' => null,
            'rawMessage' => $rawMessage,
            'error' => null,
            'billItemId' => null,
        ];

        if (count($args) === 0 || ! ctype_digit((string) $args[0])) {
            return ['error' => 'INVALID_BILL_ID'] + $base;
        }

        $billItemId = (int) $args[0];
        $rest = array_slice($args, 1);

        $separator = $this->separatorIndex($rest);
        $walletKeyword = null;
        if ($separator !== null) {
            $walletKeyword = self::normalizeText(implode(' ', array_slice($rest, $separator + 1)));
        }

        return [
            'command' => 'bill_paid',
            'transactionType' => null,
            'amount' => null,
            'note' => '-',
            'walletKeyword' => $walletKeyword !== '' ? $walletKeyword : null,
            'rawMessage' => $rawMessage,
            'error' => null,
            'billItemId' => $billItemId,
        ];
    }

    /**
     * @param  array<int, string>  $args
     * @return array<string, mixed>
     */
    private function parseTransfer(array $args, string $rawMessage): array
    {
        $base = [
            'command' => 'transfer',
            'transactionType' => null,
            'amount' => null,
            'note' => '-',
            'walletKeyword' => null,
            'rawMessage' => $rawMessage,
            'error' => null,
            'fromWalletKeyword' => null,
            'toWalletKeyword' => null,
        ];

        while (count($args) > 0 && Str::lower((string) $args[0]) === 'rp') {
            $args = array_slice($args, 1);
        }

        $amountIndex = null;
        foreach ($args as $index => $token) {
            if (self::normalizeAmount((string) $token) !== null) {
                $amountIndex = $index;
                break;
            }
        }

        if ($amountIndex === null) {
            return ['error' => 'INVALID_AMOUNT'] + $base;
        }

        $amount = self::normalizeAmount((string) $args[$amountIndex]);
        $rest = array_slice($args, $amountIndex + 1);

        $fromIndex = $this->keywordIndex($rest, ['dari', 'from']);
        $toIndex = $this->keywordIndex($rest, ['ke', 'to', '->']);

        if ($fromIndex === null && $toIndex === null) {
            // Pattern: <from> <to>
            if (count($rest) < 2) {
                return ['error' => 'INVALID_TRANSFER'] + $base;
            }

            return [
                'command' => 'transfer',
                'transactionType' => null,
                'amount' => $amount,
                'note' => '-',
                'walletKeyword' => null,
                'rawMessage' => $rawMessage,
                'error' => null,
                'fromWalletKeyword' => self::normalizeText((string) $rest[0]),
                'toWalletKeyword' => self::normalizeText(implode(' ', array_slice($rest, 1))),
            ];
        }

        if ($toIndex === null) {
            return ['error' => 'MISSING_TARGET_WALLET'] + $base;
        }

        $fromKeyword = $fromIndex !== null
            ? self::normalizeText(implode(' ', array_slice($rest, $fromIndex + 1, $toIndex - $fromIndex - 1)))
            : self::normalizeText(implode(' ', array_slice($rest, 0, $toIndex)));

        $toKeyword = self::normalizeText(implode(' ', array_slice($rest, $toIndex + 1)));

        if ($fromKeyword === '' || $toKeyword === '') {
            return ['error' => 'INVALID_TRANSFER'] + $base;
        }

        return [
            'command' => 'transfer',
            'transactionType' => null,
            'amount' => $amount,
            'note' => '-',
            'walletKeyword' => null,
            'rawMessage' => $rawMessage,
            'error' => null,
            'fromWalletKeyword' => $fromKeyword,
            'toWalletKeyword' => $toKeyword,
        ];
    }

    /**
     * @param  array<int, string>  $args
     * @return array<string, mixed>
     */
    private function parseSummary(array $args, string $rawMessage): array
    {
        $base = [
            'command' => 'summary',
            'transactionType' => null,
            'amount' => null,
            'note' => '-',
            'walletKeyword' => null,
            'rawMessage' => $rawMessage,
            'error' => null,
            'range' => 'month',
        ];

        $token = Str::lower((string) ($args[0] ?? 'bulan'));
        $range = match ($token) {
            'hari', 'today', 'harian', 'day' => 'day',
            'minggu', 'mingguan', 'week', '7', '7hari' => 'week',
            'bulan', 'bulanan', 'month', '' => 'month',
            default => null,
        };

        if ($range === null) {
            return ['error' => 'INVALID_RANGE'] + $base;
        }

        return ['range' => $range] + $base;
    }

    /**
     * @param  array<int, string>  $args
     * @param  array<int, string>  $keywords
     */
    private function keywordIndex(array $args, array $keywords): ?int
    {
        foreach ($args as $index => $arg) {
            if (in_array(Str::lower($arg), $keywords, true)) {
                return $index;
            }
        }

        return null;
    }
}
