import DangerButton from '@/Components/DangerButton';
import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import SecondaryButton from '@/Components/SecondaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { confirmAction, confirmDelete, toastSuccess } from '@/Utils/swal';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';

const formatDateTime = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          }).format(new Date(value))
        : '-';

function SettingCard({ title, description, children, action }) {
    return (
        <section className="surface-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
                <div>
                    <h2 className="text-base font-semibold text-slate-950 sm:text-lg">{title}</h2>
                    {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
                </div>
                {action}
            </div>
            <div className="p-5 sm:p-6">{children}</div>
        </section>
    );
}

function StatPill({ label, value, icon }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                    <Icon name={icon} className="h-4 w-4" />
                </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">{value}</p>
        </div>
    );
}

export default function Index({ stats, telegram, preferences, status }) {
    const { auth, flash } = usePage().props;
    const user = auth.user;
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const profileForm = useForm({
        name: user.name,
        email: user.email,
        phone: user.phone ?? '',
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    const deleteForm = useForm({
        password: '',
    });

    const submitProfile = (event) => {
        event.preventDefault();
        profileForm.patch(route('profile.update'), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Profil berhasil disimpan'),
        });
    };

    const submitPassword = (event) => {
        event.preventDefault();
        passwordForm.put(route('password.update'), {
            preserveScroll: true,
            onSuccess: () => {
                passwordForm.reset();
                toastSuccess('Password berhasil diperbarui');
            },
        });
    };

    const unlinkTelegram = async () => {
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

    const openDeleteAccount = async () => {
        const confirmed = await confirmAction({
            title: 'Buka form hapus akun?',
            text: 'Anda perlu memasukkan password sebelum akun dihapus permanen.',
            confirmButtonText: 'Buka form',
            icon: 'warning',
        });
        if (!confirmed) return;
        deleteForm.reset();
        deleteForm.clearErrors();
        setShowDeleteModal(true);
    };

    const submitDeleteAccount = async (event) => {
        event.preventDefault();
        const confirmed = await confirmDelete({
            title: 'Hapus akun permanen?',
            text: 'Semua data finansial, dompet, transaksi, tagihan, dan integrasi bot akan ikut terhapus.',
            confirmButtonText: 'Ya, hapus akun',
        });
        if (!confirmed) return;

        deleteForm.delete(route('profile.destroy'), {
            preserveScroll: true,
            onError: () => setShowDeleteModal(true),
        });
    };

    const commandExamples = [
        'keluar 25000 makan siang',
        'masuk 1500000 gaji freelance',
        'transfer 50000 dari BCA ke Gopay',
        'saldo',
        'tagihan',
    ];

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-16 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />
                    <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">Account Control</p>
                            <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-950 sm:text-3xl">Settings</h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                Atur profil, keamanan akun, preferensi laporan, dan kesiapan integrasi bot sebelum deploy ke hosting.
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Link
                                href={route('telegram.index')}
                                className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700"
                            >
                                <Icon name="telegram" className="h-4 w-4" />
                                Telegram
                            </Link>
                        </div>
                    </div>
                </section>
            }
        >
            <Head title="Settings" />

            <div className="page-shell">
                <div className="page-container">
                    {(flash?.success || status) && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-success">
                            {flash?.success ?? status}
                        </div>
                    )}

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatPill label="Dompet Aktif" value={`${stats.activeWallets}/${stats.wallets}`} icon="wallet" />
                        <StatPill label="Kategori" value={stats.categories} icon="filter" />
                        <StatPill label="Transaksi" value={stats.transactions} icon="transactions" />
                        <StatPill label="Tagihan Aktif" value={stats.activeBills} icon="bills" />
                    </section>

                    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
                        <div className="space-y-6">
                            <SettingCard
                                title="Profil Akun"
                                description="Identitas ini dipakai untuk login, laporan, dan pengiriman notifikasi."
                            >
                                <form onSubmit={submitProfile} className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="label-tiny">Nama</label>
                                        <input
                                            className="form-input mt-1"
                                            value={profileForm.data.name}
                                            onChange={(event) => profileForm.setData('name', event.target.value)}
                                            autoComplete="name"
                                            required
                                        />
                                        <InputError message={profileForm.errors.name} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="label-tiny">Email</label>
                                        <input
                                            type="email"
                                            className="form-input mt-1"
                                            value={profileForm.data.email}
                                            onChange={(event) => profileForm.setData('email', event.target.value)}
                                            autoComplete="username"
                                            required
                                        />
                                        <InputError message={profileForm.errors.email} className="mt-1" />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="label-tiny">Nomor WhatsApp</label>
                                        <input
                                            type="tel"
                                            className="form-input mt-1"
                                            value={profileForm.data.phone}
                                            onChange={(event) => profileForm.setData('phone', event.target.value)}
                                            placeholder="+62 812 3456 7890"
                                            autoComplete="tel"
                                        />
                                        <InputError message={profileForm.errors.phone} className="mt-1" />
                                    </div>
                                    <div className="flex items-center gap-3 sm:col-span-2">
                                        <PrimaryButton disabled={profileForm.processing}>Simpan Profil</PrimaryButton>
                                        {profileForm.recentlySuccessful && (
                                            <span className="text-sm font-medium text-success">Tersimpan.</span>
                                        )}
                                    </div>
                                </form>
                            </SettingCard>

                            <SettingCard
                                title="Keamanan Akun"
                                description="Gunakan password kuat untuk melindungi akses ke data finansial pribadi."
                            >
                                <form onSubmit={submitPassword} className="grid gap-4 sm:grid-cols-3">
                                    <div>
                                        <label className="label-tiny">Password saat ini</label>
                                        <input
                                            type="password"
                                            className="form-input mt-1"
                                            value={passwordForm.data.current_password}
                                            onChange={(event) => passwordForm.setData('current_password', event.target.value)}
                                            autoComplete="current-password"
                                        />
                                        <InputError message={passwordForm.errors.current_password} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="label-tiny">Password baru</label>
                                        <input
                                            type="password"
                                            className="form-input mt-1"
                                            value={passwordForm.data.password}
                                            onChange={(event) => passwordForm.setData('password', event.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={passwordForm.errors.password} className="mt-1" />
                                    </div>
                                    <div>
                                        <label className="label-tiny">Konfirmasi</label>
                                        <input
                                            type="password"
                                            className="form-input mt-1"
                                            value={passwordForm.data.password_confirmation}
                                            onChange={(event) => passwordForm.setData('password_confirmation', event.target.value)}
                                            autoComplete="new-password"
                                        />
                                        <InputError message={passwordForm.errors.password_confirmation} className="mt-1" />
                                    </div>
                                    <div className="flex items-center gap-3 sm:col-span-3">
                                        <PrimaryButton disabled={passwordForm.processing}>Update Password</PrimaryButton>
                                        {passwordForm.recentlySuccessful && (
                                            <span className="text-sm font-medium text-success">Password diperbarui.</span>
                                        )}
                                    </div>
                                </form>
                            </SettingCard>

                            <SettingCard
                                title="Preferensi Laporan"
                                description="Default aplikasi mengikuti PRD versi awal: Rupiah, Bahasa Indonesia, dan laporan bulanan."
                            >
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="label-tiny">Mata Uang</p>
                                        <p className="mt-2 font-semibold text-slate-950">{preferences.currency}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="label-tiny">Locale</p>
                                        <p className="mt-2 font-semibold text-slate-950">{preferences.locale}</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="label-tiny">Periode Default</p>
                                        <p className="mt-2 font-semibold text-slate-950">Bulanan</p>
                                    </div>
                                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="label-tiny">Reminder</p>
                                        <p className="mt-2 font-semibold text-slate-950">{preferences.reminderDaysBefore} hari sebelum</p>
                                    </div>
                                </div>
                            </SettingCard>
                        </div>

                        <aside className="space-y-6">
                            <SettingCard
                                title="Telegram Bot"
                                description="Alternatif command transaksi dan reminder via Telegram."
                                action={
                                    <span
                                        className={`badge-soft ${
                                            telegram.chatLinked ? 'bg-emerald-50 text-success' : 'bg-amber-50 text-warning'
                                        }`}
                                    >
                                        {telegram.chatLinked ? 'Terhubung' : 'Belum Terhubung'}
                                    </span>
                                }
                            >
                                <div className="space-y-4 text-sm">
                                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                                        <p className="label-tiny">Bot Username</p>
                                        <p className="mt-2 font-semibold text-slate-950">
                                            {telegram.username ? `@${telegram.username.replace(/^@/, '')}` : 'Belum dikonfigurasi'}
                                        </p>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-500">Chat linked</span>
                                        <span className="font-semibold text-slate-900">{telegram.chatLinked ? 'Ya' : 'Belum'}</span>
                                    </div>
                                    {telegram.chatId && (
                                        <div className="flex justify-between gap-3">
                                            <span className="text-slate-500">Chat ID</span>
                                            <span className="max-w-[12rem] truncate text-right font-semibold text-slate-900">{telegram.chatId}</span>
                                        </div>
                                    )}
                                    <div className="flex flex-col gap-2">
                                        <Link
                                            href={route('telegram.index')}
                                            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-500"
                                        >
                                            <Icon name="telegram" className="h-4 w-4" />
                                            Kelola Telegram
                                        </Link>
                                        {telegram.chatLinked && (
                                            <SecondaryButton type="button" onClick={unlinkTelegram}>
                                                Lepas Tautan
                                            </SecondaryButton>
                                        )}
                                    </div>
                                </div>
                            </SettingCard>

                            <SettingCard title="Command Cepat" description="Keyword sesuai PRD yang didukung bot.">
                                <div className="space-y-2">
                                    {commandExamples.map((command) => (
                                        <code
                                            key={command}
                                            className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700"
                                        >
                                            {command}
                                        </code>
                                    ))}
                                </div>
                            </SettingCard>

                            <SettingCard title="Zona Bahaya" description="Kelola risiko akun dengan hati-hati.">
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-500">
                                        Menghapus akun akan menghapus data finansial, integrasi bot, dan seluruh riwayat terkait akun.
                                    </p>
                                    <DangerButton type="button" onClick={openDeleteAccount}>
                                        <Icon name="trash" className="h-4 w-4" />
                                        Hapus Akun
                                    </DangerButton>
                                </div>
                            </SettingCard>
                        </aside>
                    </div>
                </div>
            </div>

            <Modal show={showDeleteModal} onClose={() => setShowDeleteModal(false)} maxWidth="md">
                <div className="overflow-hidden rounded-2xl bg-white">
                    <div className="border-b border-rose-100 bg-rose-50 px-5 py-4 sm:px-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-danger">Zona Bahaya</p>
                                <h2 className="mt-1 text-lg font-bold text-slate-950">Hapus Akun Permanen</h2>
                                <p className="mt-1 text-sm text-slate-600">
                                    Masukkan password untuk mengonfirmasi penghapusan akun.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(false)}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
                                aria-label="Tutup modal"
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={submitDeleteAccount} className="space-y-4 px-5 py-5 sm:px-6">
                        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                            Tindakan ini tidak bisa dibatalkan setelah berhasil diproses.
                        </div>
                        <div>
                            <label className="label-tiny">Password</label>
                            <input
                                type="password"
                                className="form-input mt-1"
                                value={deleteForm.data.password}
                                onChange={(event) => deleteForm.setData('password', event.target.value)}
                                autoComplete="current-password"
                                autoFocus
                            />
                            <InputError message={deleteForm.errors.password} className="mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                            <SecondaryButton type="button" onClick={() => setShowDeleteModal(false)}>
                                Batal
                            </SecondaryButton>
                            <DangerButton type="submit" disabled={deleteForm.processing}>
                                {deleteForm.processing ? 'Menghapus...' : 'Hapus Akun'}
                            </DangerButton>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}
