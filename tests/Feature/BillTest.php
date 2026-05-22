<?php

namespace Tests\Feature;

use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_bill_group(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('bills.store'), [
                'name' => 'SPayLater',
                'description' => 'Pembelian laptop',
                'total_amount' => 450000,
                'reminder_days_before' => 3,
                'status' => 'active',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('bill_groups', [
            'user_id' => $user->id,
            'name' => 'SPayLater',
        ]);
    }

    public function test_user_can_generate_installments(): void
    {
        $user = User::factory()->create();
        $group = BillGroup::factory()->for($user)->create();

        $this->actingAs($user)
            ->post(route('bills.generate', $group), [
                'installments' => 3,
                'amount' => 450000,
                'start_date' => '2026-06-05',
                'interval' => 'monthly',
                'title_prefix' => 'Cicilan',
            ])
            ->assertRedirect();

        $this->assertDatabaseCount('bill_items', 3);
        $this->assertDatabaseHas('bill_items', [
            'bill_group_id' => $group->id,
            'title' => 'Cicilan 1',
            'due_date' => '2026-06-05 00:00:00',
        ]);
        $this->assertDatabaseHas('bill_items', [
            'bill_group_id' => $group->id,
            'title' => 'Cicilan 3',
            'due_date' => '2026-08-05 00:00:00',
        ]);

        $this->assertSame('450000.00', $group->fresh()->total_amount);
    }

    public function test_marking_item_paid_completes_group_when_all_paid(): void
    {
        $user = User::factory()->create();
        $group = BillGroup::factory()->for($user)->create(['status' => 'active']);
        $item = BillItem::factory()->for($group, 'billGroup')->create([
            'status' => 'unpaid',
        ]);

        $this->actingAs($user)
            ->patch(route('bill-items.paid', $item))
            ->assertRedirect();

        $this->assertSame('paid', $item->fresh()->status);
        $this->assertNotNull($item->fresh()->paid_date);
        $this->assertSame('completed', $group->fresh()->status);
    }

    public function test_user_cannot_modify_other_users_bill_item(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $group = BillGroup::factory()->for($owner)->create();
        $item = BillItem::factory()->for($group, 'billGroup')->create();

        $this->actingAs($intruder)
            ->patch(route('bill-items.paid', $item))
            ->assertNotFound();
    }

    public function test_destroying_group_removes_items(): void
    {
        $user = User::factory()->create();
        $group = BillGroup::factory()->for($user)->create();
        BillItem::factory()->for($group, 'billGroup')->count(3)->create();

        $this->actingAs($user)
            ->delete(route('bills.destroy', $group))
            ->assertRedirect();

        $this->assertDatabaseCount('bill_groups', 0);
        $this->assertDatabaseCount('bill_items', 0);
    }
}