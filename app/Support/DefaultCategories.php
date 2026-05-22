<?php

namespace App\Support;

use App\Models\User;

class DefaultCategories
{
    /**
     * @return array<int, array{name: string, type: string}>
     */
    public static function list(): array
    {
        return [
            ['name' => 'Gaji', 'type' => 'income'],
            ['name' => 'Bonus', 'type' => 'income'],
            ['name' => 'THR', 'type' => 'income'],
            ['name' => 'Freelance', 'type' => 'income'],
            ['name' => 'Investasi', 'type' => 'income'],
            ['name' => 'Penjualan', 'type' => 'income'],
            ['name' => 'Hadiah', 'type' => 'income'],
            ['name' => 'Pemasukan Lainnya', 'type' => 'income'],

            ['name' => 'Makan & Minum', 'type' => 'expense'],
            ['name' => 'Belanja Harian', 'type' => 'expense'],
            ['name' => 'Transportasi', 'type' => 'expense'],
            ['name' => 'Pulsa & Internet', 'type' => 'expense'],
            ['name' => 'Tagihan Rumah', 'type' => 'expense'],
            ['name' => 'Sewa / KPR', 'type' => 'expense'],
            ['name' => 'Cicilan', 'type' => 'expense'],
            ['name' => 'Kesehatan', 'type' => 'expense'],
            ['name' => 'Pendidikan', 'type' => 'expense'],
            ['name' => 'Hiburan', 'type' => 'expense'],
            ['name' => 'Olahraga & Hobi', 'type' => 'expense'],
            ['name' => 'Pakaian', 'type' => 'expense'],
            ['name' => 'Subscription', 'type' => 'expense'],
            ['name' => 'Donasi & Zakat', 'type' => 'expense'],
            ['name' => 'Pajak', 'type' => 'expense'],
            ['name' => 'Perawatan Diri', 'type' => 'expense'],
            ['name' => 'Liburan', 'type' => 'expense'],
            ['name' => 'Keluarga & Anak', 'type' => 'expense'],
            ['name' => 'Pengeluaran Lainnya', 'type' => 'expense'],
        ];
    }

    public static function ensureFor(User $user): int
    {
        $existing = $user->categories()
            ->get(['name', 'type'])
            ->map(fn ($category) => mb_strtolower($category->type.'|'.$category->name))
            ->all();

        $created = 0;

        foreach (self::list() as $category) {
            $key = mb_strtolower($category['type'].'|'.$category['name']);

            if (in_array($key, $existing, true)) {
                continue;
            }

            $user->categories()->create($category);
            $created++;
        }

        return $created;
    }
}
