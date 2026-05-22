import Icon from '@/Components/Icon';
import { useEffect, useMemo, useState } from 'react';

export default function Autocomplete({
    value,
    options = [],
    onChange,
    getOptionLabel = (option) => option?.label ?? '',
    getOptionValue = (option) => option?.value,
    placeholder = 'Cari data',
    emptyText = 'Data tidak ditemukan.',
    leadingIcon = 'search',
    getOptionImage = null,
    className = '',
}) {
    const selected = useMemo(
        () => options.find((option) => String(getOptionValue(option)) === String(value)),
        [getOptionValue, options, value],
    );
    const selectedImage = selected && getOptionImage ? getOptionImage(selected) : null;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState(selected ? getOptionLabel(selected) : '');

    useEffect(() => {
        setSearch(selected ? getOptionLabel(selected) : '');
    }, [getOptionLabel, selected]);

    const filteredOptions = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword || (selected && search === getOptionLabel(selected))) {
            return options;
        }

        return options.filter((option) =>
            getOptionLabel(option).toLowerCase().includes(keyword),
        );
    }, [getOptionLabel, options, search, selected]);

    const close = () => {
        setOpen(false);
        setSearch(selected ? getOptionLabel(selected) : '');
    };

    return (
        <div
            className={`relative ${className}`}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                    close();
                }
            }}
        >
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition focus-within:border-primary-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary-100">
                <div className="relative">
                    {(selectedImage || leadingIcon) && (
                        <span className="pointer-events-none absolute left-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-400">
                            {selectedImage ? (
                                <img
                                    src={selectedImage}
                                    alt=""
                                    className="h-5 w-5 object-contain"
                                />
                            ) : (
                                <Icon name={leadingIcon} className="h-4 w-4" />
                            )}
                        </span>
                    )}
                    <input
                        className={`w-full border-0 bg-transparent py-3 pr-4 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:ring-0 ${selectedImage || leadingIcon ? 'pl-11' : 'pl-4'}`}
                        value={search}
                        onFocus={() => setOpen(true)}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setOpen(true);
                            onChange('');
                        }}
                        placeholder={placeholder}
                    />
                </div>
            </div>

            {open && (
                <div className="absolute z-40 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-900/10">
                    {filteredOptions.length === 0 && (
                        <div className="px-4 py-4 text-center text-sm text-slate-400">
                            {emptyText}
                        </div>
                    )}

                    {filteredOptions.map((option) => {
                        const optionValue = getOptionValue(option);
                        const optionImage = getOptionImage ? getOptionImage(option) : null;
                        const active = String(optionValue) === String(value);

                        return (
                            <button
                                key={optionValue}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => {
                                    onChange(optionValue);
                                    setSearch(getOptionLabel(option));
                                    setOpen(false);
                                }}
                                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition hover:bg-primary-50 hover:text-primary-700 ${
                                    active ? 'bg-primary-50 text-primary-700' : 'text-slate-700'
                                }`}
                            >
                                {(optionImage || leadingIcon) && (
                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                                        {optionImage ? (
                                            <img
                                                src={optionImage}
                                                alt=""
                                                className="h-6 w-6 object-contain"
                                            />
                                        ) : (
                                            <Icon name={leadingIcon} className="h-4 w-4" />
                                        )}
                                    </span>
                                )}
                                <span className="truncate">{getOptionLabel(option)}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
