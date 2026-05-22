<?php

namespace App\Services\Telegram;

use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TelegramBot
{
    public function __construct(
        private readonly MessageParser $parser,
        private readonly WalletMatcher $walletMatcher,
        private readonly ResponseFormatter $formatter,
    ) {
    }

    public function handle(User $user, string $message): string
    {
        $parsed = $this->parser->parse($message);

        return match ($parsed['command']) {
            'start' => $this->formatter->start(),
            'help' => $this->formatter->help(),
            'balance' => $this->formatter->balance($this->activeWallets($user)),
            'wallets' => $this->formatter->walletList($this->activeWallets($user)),
            'bills' => $this->handleBills($user),
            'bill_paid' => $this->handleBillPaid($user, $parsed),
            'transfer' => $this->handleTransfer($user, $parsed),
            'summary' => $this->handleSummary($user, $parsed),
            'top_categories' => $this->handleTopCategories($user),
            'transaction' => $this->handleTransaction($user, $parsed),
            'unknown' => $this->formatter->invalidCommand(),
            default => $this->formatter->invalidCommand(),
        };
    }

    public function unauthorizedReply(): string
    {
        return $this->formatter->unauthorized();
    }

    public function linkedReply(): string
    {
        return $this->formatter->linked();
    }

    private function handleTransaction(User $user, array $parsed): string
    {
        if (($parsed['error'] ?? null) === 'INVALID_AMOUNT') {
            return $this->formatter->invalidAmount();
        }

        if (($parsed['error'] ?? null) === 'MISSING_WALLET') {
            return $this->formatter->missingWallet();
        }

        $wallet = $this->walletMatcher->findByKeyword(
            $parsed['walletKeyword'] ?? null,
            $this->activeWallets($user),
        );

        if (! $wallet) {
            return $this->formatter->walletNotFound(
                $parsed['walletKeyword'] ?? null,
                $this->activeWallets($user),
            );
        }

        $type = $parsed['transactionType'];
        $amount = (float) ($parsed['amount'] ?? 0);
        $note = (string) ($parsed['note'] ?? '-');

        $category = $this->resolveCategory($user, $type, $note);

        DB::transaction(function () use ($user, $wallet, $category, $type, $amount, $note) {
            Transaction::create([
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'type' => $type,
                'amount' => $amount,
                'transaction_date' => Carbon::now()->toDateString(),
                'description' => $note !== '-' ? Str::limit($note, 250, '') : null,
            ]);

            $delta = $type === 'income' ? $amount : -$amount;
            $wallet->forceFill([
                'current_balance' => (float) $wallet->current_balance + $delta,
            ])->save();
        });

        return $this->formatter->transactionSuccess([
            'type' => $type,
            'amount' => $amount,
            'note' => $note,
            'category' => $category->name,
            'walletName' => $wallet->name,
            'walletBalance' => (float) $wallet->fresh()->current_balance,
        ]);
    }

    private function resolveCategory(User $user, string $type, string $note): Category
    {
        $haystack = mb_strtolower(trim($note));

        if ($haystack !== '' && $haystack !== '-') {
            $userCategories = $user->categories()
                ->where('type', $type)
                ->orderByRaw('LENGTH(name) DESC')
                ->get(['id', 'name']);

            foreach ($userCategories as $candidate) {
                $needle = mb_strtolower((string) $candidate->name);
                if ($needle === '' || mb_strlen($needle) < 3) {
                    continue;
                }
                if (str_contains($haystack, $needle)) {
                    return Category::find($candidate->id);
                }
            }
        }

        $fallbackName = $type === 'income' ? 'Pemasukan Lainnya' : 'Pengeluaran Lainnya';

        $existing = $user->categories()
            ->where('type', $type)
            ->whereRaw('LOWER(name) = ?', [mb_strtolower($fallbackName)])
            ->first();

        if ($existing) {
            return $existing;
        }

        return Category::create([
            'user_id' => $user->id,
            'type' => $type,
            'name' => $fallbackName,
        ]);
    }

    private function activeWallets(User $user)
    {
        return $user->wallets()
            ->where('is_active', true)
            ->orderBy('name')
            ->get();
    }

    private function handleBills(User $user): string
    {
        $items = BillItem::query()
            ->whereHas('billGroup', fn ($q) => $q->where('user_id', $user->id))
            ->with('billGroup:id,name,user_id')
            ->whereIn('status', ['unpaid', 'late'])
            ->orderBy('due_date')
            ->limit(8)
            ->get();

        if ($items->isEmpty()) {
            return $this->formatter->noBills();
        }

        $today = Carbon::now()->startOfDay();
        $payload = $items->map(function (BillItem $item) use ($today) {
            $isLate = $item->due_date && Carbon::parse($item->due_date)->lt($today);

            return [
                'id' => $item->id,
                'title' => $item->title,
                'group' => $item->billGroup?->name,
                'amount' => (float) $item->amount,
                'due_date' => $item->due_date ? Carbon::parse($item->due_date)->translatedFormat('d M Y') : '-',
                'is_late' => $isLate,
            ];
        })->all();

        return $this->formatter->bills($payload);
    }

    private function handleBillPaid(User $user, array $parsed): string
    {
        if (($parsed['error'] ?? null) === 'INVALID_BILL_ID' || empty($parsed['billItemId'])) {
            return $this->formatter->billInvalidId();
        }

        $billItem = BillItem::query()
            ->whereHas('billGroup', fn ($q) => $q->where('user_id', $user->id))
            ->with('billGroup')
            ->find((int) $parsed['billItemId']);

        if (! $billItem) {
            return $this->formatter->billNotFound((int) $parsed['billItemId']);
        }

        if ($billItem->status === 'paid') {
            return $this->formatter->billAlreadyPaid($billItem);
        }

        $wallets = $this->activeWallets($user);
        $wallet = $this->walletMatcher->findByKeyword($parsed['walletKeyword'] ?? null, $wallets);

        if (! $wallet && $wallets->count() === 1) {
            $wallet = $wallets->first();
        }

        if (! $wallet) {
            return $this->formatter->walletNotFound($parsed['walletKeyword'] ?? null, $wallets);
        }

        $category = Category::firstOrCreate([
            'user_id' => $user->id,
            'type' => 'expense',
            'name' => 'Tagihan',
        ]);

        $amount = (float) $billItem->amount;
        $note = trim('Tagihan ' . ($billItem->billGroup?->name ?? '-') . ' - ' . $billItem->title);

        DB::transaction(function () use ($user, $wallet, $category, $billItem, $amount, $note) {
            Transaction::create([
                'user_id' => $user->id,
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'type' => 'expense',
                'amount' => $amount,
                'transaction_date' => Carbon::now()->toDateString(),
                'description' => Str::limit($note, 250, ''),
            ]);

            $wallet->forceFill([
                'current_balance' => (float) $wallet->current_balance - $amount,
            ])->save();

            $billItem->update([
                'status' => 'paid',
                'paid_date' => Carbon::now()->toDateString(),
            ]);

            $this->refreshGroupStatus($billItem->billGroup);
        });

        return $this->formatter->billPaid([
            'title' => $billItem->title,
            'group' => $billItem->billGroup?->name,
            'amount' => $amount,
            'walletName' => $wallet->name,
            'walletBalance' => (float) $wallet->fresh()->current_balance,
        ]);
    }

    private function handleTransfer(User $user, array $parsed): string
    {
        if (($parsed['error'] ?? null) === 'INVALID_AMOUNT') {
            return $this->formatter->invalidAmount();
        }

        if (($parsed['error'] ?? null) === 'INVALID_TRANSFER' || ($parsed['error'] ?? null) === 'MISSING_TARGET_WALLET') {
            return $this->formatter->transferInvalid();
        }

        $wallets = $this->activeWallets($user);
        $from = $this->walletMatcher->findByKeyword($parsed['fromWalletKeyword'] ?? null, $wallets);
        $to = $this->walletMatcher->findByKeyword($parsed['toWalletKeyword'] ?? null, $wallets);

        if (! $from) {
            return $this->formatter->walletNotFound($parsed['fromWalletKeyword'] ?? null, $wallets);
        }
        if (! $to) {
            return $this->formatter->walletNotFound($parsed['toWalletKeyword'] ?? null, $wallets);
        }
        if ($from->id === $to->id) {
            return $this->formatter->transferSameWallet();
        }

        $amount = (float) ($parsed['amount'] ?? 0);
        if ($amount <= 0) {
            return $this->formatter->invalidAmount();
        }

        if ((float) $from->current_balance < $amount) {
            return $this->formatter->transferInsufficient($from);
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
                'description' => 'Transfer via Telegram',
            ]);
        });

        return $this->formatter->transferSuccess([
            'amount' => $amount,
            'fromName' => $from->name,
            'toName' => $to->name,
            'fromBalance' => (float) $from->fresh()->current_balance,
            'toBalance' => (float) $to->fresh()->current_balance,
        ]);
    }

    private function handleSummary(User $user, array $parsed): string
    {
        if (($parsed['error'] ?? null) === 'INVALID_RANGE') {
            return $this->formatter->summaryInvalidRange();
        }

        $range = $parsed['range'] ?? 'month';
        [$start, $end, $label] = match ($range) {
            'day' => [Carbon::now()->startOfDay(), Carbon::now()->endOfDay(), 'Hari ini'],
            'week' => [Carbon::now()->subDays(6)->startOfDay(), Carbon::now()->endOfDay(), '7 Hari Terakhir'],
            default => [Carbon::now()->startOfMonth(), Carbon::now()->endOfMonth(), Carbon::now()->translatedFormat('F Y')],
        };

        $rows = $user->transactions()
            ->whereDate('transaction_date', '>=', $start->toDateString())
            ->whereDate('transaction_date', '<=', $end->toDateString())
            ->select('type', DB::raw('sum(amount) as total'), DB::raw('count(*) as total_count'))
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $income = (float) ($rows->get('income')->total ?? 0);
        $expense = (float) ($rows->get('expense')->total ?? 0);
        $count = (int) $rows->sum('total_count');

        return $this->formatter->summary($label, [
            'income' => $income,
            'expense' => $expense,
            'net' => $income - $expense,
            'count' => $count,
        ]);
    }

    private function handleTopCategories(User $user): string
    {
        $start = Carbon::now()->startOfMonth();
        $end = Carbon::now()->endOfMonth();

        $rows = $user->transactions()
            ->where('type', 'expense')
            ->whereDate('transaction_date', '>=', $start->toDateString())
            ->whereDate('transaction_date', '<=', $end->toDateString())
            ->join('categories', 'categories.id', '=', 'transactions.category_id')
            ->select('categories.name as category', DB::raw('sum(transactions.amount) as total'), DB::raw('count(*) as count'))
            ->groupBy('categories.name')
            ->orderByDesc('total')
            ->limit(5)
            ->get();

        $total = (float) $rows->sum('total');
        $items = $rows->map(fn ($row) => [
            'category' => $row->category,
            'total' => (float) $row->total,
            'count' => (int) $row->count,
            'percent' => $total > 0 ? ((float) $row->total / $total) * 100 : 0,
        ])->all();

        return $this->formatter->topCategories($items, Carbon::now()->translatedFormat('F Y'), $total);
    }

    private function refreshGroupStatus(?BillGroup $billGroup): void
    {
        if (! $billGroup) {
            return;
        }

        $billGroup->loadCount([
            'items',
            'items as outstanding_count' => fn ($q) => $q->whereIn('status', ['unpaid', 'late']),
        ]);

        if ($billGroup->status === 'cancelled') {
            return;
        }

        if ($billGroup->items_count === 0) {
            $billGroup->update(['status' => 'active']);

            return;
        }

        $billGroup->update([
            'status' => $billGroup->outstanding_count === 0 ? 'completed' : 'active',
        ]);
    }
}
