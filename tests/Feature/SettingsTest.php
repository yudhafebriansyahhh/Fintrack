<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_settings_page_is_rendered_for_authenticated_user(): void
    {
        $user = User::factory()->create([
            'phone' => '+628123456789',
            'phone_verified_at' => now(),
        ]);

        Wallet::factory()->for($user)->create(['is_active' => true]);
        Category::factory()->for($user)->expense()->create();

        $this->actingAs($user)
            ->get(route('settings.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Settings/Index')
                ->where('stats.wallets', 1)
                ->where('stats.activeWallets', 1)
                ->where('stats.categories', 1)
                ->where('whatsapp.phone', '+628123456789')
                ->where('preferences.currency', 'IDR')
            );
    }
}
