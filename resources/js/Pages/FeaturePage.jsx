import Icon from '@/Components/Icon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';

const config = {
    Dompet: {
        icon: 'wallet',
        hook: 'Semua saldo, satu kendali.',
        stats: ['3 dompet aktif', 'Rp32.500.000 saldo', '2 transfer minggu ini'],
    },
    Transaksi: {
        icon: 'transactions',
        hook: 'Catat cepat. Baca jelas. Putuskan lebih tenang.',
        stats: ['124 transaksi', '8 kategori', '4 filter aktif'],
    },
    Tagihan: {
        icon: 'bills',
        hook: 'Tidak ada lagi tagihan yang datang sebagai kejutan.',
        stats: ['4 aktif', '1 jatuh tempo besok', '89% tepat waktu'],
    },
    WhatsApp: {
        icon: 'whatsapp',
        hook: 'Reminder masuk ke tempat yang pasti Anda buka.',
        stats: ['Nomor terhubung', '12 reminder siap', '0 pesan gagal'],
    },
    Laporan: {
        icon: 'reports',
        hook: 'Laporan yang bisa dibaca sebelum kopi habis.',
        stats: ['Bulanan', 'Kategori', 'Tagihan'],
    },
    Settings: {
        icon: 'settings',
        hook: 'Atur ritme aplikasi sesuai kebiasaan finansial Anda.',
        stats: ['Profil', 'Reminder', 'Keamanan'],
    },
};

export default function FeaturePage({ title, emptyTitle, emptyBody }) {
    const page = config[title] ?? config.Transaksi;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-primary-600">
                            FinTrack Pro
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold leading-tight sm:text-3xl text-slate-950">
                            {title}
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm text-slate-600">
                            {page.hook}
                        </p>
                    </div>
                    <button className="inline-flex w-fit items-center gap-2 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-700/20 transition hover:-translate-y-0.5 hover:bg-primary-700">
                        <Icon name="plus" className="h-4 w-4" />
                        Tambah Data
                    </button>
                </div>
            }
        >
            <Head title={title} />

            <div className="px-4 py-8 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <section className="grid gap-4 md:grid-cols-3">
                        {page.stats.map((item, index) => (
                            <div
                                key={item}
                                className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                                    index === 0 ? 'animate-in' : index === 1 ? 'animate-in-delay-1' : 'animate-in-delay-2'
                                }`}
                            >
                                <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                                    <Icon name={page.icon} className="h-5 w-5" />
                                </div>
                                <p className="mt-5 text-lg font-semibold text-slate-950">
                                    {item}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Siap dihubungkan ke data asli modul {title.toLowerCase()}.
                                </p>
                            </div>
                        ))}
                    </section>

                    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm animate-in-delay-2">
                        <div className="border-b border-slate-200 px-6 py-5">
                            <h2 className="text-xl font-semibold text-slate-950">
                                {emptyTitle}
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                                {emptyBody}
                            </p>
                        </div>

                        <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
                            <div className="p-6">
                                <div className="grid gap-3">
                                    {[1, 2, 3, 4].map((row) => (
                                        <div
                                            key={row}
                                            className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-4 py-4"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="h-10 w-10 rounded-md bg-white shadow-sm" />
                                                <div>
                                                    <span className="block h-3 w-36 rounded-full bg-slate-200" />
                                                    <span className="mt-2 block h-2 w-24 rounded-full bg-slate-100" />
                                                </div>
                                            </div>
                                            <span className="h-8 w-20 rounded-full bg-primary-50" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-slate-200 bg-slate-50 p-6 lg:border-l lg:border-t-0">
                                <div className="rounded-lg bg-dark p-5 text-white">
                                    <p className="text-sm font-semibold">
                                        Hook modul
                                    </p>
                                    <p className="mt-3 text-2xl font-semibold leading-tight">
                                        {page.hook}
                                    </p>
                                    <div className="mt-6 h-2 rounded-full bg-white/10">
                                        <div className="h-2 w-2/3 rounded-full bg-primary-500 animate-soft-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
