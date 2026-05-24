<?php

namespace App\Http\Controllers;

use App\Models\Wallet;
use App\Models\WalletProvider;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class WalletController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Wallets/Index', [
            'wallets' => $user
                ->wallets()
                ->with('provider:id,name,type,logo')
                ->withCount('transactions')
                ->latest()
                ->get(),
            'walletProviders' => WalletProvider::query()
                ->where('status', 'active')
                ->where(function ($query) use ($user) {
                    $query->whereNull('user_id')
                        ->orWhere('user_id', $user->id);
                })
                ->orderBy('type')
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'logo', 'is_default']),
            'totalBalance' => (float) $user
                ->wallets()
                ->where('is_active', true)
                ->sum('current_balance'),
            'transfers' => $user
                ->walletTransfers()
                ->with(['fromWallet:id,name', 'toWallet:id,name'])
                ->latest('transfer_date')
                ->latest('id')
                ->limit(10)
                ->get(),
        ]);
    }

    public function showByQuery(Request $request): Response
    {
        $data = $request->validate([
            'id' => ['required', 'integer'],
        ]);

        $wallet = Wallet::query()->findOrFail($data['id']);

        return $this->show($request, $wallet);
    }

    public function show(Request $request, Wallet $wallet): Response
    {
        $this->authorize('view', $wallet);

        $user = $request->user();
        $period = $this->periodData($request);
        $from = $period['from'];
        $to = $period['to'];

        $perPageOptions = [10, 25, 50, 100];
        $perPage = (int) $request->query('per_page', 10);
        if (! \in_array($perPage, $perPageOptions, true)) {
            $perPage = 10;
        }

        $periodTransactions = $wallet->transactions()
            ->when($from, fn ($query) => $query->whereDate('transaction_date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('transaction_date', '<=', $to));

        $summaryRows = (clone $periodTransactions)
            ->select('type', DB::raw('sum(amount) as total'), DB::raw('count(*) as total_count'))
            ->groupBy('type')
            ->get()
            ->keyBy('type');

        $income = (float) ($summaryRows->get('income')->total ?? 0);
        $expense = (float) ($summaryRows->get('expense')->total ?? 0);
        $transactionCount = (int) $summaryRows->sum('total_count');

        $transactions = $wallet
            ->transactions()
            ->with(['category:id,name,type', 'wallet:id,name,type'])
            ->when($from, fn ($query) => $query->whereDate('transaction_date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('transaction_date', '<=', $to))
            ->latest('transaction_date')
            ->latest('id')
            ->paginate($perPage)
            ->withQueryString();

        $transfers = $user->walletTransfers()
            ->with(['fromWallet:id,name', 'toWallet:id,name'])
            ->where(function ($query) use ($wallet) {
                $query->where('from_wallet_id', $wallet->id)
                    ->orWhere('to_wallet_id', $wallet->id);
            })
            ->when($from, fn ($query) => $query->whereDate('transfer_date', '>=', $from))
            ->when($to, fn ($query) => $query->whereDate('transfer_date', '<=', $to))
            ->latest('transfer_date')
            ->latest('id')
            ->get();

        $activities = $transactions->getCollection()
            ->map(fn ($transaction) => [
                'kind' => 'transaction',
                'id' => 'transaction-'.$transaction->id,
                'record_id' => $transaction->id,
                'type' => $transaction->type,
                'transaction_date' => $transaction->transaction_date,
                'amount' => (float) $transaction->amount,
                'description' => $transaction->description,
                'category' => $transaction->category,
                'wallet' => $transaction->wallet,
                'created_at' => $transaction->created_at,
                'updated_at' => $transaction->updated_at,
            ])
            ->concat($transfers->map(fn ($transfer) => [
                'kind' => 'transfer',
                'id' => 'transfer-'.$transfer->id,
                'record_id' => $transfer->id,
                'type' => 'transfer',
                'direction' => (int) $transfer->from_wallet_id === (int) $wallet->id ? 'out' : 'in',
                'transaction_date' => $transfer->transfer_date,
                'amount' => (float) $transfer->amount,
                'description' => $transfer->description,
                'from_wallet' => $transfer->fromWallet,
                'to_wallet' => $transfer->toWallet,
                'created_at' => $transfer->created_at,
                'updated_at' => $transfer->updated_at,
            ]))
            ->sortByDesc(fn ($activity) => $activity['transaction_date'].' '.$activity['record_id'])
            ->values();

        return Inertia::render('Wallets/Show', [
            'wallet' => $wallet->load('provider:id,name,type,logo')->loadCount('transactions'),
            'transactions' => $transactions,
            'activities' => $activities,
            'wallets' => $user->wallets()->orderBy('name')->get(['id', 'name', 'type', 'is_active']),
            'walletProviders' => WalletProvider::query()
                ->where('status', 'active')
                ->where(function ($query) use ($user) {
                    $query->whereNull('user_id')
                        ->orWhere('user_id', $user->id);
                })
                ->orderBy('type')
                ->orderBy('name')
                ->get(['id', 'name', 'type', 'logo', 'is_default']),
            'categories' => $user->categories()->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type']),
            'summary' => [
                'income' => $income,
                'expense' => $expense,
                'net' => $income - $expense,
                'transaction_count' => $transactionCount,
                'current_balance' => (float) $wallet->current_balance,
            ],
            'period' => $period,
            'chart' => $this->walletChart($wallet, $period),
            'perPage' => $perPage,
            'perPageOptions' => $perPageOptions,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);
        $data = $this->normalizeWalletData($request, $data);
        $data = $this->storeCustomLogo($request, $data);
        $data['current_balance'] = $data['initial_balance'];

        DB::transaction(function () use ($request, $data) {
            if ($data['is_primary']) {
                $request->user()->wallets()->update(['is_primary' => false]);
            }

            $request->user()->wallets()->create($data);
        });

        return back()->with('success', 'Dompet berhasil ditambahkan.');
    }

    public function update(Request $request, Wallet $wallet): RedirectResponse
    {
        $this->authorize('update', $wallet);

        $data = $this->validated($request);
        $data = $this->normalizeWalletData($request, $data);
        $data = $this->storeCustomLogo($request, $data, $wallet);
        unset($data['initial_balance']);

        DB::transaction(function () use ($request, $wallet, $data) {
            if ($data['is_primary']) {
                $request->user()->wallets()
                    ->whereKeyNot($wallet->id)
                    ->update(['is_primary' => false]);
            }

            $wallet->update($data);
        });

        return back()->with('success', 'Dompet berhasil diperbarui.');
    }

    public function updateBalance(Request $request, Wallet $wallet): RedirectResponse
    {
        $this->authorize('update', $wallet);

        $data = $request->validate([
            'current_balance' => ['required', 'numeric'],
        ]);

        $wallet->update([
            'current_balance' => $data['current_balance'],
        ]);

        return back()->with('success', 'Saldo dompet berhasil diperbarui.');
    }

    public function destroy(Request $request, Wallet $wallet): RedirectResponse
    {
        $this->authorize('delete', $wallet);

        if ($wallet->transactions()->exists() || $wallet->outgoingTransfers()->exists() || $wallet->incomingTransfers()->exists()) {
            $wallet->update(['is_active' => false]);

            return back()->with('success', 'Dompet memiliki riwayat, jadi dinonaktifkan.');
        }

        $wallet->delete();

        return redirect()->route('wallets.index')->with('success', 'Dompet berhasil dihapus.');
    }

    private function periodData(Request $request): array
    {
        $period = $request->query('period', 'monthly');
        $period = in_array($period, ['weekly', 'monthly', 'yearly', 'all'], true) ? $period : 'monthly';
        $anchor = Carbon::parse($request->query('anchor', now()->toDateString()))->startOfDay();

        $from = null;
        $to = null;
        $label = 'Semua Waktu';
        $previousAnchor = $anchor->copy();
        $nextAnchor = $anchor->copy();

        if ($period === 'weekly') {
            $from = $anchor->copy()->startOfWeek();
            $to = $anchor->copy()->endOfWeek();
            $label = $from->translatedFormat('j M').' - '.$to->translatedFormat('j M Y');
            $previousAnchor = $anchor->copy()->subWeek();
            $nextAnchor = $anchor->copy()->addWeek();
        }

        if ($period === 'monthly') {
            $from = $anchor->copy()->startOfMonth();
            $to = $anchor->copy()->endOfMonth();
            $label = $from->translatedFormat('j M').' - '.$to->translatedFormat('j M Y');
            $previousAnchor = $anchor->copy()->subMonthNoOverflow();
            $nextAnchor = $anchor->copy()->addMonthNoOverflow();
        }

        if ($period === 'yearly') {
            $from = $anchor->copy()->startOfYear();
            $to = $anchor->copy()->endOfYear();
            $label = $anchor->translatedFormat('Y');
            $previousAnchor = $anchor->copy()->subYear();
            $nextAnchor = $anchor->copy()->addYear();
        }

        return [
            'key' => $period,
            'anchor' => $anchor->toDateString(),
            'label' => $label,
            'from' => $from?->toDateString(),
            'to' => $to?->toDateString(),
            'previous' => ['period' => $period, 'anchor' => $previousAnchor->toDateString()],
            'next' => ['period' => $period, 'anchor' => $nextAnchor->toDateString()],
        ];
    }

    private function walletChart(Wallet $wallet, array $period): array
    {
        $rows = $wallet->transactions()
            ->when($period['from'], fn ($query) => $query->whereDate('transaction_date', '>=', $period['from']))
            ->when($period['to'], fn ($query) => $query->whereDate('transaction_date', '<=', $period['to']))
            ->orderBy('transaction_date')
            ->get(['type', 'amount', 'transaction_date']);

        if ($period['key'] === 'yearly') {
            $start = Carbon::parse($period['from'])->startOfYear();

            return collect(range(0, 11))->map(function ($offset) use ($rows, $start) {
                $date = $start->copy()->addMonths($offset);
                $net = $rows
                    ->filter(fn ($row) => Carbon::parse($row->transaction_date)->isSameMonth($date))
                    ->sum(fn ($row) => $row->type === 'income' ? (float) $row->amount : -(float) $row->amount);

                return ['label' => $date->translatedFormat('M'), 'value' => $net];
            })->all();
        }

        if ($period['key'] === 'all') {
            $months = $rows
                ->groupBy(fn ($row) => Carbon::parse($row->transaction_date)->format('Y-m'))
                ->map(function ($items, $month) {
                    return [
                        'label' => Carbon::parse($month.'-01')->translatedFormat('M Y'),
                        'value' => $items->sum(fn ($row) => $row->type === 'income' ? (float) $row->amount : -(float) $row->amount),
                    ];
                })
                ->values();

            return $months->isEmpty() ? [['label' => 'Mulai', 'value' => 0]] : $months->all();
        }

        $start = Carbon::parse($period['from']);
        $end = Carbon::parse($period['to']);

        return collect(range(0, $start->diffInDays($end)))->map(function ($offset) use ($rows, $start) {
            $date = $start->copy()->addDays($offset);
            $net = $rows
                ->filter(fn ($row) => Carbon::parse($row->transaction_date)->isSameDay($date))
                ->sum(fn ($row) => $row->type === 'income' ? (float) $row->amount : -(float) $row->amount);

            return ['label' => $date->translatedFormat('j M'), 'value' => $net];
        })->all();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'type' => ['required', Rule::in(['bank', 'e-wallet', 'cash', 'other'])],
            'wallet_provider_id' => ['nullable', 'integer'],
            'institution' => ['nullable', 'string', 'max:100'],
            'account_number' => ['nullable', 'string', 'max:100'],
            'account_name' => ['nullable', 'string', 'max:100'],
            'phone_number' => ['nullable', 'string', 'max:30'],
            'custom_logo' => ['nullable', 'image', 'mimes:png,jpg,jpeg,webp', 'max:1024'],
            'initial_balance' => ['required', 'numeric', 'min:0'],
            'is_primary' => ['required', 'boolean'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    private function normalizeWalletData(Request $request, array $data): array
    {
        if (! in_array($data['type'], ['bank', 'e-wallet'], true)) {
            $data['wallet_provider_id'] = null;
        }

        if ($data['wallet_provider_id']) {
            $provider = WalletProvider::query()
                ->whereKey($data['wallet_provider_id'])
                ->where('type', $data['type'])
                ->where('status', 'active')
                ->where(function ($query) use ($request) {
                    $query->whereNull('user_id')
                        ->orWhere('user_id', $request->user()->id);
                })
                ->firstOrFail();

            $data['institution'] = $provider->name;
        }

        if ($data['type'] === 'cash') {
            $data['wallet_provider_id'] = null;
            $data['institution'] = null;
            $data['account_number'] = null;
            $data['account_name'] = null;
            $data['phone_number'] = null;
            $data['custom_logo'] = null;
        }

        if ($data['type'] === 'bank') {
            $data['phone_number'] = null;
            $data['custom_logo'] = null;
        }

        if ($data['type'] === 'e-wallet') {
            $data['account_number'] = null;
            $data['account_name'] = null;
            $data['custom_logo'] = null;
        }

        return $data;
    }

    private function storeCustomLogo(Request $request, array $data, ?Wallet $wallet = null): array
    {
        if ($data['type'] !== 'other') {
            if ($wallet?->custom_logo) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $wallet->custom_logo));
            }

            return $data;
        }

        if (! $request->hasFile('custom_logo')) {
            unset($data['custom_logo']);

            return $data;
        }

        if ($wallet?->custom_logo) {
            Storage::disk('public')->delete(str_replace('/storage/', '', $wallet->custom_logo));
        }

        $path = $request->file('custom_logo')->store('wallet-logos', 'public');
        $data['custom_logo'] = '/storage/'.$path;

        return $data;
    }

}
