import Autocomplete from '@/Components/Autocomplete';
import CurrencyInput from '@/Components/CurrencyInput';
import DatePicker from '@/Components/DatePicker';
import FormDropdown from '@/Components/FormDropdown';
import Icon from '@/Components/Icon';
import InputError from '@/Components/InputError';
import Modal from '@/Components/Modal';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { confirmAction, confirmDelete, toastSuccess } from '@/Utils/swal';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';

const formatRupiah = (value) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value ?? 0));

const formatDate = (value) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
          }).format(new Date(value))
        : '-';

const todayStr = () => new Date().toISOString().slice(0, 10);

const statusBadge = {
    unpaid: 'bg-amber-50 text-amber-700 ring-amber-100',
    paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    late: 'bg-rose-50 text-rose-700 ring-rose-100',
    cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
    active: 'bg-primary-50 text-primary-700 ring-primary-100',
    completed: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
};

const statusLabel = {
    unpaid: 'Belum lunas',
    paid: 'Lunas',
    late: 'Terlambat',
    cancelled: 'Dibatalkan',
    active: 'Aktif',
    completed: 'Selesai',
};

const debtDirection = {
    owe: {
        label: 'Hutang',
        tone: 'bg-rose-50 text-rose-700 ring-rose-100',
        icon: 'arrowUp',
        transaction: 'Pengeluaran saat lunas',
    },
    lend: {
        label: 'Piutang',
        tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
        icon: 'arrowDown',
        transaction: 'Pemasukan saat lunas',
    },
};

export default function Index({
    groups = [],
    debts = [],
    wallets = [],
    summary = {},
    filters = {},
}) {
    const { flash } = usePage().props;

    const [activeTab, setActiveTab] = useState('bills');
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [selectedDebtId, setSelectedDebtId] = useState(null);

    const [billModalOpen, setBillModalOpen] = useState(false);
    const [debtModalOpen, setDebtModalOpen] = useState(false);

    const [editingBill, setEditingBill] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [editingDebt, setEditingDebt] = useState(null);

    const activeWallets = wallets.filter((wallet) => wallet.is_active);

    const selectedBill =
        groups.find((group) => group.id === selectedBillId) ?? null;

    const selectedDebt =
        debts.find((debt) => debt.id === selectedDebtId) ?? null;

    const billForm = useForm({
        name: '',
        description: '',
        total_amount: '',
        reminder_days_before: 3,
        status: 'active',
    });

    const itemForm = useForm({
        title: '',
        amount: '',
        due_date: todayStr(),
        status: 'unpaid',
        notes: '',
    });

    const generateForm = useForm({
        installments: 3,
        amount: '',
        start_date: todayStr(),
        interval: 'monthly',
        title_prefix: 'Cicilan',
    });

    const debtForm = useForm({
        name: '',
        description: '',
        amount: '',
        direction: 'owe',
        due_date: '',
        reminder_days_before: '',
        wallet_id: '',
        status: 'unpaid',
    });

    const payDebtForm = useForm({
        wallet_id: '',
    });

    const payBillForm = useForm({
        wallet_id: '',
    });

    useEffect(() => {
        if (
            selectedBillId &&
            !groups.some((group) => group.id === selectedBillId)
        ) {
            setSelectedBillId(null);
        }

        if (
            selectedDebtId &&
            !debts.some((debt) => debt.id === selectedDebtId)
        ) {
            setSelectedDebtId(null);
        }
    }, [groups, debts, selectedBillId, selectedDebtId]);

    const billStats = useMemo(() => {
        const unpaid = groups.reduce(
            (sum, group) => sum + Number(group.unpaid_items_count ?? 0),
            0,
        );

        const late = groups.reduce(
            (sum, group) => sum + Number(group.late_items_count ?? 0),
            0,
        );

        return { unpaid, late };
    }, [groups]);

    const groupProgress = (group) => {
        const total = Number(group.items_count ?? 0);

        if (total === 0) return 0;

        return Math.round((Number(group.paid_items_count ?? 0) / total) * 100);
    };

    const nextDue = (group) =>
        (group.items ?? []).find((item) => item.status === 'unpaid') ?? null;

    const resetBillForm = () => {
        setEditingBill(null);
        billForm.clearErrors();
        billForm.setData({
            name: '',
            description: '',
            total_amount: '',
            reminder_days_before: 3,
            status: 'active',
        });
    };

    const openCreateBill = () => {
        setSelectedBillId(null);
        resetBillForm();
        resetItemForm();
        setBillModalOpen(true);
    };

    const openBillDetail = (bill) => {
        setSelectedBillId(bill.id);
        resetBillForm();
        resetItemForm();
        setBillModalOpen(true);
    };

    const closeBillModal = () => {
        setBillModalOpen(false);
        setSelectedBillId(null);
        resetBillForm();
        resetItemForm();
        payBillForm.reset();
        payBillForm.clearErrors();
    };

    const editBill = (bill) => {
        setEditingBill(bill);
        billForm.clearErrors();
        billForm.setData({
            name: bill.name,
            description: bill.description ?? '',
            total_amount: bill.total_amount ?? '',
            reminder_days_before: bill.reminder_days_before ?? 3,
            status: bill.status,
        });
    };

    const submitBill = (event, onSuccessCallback = null) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess(
                    editingBill ? 'Tagihan diperbarui' : 'Tagihan ditambahkan',
                );
                resetBillForm();

                if (typeof onSuccessCallback === 'function') {
                    onSuccessCallback();
                }
            },
        };

        if (editingBill) {
            billForm.patch(route('bills.update', editingBill.id), options);
            return;
        }

        billForm.post(route('bills.store'), options);
    };

    const destroyBill = async (bill) => {
        const confirmed = await confirmDelete({
            title: 'Hapus tagihan ini?',
            text: `${bill.name} dan semua rinciannya akan dihapus.`,
        });

        if (!confirmed) return;

        router.delete(route('bills.destroy', bill.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess('Tagihan dihapus');
                closeBillModal();
            },
        });
    };

    const resetItemForm = () => {
        setEditingItem(null);
        itemForm.clearErrors();
        itemForm.setData({
            title: '',
            amount: '',
            due_date: todayStr(),
            status: 'unpaid',
            notes: '',
        });
    };

    const editItem = (item) => {
        setEditingItem(item);
        itemForm.clearErrors();
        itemForm.setData({
            title: item.title,
            amount: item.amount,
            due_date: item.due_date,
            status: item.status,
            notes: item.notes ?? '',
            paid_date: item.paid_date,
        });
    };

    const submitItem = (event, onSuccessCallback = null) => {
        event.preventDefault();

        if (!selectedBill) return;

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess(
                    editingItem ? 'Rincian diperbarui' : 'Rincian ditambahkan',
                );
                resetItemForm();

                if (typeof onSuccessCallback === 'function') {
                    onSuccessCallback();
                }
            },
        };

        if (editingItem) {
            itemForm.patch(route('bill-items.update', editingItem.id), options);
            return;
        }

        itemForm.post(route('bill-items.store', selectedBill.id), options);
    };

    const payBillItem = async (item) => {
        if (!payBillForm.data.wallet_id) {
            await confirmAction({
                title: 'Pilih dompet dulu',
                text: 'Pilih dompet sumber dana untuk mencatat transaksi pengeluaran otomatis saat tagihan ini lunas.',
                confirmButtonText: 'Oke',
                icon: 'info',
            });
            return;
        }

        const confirmed = await confirmAction({
            title: 'Tandai rincian lunas?',
            text: `${item.title} • ${formatRupiah(item.amount)}`,
            confirmButtonText: 'Tandai lunas',
            icon: 'question',
        });

        if (!confirmed) return;

        payBillForm.patch(route('bill-items.paid', item.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess('Status rincian diperbarui dan transaksi dicatat');
                payBillForm.reset();
            },
        });
    };

    const itemAction = async (action, item) => {
        if (action === 'paid') {
            payBillItem(item);
            return;
        }

        if (action === 'cancel' || action === 'unpaid') {
            const actionText = action === 'cancel' ? 'Batalkan rincian ini?' : 'Batal lunas?';
            const actionSub = action === 'cancel' ? 'Rincian ini akan dibatalkan.' : 'Transaksi pengeluaran terkait akan dihapus otomatis dan saldo akan dikembalikan.';
            const confirmed = await confirmAction({
                title: actionText,
                text: actionSub,
                confirmButtonText: 'Lanjutkan',
                icon: 'question',
            });
            
            if (!confirmed) return;
        }

        router.patch(
            route(`bill-items.${action}`, item.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toastSuccess('Status rincian diperbarui'),
            },
        );
    };

    const destroyItem = async (item) => {
        const confirmed = await confirmDelete({
            title: 'Hapus rincian ini?',
            text: item.title,
        });

        if (!confirmed) return;

        router.delete(route('bill-items.destroy', item.id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Rincian dihapus'),
        });
    };

    const submitGenerate = (event, onSuccessCallback = null) => {
        event.preventDefault();

        if (!selectedBill) return;

        generateForm.post(route('bills.generate', selectedBill.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess('Jadwal cicilan dibuat');
                generateForm.reset('amount');

                if (typeof onSuccessCallback === 'function') {
                    onSuccessCallback();
                }
            },
        });
    };

    const resetDebtForm = () => {
        setEditingDebt(null);
        debtForm.clearErrors();
        debtForm.setData({
            name: '',
            description: '',
            amount: '',
            direction: 'owe',
            due_date: '',
            reminder_days_before: '',
            wallet_id: '',
            status: 'unpaid',
        });

        payDebtForm.setData('wallet_id', '');
        payDebtForm.clearErrors();
    };

    const openCreateDebt = () => {
        setSelectedDebtId(null);
        resetDebtForm();
        setDebtModalOpen(true);
    };

    const openDebtDetail = (debt) => {
        setSelectedDebtId(debt.id);
        resetDebtForm();
        payDebtForm.setData(
            'wallet_id',
            debt.wallet_id ?? activeWallets[0]?.id ?? '',
        );
        setDebtModalOpen(true);
    };

    const closeDebtModal = () => {
        setDebtModalOpen(false);
        setSelectedDebtId(null);
        resetDebtForm();
    };

    const editDebt = (debt) => {
        setEditingDebt(debt);
        debtForm.clearErrors();
        debtForm.setData({
            name: debt.name,
            description: debt.description ?? '',
            amount: debt.amount,
            direction: debt.direction,
            due_date: debt.due_date ?? '',
            reminder_days_before: debt.reminder_days_before ?? '',
            wallet_id: debt.wallet_id ?? '',
            status: debt.status,
        });
    };

    const submitDebt = (event) => {
        event.preventDefault();

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess(
                    editingDebt ? 'Hutang diperbarui' : 'Hutang ditambahkan',
                );
                resetDebtForm();
            },
        };

        if (editingDebt) {
            debtForm.patch(route('debts.update', editingDebt.id), options);
            return;
        }

        debtForm.post(route('debts.store'), options);
    };

    const payDebt = async (debt) => {
        if (!payDebtForm.data.wallet_id) {
            await confirmAction({
                title: 'Pilih dompet dulu',
                text: 'Dompet diperlukan untuk mencatat transaksi otomatis saat hutang/piutang lunas.',
                confirmButtonText: 'Oke',
                icon: 'info',
            });

            return;
        }

        const confirmed = await confirmAction({
            title: 'Tandai lunas?',
            text: `${debt.name} • ${formatRupiah(debt.amount)}`,
            confirmButtonText: 'Tandai lunas',
            icon: 'question',
        });

        if (!confirmed) return;

        payDebtForm.patch(route('debts.paid', debt.id), {
            preserveScroll: true,
            onSuccess: () => toastSuccess('Hutang ditandai lunas'),
        });
    };

    const debtAction = (action, debt) => {
        router.patch(
            route(`debts.${action}`, debt.id),
            {},
            {
                preserveScroll: true,
                onSuccess: () => toastSuccess('Status hutang diperbarui'),
            },
        );
    };

    const destroyDebt = async (debt) => {
        const confirmed = await confirmDelete({
            title: 'Hapus hutang ini?',
            text: debt.name,
        });

        if (!confirmed) return;

        router.delete(route('debts.destroy', debt.id), {
            preserveScroll: true,
            onSuccess: () => {
                toastSuccess('Hutang dihapus');
                closeDebtModal();
            },
        });
    };

    return (
        <AuthenticatedLayout
            header={
                <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/80 ring-1 ring-slate-100 sm:p-6 lg:p-7">
                    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-primary-100/80 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-24 left-16 h-56 w-56 rounded-full bg-sky-100/90 blur-3xl" />

                    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-primary-700">
                                <span className="h-2 w-2 rounded-full bg-primary-600" />
                                FinTrack Bills
                            </div>

                            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
                                Tagihan & Hutang
                            </h1>

                            <p className="mt-3 text-sm leading-6 text-slate-500 sm:text-base">
                                Kelola cicilan, paylater, hutang, dan piutang dalam satu tempat
                                agar tanggal jatuh tempo tidak kelewat.
                            </p>
                        </div>

                        <div className="grid gap-2 sm:flex sm:items-center">
                            <button
                                type="button"
                                onClick={openCreateBill}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/25 transition hover:-translate-y-0.5 hover:brightness-110 sm:w-auto"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                Tambah Tagihan
                            </button>

                            <button
                                type="button"
                                onClick={openCreateDebt}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-primary-100 bg-white px-4 py-3 text-sm font-bold text-primary-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-primary-50 sm:w-auto"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                Tambah Hutang
                            </button>
                        </div>
                    </div>
                </section>
            }
        >
            <Head title="Tagihan" />

            <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {flash?.success && (
                    <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-3 text-sm font-semibold text-primary-700">
                        {flash.success}
                    </div>
                )}

                <section className="rounded-3xl bg-white p-1 shadow-sm ring-1 ring-slate-100 sm:w-fit">
                    <div className="grid grid-cols-2 gap-1">
                        {[
                            ['bills', 'Tagihan'],
                            ['debts', 'Hutang'],
                        ].map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveTab(key)}
                                className={`rounded-2xl px-5 py-2.5 text-sm font-bold transition ${
                                    activeTab === key
                                        ? 'bg-primary-600 text-white shadow'
                                        : 'text-slate-500 hover:bg-primary-50 hover:text-primary-700'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {activeTab === 'bills' ? (
                    <>
                        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            <SummaryCard
                                label="Tagihan Aktif"
                                value={summary.totalActive ?? 0}
                                icon="bills"
                                tone="blue"
                            />
                            <SummaryCard
                                label="Selesai"
                                value={summary.totalCompleted ?? 0}
                                icon="bills"
                                tone="green"
                            />
                            <SummaryCard
                                label="Belum Lunas"
                                value={billStats.unpaid}
                                icon="calendar"
                                tone="amber"
                            />
                            <SummaryCard
                                label="Terlambat"
                                value={billStats.late}
                                icon="calendar"
                                tone="red"
                            />
                        </section>

                        <section className="flex flex-col gap-3">
                            {groups.map((group) => {
                                const progress = groupProgress(group);
                                const due = nextDue(group);
                                const total = Number(
                                    group.total_items_amount ??
                                        group.total_amount ??
                                        0,
                                );
                                const paid = Number(group.paid_items_amount ?? 0);

                                return (
                                    <button
                                        key={group.id}
                                        type="button"
                                        onClick={() => openBillDetail(group)}
                                        className="group rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-100 sm:p-5 flex flex-col md:flex-row md:items-center gap-4"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-700 ring-1 ring-primary-100">
                                                <Icon name="bills" className="h-5 w-5" />
                                            </span>
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-base font-bold text-slate-950 sm:text-lg">
                                                        {group.name}
                                                    </h2>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${statusBadge[group.status] ?? statusBadge.active}`}>
                                                        {statusLabel[group.status] ?? group.status}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 sm:text-sm">
                                                    {group.description || 'Tap untuk melihat rincian tagihan.'}
                                                </p>
                                                <p className="mt-1 text-xs font-semibold text-slate-500">
                                                    {group.items_count ?? 0} rincian • Jatuh tempo: {due ? formatDate(due.due_date) : '-'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="w-full md:w-64 shrink-0">
                                            <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600 sm:text-sm">
                                                <span>{formatRupiah(paid)}</span>
                                                <span>{formatRupiah(total)}</span>
                                            </div>
                                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-primary-600" style={{ width: `${progress}%` }} />
                                            </div>
                                            <div className="mt-1 text-right text-[10px] font-bold text-slate-400">
                                                {progress}% LUNAS
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}

                            {groups.length === 0 && (
                                <EmptyState text="Belum ada tagihan. Tambahkan ShopeePaylater, cicilan, atau tagihan lain dulu." />
                            )}
                        </section>
                    </>
                ) : (
                    <>
                        <section className="grid grid-cols-3 gap-3 sm:grid-cols-3">
                            <SummaryCard
                                label="Hutang Aktif"
                                value={summary.debtsActive ?? 0}
                                icon="arrowUp"
                                tone="red"
                            />
                            <SummaryCard
                                label="Piutang Aktif"
                                value={summary.lendsActive ?? 0}
                                icon="arrowDown"
                                tone="green"
                            />
                            <SummaryCard
                                label="Terlambat"
                                value={summary.debtsLate ?? 0}
                                icon="calendar"
                                tone="amber"
                            />
                        </section>

                        <section className="flex flex-col gap-3">
                            {debts.map((debt) => {
                                const meta =
                                    debtDirection[debt.direction] ??
                                    debtDirection.owe;

                                const status = debt.is_late
                                    ? 'late'
                                    : debt.status;

                                return (
                                    <button
                                        key={debt.id}
                                        type="button"
                                        onClick={() => openDebtDetail(debt)}
                                        className="rounded-3xl bg-white p-4 text-left shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-primary-100 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                                    >
                                        <div className="flex items-center gap-4">
                                            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ${meta.tone}`}>
                                                <Icon name={meta.icon} className="h-5 w-5" />
                                            </span>
                                            
                                            <div>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h2 className="text-base font-bold text-slate-950 sm:text-lg">
                                                        {debt.name}
                                                    </h2>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${statusBadge[status] ?? statusBadge.unpaid}`}>
                                                        {statusLabel[status] ?? status}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-sm font-semibold text-slate-900">
                                                    {formatRupiah(debt.amount)} <span className="font-normal text-slate-500">• {meta.label}</span>
                                                </p>
                                                <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                                                    {debt.description || meta.transaction}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-500 md:text-right md:bg-transparent md:p-0">
                                            Jatuh tempo:{' '}
                                            {debt.due_date ? formatDate(debt.due_date) : 'Tanpa jatuh tempo'}
                                        </div>
                                    </button>
                                );
                            })}

                            {debts.length === 0 && (
                                <EmptyState text="Belum ada hutang/piutang. Tambahkan catatan baru biar nggak kelupaan." />
                            )}
                        </section>
                    </>
                )}
            </div>

            <BillModal
                show={billModalOpen}
                onClose={closeBillModal}
                selectedBill={selectedBill}
                editingBill={editingBill}
                billForm={billForm}
                submitBill={submitBill}
                resetBillForm={resetBillForm}
                editBill={editBill}
                destroyBill={destroyBill}
                itemForm={itemForm}
                editingItem={editingItem}
                submitItem={submitItem}
                resetItemForm={resetItemForm}
                editItem={editItem}
                itemAction={itemAction}
                destroyItem={destroyItem}
                generateForm={generateForm}
                submitGenerate={submitGenerate}
                activeWallets={activeWallets}
                payBillForm={payBillForm}
            />

            <DebtModal
                show={debtModalOpen}
                onClose={closeDebtModal}
                selectedDebt={selectedDebt}
                editingDebt={editingDebt}
                debtForm={debtForm}
                submitDebt={submitDebt}
                resetDebtForm={resetDebtForm}
                editDebt={editDebt}
                destroyDebt={destroyDebt}
                debtAction={debtAction}
                payDebt={payDebt}
                payDebtForm={payDebtForm}
                activeWallets={activeWallets}
            />
        </AuthenticatedLayout>
    );
}

function BillModal({
    show,
    onClose,
    selectedBill,
    editingBill,
    billForm,
    submitBill,
    resetBillForm,
    editBill,
    destroyBill,
    itemForm,
    editingItem,
    submitItem,
    resetItemForm,
    editItem,
    itemAction,
    destroyItem,
    generateForm,
    submitGenerate,
    activeWallets,
    payBillForm,
}) {
    const [showBillForm, setShowBillForm] = useState(!selectedBill);
    const [showItemForm, setShowItemForm] = useState(false);
    const [showGenerateForm, setShowGenerateForm] = useState(false);

    useEffect(() => {
        if (show) {
            setShowBillForm(!selectedBill);
            setShowItemForm(false);
            setShowGenerateForm(false);
        }
    }, [show, selectedBill]);

    const handleEditBill = () => {
        if (!selectedBill) return;

        editBill(selectedBill);
        setShowBillForm(true);
        setShowItemForm(false);
        setShowGenerateForm(false);
    };

    const handleCancelBillForm = () => {
        resetBillForm();
        setShowBillForm(!selectedBill);
    };

    const handleAddItem = () => {
        resetItemForm();
        setShowItemForm(true);
        setShowGenerateForm(false);
    };

    const handleEditItem = (item) => {
        editItem(item);
        setShowItemForm(true);
        setShowGenerateForm(false);
    };

    const handleCancelItemForm = () => {
        resetItemForm();
        setShowItemForm(false);
    };

    const handleShowGenerate = () => {
        setShowGenerateForm((open) => !open);
        setShowItemForm(false);
    };

    const handleSubmitBill = (event) => {
        submitBill(event, () => {
            if (selectedBill) {
                setShowBillForm(false);
            }
        });
    };

    const handleSubmitItem = (event) => {
        submitItem(event, () => {
            setShowItemForm(false);
        });
    };

    const handleSubmitGenerate = (event) => {
        submitGenerate(event, () => {
            setShowGenerateForm(false);
        });
    };

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="overflow-hidden rounded-2xl bg-white">
                <ModalHeader
                    label={selectedBill ? 'Detail Tagihan' : 'Tagihan Baru'}
                    title={selectedBill?.name ?? 'Tambah Tagihan'}
                    description={
                        selectedBill
                            ? 'Daftar rincian atau cicilan tagihan ditampilkan di bawah.'
                            : 'Buat tagihan baru terlebih dahulu.'
                    }
                    icon="bills"
                    onClose={onClose}
                />

                <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
                    {selectedBill && (
                        <div className="mb-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                            <button
                                type="button"
                                onClick={handleEditBill}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                            >
                                <Icon name="edit" className="h-4 w-4" />
                                Edit
                            </button>

                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700"
                            >
                                <Icon name="plus" className="h-4 w-4" />
                                Rincian
                            </button>

                            <button
                                type="button"
                                onClick={handleShowGenerate}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-primary-100 bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:bg-primary-100"
                            >
                                <Icon name="zap" className="h-4 w-4" />
                                Generate
                            </button>

                            <button
                                type="button"
                                onClick={() => destroyBill(selectedBill)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                            >
                                <Icon name="trash" className="h-4 w-4" />
                                Hapus
                            </button>
                        </div>
                    )}

                    {showBillForm && (
                        <section className="mb-5 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                            <div className="mb-4 flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-950">
                                        {editingBill ? 'Edit Tagihan' : 'Tambah Tagihan'}
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Isi data utama tagihan.
                                    </p>
                                </div>

                                {selectedBill && (
                                    <button
                                        type="button"
                                        onClick={handleCancelBillForm}
                                        className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100"
                                    >
                                        Tutup
                                    </button>
                                )}
                            </div>

                            <form
                                onSubmit={handleSubmitBill}
                                className="grid gap-4 md:grid-cols-2"
                            >
                                <Field label="Nama tagihan" error={billForm.errors.name}>
                                    <input
                                        className="form-input rounded-2xl"
                                        value={billForm.data.name}
                                        onChange={(e) =>
                                            billForm.setData('name', e.target.value)
                                        }
                                        placeholder="ShopeePaylater"
                                    />
                                </Field>

                                <Field
                                    label="Total tagihan"
                                    error={billForm.errors.total_amount}
                                >
                                    <CurrencyInput
                                        className="form-input rounded-2xl"
                                        value={billForm.data.total_amount}
                                        onChange={(val) =>
                                            billForm.setData(
                                                'total_amount',
                                                val,
                                            )
                                        }
                                        placeholder="0"
                                    />
                                </Field>

                                <Field label="Reminder (hari sebelum jatuh tempo)">
                                    <input
                                        type="number"
                                        min="0"
                                        max="30"
                                        className="form-input rounded-2xl"
                                        value={billForm.data.reminder_days_before}
                                        onChange={(e) =>
                                            billForm.setData(
                                                'reminder_days_before',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Contoh: 3"
                                    />
                                </Field>

                                <Field label="Status">
                                    <FormDropdown
                                        value={billForm.data.status}
                                        onChange={(val) =>
                                            billForm.setData('status', val)
                                        }
                                        options={[
                                            { value: 'active', label: 'Aktif' },
                                            { value: 'completed', label: 'Selesai' },
                                            { value: 'cancelled', label: 'Dibatalkan' }
                                        ]}
                                    />
                                </Field>

                                <Field label="Deskripsi" className="md:col-span-2">
                                    <input
                                        className="form-input rounded-2xl"
                                        value={billForm.data.description}
                                        onChange={(e) =>
                                            billForm.setData(
                                                'description',
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Opsional"
                                    />
                                </Field>

                                <div className="grid grid-cols-2 gap-2 md:col-span-2 md:flex md:justify-end">
                                    {selectedBill && (
                                        <button
                                            type="button"
                                            onClick={handleCancelBillForm}
                                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                        >
                                            Batal
                                        </button>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={billForm.processing}
                                        className={`inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 transition hover:bg-primary-700 disabled:opacity-60 ${
                                            !selectedBill
                                                ? 'col-span-2 md:col-span-1'
                                                : ''
                                        }`}
                                    >
                                        {editingBill
                                            ? 'Simpan Perubahan'
                                            : 'Tambah Tagihan'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    )}

                    {selectedBill && (
                        <>
                            <section className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-950">
                                            Daftar Rincian
                                        </h3>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Cicilan atau pembayaran yang terhubung dengan tagihan ini.
                                        </p>
                                    </div>
                                </div>

                                {(selectedBill.items ?? []).map((item) => {
                                    const status = item.is_late ? 'late' : item.status;

                                    return (
                                        <div
                                            key={item.id}
                                            className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100"
                                        >
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-950">
                                                        {item.title}
                                                    </p>
                                                    <p className="text-sm text-slate-500">
                                                        {formatDate(item.due_date)} •{' '}
                                                        {formatRupiah(item.amount)}
                                                    </p>
                                                    {item.notes && (
                                                        <p className="text-xs text-slate-400">
                                                            {item.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                <span
                                                    className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase ring-1 ${statusBadge[status]}`}
                                                >
                                                    {statusLabel[status]}
                                                </span>
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                                                {item.status !== 'paid' ? (
                                                    <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                                                        <Autocomplete
                                                            className="w-full sm:w-64"
                                                            value={payBillForm.data.wallet_id}
                                                            onChange={(val) => payBillForm.setData('wallet_id', val)}
                                                            options={activeWallets}
                                                            getOptionLabel={(w) => `${w.name} (${formatRupiah(w.current_balance)})`}
                                                            getOptionValue={(w) => w.id}
                                                            getOptionImage={(w) => w.provider?.logo || w.custom_logo || null}
                                                            placeholder="Pilih dompet pelunasan"
                                                            emptyText="Dompet tidak ditemukan."
                                                            leadingIcon="wallet"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => itemAction('paid', item)}
                                                            className="inline-flex shrink-0 items-center justify-center rounded-2xl bg-primary-600 px-3 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"
                                                        >
                                                            Lunas
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            itemAction('unpaid', item)
                                                        }
                                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        Batal lunas
                                                    </button>
                                                )}

                                                {item.status !== 'cancelled' && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            itemAction('cancel', item)
                                                        }
                                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                    >
                                                        Batalkan
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => handleEditItem(item)}
                                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => destroyItem(item)}
                                                    className="inline-flex items-center justify-center rounded-2xl bg-rose-50 px-3 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                                                >
                                                    Hapus
                                                </button>
                                            </div>
                                        </div>
                                    );
                                        })}

                                {(selectedBill.items ?? []).length === 0 && (
                                    <EmptyState text="Belum ada rincian untuk tagihan ini." />
                                )}
                                </section>

                                <Modal show={showItemForm} onClose={handleCancelItemForm} maxWidth="md">
                                    <div className="overflow-hidden rounded-2xl bg-white">
                                        <ModalHeader
                                            label={editingItem ? 'Edit Rincian' : 'Rincian Baru'}
                                            title={editingItem ? 'Edit Rincian Cicilan' : 'Tambah Rincian Cicilan'}
                                            description="Masukkan detail cicilan atau pembayaran."
                                            icon="plus"
                                            onClose={handleCancelItemForm}
                                        />
                                        
                                        <div className="px-5 py-5 sm:px-6">
                                            <form onSubmit={handleSubmitItem} className="grid gap-4 md:grid-cols-2">
                                                <Field
                                            label="Judul"
                                            error={itemForm.errors.title}
                                        >
                                            <input
                                                className="form-input rounded-2xl"
                                                value={itemForm.data.title}
                                                onChange={(e) =>
                                                    itemForm.setData(
                                                        'title',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Cicilan 1"
                                            />
                                        </Field>

                                        <Field
                                            label="Nominal"
                                            error={itemForm.errors.amount}
                                        >
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                className="form-input rounded-2xl"
                                                value={itemForm.data.amount}
                                                onChange={(e) =>
                                                    itemForm.setData(
                                                        'amount',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="0"
                                            />
                                        </Field>

                                                <Field label="Jatuh tempo">
                                                    <DatePicker
                                                        value={itemForm.data.due_date}
                                                        onChange={(value) =>
                                                            itemForm.setData('due_date', value)
                                                        }
                                                        placeholder="Pilih tanggal"
                                                    />
                                                </Field>

                                        <Field label="Status">
                                            <FormDropdown
                                                value={itemForm.data.status}
                                                onChange={(val) =>
                                                    itemForm.setData(
                                                        'status',
                                                        val,
                                                    )
                                                }
                                                options={[
                                                    { value: 'unpaid', label: 'Belum lunas' },
                                                    { value: 'paid', label: 'Lunas' },
                                                    { value: 'cancelled', label: 'Dibatalkan' }
                                                ]}
                                            />
                                        </Field>

                                        <Field label="Catatan" className="md:col-span-2">
                                            <input
                                                className="form-input rounded-2xl"
                                                value={itemForm.data.notes}
                                                onChange={(e) =>
                                                    itemForm.setData(
                                                        'notes',
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Opsional"
                                            />
                                        </Field>

                                        <div className="grid grid-cols-2 gap-2 md:col-span-2 md:flex md:justify-end">
                                            <button
                                                type="button"
                                                onClick={handleCancelItemForm}
                                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Batal
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={itemForm.processing}
                                                className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
                                            >
                                                {editingItem
                                                    ? 'Simpan Rincian'
                                                    : 'Tambah Rincian'}
                                            </button>
                                        </div>
                                    </form>
                                    </div>
                                </div>
                            </Modal>

                            <Modal show={showGenerateForm} onClose={() => setShowGenerateForm(false)} maxWidth="md">
                                <div className="overflow-hidden rounded-2xl bg-white">
                                    <ModalHeader
                                        label="Generate Cicilan"
                                        title="Generate Cicilan Otomatis"
                                        description="Buat beberapa rincian cicilan sekaligus."
                                        icon="zap"
                                        onClose={() => setShowGenerateForm(false)}
                                    />
                                    
                                    <div className="px-5 py-5 sm:px-6">

                                    <form
                                        onSubmit={handleSubmitGenerate}
                                        className="grid gap-4 md:grid-cols-2"
                                    >
                                        <Field label="Cicilan">
                                            <input
                                                type="number"
                                                min="1"
                                                max="60"
                                                className="form-input rounded-2xl"
                                                value={generateForm.data.installments}
                                                onChange={(e) =>
                                                    generateForm.setData(
                                                        'installments',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>

                                        <Field label="Total">
                                            <CurrencyInput
                                                className="form-input rounded-2xl"
                                                value={generateForm.data.amount}
                                                onChange={(val) =>
                                                    generateForm.setData(
                                                        'amount',
                                                        val,
                                                    )
                                                }
                                                placeholder="0"
                                            />
                                        </Field>

                                        <Field label="Mulai">
                                            <DatePicker
                                                value={generateForm.data.start_date}
                                                onChange={(value) =>
                                                    generateForm.setData('start_date', value)
                                                }
                                                placeholder="Pilih tanggal"
                                            />
                                        </Field>

                                        <Field label="Interval">
                                            <FormDropdown
                                                value={generateForm.data.interval}
                                                onChange={(val) =>
                                                    generateForm.setData(
                                                        'interval',
                                                        val,
                                                    )
                                                }
                                                options={[
                                                    { value: 'monthly', label: 'Bulanan' },
                                                    { value: 'weekly', label: 'Mingguan' }
                                                ]}
                                            />
                                        </Field>

                                        <Field label="Prefix" className="md:col-span-2">
                                            <input
                                                className="form-input rounded-2xl"
                                                value={generateForm.data.title_prefix}
                                                onChange={(e) =>
                                                    generateForm.setData(
                                                        'title_prefix',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </Field>

                                        <div className="grid grid-cols-2 gap-2 md:col-span-2 md:flex md:justify-end">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowGenerateForm(false)
                                                }
                                                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                            >
                                                Batal
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={generateForm.processing}
                                                className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-60"
                                            >
                                                Generate
                                            </button>
                                        </div>
                                    </form>
                                    </div>
                                </div>
                            </Modal>
                        </>
                    )}
                </div>
            </div>
        </Modal>
    );
}

function DebtModal({
    show,
    onClose,
    selectedDebt,
    editingDebt,
    debtForm,
    submitDebt,
    resetDebtForm,
    editDebt,
    destroyDebt,
    debtAction,
    payDebt,
    payDebtForm,
    activeWallets,
}) {
    const meta = selectedDebt
        ? debtDirection[selectedDebt.direction] ?? debtDirection.owe
        : null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="overflow-hidden rounded-2xl bg-white">
                <ModalHeader
                    label={selectedDebt ? 'Detail Hutang' : 'Hutang Baru'}
                    title={selectedDebt?.name ?? 'Tambah Hutang / Piutang'}
                    description="Catat hutang dan piutang agar pelunasannya lebih mudah dipantau."
                    icon={selectedDebt ? meta?.icon ?? 'arrowUp' : 'plus'}
                    onClose={onClose}
                />

                <div className="max-h-[75vh] overflow-y-auto px-5 py-5 sm:px-6">
                    {(!selectedDebt || editingDebt) && (
                        <form onSubmit={submitDebt} className="grid gap-4 md:grid-cols-2">
                        <Field label="Nama" error={debtForm.errors.name}>
                            <input
                                className="form-input rounded-2xl"
                                value={debtForm.data.name}
                                onChange={(e) =>
                                    debtForm.setData('name', e.target.value)
                                }
                                placeholder="Pinjam ke teman"
                            />
                        </Field>

                        <Field label="Nominal" error={debtForm.errors.amount}>
                            <CurrencyInput
                                className="form-input rounded-2xl"
                                value={debtForm.data.amount}
                                onChange={(val) =>
                                    debtForm.setData('amount', val)
                                }
                                placeholder="0"
                            />
                        </Field>

                        <Field label="Jenis">
                            <FormDropdown
                                value={debtForm.data.direction}
                                onChange={(val) =>
                                    debtForm.setData('direction', val)
                                }
                                options={[
                                    { value: 'owe', label: 'Hutang' },
                                    { value: 'lend', label: 'Piutang' }
                                ]}
                            />
                        </Field>

                        <Field label="Jatuh tempo">
                            <DatePicker
                                value={debtForm.data.due_date}
                                onChange={(value) =>
                                    debtForm.setData('due_date', value)
                                }
                                placeholder="Pilih tanggal"
                            />
                        </Field>

                        <Field label="Status">
                            <FormDropdown
                                value={debtForm.data.status}
                                onChange={(val) =>
                                    debtForm.setData('status', val)
                                }
                                options={[
                                    { value: 'unpaid', label: 'Belum lunas' },
                                    { value: 'paid', label: 'Lunas' },
                                    { value: 'cancelled', label: 'Dibatalkan' }
                                ]}
                            />
                        </Field>

                        <Field label="Reminder (hari sebelum jatuh tempo)">
                            <input
                                type="number"
                                min="0"
                                max="30"
                                className="form-input rounded-2xl"
                                value={debtForm.data.reminder_days_before}
                                onChange={(e) =>
                                    debtForm.setData(
                                        'reminder_days_before',
                                        e.target.value,
                                    )
                                }
                                placeholder="Contoh: 3"
                            />
                        </Field>

                        <Field label="Dompet pelunasan">
                            <Autocomplete
                                value={debtForm.data.wallet_id}
                                onChange={(val) =>
                                    debtForm.setData('wallet_id', val)
                                }
                                options={activeWallets}
                                getOptionLabel={(w) => `${w.name} (${formatRupiah(w.current_balance)})`}
                                getOptionValue={(w) => w.id}
                                getOptionImage={(w) => w.provider?.logo || w.custom_logo || null}
                                placeholder="Cari dompet (opsional)"
                                emptyText="Dompet tidak ditemukan."
                                leadingIcon="wallet"
                            />
                        </Field>

                        <Field label="Deskripsi" className="md:col-span-2">
                            <input
                                className="form-input rounded-2xl"
                                value={debtForm.data.description}
                                onChange={(e) =>
                                    debtForm.setData(
                                        'description',
                                        e.target.value,
                                    )
                                }
                                placeholder="Opsional"
                            />
                        </Field>

                        <div className="grid grid-cols-2 gap-2 md:col-span-2 md:flex md:justify-end">
                            {editingDebt && (
                                <button
                                    type="button"
                                    onClick={resetDebtForm}
                                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                            )}

                            <button
                                type="submit"
                                disabled={debtForm.processing}
                                className={`inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:opacity-60 ${
                                    !editingDebt ? 'col-span-2 md:col-span-1' : ''
                                }`}
                            >
                                {editingDebt ? 'Simpan Perubahan' : 'Tambah'}
                            </button>
                        </div>
                    </form>
                    )}

                    {selectedDebt && !editingDebt && (
                        <div className={`space-y-4 ${editingDebt ? 'mt-6' : ''}`}>
                            <div className="rounded-3xl bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-500">
                                    {meta?.label}
                                </p>
                                <p className="mt-1 break-words text-3xl font-bold text-slate-950">
                                    {formatRupiah(selectedDebt.amount)}
                                </p>
                                <p className="mt-2 text-sm leading-6 text-slate-500">
                                    {selectedDebt.description || 'Tidak ada catatan.'}
                                </p>
                            </div>

                            {selectedDebt.status !== 'paid' && (
                                <div className="rounded-3xl border border-primary-100 bg-primary-50/40 p-4">
                                    <Field label="Dompet untuk pelunasan">
                                        <Autocomplete
                                            value={payDebtForm.data.wallet_id}
                                            onChange={(val) =>
                                                payDebtForm.setData('wallet_id', val)
                                            }
                                            options={activeWallets}
                                            getOptionLabel={(w) => `${w.name} (${formatRupiah(w.current_balance)})`}
                                            getOptionValue={(w) => w.id}
                                            getOptionImage={(w) => w.provider?.logo || w.custom_logo || null}
                                            placeholder="Cari dompet"
                                            emptyText="Dompet tidak ditemukan."
                                            leadingIcon="wallet"
                                        />
                                    </Field>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => editDebt(selectedDebt)}
                                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                >
                                    <Icon name="edit" className="h-4 w-4" />
                                    Edit
                                </button>

                                {selectedDebt.status !== 'paid' ? (
                                    <button
                                        type="button"
                                        onClick={() => payDebt(selectedDebt)}
                                        className="inline-flex items-center justify-center rounded-2xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-700"
                                    >
                                        Tandai Lunas
                                    </button>
                                ) : (

                                    <button
                                        type="button"
                                        onClick={() =>
                                            debtAction('unpaid', selectedDebt)
                                        }
                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Batal lunas
                                    </button>
                                )}

                                {selectedDebt.status !== 'cancelled' && (
                                    <button
                                        type="button"
                                        onClick={() =>
                                            debtAction('cancel', selectedDebt)
                                        }
                                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                                    >
                                        Batalkan
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => destroyDebt(selectedDebt)}
                                    className="inline-flex items-center justify-center rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
                                >
                                    Hapus
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}

const toneMap = {
    blue: 'bg-primary-50 text-primary-700 ring-primary-100',
    green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    red: 'bg-rose-50 text-rose-700 ring-rose-100',
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
};

function SummaryCard({ label, value, icon, tone = 'blue' }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <span
                className={`flex h-10 w-10 items-center justify-center rounded-2xl ring-1 ${toneMap[tone]}`}
            >
                <Icon name={icon} className="h-4 w-4" />
            </span>

            <p className="mt-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
        </div>
    );
}

function ModalHeader({ label, title, description, icon, onClose }) {
    return (
        <div className="relative overflow-hidden border-b border-slate-100 bg-gradient-to-br from-primary-50 via-white to-sky-50 px-5 py-5 sm:px-6">
            <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary-100/80 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-10 h-28 w-28 rounded-full bg-sky-100/80 blur-3xl" />

            <div className="relative flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-lg shadow-primary-600/20">
                        <Icon name={icon} className="h-5 w-5" />
                    </span>

                    <div className="min-w-0">
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary-600">
                            {label}
                        </p>

                        <h2 className="mt-1 truncate text-xl font-bold text-slate-950 sm:text-2xl">
                            {title}
                        </h2>

                        {description && (
                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                {description}
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

function Field({ label, error, className = '', children }) {
    return (
        <label className={`block ${className}`}>
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {label}
            </span>

            <div className="mt-1">{children}</div>

            <InputError message={error} className="mt-1" />
        </label>
    );
}

function EmptyState({ text }) {
    return (
        <div className="col-span-full rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center text-sm font-semibold text-slate-500">
            {text}
        </div>
    );
}
