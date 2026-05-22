<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WalletTransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_transfer_between_active_wallets(): void
    {
        $user = User::factory()->create();
        $from = Wallet::factory()->for($user)->create([
            'is_active' => true,
            'current_balance' => 1_000_000,
            'initial_balance' => 1_000_000,
        ]);
        $to = Wallet::factory()->for($user)->create([
            'is_active' => true,
            'current_balance' => 200_000,
            'initial_balance' => 200_000,
        ]);

        $this->actingAs($user)
            ->post(route('wallet-transfers.store'), [
                'from_wallet_id' => $from->id,
                'to_wallet_id' => $to->id,
                'amount' => 250000,
                'transfer_date' => now()->toDateString(),
                'description' => 'Top up DANA',
            ])
            ->assertRedirect();

        $this->assertSame('750000.00', $from->fresh()->current_balance);
        $this->assertSame('450000.00', $to->fresh()->current_balance);
        $this->assertDatabaseHas('wallet_transfers', [
            'user_id' => $user->id,
            'from_wallet_id' => $from->id,
            'to_wallet_id' => $to->id,
            'amount' => 250000,
        ]);
    }

    public function test_transfer_rejects_insufficient_balance(): void
    {
        $user = User::factory()->create();
        $from = Wallet::factory()->for($user)->create([
            'is_active' => true,
            'current_balance' => 50_000,
            'initial_balance' => 50_000,
        ]);
        $to = Wallet::factory()->for($user)->create([
            'is_active' => true,
            'current_balance' => 0,
            'initial_balance' => 0,
        ]);

        $this->actingAs($user)
            ->post(route('wallet-transfers.store'), [
                'from_wallet_id' => $from->id,
                'to_wallet_id' => $to->id,
                'amount' => 100000,
                'transfer_date' => now()->toDateString(),
            ])
            ->assertStatus(422);

        $this->assertSame('50000.00', $from->fresh()->current_balance);
        $this->assertSame('0.00', $to->fresh()->current_balance);
    }

    public function test_transfer_rejects_other_users_wallet(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $ownerWallet = Wallet::factory()->for($owner)->create(['is_active' => true]);
        $myWallet = Wallet::factory()->for($intruder)->create(['is_active' => true]);

        $this->actingAs($intruder)
            ->post(route('wallet-transfers.store'), [
                'from_wallet_id' => $ownerWallet->id,
                'to_wallet_id' => $myWallet->id,
                'amount' => 50000,
                'transfer_date' => now()->toDateString(),
            ])
            ->assertNotFound();
    }
}