<?php

namespace App\Jobs;

use App\Models\WhatsappMessage;
use App\Services\Telegram\Gateways\TelegramGateway;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Throwable;

class SendTelegramMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 30;

    public function __construct(public int $messageId)
    {
    }

    public function handle(TelegramGateway $gateway): void
    {
        $message = WhatsappMessage::find($this->messageId);
        if (! $message || $message->status === 'sent') {
            return;
        }

        try {
            $result = $gateway->send($message);
            $message->update([
                'status' => $result['status'] ?? 'sent',
                'provider_message_id' => $message->provider_message_id ?: ($result['provider_message_id'] ?? null),
                'payload' => array_merge($message->payload ?? [], [
                    'channel' => 'telegram',
                    'sent_at' => Carbon::now()->toIso8601String(),
                ]),
            ]);
        } catch (Throwable $e) {
            $message->update([
                'status' => 'failed',
                'payload' => array_merge($message->payload ?? [], [
                    'channel' => 'telegram',
                    'error' => $e->getMessage(),
                    'failed_at' => Carbon::now()->toIso8601String(),
                ]),
            ]);

            throw $e;
        }
    }
}
