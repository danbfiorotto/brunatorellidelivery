import React, { useState, useEffect, ReactNode } from 'react';
import { Clock } from 'lucide-react';

interface TimeInputProps {
    label?: string | ReactNode;
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    required?: boolean;
    className?: string;
    placeholder?: string;
}

const TimeInput: React.FC<TimeInputProps> = ({ 
    label, 
    value, 
    onChange, 
    required, 
    className = '', 
    placeholder = '00:00' 
}) => {
    const [displayValue, setDisplayValue] = useState<string>('');

    // Convert time to HH:mm format
    const normalizeTime = (time: string): string => {
        if (!time) return '';
        
        // If already in HH:mm format, return as is
        if (/^\d{2}:\d{2}$/.test(time)) {
            return time;
        }
        
        // If in HH:mm:ss format, remove seconds
        if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
            return time.substring(0, 5);
        }
        
        return time;
    };

    // Initialize from prop value
    useEffect(() => {
        if (value) {
            const normalized = normalizeTime(value);
            setDisplayValue(normalized);
        } else {
            setDisplayValue('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const input = e.target.value;
        
        // Allow only numbers and :
        const cleaned = input.replace(/[^\d:]/g, '');
        
        // Format as user types: HH:mm
        let formatted = cleaned;
        
        // Add : after hours (2 digits)
        if (cleaned.length > 2 && !cleaned.includes(':')) {
            formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
        }
        
        // Limit to HH:mm format (5 characters)
        if (formatted.length > 5) {
            formatted = formatted.slice(0, 5);
        }
        
        // Validate hours (00-23) and minutes (00-59)
        if (formatted.includes(':')) {
            const [hours, minutes] = formatted.split(':');
            if (hours) {
                const h = parseInt(hours, 10);
                if (!isNaN(h) && h > 23) {
                    formatted = '23:' + (minutes || '00');
                }
            }
            if (minutes) {
                const m = parseInt(minutes, 10);
                if (!isNaN(m) && m > 59) {
                    const h = formatted.split(':')[0];
                    formatted = h + ':59';
                }
            }
        }
        
        setDisplayValue(formatted);
        
        // Call onChange with normalized value
        if (onChange) {
            const normalized = normalizeTime(formatted);
            onChange({ target: { value: normalized } });
        }
    };

    const handleBlur = (): void => {
        // Validate and format on blur
        if (displayValue) {
            const normalized = normalizeTime(displayValue);
            if (normalized && /^\d{2}:\d{2}$/.test(normalized)) {
                setDisplayValue(normalized);
                if (onChange) {
                    onChange({ target: { value: normalized } });
                }
            } else {
                // Invalid time, clear or keep as is
                setDisplayValue('');
                if (onChange) {
                    onChange({ target: { value: '' } });
                }
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
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 pointer-events-none">
                    <Clock size={18} />
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={displayValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                    required={required}
                    maxLength={5}
                />
            </div>
        </div>
    );
};

export default TimeInput;

