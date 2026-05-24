import Autocomplete from '@/Components/Autocomplete';
import DatePicker from '@/Components/DatePicker';
import FormDropdown from '@/Components/FormDropdown';
import Icon from '@/Components/Icon';
import Modal from '@/Components/Modal';
import PrimaryButton from '@/Components/PrimaryButton';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const formatCompactRupiah = (value) => {
    const num = Number(value ?? 0);

    if (num === 0) return 'Rp 0';

    return (
        'Rp ' +
        new Intl.NumberFormat('id-ID', {
            notation: 'compact',
            maximumFractionDigits: 1,
        }).format(num)
    );
};

const formatShortAmount = (value) => {
    const num = Math.abs(Number(value ?? 0));

    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(num >= 10_000_000 ? 0 : 1)}M`;
    if (num >= 1_000) return `${Math.round(num / 1_000)}K`;

    return String(num);
};

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          }).format(new Date(value))
        : '-';

const periodOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' },
    { value: 'custom', label: 'Custom' },
];

const typeOptions = [
    { value: '', label: 'Semua tipe' },
    { value: 'income', label: 'Pemasukan' },
    { value: 'expense', label: 'Pengeluaran' },
    { value: 'transfer', label: 'Transfer' },
];

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const activityAccent = (activity) => {
    if (activity?.type === 'transfer') {
        return {
            bubble: 'bg-sky-50 text-sky-600',
            chip: 'bg-sky-50 text-sky-700',
            amount: 'text-sky-600',
            sign: '',
            icon: 'exchange',
            label: 'Transfer',
        };
    }

    return activity?.type === 'income'
        ? {
              bubble: 'bg-emerald-50 text-emerald-600',
              chip: 'bg-emerald-50 text-emerald-700',
              amount: 'text-emerald-600',
              sign: '+',
              icon: 'arrowDown',
              label: 'Pemasukan',
          }
        : {
              bubble: 'bg-rose-50 text-rose-600',
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

const walletLogo = (wallet) => wallet?.provider?.logo || wallet?.custom_logo || null;

const walletFallbackIcon = (type) => (type === 'bank' ? 'bank' : 'wallet');

const PIE_PALETTE = [
    '#2563EB',
    '#0EA5E9',
    '#22C55E',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
];

const polarToCartesian = (cx, cy, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;

    return {
        x: cx + radius * Math.cos(angleInRadians),
        y: cy + radius * Math.sin(angleInRadians),
    };
};

const arcPath = (cx, cy, radius, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, radius, endAngle);
    const end = polarToCartesian(cx, cy, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
        `M ${cx} ${cy}`,
        `L ${start.x} ${start.y}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
        'Z',
    ].join(' ');
};

const csvEscape = (value) => {
    if (value === null || value === undefined) return '';

    const str = String(value);

    if (/[",\n;]/.test(str)) {
        return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
};

const buildCsv = (transactions) => {
    const header = ['Tanggal', 'Tipe', 'Kategori', 'Dompet', 'Deskripsi', 'Nominal'];

    const rows = transactions.map((transaction) => {
        const accent = activityAccent(transaction);
        const walletName = transaction.type === 'transfer'
            ? `${transaction.from_wallet?.name ?? '-'} -> ${transaction.to_wallet?.name ?? '-'}`
            : transaction.wallet?.name ?? '';

        return [
            transaction.transaction_date ?? '',
            accent.label,
            transaction.type === 'transfer' ? 'Transfer' : transaction.category?.name ?? '',
            walletName,
            transaction.description ?? '',
            `${accent.sign}${Number(transaction.amount ?? 0)}`,
        ];
    });

    return [header, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
};

const downloadCsv = (filename, content) => {
    const blob = new Blob(['\ufeff' + content], {
        type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};

function StatCard({ label, value, sublabel, tone, featured, icon, badgeClass }) {
    return (
        <section
            className={`group relative overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/90 p-4 shadow-lg shadow-slate-200/70 backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-2xl sm:p-5 ${
                featured
                    ? 'bg-gradient-to-br from-primary-700 via-primary-600 to-sky-500 text-white shadow-primary-900/20'
                    : ''
            }`}
        >
            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/20 blur-2xl transition group-hover:scale-125" />

            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p
                        className={`text-[10px] font-bold uppercase tracking-[0.18em] sm:text-[11px] ${
                            featured ? 'text-primary-100' : 'text-slate-400'
                        }`}
                    >
                        {label}
                    </p>

                    <p
                        className={`mt-3 break-words text-xl font-bold tracking-tight sm:text-2xl xl:text-3xl ${
                            featured ? 'text-white' : tone ?? 'text-slate-950'
                        }`}
                    >
                        {value}
                    </p>
                </div>

                {icon && (
                    <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm sm:h-12 sm:w-12 ${
                            featured
                                ? 'bg-white/20 text-white'
                                : badgeClass ?? 'bg-slate-100 text-slate-600'
                        }`}
                    >
                        <Icon name={icon} className="h-5 w-5" />
                    </span>
                )}
            </div>

            {sublabel && (
                <p
                    className={`relative mt-4 text-xs font-medium leading-5 ${
                        featured ? 'text-primary-100' : 'text-slate-500'
                    }`}
                >
                    {sublabel}
                </p>
            )}
        </section>
    );
}

function TrendChart({ rows }) {
    const points = useMemo(() => {
        if (!rows.length) return null;

        const max = Math.max(
            1,
            ...rows.flatMap((row) => [
                Number(row.income ?? 0),
                Number(row.expense ?? 0),
            ]),
        );

        const total = rows.length;
        const width = 100;
        const height = 60;

        const toXY = (value, index) => {
            const x = total <= 1 ? width / 2 : (index / (total - 1)) * width;
            const y = height - (Number(value) / max) * (height - 4) - 2;

            return [x, y];
        };

        const incomePoints = rows.map((row, index) => toXY(row.income, index));
        const expensePoints = rows.map((row, index) => toXY(row.expense, index));

        const toPolyline = (items) =>
            items.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

        const toPolygon = (items) =>
            `0,${height} ${toPolyline(items)} ${width},${height}`;

        return {
            max,
            incomeLine: toPolyline(incomePoints),
            expenseLine: toPolyline(expensePoints),
            incomeArea: toPolygon(incomePoints),
            expenseArea: toPolygon(expensePoints),
            incomePoints,
            expensePoints,
        };
    }, [rows]);

    if (!rows.length || !points) {
        return (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                Belum ada data transaksi untuk periode ini.
            </p>
        );
    }

    const {
        max,
        incomeLine,
        expenseLine,
        incomeArea,
        expenseArea,
        incomePoints,
        expensePoints,
    } = points;

    const ticks = [max, max / 2, 0];

    return (
        <div className="grid grid-cols-[2.75rem_1fr] gap-2 sm:grid-cols-[3.5rem_1fr] sm:gap-4">
            <div className="flex flex-col justify-between py-1 text-right text-[9px] font-semibold text-slate-400 sm:text-[10px]">
                {ticks.map((tick, index) => (
                    <span key={index}>{formatCompactRupiah(tick)}</span>
                ))}
            </div>

            <div className="min-w-0">
                <div className="relative h-52 overflow-hidden rounded-2xl border border-slate-100 bg-gradient-to-b from-white to-slate-50 sm:h-64">
                    <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                    <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-100" />
                    <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-100" />

                    <svg
                        className="absolute inset-0 h-full w-full"
                        viewBox="0 0 100 60"
                        preserveAspectRatio="none"
                    >
                        <polygon points={incomeArea} fill="#2563EB" fillOpacity="0.12" />
                        <polygon points={expenseArea} fill="#DC2626" fillOpacity="0.10" />

                        <polyline
                            points={incomeLine}
                            fill="none"
                            stroke="#2563EB"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />

                        <polyline
                            points={expenseLine}
                            fill="none"
                            stroke="#DC2626"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />

                        {rows.length <= 31 &&
                            incomePoints.map(([x, y], index) => (
                                <circle
                                    key={`income-${index}`}
                                    cx={x}
                                    cy={y}
                                    r="0.9"
                                    fill="#2563EB"
                                    vectorEffect="non-scaling-stroke"
                                >
                                    <title>
                                        {`${formatDate(rows[index].date)} — Pemasukan ${formatRupiah(rows[index].income)}`}
                                    </title>
                                </circle>
                            ))}

                        {rows.length <= 31 &&
                            expensePoints.map(([x, y], index) => (
                                <circle
                                    key={`expense-${index}`}
                                    cx={x}
                                    cy={y}
                                    r="0.9"
                                    fill="#DC2626"
                                    vectorEffect="non-scaling-stroke"
                                >
                                    <title>
                                        {`${formatDate(rows[index].date)} — Pengeluaran ${formatRupiah(rows[index].expense)}`}
                                    </title>
                                </circle>
                            ))}
                    </svg>
                </div>
            </div>
        </div>
    );
}

function CategoryPie({ slices, total }) {
    const [hovered, setHovered] = useState(null);

    if (!slices.length || total <= 0) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                Belum ada pengeluaran pada periode ini.
            </div>
        );
    }

    let currentAngle = 0;

    const segments = slices.map((row, index) => {
        const portion = total === 0 ? 0 : (row.total / total) * 360;
        const path = arcPath(110, 110, 100, currentAngle, currentAngle + portion);

        const segment = {
            ...row,
            path,
            color: PIE_PALETTE[index % PIE_PALETTE.length],
            percent: total === 0 ? 0 : (row.total / total) * 100,
        };

        currentAngle += portion;

        return segment;
    });

    const focusKey = (slice) => slice.id ?? slice.name;
    const focusSlice =
        segments.find((slice) => focusKey(slice) === hovered) ?? segments[0];

    return (
        <div className="flex flex-col items-center gap-4">
            <div
                className="relative h-52 w-52 sm:h-60 sm:w-60"
                onMouseLeave={() => setHovered(null)}
            >
                <svg viewBox="0 0 220 220" className="h-full w-full">
                    {segments.map((slice) => {
                        const key = focusKey(slice);
                        const active = hovered === key;
                        const dimmed = hovered && !active;

                        return (
                            <path
                                key={key}
                                d={slice.path}
                                fill={slice.color}
                                stroke="#fff"
                                strokeWidth={active ? 3 : 2}
                                opacity={dimmed ? 0.35 : 1}
                                style={{
                                    transition:
                                        'opacity 150ms ease, transform 150ms ease',
                                    transform: active ? 'scale(1.03)' : 'scale(1)',
                                    transformOrigin: '110px 110px',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={() => setHovered(key)}
                                onFocus={() => setHovered(key)}
                            />
                        );
                    })}

                    <circle cx="110" cy="110" r="60" fill="#fff" />
                </svg>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                    {focusSlice && (
                        <>
                            <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: focusSlice.color }}
                            />

                            <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">
                                {focusSlice.name}
                            </p>

                            <p className="mt-1 text-xl font-bold text-slate-950">
                                {focusSlice.percent.toFixed(1)}%
                            </p>

                            <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                {formatRupiah(focusSlice.total)}
                            </p>
                        </>
                    )}
                </div>
            </div>

            <p className="text-center text-xs font-semibold text-slate-500">
                Total {formatRupiah(total)} dari {slices.length} kategori.
            </p>
        </div>
    );
}

function NetBalanceTrend({ rows }) {
    const [mode, setMode] = useState('line');
    const [compare, setCompare] = useState(false);

    const data = useMemo(() => {
        let net = 0;
        let expense = 0;

        return rows.map((row) => {
            const income = Number(row.income ?? 0);
            const rowExpense = Number(row.expense ?? 0);

            net += income - rowExpense;
            expense += rowExpense;

            return {
                date: row.date,
                day: new Date(row.date).getDate(),
                net,
                expense,
                delta: income - rowExpense,
            };
        });
    }, [rows]);

    const finalNet = data.length ? data[data.length - 1].net : 0;
    const positive = finalNet >= 0;

    if (!data.length) {
        return (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                Belum ada data tren saldo bersih untuk periode ini.
            </div>
        );
    }

    const width = 600;
    const height = 220;
    const padX = 28;
    const padTop = 14;
    const padBottom = 30;
    const innerHeight = height - padTop - padBottom;

    const valuesForScale = compare
        ? data.flatMap((item) => [item.net, item.expense])
        : data.map((item) => item.net);

    const rawMax = Math.max(0, ...valuesForScale);
    const rawMin = Math.min(0, ...valuesForScale);
    const max = rawMax === rawMin ? rawMax + 1 : rawMax;
    const min = rawMax === rawMin ? rawMin - 1 : rawMin;
    const range = max - min || 1;

    const xFor = (index) =>
        data.length <= 1
            ? width / 2
            : padX + (index / (data.length - 1)) * (width - padX * 2);

    const yFor = (value) => padTop + ((max - value) / range) * innerHeight;
    const baselineY = yFor(0);

    const buildPath = (values) =>
        values
            .map((value, index) => {
                const x = xFor(index);
                const y = yFor(value);

                return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(' ');

    const buildArea = (values) => {
        if (!values.length) return '';

        const line = values
            .map((value, index) => `${xFor(index).toFixed(2)},${yFor(value).toFixed(2)}`)
            .join(' ');

        return `${xFor(0).toFixed(2)},${baselineY.toFixed(2)} ${line} ${xFor(data.length - 1).toFixed(2)},${baselineY.toFixed(2)}`;
    };

    const netPath = buildPath(data.map((item) => item.net));
    const netArea = buildArea(data.map((item) => item.net));
    const expensePath = buildPath(data.map((item) => item.expense));
    const expenseArea = buildArea(data.map((item) => item.expense));

    const tickIndices = (() => {
        const total = data.length;

        if (total <= 6) return data.map((_, index) => index);

        const last = total - 1;

        return Array.from(
            new Set([
                0,
                Math.floor(last / 3),
                Math.floor((last * 2) / 3),
                last,
            ]),
        );
    })();

    return (
        <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-950">
                        Tren Saldo Bersih
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Akumulasi pemasukan dikurangi pengeluaran sepanjang periode.
                    </p>
                </div>

                <span
                    className={`shrink-0 self-start rounded-full px-3 py-1.5 text-sm font-bold ${
                        positive
                            ? 'bg-emerald-50 text-success'
                            : 'bg-rose-50 text-danger'
                    }`}
                >
                    {positive ? '+' : '-'}
                    {formatRupiah(Math.abs(finalNet))}
                </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
                        Saldo Bersih
                    </span>

                    {compare && (
                        <span className="inline-flex items-center gap-2 font-semibold text-slate-700">
                            <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                            Pengeluaran kumulatif
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCompare((current) => !current)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            compare
                                ? 'bg-primary-600 text-white shadow shadow-primary-600/20'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                        <Icon name="exchange" className="h-3.5 w-3.5" />
                        Bandingkan
                    </button>

                    <div className="inline-flex rounded-full bg-slate-100 p-1">
                        <button
                            type="button"
                            onClick={() => setMode('line')}
                            aria-label="Tampilan garis"
                            className={`flex h-7 w-9 items-center justify-center rounded-full transition ${
                                mode === 'line'
                                    ? 'bg-white text-primary-700 shadow'
                                    : 'text-slate-500 hover:text-primary-700'
                            }`}
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M3 17l5-6 4 3 5-7 4 4" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={() => setMode('bar')}
                            aria-label="Tampilan bar"
                            className={`flex h-7 w-9 items-center justify-center rounded-full transition ${
                                mode === 'bar'
                                    ? 'bg-white text-primary-700 shadow'
                                    : 'text-slate-500 hover:text-primary-700'
                            }`}
                        >
                            <Icon name="reports" className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-52 w-full sm:h-56"
                    preserveAspectRatio="none"
                >
                    {[0, 0.25, 0.5, 0.75, 1].map((position) => (
                        <line
                            key={position}
                            x1={padX}
                            x2={width - padX}
                            y1={padTop + position * innerHeight}
                            y2={padTop + position * innerHeight}
                            stroke="#E2E8F0"
                            strokeDasharray="3 4"
                        />
                    ))}

                    {min < 0 && max > 0 && (
                        <line
                            x1={padX}
                            x2={width - padX}
                            y1={baselineY}
                            y2={baselineY}
                            stroke="#94A3B8"
                            strokeWidth="1"
                        />
                    )}

                    {mode === 'line' ? (
                        <>
                            <polygon points={netArea} fill="#2563EB" fillOpacity="0.10" />

                            {compare && (
                                <polygon
                                    points={expenseArea}
                                    fill="#DC2626"
                                    fillOpacity="0.08"
                                />
                            )}

                            <path
                                d={netPath}
                                fill="none"
                                stroke="#2563EB"
                                strokeWidth="2.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {compare && (
                                <path
                                    d={expensePath}
                                    fill="none"
                                    stroke="#DC2626"
                                    strokeWidth="2.6"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            )}
                        </>
                    ) : (
                        <>
                            {data.map((item, index) => {
                                const total = data.length;
                                const slot = (width - padX * 2) / Math.max(1, total);
                                const barWidth = Math.max(
                                    2,
                                    Math.min(18, slot * (compare ? 0.35 : 0.55)),
                                );

                                const cx = xFor(index);
                                const yNet = yFor(item.net);
                                const x1 = compare ? cx - barWidth - 1 : cx - barWidth / 2;
                                const x2 = compare ? cx + 1 : cx - barWidth / 2;
                                const netColor = item.net >= 0 ? '#2563EB' : '#DC2626';

                                return (
                                    <g key={item.date}>
                                        <rect
                                            x={x1}
                                            y={Math.min(yNet, baselineY)}
                                            width={barWidth}
                                            height={Math.max(1, Math.abs(baselineY - yNet))}
                                            fill={netColor}
                                            rx="2"
                                        >
                                            <title>
                                                {`${formatDate(item.date)} — Saldo ${formatRupiah(item.net)}`}
                                            </title>
                                        </rect>

                                        {compare && (
                                            <rect
                                                x={x2}
                                                y={Math.min(yFor(item.expense), baselineY)}
                                                width={barWidth}
                                                height={Math.max(
                                                    1,
                                                    Math.abs(baselineY - yFor(item.expense)),
                                                )}
                                                fill="#DC2626"
                                                opacity="0.85"
                                                rx="2"
                                            >
                                                <title>
                                                    {`${formatDate(item.date)} — Pengeluaran kum. ${formatRupiah(item.expense)}`}
                                                </title>
                                            </rect>
                                        )}
                                    </g>
                                );
                            })}
                        </>
                    )}

                    {tickIndices.map((index) => (
                        <text
                            key={index}
                            x={xFor(index)}
                            y={height - 8}
                            textAnchor="middle"
                            fontSize="11"
                            fill="#94A3B8"
                            fontWeight="600"
                        >
                            {data[index].day}
                        </text>
                    ))}
                </svg>
            </div>
        </div>
    );
}

function ActivityHeatmap({ rows, fromDate }) {
    const map = useMemo(() => {
        const mapped = new Map();

        rows.forEach((row) => {
            mapped.set(row.date, {
                income: Number(row.income ?? 0),
                expense: Number(row.expense ?? 0),
            });
        });

        return mapped;
    }, [rows]);

    const maxExpense = Math.max(0, ...rows.map((row) => Number(row.expense ?? 0)));

    const tier = (value) => {
        if (value <= 0) return 0;

        const ratio = maxExpense > 0 ? value / maxExpense : 0;

        if (ratio >= 0.8) return 5;
        if (ratio >= 0.6) return 4;
        if (ratio >= 0.4) return 3;
        if (ratio >= 0.2) return 2;

        return 1;
    };

    const tierBg = [
        'bg-slate-50',
        'bg-rose-100',
        'bg-rose-200',
        'bg-rose-300',
        'bg-rose-400',
        'bg-rose-600',
    ];

    const legendBg = [
        'bg-rose-100',
        'bg-rose-200',
        'bg-rose-300',
        'bg-rose-400',
        'bg-rose-600',
    ];

    const base = fromDate ? new Date(fromDate) : new Date();
    const year = base.getFullYear();
    const month = base.getMonth();
    const monthName = base.toLocaleDateString('id-ID', {
        month: 'long',
        year: 'numeric',
    });

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startCol = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startCol + daysInMonth) / 7) * 7;

    const cells = [];

    for (let index = 0; index < totalCells; index += 1) {
        const dayNumber = index - startCol + 1;

        if (dayNumber < 1 || dayNumber > daysInMonth) {
            cells.push(null);
            continue;
        }

        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;
        const entry = map.get(iso);
        const expense = entry?.expense ?? 0;

        cells.push({
            day: dayNumber,
            expense,
            income: entry?.income ?? 0,
            tier: tier(expense),
            iso,
        });
    }

    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                        Peta Aktivitas
                    </h2>

                    <p className="mt-1 text-sm leading-6 text-slate-500">
                        Intensitas pengeluaran harian sepanjang {monthName}.
                    </p>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase text-slate-400">
                {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, index) => (
                    <span key={`${day}-${index}`}>{day}</span>
                ))}
            </div>

            <div className="mt-2 grid grid-cols-7 gap-1.5">
                {cells.map((cell, index) => {
                    if (!cell) {
                        return <div key={index} className="aspect-square" />;
                    }

                    const isActive = cell.expense > 0;
                    const bg = tierBg[cell.tier];
                    const dayColor = cell.tier >= 4 ? 'text-white' : 'text-slate-500';
                    const amountColor =
                        cell.tier >= 4 ? 'text-white/90' : 'text-rose-700';

                    return (
                        <div
                            key={index}
                            title={
                                isActive
                                    ? `${formatDate(cell.iso)}: ${formatRupiah(cell.expense)}`
                                    : formatDate(cell.iso)
                            }
                            className={`relative flex aspect-square flex-col rounded-lg p-1.5 transition ${bg} ${
                                isActive ? 'shadow-sm' : ''
                            }`}
                        >
                            <span className={`text-[11px] font-bold leading-none ${dayColor}`}>
                                {cell.day}
                            </span>

                            {isActive && (
                                <span
                                    className={`mt-auto text-right text-[9px] font-semibold ${amountColor}`}
                                >
                                    {formatShortAmount(cell.expense)}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 text-xs text-slate-500">
                <span>Sedikit</span>
                {legendBg.map((className, index) => (
                    <span key={index} className={`h-3 w-3 rounded-md ${className}`} />
                ))}
                <span>Banyak</span>
            </div>
        </div>
    );
}

function WalletBars({ rows }) {
    if (!rows.length) {
        return (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                Belum ada transaksi pada periode ini.
            </p>
        );
    }

    const max = Math.max(1, ...rows.map((row) => Number(row.total ?? 0)));

    const groups = [
        {
            type: 'income',
            label: 'Pemasukan',
            tone: 'text-success',
            barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-300',
        },
        {
            type: 'expense',
            label: 'Pengeluaran',
            tone: 'text-danger',
            barClass: 'bg-gradient-to-r from-rose-500 to-rose-300',
        },
    ];

    return (
        <div className="space-y-5">
            {groups.map((group) => {
                const items = rows.filter((row) => row.type === group.type);

                if (!items.length) return null;

                return (
                    <div key={group.type}>
                        <p
                            className={`text-[11px] font-bold uppercase tracking-wide ${group.tone}`}
                        >
                            {group.label}
                        </p>

                        <ul className="mt-2 space-y-3">
                            {items.map((row, index) => {
                                const width = Math.max(4, (Number(row.total) / max) * 100);

                                return (
                                    <li key={`${row.id}-${row.type}-${index}`} className="space-y-1">
                                        <div className="flex items-center justify-between gap-3 text-sm">
                                            <span className="truncate font-medium text-slate-800">
                                                {row.name}
                                            </span>

                                            <span className={`shrink-0 font-semibold ${group.tone}`}>
                                                {group.type === 'income' ? '+' : '-'}{' '}
                                                {formatRupiah(row.total)}
                                            </span>
                                        </div>

                                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                            <div
                                                className={`h-full rounded-full ${group.barClass}`}
                                                style={{ width: `${width}%` }}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                );
            })}
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
            <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd>
        </div>
    );
}

function WalletName({ wallet }) {
    const logo = walletLogo(wallet);

    return (
        <span className="inline-flex items-center gap-1.5">
            {logo ? (
                <img src={logo} alt="" className="h-4 w-4 object-contain" />
            ) : (
                <Icon name={walletFallbackIcon(wallet?.type)} className="h-3.5 w-3.5 text-slate-400" />
            )}
            {wallet?.name ?? '-'}
        </span>
    );
}

function BillSummary({ label, data, tone, accent, highlight }) {
    return (
        <div
            className={`rounded-xl border px-4 py-3 ${accent ?? 'border-slate-200 bg-white'} ${
                highlight ? 'ring-1 ring-rose-200' : ''
            }`}
        >
            <p className={`text-[11px] font-bold uppercase tracking-wide ${tone ?? 'text-slate-500'}`}>
                {label}
            </p>

            <p className="mt-2 text-xl font-bold text-slate-950">
                {data?.count ?? 0}{' '}
                <span className="text-xs font-medium text-slate-500">item</span>
            </p>

            <p className="mt-1 text-xs text-slate-500">
                {formatRupiah(data?.amount ?? 0)}
            </p>
        </div>
    );
}

export default function Index({
    filters,
    meta,
    summary,
    byCategory = [],
    byWallet = [],
    dailyTrend = [],
    transactions = {},
    bills,
    categories = [],
    wallets = [],
}) {
    const { flash } = usePage().props;

    const [filterOpen, setFilterOpen] = useState(false);
    const [detailTransaction, setDetailTransaction] = useState(null);

    const [draft, setDraft] = useState(() => ({
        period: filters?.period ?? 'monthly',
        from: filters?.from ?? '',
        to: filters?.to ?? '',
        category_id: filters?.category_id ?? '',
        wallet_id: filters?.wallet_id ?? '',
        type: filters?.type ?? '',
        search: filters?.search ?? '',
    }));

    const transactionRows = transactions?.data ?? [];
    const perPage = Number(filters?.per_page ?? PER_PAGE_OPTIONS[0]);
    const detailAccent = detailTransaction ? activityAccent(detailTransaction) : null;

    const expenseCategories = useMemo(
        () => byCategory.filter((category) => category.type === 'expense'),
        [byCategory],
    );

    const incomeCategories = useMemo(
        () => byCategory.filter((category) => category.type === 'income'),
        [byCategory],
    );

    const totalCategoryExpense = expenseCategories.reduce(
        (total, category) => total + Number(category.total),
        0,
    );

    const pieSlices = useMemo(() => {
        if (!expenseCategories.length) return [];

        const sorted = [...expenseCategories].sort(
            (a, b) => Number(b.total) - Number(a.total),
        );

        const top = sorted.slice(0, 7);
        const rest = sorted.slice(7);

        if (!rest.length) return top;

        const otherTotal = rest.reduce(
            (total, category) => total + Number(category.total),
            0,
        );

        return [
            ...top,
            {
                id: '__other',
                name: 'Lainnya',
                type: 'expense',
                total: otherTotal,
            },
        ];
    }, [expenseCategories]);

    const totalIncome = Number(summary?.totalIncome ?? 0);
    const totalExpense = Number(summary?.totalExpense ?? 0);
    const netBalance = Number(summary?.netBalance ?? 0);
    const isPositive = netBalance >= 0;

    const savingsRate =
        totalIncome > 0 ? Math.round((netBalance / totalIncome) * 100) : null;

    const savingsTone =
        savingsRate === null
            ? 'text-slate-500'
            : savingsRate >= 20
              ? 'text-success'
              : savingsRate >= 0
                ? 'text-warning'
                : 'text-danger';

    const busiestExpenseDay = useMemo(() => {
        if (!dailyTrend.length) return null;

        return dailyTrend.reduce((accumulator, row) => {
            const expense = Number(row.expense ?? 0);

            if (!accumulator || expense > accumulator.expense) {
                return {
                    date: row.date,
                    expense,
                };
            }

            return accumulator;
        }, null);
    }, [dailyTrend]);

    const topExpensePercent =
        totalCategoryExpense > 0 && summary?.topExpenseCategory
            ? Math.round(
                  (Number(summary.topExpenseCategory.total) / totalCategoryExpense) *
                      100,
              )
            : null;

    const hasActiveFilters = Boolean(
        draft.period !== 'monthly' ||
            draft.from ||
            draft.to ||
            draft.category_id ||
            draft.wallet_id ||
            draft.type ||
            draft.search,
    );

    const buildQuery = (overrides = {}) => {
        const merged = {
            ...draft,
            per_page: perPage,
            ...overrides,
        };

        return Object.fromEntries(
            Object.entries(merged).filter(
                ([, value]) => value !== '' && value !== null && value !== undefined,
            ),
        );
    };

    const navigate = (params) => {
        router.get(route('reports.index'), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const submit = (event) => {
        event.preventDefault();
        navigate(buildQuery());
    };

    const reset = () => {
        const fresh = {
            period: 'monthly',
            from: '',
            to: '',
            category_id: '',
            wallet_id: '',
            type: '',
            search: '',
        };

        setDraft(fresh);
        navigate({ per_page: perPage });
    };

    const onPerPageChange = (value) => {
        navigate(buildQuery({ per_page: value }));
    };

    const handleExport = () => {
        if (!transactionRows.length) return;

        const filename = `fintrack-laporan-${meta?.from ?? 'periode'}_${meta?.to ?? ''}.csv`;

        downloadCsv(filename, buildCsv(transactionRows));
    };

    const transactionMeta = transactions?.from && transactions?.to
        ? `Menampilkan ${transactions.from}-${transactions.to} dari ${transactions.total} aktivitas.`
        : `Total ${transactions?.total ?? 0} aktivitas.`;

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                                FinTrack Reports
                            </div>

                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Laporan Keuangan
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                                Telusuri arus kas, kategori, dan tagihan untuk periode terpilih
                                supaya keputusan finansial lebih tenang.
                            </p>
                        </div>

                        <div className="inline-flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 shadow-sm backdrop-blur sm:w-auto">
                            <Icon name="calendar" className="h-5 w-5 shrink-0 text-primary-600" />

                            <div className="min-w-0 text-xs">
                                <p className="font-bold uppercase tracking-wide text-slate-500">
                                    {meta?.label ?? 'Periode'}
                                </p>

                                <p className="truncate text-sm font-semibold text-slate-900">
                                    {formatDate(meta?.from)} – {formatDate(meta?.to)}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            }
        >
            <Head title="Laporan" />

            <div className="page-shell">
                <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                            {flash.success}
                        </div>
                    )}

                    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-950">
                                    Filter Periode
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Sesuaikan rentang, tipe, dan kategori untuk mempersempit data.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                                <button
                                    type="button"
                                    onClick={() => setFilterOpen((open) => !open)}
                                    className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition lg:hidden ${
                                        filterOpen || hasActiveFilters
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                            : 'bg-primary-50 text-primary-700 hover:bg-primary-100'
                                    }`}
                                >
                                    <Icon name="filter" className="h-4 w-4" />
                                    Filter
                                </button>

                                <button
                                    type="button"
                                    onClick={handleExport}
                                    disabled={!transactionRows.length}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-primary-200 hover:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <Icon name="download" className="h-4 w-4" />
                                    Export
                                </button>

                                <button
                                    type="button"
                                    onClick={reset}
                                    className="col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 sm:col-span-1"
                                >
                                    <Icon name="x" className="h-4 w-4" />
                                    Reset
                                </button>
                            </div>
                        </div>

                        <form
                            onSubmit={submit}
                            className={`gap-3 px-5 py-5 sm:px-6 md:grid-cols-3 lg:grid lg:grid-cols-8 ${
                                filterOpen ? 'grid' : 'hidden lg:grid'
                            }`}
                        >
                            <FormDropdown
                                value={draft.period}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        period: value,
                                    }))
                                }
                                placeholder="Pilih periode"
                                options={periodOptions}
                            />

                            <DatePicker
                                value={draft.from}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        from: value,
                                        period: 'custom',
                                    }))
                                }
                                placeholder="Dari tanggal"
                            />

                            <DatePicker
                                value={draft.to}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        to: value,
                                        period: 'custom',
                                    }))
                                }
                                placeholder="Sampai tanggal"
                            />

                            <FormDropdown
                                value={draft.type}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        type: value,
                                    }))
                                }
                                placeholder="Semua tipe"
                                options={typeOptions}
                            />

                            <Autocomplete
                                value={draft.category_id}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        category_id: value,
                                    }))
                                }
                                options={[{ id: '', name: 'Semua kategori' }, ...categories]}
                                getOptionLabel={(category) =>
                                    category.id === ''
                                        ? category.name
                                        : `${category.name} (${category.type === 'income' ? 'pemasukan' : 'pengeluaran'})`
                                }
                                getOptionValue={(category) => category.id}
                                placeholder="Semua kategori"
                                emptyText="Kategori tidak ditemukan."
                                leadingIcon="filter"
                            />

                            <Autocomplete
                                value={draft.wallet_id}
                                onChange={(value) =>
                                    setDraft((current) => ({
                                        ...current,
                                        wallet_id: value,
                                    }))
                                }
                                options={[{ id: '', name: 'Semua dompet' }, ...wallets]}
                                getOptionLabel={(wallet) => wallet.name}
                                getOptionValue={(wallet) => wallet.id}
                                getOptionImage={(wallet) => walletLogo(wallet)}
                                placeholder="Semua dompet"
                                emptyText="Dompet tidak ditemukan."
                                leadingIcon="wallet"
                            />

                            <input
                                type="search"
                                className="rounded-2xl border-slate-200 bg-slate-50 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-primary-500 focus:bg-white focus:ring-primary-100"
                                placeholder="Cari deskripsi"
                                value={draft.search}
                                onChange={(event) =>
                                    setDraft((current) => ({
                                        ...current,
                                        search: event.target.value,
                                    }))
                                }
                            />

                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700"
                            >
                                Terapkan
                            </button>
                        </form>
                    </section>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Total Pemasukan"
                            value={formatRupiah(totalIncome)}
                            sublabel={`${summary?.transactionCount ?? 0} transaksi`}
                            tone="text-success"
                            icon="arrowDown"
                            badgeClass="bg-emerald-50 text-success"
                        />

                        <StatCard
                            label="Total Pengeluaran"
                            value={formatRupiah(totalExpense)}
                            sublabel={
                                summary?.topExpenseCategory
                                    ? `Top: ${summary.topExpenseCategory.name}`
                                    : 'Belum ada pengeluaran'
                            }
                            tone="text-danger"
                            icon="arrowUp"
                            badgeClass="bg-rose-50 text-danger"
                        />

                        <StatCard
                            label="Net Cashflow"
                            value={`${isPositive ? '+' : '-'} ${formatRupiah(Math.abs(netBalance))}`}
                            sublabel={isPositive ? 'Surplus periode ini' : 'Defisit periode ini'}
                            featured
                            icon="wallet"
                        />

                        <StatCard
                            label="Savings Rate"
                            value={savingsRate === null ? '-' : `${savingsRate}%`}
                            sublabel={
                                savingsRate === null
                                    ? 'Butuh data pemasukan'
                                    : savingsRate >= 20
                                      ? 'Sehat — terus pertahankan'
                                      : savingsRate >= 0
                                        ? 'Cukup, masih bisa ditingkatkan'
                                        : 'Pengeluaran melebihi pemasukan'
                            }
                            tone={savingsTone}
                            icon="reports"
                            badgeClass="bg-primary-50 text-primary-700"
                        />
                    </div>

                    <section className="relative overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-primary-100/60 blur-3xl" />

                        <div className="relative flex items-start gap-3">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                                <Icon name="zap" className="h-5 w-5" />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wide text-primary-700">
                                    Insight Cepat
                                </p>

                                <p className="mt-1 text-sm leading-6 text-slate-700 sm:text-base">
                                    {isPositive ? (
                                        <>
                                            Periode ini kamu mencatat{' '}
                                            <span className="font-semibold text-success">
                                                surplus {formatRupiah(Math.abs(netBalance))}
                                            </span>
                                            {savingsRate !== null && (
                                                <>
                                                    {' '}
                                                    dengan savings rate{' '}
                                                    <span className="font-semibold">
                                                        {savingsRate}%
                                                    </span>
                                                </>
                                            )}
                                            .
                                        </>
                                    ) : (
                                        <>
                                            Periode ini pengeluaranmu melebihi pemasukan sebesar{' '}
                                            <span className="font-semibold text-danger">
                                                {formatRupiah(Math.abs(netBalance))}
                                            </span>
                                            . Coba tinjau kategori terbesar.
                                        </>
                                    )}

                                    {summary?.topExpenseCategory &&
                                        topExpensePercent !== null && (
                                            <>
                                                {' '}
                                                Kategori dominan:{' '}
                                                <span className="font-semibold">
                                                    {summary.topExpenseCategory.name}
                                                </span>{' '}
                                                ({topExpensePercent}% dari total pengeluaran).
                                            </>
                                        )}

                                    {busiestExpenseDay && busiestExpenseDay.expense > 0 && (
                                        <>
                                            {' '}
                                            Pengeluaran terbesar pada{' '}
                                            <span className="font-semibold">
                                                {formatDate(busiestExpenseDay.date)}
                                            </span>{' '}
                                            sebesar {formatRupiah(busiestExpenseDay.expense)}.
                                        </>
                                    )}

                                    {!summary?.topExpenseCategory &&
                                        totalIncome === 0 &&
                                        totalExpense === 0 && (
                                            <>
                                                Belum ada aktivitas keuangan pada periode ini.
                                                Tambahkan transaksi untuk mulai melihat tren.
                                            </>
                                        )}
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 lg:col-span-2">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-700">
                                        Cashflow harian
                                    </span>

                                    <h2 className="mt-3 text-lg font-semibold text-slate-950">
                                        Tren Pemasukan vs Pengeluaran
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Distribusi arus kas selama periode terpilih.
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2 text-xs">
                                    <span className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 font-semibold text-primary-700">
                                        <span className="h-2.5 w-2.5 rounded-full bg-primary-600" />
                                        Pemasukan
                                    </span>

                                    <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-semibold text-danger">
                                        <span className="h-2.5 w-2.5 rounded-full bg-danger" />
                                        Pengeluaran
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6">
                                <TrendChart rows={dailyTrend} />
                            </div>
                        </section>

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <span className="inline-flex rounded-full bg-rose-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-danger">
                                        Komposisi
                                    </span>

                                    <h2 className="mt-3 text-lg font-semibold text-slate-950">
                                        Kategori Pengeluaran
                                    </h2>

                                    <p className="mt-1 text-sm text-slate-500">
                                        Arahkan kursor ke segmen untuk detail.
                                    </p>
                                </div>

                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-danger">
                                    <Icon name="reports" className="h-5 w-5" />
                                </span>
                            </div>

                            <div className="mt-5">
                                <CategoryPie
                                    slices={pieSlices}
                                    total={totalCategoryExpense}
                                />
                            </div>

                            {incomeCategories.length > 0 && (
                                <div className="mt-6 border-t border-slate-100 pt-4">
                                    <p className="text-[11px] font-bold uppercase tracking-wide text-success">
                                        Top kategori pemasukan
                                    </p>

                                    <ul className="mt-2 space-y-1 text-sm">
                                        {incomeCategories.slice(0, 3).map((row) => (
                                            <li
                                                key={row.id ?? row.name}
                                                className="flex justify-between gap-3"
                                            >
                                                <span className="truncate text-slate-700">
                                                    {row.name}
                                                </span>

                                                <span className="shrink-0 font-semibold text-success">
                                                    {formatRupiah(row.total)}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </section>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 lg:col-span-2">
                            <NetBalanceTrend rows={dailyTrend} />
                        </section>

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <ActivityHeatmap rows={dailyTrend} fromDate={meta?.from} />
                        </section>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-3">
                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6">
                            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-success">
                                Per dompet
                            </span>

                            <h2 className="mt-3 text-lg font-semibold text-slate-950">
                                Aliran Dana
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Dompet mana yang paling aktif?
                            </p>

                            <div className="mt-5">
                                <WalletBars rows={byWallet} />
                            </div>
                        </section>

                        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 sm:p-6 lg:col-span-2">
                            <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">
                                Snapshot tagihan
                            </span>

                            <h2 className="mt-3 text-lg font-semibold text-slate-950">
                                Status Tagihan
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Kondisi tagihanmu saat laporan dibuka.
                            </p>

                            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <BillSummary
                                    label="Lunas"
                                    data={bills?.paid}
                                    tone="text-success"
                                    accent="border-emerald-100 bg-emerald-50/60"
                                />

                                <BillSummary
                                    label="Belum lunas"
                                    data={bills?.unpaid}
                                    tone="text-warning"
                                    accent="border-amber-100 bg-amber-50/60"
                                />

                                <BillSummary
                                    label="Terlambat"
                                    data={bills?.late}
                                    tone="text-danger"
                                    accent="border-rose-100 bg-rose-50/60"
                                    highlight={(bills?.late?.count ?? 0) > 0}
                                />

                                <BillSummary
                                    label="Dibatalkan"
                                    data={bills?.cancelled}
                                    tone="text-slate-500"
                                    accent="border-slate-200 bg-slate-50"
                                />
                            </div>
                        </section>
                    </div>

                    <section className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-950">
                                    Detail Transaksi
                                </h2>

                                <p className="text-sm text-slate-500">
                                    {transactionMeta}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                    Klik baris untuk melihat detail aktivitas.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs">
                                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                    <span>Per halaman</span>
                                    <FormDropdown
                                        className="w-24"
                                        buttonClassName="px-3 py-1.5 text-xs rounded-xl"
                                        value={String(perPage)}
                                        onChange={onPerPageChange}
                                        options={PER_PAGE_OPTIONS.map((option) => ({
                                            value: String(option),
                                            label: String(option),
                                        }))}
                                    />
                                </div>

                                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-semibold text-success">
                                    + {formatRupiah(totalIncome)}
                                </span>

                                <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 font-semibold text-danger">
                                    - {formatRupiah(totalExpense)}
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-[720px] divide-y divide-slate-100">
                                <thead className="bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Tanggal</th>
                                        <th className="px-4 py-3">Tipe</th>
                                        <th className="px-4 py-3">Kategori</th>
                                        <th className="px-4 py-3">Dompet</th>
                                        <th className="px-4 py-3">Deskripsi</th>
                                        <th className="px-4 py-3 text-right">Nominal</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-slate-100">
                                    {transactionRows.map((transaction) => {
                                        const accent = activityAccent(transaction);

                                        return (
                                            <tr
                                                key={`${transaction.kind}-${transaction.id}`}
                                                onClick={() => setDetailTransaction(transaction)}
                                                className="cursor-pointer text-sm transition hover:bg-primary-50/40"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                                    {formatDate(transaction.transaction_date)}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-xs">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold uppercase tracking-wide ${accent.chip}`}
                                                    >
                                                        <Icon name={accent.icon} className="h-3 w-3" />
                                                        {accent.label}
                                                    </span>
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                                    {transaction.type === 'transfer'
                                                        ? 'Transfer'
                                                        : transaction.category?.name ?? '-'}
                                                </td>

                                                <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                                                    {transaction.type === 'transfer' ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-600">
                                                            {transaction.from_wallet?.name ?? '-'} ➔ {transaction.to_wallet?.name ?? '-'}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                            <WalletName wallet={transaction.wallet} />
                                                        </span>
                                                    )}
                                                </td>

                                                <td className="px-4 py-3 text-slate-700">
                                                    {activityTitle(transaction)}
                                                </td>

                                                <td
                                                    className={`whitespace-nowrap px-4 py-3 text-right font-bold ${accent.amount}`}
                                                >
                                                    {accent.sign}{formatRupiah(transaction.amount)}
                                                </td>
                                            </tr>
                                        );
                                    })}

                                    {transactionRows.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={6}
                                                className="px-4 py-12 text-center text-sm text-slate-500"
                                            >
                                                <div className="flex flex-col items-center gap-2">
                                                    <Icon
                                                        name="receipt"
                                                        className="h-8 w-8 text-slate-300"
                                                    />
                                                    Tidak ada transaksi pada periode terpilih.
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {transactions?.links?.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 px-5 py-4 text-sm">
                                {transactions.links.map((link, index) => (
                                    <Link
                                        key={`${link.label}-${index}`}
                                        href={link.url ?? ''}
                                        preserveScroll
                                        preserveState
                                        className={`rounded-xl px-3 py-1.5 font-bold ${
                                            link.active
                                                ? 'bg-primary-600 text-white'
                                                : link.url
                                                  ? 'text-slate-600 hover:bg-slate-100'
                                                  : 'text-slate-300'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            </div>

            <Modal show={Boolean(detailTransaction)} maxWidth="md" onClose={() => setDetailTransaction(null)}>
                {detailTransaction && detailAccent && (
                    <div className="overflow-hidden rounded-2xl bg-white">
                        <div className="border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-5 sm:px-6">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${detailAccent.bubble}`}>
                                        <Icon name={detailAccent.icon} className="h-5 w-5" />
                                    </span>

                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            {detailAccent.label}
                                        </p>
                                        <h2 className="truncate text-lg font-bold text-slate-950">
                                            {activityTitle(detailTransaction)}
                                        </h2>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setDetailTransaction(null)}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                    aria-label="Tutup detail"
                                >
                                    <Icon name="x" className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 px-5 py-5 sm:px-6">
                            <div className="rounded-2xl bg-primary-50/70 px-5 py-4 text-center">
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                                    Nominal
                                </p>
                                <p className={`mt-1 break-words text-3xl font-bold ${detailAccent.amount}`}>
                                    {detailAccent.sign}{formatRupiah(detailTransaction.amount)}
                                </p>
                            </div>

                            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                {detailTransaction.type === 'transfer' ? (
                                    <>
                                        <DetailRow label="Dompet Asal" value={<WalletName wallet={detailTransaction.from_wallet} />} />
                                        <DetailRow label="Dompet Tujuan" value={<WalletName wallet={detailTransaction.to_wallet} />} />
                                    </>
                                ) : (
                                    <>
                                        <DetailRow label="Kategori" value={detailTransaction.category?.name ?? '-'} />
                                        <DetailRow label="Dompet" value={<WalletName wallet={detailTransaction.wallet} />} />
                                    </>
                                )}

                                <DetailRow label="Tanggal" value={formatDate(detailTransaction.transaction_date)} />
                                <DetailRow label="Tipe" value={detailAccent.label} />

                                <div className="sm:col-span-2">
                                    <DetailRow
                                        label="Deskripsi"
                                        value={detailTransaction.description?.trim() || 'Tidak ada catatan tambahan.'}
                                    />
                                </div>
                            </dl>
                        </div>

                        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-right sm:px-6">
                            <Link
                                href={route('transactions.index')}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
                            >
                                <Icon name="filter" className="h-4 w-4" />
                                Kelola di halaman transaksi
                            </Link>
                        </div>
                    </div>
                )}
            </Modal>
        </AuthenticatedLayout>
    );
}
