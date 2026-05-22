import Icon from '@/Components/Icon';
import { Head, Link } from '@inertiajs/react';

const features = [
    {
        title: 'Integrasi Telegram',
        description:
            'Catat transaksi dan terima reminder tagihan langsung lewat bot Telegram FinTrack.',
        icon: 'telegram',
        tone: 'from-primary-600/20 to-sky-400/10',
        iconClass: 'bg-primary-500/15 text-primary-300 ring-primary-400/20',
    },
    {
        title: 'Manajemen Cicilan',
        description:
            'Kelola paylater, kartu kredit, KPR, pinjaman, dan tagihan berulang dalam satu tempat.',
        icon: 'bills',
        tone: 'from-emerald-500/15 to-primary-500/10',
        iconClass: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/20',
    },
    {
        title: 'Laporan Otomatis',
        description:
            'Analisis pemasukan, pengeluaran, kategori terbesar, dan cashflow secara visual.',
        icon: 'reports',
        tone: 'from-amber-500/15 to-primary-500/10',
        iconClass: 'bg-amber-500/15 text-amber-300 ring-amber-400/20',
    },
];

const stats = [
    {
        value: '10.000+',
        label: 'Pengguna Aktif',
    },
    {
        value: '99%',
        label: 'Reminder Tepat Waktu',
        highlight: true,
    },
    {
        value: 'Rp 50M+',
        label: 'Transaksi Tercatat',
    },
    {
        value: '4.9/5',
        label: 'Rating Kepuasan',
    },
];

const steps = [
    {
        title: 'Register',
        description: 'Buat akun gratis dalam beberapa langkah sederhana.',
        icon: 'user',
    },
    {
        title: 'Tambah Tagihan',
        description: 'Masukkan cicilan, tagihan, atau hutang yang ingin dipantau.',
        icon: 'plus',
    },
    {
        title: 'Terima Reminder',
        description: 'FinTrack akan membantu mengingatkan sebelum jatuh tempo.',
        icon: 'bell',
        active: true,
    },
];

const dashboardPreviewStats = [
    {
        label: 'Pemasukan',
        value: 'Rp 8,5JT',
        caption: 'May 2026',
        icon: 'arrowDown',
        tone: 'text-emerald-600',
        iconClass: 'bg-emerald-50 text-emerald-600',
    },
    {
        label: 'Pengeluaran',
        value: 'Rp 6,05JT',
        caption: 'May 2026',
        icon: 'arrowUp',
        tone: 'text-rose-600',
        iconClass: 'bg-rose-50 text-rose-600',
    },
    {
        label: 'Saldo',
        value: 'Rp 12,45JT',
        caption: '4 dompet aktif',
        icon: 'wallet',
        featured: true,
    },
    {
        label: 'Tagihan',
        value: '6',
        caption: '2 jatuh tempo',
        icon: 'calendar',
        tone: 'text-amber-600',
        iconClass: 'bg-amber-50 text-amber-600',
    },
];

const dashboardPreviewChart = [
    { month: 'Des', income: 58, expense: 49 },
    { month: 'Jan', income: 62, expense: 53 },
    { month: 'Feb', income: 65, expense: 51 },
    { month: 'Mar', income: 70, expense: 56 },
    { month: 'Apr', income: 78, expense: 59 },
    { month: 'Mei', income: 85, expense: 60 },
];

const dashboardPreviewBills = [
    {
        title: 'Cicilan Motor',
        group: 'Cicilan Bulanan',
        amount: 'Rp 1.250.000',
        due: '21 Mei',
        urgent: true,
    },
    {
        title: 'Internet Rumah',
        group: 'Tagihan Rumah',
        amount: 'Rp 350.000',
        due: '23 Mei',
    },
    {
        title: 'Listrik PLN',
        group: 'Tagihan Rumah',
        amount: 'Rp 285.000',
        due: '25 Mei',
    },
];

export default function Welcome({ auth }) {
    const isAuthed = Boolean(auth?.user);
    const primaryHref = isAuthed ? route('dashboard') : route('register');

    return (
        <>
            <Head title="FinTrack Pro — Kelola Keuangan Tanpa Lupa" />

            <div className="min-h-screen bg-slate-50 text-slate-950">
                <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/95 backdrop-blur-xl">
                    <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-6 lg:px-8">
                        <Link href="/" className="flex items-center gap-2.5">
                            <img
                                src="/logoKecil.png"
                                alt="FinTrack Pro"
                                className="h-8 w-8 rounded-lg object-contain"
                            />

                            <span className="text-base font-bold text-white">
                                FinTrack Pro
                            </span>
                        </Link>

                        <div className="flex items-center gap-2">
                            {isAuthed ? (
                                <Link
                                    href={route('dashboard')}
                                    className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:bg-primary-500"
                                >
                                    Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={route('login')}
                                        className="hidden rounded-full px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white sm:inline-flex"
                                    >
                                        Masuk
                                    </Link>

                                    <Link
                                        href={route('register')}
                                        className="inline-flex items-center justify-center rounded-full bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:bg-primary-500"
                                    >
                                        Daftar Gratis
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </header>

                <main>
                    <section className="relative overflow-hidden bg-slate-950">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.35),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.20),transparent_30%)]" />
                        <div className="absolute inset-0 opacity-[0.13] [background-image:radial-gradient(#60a5fa_1px,transparent_1px)] [background-size:24px_24px]" />

                        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-24">
                            <div>
                                <div className="inline-flex items-center gap-2 rounded-full border border-primary-400/20 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-wide text-primary-100 shadow-lg shadow-slate-950/20 backdrop-blur">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-500/15 text-primary-300">
                                        <Icon name="zap" className="h-3.5 w-3.5" />
                                    </span>
                                    Solusi Keuangan Modern
                                </div>

                                <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl lg:leading-[1.02]">
                                    Kelola Keuangan Tanpa Lupa, Bayar Tagihan Tepat Waktu.
                                </h1>

                                <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                                    Satu platform untuk mencatat transaksi, mengelola cicilan,
                                    memantau dompet, dan menerima pengingat otomatis agar cashflow
                                    tetap aman.
                                </p>

                                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                    <Link
                                        href={primaryHref}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-primary-600/30 transition hover:-translate-y-0.5 hover:bg-primary-500"
                                    >
                                        {isAuthed ? 'Buka Dashboard' : 'Mulai Sekarang'}
                                        <Icon name="arrowRight" className="h-4 w-4" />
                                    </Link>

                                </div>
                            </div>

                            <HeroDashboardPreview />
                        </div>

                        <div className="relative border-t border-white/10 bg-slate-950/90">
                            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-8 sm:px-6 md:grid-cols-4 lg:px-8">
                                {stats.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="text-center md:border-r md:border-white/10 last:md:border-r-0"
                                    >
                                        <p
                                            className={`text-3xl font-black sm:text-4xl ${
                                                stat.highlight
                                                    ? 'text-emerald-400'
                                                    : 'text-primary-400'
                                            }`}
                                        >
                                            {stat.value}
                                        </p>
                                        <p className="mt-2 text-xs font-semibold text-slate-300">
                                            {stat.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section
                        id="fitur"
                        className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8"
                    >
                        <div className="mx-auto max-w-2xl text-center">
                            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                Fitur Unggulan FinTrack Pro
                            </h2>

                            <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">
                                Desain modern yang menyederhanakan pencatatan transaksi,
                                pemantauan tagihan, dan laporan keuangan personal.
                            </p>
                        </div>

                        <div className="mt-12 grid gap-6 md:grid-cols-3">
                            {features.map((feature) => (
                                <article
                                    key={feature.title}
                                    className="group relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-xl shadow-slate-200/70 transition hover:-translate-y-1 hover:shadow-2xl"
                                >
                                    <div
                                        className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${feature.tone} blur-sm transition group-hover:scale-110`}
                                    />

                                    <div className="relative">
                                        <span
                                            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${feature.iconClass}`}
                                        >
                                            <Icon name={feature.icon} className="h-5 w-5" />
                                        </span>

                                        <h3 className="mt-8 text-lg font-black">
                                            {feature.title}
                                        </h3>

                                        <p className="mt-4 text-sm leading-7 text-slate-300">
                                            {feature.description}
                                        </p>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section className="mx-auto max-w-5xl px-5 py-8 sm:px-6 sm:py-12 lg:px-8">
                        <div className="text-center">
                            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                                Tiga Langkah Mudah
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-8 md:grid-cols-3 md:gap-4">
                            {steps.map((step, index) => (
                                <div key={step.title} className="relative text-center">
                                    {index < steps.length - 1 && (
                                        <div className="absolute left-1/2 top-8 hidden h-px w-full bg-slate-200 md:block" />
                                    )}

                                    <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-xl shadow-slate-200 ring-1 ring-slate-200">
                                        <span
                                            className={`flex h-12 w-12 items-center justify-center rounded-full ${
                                                step.active
                                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                                                    : 'bg-white text-slate-700'
                                            }`}
                                        >
                                            <Icon name={step.icon} className="h-5 w-5" />
                                        </span>
                                    </div>

                                    <h3 className="mt-5 text-lg font-black text-slate-950">
                                        {index + 1}. {step.title}
                                    </h3>

                                    <p className="mt-2 text-sm leading-6 text-slate-500">
                                        {step.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {!isAuthed && (
                        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 sm:py-20 lg:px-8">
                            <div className="relative overflow-hidden rounded-[2rem] border border-primary-400/20 bg-gradient-to-br from-slate-950 via-primary-900 to-primary-600 px-6 py-14 text-center text-white shadow-2xl shadow-primary-900/25 sm:px-10 sm:py-16">
                                <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" />
                                <div className="absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-primary-300/20 blur-3xl" />

                                <div className="relative mx-auto max-w-3xl">
                                    <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
                                        Siap Ambil Kendali Keuangan Anda?
                                    </h2>

                                    <p className="mt-5 text-sm leading-7 text-primary-50 sm:text-base">
                                        Bergabunglah dengan pengguna lain yang ingin lebih tenang
                                        mengatur transaksi, tagihan, hutang, dan cashflow bulanan.
                                    </p>

                                    <div className="mt-8 flex justify-center">
                                        <Link
                                            href={route('register')}
                                            className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-primary-700 shadow-xl shadow-slate-950/20 transition hover:-translate-y-0.5 hover:brightness-105"
                                        >
                                            Daftar Sekarang — Gratis
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </main>

                <footer className="border-t border-slate-800 bg-slate-950">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-sm text-slate-300 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
                        <div className="flex items-center gap-2">
                            <img
                                src="/logoKecil.png"
                                alt="FinTrack Pro"
                                className="h-7 w-7 rounded-lg object-contain"
                            />

                            <span className="font-bold text-white">
                                FinTrack Pro © {new Date().getFullYear()}
                            </span>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-400">
                            <a href="#" className="transition hover:text-white">
                                Kebijakan Privasi
                            </a>
                            <a href="#" className="transition hover:text-white">
                                Syarat & Ketentuan
                            </a>
                            <a href="#" className="transition hover:text-white">
                                Hubungi Kami
                            </a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}

function HeroDashboardPreview() {
    return (
        <div className="relative">
            <div className="absolute -inset-6 rounded-[2.5rem] bg-primary-500/20 blur-3xl" />
            <div className="absolute -right-4 -top-4 h-28 w-28 rounded-full bg-sky-400/20 blur-2xl" />
            <div className="absolute -bottom-6 left-10 h-32 w-32 rounded-full bg-primary-300/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 p-3 shadow-2xl shadow-slate-950/50 backdrop-blur">
                <div className="overflow-hidden rounded-[1.55rem] border border-slate-700/80 bg-slate-100">
                    <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
                        <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                        </div>

                        <span className="rounded-full bg-primary-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-primary-200">
                            Dashboard Preview
                        </span>
                    </div>

                    <div className="bg-slate-100 p-4 sm:p-5">
                        <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary-700">
                                        <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />
                                        FinTrack Overview
                                    </span>

                                    <h3 className="mt-3 text-xl font-black tracking-tight text-slate-950">
                                        Ringkasan Finansial
                                    </h3>

                                    <p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">
                                        Pantau saldo, cashflow, dan tagihan dalam satu tempat.
                                    </p>
                                </div>

                                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                                        Sisa Cashflow
                                    </p>
                                    <p className="mt-1 text-lg font-black text-emerald-700">
                                        + Rp 2,45JT
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                            {dashboardPreviewStats.map((stat) => (
                                <MiniStatCard key={stat.label} {...stat} />
                            ))}
                        </div>

                        <div className="mt-3 grid gap-3 xl:grid-cols-[1.35fr_0.9fr]">
                            <MiniCashflowChart />
                            <MiniUpcomingBills />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MiniStatCard({
    label,
    value,
    caption,
    icon,
    tone,
    iconClass,
    featured = false,
}) {
    return (
        <div
            className={`relative overflow-hidden rounded-2xl p-4 shadow-sm ring-1 ${
                featured
                    ? 'bg-gradient-to-br from-primary-700 via-primary-600 to-sky-500 text-white ring-primary-500'
                    : 'bg-white text-slate-950 ring-slate-200'
            }`}
        >
            <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-white/20 blur-xl" />

            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p
                        className={`text-[9px] font-black uppercase tracking-[0.16em] ${
                            featured ? 'text-primary-100' : 'text-slate-400'
                        }`}
                    >
                        {label}
                    </p>

                    <p
                        className={`mt-2 truncate text-lg font-black ${
                            featured ? 'text-white' : tone
                        }`}
                    >
                        {value}
                    </p>
                </div>

                <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        featured ? 'bg-white/20 text-white' : iconClass
                    }`}
                >
                    <Icon name={icon} className="h-4 w-4" />
                </span>
            </div>

            <p
                className={`relative mt-3 text-[10px] font-semibold ${
                    featured ? 'text-primary-100' : 'text-slate-500'
                }`}
            >
                {caption}
            </p>
        </div>
    );
}

function MiniCashflowChart() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary-700">
                        Cashflow
                    </span>

                    <h3 className="mt-2 text-sm font-black text-slate-950">
                        Pemasukan vs Pengeluaran
                    </h3>
                </div>

                <span className="text-[10px] font-bold text-slate-400">
                    6 Bulan
                </span>
            </div>

            <div className="mt-4 flex h-36 items-end gap-2 rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 p-3">
                {dashboardPreviewChart.map((row) => (
                    <div
                        key={row.month}
                        className="flex h-full flex-1 flex-col justify-end gap-1.5"
                    >
                        <div className="flex flex-1 items-end justify-center gap-1">
                            <div
                                className="w-full max-w-4 rounded-t-lg bg-gradient-to-t from-primary-700 to-primary-400"
                                style={{ height: `${row.income}%` }}
                            />
                            <div
                                className="w-full max-w-4 rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-200"
                                style={{ height: `${row.expense}%` }}
                            />
                        </div>

                        <span className="text-center text-[9px] font-bold uppercase text-slate-400">
                            {row.month}
                        </span>
                    </div>
                ))}
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-2.5 py-1 text-primary-700">
                    <span className="h-2 w-2 rounded-full bg-primary-600" />
                    Masuk
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    Keluar
                </span>
            </div>
        </div>
    );
}

function MiniUpcomingBills() {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-slate-950">
                    Tagihan Terdekat
                </h3>

                <span className="text-[10px] font-black text-primary-700">
                    Lihat Semua
                </span>
            </div>

            <div className="mt-4 space-y-2.5">
                {dashboardPreviewBills.map((bill) => (
                    <div
                        key={bill.title}
                        className={`rounded-2xl border p-3 ${
                            bill.urgent
                                ? 'border-amber-100 bg-amber-50/60'
                                : 'border-slate-100 bg-slate-50/60'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            <span
                                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                                    bill.urgent
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-primary-50 text-primary-700'
                                }`}
                            >
                                <Icon name="bills" className="h-4 w-4" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-black text-slate-950">
                                    {bill.title}
                                </p>
                                <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">
                                    {bill.group}
                                </p>
                            </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-xs font-black text-slate-950">
                                {bill.amount}
                            </p>

                            <p
                                className={`text-[10px] font-bold ${
                                    bill.urgent ? 'text-amber-700' : 'text-slate-400'
                                }`}
                            >
                                {bill.due}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
