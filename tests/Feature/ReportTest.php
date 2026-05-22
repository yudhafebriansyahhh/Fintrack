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

class ReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_report_summarizes_user_data(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create();
        $income = Category::factory()->for($user)->income()->create();
        $expense = Category::factory()->for($user)->expense()->create();

        Transaction::factory()->for($user)->for($wallet)->for($income)->create([
            'type' => 'income',
            'amount' => 1500000,
            'transaction_date' => now()->startOfMonth()->toDateString(),
        ]);

        Transaction::factory()->for($user)->for($wallet)->for($expense)->create([
            'type' => 'expense',
            'amount' => 400000,
            'transaction_date' => now()->toDateString(),
        ]);

        Transaction::factory()->for($user)->for($wallet)->for($expense)->create([
            'type' => 'expense',
            'amount' => 100000,
            'transaction_date' => now()->subMonth()->toDateString(),
        ]);

        $billGroup = BillGroup::factory()->for($user)->create();
        BillItem::factory()->for($billGroup, 'billGroup')->create([
            'status' => 'unpaid',
            'amount' => 250000,
            'due_date' => now()->subDay()->toDateString(),
        ]);
        BillItem::factory()->for($billGroup, 'billGroup')->create([
            'status' => 'paid',
            'amount' => 350000,
            'due_date' => now()->subDays(5)->toDateString(),
        ]);

        $response = $this->actingAs($user)->get(route('reports.index'));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('summary.totalIncome', fn ($value) => (float) $value === 1500000.0)
            ->where('summary.totalExpense', fn ($value) => (float) $value === 400000.0)
            ->where('summary.netBalance', fn ($value) => (float) $value === 1100000.0)
            ->where('summary.transactionCount', 2)
            ->where('bills.late.count', 1)
            ->where('bills.paid.count', 1)
        );
    }

    public function test_custom_period_filters_transactions(): void
    {
        $user = User::factory()->create();
        $wallet = Wallet::factory()->for($user)->create();
        $expense = Category::factory()->for($user)->expense()->create();

        Transaction::factory()->for($user)->for($wallet)->for($expense)->create([
            'type' => 'expense',
            'amount' => 100000,
            'transaction_date' => '2026-01-15',
        ]);
        Transaction::factory()->for($user)->for($wallet)->for($expense)->create([
            'type' => 'expense',
            'amount' => 200000,
            'transaction_date' => '2026-02-10',
        ]);

        $response = $this->actingAs($user)->get(route('reports.index', [
            'period' => 'custom',
            'from' => '2026-01-01',
            'to' => '2026-01-31',
        ]));

        $response->assertOk()->assertInertia(fn ($page) => $page
            ->component('Reports/Index')
            ->where('summary.totalExpense', fn ($value) => (float) $value === 100000.0)
            ->where('summary.transactionCount', 1)
        );
    }
}