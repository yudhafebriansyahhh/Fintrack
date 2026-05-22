<?php

namespace Tests\Feature;

use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_summary_uses_real_data(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create([
            'initial_balance' => 1_000_000,
            'current_balance' => 1_000_000,
            'is_active' => true,
        ]);

        $income = Category::factory()->for($user)->income()->create();
        $expense = Category::factory()->for($user)->expense()->create();

        Transaction::factory()->for($user)->for($wallet)->for($income)->create([
            'type' => 'income',
            'amount' => 500000,
            'transaction_date' => now()->startOfMonth()->toDateString(),
        ]);

        Transaction::factory()->for($user)->for($wallet)->for($expense)->create([
            'type' => 'expense',
            'amount' => 200000,
            'transaction_date' => now()->toDateString(),
        ]);

        $billGroup = BillGroup::factory()->for($user)->create([
            'status' => 'active',
        ]);
        BillItem::factory()->for($billGroup, 'billGroup')->create([
            'status' => 'unpaid',
            'amount' => 750000,
            'due_date' => now()->addDay()->toDateString(),
        ]);
        BillItem::factory()->for($billGroup, 'billGroup')->create([
            'status' => 'unpaid',
            'amount' => 350000,
            'due_date' => now()->subDay()->toDateString(),
        ]);

        $response = $this->actingAs($user)->get(route('dashboard'));

        $response->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('summary.monthIncome', fn ($v) => (float) $v === 500000.0)
                ->where('summary.monthExpense', fn ($v) => (float) $v === 200000.0)
                ->where('summary.totalBalance', fn ($v) => (float) $v === 1000000.0)
                ->where('summary.activeBillCount', 2)
                ->where('summary.overdueBillCount', 1)
                ->has('chart', 6)
                ->has('recentTransactions', 2)
                ->has('upcomingBills', 1)
                ->has('overdueBills', 1)
            );
    }
}