<?php

namespace App\Http\Controllers;

use App\Models\BillItem;
use App\Models\Category;
use App\Models\Wallet;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $now = Carbon::now();
        $monthStart = $now->copy()->startOfMonth();
        $monthEnd = $now->copy()->endOfMonth();
        $today = $now->copy()->startOfDay();

        $wallets = $user->wallets()
            ->with('provider:id,logo')
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'institution', 'current_balance', 'is_active', 'wallet_provider_id', 'custom_logo']);

        $totalBalance = (float) $wallets->where('is_active', true)->sum('current_balance');

        $monthTotals = $user->transactions()
            ->whereBetween('transaction_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
            ->selectRaw("type, COALESCE(SUM(amount), 0) AS total")
            ->groupBy('type')
            ->pluck('total', 'type');

        $monthIncome = (float) ($monthTotals['income'] ?? 0);
        $monthExpense = (float) ($monthTotals['expense'] ?? 0);

        $chart = collect(range(5, 0))->map(function (int $offset) use ($user) {
            $month = Carbon::now()->subMonths($offset);
            $totals = $user->transactions()
                ->whereBetween('transaction_date', [
                    $month->copy()->startOfMonth()->toDateString(),
                    $month->copy()->endOfMonth()->toDateString(),
                ])
                ->selectRaw("type, COALESCE(SUM(amount), 0) AS total")
                ->groupBy('type')
                ->pluck('total', 'type');

            return [
                'month' => $month->translatedFormat('M'),
                'income' => (float) ($totals['income'] ?? 0),
                'expense' => (float) ($totals['expense'] ?? 0),
            ];
        });

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
            ->where('user_id', $user->id);

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
            ->where('user_id', $user->id);

        $combinedActivityQuery = $transactionsActivityQuery->clone()->unionAll($transfersActivityQuery);
        $recentTransactions = DB::table(DB::raw("({$combinedActivityQuery->toSql()}) as activities"))
            ->mergeBindings($combinedActivityQuery)
            ->orderByDesc('transaction_date')
            ->orderByDesc('id')
            ->limit(6)
            ->get();

        $categoryIds = $recentTransactions->pluck('category_id')->filter()->unique();
        $walletIds = $recentTransactions->flatMap(function ($item) {
            return [$item->wallet_id, $item->from_wallet_id, $item->to_wallet_id];
        })->filter()->unique();

        $categoriesDict = Category::whereIn('id', $categoryIds)->get(['id', 'name', 'type'])->keyBy('id');
        $walletsDict = Wallet::whereIn('id', $walletIds)
            ->with('provider:id,logo')
            ->get(['id', 'name', 'type', 'wallet_provider_id', 'custom_logo'])
            ->keyBy('id');

        $recentTransactions->transform(function ($item) use ($categoriesDict, $walletsDict) {
            $item->category = $item->category_id ? $categoriesDict->get($item->category_id) : null;
            $item->wallet = $item->wallet_id ? $walletsDict->get($item->wallet_id) : null;
            $item->from_wallet = $item->from_wallet_id ? $walletsDict->get($item->from_wallet_id) : null;
            $item->to_wallet = $item->to_wallet_id ? $walletsDict->get($item->to_wallet_id) : null;
            return $item;
        });

        $billItemQuery = BillItem::query()
            ->whereHas('billGroup', fn ($query) => $query->where('user_id', $user->id))
            ->with('billGroup:id,name,user_id');

        $upcomingBills = (clone $billItemQuery)
            ->where('status', 'unpaid')
            ->whereDate('due_date', '>=', $today->toDateString())
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        $overdueBills = (clone $billItemQuery)
            ->where('status', 'unpaid')
            ->whereDate('due_date', '<', $today->toDateString())
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        $activeBillCount = (clone $billItemQuery)->where('status', 'unpaid')->count();

        return Inertia::render('Dashboard', [
            'summary' => [
                'totalBalance' => $totalBalance,
                'monthIncome' => $monthIncome,
                'monthExpense' => $monthExpense,
                'monthNet' => $monthIncome - $monthExpense,
                'walletCount' => $wallets->where('is_active', true)->count(),
                'activeBillCount' => $activeBillCount,
                'overdueBillCount' => $overdueBills->count(),
                'monthLabel' => $now->translatedFormat('F Y'),
            ],
            'wallets' => $wallets,
            'chart' => $chart->values(),
            'recentTransactions' => $recentTransactions,
            'upcomingBills' => $upcomingBills,
            'overdueBills' => $overdueBills,
        ]);
    }
}