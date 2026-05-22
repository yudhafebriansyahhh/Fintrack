<?php

namespace App\Http\Controllers;

use App\Models\BillItem;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
            ->orderByDesc('is_active')
            ->orderBy('name')
            ->get(['id', 'name', 'type', 'institution', 'current_balance', 'is_active']);

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

        $recentTransactions = $user->transactions()
            ->with(['wallet:id,name', 'category:id,name,type'])
            ->latest('transaction_date')
            ->latest('id')
            ->limit(6)
            ->get();

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