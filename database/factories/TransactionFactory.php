<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Transaction;
use App\Models\User;
use App\Models\Wallet;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'wallet_id' => Wallet::factory(),
            'category_id' => Category::factory(),
            'type' => 'expense',
            'amount' => $this->faker->randomFloat(2, 10000, 500000),
            'transaction_date' => now()->toDateString(),
            'description' => $this->faker->sentence(4),
        ];
    }
}