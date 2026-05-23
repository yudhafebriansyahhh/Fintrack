<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\Wallet;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TransactionController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $filters = $request->validate([
            'type' => ['nullable', Rule::in(['income', 'expense'])],
            'wallet_id' => ['nullable', 'integer'],
            'category_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', Rule::in([10, 25, 50, 100])],
            'chart_period' => ['nullable', Rule::in(['weekly', 'monthly', 'yearly'])],
        ]);

        $perPage = (int) ($filters['per_page'] ?? 10);
        $chartPeriod = $filters['chart_period'] ?? 'monthly';

        $transactionsQuery = DB::table('transactions')
            ->select(
                'id',
                DB::raw("'transaction' as kind"),
                'type',
                'amount',
                'transaction_date',
                'description',
                'category_id',
                'wallet_id',
                DB::raw('null as from_wallet_id'),
                DB::raw('null as to_wallet_id')
            )
            ->where('user_id', $user->id)
            ->when($filters['type'] ?? null, function ($q, $type) {
                if ($type === 'transfer') {
                    $q->whereRaw('1 = 0');
                } else {
                    $q->where('type', $type);
                }
            })
            ->when($filters['wallet_id'] ?? null, fn ($q, $id) => $q->where('wallet_id', $id))
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->whereDate('transaction_date', '>=', $from))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->whereDate('transaction_date', '<=', $to))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('description', 'like', "%{$search}%"));

        $transfersQuery = DB::table('wallet_transfers')
            ->select(
                'id',
                DB::raw("'transfer' as kind"),
                DB::raw("'transfer' as type"),
                'amount',
                'transfer_date as transaction_date',
                'description',
                DB::raw('null as category_id'),
                DB::raw('null as wallet_id'),
                'from_wallet_id',
                'to_wallet_id'
            )
            ->where('user_id', $user->id)
            ->when($filters['wallet_id'] ?? null, function ($q, $id) {
                $q->where(function ($q2) use ($id) {
                    $q2->where('from_wallet_id', $id)->orWhere('to_wallet_id', $id);
                });
            })
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->whereDate('transfer_date', '>=', $from))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->whereDate('transfer_date', '<=', $to))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('description', 'like', "%{$search}%"));

        if ((($filters['type'] ?? null) && $filters['type'] !== 'transfer') || ($filters['category_id'] ?? null)) {
            $transfersQuery->whereRaw('1 = 0');
        }

        $combinedQuery = $transactionsQuery->clone()->unionAll($transfersQuery);

        $query = DB::table(DB::raw("({$combinedQuery->toSql()}) as activities"))
            ->mergeBindings($combinedQuery)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id');

        $paginated = $query->paginate($perPage)->withQueryString();

        $categoryIds = collect($paginated->items())->pluck('category_id')->filter()->unique();
        $walletIds = collect($paginated->items())->flatMap(function ($item) {
            return [$item->wallet_id, $item->from_wallet_id, $item->to_wallet_id];
        })->filter()->unique();

        $categoriesDict = Category::whereIn('id', $categoryIds)->get(['id', 'name', 'type'])->keyBy('id');
        $walletsDict = Wallet::whereIn('id', $walletIds)->get(['id', 'name', 'type'])->keyBy('id');

        $paginated->getCollection()->transform(function ($item) use ($categoriesDict, $walletsDict) {
            $item->category = $item->category_id ? $categoriesDict->get($item->category_id) : null;
            $item->wallet = $item->wallet_id ? $walletsDict->get($item->wallet_id) : null;
            $item->from_wallet = $item->from_wallet_id ? $walletsDict->get($item->from_wallet_id) : null;
            $item->to_wallet = $item->to_wallet_id ? $walletsDict->get($item->to_wallet_id) : null;
            return $item;
        });

        $income = (float) (clone $transactionsQuery)->where('type', 'income')->sum('amount');
        $expense = (float) (clone $transactionsQuery)->where('type', 'expense')->sum('amount');

        $baseModelQuery = $user->transactions()
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('transactions.type', $type))
            ->when($filters['wallet_id'] ?? null, fn ($q, $id) => $q->where('transactions.wallet_id', $id))
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('transactions.category_id', $id))
            ->when($filters['from'] ?? null, fn ($q, $from) => $q->whereDate('transactions.transaction_date', '>=', $from))
            ->when($filters['to'] ?? null, fn ($q, $to) => $q->whereDate('transactions.transaction_date', '<=', $to))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('transactions.description', 'like', "%{$search}%"));

        $filters['per_page'] = $perPage;
        $filters['chart_period'] = $chartPeriod;

        return Inertia::render('Transactions/Index', [
            'transactions' => $paginated,
            'wallets' => $user->wallets()->with('provider:id,logo')->orderBy('name')->get(['id', 'name', 'type', 'is_active', 'wallet_provider_id', 'custom_logo']),
            'categories' => $user->categories()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
            'filters' => $filters,
            'categoryDistribution' => $this->categoryDistribution(clone $baseModelQuery, $chartPeriod),
            'trend' => $this->trend(clone $baseModelQuery, $chartPeriod),
            'summary' => [
                'income' => $income,
                'expense' => $expense,
                'net' => $income - $expense,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        DB::transaction(function () use ($request, $data) {
            $wallet = $this->ownWallet($request, (int) $data['wallet_id']);
            $this->ownCategory($request, (int) $data['category_id'], $data['type']);

            if ($data['type'] === 'expense' && $data['amount'] > $wallet->current_balance) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal pengeluaran melebihi saldo dompet saat ini (Tersedia: ' . number_format($wallet->current_balance, 0, ',', '.') . ').',
                ]);
            }

            $request->user()->transactions()->create($data);

            $this->applyAmount($wallet, $data['type'], (float) $data['amount']);
        });

        return back()->with('success', 'Transaksi berhasil dicatat.');
    }

    public function update(Request $request, Transaction $transaction): RedirectResponse
    {
        $this->authorize('update', $transaction);

        $data = $this->validated($request);

        DB::transaction(function () use ($request, $transaction, $data) {
            $oldWallet = $transaction->wallet()->lockForUpdate()->first();
            $this->ownCategory($request, (int) $data['category_id'], $data['type']);

            $newWalletId = (int) $data['wallet_id'];
            $newWallet = $oldWallet->id === $newWalletId
                ? $oldWallet
                : $this->ownWallet($request, $newWalletId);

            $availableBalance = $newWallet->current_balance;
            if ($oldWallet->id === $newWalletId) {
                $availableBalance += $transaction->type === 'expense' ? $transaction->amount : -$transaction->amount;
            }

            if ($data['type'] === 'expense' && $data['amount'] > $availableBalance) {
                throw ValidationException::withMessages([
                    'amount' => 'Nominal pengeluaran melebihi saldo dompet tujuan (Tersedia: ' . number_format($availableBalance, 0, ',', '.') . ').',
                ]);
            }

            $this->applyAmount($oldWallet, $transaction->type, -(float) $transaction->amount);

            $transaction->update($data);

            if ($oldWallet->id !== $newWalletId) {
                // If it changed wallet, we need to refresh old wallet? Not necessarily, it's not the same instance.
            }

            $this->applyAmount($newWallet, $data['type'], (float) $data['amount']);
        });

        return back()->with('success', 'Transaksi berhasil diperbarui.');
    }

    public function destroy(Request $request, Transaction $transaction): RedirectResponse
    {
        $this->authorize('delete', $transaction);

        DB::transaction(function () use ($transaction) {
            $wallet = $transaction->wallet()->lockForUpdate()->first();
            $this->applyAmount($wallet, $transaction->type, -(float) $transaction->amount);
            $transaction->delete();
        });

        return back()->with('success', 'Transaksi berhasil dihapus.');
    }

    private function categoryDistribution($query, string $period): array
    {
        [$start, $end] = $this->periodRange($period);

        return $query
            ->whereDate('transactions.transaction_date', '>=', $start->toDateString())
            ->whereDate('transactions.transaction_date', '<=', $end->toDateString())
            ->select('categories.name as category', 'transactions.type', DB::raw('sum(transactions.amount) as total'), DB::raw('count(*) as count'))
            ->join('categories', 'categories.id', '=', 'transactions.category_id')
            ->groupBy('categories.name', 'transactions.type')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'category' => $row->category,
                'type' => $row->type,
                'total' => (float) $row->total,
                'count' => (int) $row->count,
            ])
            ->all();
    }

    private function periodRange(string $period): array
    {
        $end = now()->endOfDay();
        $start = match ($period) {
            'weekly' => now()->subDays(6)->startOfDay(),
            'yearly' => now()->startOfYear(),
            default => now()->startOfMonth(),
        };

        return [$start, $end];
    }

    private function trend($query, string $period): array
    {
        [$start, $end] = $this->periodRange($period);
        $rows = $query
            ->whereDate('transaction_date', '>=', $start->toDateString())
            ->whereDate('transaction_date', '<=', $end->toDateString())
            ->orderBy('transaction_date')
            ->get(['type', 'amount', 'transaction_date']);

        if ($period === 'yearly') {
            return collect(range(0, 11))->map(function ($offset) use ($rows) {
                $date = now()->startOfYear()->addMonths($offset);
                $items = $rows->filter(fn ($row) => Carbon::parse($row->transaction_date)->isSameMonth($date));

                return [
                    'label' => $date->translatedFormat('M'),
                    'income' => (float) $items->where('type', 'income')->sum('amount'),
                    'expense' => (float) $items->where('type', 'expense')->sum('amount'),
                ];
            })->all();
        }

        return collect(range(0, $start->diffInDays($end)))->map(function ($offset) use ($rows, $start) {
            $date = $start->copy()->addDays($offset);
            $items = $rows->filter(fn ($row) => Carbon::parse($row->transaction_date)->isSameDay($date));

            return [
                'label' => $date->translatedFormat('j M'),
                'income' => (float) $items->where('type', 'income')->sum('amount'),
                'expense' => (float) $items->where('type', 'expense')->sum('amount'),
            ];
        })->all();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'wallet_id' => ['required', 'integer'],
            'category_id' => ['required', 'integer'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transaction_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function ownWallet(Request $request, int $walletId): Wallet
    {
        $wallet = Wallet::where('user_id', $request->user()->id)
            ->where('id', $walletId)
            ->lockForUpdate()
            ->firstOrFail();

        if (! $wallet->is_active) {
            throw ValidationException::withMessages([
                'wallet_id' => 'Dompet tidak aktif. Aktifkan dompet terlebih dahulu sebelum mencatat transaksi.',
            ]);
        }

        return $wallet;
    }

    private function ownCategory(Request $request, int $categoryId, string $type): Category
    {
        $category = Category::where('user_id', $request->user()->id)
            ->where('id', $categoryId)
            ->where('is_active', true)
            ->firstOrFail();

        abort_unless($category->type === $type, 422, 'Kategori tidak sesuai tipe transaksi.');

        return $category;
    }

    private function applyAmount(Wallet $wallet, string $type, float $amount): void
    {
        $delta = $type === 'income' ? $amount : -$amount;

        $wallet->forceFill([
            'current_balance' => (float) $wallet->current_balance + $delta,
        ])->save();
    }

}
