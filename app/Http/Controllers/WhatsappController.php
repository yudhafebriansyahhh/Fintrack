<?php

namespace App\Http\Controllers;

use App\Jobs\SendWhatsappMessageJob;
use App\Models\WhatsappMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class WhatsappController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $botPhone = config('services.whatsapp.bot_phone');

        $messages = $user->whatsappMessages()
            ->latest('id')
            ->limit(20)
            ->get(['id', 'phone', 'direction', 'message', 'status', 'created_at']);

        return Inertia::render('Whatsapp/Index', [
            'botPhone' => $botPhone,
            'keywords' => [
                ['keyword' => 'keluar', 'description' => 'Catat pengeluaran. Contoh: keluar 25000 makan siang'],
                ['keyword' => 'masuk', 'description' => 'Catat pemasukan. Contoh: masuk 1500000 gaji'],
                ['keyword' => 'transfer', 'description' => 'Pindah saldo antar dompet. Contoh: transfer 250000 BCA DANA'],
                ['keyword' => 'saldo', 'description' => 'Cek saldo dompet aktif.'],
                ['keyword' => 'tagihan', 'description' => 'Lihat tagihan terdekat dan terlambat.'],
                ['keyword' => 'help', 'description' => 'Tampilkan daftar perintah yang tersedia.'],
            ],
            'verification' => [
                'phone' => $user->phone,
                'verified_at' => optional($user->phone_verified_at)->toIso8601String(),
                'pending_until' => $user->phone_verification_expires_at && $user->phone_verification_expires_at->isFuture()
                    ? $user->phone_verification_expires_at->toIso8601String()
                    : null,
                'has_code' => filled($user->phone_verification_code),
                'is_verified' => filled($user->phone_verified_at),
            ],
            'messages' => $messages,
        ]);
    }

    public function requestOtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:20', 'regex:/^[0-9+()\-\s]+$/'],
        ]);

        $user = $request->user();
        $code = (string) random_int(100000, 999999);
        $ttl = (int) config('services.whatsapp.otp_ttl_minutes', 10);

        DB::transaction(function () use ($user, $data, $code, $ttl) {
            $samePhone = $user->phone === $data['phone'];

            $user->forceFill([
                'phone' => $data['phone'],
                'phone_verified_at' => $samePhone ? $user->phone_verified_at : null,
                'whatsapp_chat_id' => $samePhone ? $user->whatsapp_chat_id : null,
                'phone_verification_code' => $code,
                'phone_verification_expires_at' => Carbon::now()->addMinutes($ttl),
            ])->save();

            $botPhone = config('services.whatsapp.bot_phone');

            $message = WhatsappMessage::create([
                'user_id' => $user->id,
                'phone' => $data['phone'],
                'direction' => 'outbound',
                'message' => sprintf('Kode verifikasi FinTrack Anda: %s. Berlaku %d menit. Balas pesan ini di chat dengan kode untuk menghubungkan akun.', $code, $ttl),
                'status' => 'queued',
            ]);
            SendWhatsappMessageJob::dispatchAfterResponse($message->id);
        });

        return back()->with('success', 'Kode OTP telah dibuat. Cek WhatsApp Anda untuk verifikasi.');
    }

    public function verifyOtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (! $user->phone_verification_code || ! $user->phone_verification_expires_at) {
            throw ValidationException::withMessages([
                'code' => 'Belum ada permintaan verifikasi. Silakan minta kode OTP terlebih dahulu.',
            ]);
        }

        if ($user->phone_verification_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => 'Kode OTP sudah kedaluwarsa. Mohon minta kode baru.',
            ]);
        }

        if (! hash_equals((string) $user->phone_verification_code, (string) $data['code'])) {
            throw ValidationException::withMessages([
                'code' => 'Kode OTP tidak sesuai.',
            ]);
        }

        $user->forceFill([
            'phone_verified_at' => Carbon::now(),
            'phone_verification_code' => null,
            'phone_verification_expires_at' => null,
        ])->save();

        $message = WhatsappMessage::create([
            'user_id' => $user->id,
            'phone' => $user->phone,
            'direction' => 'outbound',
            'message' => 'Verifikasi nomor WhatsApp berhasil. Anda dapat mulai menggunakan perintah keuangan via bot.',
            'status' => 'queued',
        ]);
        SendWhatsappMessageJob::dispatchAfterResponse($message->id);

        return back()->with('success', 'Nomor WhatsApp berhasil diverifikasi.');
    }

    public function unlink(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'phone_verified_at' => null,
            'phone_verification_code' => null,
            'phone_verification_expires_at' => null,
        ])->save();

        return back()->with('success', 'Nomor WhatsApp dilepas dari akun.');
    }
}