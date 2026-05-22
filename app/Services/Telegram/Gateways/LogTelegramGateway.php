<?php

namespace App\Services\Telegram\Gateways;

use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LogTelegramGateway implements TelegramGateway
{
    public function send(WhatsappMessage $message): array
    {
        Log::info('telegram.outbound', [
            'chat_id' => $message->payload['chat_id'] ?? $message->phone,
            'message' => $message->message,
            'status' => $message->status,
        ]);

        return [
            'status' => 'sent',
            'provider_message_id' => $message->provider_message_id ?? 'telegram-log-' . Str::uuid()->toString(),
        ];
    }
}
