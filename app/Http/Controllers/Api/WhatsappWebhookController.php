<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SendWhatsappMessageJob;
use App\Models\User;
use App\Models\WhatsappMessage;
use App\Services\Whatsapp\CommandParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WhatsappWebhookController extends Controller
{
    public function __invoke(Request $request, CommandParser $parser): JsonResponse
    {
        $expected = (string) config('services.whatsapp.webhook_token');
        if ($expected !== '') {
            abort_unless(
                hash_equals($expected, (string) $request->header('X-Webhook-Token')),
                401
            );
        }

        $data = $request->validate([
            'phone' => ['required', 'string', 'max:64'],
            'message' => ['required', 'string', 'max:2000'],
            'provider_message_id' => ['nullable', 'string', 'max:120'],
            'chat_id' => ['nullable', 'string', 'max:64'],
        ]);

        $providerMessageId = $data['provider_message_id'] ?? null;

        if ($providerMessageId && WhatsappMessage::where('provider_message_id', $providerMessageId)->exists()) {
            return response()->json(['ok' => true, 'duplicate' => true]);
        }

        $chatId = $data['chat_id'] ?? $data['phone'];
        $messageText = trim($data['message']);

        $user = $this->resolveByChatId($chatId);

        $linked = false;
        if (! $user) {
            $user = $this->tryLinkByOtp($chatId, $messageText, $linked);
        }

        if (! $user) {
            $user = $this->resolveByPhone($data['phone']);
        }

        $reply = match (true) {
            ! $user => 'Nomor Anda belum terhubung dengan akun FinTrack. Buka halaman WhatsApp pada aplikasi, klik "Kirim Kode OTP", lalu balas pesan WhatsApp ini dengan kode 6 digit yang dikirim.',
            $linked => 'Verifikasi WhatsApp berhasil. Sekarang Anda dapat menggunakan perintah keuangan via chat ini. Ketik help untuk daftar perintah.',
            default => $parser->handle($user, $messageText),
        };

        if (! $user) {
            return $this->sendReplyToChat($chatId, $data['phone'], $reply);
        }

        DB::transaction(function () use ($user, $data, $providerMessageId, $reply, $request, $chatId, &$outboundId) {
            WhatsappMessage::create([
                'user_id' => $user->id,
                'phone' => $data['phone'],
                'direction' => 'inbound',
                'message' => $data['message'],
                'status' => 'received',
                'provider_message_id' => $providerMessageId,
                'payload' => array_merge(['chat_id' => $chatId], $request->except(['phone', 'message', 'provider_message_id', 'chat_id'])),
            ]);

            $outbound = WhatsappMessage::create([
                'user_id' => $user->id,
                'phone' => $data['phone'],
                'direction' => 'outbound',
                'message' => $reply,
                'status' => 'queued',
                'payload' => ['chat_id' => $chatId],
            ]);

            $outboundId = $outbound->id;
        });

        if (!empty($outboundId)) {
            SendWhatsappMessageJob::dispatchAfterResponse($outboundId);
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

        return User::where('whatsapp_chat_id', $chatId)->first();
    }

    private function resolveByPhone(string $phone): ?User
    {
        $normalized = $this->normalizePhone($phone);
        if ($normalized === '') {
            return null;
        }

        return User::query()
            ->whereNotNull('phone_verified_at')
            ->get()
            ->first(fn (User $user) => $this->normalizePhone((string) $user->phone) === $normalized);
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
            'whatsapp_chat_id' => $chatId,
        ])->save();

        $linked = true;

        return $user;
    }

    private function sendReplyToChat(string $chatId, string $phone, string $reply): \Illuminate\Http\JsonResponse
    {
        $message = WhatsappMessage::create([
            'user_id' => null,
            'phone' => $phone,
            'direction' => 'outbound',
            'message' => $reply,
            'status' => 'queued',
            'payload' => ['chat_id' => $chatId, 'context' => 'unverified'],
        ]);
        SendWhatsappMessageJob::dispatchAfterResponse($message->id);

        return response()->json([
            'ok' => false,
            'reply' => $reply,
        ], 200);
    }

    private function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';
        if (Str::startsWith($digits, '62')) {
            $digits = '0' . substr($digits, 2);
        }

        return $digits;
    }
}