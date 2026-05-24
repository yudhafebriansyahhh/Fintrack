import Icon from '@/Components/Icon';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';

const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const formatCompactRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value ?? 0));

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          }).format(new Date(value))
        : '-';

const dueLabel = (date) => {
    if (!date) return '-';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(date);
    due.setHours(0, 0, 0, 0);

    const diff = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (diff === 0) return 'Jatuh tempo hari ini';
    if (diff === 1) return 'Jatuh tempo besok';
    if (diff > 1) return `Jatuh tempo ${diff} hari lagi`;
    if (diff === -1) return 'Telat 1 hari';

    return `Telat ${Math.abs(diff)} hari`;
};

const walletIcon = (type) => {
    if (type === 'bank') return 'bank';
    return 'wallet';
};

const walletLogo = (wallet) => wallet?.provider?.logo || wallet?.custom_logo || null;

const activityAccent = (activity) => {
    if (activity?.type === 'transfer') {
        return {
            chip: 'bg-sky-50 text-sky-700',
            amount: 'text-sky-600',
            sign: '',
            icon: 'exchange',
            label: 'Transfer',
        };
    }

    return activity?.type === 'income'
        ? {
              chip: 'bg-emerald-50 text-emerald-700',
              amount: 'text-emerald-600',
              sign: '+',
              icon: 'arrowDown',
              label: 'Pemasukan',
          }
        : {
              chip: 'bg-rose-50 text-rose-700',
              amount: 'text-rose-600',
              sign: '-',
              icon: 'receipt',
              label: 'Pengeluaran',
          };
};

const activityTitle = (activity) => {
    if (activity?.type === 'transfer') {
        return activity.description?.trim() || 'Pindah saldo';
    }

    return activity?.description?.trim() || activity?.category?.name || 'Tanpa keterangan';
};

const normalizeChartRows = (rows) =>
    rows.map((row) => ({
        month: row.month,
        income: Number(row.income ?? 0),
        expense: Number(row.expense ?? 0),
    }));

const chartPoint = (value, index, total, maxValue) => {
    const width = 100;
    const height = 72;
    const x = total <= 1 ? width / 2 : (index / (total - 1)) * width;
    const y = height - (value / maxValue) * (height - 8) - 4;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
};

export default function Dashboard({
    summary,
    wallets = [],
    chart = [],
    recentTransactions = [],
    upcomingBills = [],
    overdueBills = [],
}) {
    const stats = [
        {
            label: 'Total Pemasukan',
            value: summary?.monthIncome ?? 0,
            caption: `Periode ${summary?.monthLabel ?? '-'}`,
            icon: 'arrowDown',
            tone: 'text-success',
            badge: 'bg-emerald-50 text-success',
        },
        {
            label: 'Total Pengeluaran',
            value: summary?.monthExpense ?? 0,
            caption: `Periode ${summary?.monthLabel ?? '-'}`,
            icon: 'arrowUp',
            tone: 'text-danger',
            badge: 'bg-rose-50 text-danger',
        },
        {
            label: 'Saldo Saat Ini',
            value: summary?.totalBalance ?? 0,
            caption: `Tersedia di ${summary?.walletCount ?? 0} dompet aktif`,
            icon: 'wallet',
            featured: true,
        },
        {
            label: 'Tagihan Aktif',
            value: summary?.activeBillCount ?? 0,
            caption:
                (summary?.overdueBillCount ?? 0) > 0
                    ? `${summary?.overdueBillCount} sudah lewat tempo`
                    : 'Tidak ada keterlambatan',
            icon: 'calendar',
            tone: 'text-warning',
            badge: 'bg-amber-50 text-warning',
            isCount: true,
        },
    ];

    const chartMax = Math.max(
        1,
        ...chart.flatMap((row) => [
            Number(row.income ?? 0),
            Number(row.expense ?? 0),
        ]),
    );

    const chartRows = normalizeChartRows(chart);
    const chartHasData = chartRows.some((row) => row.income > 0 || row.expense > 0);

    const incomeLine = chartRows
        .map((row, index) => chartPoint(row.income, index, chartRows.length, chartMax))
        .join(' ');

    const expenseLine = chartRows
        .map((row, index) => chartPoint(row.expense, index, chartRows.length, chartMax))
        .join(' ');

    const chartTicks = [chartMax, chartMax / 2, 0];
    const monthNet = Number(summary?.monthNet ?? 0);
    const isPositiveNet = monthNet >= 0;

    const hookTitle = isPositiveNet
        ? 'Bulan Ini Masih Aman'
        : 'Pengeluaran Lagi Lebih Besar';

    const hookDescription = isPositiveNet
        ? `Kamu masih punya sisa cashflow sebesar ${formatRupiah(Math.abs(monthNet))}. Cocok untuk ditabung atau dialokasikan ke target finansial.`
        : `Bulan ini kamu keluar lebih banyak ${formatRupiah(Math.abs(monthNet))} dari pemasukan. Yuk cek transaksi terbesar biar cashflow lebih aman.`;

    const hookAmountLabel = isPositiveNet ? 'Sisa Cashflow' : 'Selisih Pengeluaran';

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />

                    <div className="relative grid gap-6 lg:grid-cols-[1fr_24rem] lg:items-center">
                        <div className="animate-in">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                                FinTrack Overview
                            </div>

                            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Ringkasan Finansial
                            </h1>

                            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                                Pantau pemasukan, pengeluaran, saldo, dan tagihan dalam satu tempat agar keputusan finansial lebih tenang.
                            </p>

                            <div className="mt-5 flex flex-wrap gap-3">
                                <Link
                                    href={route('transactions.index')}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:brightness-110"
                                >
                                    <Icon name="plus" className="h-4 w-4" />
                                    Catat Transaksi
                                </Link>

                                <Link
                                    href={route('wallets.index')}
                                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700 hover:shadow-md"
                                >
                                    <Icon name="wallet" className="h-4 w-4" />
                                    Kelola Dompet
                                </Link>
                            </div>
                        </div>

                        <div className="animate-in-delay-1 relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/80 ring-1 ring-slate-100">
                            <div
                                className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl ${
                                    isPositiveNet ? 'bg-emerald-200/70' : 'bg-rose-200/70'
                                }`}
                            />

                            <div className="relative flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                                        Status Keuangan
                                    </p>

                                    <h2 className="mt-2 text-2xl font-bold leading-tight text-slate-950">
                                        {hookTitle}
                                    </h2>
                                </div>

                                <span
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                                        isPositiveNet
                                            ? 'bg-emerald-50 text-emerald-600'
                                            : 'bg-rose-50 text-rose-600'
                                    }`}
                                >
                                    <Icon
                                        name={isPositiveNet ? 'arrowDown' : 'arrowUp'}
                                        className="h-5 w-5"
                                    />
                                </span>
                            </div>

                            <p className="relative mt-3 text-sm leading-6 text-slate-600">
                                {hookDescription}
                            </p>

                            <div
                                className={`relative mt-5 rounded-2xl border p-4 ${
                                    isPositiveNet
                                        ? 'border-emerald-100 bg-emerald-50/70'
                                        : 'border-rose-100 bg-rose-50/70'
                                }`}
                            >
                                <p
                                    className={`text-xs font-bold uppercase tracking-wide ${
                                        isPositiveNet ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                >
                                    {hookAmountLabel}
                                </p>

                                <p
                                    className={`mt-1 text-2xl font-bold ${
                                        isPositiveNet ? 'text-emerald-700' : 'text-rose-700'
                                    }`}
                                >
                                    {isPositiveNet ? '+' : '-'}{' '}
                                    {formatRupiah(Math.abs(monthNet))}
                                </p>
                            </div>

                            <Link
                                href={route('transactions.index')}
                                className="relative mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary-700 hover:text-primary-800"
                            >
                                Lihat detail transaksi
                                <span aria-hidden="true">→</span>
                            </Link>
                        </div>
                    </div>
                </section>
            }
        >
            <Head title="Dashboard" />

            <div className="page-shell">
                <div className="page-container">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {stats.map((stat, index) => (
                            <section
                                key={stat.label}
                                className={`group relative overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/85 p-5 shadow-lg shadow-slate-200/70 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-300/60 ${
                                    stat.featured
                                        ? 'bg-gradient-to-br from-primary-700 via-primary-600 to-sky-500 text-white shadow-primary-900/20'
                                        : ''
                                } ${
                                    index === 0
                                        ? 'animate-in'
                                        : index === 1
                                            ? 'animate-in-delay-1'
                                            : index === 2
                                                ? 'animate-in-delay-2'
                                                : 'animate-in-delay-3'
                                }`}
                            >
                                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl transition group-hover:scale-125" />

                                <div className="relative flex items-start justify-between gap-3">
                                    <div>
                                        <p
                                            className={`text-[11px] font-bold uppercase tracking-[0.18em] ${
                                                stat.featured
                                                    ? 'text-primary-100'
                                                    : 'text-slate-400'
                                            }`}
                                        >
                                            {stat.label}
                                        </p>

                                        <p
                                            className={`mt-3 text-2xl font-bold tracking-tight sm:text-3xl ${
                                                stat.featured
                                                    ? 'text-white'
                                                    : 'text-slate-950'
                                            }`}
                                        >
                                            {stat.isCount
                                                ? stat.value
                                                : formatRupiah(stat.value)}
                                        </p>
                                    </div>

                                    <span
                                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                                            stat.featured
                                                ? 'bg-white/20 text-white'
                                                : stat.badge
                                        }`}
                                    >
                                        <Icon name={stat.icon} className="h-5 w-5" />
                                    </span>
                                </div>

                                <div className="relative mt-5 flex items-center justify-between gap-3">
                                    <p
                                        className={`text-xs font-medium ${
                                            stat.featured
                                                ? 'text-primary-100'
                                                : stat.tone ?? 'text-slate-500'
                                        }`}
                                    >
                                        {stat.caption}
                                    </p>

                                    {!stat.isCount && (
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                                                stat.featured
                                                    ? 'bg-white/15 text-white'
                                                    : stat.value > 0
                                                        ? 'bg-slate-100 text-slate-600'
                                                        : 'bg-slate-50 text-slate-400'
                                            }`}
                                        >
                                            Bulan ini
                                        </span>
                                    )}
                                </div>
                            </section>
                        ))}
                    </div>

                    <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-6">
                        <section className="surface-card-padded relative overflow-hidden animate-in-delay-1 lg:col-span-2">
                            <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-primary-100/70 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-28 left-10 h-52 w-52 rounded-full bg-sky-100/70 blur-3xl" />

                            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <span className="badge-soft bg-primary-50 text-primary-700">
                                        Cashflow
                                    </span>
                                    <h2 className="mt-3 text-base font-semibold text-slate-950 sm:text-lg">
                                        Pemasukan vs Pengeluaran
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                        Tren 6 bulan terakhir berdasarkan transaksi yang Anda catat.
                                    </p>
                                </div>
                            </div>

                            <div className="relative mt-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-inner sm:p-5">
                                <div className="grid grid-cols-[2.5rem_1fr] gap-2 sm:grid-cols-[3rem_1fr] sm:gap-3">
                                    <div className="flex flex-col justify-between py-1 text-right text-[10px] font-medium text-slate-400">
                                        {chartTicks.map((tick) => (
                                            <span key={tick}>
                                                {formatCompactRupiah(tick)}
                                            </span>
                                        ))}
                                    </div>

                                    <div>
                                        <div className="relative h-52 overflow-visible rounded-xl border border-slate-100 bg-white sm:h-64">
                                            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                                            <div className="absolute inset-x-0 bottom-10 border-t border-dashed border-slate-200" />
                                            <div className="absolute inset-x-0 top-10 border-t border-dashed border-slate-200" />

                                            {chartHasData && chartRows.length > 0 && (
                                                <svg
                                                    className="pointer-events-none absolute inset-x-4 top-5 z-10 h-[42%] w-[calc(100%-2rem)] overflow-visible"
                                                    preserveAspectRatio="none"
                                                    viewBox="0 0 100 72"
                                                >
                                                    <polyline
                                                        fill="none"
                                                        points={incomeLine}
                                                        stroke="#2563EB"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2.4"
                                                        vectorEffect="non-scaling-stroke"
                                                    />
                                                    <polyline
                                                        fill="none"
                                                        points={expenseLine}
                                                        stroke="#F59E0B"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth="2.4"
                                                        vectorEffect="non-scaling-stroke"
                                                    />
                                                </svg>
                                            )}

                                            <div
                                                className="absolute inset-x-3 bottom-4 z-20 grid h-[72%] items-end gap-2 sm:inset-x-5 sm:gap-3"
                                                style={{
                                                    gridTemplateColumns: `repeat(${Math.max(
                                                        chartRows.length,
                                                        1,
                                                    )}, minmax(0, 1fr))`,
                                                }}
                                            >
                                                {chartRows.map((row) => (
                                                    <div
                                                        key={row.month}
                                                        className="group relative flex h-full flex-col items-center justify-end gap-2"
                                                    >
                                                        <div className="flex h-full w-full items-end justify-center gap-1.5 sm:gap-2">
                                                            <div
                                                                className="animate-bar w-full max-w-7 rounded-t-lg bg-gradient-to-t from-primary-700 to-primary-400 shadow-sm transition group-hover:brightness-110"
                                                                style={{
                                                                    height: chartHasData
                                                                        ? `${Math.max(
                                                                              row.income > 0 ? 8 : 2,
                                                                              (row.income /
                                                                                  chartMax) *
                                                                                  100,
                                                                          )}%`
                                                                        : '2%',
                                                                }}
                                                                title={`Pemasukan ${row.month}: ${formatRupiah(
                                                                    row.income,
                                                                )}`}
                                                            />
                                                            <div
                                                                className="animate-bar w-full max-w-7 rounded-t-lg bg-gradient-to-t from-amber-500 to-amber-200 shadow-sm transition group-hover:brightness-105"
                                                                style={{
                                                                    height: chartHasData
                                                                        ? `${Math.max(
                                                                              row.expense > 0 ? 8 : 2,
                                                                              (row.expense /
                                                                                  chartMax) *
                                                                                  100,
                                                                          )}%`
                                                                        : '2%',
                                                                }}
                                                                title={`Pengeluaran ${row.month}: ${formatRupiah(
                                                                    row.expense,
                                                                )}`}
                                                            />
                                                        </div>

                                                        <div className="pointer-events-none absolute bottom-full z-40 mb-2 hidden min-w-36 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs shadow-xl group-hover:block">
                                                            <p className="font-semibold text-slate-950">
                                                                {row.month}
                                                            </p>
                                                            <p className="mt-1 text-primary-700">
                                                                Masuk: {formatRupiah(row.income)}
                                                            </p>
                                                            <p className="text-amber-600">
                                                                Keluar: {formatRupiah(row.expense)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {!chartHasData && (
                                                <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
                                                    <p className="rounded-xl bg-white/90 px-4 py-3 text-sm text-slate-500 shadow-sm">
                                                        Belum ada data cashflow. Tambahkan transaksi untuk menghidupkan chart.
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            className="mt-3 grid gap-2 text-center text-[11px] font-semibold uppercase text-slate-500"
                                            style={{
                                                gridTemplateColumns: `repeat(${Math.max(
                                                    chartRows.length,
                                                    1,
                                                )}, minmax(0, 1fr))`,
                                            }}
                                        >
                                            {chartRows.map((row) => (
                                                <span key={`${row.month}-label`}>
                                                    {row.month}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="relative mt-5 flex flex-wrap justify-center gap-3 text-xs text-slate-600 sm:gap-5 sm:text-sm">
                                <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5 font-medium text-primary-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
                                    Pemasukan
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 font-medium text-amber-700">
                                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                    Pengeluaran
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 font-medium text-slate-500">
                                    Garis menunjukkan tren, bar menunjukkan volume
                                </span>
                            </div>
                        </section>

                        <section className="surface-card-padded animate-in-delay-2">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
                                    Tagihan Terdekat
                                </h2>
                                <Link
                                    href={route('bills.index')}
                                    className="text-xs font-semibold text-primary-700 hover:text-primary-800 sm:text-sm"
                                >
                                    Lihat Semua
                                </Link>
                            </div>

                            {overdueBills.length > 0 && (
                                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-danger">
                                    {overdueBills.length} tagihan sudah lewat tempo dan perlu segera ditindaklanjuti.
                                </div>
                            )}

                            <div className="mt-4 space-y-3">
                                {[...overdueBills, ...upcomingBills].slice(0, 4).map((bill) => {
                                    const isOverdue = overdueBills.some(
                                        (item) => item.id === bill.id,
                                    );

                                    return (
                                        <div
                                            key={bill.id}
                                            className="rounded-xl border border-slate-200 px-4 py-3 transition hover:border-primary-200 hover:shadow-sm"
                                        >
                                            <div className="flex gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                                                    <Icon name="bills" className="h-5 w-5" />
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-semibold text-slate-950">
                                                        {bill.title}
                                                    </p>
                                                    <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
                                                        {bill.bill_group?.name ?? '-'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <p
                                                        className={`text-xs ${
                                                            isOverdue
                                                                ? 'text-danger'
                                                                : 'text-amber-600'
                                                        }`}
                                                    >
                                                        {dueLabel(bill.due_date)}
                                                    </p>
                                                    <p className="text-[11px] uppercase tracking-wide text-slate-400">
                                                        {formatDate(bill.due_date)}
                                                    </p>
                                                </div>

                                                <p className="text-sm font-semibold text-slate-950">
                                                    {formatRupiah(bill.amount)}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {overdueBills.length === 0 && upcomingBills.length === 0 && (
                                    <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 sm:text-sm">
                                        Belum ada tagihan terdekat. Tambahkan grup tagihan untuk mulai memantau.
                                    </p>
                                )}
                            </div>
                        </section>
                    </div>

                    <div className="grid min-w-0 gap-4 lg:grid-cols-3 lg:gap-6">
                        <section className="surface-card animate-in-delay-3 lg:col-span-2">
                            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                                <div>
                                    <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
                                        Transaksi Terakhir
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                                        Enam catatan terbaru dari dompet Anda.
                                    </p>
                                </div>

                                <Link
                                    href={route('transactions.index')}
                                    className="inline-flex items-center gap-2 self-start rounded-md px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 sm:text-sm"
                                >
                                    <Icon name="filter" className="h-4 w-4" />
                                    Kelola transaksi
                                </Link>
                            </div>

                            <div className="scroll-x">
                                <table className="min-w-[640px] divide-y divide-slate-100">
                                    <thead>
                                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                            <th className="px-4 py-3 sm:px-6">Tanggal</th>
                                            <th className="px-4 py-3 sm:px-6">Kategori</th>
                                            <th className="px-4 py-3 sm:px-6">Deskripsi</th>
                                            <th className="px-4 py-3 sm:px-6">Dompet</th>
                                            <th className="px-4 py-3 text-right sm:px-6">
                                                Jumlah
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100">
                                        {recentTransactions.map((transaction) => {
                                            const accent = activityAccent(transaction);

                                            return (
                                                <tr
                                                    key={`${transaction.kind}-${transaction.id}`}
                                                    className="text-sm transition hover:bg-slate-50"
                                                >
                                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 sm:px-6">
                                                        {formatDate(transaction.transaction_date)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 sm:px-6">
                                                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.chip}`}>
                                                            <Icon name={accent.icon} className="h-3 w-3" />
                                                            {accent.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-700 sm:px-6">
                                                        {activityTitle(transaction)}
                                                    </td>
                                                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 sm:px-6">
                                                        {transaction.type === 'transfer' ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600">
                                                                {transaction.from_wallet?.name ?? '-'} ➔ {transaction.to_wallet?.name ?? '-'}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                                {walletLogo(transaction.wallet) ? (
                                                                    <img
                                                                        src={walletLogo(transaction.wallet)}
                                                                        alt=""
                                                                        className="h-4 w-4 object-contain"
                                                                    />
                                                                ) : (
                                                                    <Icon name={walletIcon(transaction.wallet?.type)} className="h-3.5 w-3.5 text-slate-400" />
                                                                )}
                                                                {transaction.wallet?.name ?? '-'}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td
                                                        className={`whitespace-nowrap px-4 py-3 text-right font-semibold sm:px-6 ${accent.amount}`}
                                                    >
                                                        {accent.sign}{formatRupiah(transaction.amount)}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {recentTransactions.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-4 py-10 text-center text-sm text-slate-500"
                                                >
                                                    Belum ada transaksi.{' '}
                                                    <Link
                                                        href={route('transactions.index')}
                                                        className="font-semibold text-primary-600"
                                                    >
                                                        Tambahkan sekarang
                                                    </Link>
                                                    .
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="surface-card-padded animate-in-delay-3">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-base font-semibold text-slate-950 sm:text-lg">
                                    Saldo per Dompet
                                </h2>
                                <Link
                                    href={route('wallets.index')}
                                    className="text-xs font-semibold text-primary-700 hover:text-primary-800 sm:text-sm"
                                >
                                    Atur dompet
                                </Link>
                            </div>

                            <ul className="mt-4 space-y-3">
                                {wallets.map((wallet) => (
                                    <li
                                        key={wallet.id}
                                        className={`flex items-center gap-3 rounded-xl border px-3 py-3 ${
                                            wallet.is_active
                                                ? 'border-slate-200 bg-white'
                                                : 'border-dashed border-slate-200 bg-slate-50 text-slate-500'
                                        }`}
                                    >
                                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary-50 text-primary-700">
                                            {walletLogo(wallet) ? (
                                                <img
                                                    src={walletLogo(wallet)}
                                                    alt=""
                                                    className="h-7 w-7 object-contain"
                                                />
                                            ) : (
                                                <Icon
                                                    name={walletIcon(wallet.type)}
                                                    className="h-5 w-5"
                                                />
                                            )}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-950">
                                                {wallet.name}
                                            </p>
                                            <p className="truncate text-[11px] uppercase tracking-wide text-slate-500">
                                                {wallet.institution ?? wallet.type}
                                            </p>
                                        </div>

                                        <span className="text-sm font-semibold text-slate-950">
                                            {formatRupiah(wallet.current_balance)}
                                        </span>
                                    </li>
                                ))}

                                {wallets.length === 0 && (
                                    <li className="rounded-md border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 sm:text-sm">
                                        Belum ada dompet.{' '}
                                        <Link
                                            href={route('wallets.index')}
                                            className="font-semibold text-primary-600"
                                        >
                                            Tambah sekarang
                                        </Link>
                                        .
                                    </li>
                                )}
                            </ul>
                        </section>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
