<?php

namespace App\Services\Whatsapp\Gateways;

use App\Models\WhatsappMessage;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HttpWhatsappGateway implements WhatsappGateway
{
    public function __construct(
        private string $endpoint,
        private ?string $token = null,
        private ?string $sender = null,
    ) {
    }

    public function send(WhatsappMessage $message): array
    {
        if ($this->endpoint === '') {
            throw new RuntimeException('WhatsApp endpoint is not configured.');
        }

        $payload = [
            'phone' => $message->phone,
            'chat_id' => $message->payload['chat_id'] ?? null,
            'message' => $message->message,
            'sender' => $this->sender,
            'reference_id' => $message->provider_message_id,
        ];

        $request = Http::asJson()->acceptJson()->timeout(15);
        if ($this->token) {
            $request = $request->withToken($this->token);
        }

        $response = $request->post($this->endpoint, $payload);

        if ($response->failed()) {
            throw new RuntimeException('WhatsApp provider returned ' . $response->status() . ': ' . $response->body());
        }

        return [
            'status' => 'sent',
            'provider_message_id' => $response->json('data.id') ?? $response->json('id') ?? $message->provider_message_id,
        ];
    }
}