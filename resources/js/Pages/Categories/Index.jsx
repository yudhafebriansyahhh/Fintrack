import Icon from "@/Components/Icon";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import PrimaryButton from "@/Components/PrimaryButton";
import SecondaryButton from "@/Components/SecondaryButton";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { confirmAction, confirmDelete, toastSuccess } from "@/Utils/swal";
import { Head, router, useForm, usePage } from "@inertiajs/react";
import { useMemo, useState } from "react";

const typeMeta = {
    income: {
        label: "Pemasukan",
        sign: "+",
        bubble: "bg-emerald-50 text-emerald-600",
        accent: "text-emerald-600",
        soft: "bg-emerald-50 text-emerald-700",
        chip: "bg-emerald-50 text-emerald-700",
    },
    expense: {
        label: "Pengeluaran",
        sign: "-",
        bubble: "bg-primary-50 text-primary-700",
        accent: "text-primary-700",
        soft: "bg-primary-50 text-primary-700",
        chip: "bg-primary-50 text-primary-700",
    },
};

const categoryIconMap = {
    Gaji: "briefcase",
    Bonus: "zap",
    THR: "zap",
    Freelance: "briefcase",
    Investasi: "reports",
    Penjualan: "cart",
    Hadiah: "zap",
    "Pemasukan Lainnya": "arrowDown",
    "Makan & Minum": "food",
    "Belanja Harian": "cart",
    Transportasi: "car",
    "Pulsa & Internet": "wifi",
    "Tagihan Rumah": "bills",
    "Sewa / KPR": "bills",
    Cicilan: "creditCard",
    Kesehatan: "help",
    Pendidikan: "reports",
    Hiburan: "zap",
    "Olahraga & Hobi": "zap",
    Pakaian: "cart",
    Subscription: "creditCard",
    "Donasi & Zakat": "mail",
    Pajak: "bills",
    "Perawatan Diri": "help",
    Liburan: "wifi",
    "Keluarga & Anak": "user",
    "Pengeluaran Lainnya": "arrowUp",
};

const iconForCategory = (category) => {
    if (categoryIconMap[category.name]) return categoryIconMap[category.name];
    return category.type === "income" ? "arrowDown" : "receipt";
};

export default function Index({ categories }) {
    const { flash, errors } = usePage().props;
    const [activeType, setActiveType] = useState("expense");
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const form = useForm({
        name: "",
        type: "expense",
        icon: "",
        color: "",
        is_active: true,
    });

    const grouped = useMemo(() => {
        return {
            income: categories
                .filter((category) => category.type === "income")
                .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "id-ID")),
            expense: categories
                .filter((category) => category.type === "expense")
                .sort((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name, "id-ID")),
        };
    }, [categories]);

    const counts = {
        income: grouped.income.length,
        expense: grouped.expense.length,
        total: categories.length,
    };

    const totalTransactions = useMemo(
        () =>
            categories.reduce(
                (sum, item) => sum + Number(item.transactions_count ?? 0),
                0,
            ),
        [categories],
    );

    const visibleCategories = grouped[activeType] ?? [];

    const resetForm = () => {
        setEditingCategory(null);
        form.reset();
        form.setData("type", activeType);
        form.clearErrors();
    };

    const openCreateForm = () => {
        resetForm();
        form.setData("type", activeType);
        setShowCategoryModal(true);
    };

    const openEditForm = (category) => {
        setEditingCategory(category);
        form.setData({
            name: category.name,
            type: category.type,
            icon: category.icon ?? '',
            color: category.color ?? '',
            is_active: Boolean(category.is_active),
        });
        form.clearErrors();
        setShowCategoryModal(true);
    };

    const closeForm = () => {
        resetForm();
        setShowCategoryModal(false);
    };

    const submit = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: closeForm,
            onError: () => setShowCategoryModal(true),
        };

        if (editingCategory) {
            form.patch(route("categories.update", editingCategory.id), options);
            return;
        }

        form.post(route("categories.store"), options);
    };

    const destroy = async () => {
        if (!editingCategory) return;
        const confirmed = await confirmDelete({
            title: "Hapus kategori ini?",
            text: editingCategory.name,
        });
        if (!confirmed) return;

        form.delete(route("categories.destroy", editingCategory.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess("Kategori dihapus");
                closeForm();
            },
        });
    };

    const seedDefaults = async () => {
        const confirmed = await confirmAction({
            title: "Pakai kategori bawaan?",
            text: "Kategori bawaan FinTrack akan ditambahkan tanpa duplikasi data lama.",
            confirmButtonText: "Tambahkan",
            icon: "info",
        });
        if (!confirmed) return;

        router.post(
            route("categories.seed-defaults"),
            {},
            { preserveScroll: true },
        );
    };

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
                                Master Data
                            </div>

                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Kategori Transaksi
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                                Kelompokkan setiap pemasukan dan pengeluaran
                                agar laporan lebih mudah dibaca.
                            </p>
                        </div>

                        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center lg:justify-end">
                            <button
                                type="button"
                                onClick={seedDefaults}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-100 bg-white px-4 py-3 text-sm font-bold text-primary-700 shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:bg-primary-50 sm:w-auto"
                            >
                                <Icon name="zap" className="h-4 w-4" />
                                Pakai Kategori Bawaan
                            </button>

                            <button
                                type="button"
                                onClick={openCreateForm}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                Tambah Kategori
                            </button>
                        </div>
                    </div>
                </section>
            }
        >
            <Head title="Kategori" />

            <div className="mx-auto w-full max-w-7xl space-y-6 px-4 pb-12 pt-4 sm:px-6 lg:px-8">
                {flash?.success && (
                    <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700">
                        {flash.success}
                    </div>
                )}

                {errors?.category && (
                    <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                        {errors.category}
                    </div>
                )}

                <section className="grid grid-cols-3 gap-2 sm:gap-3">
                    <SummaryCard
                        label="Total"
                        value={counts.total}
                        icon="filter"
                        tone="blue"
                    />
                    <SummaryCard
                        label="Pemasukan"
                        value={counts.income}
                        icon="arrowDown"
                        tone="green"
                    />
                    <SummaryCard
                        label="Pengeluaran"
                        value={counts.expense}
                        icon="arrowUp"
                        tone="red"
                    />
                </section>

                <section className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100 sm:p-5 lg:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="text-lg font-bold text-slate-950">
                                Daftar Kategori
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Tap kartu untuk mengubah, atau tambahkan
                                kategori baru kapan saja. Total{" "}
                                {totalTransactions} transaksi tercatat.
                            </p>
                        </div>

                        <div className="rounded-full bg-slate-100 p-1">
                            <div className="grid grid-cols-2 gap-1">
                                {["expense", "income"].map((type) => {
                                    const active = activeType === type;

                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setActiveType(type)}
                                            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                                                active
                                                    ? "bg-primary-600 text-white shadow"
                                                    : "text-slate-500 hover:text-primary-600"
                                            }`}
                                        >
                                            {typeMeta[type].label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
                        {visibleCategories.map((category) => {
                            const meta = typeMeta[category.type];

                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() => openEditForm(category)}
                                    className={`group flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md sm:gap-4 sm:px-4 ${category.is_active ? '' : 'opacity-55'}`}
                                >
                                    <span
                                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl sm:h-11 sm:w-11 ${meta.bubble}`}
                                    >
                                        <Icon
                                            name={category.icon || iconForCategory(category)}
                                            className="h-5 w-5"
                                        />
                                    </span>

                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-bold text-slate-950">
                                            {category.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {category.transactions_count}{" "}
                                            transaksi
                                            {!category.is_active ? ' • nonaktif' : ''}
                                        </p>
                                    </div>

                                    <div className="hidden flex-col items-end gap-1 sm:flex">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${meta.chip}`}
                                        >
                                            {meta.label}
                                        </span>
                                        {category.is_default && (
                                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                                Default
                                            </span>
                                        )}
                                        {!category.is_active && (
                                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                                Nonaktif
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}

                        {visibleCategories.length === 0 && (
                            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                                Belum ada kategori{" "}
                                {typeMeta[activeType].label.toLowerCase()}.
                                <button
                                    type="button"
                                    onClick={openCreateForm}
                                    className="ml-2 font-bold text-primary-600 hover:text-primary-700"
                                >
                                    Tambah sekarang
                                </button>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            <Modal show={showCategoryModal} onClose={closeForm} maxWidth="lg">
                <form
                    onSubmit={submit}
                    className="overflow-hidden rounded-2xl bg-white"
                >
                    <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-5 sm:px-6">
                        <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary-100/80 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-16 left-10 h-28 w-28 rounded-full bg-sky-100/80 blur-3xl" />

                        <div className="relative flex items-start justify-between gap-4">
                            <div className="flex min-w-0 items-start gap-3">
                                <span
                                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm ${
                                        typeMeta[form.data.type].bubble
                                    }`}
                                >
                                    <Icon
                                        name={
                                            editingCategory
                                                ? iconForCategory({
                                                      name: form.data.name,
                                                      type: form.data.type,
                                                  })
                                                : "plus"
                                        }
                                        className="h-5 w-5"
                                    />
                                </span>

                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                                        {editingCategory
                                            ? "Edit Data"
                                            : "Data Baru"}
                                    </p>

                                    <h2 className="mt-1 text-lg font-bold text-slate-950">
                                        {editingCategory
                                            ? "Edit Kategori"
                                            : "Tambah Kategori"}
                                    </h2>

                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        {editingCategory
                                            ? "Ubah nama atau tipe kategori transaksi."
                                            : "Buat kategori baru agar pencatatan transaksi lebih rapi."}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeForm}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700"
                                aria-label="Tutup modal"
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="max-h-[65vh] space-y-5 overflow-y-auto px-5 py-5 sm:max-h-none sm:px-6">
                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                Tipe
                            </span>

                            <div className="mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                                {["expense", "income"].map((type) => {
                                    const active = form.data.type === type;

                                    return (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() =>
                                                form.setData("type", type)
                                            }
                                            className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                                                active
                                                    ? "bg-primary-600 text-white shadow"
                                                    : "text-slate-500 hover:text-primary-600"
                                            }`}
                                        >
                                            {typeMeta[type].label}
                                        </button>
                                    );
                                })}
                            </div>

                            <InputError
                                message={form.errors.type}
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                Nama kategori
                            </span>

                            <input
                                className="mt-2 w-full rounded-2xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData("name", event.target.value)
                                }
                                placeholder="Contoh: Gaji, Makanan, Transportasi"
                                autoFocus
                            />

                            <InputError
                                message={form.errors.name}
                                className="mt-2"
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                    Icon
                                </span>
                                <input
                                    className="mt-2 w-full rounded-2xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    value={form.data.icon}
                                    onChange={(event) => form.setData('icon', event.target.value)}
                                    placeholder="Contoh: food, cart, bills"
                                />
                                <InputError message={form.errors.icon} className="mt-2" />
                            </div>

                            <div>
                                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                    Warna
                                </span>
                                <input
                                    className="mt-2 w-full rounded-2xl border-slate-200 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                                    value={form.data.color}
                                    onChange={(event) => form.setData('color', event.target.value)}
                                    placeholder="Contoh: emerald, rose"
                                />
                                <InputError message={form.errors.color} className="mt-2" />
                            </div>
                        </div>

                        {editingCategory && (
                            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-primary-200 hover:bg-primary-50/40">
                                <input
                                    type="checkbox"
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    checked={Boolean(form.data.is_active)}
                                    onChange={(event) => form.setData('is_active', event.target.checked)}
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-700">
                                        Aktifkan kategori
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                                        Kategori aktif muncul sebagai pilihan transaksi baru.
                                    </span>
                                </span>
                            </label>
                        )}

                        {editingCategory &&
                            Number(editingCategory.transactions_count ?? 0) >
                                0 && (
                                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3">
                                    <p className="text-xs font-semibold leading-5 text-amber-700">
                                        Kategori ini sudah dipakai pada{" "}
                                        {editingCategory.transactions_count}{" "}
                                        transaksi sehingga tombol hapus akan menonaktifkan kategori.
                                        Kamu tetap bisa mengganti nama atau mengaktifkannya kembali.
                                    </p>
                                </div>
                            )}
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 sm:px-6">
                        <div
                            className={`grid gap-3 ${
                                editingCategory
                                    ? "sm:grid-cols-[auto_1fr]"
                                    : "sm:flex sm:justify-end"
                            }`}
                        >
                            {editingCategory ? (
                                <button
                                    type="button"
                                    onClick={destroy}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600 transition hover:bg-rose-100 sm:w-auto"
                                >
                                    <Icon name="trash" className="h-4 w-4" />
                                    {Number(editingCategory.transactions_count ?? 0) > 0 ? 'Nonaktifkan' : 'Hapus'}
                                </button>
                            ) : null}

                            <div className="grid gap-3 sm:flex sm:justify-end">
                                <button
                                    type="button"
                                    onClick={closeForm}
                                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto"
                                >
                                    Batal
                                </button>

                                <button
                                    type="submit"
                                    disabled={form.processing}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                                >
                                    {form.processing ? (
                                        <>
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                            Menyimpan…
                                        </>
                                    ) : editingCategory ? (
                                        "Simpan Perubahan"
                                    ) : (
                                        "Tambah Kategori"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

const summaryToneMap = {
    blue: "bg-primary-50 text-primary-700",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
};

function SummaryCard({ label, value, icon, tone = 'blue' }) {
    return (
        <div className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-100 sm:p-4">
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-3">
                <span
                    className={`flex h-9 w-9 items-center justify-center rounded-2xl sm:h-10 sm:w-10 ${summaryToneMap[tone]}`}
                >
                    <Icon name={icon} className="h-4 w-4" />
                </span>

                <p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500 sm:text-xs">
                    {label}
                </p>
            </div>

            <p className="mt-3 text-xl font-bold text-slate-950 sm:text-2xl">
                {value}
            </p>
        </div>
    );
}
