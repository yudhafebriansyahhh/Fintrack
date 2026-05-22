<?php

namespace Tests\Feature;

use App\Jobs\SendWhatsappMessageJob;
use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\User;
use App\Models\Wallet;
use App\Models\WhatsappMessage;
use App\Services\Whatsapp\Gateways\WhatsappGateway;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Mockery;
use Tests\TestCase;

class WhatsappGatewayTest extends TestCase
{
    use RefreshDatabase;

    public function test_otp_request_dispatches_send_job(): void
    {
        Bus::fake();

        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('whatsapp.request-otp'), ['phone' => '081234567890']);

        Bus::assertDispatchedAfterResponse(SendWhatsappMessageJob::class);
    }

    public function test_webhook_dispatches_send_job_for_reply(): void
    {
        config(['services.whatsapp.webhook_token' => null]);
        Bus::fake();

        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);
        Wallet::factory()->for($user)->create(['is_active' => true]);

        $this->postJson('/api/whatsapp/webhook', [
            'phone' => '081234567890',
            'message' => 'help',
            'provider_message_id' => 'gw-1',
        ])->assertOk();

        Bus::assertDispatchedAfterResponse(SendWhatsappMessageJob::class);
    }

    public function test_send_job_marks_message_sent_via_gateway(): void
    {
        $user = User::factory()->create([
            'phone' => '081234567890',
            'phone_verified_at' => Carbon::now(),
        ]);

        $message = WhatsappMessage::create([
            'user_id' => $user->id,
            'phone' => $user->phone,
            'direction' => 'outbound',
            'message' => 'Test',
            'status' => 'queued',
        ]);

        $gateway = Mockery::mock(WhatsappGateway::class);
        $gateway->shouldReceive('send')
            ->once()
            ->andReturn(['status' => 'sent', 'provider_message_id' => 'prov-99']);
        $this->app->instance(WhatsappGateway::class, $gateway);

        (new SendWhatsappMessageJob($message->id))->handle($gateway);

        $message->refresh();
        $this->assertSame('sent', $message->status);
        $this->assertSame('prov-99', $message->provider_message_id);
    }

    public function test_send_job_marks_failed_when_gateway_throws(): void
    {
        $user = User::factory()->create();

        $message = WhatsappMessage::create([
            'user_id' => $user->id,
            'phone' => $user->phone ?? '081234567890',
            'direction' => 'outbound',
            'message' => 'Test',
            'status' => 'queued',
        ]);

        $gateway = Mockery::mock(WhatsappGateway::class);
        $gateway->shouldReceive('send')->andThrow(new \RuntimeException('boom'));

        try {
            (new SendWhatsappMessageJob($message->id))->handle($gateway);
            $this->fail('Job should rethrow exception.');
        } catch (\RuntimeException) {
            // expected
        }

        $this->assertSame('failed', $message->fresh()->status);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }
}