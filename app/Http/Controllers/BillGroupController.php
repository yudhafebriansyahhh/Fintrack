<?php

namespace App\Http\Controllers;

use App\Models\BillGroup;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class BillGroupController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $filters = $request->validate([
            'status' => ['nullable', Rule::in(['active', 'completed', 'cancelled'])],
            'due' => ['nullable', Rule::in(['upcoming', 'late'])],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $groups = $user->billGroups()
            ->withCount([
                'items',
                'items as paid_items_count' => fn ($q) => $q->where('status', 'paid'),
                'items as unpaid_items_count' => fn ($q) => $q->where('status', 'unpaid'),
                'items as late_items_count' => fn ($q) => $q->where('status', 'unpaid')->whereDate('due_date', '<', now()->toDateString()),
            ])
            ->withSum(['items as total_items_amount'], 'amount')
            ->withSum(['items as paid_items_amount' => fn ($q) => $q->where('status', 'paid')], 'amount')
            ->when($filters['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->when($filters['search'] ?? null, fn ($q, $search) => $q->where('name', 'like', "%{$search}%"))
            ->when($filters['due'] ?? null, function ($q, $due) {
                if ($due === 'late') {
                    $q->whereHas('items', fn ($inner) => $inner->where('status', 'unpaid')->whereDate('due_date', '<', now()->toDateString()));
                } elseif ($due === 'upcoming') {
                    $q->whereHas('items', fn ($inner) => $inner->where('status', 'unpaid')->whereDate('due_date', '>=', now()->toDateString()));
                }
            })
            ->with(['items' => fn ($q) => $q->orderBy('due_date')])
            ->latest()
            ->get();

        $groups->each(function (BillGroup $group) {
            $today = Carbon::now()->toDateString();
            $group->items->each(function ($item) use ($today) {
                $item->is_late = $item->status === 'unpaid' && $item->due_date && $item->due_date->lt($today);
            });
        });

        $debts = $user->debts()
            ->with(['wallet:id,name,is_active'])
            ->orderByRaw("CASE WHEN status = 'unpaid' THEN 0 WHEN status = 'paid' THEN 1 ELSE 2 END")
            ->orderBy('due_date')
            ->latest('id')
            ->get();

        $today = Carbon::now()->toDateString();
        $debts->each(function ($debt) use ($today) {
            $debt->is_late = $debt->status === 'unpaid' && $debt->due_date && $debt->due_date->lt($today);
        });

        return Inertia::render('Bills/Index', [
            'groups' => $groups,
            'debts' => $debts,
            'wallets' => $user->wallets()->with('provider:id,logo')->orderBy('name')->get(['id', 'name', 'type', 'is_active', 'wallet_provider_id', 'custom_logo', 'current_balance']),
            'summary' => [
                'totalActive' => $user->billGroups()->where('status', 'active')->count(),
                'totalCompleted' => $user->billGroups()->where('status', 'completed')->count(),
                'debtsActive' => $user->debts()->where('direction', 'owe')->where('status', 'unpaid')->count(),
                'lendsActive' => $user->debts()->where('direction', 'lend')->where('status', 'unpaid')->count(),
                'debtsLate' => $user->debts()
                    ->where('status', 'unpaid')
                    ->whereNotNull('due_date')
                    ->whereDate('due_date', '<', $today)
                    ->count(),
            ],
            'filters' => $filters,
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->user()->billGroups()->create($this->validated($request));

        return back()->with('success', 'Grup tagihan berhasil ditambahkan.');
    }

    public function update(Request $request, BillGroup $billGroup): RedirectResponse
    {
        $this->authorize('update', $billGroup);

        $billGroup->update($this->validated($request));

        $this->syncStatus($billGroup);

        return back()->with('success', 'Grup tagihan berhasil diperbarui.');
    }

    public function destroy(Request $request, BillGroup $billGroup): RedirectResponse
    {
        $this->authorize('delete', $billGroup);

        DB::transaction(function () use ($billGroup) {
            $billGroup->items()->delete();
            $billGroup->delete();
        });

        return back()->with('success', 'Grup tagihan berhasil dihapus.');
    }

    public function generateItems(Request $request, BillGroup $billGroup): RedirectResponse
    {
        $this->authorize('update', $billGroup);

        $data = $request->validate([
            'installments' => ['required', 'integer', 'min:1', 'max:60'],
            'amount' => ['required', 'numeric', 'min:1'],
            'start_date' => ['required', 'date'],
            'interval' => ['required', Rule::in(['weekly', 'monthly'])],
            'title_prefix' => ['nullable', 'string', 'max:50'],
        ]);

        $count = (int) $data['installments'];
        $perAmount = round(((float) $data['amount']) / $count, 2);
        $remainder = round(((float) $data['amount']) - ($perAmount * $count), 2);

        DB::transaction(function () use ($billGroup, $data, $count, $perAmount, $remainder) {
            $start = Carbon::parse($data['start_date']);
            for ($i = 0; $i < $count; $i++) {
                $dueDate = match ($data['interval']) {
                    'weekly' => $start->copy()->addWeeks($i),
                    'monthly' => $start->copy()->addMonthsNoOverflow($i),
                };

                $amount = $i === $count - 1 ? $perAmount + $remainder : $perAmount;

                $billGroup->items()->create([
                    'title' => sprintf('%s %d', $data['title_prefix'] ?? 'Cicilan', $i + 1),
                    'amount' => $amount,
                    'due_date' => $dueDate->toDateString(),
                    'status' => 'unpaid',
                ]);
            }

            $billGroup->update([
                'total_amount' => (float) $data['amount'],
                'status' => 'active',
            ]);
        });

        return back()->with('success', 'Jadwal cicilan berhasil dibuat.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'reminder_days_before' => ['required', 'integer', 'min:0', 'max:30'],
            'status' => ['required', Rule::in(['active', 'completed', 'cancelled'])],
        ]);
    }

    private function syncStatus(BillGroup $billGroup): void
    {
        $billGroup->loadCount([
            'items',
            'items as outstanding_count' => fn ($q) => $q->whereIn('status', ['unpaid']),
        ]);

        if ($billGroup->items_count > 0 && $billGroup->outstanding_count === 0 && $billGroup->status !== 'cancelled') {
            $billGroup->update(['status' => 'completed']);
        }
    }
}
