<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendTelegramMessageJob;
use App\Models\User;
use App\Models\WhatsappMessage;
use App\Services\Telegram\TelegramBot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class TelegramWebhookController extends Controller
{
    public function __invoke(Request $request, TelegramBot $bot): JsonResponse
    {
        $expected = (string) config('services.telegram.webhook_secret');
        if ($expected !== '') {
            abort_unless(
                hash_equals($expected, (string) $request->header('X-Telegram-Bot-Api-Secret-Token')),
                401
            );
        }

        $message = $request->input('message') ?? $request->input('edited_message');
        if (! is_array($message)) {
            return response()->json(['ok' => true, 'ignored' => true]);
        }

        $chatId = (string) data_get($message, 'chat.id', '');
        $messageText = trim((string) data_get($message, 'text', ''));
        $providerMessageId = $request->filled('update_id')
            ? 'telegram-update-' . $request->input('update_id')
            : null;

        if ($chatId === '' || $messageText === '') {
            return response()->json(['ok' => true, 'ignored' => true]);
        }

        if ($providerMessageId && WhatsappMessage::where('provider_message_id', $providerMessageId)->exists()) {
            return response()->json(['ok' => true, 'duplicate' => true]);
        }

        $user = $this->resolveByChatId($chatId);

        $linked = false;
        if (! $user) {
            $user = $this->tryLinkByOtp($chatId, $messageText, $linked);
        }

        $reply = match (true) {
            ! $user => $bot->unauthorizedReply(),
            $linked => $bot->linkedReply(),
            default => $bot->handle($user, $messageText),
        };

        if (! $user) {
            return $this->sendReplyToChat($chatId, $reply, $request);
        }

        DB::transaction(function () use ($user, $chatId, $messageText, $providerMessageId, $reply, $request, &$outboundId) {
            WhatsappMessage::create([
                'user_id' => $user->id,
                'phone' => $chatId,
                'direction' => 'inbound',
                'message' => $messageText,
                'status' => 'received',
                'provider_message_id' => $providerMessageId,
                'payload' => [
                    'channel' => 'telegram',
                    'chat_id' => $chatId,
                    'telegram' => $request->all(),
                ],
            ]);

            $outbound = WhatsappMessage::create([
                'user_id' => $user->id,
                'phone' => $chatId,
                'direction' => 'outbound',
                'message' => $reply,
                'status' => 'queued',
                'payload' => [
                    'channel' => 'telegram',
                    'chat_id' => $chatId,
                ],
            ]);

            $outboundId = $outbound->id;
        });

        if (! empty($outboundId)) {
            $this->dispatchOutbound($outboundId);
        }

        return response()->json([
            'ok' => true,
            'reply' => $reply,
            'linked' => $linked,
        ]);
    }

    private function resolveByChatId(string $chatId): ?User
    {
        $chatId = trim($chatId);
        if ($chatId === '') {
            return null;
        }

        return User::where('telegram_chat_id', $chatId)->first();
    }

    private function tryLinkByOtp(string $chatId, string $message, bool &$linked): ?User
    {
        $code = trim($message);
        if (! preg_match('/^\d{6}$/', $code)) {
            return null;
        }

        $user = User::query()
            ->where('phone_verification_code', $code)
            ->where('phone_verification_expires_at', '>=', Carbon::now())
            ->first();

        if (! $user) {
            return null;
        }

        $user->forceFill([
            'phone_verified_at' => Carbon::now(),
            'phone_verification_code' => null,
            'phone_verification_expires_at' => null,
            'telegram_chat_id' => $chatId,
        ])->save();

        $linked = true;

        return $user;
    }

    private function sendReplyToChat(string $chatId, string $reply, Request $request): JsonResponse
    {
        $message = WhatsappMessage::create([
            'user_id' => null,
            'phone' => $chatId,
            'direction' => 'outbound',
            'message' => $reply,
            'status' => 'queued',
            'payload' => [
                'channel' => 'telegram',
                'chat_id' => $chatId,
                'context' => 'unverified',
                'telegram' => $request->all(),
            ],
        ]);
        $this->dispatchOutbound($message->id);

        return response()->json([
            'ok' => false,
            'reply' => $reply,
        ], 200);
    }

    private function dispatchOutbound(int $messageId): void
    {
        if (app()->runningInConsole()) {
            SendTelegramMessageJob::dispatch($messageId);

            return;
        }

        SendTelegramMessageJob::dispatchAfterResponse($messageId);
    }
}
