<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Debt;
use App\Models\Wallet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DebtController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $request->user()->debts()->create($this->validated($request));

        return back()->with('success', 'Hutang berhasil ditambahkan.');
    }

    public function update(Request $request, Debt $debt): RedirectResponse
    {
        $this->authorize('update', $debt);

        $debt->update($this->validated($request));

        return back()->with('success', 'Hutang berhasil diperbarui.');
    }

    public function destroy(Request $request, Debt $debt): RedirectResponse
    {
        $this->authorize('delete', $debt);

        $debt->delete();

        return back()->with('success', 'Hutang berhasil dihapus.');
    }

    public function markPaid(Request $request, Debt $debt): RedirectResponse
    {
        $this->authorize('update', $debt);

        $data = $request->validate([
            'wallet_id' => ['required', 'integer'],
        ]);

        DB::transaction(function () use ($request, $debt, $data) {
            $wallet = Wallet::where('user_id', $request->user()->id)
                ->where('id', $data['wallet_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            $type = $debt->direction === 'lend' ? 'income' : 'expense';
            $category = Category::firstOrCreate([
                'user_id' => $request->user()->id,
                'type' => $type,
                'name' => $debt->direction === 'lend' ? 'Piutang' : 'Hutang',
            ]);

            $amount = (float) $debt->amount;
            $request->user()->transactions()->create([
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'type' => $type,
                'amount' => $amount,
                'transaction_date' => Carbon::now()->toDateString(),
                'description' => ($debt->direction === 'lend' ? 'Pelunasan piutang: ' : 'Pelunasan hutang: ') . $debt->name,
            ]);

            $wallet->forceFill([
                'current_balance' => (float) $wallet->current_balance + ($type === 'income' ? $amount : -$amount),
            ])->save();

            $debt->update([
                'wallet_id' => $wallet->id,
                'status' => 'paid',
                'paid_date' => Carbon::now()->toDateString(),
            ]);
        });

        return back()->with('success', 'Hutang ditandai lunas dan transaksi otomatis dicatat.');
    }

    public function markUnpaid(Request $request, Debt $debt): RedirectResponse
    {
        $this->authorize('update', $debt);

        $debt->update([
            'status' => 'unpaid',
            'paid_date' => null,
        ]);

        return back()->with('success', 'Status hutang dikembalikan ke belum lunas. Transaksi lama tidak dihapus otomatis.');
    }

    public function cancel(Request $request, Debt $debt): RedirectResponse
    {
        $this->authorize('update', $debt);

        $debt->update([
            'status' => 'cancelled',
        ]);

        return back()->with('success', 'Hutang dibatalkan.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:1000'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'direction' => ['required', Rule::in(['owe', 'lend'])],
            'due_date' => ['nullable', 'date'],
            'reminder_days_before' => ['nullable', 'integer', 'min:0', 'max:30'],
            'wallet_id' => ['nullable', 'integer'],
            'status' => ['required', Rule::in(['unpaid', 'paid', 'cancelled'])],
        ]);
    }
}
