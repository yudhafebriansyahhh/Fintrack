<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('Settings/Index', [
            'status' => session('status'),
            'stats' => [
                'wallets' => $user->wallets()->count(),
                'activeWallets' => $user->wallets()->where('is_active', true)->count(),
                'categories' => $user->categories()->count(),
                'transactions' => $user->transactions()->count(),
                'billGroups' => $user->billGroups()->count(),
                'activeBills' => $user->billGroups()->where('status', 'active')->count(),
                'whatsappMessages' => $user->whatsappMessages()->count(),
            ],
            'whatsapp' => [
                'phone' => $user->phone,
                'verifiedAt' => $user->phone_verified_at?->toISOString(),
                'chatLinked' => filled($user->whatsapp_chat_id),
            ],
            'telegram' => [
                'username' => config('services.telegram.bot_username'),
                'chatLinked' => filled($user->telegram_chat_id),
                'chatId' => $user->telegram_chat_id,
            ],
            'preferences' => [
                'currency' => 'IDR',
                'locale' => 'id-ID',
                'reportPeriod' => 'monthly',
                'reminderDaysBefore' => 3,
                'botNumber' => config('services.whatsapp.bot_phone', '081995851174'),
            ],
        ]);
    }
}
