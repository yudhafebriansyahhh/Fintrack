import Icon from '@/Components/Icon';
import { useState } from 'react';

export default function FormDropdown({
    value,
    options = [],
    onChange,
    placeholder = 'Pilih data',
    className = '',
    buttonClassName = 'px-4 py-3 text-sm rounded-2xl',
}) {
    const [open, setOpen] = useState(false);
    const selected = options.find((option) => String(option.value) === String(value));

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
                onClick={() => setOpen((current) => !current)}
                className={`flex w-full items-center justify-between gap-3 border border-slate-200 bg-slate-50 text-left font-bold text-slate-800 shadow-sm transition hover:bg-white focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 ${buttonClassName}`}
            >
                <span className={selected ? 'text-slate-800' : 'text-slate-400'}>
                    {selected?.label ?? placeholder}
                </span>
                <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
            </button>

            {open && (
                <div className="absolute z-[100] mt-2 w-full rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-900/10">
                    {options.map((option) => {
                        const active = String(option.value) === String(value);

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    onChange(option.value);
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-primary-50 hover:text-primary-700 ${
                                    active ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                                }`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
