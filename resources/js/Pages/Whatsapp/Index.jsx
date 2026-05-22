import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import DangerButton from '@/Components/DangerButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { confirmAction, toastSuccess } from '@/Utils/swal';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

const formatDateTime = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : '-';

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
    return <span className="text-xs font-semibold text-primary-700">Kedaluwarsa dalam {minutes}:{seconds}</span>;
}

function calc(expiresAt) {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
}

export default function Index({ botPhone, keywords = [], verification, messages = [] }) {
    const { flash } = usePage().props;

    const phoneForm = useForm({
        phone: verification?.phone ?? '',
    });

    const codeForm = useForm({
        code: '',
    });

    const submitPhone = (event) => {
        event.preventDefault();
        phoneForm.post(route('whatsapp.request-otp'), { preserveScroll: true });
    };

    const submitCode = (event) => {
        event.preventDefault();
        codeForm.post(route('whatsapp.verify'), {
            preserveScroll: true,
            onSuccess: () => codeForm.reset(),
        });
    };

    const unlink = async () => {
        const confirmed = await confirmAction({
            title: 'Lepas tautan WhatsApp?',
            text: 'Nomor ini tidak akan terhubung lagi dengan akun FinTrack.',
            confirmButtonText: 'Lepas',
            icon: 'warning',
        });
        if (!confirmed) return;
        router.delete(route('whatsapp.unlink'), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Tautan WhatsApp dilepas'),
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-semibold text-primary-600">FinTrack</p>
                    <h1 className="text-2xl font-semibold leading-tight sm:text-3xl text-slate-950">WhatsApp</h1>
                    <p className="text-sm text-slate-500">
                        Hubungkan nomor WhatsApp untuk pengingat tagihan dan pencatatan transaksi via chat ke bot resmi.
                    </p>
                </div>
            }
        >
            <Head title="WhatsApp" />

            <div className="space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
                {flash?.success && (
                    <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                        {flash.success}
                    </div>
                )}

                <section className="grid gap-4 lg:grid-cols-3">
                    <div className="surface-card-padded">
                        <p className="text-xs font-semibold uppercase text-slate-500">Bot resmi</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{botPhone}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Simpan kontak ini untuk mengirim perintah keuangan.
                        </p>
                    </div>
                    <div className="surface-card-padded">
                        <p className="text-xs font-semibold uppercase text-slate-500">Status</p>
                        <p className={`mt-2 text-2xl font-semibold ${verification?.is_verified ? 'text-success' : 'text-warning'}`}>
                            {verification?.is_verified ? 'Terverifikasi' : 'Belum diverifikasi'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {verification?.verified_at
                                ? `Diverifikasi ${formatDateTime(verification.verified_at)}`
                                : 'Selesaikan verifikasi OTP untuk membuka semua perintah.'}
                        </p>
                    </div>
                    <div className="surface-card-padded">
                        <p className="text-xs font-semibold uppercase text-slate-500">Nomor terhubung</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-950">{verification?.phone ?? '-'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                            Pastikan nomor aktif dan dapat menerima pesan WhatsApp.
                        </p>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="surface-card">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-950">Verifikasi nomor</h2>
                            <p className="text-sm text-slate-500">
                                Masukkan nomor WhatsApp Anda, lalu konfirmasi kode 6-digit yang dikirim ke chat.
                            </p>
                        </div>
                        <form onSubmit={submitPhone} className="grid gap-3 px-6 py-5">
                            <label className="text-xs font-semibold uppercase text-slate-500">Nomor WhatsApp</label>
                            <input
                                className="rounded-md border-slate-300 text-sm focus:border-primary-500 focus:ring-primary-500"
                                value={phoneForm.data.phone}
                                onChange={(event) => phoneForm.setData('phone', event.target.value)}
                                placeholder="+62 812 3456 7890"
                            />
                            <InputError message={phoneForm.errors.phone} />
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <PrimaryButton type="submit" disabled={phoneForm.processing}>
                                    Kirim Kode OTP
                                </PrimaryButton>
                                {verification?.is_verified && (
                                    <DangerButton type="button" onClick={unlink}>
                                        Lepas Tautan
                                    </DangerButton>
                                )}
                            </div>
                        </form>

                        <form onSubmit={submitCode} className="grid gap-3 border-t border-slate-100 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold uppercase text-slate-500">Kode OTP</label>
                                <CountdownBadge expiresAt={verification?.pending_until} />
                            </div>
                            <input
                                inputMode="numeric"
                                maxLength={6}
                                className="rounded-md border-slate-300 text-center text-lg font-semibold tracking-widest text-slate-900 focus:border-primary-500 focus:ring-primary-500"
                                value={codeForm.data.code}
                                onChange={(event) => codeForm.setData('code', event.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                            />
                            <InputError message={codeForm.errors.code} />
                            <div>
                                <PrimaryButton type="submit" disabled={codeForm.processing || !verification?.has_code}>
                                    Konfirmasi Kode
                                </PrimaryButton>
                            </div>
                            {!verification?.has_code && (
                                <p className="text-xs text-slate-500">
                                    Belum ada kode aktif. Kirim ulang permintaan OTP terlebih dahulu.
                                </p>
                            )}
                        </form>
                    </div>

                    <div className="surface-card">
                        <div className="border-b border-slate-100 px-6 py-4">
                            <h2 className="text-lg font-semibold text-slate-950">Perintah yang didukung</h2>
                            <p className="text-sm text-slate-500">
                                Kirim pesan ke {botPhone} dengan format berikut.
                            </p>
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {keywords.map((item) => (
                                <li key={item.keyword} className="flex flex-col gap-1 px-6 py-4">
                                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700">
                                        <Icon name="whatsapp" className="h-4 w-4" />
                                        /{item.keyword}
                                    </span>
                                    <span className="text-sm text-slate-600">{item.description}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                <section className="surface-card">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-950">Log Pesan Terbaru</h2>
                            <p className="text-sm text-slate-500">
                                Catatan pesan keluar dan masuk yang melibatkan akun Anda.
                            </p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Waktu</th>
                                    <th className="px-4 py-3">Arah</th>
                                    <th className="px-4 py-3">Nomor</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Pesan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {messages.map((message) => (
                                    <tr key={message.id} className="hover:bg-slate-50">
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{formatDateTime(message.created_at)}</td>
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
                                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{message.phone}</td>
                                        <td className="whitespace-nowrap px-4 py-3 text-xs uppercase text-slate-500">{message.status ?? '-'}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{message.message}</td>
                                    </tr>
                                ))}
                                {messages.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                                            Belum ada log pesan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </AuthenticatedLayout>
    );
}
