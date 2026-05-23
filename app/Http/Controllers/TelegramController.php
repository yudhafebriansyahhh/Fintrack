<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TelegramController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $messages = $user->whatsappMessages()
            ->where('payload->channel', 'telegram')
            ->latest('id')
            ->limit(20)
            ->get(['id', 'phone', 'direction', 'message', 'status', 'created_at']);

        $pending = $user->phone_verification_expires_at && $user->phone_verification_expires_at->isFuture();

        return Inertia::render('Telegram/Index', [
            'botUsername' => config('services.telegram.bot_username'),
            'botUrl' => filled(config('services.telegram.bot_username'))
                ? 'https://t.me/' . ltrim((string) config('services.telegram.bot_username'), '@')
                : null,
            'keywords' => [
                ['keyword' => 'keluar [nominal] [kategori] [catatan] via [dompet]', 'description' => 'Catat pengeluaran. Contoh: keluar 25000 makan siang via BCA'],
                ['keyword' => 'masuk [nominal] [kategori] [catatan] via [dompet]', 'description' => 'Catat pemasukan. Contoh: masuk 1500000 gaji bulanan via BCA'],
                ['keyword' => 'transfer [nominal] dari [dompet] ke [dompet]', 'description' => 'Pindah saldo antar dompet. Contoh: transfer 250000 dari BCA ke DANA'],
                ['keyword' => 'saldo', 'description' => 'Cek saldo seluruh dompet aktif.'],
                ['keyword' => 'tagihan', 'description' => 'Lihat tagihan terdekat dan tagihan terlambat.'],
                ['keyword' => 'lunas [id] via [dompet]', 'description' => 'Tandai tagihan lunas. ID didapat dari /tagihan.'],
                ['keyword' => 'ringkasan [hari|minggu|bulan]', 'description' => 'Rekap pemasukan, pengeluaran, dan net periode tertentu.'],
                ['keyword' => 'top', 'description' => 'Lihat 5 kategori pengeluaran terbesar bulan ini.'],
                ['keyword' => 'bantuan', 'description' => 'Buka panduan format perintah lengkap.'],
            ],
            'verification' => [
                'chat_id' => $user->telegram_chat_id,
                'verified_at' => optional($user->phone_verified_at)->toIso8601String(),
                'pending_until' => $pending
                    ? $user->phone_verification_expires_at->toIso8601String()
                    : null,
                'pending_code' => $pending ? $user->phone_verification_code : null,
                'has_code' => $pending && filled($user->phone_verification_code),
                'is_linked' => filled($user->telegram_chat_id),
            ],
            'messages' => $messages,
        ]);
    }

    public function requestOtp(Request $request): RedirectResponse
    {
        $user = $request->user();
        $code = (string) random_int(100000, 999999);
        $ttl = (int) config('services.whatsapp.otp_ttl_minutes', 10);

        DB::transaction(function () use ($user, $code, $ttl) {
            $user->forceFill([
                'phone_verification_code' => $code,
                'phone_verification_expires_at' => Carbon::now()->addMinutes($ttl),
            ])->save();
        });

        return back()->with('success', "Kode OTP Telegram dibuat. Kirim kode tersebut ke bot Telegram FinTrack untuk menyelesaikan tautan.");
    }

    public function verifyOtp(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = $request->user();

        if (! $user->phone_verification_code || ! $user->phone_verification_expires_at) {
            throw ValidationException::withMessages([
                'code' => 'Belum ada permintaan verifikasi. Silakan generate kode OTP terlebih dahulu.',
            ]);
        }

        if ($user->phone_verification_expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => 'Kode OTP sudah kedaluwarsa. Mohon generate kode baru.',
            ]);
        }

        if (! hash_equals((string) $user->phone_verification_code, (string) $data['code'])) {
            throw ValidationException::withMessages([
                'code' => 'Kode OTP tidak sesuai.',
            ]);
        }

        $user->forceFill([
            'phone_verified_at' => Carbon::now(),
        ])->save();

        return back()->with('success', 'Kode OTP valid. Kirim kode yang sama ke bot Telegram untuk menyimpan chat ID akun ini.');
    }

    public function unlink(Request $request): RedirectResponse
    {
        $request->user()->forceFill([
            'telegram_chat_id' => null,
            'phone_verification_code' => null,
            'phone_verification_expires_at' => null,
        ])->save();

        return back()->with('success', 'Telegram Bot dilepas dari akun.');
    }
}
