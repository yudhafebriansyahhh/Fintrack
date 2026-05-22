<?php

namespace App\Http\Controllers;

use App\Models\Wallet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletTransferController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'from_wallet_id' => ['required', 'integer', 'different:to_wallet_id'],
            'to_wallet_id' => ['required', 'integer', 'different:from_wallet_id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'transfer_date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $user = $request->user();

        DB::transaction(function () use ($user, $data) {
            $from = $user->wallets()
                ->where('id', $data['from_wallet_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            $to = $user->wallets()
                ->where('id', $data['to_wallet_id'])
                ->where('is_active', true)
                ->lockForUpdate()
                ->firstOrFail();

            abort_if((float) $from->current_balance < (float) $data['amount'], 422, 'Saldo dompet asal tidak cukup.');

            $from->forceFill([
                'current_balance' => (float) $from->current_balance - (float) $data['amount'],
            ])->save();

            $to->forceFill([
                'current_balance' => (float) $to->current_balance + (float) $data['amount'],
            ])->save();

            $user->walletTransfers()->create($data);
        });

        return back()->with('success', 'Transfer berhasil dicatat.');
    }
}