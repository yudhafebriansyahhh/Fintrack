<?php

namespace App\Providers;

use App\Models\BillGroup;
use App\Models\BillItem;
use App\Models\Category;
use App\Models\Debt;
use App\Models\Transaction;
use App\Models\Wallet;
use App\Policies\BillGroupPolicy;
use App\Policies\BillItemPolicy;
use App\Policies\CategoryPolicy;
use App\Policies\DebtPolicy;
use App\Policies\TransactionPolicy;
use App\Policies\WalletPolicy;
use App\Services\Whatsapp\Gateways\HttpWhatsappGateway;
use App\Services\Whatsapp\Gateways\LogWhatsappGateway;
use App\Services\Whatsapp\Gateways\WhatsappGateway;
use App\Services\Telegram\Gateways\HttpTelegramGateway;
use App\Services\Telegram\Gateways\LogTelegramGateway;
use App\Services\Telegram\Gateways\TelegramGateway;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(WhatsappGateway::class, function () {
            $driver = config('services.whatsapp.driver', 'log');

            return match ($driver) {
                'http' => new HttpWhatsappGateway(
                    endpoint: (string) config('services.whatsapp.http.endpoint', ''),
                    token: config('services.whatsapp.http.token'),
                    sender: config('services.whatsapp.http.sender'),
                ),
                default => new LogWhatsappGateway(),
            };
        });

        $this->app->bind(TelegramGateway::class, function () {
            $driver = config('services.telegram.driver', 'log');

            return match ($driver) {
                'http' => new HttpTelegramGateway(
                    botToken: (string) config('services.telegram.bot_token', ''),
                ),
                default => new LogTelegramGateway(),
            };
        });
    }

    public function boot(): void
    {
        Gate::policy(Wallet::class, WalletPolicy::class);
        Gate::policy(Category::class, CategoryPolicy::class);
        Gate::policy(Transaction::class, TransactionPolicy::class);
        Gate::policy(BillGroup::class, BillGroupPolicy::class);
        Gate::policy(BillItem::class, BillItemPolicy::class);
        Gate::policy(Debt::class, DebtPolicy::class);
    }
}
