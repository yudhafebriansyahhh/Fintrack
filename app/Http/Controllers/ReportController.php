<?php

namespace App\Http\Controllers;

use App\Models\BillItem;
use App\Models\Category;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $filters = $request->validate([
            'period' => ['nullable', Rule::in(['daily', 'weekly', 'monthly', 'yearly', 'custom'])],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'category_id' => ['nullable', 'integer'],
            'wallet_id' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::in(['income', 'expense', 'transfer'])],
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', Rule::in([10, 25, 50, 100])],
        ]);

        $perPage = (int) ($filters['per_page'] ?? 10);

        $period = $filters['period'] ?? 'monthly';
        $today = Carbon::now();

        [$start, $end, $label] = match ($period) {
            'daily' => [$today->copy()->startOfDay(), $today->copy()->endOfDay(), $today->translatedFormat('d F Y')],
            'weekly' => [$today->copy()->startOfWeek(), $today->copy()->endOfWeek(), 'Minggu ' . $today->translatedFormat('d M Y')],
            'yearly' => [$today->copy()->startOfYear(), $today->copy()->endOfYear(), $today->translatedFormat('Y')],
            'custom' => [
                isset($filters['from']) ? Carbon::parse($filters['from']) : $today->copy()->startOfMonth(),
                isset($filters['to']) ? Carbon::parse($filters['to']) : $today->copy()->endOfMonth(),
                'Periode kustom',
            ],
            default => [$today->copy()->startOfMonth(), $today->copy()->endOfMonth(), $today->translatedFormat('F Y')],
        };

        $startDate = $start->toDateString();
        $endDate = $end->toDateString();

        $transactionsQuery = $user->transactions()
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($filters['wallet_id'] ?? null, fn ($q, $id) => $q->where('wallet_id', $id))
            ->when($filters['type'] ?? null, function ($q, $type) {
                if ($type === 'transfer') {
                    $q->whereRaw('1 = 0');
                } else {
                    $q->where('type', $type);
                }
            })
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('description', 'like', "%{$search}%"));

        $totals = (clone $transactionsQuery)
            ->selectRaw("type, COALESCE(SUM(amount), 0) AS total")
            ->groupBy('type')
            ->pluck('total', 'type');

        $totalIncome = (float) ($totals['income'] ?? 0);
        $totalExpense = (float) ($totals['expense'] ?? 0);

        $byCategory = (clone $transactionsQuery)
            ->selectRaw('category_id, type, COALESCE(SUM(amount), 0) as total')
            ->groupBy('category_id', 'type')
            ->with('category:id,name,type')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->category_id,
                'name' => $row->category?->name ?? 'Tanpa kategori',
                'type' => $row->type,
                'total' => (float) $row->total,
            ])
            ->sortByDesc('total')
            ->values();

        $topExpenseCategory = $byCategory->firstWhere('type', 'expense');

        $byWallet = (clone $transactionsQuery)
            ->selectRaw('wallet_id, type, COALESCE(SUM(amount), 0) as total')
            ->groupBy('wallet_id', 'type')
            ->with('wallet:id,name,type')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->wallet_id,
                'name' => $row->wallet?->name ?? '-',
                'type' => $row->type,
                'total' => (float) $row->total,
            ])
            ->values();

        $dailyTrend = (clone $transactionsQuery)
            ->selectRaw('transaction_date, type, COALESCE(SUM(amount), 0) AS total')
            ->groupBy('transaction_date', 'type')
            ->orderBy('transaction_date')
            ->get()
            ->groupBy(fn ($row) => Carbon::parse($row->transaction_date)->toDateString())
            ->map(function ($rows, $date) {
                $values = $rows->keyBy('type');
                return [
                    'date' => $date,
                    'income' => (float) ($values['income']->total ?? 0),
                    'expense' => (float) ($values['expense']->total ?? 0),
                ];
            })
            ->values();

        $transactionsActivityQuery = DB::table('transactions')
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
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->when($filters['category_id'] ?? null, fn ($q, $id) => $q->where('category_id', $id))
            ->when($filters['wallet_id'] ?? null, fn ($q, $id) => $q->where('wallet_id', $id))
            ->when($filters['type'] ?? null, function ($q, $type) {
                if ($type === 'transfer') {
                    $q->whereRaw('1 = 0');
                } else {
                    $q->where('type', $type);
                }
            })
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('description', 'like', "%{$search}%"));

        $transfersActivityQuery = DB::table('wallet_transfers')
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
            ->whereBetween('transfer_date', [$startDate, $endDate])
            ->when($filters['wallet_id'] ?? null, function ($q, $id) {
                $q->where(function ($q2) use ($id) {
                    $q2->where('from_wallet_id', $id)->orWhere('to_wallet_id', $id);
                });
            })
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('description', 'like', "%{$search}%"));

        if ((($filters['type'] ?? null) && $filters['type'] !== 'transfer') || ($filters['category_id'] ?? null)) {
            $transfersActivityQuery->whereRaw('1 = 0');
        }

        $combinedActivityQuery = $transactionsActivityQuery->clone()->unionAll($transfersActivityQuery);
        $transactionDetail = DB::table(DB::raw("({$combinedActivityQuery->toSql()}) as activities"))
            ->mergeBindings($combinedActivityQuery)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->paginate($perPage)
            ->withQueryString();

        $categoryIds = collect($transactionDetail->items())->pluck('category_id')->filter()->unique();
        $walletIds = collect($transactionDetail->items())->flatMap(function ($item) {
            return [$item->wallet_id, $item->from_wallet_id, $item->to_wallet_id];
        })->filter()->unique();

        $categoriesDict = Category::whereIn('id', $categoryIds)->get(['id', 'name', 'type'])->keyBy('id');
        $walletsDict = Wallet::whereIn('id', $walletIds)
            ->with('provider:id,logo')
            ->get(['id', 'name', 'type', 'wallet_provider_id', 'custom_logo'])
            ->keyBy('id');

        $transactionDetail->getCollection()->transform(function ($item) use ($categoriesDict, $walletsDict) {
            $item->category = $item->category_id ? $categoriesDict->get($item->category_id) : null;
            $item->wallet = $item->wallet_id ? $walletsDict->get($item->wallet_id) : null;
            $item->from_wallet = $item->from_wallet_id ? $walletsDict->get($item->from_wallet_id) : null;
            $item->to_wallet = $item->to_wallet_id ? $walletsDict->get($item->to_wallet_id) : null;
            return $item;
        });

        $billStatus = BillItem::query()
            ->whereHas('billGroup', fn ($q) => $q->where('user_id', $user->id))
            ->selectRaw("status, COUNT(*) as total_count, COALESCE(SUM(amount), 0) as total_amount")
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $billLate = BillItem::query()
            ->whereHas('billGroup', fn ($q) => $q->where('user_id', $user->id))
            ->where('status', 'unpaid')
            ->whereDate('due_date', '<', $today->toDateString())
            ->selectRaw('COUNT(*) as total_count, COALESCE(SUM(amount), 0) as total_amount')
            ->first();

        $categories = $user->categories()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']);
        $wallets = $user->wallets()
            ->with('provider:id,logo')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'is_active', 'wallet_provider_id', 'custom_logo']);

        return Inertia::render('Reports/Index', [
            'filters' => array_merge($filters, [
                'period' => $period,
                'from' => $startDate,
                'to' => $endDate,
                'per_page' => $perPage,
            ]),
            'meta' => [
                'label' => $label,
                'from' => $startDate,
                'to' => $endDate,
            ],
            'summary' => [
                'totalIncome' => $totalIncome,
                'totalExpense' => $totalExpense,
                'netBalance' => $totalIncome - $totalExpense,
                'topExpenseCategory' => $topExpenseCategory,
                'transactionCount' => $transactionDetail->total(),
            ],
            'byCategory' => $byCategory,
            'byWallet' => $byWallet,
            'dailyTrend' => $dailyTrend,
            'transactions' => $transactionDetail,
            'bills' => [
                'paid' => [
                    'count' => (int) ($billStatus['paid']->total_count ?? 0),
                    'amount' => (float) ($billStatus['paid']->total_amount ?? 0),
                ],
                'unpaid' => [
                    'count' => (int) ($billStatus['unpaid']->total_count ?? 0),
                    'amount' => (float) ($billStatus['unpaid']->total_amount ?? 0),
                ],
                'cancelled' => [
                    'count' => (int) ($billStatus['cancelled']->total_count ?? 0),
                    'amount' => (float) ($billStatus['cancelled']->total_amount ?? 0),
                ],
                'late' => [
                    'count' => (int) ($billLate->total_count ?? 0),
                    'amount' => (float) ($billLate->total_amount ?? 0),
                ],
            ],
            'categories' => $categories,
            'wallets' => $wallets,
        ]);
    }
}