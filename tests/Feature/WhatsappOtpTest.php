<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\WhatsappMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class WhatsappOtpTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.whatsapp.driver' => 'log']);
        Bus::fake();
    }

    public function test_user_can_request_otp_and_verify_phone(): void
    {
        $user = User::factory()->create([
            'phone' => '+6281234567890',
            'phone_verified_at' => null,
        ]);

        $this->actingAs($user)
            ->post(route('whatsapp.request-otp'), ['phone' => '+62 812 3456 7890'])
            ->assertRedirect();

        $user->refresh();
        $this->assertNotNull($user->phone_verification_code);
        $this->assertNotNull($user->phone_verification_expires_at);
        $this->assertNull($user->phone_verified_at);

        $this->assertDatabaseHas('whatsapp_messages', [
            'user_id' => $user->id,
            'direction' => 'outbound',
            'status' => 'queued',
        ]);

        $this->actingAs($user)
            ->post(route('whatsapp.verify'), ['code' => $user->phone_verification_code])
            ->assertRedirect();

        $user->refresh();
        $this->assertNotNull($user->phone_verified_at);
        $this->assertNull($user->phone_verification_code);
    }

    public function test_otp_rejects_invalid_or_expired_codes(): void
    {
        $user = User::factory()->create([
            'phone_verification_code' => '123456',
            'phone_verification_expires_at' => Carbon::now()->addMinutes(5),
        ]);

        $this->actingAs($user)
            ->from(route('whatsapp.index'))
            ->post(route('whatsapp.verify'), ['code' => '999999'])
            ->assertSessionHasErrors('code');

        $this->assertNull($user->fresh()->phone_verified_at);

        $user->forceFill([
            'phone_verification_expires_at' => Carbon::now()->subMinute(),
        ])->save();

        $this->actingAs($user)
            ->from(route('whatsapp.index'))
            ->post(route('whatsapp.verify'), ['code' => '123456'])
            ->assertSessionHasErrors('code');
    }

    public function test_unlink_clears_verification(): void
    {
        $user = User::factory()->create([
            'phone_verified_at' => Carbon::now(),
        ]);

        $this->actingAs($user)
            ->delete(route('whatsapp.unlink'))
            ->assertRedirect();

        $this->assertNull($user->fresh()->phone_verified_at);
    }

    public function test_index_lists_recent_messages(): void
    {
        $user = User::factory()->create();
        WhatsappMessage::create([
            'user_id' => $user->id,
            'phone' => '+6281234567890',
            'direction' => 'outbound',
            'message' => 'Halo dari FinTrack',
            'status' => 'queued',
        ]);

        $this->actingAs($user)
            ->get(route('whatsapp.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Whatsapp/Index')
                ->has('messages', 1)
                ->where('botPhone', config('services.whatsapp.bot_phone'))
            );
    }
}
