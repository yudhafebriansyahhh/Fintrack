import DangerButton from '@/Components/DangerButton';
import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { confirmDelete, toastSuccess } from '@/Utils/swal';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const formatDateTime = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : '-';

function calc(expiresAt) {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
}

function CountdownBadge({ expiresAt }) {
    const [remaining, setRemaining] = useState(() => calc(expiresAt));

    useEffect(() => {
        if (!expiresAt) {
            setRemaining(0);
            return;
        }
        setRemaining(calc(expiresAt));
        const timer = setInterval(() => setRemaining(calc(expiresAt)), 1000);
        return () => clearInterval(timer);
    }, [expiresAt]);

    if (!expiresAt) return null;
    if (remaining <= 0) {
        return <span className="text-xs font-semibold text-danger">Kode kedaluwarsa</span>;
    }

    const minutes = Math.floor(remaining / 60).toString().padStart(2, '0');
    const seconds = (remaining % 60).toString().padStart(2, '0');
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary-600" />
            Kedaluwarsa dalam {minutes}:{seconds}
        </span>
    );
}

export default function Index({
    botUsername,
    botUrl,
    keywords = [],
    verification,
    messages = [],
}) {
    const { flash } = usePage().props;

    const otpForm = useForm({});

    const botConfigured = Boolean(botUsername);

    const generateOtp = (event) => {
        event.preventDefault();
        otpForm.post(route('telegram.request-otp'), { preserveScroll: true });
    };

    const unlink = async () => {
        const confirmed = await confirmDelete({
            title: 'Lepas tautan Telegram?',
            text: 'Bot Telegram tidak akan menerima command dari akun ini lagi.',
            confirmButtonText: 'Lepas tautan',
        });
        if (!confirmed) return;
        router.delete(route('telegram.unlink'), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Tautan Telegram dilepas'),
        });
    };

    const copyToClipboard = async (text, label) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            toastSuccess(`${label} disalin`);
        } catch {
            toastSuccess('Tidak bisa menyalin otomatis, copy manual ya');
        }
    };

    const botLabel = botConfigured ? `@${botUsername.replace(/^@/, '')}` : 'Belum dikonfigurasi';
    const hasActiveCode = Boolean(verification?.has_code);
    const connectionStatus = verification?.is_linked
        ? 'Terhubung'
        : hasActiveCode
          ? 'Menunggu kode dikirim ke bot'
          : 'Belum terhubung';

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 shadow-sm">
                                <Icon name="telegram" className="h-3.5 w-3.5" />
                                Telegram Integration
                            </div>
                            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Telegram Bot</h1>
                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                                Hubungkan akun Telegram untuk mencatat transaksi dan menerima pengingat tagihan langsung dari chat bot.
                            </p>
                        </div>
                        <span
                            className={`inline-flex shrink-0 items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold ${
                                verification?.is_linked
                                    ? 'bg-emerald-50 text-success ring-1 ring-emerald-200'
                                    : 'bg-amber-50 text-warning ring-1 ring-amber-200'
                            }`}
                        >
                            <span className={`h-2 w-2 rounded-full ${verification?.is_linked ? 'bg-success' : 'bg-warning'}`} />
                            {verification?.is_linked ? 'Terhubung' : 'Belum terhubung'}
                        </span>
                    </div>
                </section>
            }
        >
            <Head title="Telegram Bot" />

            <div className="page-shell">
                <div className="page-container">
                    {flash?.success && (
                        <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                            {flash.success}
                        </div>
                    )}

                    {!botConfigured && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
                            <p className="font-semibold">Bot belum dikonfigurasi</p>
                            <p className="mt-1 text-amber-700">
                                Hubungi administrator untuk mengisi <code className="font-mono text-xs">TELEGRAM_BOT_USERNAME</code> dan <code className="font-mono text-xs">TELEGRAM_BOT_TOKEN</code> pada server.
                            </p>
                        </div>
                    )}

                    <section className="grid gap-4 lg:grid-cols-2">
                        <div className="surface-card-padded">
                            <p className="label-tiny">Bot Telegram</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-950">{botLabel}</p>
                            <p className="mt-1 text-xs text-slate-500">
                                {botUrl
                                    ? 'Buka bot di Telegram, tekan Start, lalu kirim OTP yang muncul di halaman ini.'
                                    : 'Konfigurasi bot belum tersedia.'}
                            </p>
                            {botUrl && (
                                <a
                                    href={botUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
                                >
                                    <Icon name="telegram" className="h-4 w-4" />
                                    Buka Bot
                                </a>
                            )}
                        </div>

                        <div className="surface-card-padded">
                            <p className="label-tiny">Status koneksi</p>
                            <p className="mt-2 text-2xl font-semibold text-slate-950">
                                {connectionStatus}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {verification?.is_linked
                                    ? `Chat ID tersimpan: ${verification.chat_id}`
                                    : hasActiveCode
                                      ? 'Kode sudah aktif. Kirim kode tersebut ke bot Telegram untuk menyimpan chat ID.'
                                      : 'Generate kode, lalu kirim kode tersebut ke bot Telegram untuk menyelesaikan tautan.'}
                            </p>
                            {verification?.verified_at && (
                                <p className="mt-3 text-xs text-slate-500">
                                    Diverifikasi {formatDateTime(verification.verified_at)}
                                </p>
                            )}
                        </div>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                        <div className="surface-card-padded">
                            <div className="flex flex-col gap-2 border-b border-slate-100 pb-4">
                                <h2 className="text-lg font-semibold text-slate-950">Hubungkan Telegram</h2>
                                <p className="text-sm text-slate-500">
                                    Buat kode di FinTrack, lalu kirim kode itu ke bot Telegram agar sistem bisa menyimpan chat ID akunmu.
                                </p>
                            </div>

                            <form onSubmit={generateOtp} className="mt-5 space-y-4">
                                <PrimaryButton disabled={otpForm.processing || !botConfigured || verification?.is_linked}>
                                    <Icon name="zap" className="h-4 w-4" />
                                    {otpForm.processing ? 'Membuat kode...' : verification?.has_code ? 'Generate kode baru' : 'Generate kode Telegram'}
                                </PrimaryButton>
                                <InputError message={otpForm.errors?.code} />
                            </form>

                            {verification?.has_code && (
                                <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50 p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-xs font-semibold uppercase text-primary-700">Kode aktif</p>
                                            <p className="mt-1 font-mono text-3xl font-bold tracking-[0.35em] text-slate-950 sm:text-4xl">
                                                {verification.pending_code}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-start gap-2 sm:items-end">
                                            <CountdownBadge expiresAt={verification.pending_until} />
                                            <button
                                                type="button"
                                                onClick={() => copyToClipboard(verification.pending_code, 'Kode OTP')}
                                                className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm transition hover:bg-primary-100"
                                            >
                                                <Icon name="exchange" className="h-3 w-3" />
                                                Salin kode
                                            </button>
                                        </div>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-600">
                                        Kirim kode ini sebagai pesan biasa ke {botLabel}. Setelah bot membalas sukses, halaman ini akan menandai akun sebagai terhubung.
                                    </p>
                                </div>
                            )}

                            {!verification?.is_linked && (
                                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                        Kode tidak perlu dicek di web.
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-slate-500">
                                        Kirim kode aktif langsung ke bot Telegram. Bot akan memvalidasi kode, menyimpan chat ID, lalu membalas saat akun berhasil terhubung.
                                    </p>
                                </div>
                            )}

                            {verification?.is_linked && (
                                <div className="mt-6 border-t border-slate-100 pt-5">
                                    <DangerButton type="button" onClick={unlink}>
                                        <Icon name="trash" className="h-4 w-4" />
                                        Lepas Telegram Bot
                                    </DangerButton>
                                </div>
                            )}
                        </div>

                        <div className="surface-card">
                            <div className="border-b border-slate-100 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-950">Cara menghubungkan</h2>
                                <p className="text-sm text-slate-500">Ikuti tiga langkah berikut, bisa selesai dalam 1 menit.</p>
                            </div>
                            <ol className="space-y-4 px-6 py-5 text-sm text-slate-600">
                                <li className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">1</span>
                                    <div>
                                        <p className="font-semibold text-slate-800">Buka bot di Telegram</p>
                                        <p className="text-slate-500">Tekan tombol "Buka Bot" di atas, lalu klik Start di Telegram.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">2</span>
                                    <div>
                                        <p className="font-semibold text-slate-800">Generate OTP</p>
                                        <p className="text-slate-500">Klik tombol Generate OTP, lalu salin kode 6 digit yang muncul.</p>
                                    </div>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">3</span>
                                    <div>
                                        <p className="font-semibold text-slate-800">Kirim kode ke bot</p>
                                        <p className="text-slate-500">Tempel kode di chat Telegram. Bot akan otomatis menyimpan chat ID akunmu.</p>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </section>

                    <section className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
                        <div className="surface-card flex flex-col">
                            <div className="border-b border-slate-100 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-950">Perintah yang didukung</h2>
                                <p className="text-sm text-slate-500">Kirim pesan ke {botLabel} dengan format berikut.</p>
                            </div>
                            <ul className="flex-1 divide-y divide-slate-100">
                                {keywords.map((item) => (
                                    <li key={item.keyword} className="flex flex-col gap-1 px-6 py-4">
                                        <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                                            <Icon name="telegram" className="h-4 w-4" />
                                            {item.keyword}
                                        </span>
                                        <span className="text-sm text-slate-600">{item.description}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="surface-card flex flex-col">
                            <div className="border-b border-slate-100 px-6 py-4">
                                <h2 className="text-lg font-semibold text-slate-950">Log Pesan Telegram</h2>
                                <p className="text-sm text-slate-500">20 pesan Telegram terbaru untuk akun Anda.</p>
                            </div>
                            <div className="flex-1 overflow-y-auto" style={{ maxHeight: '32rem' }}>
                                <table className="min-w-full divide-y divide-slate-100">
                                    <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] font-semibold uppercase text-slate-500">
                                        <tr>
                                            <th className="px-4 py-3">Waktu</th>
                                            <th className="px-4 py-3">Arah</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3">Pesan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {messages.map((message) => (
                                            <tr key={message.id} className="hover:bg-slate-50">
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                                                    {formatDateTime(message.created_at)}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-xs">
                                                    <span
                                                        className={`rounded-full px-2 py-1 font-semibold uppercase ${
                                                            message.direction === 'inbound'
                                                                ? 'bg-blue-50 text-primary-700'
                                                                : 'bg-emerald-50 text-success'
                                                        }`}
                                                    >
                                                        {message.direction === 'inbound' ? 'Masuk' : 'Keluar'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-xs uppercase text-slate-500">
                                                    {message.status ?? '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">
                                                    <span className="line-clamp-2 break-words">{message.message}</span>
                                                </td>
                                            </tr>
                                        ))}
                                        {messages.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500">
                                                    Belum ada log pesan Telegram.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
