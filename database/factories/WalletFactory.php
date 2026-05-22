<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;

class WalletFactory extends Factory
{
    protected $model = Wallet::class;

    public function definition(): array
    {
        $balance = $this->faker->randomFloat(2, 100000, 5000000);

        return [
            'user_id' => User::factory(),
            'name' => $this->faker->randomElement(['Bank BCA', 'Bank BRI', 'DANA', 'GoPay', 'Cash']),
            'type' => $this->faker->randomElement(['bank', 'e-wallet', 'cash', 'other']),
            'institution' => $this->faker->company(),
            'account_number' => (string) $this->faker->bankAccountNumber(),
            'initial_balance' => $balance,
            'current_balance' => $balance,
            'is_active' => true,
        ];
    }
}