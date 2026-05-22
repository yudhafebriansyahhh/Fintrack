<?php

namespace App\Services\Telegram\Gateways;

use App\Models\WhatsappMessage;

interface TelegramGateway
{
    /**
     * Send the queued message via the underlying provider.
     *
     * @return array{status:string, provider_message_id?:string|null}
     */
    public function send(WhatsappMessage $message): array;
}
