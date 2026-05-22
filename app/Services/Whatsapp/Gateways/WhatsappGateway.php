<?php

namespace App\Services\Whatsapp\Gateways;

use App\Models\WhatsappMessage;

interface WhatsappGateway
{
    /**
     * Send the queued message via the underlying provider.
     *
     * @return array{status:string, provider_message_id?:string|null}
     */
    public function send(WhatsappMessage $message): array;
}