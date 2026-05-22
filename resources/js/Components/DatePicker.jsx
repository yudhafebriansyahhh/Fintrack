import Icon from '@/Components/Icon';
import { useMemo, useState } from 'react';

const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const toDate = (value) => {
    if (!value) return new Date();

    const date = new Date(`${value}T00:00:00`);

    return Number.isNaN(date.getTime()) ? new Date() : date;
};

const toIsoDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const formatDisplay = (value) => {
    if (!value) return '';

    const date = toDate(value);

    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
};

const monthLabel = (date) =>
    new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
    }).format(date);

export default function DatePicker({ value, onChange, placeholder = 'Pilih tanggal', className = '' }) {
    const [open, setOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => toDate(value));
    const selectedDate = value ? toDate(value) : null;

    const dates = useMemo(() => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const start = new Date(year, month, 1 - firstDay.getDay());

        return Array.from({ length: 42 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [viewDate]);

    const moveMonth = (offset) => {
        setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
    };

    return (
        <div
            className={`relative ${className}`}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    setOpen(false);
                }
            }}
        >
            <button
                type="button"
                onClick={() => {
                    setViewDate(toDate(value));
                    setOpen((current) => !current);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-800 shadow-sm transition hover:bg-white focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100"
            >
                <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                <span className={value ? 'text-slate-800' : 'text-slate-400'}>
                    {value ? formatDisplay(value) : placeholder}
                </span>
            </button>

            {open && (
                <div className="absolute z-40 mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10">
                    <div className="flex items-center justify-between gap-3">
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => moveMonth(-1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-primary-600"
                            aria-label="Bulan sebelumnya"
                        >
                            <Icon name="chevronLeft" className="h-4 w-4" />
                        </button>
                        <p className="text-sm font-bold text-slate-900">{monthLabel(viewDate)}</p>
                        <button
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => moveMonth(1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-primary-600"
                            aria-label="Bulan berikutnya"
                        >
                            <Icon name="chevronRight" className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {dayLabels.map((label) => (
                            <span key={label}>{label}</span>
                        ))}
                    </div>

                    <div className="mt-2 grid grid-cols-7 gap-1">
                        {dates.map((date) => {
                            const iso = toIsoDate(date);
                            const currentMonth = date.getMonth() === viewDate.getMonth();
                            const selected = selectedDate && iso === toIsoDate(selectedDate);
                            const today = iso === toIsoDate(new Date());

                            return (
                                <button
                                    key={iso}
                                    type="button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                        onChange(iso);
                                        setOpen(false);
                                    }}
                                    className={`flex h-10 items-center justify-center rounded-xl text-sm font-bold transition ${
                                        selected
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20'
                                            : today
                                              ? 'bg-primary-50 text-primary-700'
                                              : currentMonth
                                                ? 'text-slate-700 hover:bg-primary-50 hover:text-primary-700'
                                                : 'text-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {date.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
