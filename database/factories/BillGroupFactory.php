<?php

namespace Database\Factories;

use App\Models\BillGroup;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BillGroupFactory extends Factory
{
    protected $model = BillGroup::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => $this->faker->randomElement(['Internet IndiHome', 'Cicilan Mobil', 'Listrik PLN', 'Kartu Kredit BCA']),
            'description' => $this->faker->sentence(),
            'total_amount' => $this->faker->randomFloat(2, 500000, 5000000),
            'reminder_days_before' => 3,
            'status' => 'active',
        ];
    }
}