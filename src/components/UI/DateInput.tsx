import React, { useState, useEffect, useRef, ReactNode } from 'react';
import { Calendar } from 'lucide-react';

interface DateInputProps {
    label?: string | ReactNode;
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    required?: boolean;
    className?: string;
    placeholder?: string;
    id?: string;
}

const DateInput: React.FC<DateInputProps> = ({ 
    label, 
    value, 
    onChange, 
    required, 
    className = '', 
    placeholder = 'dd/mm/aaaa', 
    id 
}) => {
    const [displayValue, setDisplayValue] = useState<string>('');
    const [isoValue, setIsoValue] = useState<string>('');
    const dateInputRef = useRef<HTMLInputElement>(null);

    // Convert ISO date (YYYY-MM-DD) to Brazilian format (DD/MM/YYYY)
    const isoToBrazilian = (isoDate: string): string => {
        if (!isoDate) return '';
        // Work directly with string to avoid timezone issues
        // ISO format: YYYY-MM-DD
        const parts = isoDate.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parts[1];
            const day = parts[2];
            // Return in Brazilian format: DD/MM/YYYY
            return `${day}/${month}/${year}`;
        }
        return '';
    };

    // Convert Brazilian format (DD/MM/YYYY) to ISO (YYYY-MM-DD)
    const brazilianToIso = (brazilianDate: string): string => {
        if (!brazilianDate) return '';
        
        // Remove all non-numeric characters except /
        const cleaned = brazilianDate.replace(/[^\d/]/g, '');
        
        // Split by /
        const parts = cleaned.split('/').filter(p => p);
        
        if (parts.length === 3) {
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            
            // Validate basic format (don't use Date object to avoid timezone issues)
            if (day.length === 2 && month.length === 2 && year.length === 4) {
                // Validate that it's a valid date
                const dayNum = parseInt(day, 10);
                const monthNum = parseInt(month, 10);
                const yearNum = parseInt(year, 10);
                
                // Basic validation: day 1-31, month 1-12, year reasonable
                if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum >= 1900 && yearNum <= 2100) {
                    return `${year}-${month}-${day}`;
                }
            }
        }
        
        return '';
    };

    // Initialize from prop value (ISO format)
    useEffect(() => {
        if (value) {
            setIsoValue(value);
            setDisplayValue(isoToBrazilian(value));
        } else {
            setIsoValue('');
            setDisplayValue('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const input = e.target.value;
        
        // Allow only numbers and /
        const cleaned = input.replace(/[^\d/]/g, '');
        
        // Format as user types: dd/mm/yyyy
        let formatted = cleaned;
        
        // Add / after day (2 digits)
        if (cleaned.length > 2 && !cleaned.includes('/')) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        
        // Add / after month (5 digits total: dd/mm)
        if (cleaned.length > 4 && cleaned.split('/').length === 2) {
            const parts = cleaned.split('/');
            if (parts[0].length === 2 && parts[1].length > 0) {
                formatted = parts[0] + '/' + parts[1].slice(0, 2);
                if (parts[1].length > 2) {
                    formatted += '/' + parts[1].slice(2, 6);
                }
            }
        }
        
        // Limit to dd/mm/yyyy format (10 characters)
        if (formatted.length > 10) {
            formatted = formatted.slice(0, 10);
        }
        
        setDisplayValue(formatted);
        
        // Convert to ISO and call onChange
        const iso = brazilianToIso(formatted);
        setIsoValue(iso);
        if (onChange) {
            onChange({ target: { value: iso } });
        }
    };

    const handleBlur = (): void => {
        // Validate and format on blur
        if (displayValue) {
            const iso = brazilianToIso(displayValue);
            if (iso) {
                setIsoValue(iso);
                setDisplayValue(isoToBrazilian(iso));
            } else {
                // Invalid date, clear or keep as is
                setDisplayValue('');
                setIsoValue('');
                if (onChange) {
                    onChange({ target: { value: '' } });
                }
            }
        }
    };

    const handleCalendarClick = (): void => {
        // Open native date picker
        if (dateInputRef.current) {
            // Try showPicker() first (modern browsers)
            if (typeof dateInputRef.current.showPicker === 'function') {
                dateInputRef.current.showPicker().catch(() => {
                    // Fallback to click if showPicker fails
                    dateInputRef.current?.click();
                });
            } else {
                // Fallback for older browsers
                dateInputRef.current.click();
            }
        }
    };

    const handleNativeDateChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const nativeValue = e.target.value;
        if (nativeValue) {
            setIsoValue(nativeValue);
            setDisplayValue(isoToBrazilian(nativeValue));
            if (onChange) {
                onChange({ target: { value: nativeValue } });
            }
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                    {typeof label === 'string' ? label : <span>{label}</span>}
                    {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    type="date"
                    ref={dateInputRef}
                    value={isoValue}
                    onChange={handleNativeDateChange}
                    className="absolute opacity-0 w-0 h-0 pointer-events-none"
                    tabIndex={-1}
                    aria-hidden={true}
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 pointer-events-none">
                    <Calendar size={18} />
                </div>
                <input
                    type="text"
                    id={id}
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full pl-10 pr-12 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                    required={required}
                    maxLength={10}
                />
                <button
                    type="button"
                    onClick={handleCalendarClick}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer z-10"
                    title="Abrir calendário"
                >
                    <Calendar size={18} />
                </button>
            </div>
        </div>
    );
};

export default DateInput;

