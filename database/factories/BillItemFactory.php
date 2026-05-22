<?php

namespace Database\Factories;

use App\Models\BillGroup;
use App\Models\BillItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class BillItemFactory extends Factory
{
    protected $model = BillItem::class;

    public function definition(): array
    {
        return [
            'bill_group_id' => BillGroup::factory(),
            'title' => $this->faker->sentence(3),
            'amount' => $this->faker->randomFloat(2, 100000, 2000000),
            'due_date' => now()->addDays($this->faker->numberBetween(1, 30))->toDateString(),
            'paid_date' => null,
            'status' => 'unpaid',
            'notes' => null,
        ];
    }
}