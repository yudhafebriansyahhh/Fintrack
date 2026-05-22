<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_list_transactions_with_filters(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create();
        $income = Category::factory()->for($user)->income()->create();
        $expense = Category::factory()->for($user)->expense()->create();

        Transaction::factory()
            ->for($user)
            ->for($wallet)
            ->for($income)
            ->create(['type' => 'income', 'amount' => 200000]);

        Transaction::factory()
            ->for($user)
            ->for($wallet)
            ->for($expense)
            ->create(['type' => 'expense', 'amount' => 50000]);

        $this->actingAs($user)
            ->get(route('transactions.index', ['type' => 'income']))
            ->assertOk();
    }

    public function test_storing_transaction_adjusts_wallet_balance(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create([
            'initial_balance' => 1_000_000,
            'current_balance' => 1_000_000,
        ]);
        $expense = Category::factory()->for($user)->expense()->create();

        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'type' => 'expense',
                'wallet_id' => $wallet->id,
                'category_id' => $expense->id,
                'amount' => 250000,
                'transaction_date' => now()->toDateString(),
                'description' => 'Belanja',
            ])
            ->assertRedirect();

        $this->assertSame('750000.00', $wallet->fresh()->current_balance);

        $income = Category::factory()->for($user)->income()->create();

        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'type' => 'income',
                'wallet_id' => $wallet->id,
                'category_id' => $income->id,
                'amount' => 500000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertRedirect();

        $this->assertSame('1250000.00', $wallet->fresh()->current_balance);
    }

    public function test_updating_transaction_recomputes_wallet_balance(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create([
            'initial_balance' => 500_000,
            'current_balance' => 500_000,
        ]);
        $category = Category::factory()->for($user)->expense()->create();

        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'type' => 'expense',
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'amount' => 100000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertRedirect();

        $transaction = Transaction::sole();

        $this->assertSame('400000.00', $wallet->fresh()->current_balance);

        $this->actingAs($user)
            ->patch(route('transactions.update', $transaction), [
                'type' => 'expense',
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'amount' => 150000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertRedirect();

        $this->assertSame('350000.00', $wallet->fresh()->current_balance);
    }

    public function test_deleting_transaction_restores_wallet_balance(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create([
            'initial_balance' => 200_000,
            'current_balance' => 200_000,
        ]);
        $category = Category::factory()->for($user)->expense()->create();

        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'type' => 'expense',
                'wallet_id' => $wallet->id,
                'category_id' => $category->id,
                'amount' => 75000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertRedirect();

        $transaction = Transaction::sole();
        $this->assertSame('125000.00', $wallet->fresh()->current_balance);

        $this->actingAs($user)
            ->delete(route('transactions.destroy', $transaction))
            ->assertRedirect();

        $this->assertSame('200000.00', $wallet->fresh()->current_balance);
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_user_cannot_modify_other_users_transactions(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $wallet = Wallet::factory()->for($owner)->create();
        $category = Category::factory()->for($owner)->expense()->create();
        $transaction = Transaction::factory()
            ->for($owner)
            ->for($wallet)
            ->for($category)
            ->create(['type' => 'expense', 'amount' => 100000]);

        $this->actingAs($intruder)
            ->delete(route('transactions.destroy', $transaction))
            ->assertNotFound();
    }

    public function test_category_type_must_match_transaction_type(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create();
        $income = Category::factory()->for($user)->income()->create();

        $this->actingAs($user)
            ->post(route('transactions.store'), [
                'type' => 'expense',
                'wallet_id' => $wallet->id,
                'category_id' => $income->id,
                'amount' => 50000,
                'transaction_date' => now()->toDateString(),
            ])
            ->assertStatus(422);
    }
}