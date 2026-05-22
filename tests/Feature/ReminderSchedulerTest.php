<?php

namespace Tests\Feature;

use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\BillReminder;
use App\Models\User;
use App\Models\WhatsappMessage;
use App\Services\Whatsapp\ReminderScheduler;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReminderSchedulerTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduler_creates_pending_reminders_and_sends_due_ones(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::create(2026, 6, 1),
        ]);

        $group = BillGroup::factory()->for($user)->create();
        $item = BillItem::factory()->for($group, 'billGroup')->create([
            'status' => 'unpaid',
            'amount' => 150000,
            'due_date' => '2026-06-05',
            'title' => 'Cicilan 1',
        ]);

        $scheduler = app(ReminderScheduler::class);

        $now = Carbon::create(2026, 5, 29, 9, 0);
        $stats = $scheduler->dispatch($now);

        $this->assertSame(4, $stats['queued']);
        $this->assertSame(1, $stats['sent']);

        $this->assertSame(1, BillReminder::where('status', 'sent')->count());
        $this->assertSame(3, BillReminder::where('status', 'pending')->count());

        $this->assertDatabaseHas('whatsapp_messages', [
            'user_id' => $user->id,
            'direction' => 'outbound',
            'status' => 'queued',
        ]);

        $secondRun = $scheduler->dispatch($now);
        $this->assertSame(0, $secondRun['queued']);
        $this->assertSame(0, $secondRun['sent']);
    }

    public function test_scheduler_skips_paid_items(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);
        $group = BillGroup::factory()->for($user)->create();
        $item = BillItem::factory()->for($group, 'billGroup')->create([
            'status' => 'paid',
            'due_date' => Carbon::now()->addDays(3)->toDateString(),
        ]);

        $stats = app(ReminderScheduler::class)->dispatch();

        $this->assertSame(0, $stats['queued']);
        $this->assertDatabaseCount('bill_reminders', 0);
    }

    public function test_scheduler_skips_users_without_verified_phone(): void
    {
        $user = User::factory()->create([
            'phone_verified_at' => null,
        ]);
        $group = BillGroup::factory()->for($user)->create();
        BillItem::factory()->for($group, 'billGroup')->create([
            'status' => 'unpaid',
            'due_date' => Carbon::now()->addDays(3)->toDateString(),
        ]);

        $stats = app(ReminderScheduler::class)->dispatch();

        $this->assertSame(0, $stats['queued']);
        $this->assertSame(0, $stats['sent']);
        $this->assertDatabaseCount('whatsapp_messages', 0);
    }

    public function test_artisan_command_runs(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);
        $group = BillGroup::factory()->for($user)->create();
        BillItem::factory()->for($group, 'billGroup')->create([
            'status' => 'unpaid',
            'due_date' => Carbon::now()->addDays(2)->toDateString(),
        ]);

        $this->artisan('whatsapp:reminders')->assertSuccessful();
    }
}