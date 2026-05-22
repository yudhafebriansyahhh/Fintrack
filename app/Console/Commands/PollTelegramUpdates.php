<?php

namespace App\Console\Commands;

use App\Http\Controllers\Api\TelegramWebhookController;
use App\Services\Telegram\TelegramBot;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class PollTelegramUpdates extends Command
{
    protected $signature = 'telegram:poll {--once : Poll one time and exit}';

    protected $description = 'Poll Telegram updates for local development without a public webhook URL.';

    public function handle(TelegramBot $bot): int
    {
        $botToken = (string) config('services.telegram.bot_token');
        if ($botToken === '') {
            $this->error('TELEGRAM_BOT_TOKEN belum dikonfigurasi.');

            return self::FAILURE;
        }

        $this->info('Polling Telegram updates. Tekan Ctrl+C untuk berhenti.');

        $offset = null;

        do {
            $response = Http::acceptJson()
                ->timeout(35)
                ->get("https://api.telegram.org/bot{$botToken}/getUpdates", [
                    'offset' => $offset,
                    'timeout' => 30,
                    'allowed_updates' => json_encode(['message', 'edited_message']),
                ]);

            if ($response->failed() || ! $response->json('ok')) {
                $this->error('Telegram getUpdates gagal: ' . $response->body());
                sleep(3);
                continue;
            }

            foreach ($response->json('result', []) as $update) {
                $offset = ((int) $update['update_id']) + 1;
                $request = Request::create('/api/telegram/webhook', 'POST', $update);
                $request->headers->set(
                    'X-Telegram-Bot-Api-Secret-Token',
                    (string) config('services.telegram.webhook_secret')
                );

                app(TelegramWebhookController::class)->__invoke($request, $bot);

                $chatId = data_get($update, 'message.chat.id') ?? data_get($update, 'edited_message.chat.id');
                $this->line('Processed update ' . $update['update_id'] . ($chatId ? " from chat {$chatId}" : ''));
            }
        } while (! $this->option('once'));

        return self::SUCCESS;
    }
}
