<?php

namespace App\Services\Whatsapp\Gateways;

use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LogWhatsappGateway implements WhatsappGateway
{
    public function send(WhatsappMessage $message): array
    {
        Log::info('whatsapp.outbound', [
            'phone' => $message->phone,
            'message' => $message->message,
            'status' => $message->status,
        ]);

        return [
            'status' => 'sent',
            'provider_message_id' => $message->provider_message_id ?? 'log-' . Str::uuid()->toString(),
        ];
    }
}