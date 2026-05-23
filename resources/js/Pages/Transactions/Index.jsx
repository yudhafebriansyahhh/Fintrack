import Autocomplete from "@/Components/Autocomplete";
import DatePicker from "@/Components/DatePicker";
import FormDropdown from "@/Components/FormDropdown";
import Icon from "@/Components/Icon";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { confirmDelete, toastSuccess } from "@/Utils/swal";
import { Head, Link, router, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const formatSignedRupiah = (value) => {
    const number = Number(value ?? 0);
    const formatted = formatRupiah(Math.abs(number));
    if (number > 0) return `+${formatted}`;
    if (number < 0) return `-${formatted}`;
    return formatted;
};

const formatDate = (value) =>
    new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(new Date(value));

const formatDateLong = (value) =>
    new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
    }).format(new Date(value));

const today = () => new Date().toISOString().slice(0, 10);

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

const transactionAccent = (transaction) =>
    transaction?.type === "income"
        ? {
              bubble: "bg-emerald-50 text-emerald-600",
              chip: "bg-emerald-50 text-emerald-700",
              amount: "text-emerald-600",
              sign: "+",
              icon: "arrowDown",
              label: "Pemasukan",
          }
        : {
              bubble: "bg-primary-50 text-primary-700",
              chip: "bg-primary-50 text-primary-700",
              amount: "text-rose-600",
              sign: "-",
              icon: "receipt",
              label: "Pengeluaran",
          };

const transactionTitle = (transaction) =>
    transaction?.description?.trim() ||
    transaction?.category?.name ||
    "Tanpa keterangan";

export default function Index({
    transactions,
    wallets,
    categories,
    filters,
    categoryDistribution = [],
    trend = [],
}) {
    const { flash } = usePage().props;

    const [editing, setEditing] = useState(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [detailTransaction, setDetailTransaction] = useState(null);
    const [filterOpen, setFilterOpen] = useState(false);

    const [filterDraft, setFilterDraft] = useState(() => ({
        type: filters?.type ?? "",
        wallet_id: filters?.wallet_id ?? "",
        category_id: filters?.category_id ?? "",
        from: filters?.from ?? "",
        to: filters?.to ?? "",
        search: filters?.search ?? "",
    }));

    const perPage = Number(filters?.per_page ?? PER_PAGE_OPTIONS[0]);
    const chartPeriod = filters?.chart_period ?? "monthly";

    const form = useForm({
        type: "expense",
        wallet_id: "",
        category_id: "",
        amount: "",
        transaction_date: today(),
        description: "",
    });

    const filteredCategories = useMemo(
        () => categories.filter((category) => category.type === form.data.type),
        [categories, form.data.type],
    );

    const activeWallets = useMemo(
        () =>
            wallets.filter(
                (wallet) =>
                    wallet.is_active || wallet.id === form.data.wallet_id,
            ),
        [wallets, form.data.wallet_id],
    );

    const totals = useMemo(() => {
        return (transactions?.data ?? []).reduce(
            (acc, item) => {
                const amount = Number(item.amount);
                if (item.type === "income") acc.income += amount;
                else acc.expense += amount;
                return acc;
            },
            { income: 0, expense: 0 },
        );
    }, [transactions]);

    const hasActiveFilters = useMemo(() => {
        return Boolean(
            filterDraft.type ||
            filterDraft.wallet_id ||
            filterDraft.category_id ||
            filterDraft.from ||
            filterDraft.to ||
            filterDraft.search,
        );
    }, [filterDraft]);

    const detailAccent = detailTransaction
        ? transactionAccent(detailTransaction)
        : null;

    const buildQuery = (overrides = {}) => {
        const merged = {
            ...filterDraft,
            per_page: perPage,
            chart_period: chartPeriod,
            ...overrides,
        };

        return Object.fromEntries(
            Object.entries(merged).filter(
                ([, value]) =>
                    value !== "" && value !== null && value !== undefined,
            ),
        );
    };

    const navigate = (params) => {
        router.get(route("transactions.index"), params, {
            preserveScroll: true,
            preserveState: true,
            replace: true,
        });
    };

    const resetForm = () => {
        setEditing(null);
        form.reset();
        form.clearErrors();
        form.setData({
            type: "expense",
            wallet_id: "",
            category_id: "",
            amount: "",
            transaction_date: today(),
            description: "",
        });
    };

    const openCreateForm = () => {
        resetForm();
        setShowTransactionModal(true);
    };

    const closeForm = () => {
        resetForm();
        setShowTransactionModal(false);
    };

    const handleTypeChange = (type) => {
        form.setData((current) => ({
            ...current,
            type,
            category_id:
                categories.find(
                    (category) =>
                        category.id === current.category_id &&
                        category.type === type,
                )?.id ?? "",
        }));
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess(
                    editing ? "Transaksi diperbarui" : "Transaksi dicatat",
                );
                closeForm();
            },
            onError: () => setShowTransactionModal(true),
        };

        if (editing) {
            form.patch(route("transactions.update", editing.id), options);
            return;
        }

        form.post(route("transactions.store"), options);
    };

    const openDetail = (transaction) => setDetailTransaction(transaction);

    const closeDetail = () => setDetailTransaction(null);

    const startEditFromDetail = () => {
        if (!detailTransaction) return;

        setEditing(detailTransaction);
        form.clearErrors();
        form.setData({
            type: detailTransaction.type,
            wallet_id: detailTransaction.wallet_id,
            category_id: detailTransaction.category_id,
            amount: detailTransaction.amount,
            transaction_date: detailTransaction.transaction_date,
            description: detailTransaction.description ?? "",
        });
        setDetailTransaction(null);
        setShowTransactionModal(true);
    };

    const destroy = async (transaction) => {
        const confirmed = await confirmDelete({
            title: "Hapus transaksi ini?",
            text: `${transactionTitle(transaction)} • ${formatRupiah(transaction.amount)}`,
        });

        if (!confirmed) return;

        router.delete(route("transactions.destroy", transaction.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess("Transaksi dihapus");
                closeDetail();
            },
        });
    };

    const submitFilters = (event) => {
        event.preventDefault();
        navigate(buildQuery());
    };

    const clearFilters = () => {
        setFilterDraft({
            type: "",
            wallet_id: "",
            category_id: "",
            from: "",
            to: "",
            search: "",
        });

        navigate({ per_page: perPage });
    };

    const onPerPageChange = (event) => {
        const value = Number(event.target.value);
        navigate(buildQuery({ per_page: value }));
    };

    const meta =
        transactions?.from && transactions?.to
            ? `Menampilkan ${transactions.from}-${transactions.to} dari ${transactions.total} transaksi.`
            : `Total ${transactions?.total ?? 0} transaksi.`;

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-16 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                                FinTrack
                            </div>

                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Transaksi
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                                Catat pemasukan dan pengeluaran. Saldo dompet
                                otomatis menyesuaikan setiap perubahan.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={openCreateForm}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto"
                        >
                            <Icon name="plus" className="h-4 w-4" />
                            Tambah Transaksi
                        </button>
                    </div>
                </section>
            }
        >
            <Head title="Transaksi" />

            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
                {flash?.success && (
                    <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700">
                        {flash.success}
                    </div>
                )}

                <section className="grid gap-3 sm:grid-cols-3">
                    <SummaryCard
                        label="Pemasukan Halaman"
                        value={formatRupiah(totals.income)}
                        icon="arrowDown"
                        tone="green"
                    />
                    <SummaryCard
                        label="Pengeluaran Halaman"
                        value={formatRupiah(totals.expense)}
                        icon="arrowUp"
                        tone="red"
                    />
                    <SummaryCard
                        label="Selisih Halaman"
                        value={formatSignedRupiah(
                            totals.income - totals.expense,
                        )}
                        icon="exchange"
                        tone={
                            totals.income - totals.expense >= 0 ? "blue" : "red"
                        }
                    />
                </section>

                <section className="grid gap-4 lg:grid-cols-5">
                    <CategoryPie distribution={categoryDistribution} />
                    <TrendChart
                        trend={trend}
                        period={chartPeriod}
                        onChangePeriod={(value) =>
                            navigate(buildQuery({ chart_period: value }))
                        }
                    />
                </section>

                <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Filter Transaksi
                            </h2>
                            <p className="text-sm text-slate-500">
                                Saring berdasarkan tipe, dompet, kategori, atau
                                rentang tanggal.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                            <button
                                type="button"
                                onClick={() => setFilterOpen((open) => !open)}
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition lg:hidden ${
                                    filterOpen || hasActiveFilters
                                        ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                                        : "bg-primary-50 text-primary-700 hover:bg-primary-100"
                                }`}
                            >
                                <Icon name="filter" className="h-4 w-4" />
                                Filter
                            </button>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                            >
                                <Icon name="x" className="h-4 w-4" />
                                Reset
                            </button>
                        </div>
                    </div>

                    <form
                        onSubmit={submitFilters}
                        className={`gap-3 pt-4 md:grid-cols-3 lg:grid lg:grid-cols-6 ${
                            filterOpen ? "grid" : "hidden lg:grid"
                        }`}
                    >
                        <select
                            className="rounded-2xl border-slate-200 text-sm focus:border-primary-500 focus:ring-primary-500"
                            value={filterDraft.type}
                            onChange={(event) =>
                                setFilterDraft((draft) => ({
                                    ...draft,
                                    type: event.target.value,
                                }))
                            }
                        >
                            <option value="">Semua tipe</option>
                            <option value="income">Pemasukan</option>
                            <option value="expense">Pengeluaran</option>
                        </select>

                        <select
                            className="rounded-2xl border-slate-200 text-sm focus:border-primary-500 focus:ring-primary-500"
                            value={filterDraft.wallet_id}
                            onChange={(event) =>
                                setFilterDraft((draft) => ({
                                    ...draft,
                                    wallet_id: event.target.value,
                                }))
                            }
                        >
                            <option value="">Semua dompet</option>
                            {wallets.map((wallet) => (
                                <option key={wallet.id} value={wallet.id}>
                                    {wallet.name}
                                </option>
                            ))}
                        </select>

                        <select
                            className="rounded-2xl border-slate-200 text-sm focus:border-primary-500 focus:ring-primary-500"
                            value={filterDraft.category_id}
                            onChange={(event) =>
                                setFilterDraft((draft) => ({
                                    ...draft,
                                    category_id: event.target.value,
                                }))
                            }
                        >
                            <option value="">Semua kategori</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name} (
                                    {category.type === "income"
                                        ? "pemasukan"
                                        : "pengeluaran"}
                                    )
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            className="rounded-2xl border-slate-200 text-sm focus:border-primary-500 focus:ring-primary-500"
                            value={filterDraft.from}
                            onChange={(event) =>
                                setFilterDraft((draft) => ({
                                    ...draft,
                                    from: event.target.value,
                                }))
                            }
                        />

                        <input
                            type="date"
                            className="rounded-2xl border-slate-200 text-sm focus:border-primary-500 focus:ring-primary-500"
                            value={filterDraft.to}
                            onChange={(event) =>
                                setFilterDraft((draft) => ({
                                    ...draft,
                                    to: event.target.value,
                                }))
                            }
                        />

                        <div className="flex gap-2 md:col-span-3 lg:col-span-1">
                            <input
                                type="search"
                                placeholder="Cari deskripsi"
                                className="w-full rounded-2xl border-slate-200 text-sm focus:border-primary-500 focus:ring-primary-500"
                                value={filterDraft.search}
                                onChange={(event) =>
                                    setFilterDraft((draft) => ({
                                        ...draft,
                                        search: event.target.value,
                                    }))
                                }
                            />
                            <button
                                type="submit"
                                className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700"
                            >
                                Filter
                            </button>
                        </div>
                    </form>
                </section>

                <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-100">
                    <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Riwayat Transaksi
                            </h2>
                            <p className="text-sm text-slate-500">{meta}</p>
                            <p className="mt-1 text-xs text-slate-400">
                                Klik salah satu baris untuk melihat detail dan
                                opsi edit / hapus.
                            </p>
                        </div>

                        <label className="inline-flex items-center gap-2 self-start rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                            <span>Per halaman</span>
                            <select
                                value={perPage}
                                onChange={onPerPageChange}
                                className="rounded-xl border-slate-200 bg-white text-sm focus:border-primary-500 focus:ring-primary-500"
                            >
                                {PER_PAGE_OPTIONS.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Tanggal</th>
                                    <th className="px-4 py-3">Tipe</th>
                                    <th className="px-4 py-3">Kategori</th>
                                    <th className="px-4 py-3">Dompet</th>
                                    <th className="px-4 py-3">Deskripsi</th>
                                    <th className="px-4 py-3 text-right">
                                        Nominal
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {(transactions?.data ?? []).map(
                                    (transaction) => {
                                        const accent =
                                            transactionAccent(transaction);

                                        return (
                                            <tr
                                                key={transaction.id}
                                                onClick={() =>
                                                    openDetail(transaction)
                                                }
                                                className="cursor-pointer transition hover:bg-primary-50/40"
                                            >
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                                                    {formatDate(
                                                        transaction.transaction_date,
                                                    )}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm">
                                                    <span
                                                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${accent.chip}`}
                                                    >
                                                        <Icon
                                                            name={accent.icon}
                                                            className="h-3 w-3"
                                                        />
                                                        {accent.label}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                                                    {transaction.category
                                                        ?.name ?? "-"}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">
                                                    {transaction.wallet?.name ??
                                                        "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-slate-700">
                                                    {transaction.description?.trim() ||
                                                        "-"}
                                                </td>
                                                <td
                                                    className={`whitespace-nowrap px-4 py-3 text-right text-sm font-bold ${accent.amount}`}
                                                >
                                                    {accent.sign}
                                                    {formatRupiah(
                                                        transaction.amount,
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    },
                                )}

                                {(transactions?.data ?? []).length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-12 text-center text-sm text-slate-500"
                                        >
                                            Belum ada transaksi yang cocok
                                            dengan filter ini.
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
                                    href={link.url ?? ""}
                                    preserveScroll
                                    preserveState
                                    className={`rounded-xl px-3 py-1.5 font-bold ${
                                        link.active
                                            ? "bg-primary-600 text-white"
                                            : link.url
                                              ? "text-slate-600 hover:bg-slate-100"
                                              : "text-slate-300"
                                    }`}
                                    dangerouslySetInnerHTML={{
                                        __html: link.label,
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <Modal
                show={Boolean(detailTransaction)}
                maxWidth="md"
                onClose={closeDetail}
            >
                {detailTransaction && detailAccent && (
                    <div className="overflow-hidden rounded-2xl bg-white">
                        <div className="border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-5 sm:px-6">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-3">
                                    <span
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${detailAccent.bubble}`}
                                    >
                                        <Icon
                                            name={detailAccent.icon}
                                            className="h-5 w-5"
                                        />
                                    </span>

                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                            {detailAccent.label}
                                        </p>
                                        <h2 className="truncate text-lg font-bold text-slate-950">
                                            {transactionTitle(
                                                detailTransaction,
                                            )}
                                        </h2>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={closeDetail}
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
                                <p
                                    className={`mt-1 break-words text-3xl font-bold ${detailAccent.amount}`}
                                >
                                    {detailAccent.sign}
                                    {formatRupiah(detailTransaction.amount)}
                                </p>
                            </div>

                            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                <DetailRow
                                    label="Kategori"
                                    value={
                                        detailTransaction.category?.name ?? "-"
                                    }
                                />
                                <DetailRow
                                    label="Dompet"
                                    value={
                                        detailTransaction.wallet?.name ?? "-"
                                    }
                                />
                                <DetailRow
                                    label="Tanggal"
                                    value={formatDateLong(
                                        detailTransaction.transaction_date,
                                    )}
                                />
                                <DetailRow
                                    label="Tipe"
                                    value={detailAccent.label}
                                />
                                <div className="sm:col-span-2">
                                    <DetailRow
                                        label="Deskripsi"
                                        value={
                                            detailTransaction.description?.trim() ||
                                            "Tidak ada catatan tambahan."
                                        }
                                    />
                                </div>
                            </dl>
                        </div>

                        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex sm:justify-end sm:px-6">
                            <button
                                type="button"
                                onClick={() => destroy(detailTransaction)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 sm:px-4"
                            >
                                <Icon name="trash" className="h-4 w-4" />
                                Hapus
                            </button>

                            <button
                                type="button"
                                onClick={startEditFromDetail}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-3 py-3 text-sm font-bold text-white transition hover:bg-primary-700 sm:px-4"
                            >
                                <Icon name="edit" className="h-4 w-4" />
                                Edit
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                show={showTransactionModal}
                onClose={closeForm}
                maxWidth="2xl"
            >
                <div className="rounded-2xl bg-white shadow-xl">
                    <div className="rounded-t-2xl border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-4 sm:px-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">
                                    {editing ? "Edit data" : "Data baru"}
                                </p>
                                <h2 className="mt-1 text-lg font-bold text-slate-950">
                                    {editing
                                        ? "Edit Transaksi"
                                        : "Tambah Transaksi"}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Pilih tipe, dompet, kategori, lalu masukkan
                                    nominal transaksi.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Tutup modal"
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={submit}>
                        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                            <div>
                                <span className="text-xs font-bold uppercase text-slate-500">
                                    Tipe
                                </span>
                                <FormDropdown
                                    className="mt-1"
                                    value={form.data.type}
                                    onChange={(value) => handleTypeChange(value)}
                                    placeholder="Pilih tipe"
                                    options={[
                                        { value: "expense", label: "Pengeluaran" },
                                        { value: "income", label: "Pemasukan" },
                                    ]}
                                />
                                <InputError
                                    message={form.errors.type}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <span className="text-xs font-bold uppercase text-slate-500">
                                    Dompet
                                </span>
                                <Autocomplete
                                    className="mt-1"
                                    value={form.data.wallet_id}
                                    onChange={(value) => form.setData("wallet_id", value)}
                                    options={activeWallets}
                                    getOptionLabel={(wallet) => wallet.name}
                                    getOptionValue={(wallet) => wallet.id}
                                    placeholder="Cari dompet"
                                    emptyText="Dompet tidak ditemukan."
                                    leadingIcon="wallet"
                                />
                                <InputError
                                    message={form.errors.wallet_id}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <span className="text-xs font-bold uppercase text-slate-500">
                                    Kategori
                                </span>
                                <Autocomplete
                                    className="mt-1"
                                    value={form.data.category_id}
                                    onChange={(value) => form.setData("category_id", value)}
                                    options={filteredCategories}
                                    getOptionLabel={(category) => category.name}
                                    getOptionValue={(category) => category.id}
                                    placeholder="Cari kategori"
                                    emptyText="Kategori tidak ditemukan."
                                    leadingIcon="filter"
                                />
                                {filteredCategories.length === 0 && (
                                    <p className="mt-1 text-xs text-slate-500">
                                        Belum ada kategori untuk tipe ini.{" "}
                                        <Link
                                            href={route("categories.index")}
                                            className="font-bold text-primary-600"
                                        >
                                            Tambah kategori
                                        </Link>
                                    </p>
                                )}
                                <InputError
                                    message={form.errors.category_id}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <span className="text-xs font-bold uppercase text-slate-500">
                                    Nominal
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    className="mt-1 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold shadow-sm transition focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100"
                                    value={form.data.amount}
                                    onChange={(event) =>
                                        form.setData(
                                            "amount",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="0"
                                    autoFocus
                                />
                                <InputError
                                    message={form.errors.amount}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <span className="text-xs font-bold uppercase text-slate-500">
                                    Tanggal
                                </span>
                                <DatePicker
                                    className="mt-1"
                                    value={form.data.transaction_date}
                                    onChange={(value) => form.setData("transaction_date", value)}
                                    placeholder="Pilih tanggal"
                                />
                                <InputError
                                    message={form.errors.transaction_date}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <span className="text-xs font-bold uppercase text-slate-500">
                                    Deskripsi
                                </span>
                                <input
                                    type="text"
                                    className="mt-1 block w-full rounded-2xl border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold shadow-sm transition placeholder:text-slate-400 focus:border-primary-400 focus:bg-white focus:ring-4 focus:ring-primary-100"
                                    value={form.data.description}
                                    onChange={(event) =>
                                        form.setData(
                                            "description",
                                            event.target.value,
                                        )
                                    }
                                    placeholder="Opsional"
                                />
                                <InputError
                                    message={form.errors.description}
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex sm:justify-end sm:px-6">
                            <button
                                type="button"
                                onClick={closeForm}
                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                            >
                                Batal
                            </button>

                            <button
                                type="submit"
                                disabled={form.processing}
                                className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {form.processing ? "Menyimpan…" : "Simpan"}
                            </button>
                        </div>
                    </form>
                </div>
            </Modal>
        </AuthenticatedLayout>
    );
}

const summaryToneMap = {
    blue: "bg-primary-50 text-primary-700",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
};

const CHART_PERIOD_TABS = [
    { key: "weekly", label: "7 Hari" },
    { key: "monthly", label: "Bulan Ini" },
    { key: "yearly", label: "Tahun Ini" },
];

const PIE_PALETTE = [
    "#2563EB",
    "#0EA5E9",
    "#22C55E",
    "#F59E0B",
    "#EF4444",
    "#8B5CF6",
    "#EC4899",
    "#14B8A6",
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
        "Z",
    ].join(" ");
};

function CategoryPie({ distribution }) {
    const expenseSlices = distribution
        .filter((row) => row.type === "expense")
        .slice(0, 8);
    const total = expenseSlices.reduce((sum, row) => sum + row.total, 0);
    const [hovered, setHovered] = useState(null);

    let currentAngle = 0;
    const slices = expenseSlices.map((row, index) => {
        const portion = total === 0 ? 0 : (row.total / total) * 360;
        const path = arcPath(
            110,
            110,
            100,
            currentAngle,
            currentAngle + portion,
        );
        const slice = {
            ...row,
            path,
            color: PIE_PALETTE[index % PIE_PALETTE.length],
            percent: total === 0 ? 0 : (row.total / total) * 100,
        };
        currentAngle += portion;
        return slice;
    });

    const focusSlice =
        slices.find((slice) => slice.category === hovered) ?? slices[0] ?? null;

    return (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-slate-950">
                        Distribusi Pengeluaran
                    </h2>
                    <p className="text-sm text-slate-500">
                        Arahkan kursor ke salah satu segmen untuk detail
                        kategori.
                    </p>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-primary-700">
                    <Icon name="reports" className="h-5 w-5" />
                </span>
            </div>

            {expenseSlices.length === 0 ? (
                <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    Belum ada pengeluaran pada periode ini.
                </div>
            ) : (
                <div className="mt-6 flex flex-col items-center gap-4">
                    <div
                        className="relative h-60 w-60"
                        onMouseLeave={() => setHovered(null)}
                    >
                        <svg viewBox="0 0 220 220" className="h-full w-full">
                            {slices.map((slice) => {
                                const active = hovered === slice.category;
                                const dimmed = hovered && !active;
                                return (
                                    <path
                                        key={slice.category}
                                        d={slice.path}
                                        fill={slice.color}
                                        stroke="#fff"
                                        strokeWidth={active ? 3 : 2}
                                        opacity={dimmed ? 0.35 : 1}
                                        style={{
                                            transition:
                                                "opacity 150ms ease, transform 150ms ease",
                                            transform: active
                                                ? "scale(1.03)"
                                                : "scale(1)",
                                            transformOrigin: "110px 110px",
                                            cursor: "pointer",
                                        }}
                                        onMouseEnter={() =>
                                            setHovered(slice.category)
                                        }
                                        onFocus={() =>
                                            setHovered(slice.category)
                                        }
                                        onMouseLeave={() => setHovered(null)}
                                        onBlur={() => setHovered(null)}
                                    />
                                );
                            })}
                            <circle cx="110" cy="110" r="60" fill="#fff" />
                        </svg>
                        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                            {focusSlice ? (
                                <>
                                    <span
                                        className="h-2.5 w-2.5 rounded-full"
                                        style={{
                                            backgroundColor: focusSlice.color,
                                        }}
                                    />
                                    <p className="mt-2 line-clamp-2 text-xs font-semibold text-slate-500">
                                        {focusSlice.category}
                                    </p>
                                    <p className="mt-1 text-xl font-bold text-slate-950">
                                        {focusSlice.percent.toFixed(1)}%
                                    </p>
                                    <p className="mt-0.5 text-[11px] font-semibold text-slate-500">
                                        {formatRupiah(focusSlice.total)}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                        Total
                                    </p>
                                    <p className="mt-1 break-words text-base font-bold text-slate-950">
                                        {formatRupiah(total)}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                        Total pengeluaran {formatRupiah(total)} dari{" "}
                        {expenseSlices.length} kategori.
                    </p>
                </div>
            )}
        </div>
    );
}

const buildLinePath = (values, width, max, padX, baselineY) => {
    if (values.length === 0 || max <= 0) return "";
    const usableWidth = width - padX * 2;
    return values
        .map((value, index) => {
            const x =
                values.length === 1
                    ? width / 2
                    : padX + (index / (values.length - 1)) * usableWidth;
            const y = baselineY - (value / max) * (baselineY - 12);
            return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");
};

function TrendChart({ trend, period, onChangePeriod }) {
    const [hovered, setHovered] = useState(null);
    const incomeValues = trend.map((row) => Number(row.income ?? 0));
    const expenseValues = trend.map((row) => Number(row.expense ?? 0));
    const max = Math.max(1, ...incomeValues, ...expenseValues);
    const totalIncome = incomeValues.reduce((sum, value) => sum + value, 0);
    const totalExpense = expenseValues.reduce((sum, value) => sum + value, 0);

    const width = 540;
    const height = 220;
    const padX = 24;
    const baselineY = height - 36;

    const usableWidth = width - padX * 2;
    const xFor = (index) =>
        trend.length <= 1
            ? width / 2
            : padX + (index / (trend.length - 1)) * usableWidth;
    const yFor = (value) => baselineY - (value / max) * (baselineY - 12);

    const incomePath = buildLinePath(incomeValues, width, max, padX, baselineY);
    const expensePath = buildLinePath(
        expenseValues,
        width,
        max,
        padX,
        baselineY,
    );

    const tickStep = trend.length <= 8 ? 1 : Math.ceil(trend.length / 6);

    return (
        <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-950">
                        Tren Pemasukan vs Pengeluaran
                    </h2>

                    <p className="text-sm leading-6 text-slate-500">
                        Pilih periode—pie chart di samping ikut menyesuaikan
                        filter ini.
                    </p>
                </div>

                <div className="w-full rounded-2xl bg-slate-100 p-1 sm:w-auto">
                    <div className="grid grid-cols-3 gap-1">
                        {CHART_PERIOD_TABS.map((tab) => {
                            const active = tab.key === period;

                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => onChangePeriod(tab.key)}
                                    className={`min-w-0 rounded-xl px-2 py-2 text-[11px] font-bold leading-tight transition sm:px-3 sm:py-1.5 sm:text-xs ${
                                        active
                                            ? "bg-primary-600 text-white shadow"
                                            : "text-slate-500 hover:text-primary-600"
                                    }`}
                                >
                                    <span className="block truncate">
                                        {tab.label}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        Pemasukan
                    </p>
                    <p className="mt-1 break-words text-lg font-bold text-emerald-700">
                        {formatRupiah(totalIncome)}
                    </p>
                </div>
                <div className="rounded-2xl bg-rose-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                        Pengeluaran
                    </p>
                    <p className="mt-1 break-words text-lg font-bold text-rose-700">
                        {formatRupiah(totalExpense)}
                    </p>
                </div>
            </div>

            {trend.length === 0 ? (
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    Belum ada data tren pada periode ini.
                </div>
            ) : (
                <div className="relative mt-5">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="h-56 w-full"
                        preserveAspectRatio="none"
                        onMouseLeave={() => setHovered(null)}
                    >
                        {[0, 1, 2, 3, 4].map((row) => (
                            <line
                                key={row}
                                x1={padX}
                                x2={width - padX}
                                y1={(row * (baselineY - 12)) / 4 + 12}
                                y2={(row * (baselineY - 12)) / 4 + 12}
                                stroke="#e2e8f0"
                                strokeDasharray="2 4"
                            />
                        ))}
                        <line
                            x1={padX}
                            x2={width - padX}
                            y1={baselineY}
                            y2={baselineY}
                            stroke="#cbd5f5"
                        />
                        {expensePath && (
                            <path
                                d={expensePath}
                                fill="none"
                                stroke="#EF4444"
                                strokeWidth="2.4"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        )}
                        {incomePath && (
                            <path
                                d={incomePath}
                                fill="none"
                                stroke="#16A34A"
                                strokeWidth="2.4"
                                strokeLinejoin="round"
                                strokeLinecap="round"
                            />
                        )}
                        {trend.map((row, index) => {
                            const cx = xFor(index);
                            const showLabel =
                                index % tickStep === 0 ||
                                index === trend.length - 1;
                            return (
                                <g key={`${row.label}-${index}`}>
                                    <circle
                                        cx={cx}
                                        cy={yFor(Number(row.income ?? 0))}
                                        r={hovered === index ? 4.5 : 3}
                                        fill="#fff"
                                        stroke="#16A34A"
                                        strokeWidth={
                                            hovered === index ? 2.6 : 2
                                        }
                                    />
                                    <circle
                                        cx={cx}
                                        cy={yFor(Number(row.expense ?? 0))}
                                        r={hovered === index ? 4.5 : 3}
                                        fill="#fff"
                                        stroke="#EF4444"
                                        strokeWidth={
                                            hovered === index ? 2.6 : 2
                                        }
                                    />
                                    <rect
                                        x={
                                            cx -
                                            usableWidth /
                                                Math.max(1, trend.length * 2) -
                                            1
                                        }
                                        width={
                                            usableWidth /
                                                Math.max(1, trend.length) +
                                            2
                                        }
                                        y={0}
                                        height={baselineY}
                                        fill="transparent"
                                        onMouseEnter={() => setHovered(index)}
                                        onFocus={() => setHovered(index)}
                                    />
                                    {showLabel && (
                                        <text
                                            x={cx}
                                            y={height - 14}
                                            textAnchor="middle"
                                            fontSize="11"
                                            fill="#64748B"
                                            fontWeight="600"
                                        >
                                            {row.label}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                        {hovered !== null && (
                            <line
                                x1={xFor(hovered)}
                                x2={xFor(hovered)}
                                y1={12}
                                y2={baselineY}
                                stroke="#94A3B8"
                                strokeDasharray="3 3"
                            />
                        )}
                    </svg>

                    {hovered !== null && trend[hovered] && (
                        <div
                            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-xl shadow-slate-900/20"
                            style={{
                                left: `${(xFor(hovered) / width) * 100}%`,
                                top: `${(yFor(Math.max(Number(trend[hovered].income ?? 0), Number(trend[hovered].expense ?? 0))) / height) * 100}%`,
                            }}
                        >
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                                {trend[hovered].label}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-emerald-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                                {formatRupiah(
                                    Number(trend[hovered].income ?? 0),
                                )}
                            </p>
                            <p className="mt-1 flex items-center gap-2 text-rose-300">
                                <span className="h-2 w-2 rounded-full bg-rose-400" />
                                {formatRupiah(
                                    Number(trend[hovered].expense ?? 0),
                                )}
                            </p>
                        </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-4 rounded-full bg-emerald-500" />
                            Pemasukan
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                            <span className="h-2.5 w-4 rounded-full bg-rose-500" />
                            Pengeluaran
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}

function SummaryCard({ label, value, icon, tone = "blue" }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex items-center gap-3">
                <span
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl ${summaryToneMap[tone]}`}
                >
                    <Icon name={icon} className="h-4 w-4" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {label}
                </p>
            </div>
            <p className="mt-3 break-words text-xl font-bold text-slate-950">
                {value}
            </p>
        </div>
    );
}

function DetailRow({ label, value }) {
    return (
        <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
                {value}
            </dd>
        </div>
    );
}
