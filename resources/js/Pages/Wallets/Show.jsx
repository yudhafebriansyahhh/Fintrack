import Autocomplete from '@/Components/Autocomplete';
import DatePicker from '@/Components/DatePicker';
import FormDropdown from '@/Components/FormDropdown';
import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { confirmDelete, toastError, toastSuccess } from '@/Utils/swal';
import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';

const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const formatSignedRupiah = (value) => {
    const number = Number(value ?? 0);
    const formatted = formatRupiah(Math.abs(number));

    if (number > 0) return `+${formatted}`;
    if (number < 0) return `-${formatted}`;

    return formatted;
};

const formatDateLong = (value) =>
    new Intl.DateTimeFormat('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(value));

const formatTime = (value) => {
    if (!value) return '';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
};

const transactionAccent = (transaction) => {
    if (transaction.type === 'transfer') {
        return {
            bubble: 'bg-sky-50 text-sky-600 ring-sky-100',
            amount: 'text-sky-600',
            sign: '',
            icon: 'exchange',
            label: 'Transfer',
        };
    }

    if (transaction.type === 'income') {
        return {
            bubble: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
            amount: 'text-emerald-600',
            sign: '+',
            icon: 'arrowDown',
            label: 'Pemasukan',
        };
    }

    return {
        bubble: 'bg-rose-50 text-rose-600 ring-rose-100',
        amount: 'text-rose-600',
        sign: '-',
        icon: 'receipt',
        label: 'Pengeluaran',
    };
};

const transactionTitle = (transaction) => {
    if (transaction.type === 'transfer') {
        return transaction.direction === 'out'
            ? `Transfer ke ${transaction.to_wallet?.name ?? 'dompet lain'}`
            : `Transfer dari ${transaction.from_wallet?.name ?? 'dompet lain'}`;
    }

    return transaction.description?.trim() || transaction.category?.name || 'Tanpa keterangan';
};

const typeLabels = {
    bank: 'Akun Bank',
    'e-wallet': 'E-Wallet',
    cash: 'Tunai',
    other: 'Lainnya',
};

const walletTypeOptions = [
    { value: 'cash', label: 'Tunai' },
    { value: 'bank', label: 'Akun Bank' },
    { value: 'e-wallet', label: 'E-Wallet' },
    { value: 'other', label: 'Lainnya' },
];

const periodTabs = [
    { key: 'weekly', label: 'Mingguan' },
    { key: 'monthly', label: 'Bulanan' },
    { key: 'yearly', label: 'Tahunan' },
    { key: 'all', label: 'Semua' },
];

const buildChartPath = (points, width, height) => {
    if (points.length === 0) return { line: '', area: '' };

    const values = points.map((point) => Number(point.value ?? 0));
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const padX = 4;
    const usableWidth = width - padX * 2;
    const usableHeight = height - 12;

    const coords = points.map((point, index) => {
        const x =
            points.length === 1
                ? width / 2
                : padX + (index / (points.length - 1)) * usableWidth;

        const normalized = (Number(point.value ?? 0) - min) / range;
        const y = height - 6 - normalized * usableHeight;

        return { x, y };
    });

    const line = coords
        .map(
            (coord, index) =>
                `${index === 0 ? 'M' : 'L'}${coord.x.toFixed(2)},${coord.y.toFixed(2)}`,
        )
        .join(' ');

    const area = `${line} L${coords.at(-1).x.toFixed(2)},${height} L${coords[0].x.toFixed(2)},${height} Z`;

    return { line, area };
};

export default function Show({
    wallet,
    transactions,
    activities = [],
    wallets,
    walletProviders = [],
    categories,
    summary,
    period,
    chart,
}) {
    const { flash } = usePage().props;

    const [walletEditOpen, setWalletEditOpen] = useState(false);
    const [customLogoPreview, setCustomLogoPreview] = useState(wallet.custom_logo ?? null);
    const [transactionOpen, setTransactionOpen] = useState(false);
    const [transferOpen, setTransferOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [detailTransaction, setDetailTransaction] = useState(null);

    const walletForm = useForm({
        name: wallet.name ?? '',
        type: wallet.type ?? 'cash',
        wallet_provider_id: wallet.wallet_provider_id ?? '',
        institution: wallet.institution ?? '',
        account_number: wallet.account_number ?? '',
        account_name: wallet.account_name ?? '',
        phone_number: wallet.phone_number ?? '',
        custom_logo: null,
        initial_balance: wallet.initial_balance ?? 0,
        is_primary: Boolean(wallet.is_primary),
        is_active: Boolean(wallet.is_active),
    });

    const txForm = useForm({
        type: 'expense',
        wallet_id: wallet.id,
        category_id: '',
        amount: '',
        transaction_date: new Date().toISOString().slice(0, 10),
        description: '',
    });

    const transferForm = useForm({
        from_wallet_id: wallet.id,
        to_wallet_id: '',
        amount: '',
        transfer_date: new Date().toISOString().slice(0, 10),
        description: '',
    });

    const filteredCategories = useMemo(
        () => categories.filter((category) => category.type === txForm.data.type),
        [categories, txForm.data.type],
    );

    const activeWallets = useMemo(
        () => wallets.filter((item) => item.is_active || item.id === txForm.data.wallet_id),
        [wallets, txForm.data.wallet_id],
    );

    const transferTargets = useMemo(
        () => wallets.filter((item) => item.id !== wallet.id && item.is_active),
        [wallets, wallet.id],
    );

    const providerOptions = useMemo(
        () => walletProviders.filter((provider) => provider.type === walletForm.data.type),
        [walletProviders, walletForm.data.type],
    );

    const chartData = useMemo(() => buildChartPath(chart ?? [], 320, 110), [chart]);

    const chartLabels = useMemo(() => {
        const points = chart ?? [];

        if (points.length <= 8) {
            return points;
        }

        const indexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

        return points.filter((_, index) => indexes.has(index));
    }, [chart]);

    const isPositiveNet = Number(summary?.net ?? 0) >= 0;

    const groupedTransactions = useMemo(() => {
        const map = new Map();

        activities.forEach((activity) => {
            const key = activity.transaction_date;

            if (!map.has(key)) map.set(key, []);

            map.get(key).push(activity);
        });

        return Array.from(map.entries()).map(([date, items]) => ({
            date,
            items,
            total: items.reduce((sum, item) => {
                if (item.type === 'transfer') return sum;

                return sum + (item.type === 'income' ? Number(item.amount) : -Number(item.amount));
            }, 0),
        }));
    }, [activities]);

    const detailAccent = detailTransaction ? transactionAccent(detailTransaction) : null;

    const openCreateTransaction = (type) => {
        setEditing(null);
        txForm.clearErrors();
        const today = new Date().toISOString().slice(0, 10);

        txForm.setData({
            type,
            wallet_id: wallet.id,
            category_id: '',
            amount: '',
            transaction_date: today,
            description: '',
        });
        setTransactionOpen(true);
    };

    const openEditTransaction = (transaction) => {
        if (transaction.type === 'transfer') return;

        setEditing(transaction);
        txForm.clearErrors();
        txForm.setData({
            type: transaction.type,
            wallet_id: transaction.wallet_id,
            category_id: transaction.category_id,
            amount: transaction.amount,
            transaction_date: transaction.transaction_date,
            description: transaction.description ?? '',
        });
        setDetailTransaction(null);
        setTransactionOpen(true);
    };

    const openDetail = (transaction) => {
        setDetailTransaction(transaction);
    };

    const closeDetail = () => setDetailTransaction(null);

    const openTransfer = () => {
        transferForm.clearErrors();
        transferForm.setData({
            from_wallet_id: wallet.id,
            to_wallet_id: transferTargets[0]?.id ?? '',
            amount: '',
            transfer_date: new Date().toISOString().slice(0, 10),
            description: '',
        });
        setTransferOpen(true);
    };

    const closeTransaction = () => {
        setTransactionOpen(false);
        setEditing(null);
        txForm.reset();
        txForm.clearErrors();
    };

    const closeTransfer = () => {
        setTransferOpen(false);
        transferForm.reset();
        transferForm.clearErrors();
    };

    const openEditWallet = () => {
        walletForm.clearErrors();
        walletForm.setData({
            name: wallet.name ?? '',
            type: wallet.type ?? 'cash',
            wallet_provider_id: wallet.wallet_provider_id ?? '',
            institution: wallet.institution ?? '',
            account_number: wallet.account_number ?? '',
            account_name: wallet.account_name ?? '',
            phone_number: wallet.phone_number ?? '',
            custom_logo: null,
            initial_balance: wallet.initial_balance ?? 0,
            is_primary: Boolean(wallet.is_primary),
            is_active: Boolean(wallet.is_active),
        });
        setCustomLogoPreview(wallet.custom_logo ?? null);
        setWalletEditOpen(true);
    };

    const closeEditWallet = () => {
        setWalletEditOpen(false);
        setCustomLogoPreview(wallet.custom_logo ?? null);
        walletForm.reset();
        walletForm.clearErrors();
    };

    const updateCustomLogo = (file) => {
        walletForm.setData('custom_logo', file);

        if (customLogoPreview && customLogoPreview.startsWith('blob:')) {
            URL.revokeObjectURL(customLogoPreview);
        }

        setCustomLogoPreview(file ? URL.createObjectURL(file) : wallet.custom_logo ?? null);
    };

    const submitWallet = (event) => {
        event.preventDefault();

        walletForm.transform((data) => ({
            ...data,
            is_primary: data.is_primary ? 1 : 0,
            is_active: data.is_active ? 1 : 0,
            _method: 'patch',
        }));

        walletForm.post(route('wallets.update', wallet.id), {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: closeEditWallet,
            onError: () => setWalletEditOpen(true),
        });
    };

    const destroyWallet = async () => {
        const confirmed = await confirmDelete({
            title: 'Hapus dompet ini?',
            text: wallet.transactions_count > 0
                ? 'Dompet memiliki riwayat transaksi, jadi akan dinonaktifkan.'
                : `${wallet.name} akan dihapus dari daftar dompet.`,
        });
        if (!confirmed) return;

        router.delete(route('wallets.destroy', wallet.id), {
            preserveScroll: true,
            onSuccess: () => router.visit(route('wallets.index')),
        });
    };

    const submitTransaction = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeTransaction,
            onError: (errors) => {
                setTransactionOpen(true);
                toastError(Object.values(errors)[0] ?? 'Transaksi gagal disimpan.');
            },
        };

        if (editing) {
            txForm.patch(route('transactions.update', editing.id), options);
        } else {
            txForm.post(route('transactions.store'), options);
        }
    };

    const submitTransfer = (event) => {
        event.preventDefault();

        transferForm.post(route('wallet-transfers.store'), {
            preserveScroll: true,
            onSuccess: closeTransfer,
            onError: () => setTransferOpen(true),
        });
    };

    const destroyTransaction = async (transaction) => {
        const confirmed = await confirmDelete({
            title: 'Hapus transaksi ini?',
            text: `${transaction.description?.trim() || transaction.category?.name || 'Tanpa keterangan'} • ${formatRupiah(transaction.amount)}`,
        });
        if (!confirmed) return;

        router.delete(route('transactions.destroy', transaction.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess('Transaksi dihapus');
                setDetailTransaction(null);
            },
        });
    };

    const goToPeriod = (key) => {
        router.get(
            route('wallets.show', wallet.id),
            { period: key, anchor: period.anchor },
            { preserveScroll: true, preserveState: false },
        );
    };

    const stepPeriod = (target) => {
        router.get(route('wallets.show', wallet.id), target, {
            preserveScroll: true,
            preserveState: false,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-visible rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6">
                    <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary-100/70 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-16 left-14 h-36 w-36 rounded-full bg-sky-100/70 blur-3xl" />

                    <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                            <Link
                                href={route('wallets.index')}
                                aria-label="Kembali ke dompet"
                                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:text-primary-700"
                            >
                                <Icon name="arrowLeft" className="h-5 w-5" />
                            </Link>

                            {wallet.provider?.logo || wallet.custom_logo ? (
                                <img
                                    src={wallet.provider?.logo ?? wallet.custom_logo}
                                    alt={wallet.provider?.name ?? wallet.name}
                                    className="h-12 w-12 shrink-0 object-contain"
                                />
                            ) : (
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
                                    <Icon
                                        name={wallet.type === 'bank' ? 'bank' : 'wallet'}
                                        className="h-6 w-6"
                                    />
                                </span>
                            )}

                            <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                                    {typeLabels[wallet.type] ?? wallet.type}
                                </p>
                                <h1 className="truncate text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
                                    {wallet.name}
                                </h1>
                                <p className="mt-1 truncate text-sm text-slate-500">
                                    Detail saldo, grafik, dan transaksi dompet.
                                </p>
                            </div>
                        </div>

                        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:grid-cols-4 sm:items-center">
                            <button
                                type="button"
                                onClick={() => openCreateTransaction('expense')}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-3 py-3 text-xs font-bold text-white shadow-lg shadow-primary-600/20 transition hover:-translate-y-0.5 hover:bg-primary-500 sm:px-4 sm:text-sm"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                <span>Transaksi</span>
                            </button>

                            <button
                                type="button"
                                onClick={openTransfer}
                                disabled={transferTargets.length === 0}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 px-3 py-3 text-xs font-bold text-white shadow-lg shadow-sky-500/20 transition hover:-translate-y-0.5 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm"
                            >
                                <Icon name="exchange" className="h-4 w-4" />
                                <span>Transfer</span>
                            </button>

                            <button
                                type="button"
                                onClick={openEditWallet}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-100 bg-primary-50 px-3 py-3 text-xs font-bold text-primary-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-100 sm:px-4 sm:text-sm"
                            >
                                <Icon name="edit" className="h-4 w-4" />
                                <span>Edit</span>
                            </button>

                            <button
                                type="button"
                                onClick={destroyWallet}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-3 py-3 text-xs font-bold text-rose-600 shadow-sm transition hover:-translate-y-0.5 hover:bg-rose-100 sm:px-4 sm:text-sm"
                            >
                                <Icon name="trash" className="h-4 w-4" />
                                <span>Hapus</span>
                            </button>
                        </div>
                    </div>
                </section>
            }
        >
            <Head title={wallet.name} />

            <div className="page-shell">
                <div className="page-container">
                    {flash?.success && (
                        <div className="flex items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-5 py-4 shadow-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                                ✓
                            </span>
                            <p className="text-sm font-semibold text-primary-700">
                                {flash.success}
                            </p>
                        </div>
                    )}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_28rem]">
                        <div className="space-y-6">
                            <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-800 via-primary-600 to-sky-500 p-6 text-white shadow-2xl shadow-primary-900/25 sm:p-7">
                                <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
                                <div className="pointer-events-none absolute -bottom-20 left-12 h-44 w-44 rounded-full bg-primary-300/25 blur-2xl" />
                                <div className="pointer-events-none absolute bottom-8 right-12 h-28 w-28 rounded-full bg-sky-300/20 blur-3xl" />

                                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-white/75">
                                            Saldo Saat Ini
                                        </p>
                                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                                            {wallet.name} • IDR
                                        </p>

                                        <p
                                            className={`mt-5 break-words text-4xl font-bold tracking-tight sm:text-5xl ${
                                                Number(summary.current_balance) < 0
                                                    ? 'text-rose-100'
                                                    : 'text-white'
                                            }`}
                                        >
                                            {formatRupiah(summary.current_balance)}
                                        </p>

                                        {Number(summary.net ?? 0) !== 0 && (
                                            <span
                                                className={`mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                                                    isPositiveNet
                                                        ? 'bg-white/15 text-white ring-1 ring-white/20'
                                                        : 'bg-rose-400/15 text-rose-50 ring-1 ring-rose-200/20'
                                                }`}
                                            >
                                                <Icon
                                                    name={isPositiveNet ? 'arrowUp' : 'arrowDown'}
                                                    className="h-3.5 w-3.5"
                                                />
                                                {isPositiveNet ? 'Naik' : 'Turun'} pada periode ini
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 lg:min-w-80">
                                        <HeroMetric
                                            label="Arus Masuk"
                                            value={formatRupiah(summary.income)}
                                        />
                                        <HeroMetric
                                            label="Arus Keluar"
                                            value={formatRupiah(summary.expense)}
                                        />
                                        <HeroMetric
                                            label="Arus Bersih"
                                            value={formatSignedRupiah(summary.net)}
                                        />
                                        <HeroMetric
                                            label="Jumlah Tx"
                                            value={summary.transaction_count ?? 0}
                                        />
                                    </div>
                                </div>
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100 sm:p-5">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-950">
                                            Periode Transaksi
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Pilih rentang untuk melihat ringkasan dan grafik.
                                        </p>
                                    </div>

                                    <div className="rounded-2xl bg-slate-100 p-1">
                                        <div className="grid grid-cols-4 gap-1">
                                            {periodTabs.map((tab) => {
                                                const active = period.key === tab.key;

                                                return (
                                                    <button
                                                        key={tab.key}
                                                        type="button"
                                                        onClick={() => goToPeriod(tab.key)}
                                                        className={`rounded-xl px-3 py-2 text-xs font-bold transition sm:text-sm ${
                                                            active
                                                                ? 'bg-white text-primary-700 shadow-sm'
                                                                : 'text-slate-500 hover:text-primary-700'
                                                        }`}
                                                    >
                                                        {tab.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {period.key !== 'all' && (
                                    <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                        <button
                                            type="button"
                                            onClick={() => stepPeriod(period.previous)}
                                            aria-label="Periode sebelumnya"
                                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-primary-600"
                                        >
                                            <Icon name="chevronLeft" className="h-4 w-4" />
                                        </button>

                                        <p className="text-center text-sm font-bold text-slate-700">
                                            {period.label}
                                        </p>

                                        <button
                                            type="button"
                                            onClick={() => stepPeriod(period.next)}
                                            aria-label="Periode berikutnya"
                                            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-primary-600"
                                        >
                                            <Icon name="chevronRight" className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-950">
                                            Grafik Saldo
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Pergerakan saldo berdasarkan periode terpilih.
                                        </p>
                                    </div>

                                    <span className="inline-flex w-fit items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">
                                        {formatSignedRupiah(summary.net)}
                                    </span>
                                </div>

                                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                                    <svg
                                        viewBox="0 0 320 110"
                                        className="h-44 w-full"
                                        preserveAspectRatio="none"
                                    >
                                        <defs>
                                            <linearGradient
                                                id="walletChartFill"
                                                x1="0"
                                                x2="0"
                                                y1="0"
                                                y2="1"
                                            >
                                                <stop
                                                    offset="0%"
                                                    stopColor="#2563EB"
                                                    stopOpacity="0.22"
                                                />
                                                <stop
                                                    offset="100%"
                                                    stopColor="#2563EB"
                                                    stopOpacity="0"
                                                />
                                            </linearGradient>
                                        </defs>

                                        {[0, 1, 2, 3].map((row) => (
                                            <line
                                                key={row}
                                                x1="0"
                                                x2="320"
                                                y1={row * 27 + 6}
                                                y2={row * 27 + 6}
                                                stroke="#dbeafe"
                                                strokeDasharray="2 4"
                                            />
                                        ))}

                                        {chartData.area && (
                                            <path d={chartData.area} fill="url(#walletChartFill)" />
                                        )}

                                        {chartData.line && (
                                            <path
                                                d={chartData.line}
                                                fill="none"
                                                stroke="#2563EB"
                                                strokeWidth="2.8"
                                                strokeLinejoin="round"
                                                strokeLinecap="round"
                                            />
                                        )}
                                    </svg>

                                    <div className="mt-3 grid text-[11px] font-bold text-slate-400" style={{ gridTemplateColumns: `repeat(${chartLabels.length || 1}, minmax(0, 1fr))` }}>
                                        {chartLabels.map((point) => (
                                            <span key={point.label} className="truncate text-center first:text-left last:text-right">
                                                {point.label}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </section>

                        </div>

                        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
                            <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
                                <div className="flex items-end justify-between gap-3">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-950">
                                            Ringkasan
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            {periodTabs.find((tab) => tab.key === period.key)?.label}{' '}
                                            • {period.label}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-5 grid grid-cols-2 gap-3">
                                    <SummaryCard
                                        label="Masuk"
                                        value={formatRupiah(summary.income)}
                                        icon="arrowDown"
                                        tone="green"
                                    />
                                    <SummaryCard
                                        label="Keluar"
                                        value={formatRupiah(summary.expense)}
                                        icon="arrowUp"
                                        tone="red"
                                    />
                                    <SummaryCard
                                        label="Bersih"
                                        value={formatSignedRupiah(summary.net)}
                                        icon="exchange"
                                        tone="blue"
                                    />
                                    <SummaryCard
                                        label="Tx"
                                        value={summary.transaction_count ?? 0}
                                        icon="transactions"
                                        tone="slate"
                                    />
                                </div>
                            </section>

                            <section className="rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-100">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-950">
                                            Transaksi Terakhir
                                        </h2>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Riwayat dari dompet ini.
                                        </p>
                                    </div>

                                    <Link
                                        href={route('transactions.index', { wallet_id: wallet.id })}
                                        className="text-sm font-bold text-primary-600 hover:text-primary-700"
                                    >
                                        Semua
                                    </Link>
                                </div>

                                <div className="max-h-[42rem] overflow-y-auto px-5 py-4">
                                    <div className="space-y-5">
                                        {groupedTransactions.length === 0 && (
                                            <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                                                Belum ada transaksi pada periode ini.
                                            </div>
                                        )}

                                        {groupedTransactions.map((group) => (
                                            <div key={group.date} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                                                        {formatDateLong(group.date)}
                                                    </p>
                                                    <p
                                                        className={`text-sm font-bold ${
                                                            group.total >= 0
                                                                ? 'text-emerald-600'
                                                                : 'text-rose-600'
                                                        }`}
                                                    >
                                                        {formatSignedRupiah(group.total)}
                                                    </p>
                                                </div>

                                                <div className="space-y-3">
                                                    {group.items.map((transaction) => {
                                                        const accent =
                                                            transactionAccent(transaction);

                                                        return (
                                                            <button
                                                                key={transaction.id}
                                                                type="button"
                                                                onClick={() =>
                                                                    openDetail(transaction)
                                                                }
                                                                className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-100 hover:shadow-md"
                                                            >
                                                                <span
                                                                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${accent.bubble}`}
                                                                >
                                                                    <Icon
                                                                        name={accent.icon}
                                                                        className="h-5 w-5"
                                                                    />
                                                                </span>

                                                                <div className="min-w-0 flex-1">
                                                                    <p className="truncate text-sm font-bold text-slate-950">
                                                                        {transactionTitle(
                                                                            transaction,
                                                                        )}
                                                                    </p>
                                                                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                                                                        {transaction.type === 'transfer'
                                                                            ? transaction.description?.trim() || 'Transfer antar dompet'
                                                                            : transaction.category?.name ?? 'Tanpa kategori'}
                                                                    </p>
                                                                </div>

                                                                <div className="shrink-0 text-right">
                                                                    <span className="text-[11px] font-medium text-slate-400">
                                                                        {formatTime(
                                                                            transaction.created_at ??
                                                                                transaction.updated_at,
                                                                        )}
                                                                    </span>
                                                                    <p
                                                                        className={`mt-0.5 text-sm font-bold ${accent.amount}`}
                                                                    >
                                                                        {accent.sign}
                                                                        {formatRupiah(
                                                                            transaction.amount,
                                                                        )}
                                                                    </p>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {transactions.links?.length > 3 && (
                                    <div className="flex flex-wrap justify-center gap-2 border-t border-slate-100 px-5 py-4">
                                        {transactions.links.map((link, index) => (
                                            <Link
                                                key={`${link.label}-${index}`}
                                                href={link.url ?? '#'}
                                                preserveScroll
                                                className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                                                    link.active
                                                        ? 'bg-primary-600 text-white'
                                                        : 'bg-slate-100 text-slate-600'
                                                } ${!link.url ? 'pointer-events-none opacity-40' : ''}`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        </aside>
                    </div>
                </div>
            </div>

            <Modal show={Boolean(detailTransaction)} maxWidth="md" onClose={closeDetail}>
                {detailTransaction && detailAccent && (
                    <div className="overflow-hidden rounded-2xl bg-white">
                        <ModalHeader
                            title={transactionTitle(detailTransaction)}
                            subtitle={detailAccent.label}
                            icon={detailAccent.icon}
                            onClose={closeDetail}
                        />

                        <div className="space-y-5 px-5 py-5 sm:px-6">
                            <div className="rounded-2xl bg-primary-50 px-5 py-5 text-center ring-1 ring-primary-100">
                                <p className="text-xs font-bold uppercase tracking-wide text-primary-700">
                                    Nominal
                                </p>
                                <p
                                    className={`mt-2 break-words text-3xl font-bold ${detailAccent.amount}`}
                                >
                                    {detailAccent.sign}
                                    {formatRupiah(detailTransaction.amount)}
                                </p>
                            </div>

                            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                {detailTransaction.type === 'transfer' ? (
                                    <>
                                        <DetailRow
                                            label="Dari"
                                            value={detailTransaction.from_wallet?.name ?? '-'}
                                        />
                                        <DetailRow
                                            label="Ke"
                                            value={detailTransaction.to_wallet?.name ?? '-'}
                                        />
                                    </>
                                ) : (
                                    <>
                                        <DetailRow
                                            label="Kategori"
                                            value={detailTransaction.category?.name ?? '-'}
                                        />
                                        <DetailRow label="Dompet" value={wallet.name} />
                                    </>
                                )}
                                <DetailRow
                                    label="Tanggal"
                                    value={formatDateLong(
                                        detailTransaction.transaction_date,
                                    )}
                                />
                                <DetailRow
                                    label="Dicatat"
                                    value={formatTime(detailTransaction.created_at) || '-'}
                                />
                                <div className="sm:col-span-2">
                                    <DetailRow
                                        label="Deskripsi"
                                        value={
                                            detailTransaction.description?.trim() ||
                                            'Tidak ada catatan tambahan.'
                                        }
                                    />
                                </div>
                            </dl>
                        </div>

                        {detailTransaction.type !== 'transfer' && (
                            <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                                <button
                                    type="button"
                                    onClick={() => destroyTransaction(detailTransaction)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                                >
                                    <Icon name="trash" className="h-4 w-4" />
                                    Hapus
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openEditTransaction(detailTransaction)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-primary-700"
                                >
                                    <Icon name="edit" className="h-4 w-4" />
                                    Edit Transaksi
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            <Modal show={walletEditOpen} maxWidth="2xl" onClose={closeEditWallet}>
                <form onSubmit={submitWallet} className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white">
                    <ModalHeader
                        title="Edit Dompet"
                        subtitle="Ubah nama, provider, nomor akun, status, dan logo dompet."
                        icon="edit"
                        onClose={closeEditWallet}
                    />

                    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nama Dompet" error={walletForm.errors.name}>
                                <input
                                    className="form-input rounded-2xl"
                                    value={walletForm.data.name}
                                    onChange={(event) =>
                                        walletForm.setData('name', event.target.value)
                                    }
                                    placeholder="Contoh: Cash, BCA Utama, DANA"
                                    autoFocus
                                />
                            </Field>

                            <Field label="Kategori" error={walletForm.errors.type}>
                                <FormDropdown
                                    value={walletForm.data.type}
                                    options={walletTypeOptions}
                                    onChange={(value) => {
                                        walletForm.setData({
                                            ...walletForm.data,
                                            type: value,
                                            wallet_provider_id: '',
                                            institution: '',
                                            account_number: '',
                                            account_name: '',
                                            phone_number: '',
                                            custom_logo: null,
                                        });
                                        updateCustomLogo(null);
                                    }}
                                />
                            </Field>
                        </div>

                        {['bank', 'e-wallet'].includes(walletForm.data.type) && (
                            <div className="space-y-4">
                                <Field
                                    label={walletForm.data.type === 'bank' ? 'Pilih Bank' : 'Pilih E-Wallet'}
                                    error={walletForm.errors.wallet_provider_id}
                                >
                                    <Autocomplete
                                        value={walletForm.data.wallet_provider_id}
                                        options={providerOptions}
                                        getOptionLabel={(provider) => provider.name}
                                        getOptionValue={(provider) => provider.id}
                                        onChange={(value) => walletForm.setData('wallet_provider_id', value)}
                                        placeholder={
                                            walletForm.data.type === 'bank'
                                                ? 'Cari bank'
                                                : 'Cari e-wallet'
                                        }
                                        emptyText="Provider tidak ditemukan."
                                        leadingIcon={walletForm.data.type === 'bank' ? 'bank' : 'wallet'}
                                        getOptionImage={(provider) => provider.logo}
                                    />
                                </Field>

                                {walletForm.data.type === 'bank' && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field label="Nomor Rekening" error={walletForm.errors.account_number}>
                                            <input
                                                className="form-input rounded-2xl"
                                                value={walletForm.data.account_number}
                                                onChange={(event) =>
                                                    walletForm.setData(
                                                        'account_number',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Contoh: 1234567890"
                                            />
                                        </Field>

                                        <Field label="Nama Pemilik" error={walletForm.errors.account_name}>
                                            <input
                                                className="form-input rounded-2xl"
                                                value={walletForm.data.account_name}
                                                onChange={(event) =>
                                                    walletForm.setData(
                                                        'account_name',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Nama pemilik rekening"
                                            />
                                        </Field>
                                    </div>
                                )}

                                {walletForm.data.type === 'e-wallet' && (
                                    <Field label="Nomor HP" error={walletForm.errors.phone_number}>
                                        <input
                                            className="form-input rounded-2xl"
                                            value={walletForm.data.phone_number}
                                            onChange={(event) =>
                                                walletForm.setData(
                                                    'phone_number',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Contoh: 081234567890"
                                        />
                                    </Field>
                                )}
                            </div>
                        )}

                        {walletForm.data.type === 'other' && (
                            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                                <Field label="Nama Provider / Keterangan" error={walletForm.errors.institution}>
                                    <input
                                        className="form-input rounded-2xl"
                                        value={walletForm.data.institution}
                                        onChange={(event) =>
                                            walletForm.setData('institution', event.target.value)
                                        }
                                        placeholder="Contoh: Celengan, Crypto Wallet, Voucher"
                                    />
                                </Field>

                                <Field label="Logo Custom" error={walletForm.errors.custom_logo}>
                                    <label className="flex min-h-[8.5rem] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition hover:border-primary-300 hover:bg-primary-50/40 sm:w-40">
                                        {customLogoPreview ? (
                                            <img
                                                src={customLogoPreview}
                                                alt="Preview logo custom"
                                                className="h-16 w-16 object-contain"
                                            />
                                        ) : (
                                            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
                                                <Icon name="plus" className="h-5 w-5" />
                                            </span>
                                        )}

                                        <span className="text-xs font-bold text-slate-500">
                                            {customLogoPreview ? 'Ganti logo' : 'Upload logo'}
                                        </span>

                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            className="hidden"
                                            onChange={(event) =>
                                                updateCustomLogo(event.target.files?.[0] ?? null)
                                            }
                                        />
                                    </label>
                                </Field>
                            </div>
                        )}

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    checked={Boolean(walletForm.data.is_primary)}
                                    onChange={(event) =>
                                        walletForm.setData('is_primary', event.target.checked)
                                    }
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-700">
                                        Jadikan dompet utama
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                                        Jika aktif, dompet utama lain akan diganti.
                                    </span>
                                </span>
                            </label>

                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    checked={Boolean(walletForm.data.is_active)}
                                    onChange={(event) =>
                                        walletForm.setData('is_active', event.target.checked)
                                    }
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-700">
                                        Aktifkan dompet
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                                        Dompet aktif masuk ke transaksi dan total saldo.
                                    </span>
                                </span>
                            </label>
                        </div>
                    </div>

                    <ModalFooter
                        cancelLabel="Batal"
                        submitLabel="Simpan Dompet"
                        processing={walletForm.processing}
                        onCancel={closeEditWallet}
                    />
                </form>
            </Modal>

            <Modal show={transactionOpen} maxWidth="2xl" onClose={closeTransaction}>
                <form onSubmit={submitTransaction} className="overflow-hidden rounded-2xl bg-white">
                    <ModalHeader
                        title={editing ? 'Edit Transaksi' : 'Transaksi Baru'}
                        subtitle="Perubahan nominal atau dompet akan menyesuaikan saldo otomatis."
                        icon={txForm.data.type === 'income' ? 'arrowDown' : 'receipt'}
                        onClose={closeTransaction}
                    />

                    <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
                        <div className="space-y-5">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Tipe Transaksi" error={txForm.errors.type}>
                                    <FormDropdown
                                        value={txForm.data.type}
                                        options={[
                                            { value: 'expense', label: 'Pengeluaran' },
                                            { value: 'income', label: 'Pemasukan' },
                                        ]}
                                        onChange={(value) =>
                                            txForm.setData((current) => ({
                                                ...current,
                                                type: value,
                                                category_id: '',
                                            }))
                                        }
                                    />
                                </Field>

                                <Field label="Dompet" error={txForm.errors.wallet_id}>
                                    <Autocomplete
                                        value={txForm.data.wallet_id}
                                        options={activeWallets}
                                        getOptionLabel={(item) => item.name}
                                        getOptionValue={(item) => item.id}
                                        onChange={(value) => txForm.setData('wallet_id', value)}
                                        placeholder="Cari dompet"
                                        emptyText="Dompet tidak ditemukan."
                                        leadingIcon="wallet"
                                    />
                                </Field>

                                <Field label="Kategori" error={txForm.errors.category_id}>
                                    <Autocomplete
                                        value={txForm.data.category_id}
                                        options={filteredCategories}
                                        getOptionLabel={(category) => category.name}
                                        getOptionValue={(category) => category.id}
                                        onChange={(value) => txForm.setData('category_id', value)}
                                        placeholder="Cari kategori"
                                        emptyText="Kategori tidak ditemukan."
                                        leadingIcon="search"
                                    />
                                </Field>

                                <Field label="Nominal" error={txForm.errors.amount}>
                                    <CurrencyInput
                                        value={txForm.data.amount}
                                        onChange={(event) =>
                                            txForm.setData('amount', event.target.value)
                                        }
                                    />
                                </Field>

                                <Field label="Tanggal" error={txForm.errors.transaction_date}>
                                    <DatePicker
                                        value={txForm.data.transaction_date}
                                        onChange={(value) => txForm.setData('transaction_date', value)}
                                        placeholder="Pilih tanggal"
                                    />
                                </Field>

                                <div className="sm:col-span-2">
                                    <Field label="Deskripsi" error={txForm.errors.description}>
                                        <input
                                            className="form-input rounded-2xl"
                                            value={txForm.data.description}
                                            onChange={(event) =>
                                                txForm.setData(
                                                    'description',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Contoh: Makan siang, Gaji, Top up"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ModalFooter
                        cancelLabel="Batal"
                        submitLabel={editing ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                        processing={txForm.processing}
                        onCancel={closeTransaction}
                    />
                </form>
            </Modal>

            <Modal show={transferOpen} maxWidth="lg" onClose={closeTransfer}>
                <form onSubmit={submitTransfer} className="overflow-hidden rounded-2xl bg-white">
                    <ModalHeader
                        title="Transfer Dompet"
                        subtitle={`Pindahkan saldo dari ${wallet.name} ke dompet lain.`}
                        icon="exchange"
                        onClose={closeTransfer}
                    />

                    <div className="max-h-[70vh] overflow-y-auto px-5 py-5 sm:px-6">
                        <div className="space-y-5">
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
                                <Field label="Dari" error={transferForm.errors.from_wallet_id}>
                                    <input
                                        className="form-input rounded-2xl bg-slate-50"
                                        value={wallet.name}
                                        readOnly
                                    />
                                </Field>

                                <div className="flex h-10 items-center justify-center text-primary-500 sm:w-10">
                                    <Icon
                                        name="arrowRight"
                                        className="h-5 w-5 rotate-90 sm:rotate-0"
                                    />
                                </div>

                                <Field label="Tujuan" error={transferForm.errors.to_wallet_id}>
                                    <Autocomplete
                                        value={transferForm.data.to_wallet_id}
                                        options={transferTargets}
                                        getOptionLabel={(item) => item.name}
                                        getOptionValue={(item) => item.id}
                                        onChange={(value) => transferForm.setData('to_wallet_id', value)}
                                        placeholder="Cari dompet tujuan"
                                        emptyText="Dompet tujuan tidak ditemukan."
                                        leadingIcon="wallet"
                                    />
                                </Field>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Nominal" error={transferForm.errors.amount}>
                                    <CurrencyInput
                                        value={transferForm.data.amount}
                                        onChange={(event) =>
                                            transferForm.setData(
                                                'amount',
                                                event.target.value,
                                            )
                                        }
                                    />
                                </Field>

                                <Field label="Tanggal" error={transferForm.errors.transfer_date}>
                                    <DatePicker
                                        value={transferForm.data.transfer_date}
                                        onChange={(value) => transferForm.setData('transfer_date', value)}
                                        placeholder="Pilih tanggal"
                                    />
                                </Field>

                                <div className="sm:col-span-2">
                                    <Field
                                        label="Deskripsi"
                                        error={transferForm.errors.description}
                                    >
                                        <input
                                            className="form-input rounded-2xl"
                                            value={transferForm.data.description}
                                            onChange={(event) =>
                                                transferForm.setData(
                                                    'description',
                                                    event.target.value,
                                                )
                                            }
                                            placeholder="Opsional"
                                        />
                                    </Field>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ModalFooter
                        cancelLabel="Batal"
                        submitLabel="Transfer"
                        processing={transferForm.processing}
                        onCancel={closeTransfer}
                    />
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

function HeroMetric({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">
                {label}
            </p>
            <p className="mt-1 break-words text-lg font-bold text-white">{value}</p>
        </div>
    );
}

const summaryToneMap = {
    green: { icon: 'bg-emerald-50 text-emerald-600' },
    red: { icon: 'bg-rose-50 text-rose-600' },
    blue: { icon: 'bg-primary-50 text-primary-600' },
    amber: { icon: 'bg-amber-50 text-amber-600' },
    slate: { icon: 'bg-slate-100 text-slate-500' },
};

function SummaryCard({ label, value, icon, tone = 'slate' }) {
    const toneClass = summaryToneMap[tone]?.icon ?? summaryToneMap.slate.icon;

    return (
        <div className="rounded-2xl bg-slate-50 p-4 transition hover:bg-primary-50/40">
            <div className="flex items-center gap-2 text-slate-500">
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${toneClass}`}>
                    <Icon name={icon} className="h-4 w-4" />
                </span>
                <p className="text-xs font-bold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-3 break-words text-lg font-bold text-slate-950">{value}</p>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{value}</dd>
        </div>
    );
}

function ModalHeader({ title, subtitle, icon, onClose }) {
    return (
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-100 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 h-28 w-28 rounded-full bg-sky-100 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/20">
                        <Icon name={icon} className="h-6 w-6" />
                    </span>

                    <div>
                        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
                        {subtitle && (
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                {subtitle}
                            </p>
                        )}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700"
                    aria-label="Tutup modal"
                >
                    <Icon name="x" className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}

function ModalFooter({ cancelLabel, submitLabel, processing, onCancel }) {
    return (
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
                type="button"
                onClick={onCancel}
                className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 sm:w-auto"
            >
                {cancelLabel}
            </button>

            <button
                type="submit"
                disabled={processing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
                {processing ? (
                    <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Menyimpan…
                    </>
                ) : (
                    submitLabel
                )}
            </button>
        </div>
    );
}

function CurrencyInput({ value, onChange, autoFocus = false }) {
    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                Rp
            </span>
            <input
                type="number"
                min="0"
                step="0.01"
                className="form-input rounded-2xl pl-11"
                value={value}
                onChange={onChange}
                autoFocus={autoFocus}
                placeholder="0"
            />
        </div>
    );
}

function Field({ label, error, children }) {
    return (
        <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {label}
            </span>
            <div className="mt-1.5">{children}</div>
            <InputError message={error} className="mt-1" />
        </label>
    );
}
