<?php

namespace App\Support;

use App\Models\User;

class DefaultCategories
{
    /**
     * @return array<int, array{name: string, type: string, icon: string, color: string}>
     */
    public static function list(): array
    {
        return [
            ['name' => 'Gaji', 'type' => 'income', 'icon' => 'briefcase', 'color' => 'emerald'],
            ['name' => 'Bonus', 'type' => 'income', 'icon' => 'zap', 'color' => 'emerald'],
            ['name' => 'THR', 'type' => 'income', 'icon' => 'zap', 'color' => 'emerald'],
            ['name' => 'Freelance', 'type' => 'income', 'icon' => 'briefcase', 'color' => 'emerald'],
            ['name' => 'Investasi', 'type' => 'income', 'icon' => 'reports', 'color' => 'emerald'],
            ['name' => 'Penjualan', 'type' => 'income', 'icon' => 'cart', 'color' => 'emerald'],
            ['name' => 'Hadiah', 'type' => 'income', 'icon' => 'zap', 'color' => 'emerald'],
            ['name' => 'Pemasukan Lainnya', 'type' => 'income', 'icon' => 'arrowDown', 'color' => 'emerald'],

            ['name' => 'Makan & Minum', 'type' => 'expense', 'icon' => 'food', 'color' => 'rose'],
            ['name' => 'Belanja Harian', 'type' => 'expense', 'icon' => 'cart', 'color' => 'rose'],
            ['name' => 'Transportasi', 'type' => 'expense', 'icon' => 'car', 'color' => 'rose'],
            ['name' => 'Pulsa & Internet', 'type' => 'expense', 'icon' => 'wifi', 'color' => 'rose'],
            ['name' => 'Tagihan Rumah', 'type' => 'expense', 'icon' => 'bills', 'color' => 'rose'],
            ['name' => 'Sewa / KPR', 'type' => 'expense', 'icon' => 'bills', 'color' => 'rose'],
            ['name' => 'Cicilan', 'type' => 'expense', 'icon' => 'creditCard', 'color' => 'rose'],
            ['name' => 'Kesehatan', 'type' => 'expense', 'icon' => 'help', 'color' => 'rose'],
            ['name' => 'Pendidikan', 'type' => 'expense', 'icon' => 'reports', 'color' => 'rose'],
            ['name' => 'Hiburan', 'type' => 'expense', 'icon' => 'zap', 'color' => 'rose'],
            ['name' => 'Olahraga & Hobi', 'type' => 'expense', 'icon' => 'zap', 'color' => 'rose'],
            ['name' => 'Pakaian', 'type' => 'expense', 'icon' => 'cart', 'color' => 'rose'],
            ['name' => 'Subscription', 'type' => 'expense', 'icon' => 'creditCard', 'color' => 'rose'],
            ['name' => 'Donasi & Zakat', 'type' => 'expense', 'icon' => 'mail', 'color' => 'rose'],
            ['name' => 'Pajak', 'type' => 'expense', 'icon' => 'bills', 'color' => 'rose'],
            ['name' => 'Perawatan Diri', 'type' => 'expense', 'icon' => 'help', 'color' => 'rose'],
            ['name' => 'Liburan', 'type' => 'expense', 'icon' => 'wifi', 'color' => 'rose'],
            ['name' => 'Keluarga & Anak', 'type' => 'expense', 'icon' => 'user', 'color' => 'rose'],
            ['name' => 'Pengeluaran Lainnya', 'type' => 'expense', 'icon' => 'arrowUp', 'color' => 'rose'],
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

            $user->categories()->create($category + [
                'is_default' => true,
                'is_active' => true,
            ]);
            $created++;
        }

        return $created;
    }
}
