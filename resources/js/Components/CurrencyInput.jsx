import { useEffect, useState } from 'react';

export default function CurrencyInput({
    value,
    onChange,
    className = '',
    placeholder = '0',
    ...props
}) {
    const [displayValue, setDisplayValue] = useState('');

    useEffect(() => {
        if (value === null || value === undefined || value === '') {
            setDisplayValue('');
            return;
        }
        
        // Parse the incoming value (which is likely a string or float from backend/form)
        const numericStr = String(value).replace(/[^0-9.-]+/g, '');
        if (!isNaN(numericStr) && numericStr !== '') {
            const parts = numericStr.split('.');
            let formatted = new Intl.NumberFormat('id-ID').format(parts[0]);
            if (parts.length > 1) {
                formatted += ',' + parts[1]; 
            }
            
            // Only update displayValue if it's fundamentally different from what the user is currently typing
            // This prevents cursor jumping while typing decimals
            const currentClean = displayValue.replace(/[^0-9,]/g, '').replace(',', '.');
            if (currentClean !== numericStr) {
                setDisplayValue(formatted);
            }
        }
    }, [value]);

    const handleChange = (e) => {
        let val = e.target.value;
        
        // Allow only digits and a single comma
        let clean = val.replace(/[^0-9,]/g, '');
        
        // Prevent multiple commas
        const commaCount = (clean.match(/,/g) || []).length;
        if (commaCount > 1) {
            clean = clean.substring(0, clean.lastIndexOf(','));
        }

        let parts = clean.split(',');
        let numericStr = parts[0];
        if (parts.length > 1) {
            numericStr += '.' + parts[1];
        }

        // Format the display value gracefully as they type
        let formattedDisplay = '';
        if (parts[0] !== '') {
            formattedDisplay = new Intl.NumberFormat('id-ID').format(parts[0]);
        }
        if (parts.length > 1) {
            formattedDisplay += ',' + parts[1];
        } else if (val.endsWith(',')) {
            formattedDisplay += ',';
        }

        setDisplayValue(formattedDisplay);
        onChange(numericStr);
    };

    return (
        <div className="relative">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-500">
                Rp
            </span>
            <input
                type="text"
                inputMode="decimal"
                className={`pl-10 ${className}`}
                value={displayValue}
                onChange={handleChange}
                placeholder={placeholder}
                {...props}
            />
        </div>
    );
}
