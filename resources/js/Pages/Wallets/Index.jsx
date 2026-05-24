import Autocomplete from "@/Components/Autocomplete";
import FormDropdown from "@/Components/FormDropdown";
import Icon from "@/Components/Icon";
import InputError from "@/Components/InputError";
import Modal from "@/Components/Modal";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, useForm, usePage } from "@inertiajs/react";
import { useEffect, useMemo, useState } from "react";

const formatRupiah = (value) =>
    new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const groups = [
    {
        key: "cash",
        title: "Tunai",
        empty: "Belum ada dompet Tunai",
        icon: "wallet",
    },
    {
        key: "bank",
        title: "Akun Bank",
        empty: "Belum ada dompet Akun Bank",
        icon: "bank",
    },
    {
        key: "e-wallet",
        title: "E-Wallet",
        empty: "Belum ada dompet E-Wallet",
        icon: "wallet",
    },
    {
        key: "other",
        title: "Lainnya",
        empty: "Belum ada dompet Lainnya",
        icon: "wallet",
    },
];

const typeLabels = {
    bank: "BANK",
    "e-wallet": "E-WALLET",
    cash: "TUNAI",
    other: "LAINNYA",
};

const typeConfig = {
    cash: {
        badge: "bg-amber-50 text-amber-700 ring-amber-100",
        icon: "bg-amber-50 text-amber-600",
        dot: "bg-amber-400",
        border: "hover:border-amber-200",
        glow: "bg-amber-100/70",
    },
    bank: {
        badge: "bg-primary-50 text-primary-700 ring-primary-100",
        icon: "bg-primary-50 text-primary-700",
        dot: "bg-primary-500",
        border: "hover:border-primary-200",
        glow: "bg-primary-100/70",
    },
    "e-wallet": {
        badge: "bg-emerald-50 text-emerald-700 ring-emerald-100",
        icon: "bg-emerald-50 text-emerald-600",
        dot: "bg-emerald-500",
        border: "hover:border-emerald-200",
        glow: "bg-emerald-100/70",
    },
    other: {
        badge: "bg-slate-100 text-slate-600 ring-slate-200",
        icon: "bg-slate-100 text-slate-500",
        dot: "bg-slate-400",
        border: "hover:border-slate-300",
        glow: "bg-slate-100/80",
    },
};

const initialWalletData = {
    name: "",
    type: "cash",
    wallet_provider_id: "",
    institution: "",
    account_number: "",
    account_name: "",
    phone_number: "",
    custom_logo: null,
    initial_balance: 0,
    is_primary: false,
    is_active: true,
};

const walletTypeOptions = [
    { value: "cash", label: "Tunai" },
    { value: "bank", label: "Akun Bank" },
    { value: "e-wallet", label: "E-Wallet" },
    { value: "other", label: "Lainnya" },
];

export default function Index({
    wallets = [],
    totalBalance = 0,
    walletProviders = [],
}) {
    const { flash } = usePage().props;

    const [modalOpen, setModalOpen] = useState(false);
    const [providerFormOpen, setProviderFormOpen] = useState(false);
    const [customLogoPreview, setCustomLogoPreview] = useState(null);
    const [providerLogoPreview, setProviderLogoPreview] = useState(null);
    const [pendingProviderName, setPendingProviderName] = useState(null);

    const form = useForm(initialWalletData);
    const providerForm = useForm({
        name: '',
        type: 'bank',
        logo: null,
    });

    const activeWallets = useMemo(
        () => wallets.filter((wallet) => wallet.is_active),
        [wallets],
    );

    const groupedWallets = useMemo(() => {
        return groups.reduce((result, group) => {
            result[group.key] = wallets.filter(
                (wallet) => wallet.type === group.key,
            );
            return result;
        }, {});
    }, [wallets]);

    const groupTotals = useMemo(() => {
        return groups.reduce((result, group) => {
            result[group.key] = (groupedWallets[group.key] ?? []).reduce(
                (sum, wallet) => sum + Number(wallet.current_balance ?? 0),
                0,
            );

            return result;
        }, {});
    }, [groupedWallets]);

    const providerOptions = useMemo(
        () => walletProviders.filter((provider) => provider.type === form.data.type),
        [walletProviders, form.data.type],
    );

    useEffect(() => {
        if (!pendingProviderName) return;

        const provider = walletProviders.find(
            (item) => item.type === form.data.type && item.name === pendingProviderName,
        );

        if (!provider) return;

        form.setData('wallet_provider_id', provider.id);
        setPendingProviderName(null);
    }, [walletProviders, pendingProviderName, form.data.type]);

    const openCreate = (type = "cash") => {
        form.clearErrors();
        form.setData({ ...initialWalletData, type });
        setCustomLogoPreview(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setProviderFormOpen(false);
        setCustomLogoPreview(null);
        setProviderLogoPreview(null);
        setPendingProviderName(null);
        form.reset();
        form.clearErrors();
        providerForm.reset();
        providerForm.clearErrors();
    };

    const updateCustomLogo = (file) => {
        form.setData("custom_logo", file);

        if (customLogoPreview) {
            URL.revokeObjectURL(customLogoPreview);
        }

        setCustomLogoPreview(file ? URL.createObjectURL(file) : null);
    };

    const updateProviderLogo = (file) => {
        providerForm.setData('logo', file);

        if (providerLogoPreview) {
            URL.revokeObjectURL(providerLogoPreview);
        }

        setProviderLogoPreview(file ? URL.createObjectURL(file) : null);
    };

    const openProviderForm = () => {
        providerForm.clearErrors();
        providerForm.setData({ name: '', type: form.data.type, logo: null });
        updateProviderLogo(null);
        setProviderFormOpen(true);
    };

    const submitProvider = (event) => {
        event.preventDefault();
        const name = providerForm.data.name.trim();

        providerForm.transform((data) => ({
            ...data,
            name,
            type: form.data.type,
        }));

        providerForm.post(route('wallet-providers.store'), {
            preserveScroll: true,
            forceFormData: true,
            only: ['walletProviders', 'flash', 'errors'],
            onSuccess: () => {
                setPendingProviderName(name);
                setProviderFormOpen(false);
                setProviderLogoPreview(null);
                providerForm.reset();
            },
        });
    };

    const submit = (event) => {
        event.preventDefault();

        form.post(route("wallets.store"), {
            preserveScroll: true,
            onSuccess: closeModal,
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 shadow-sm">
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                                FinTrack Wallet
                            </div>

                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Dompet
                            </h1>

                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                                Pantau saldo tunai, rekening bank, e-wallet,
                                dan dompet lainnya dalam satu tempat.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => openCreate()}
                            aria-label="Tambah dompet"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:brightness-110 active:scale-95 sm:w-auto"
                        >
                            <Icon name="plus" className="h-4 w-4" />
                            Tambah Dompet
                        </button>
                    </div>
                </section>
            }
        >
            <Head title="Dompet" />

            <div className="page-shell">
                <div className="page-container space-y-7">
                    {flash?.success && (
                        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-bold text-emerald-600">
                                ✓
                            </span>
                            <p className="text-sm font-semibold text-emerald-700">
                                {flash.success}
                            </p>
                        </div>
                    )}

                    <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary-800 via-primary-600 to-sky-500 p-5 text-white shadow-2xl shadow-primary-900/25 sm:p-7">
                        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/20 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-primary-300/25 blur-2xl" />
                        <div className="pointer-events-none absolute right-10 bottom-8 h-24 w-24 rounded-full bg-sky-300/20 blur-2xl" />

                        <div className="relative">
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-white/75">
                                        Total Saldo
                                    </p>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                                        IDR
                                    </p>
                                </div>

                                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
                                    <Icon name="wallet" className="h-5 w-5" />
                                </span>
                            </div>

                            <p className="mt-2 break-words text-4xl font-bold tracking-tight sm:text-5xl">
                                {formatRupiah(totalBalance)}
                            </p>

                            <p className="mt-3 text-sm font-medium text-white/75">
                                {activeWallets.length} dompet aktif dari{" "}
                                {wallets.length} total dompet.
                            </p>


                        </div>
                    </section>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {groups.map((group) => {
                            const config = typeConfig[group.key];
                            const count = (groupedWallets[group.key] ?? [])
                                .length;
                            const total = groupTotals[group.key] ?? 0;

                            return (
                                <div
                                    key={group.key}
                                    className="relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <div
                                        className={`pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full blur-2xl ${config.glow}`}
                                    />

                                    <div className="relative flex items-start justify-between gap-2">
                                        <div>
                                            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400">
                                                {group.title}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-slate-500">
                                                {count} dompet
                                            </p>
                                        </div>

                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${config.badge}`}
                                        >
                                            {count}
                                        </span>
                                    </div>

                                    <p className="relative mt-3 break-words text-base font-bold leading-tight text-slate-950 sm:text-lg">
                                        {formatRupiah(total)}
                                    </p>

                                    <div
                                        className={`relative mt-3 h-1 w-8 rounded-full ${config.dot}`}
                                    />
                                </div>
                            );
                        })}
                    </div>

                    {groups.map((group) => (
                        <section key={group.key} className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-2.5">
                                    <span
                                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                                            typeConfig[group.key].dot
                                        }`}
                                    />

                                    <h2 className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                                        {group.title}
                                    </h2>

                                    {(groupedWallets[group.key] ?? []).length >
                                        0 && (
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${
                                                typeConfig[group.key].badge
                                            }`}
                                        >
                                            {
                                                (
                                                    groupedWallets[group.key] ??
                                                    []
                                                ).length
                                            }
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => openCreate(group.key)}
                                    aria-label={`Tambah ${group.title}`}
                                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 shadow-sm transition hover:border-primary-200 hover:text-primary-700 active:scale-95"
                                >
                                    <Icon name="plus" className="h-3.5 w-3.5" />
                                    Tambah
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(groupedWallets[group.key] ?? []).map(
                                    (wallet) => (
                                        <WalletCard
                                            key={wallet.id}
                                            wallet={wallet}
                                        />
                                    ),
                                )}

                                {(groupedWallets[group.key] ?? []).length ===
                                    0 && (
                                    <EmptyCard
                                        group={group}
                                        onClick={() => openCreate(group.key)}
                                    />
                                )}
                            </div>
                        </section>
                    ))}
                </div>
            </div>

            <Modal show={modalOpen} maxWidth="lg" onClose={closeModal}>
                <form
                    onSubmit={submit}
                    className="flex max-h-[90vh] flex-col overflow-hidden rounded-2xl bg-white"
                >
                    <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-5 sm:px-6">
                        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary-100 blur-3xl" />

                        <div className="relative flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/20">
                                    <Icon name="wallet" className="h-6 w-6" />
                                </span>

                                <div>
                                    <h2 className="text-lg font-bold text-slate-950">
                                        Tambah Dompet
                                    </h2>
                                    <p className="mt-1 text-sm leading-6 text-slate-500">
                                        Simpan rekening bank, e-wallet, cash,
                                        atau dompet lain agar saldo lebih mudah
                                        dipantau.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-white hover:text-slate-700"
                                aria-label="Tutup modal"
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
                        <Field label="Nama Dompet" error={form.errors.name}>
                            <input
                                className="form-input rounded-2xl"
                                value={form.data.name}
                                onChange={(event) =>
                                    form.setData("name", event.target.value)
                                }
                                placeholder="Contoh: Cash, BCA Utama, DANA"
                                autoFocus
                            />
                        </Field>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Kategori" error={form.errors.type}>
                                <FormDropdown
                                    value={form.data.type}
                                    options={walletTypeOptions}
                                    onChange={(value) => {
                                        form.setData({
                                            ...form.data,
                                            type: value,
                                            wallet_provider_id: "",
                                            institution: "",
                                            account_number: "",
                                            account_name: "",
                                            phone_number: "",
                                            custom_logo: null,
                                        });
                                        updateCustomLogo(null);
                                    }}
                                />
                            </Field>

                            <Field
                                label="Saldo Awal"
                                error={form.errors.initial_balance}
                            >
                                <div className="relative">
                                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                                        Rp
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="form-input rounded-2xl pl-11"
                                        value={form.data.initial_balance}
                                        onChange={(event) =>
                                            form.setData(
                                                "initial_balance",
                                                event.target.value,
                                            )
                                        }
                                        placeholder="0"
                                    />
                                </div>
                            </Field>
                        </div>

                        {['bank', 'e-wallet'].includes(form.data.type) && (
                            <div className="space-y-4">
                                <Field
                                    label={form.data.type === 'bank' ? 'Pilih Bank' : 'Pilih E-Wallet'}
                                    error={form.errors.wallet_provider_id}
                                >
                                    <Autocomplete
                                        value={form.data.wallet_provider_id}
                                        options={providerOptions}
                                        getOptionLabel={(provider) => provider.name}
                                        getOptionValue={(provider) => provider.id}
                                        onChange={(value) => form.setData('wallet_provider_id', value)}
                                        placeholder={
                                            form.data.type === 'bank'
                                                ? 'Cari bank'
                                                : 'Cari e-wallet'
                                        }
                                        emptyText="Provider tidak ditemukan."
                                        leadingIcon={form.data.type === 'bank' ? 'bank' : 'wallet'}
                                        getOptionImage={(provider) => provider.logo}
                                    />
                                </Field>

                                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4">
                                    {!providerFormOpen ? (
                                        <button
                                            type="button"
                                            onClick={openProviderForm}
                                            className="inline-flex items-center gap-2 text-sm font-bold text-primary-700 transition hover:text-primary-600"
                                        >
                                            <Icon name="plus" className="h-4 w-4" />
                                            Tambah {form.data.type === 'bank' ? 'bank' : 'e-wallet'} sendiri
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <Field
                                                label={`Nama ${form.data.type === 'bank' ? 'Bank' : 'E-Wallet'}`}
                                                error={providerForm.errors.name}
                                            >
                                                <input
                                                    className="form-input rounded-2xl bg-white"
                                                    value={providerForm.data.name}
                                                    onChange={(event) =>
                                                        providerForm.setData('name', event.target.value)
                                                    }
                                                    placeholder={
                                                        form.data.type === 'bank'
                                                            ? 'Contoh: Bank Jago Syariah'
                                                            : 'Contoh: ShopeePay Bisnis'
                                                    }
                                                />
                                            </Field>

                                            <Field
                                                label="Logo Provider"
                                                hint="Opsional. PNG, JPG, atau WebP maksimal 1 MB."
                                                error={providerForm.errors.logo}
                                            >
                                                <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 transition hover:border-primary-300 hover:bg-primary-50/40">
                                                    {providerLogoPreview ? (
                                                        <img
                                                            src={providerLogoPreview}
                                                            alt="Preview logo provider"
                                                            className="h-10 w-10 object-contain"
                                                        />
                                                    ) : (
                                                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                                                            <Icon name="plus" className="h-4 w-4" />
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-bold text-slate-500">
                                                        {providerLogoPreview ? 'Ganti logo' : 'Upload logo opsional'}
                                                    </span>
                                                    <input
                                                        type="file"
                                                        accept="image/png,image/jpeg,image/webp"
                                                        className="hidden"
                                                        onChange={(event) =>
                                                            updateProviderLogo(event.target.files?.[0] ?? null)
                                                        }
                                                    />
                                                </label>
                                            </Field>

                                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => setProviderFormOpen(false)}
                                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                                                >
                                                    Batal
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={submitProvider}
                                                    disabled={providerForm.processing}
                                                    className="rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-primary-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {providerForm.processing ? 'Menyimpan…' : 'Simpan Provider'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {form.data.type === 'bank' && (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="Nomor Rekening"
                                            hint="Opsional."
                                            error={form.errors.account_number}
                                        >
                                            <input
                                                className="form-input rounded-2xl"
                                                value={form.data.account_number}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'account_number',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Contoh: 1234567890"
                                            />
                                        </Field>

                                        <Field
                                            label="Nama Pemilik"
                                            hint="Opsional."
                                            error={form.errors.account_name}
                                        >
                                            <input
                                                className="form-input rounded-2xl"
                                                value={form.data.account_name}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'account_name',
                                                        event.target.value,
                                                    )
                                                }
                                                placeholder="Nama pemilik rekening"
                                            />
                                        </Field>
                                    </div>
                                )}

                                {form.data.type === 'e-wallet' && (
                                    <Field
                                        label="Nomor HP"
                                        hint="Opsional."
                                        error={form.errors.phone_number}
                                    >
                                        <input
                                            className="form-input rounded-2xl"
                                            value={form.data.phone_number}
                                            onChange={(event) =>
                                                form.setData(
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

                        {form.data.type === 'other' && (
                            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
                                <Field
                                    label="Nama Provider / Keterangan"
                                    hint="Opsional. Isi nama atau keterangan dompet."
                                    error={form.errors.institution}
                                >
                                    <input
                                        className="form-input rounded-2xl"
                                        value={form.data.institution}
                                        onChange={(event) =>
                                            form.setData('institution', event.target.value)
                                        }
                                        placeholder="Contoh: Celengan, Crypto Wallet, Voucher"
                                    />
                                </Field>

                                <Field
                                    label="Logo Custom"
                                    hint="PNG, JPG, atau WebP. Maksimal 1 MB."
                                    error={form.errors.custom_logo}
                                >
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
                                    checked={Boolean(form.data.is_primary)}
                                    onChange={(event) =>
                                        form.setData(
                                            'is_primary',
                                            event.target.checked,
                                        )
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
                                    checked={Boolean(form.data.is_active)}
                                    onChange={(event) =>
                                        form.setData(
                                            'is_active',
                                            event.target.checked,
                                        )
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

                    <div className="shrink-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
                        <button
                            type="button"
                            onClick={closeModal}
                            className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 sm:w-auto"
                        >
                            Batal
                        </button>

                        <button
                            type="submit"
                            disabled={form.processing}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                        >
                            {form.processing ? (
                                <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                                    Menyimpan…
                                </>
                            ) : (
                                <>
                                    <Icon name="plus" className="h-4 w-4" />
                                    Tambah Dompet
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}

function BalanceInfoCard({ label, value }) {
    return (
        <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
            <p className="text-[11px] font-bold uppercase tracking-wide text-white/60">
                {label}
            </p>
            <p className="mt-1 text-lg font-bold text-white">{value}</p>
        </div>
    );
}

function WalletCard({ wallet }) {
    const config = typeConfig[wallet.type] ?? typeConfig.other;

    return (
        <Link
            href={route("wallets.show-query", { id: wallet.id })}
            className={`group flex items-center gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${config.border} ${
                !wallet.is_active ? "opacity-60" : ""
            }`}
        >
            {wallet.provider?.logo || wallet.custom_logo ? (
                <img
                    src={wallet.provider?.logo ?? wallet.custom_logo}
                    alt={wallet.provider?.name ?? wallet.name}
                    className="h-14 w-14 shrink-0 object-contain"
                />
            ) : (
                <span
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${config.icon}`}
                >
                    <Icon
                        name={wallet.type === "bank" ? "bank" : "wallet"}
                        className="h-6 w-6"
                    />
                </span>
            )}

            <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-950">
                    {wallet.name}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${config.badge}`}
                    >
                        {typeLabels[wallet.type] ?? wallet.type}
                    </span>

                    {(wallet.provider?.name || wallet.institution) && (
                        <span className="truncate text-xs text-slate-400">
                            {wallet.provider?.name ?? wallet.institution}
                        </span>
                    )}

                    {wallet.is_primary && (
                        <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-600">
                            UTAMA
                        </span>
                    )}

                    {!wallet.is_active && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            NONAKTIF
                        </span>
                    )}
                </div>
            </div>

            <div className="shrink-0 text-right">
                <p className="text-[11px] font-medium text-slate-400">
                    Saldo Saat Ini
                </p>
                <p className="mt-0.5 text-xl font-bold text-slate-950">
                    {formatRupiah(wallet.current_balance)}
                </p>
            </div>

            <Icon
                name="arrowRight"
                className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-400"
            />
        </Link>
    );
}

function EmptyCard({ group, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="group flex w-full items-center gap-4 rounded-[1.75rem] border border-dashed border-slate-200 bg-white/70 px-5 py-4 text-left transition hover:border-primary-200 hover:bg-white hover:shadow-sm active:scale-[0.99]"
        >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-slate-300 transition group-hover:border-primary-200 group-hover:text-primary-400">
                <Icon name="plus" className="h-5 w-5" />
            </span>

            <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-400 transition group-hover:text-slate-600">
                    {group.empty}
                </p>
                <p className="mt-0.5 text-xs text-slate-300 transition group-hover:text-slate-400">
                    Ketuk untuk menambahkan
                </p>
            </div>
        </button>
    );
}

function Field({ label, hint, error, children }) {
    return (
        <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {label}
            </span>

            <div className="mt-1.5">{children}</div>

            {hint && !error && (
                <p className="mt-1 text-[11px] leading-5 text-slate-400">
                    {hint}
                </p>
            )}

            {error && <InputError message={error} className="mt-1" />}
        </label>
    );
}
