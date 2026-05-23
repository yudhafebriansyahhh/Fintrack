<?php

namespace App\Http\Controllers;

use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\Wallet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class BillItemController extends Controller
{
    public function store(Request $request, BillGroup $billGroup): RedirectResponse
    {
        $this->authorize('update', $billGroup);

        $billGroup->items()->create($this->validated($request));

        $this->refreshGroupStatus($billGroup);

        return back()->with('success', 'Rincian tagihan berhasil ditambahkan.');
    }

    public function update(Request $request, BillItem $billItem): RedirectResponse
    {
        $this->authorize('update', $billItem);

        $data = $this->validated($request);

        if ($data['status'] === 'paid' && empty($data['paid_date'])) {
            $data['paid_date'] = Carbon::now()->toDateString();
        }

        if ($data['status'] !== 'paid') {
            $data['paid_date'] = null;
        }

        $billItem->update($data);

        $this->refreshGroupStatus($billItem->billGroup);

        return back()->with('success', 'Rincian tagihan berhasil diperbarui.');
    }

    public function destroy(Request $request, BillItem $billItem): RedirectResponse
    {
        $this->authorize('delete', $billItem);

        $group = $billItem->billGroup;
        $billItem->delete();

        $this->refreshGroupStatus($group);

        return back()->with('success', 'Rincian tagihan berhasil dihapus.');
    }

    public function markPaid(Request $request, BillItem $billItem): RedirectResponse
    {
        $this->authorize('update', $billItem);

        $data = $request->validate([
            'wallet_id' => ['required', 'integer'],
        ]);

        DB::transaction(function () use ($request, $billItem, $data) {
            $wallet = Wallet::where('user_id', $request->user()->id)
                ->where('id', $data['wallet_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            if ($billItem->amount > $wallet->current_balance) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'wallet_id' => 'Nominal tagihan melebihi saldo dompet saat ini (Tersedia: ' . number_format($wallet->current_balance, 0, ',', '.') . ').',
                ]);
            }

            $category = Category::firstOrCreate(
                [
                    'user_id' => $request->user()->id,
                    'type' => 'expense',
                    'name' => 'Tagihan',
                ],
                [
                    'is_default' => false,
                    'is_active' => true,
                ],
            );

            $amount = (float) $billItem->amount;
            $transaction = $request->user()->transactions()->create([
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'type' => 'expense',
                'amount' => $amount,
                'transaction_date' => Carbon::now()->toDateString(),
                'description' => 'Pembayaran tagihan: ' . $billItem->title,
            ]);

            $wallet->forceFill([
                'current_balance' => (float) $wallet->current_balance - $amount,
            ])->save();

            $billItem->update([
                'transaction_id' => $transaction->id,
                'status' => 'paid',
                'paid_date' => Carbon::now()->toDateString(),
            ]);
        });

        $this->refreshGroupStatus($billItem->billGroup);

        return back()->with('success', 'Rincian tagihan ditandai lunas dan transaksi dicatat.');
    }

    public function markUnpaid(Request $request, BillItem $billItem): RedirectResponse
    {
        $this->authorize('update', $billItem);

        DB::transaction(function () use ($billItem) {
            if ($billItem->transaction_id) {
                $transaction = Transaction::find($billItem->transaction_id);
                if ($transaction) {
                    $wallet = $transaction->wallet()->lockForUpdate()->first();
                    if ($wallet) {
                        $wallet->forceFill([
                            'current_balance' => (float) $wallet->current_balance + (float) $transaction->amount,
                        ])->save();
                    }
                    $transaction->delete();
                }
            }

            $billItem->update([
                'status' => 'unpaid',
                'paid_date' => null,
                'transaction_id' => null,
            ]);
        });

        $this->refreshGroupStatus($billItem->billGroup);

        return back()->with('success', 'Rincian tagihan ditandai belum lunas. Transaksi dibatalkan.');
    }

    public function cancel(Request $request, BillItem $billItem): RedirectResponse
    {
        $this->authorize('update', $billItem);

        DB::transaction(function () use ($billItem) {
            if ($billItem->transaction_id) {
                $transaction = Transaction::find($billItem->transaction_id);
                if ($transaction) {
                    $wallet = $transaction->wallet()->lockForUpdate()->first();
                    if ($wallet) {
                        $wallet->forceFill([
                            'current_balance' => (float) $wallet->current_balance + (float) $transaction->amount,
                        ])->save();
                    }
                    $transaction->delete();
                }
            }

            $billItem->update([
                'status' => 'cancelled',
                'paid_date' => null,
                'transaction_id' => null,
            ]);
        });

        $this->refreshGroupStatus($billItem->billGroup);

        return back()->with('success', 'Rincian tagihan dibatalkan.');
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'due_date' => ['required', 'date'],
            'paid_date' => ['nullable', 'date'],
            'status' => ['required', Rule::in(['unpaid', 'paid', 'late', 'cancelled'])],
            'notes' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    private function refreshGroupStatus(BillGroup $billGroup): void
    {
        $billGroup->loadCount([
            'items',
            'items as outstanding_count' => fn ($q) => $q->where('status', 'unpaid'),
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
