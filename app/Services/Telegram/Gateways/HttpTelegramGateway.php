<?php

namespace App\Services\Telegram\Gateways;

use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HttpTelegramGateway implements TelegramGateway
{
    public function __construct(private string $botToken)
    {
    }

    public function send(WhatsappMessage $message): array
    {
        if ($this->botToken === '') {
            throw new RuntimeException('Telegram bot token is not configured.');
        }

        $chatId = $message->payload['chat_id'] ?? $message->phone;
        if (! $chatId) {
            throw new RuntimeException('Telegram chat ID is not available.');
        }

        $response = Http::asJson()
            ->acceptJson()
            ->timeout(15)
            ->post("https://api.telegram.org/bot{$this->botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $message->message,
                'disable_web_page_preview' => true,
            ]);

        if ($response->failed() || ! $response->json('ok')) {
            throw new RuntimeException('Telegram provider returned ' . $response->status() . ': ' . $response->body());
        }

        return [
            'status' => 'sent',
            'provider_message_id' => $response->json('result.message_id') ?? $message->provider_message_id,
        ];
    }
}
