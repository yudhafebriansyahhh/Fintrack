<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WhatsappMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class WhatsappWebhookTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.whatsapp.webhook_token' => null]);
        config(['services.whatsapp.driver' => 'log']);
        Bus::fake();
    }

    public function test_webhook_records_pengeluaran_and_updates_balance(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);
        $wallet = Wallet::factory()->for($user)->create([
            'is_active' => true,
            'current_balance' => 1_000_000,
            'initial_balance' => 1_000_000,
        ]);

        $response = $this->postJson('/api/whatsapp/webhook', [
            'phone' => '+62 812 3456 7890',
            'message' => 'keluar 25000 makan siang',
            'provider_message_id' => 'msg-1',
        ]);

        $response->assertOk()->assertJson(['ok' => true]);
        $this->assertSame('975000.00', $wallet->fresh()->current_balance);
        $this->assertDatabaseHas('transactions', [
            'user_id' => $user->id,
            'wallet_id' => $wallet->id,
            'type' => 'expense',
            'amount' => 25000,
            'description' => 'siang',
        ]);
        $this->assertDatabaseHas('whatsapp_messages', [
            'user_id' => $user->id,
            'direction' => 'inbound',
            'provider_message_id' => 'msg-1',
        ]);
        $this->assertDatabaseHas('whatsapp_messages', [
            'user_id' => $user->id,
            'direction' => 'outbound',
            'status' => 'queued',
        ]);
    }

    public function test_duplicate_provider_message_id_does_not_double_record(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);
        Wallet::factory()->for($user)->create(['is_active' => true]);

        WhatsappMessage::create([
            'user_id' => $user->id,
            'phone' => '081234567890',
            'direction' => 'inbound',
            'message' => 'masuk 1500000 gaji',
            'status' => 'received',
            'provider_message_id' => 'dup-1',
        ]);

        $this->postJson('/api/whatsapp/webhook', [
            'phone' => '081234567890',
            'message' => 'masuk 1500000 gaji',
            'provider_message_id' => 'dup-1',
        ])->assertOk()->assertJson(['duplicate' => true]);

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_unknown_phone_replies_without_user(): void
    {
        $this->postJson('/api/whatsapp/webhook', [
            'phone' => '08111111111',
            'message' => 'help',
        ])
            ->assertOk()
            ->assertJsonPath('ok', false);
    }

    public function test_help_command_returns_keyword_list(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);
        Wallet::factory()->for($user)->create(['is_active' => true]);

        $response = $this->postJson('/api/whatsapp/webhook', [
            'phone' => '081234567890',
            'message' => 'help',
        ]);

        $response->assertOk();
        $this->assertStringContainsString('masuk', $response->json('reply'));
        $this->assertStringContainsString('saldo', $response->json('reply'));
    }

    public function test_webhook_rejects_invalid_signature(): void
    {
        config(['services.whatsapp.webhook_token' => 'secret-123']);

        $this->postJson('/api/whatsapp/webhook', [
            'phone' => '081234567890',
            'message' => 'help',
        ], ['X-Webhook-Token' => 'wrong'])
            ->assertStatus(401);
    }
}