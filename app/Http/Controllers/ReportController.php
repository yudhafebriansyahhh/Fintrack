<?php

namespace App\Http\Controllers;

use App\Models\BillItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
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
            'type' => ['nullable', Rule::in(['income', 'expense'])],
        ]);

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
            ->when($filters['type'] ?? null, fn ($q, $type) => $q->where('type', $type));

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

        $transactionDetail = (clone $transactionsQuery)
            ->with(['wallet:id,name', 'category:id,name'])
            ->orderBy('transaction_date')
            ->orderBy('id')
            ->get();

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

        return Inertia::render('Reports/Index', [
            'filters' => array_merge($filters, [
                'period' => $period,
                'from' => $startDate,
                'to' => $endDate,
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
                'transactionCount' => $transactionDetail->count(),
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
        ]);
    }
}