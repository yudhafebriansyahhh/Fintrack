<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Tests\TestCase;

class AuthorizationPolicyTest extends TestCase
{
    use RefreshDatabase;

    public function test_wallet_policy_allows_owner_and_hides_other_users_wallet(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $wallet = Wallet::factory()->for($owner)->create();

        $this->assertTrue(Gate::forUser($owner)->allows('update', $wallet));
        $this->assertTrue(Gate::forUser($intruder)->denies('update', $wallet));

        $this->actingAs($intruder)
            ->patch(route('wallets.update', $wallet), [
                'name' => 'Intruder Wallet',
                'type' => 'bank',
                'institution' => null,
                'account_number' => null,
                'initial_balance' => 0,
                'is_active' => true,
            ])
            ->assertNotFound();
    }

    public function test_category_policy_allows_owner_and_hides_other_users_category(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();
        $category = Category::factory()->for($owner)->expense()->create();

        $this->assertTrue(Gate::forUser($owner)->allows('delete', $category));
        $this->assertTrue(Gate::forUser($intruder)->denies('delete', $category));

        $this->actingAs($intruder)
            ->delete(route('categories.destroy', $category))
            ->assertNotFound();
    }
}
