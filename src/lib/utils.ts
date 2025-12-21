import { clsx, ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combina classes CSS usando clsx e tailwind-merge
 */
export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 * Formata número de telefone para formato brasileiro: (XX) XXXXX-XXXX
 */
export function formatPhoneNumber(phone: string): string {
    if (!phone) return '';
    
    // Remove all non-numeric characters
    const numbers = phone.replace(/\D/g, '');
    
    // Apply mask based on length
    if (numbers.length <= 2) {
        return numbers.length > 0 ? `(${numbers}` : '';
    } else if (numbers.length <= 7) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    } else if (numbers.length <= 10) {
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    } else {
        // For 11 digits (cell phone with 9)
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }
}

/**
 * Remove formatação do telefone, mantendo apenas números
 */
export function unformatPhoneNumber(phone: string): string {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

// Currency symbols and locales
interface CurrencyConfig {
    symbol: string;
    locale: string;
    decimalSeparator: string;
    thousandSeparator: string;
}

const currencyConfig: Record<string, CurrencyConfig> = {
    'BRL': { symbol: 'R$', locale: 'pt-BR', decimalSeparator: ',', thousandSeparator: '.' },
    'USD': { symbol: '$', locale: 'en-US', decimalSeparator: '.', thousandSeparator: ',' },
    'EUR': { symbol: '€', locale: 'de-DE', decimalSeparator: ',', thousandSeparator: '.' }
};

/**
 * Formata valor monetário baseado no código da moeda
 */
export function formatCurrency(value: number | string, currency: string = 'BRL'): string {
    if (!value && value !== 0) return '';
    
    const config = currencyConfig[currency] || currencyConfig['BRL'];
    
    // If it's already a formatted string with currency symbol, try to extract number
    if (typeof value === 'string') {
        // Check if it already has a currency symbol
        const hasSymbol = Object.values(currencyConfig).some(c => value.includes(c.symbol));
        if (hasSymbol) {
            // Extract number and reformat with new currency
            const numValue = parseFloat(
                value
                    .replace(/[^\d.,-]/g, '')
                    .replace(/\./g, '')
                    .replace(',', '.')
            );
            if (!isNaN(numValue)) {
                return formatCurrencyNumber(numValue, currency);
            }
        }
    }
    
    // Convert to number
    const numValue = typeof value === 'string' 
        ? parseFloat(value.replace(/[^\d.,-]/g, '').replace(',', '.')) 
        : parseFloat(String(value));
    
    if (isNaN(numValue)) return '';
    
    return formatCurrencyNumber(numValue, currency);
}

// Helper function to format number with currency
function formatCurrencyNumber(numValue: number, currency: string = 'BRL'): string {
    const config = currencyConfig[currency] || currencyConfig['BRL'];
    
    const formatted = numValue.toLocaleString(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Add currency symbol
    return `${config.symbol} ${formatted}`;
}

/**
 * Remove formatação de moeda, retornando apenas número
 */
export function unformatCurrency(value: string | number): string {
    if (!value) return '';
    
    // Remove all currency symbols (R$, $, €), spaces, and dots (thousand separators)
    // Keep only numbers, comma (decimal separator), and minus sign
    const cleaned = value.toString()
        .replace(/R\$/g, '')
        .replace(/\$/g, '')
        .replace(/€/g, '')
        .replace(/\s/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
    
    return cleaned;
}

interface Appointment {
    value?: number;
    payment_type?: string;
    payment_percentage?: number;
}

/**
 * Calcula o valor recebido baseado no tipo de pagamento e percentual
 */
export function calculateReceivedValue(appointment: Appointment): number {
    if (!appointment) return 0;
    
    const totalValue = parseFloat(String(appointment.value || 0));
    
    if (appointment.payment_type === '100' || !appointment.payment_type) {
        // 100% - recebe o valor total
        return totalValue;
    } else if (appointment.payment_type === 'percentage' && appointment.payment_percentage) {
        // Porcentagem - calcula o percentual
        const percentage = parseFloat(String(appointment.payment_percentage));
        return (totalValue * percentage) / 100;
    }
    
    return totalValue;
}

interface DateFormatOptions {
    includeTime?: boolean;
    day?: '2-digit' | 'numeric';
    month?: '2-digit' | 'numeric';
    year?: 'numeric' | '2-digit';
}

/**
 * Formata data para formato brasileiro: dd/mm/yyyy
 */
export function formatDate(date: string | Date, options: DateFormatOptions = {}): string {
    if (!date) return '';
    
    // If it's already a string in ISO format (YYYY-MM-DD), convert directly
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const parts = date.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // If it's a Date object or other format, use the original method
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return '';
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options
    };
    
    return dateObj.toLocaleDateString('pt-BR', defaultOptions);
}

// Format date with time: dd/mm/yyyy HH:mm
export function formatDateTime(date: string | Date, time: string = ''): string {
    if (!date) return '';
    
    const formattedDate = formatDate(date);
    return time ? `${formattedDate} ${formatTime(time)}` : formattedDate;
}

// Format time to 24-hour format (HH:mm)
/**
 * Formata hora para formato HH:mm
 */
export function formatTime(time: string): string {
    if (!time) return '';
    
    // If already in HH:mm format, return as is
    if (/^\d{2}:\d{2}$/.test(time)) {
        return time;
    }
    
    // If in HH:mm:ss format, remove seconds
    if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
        return time.substring(0, 5);
    }
    
    // Try to parse and format
    try {
        const [hours, minutes] = time.split(':');
        if (hours && minutes) {
            const h = parseInt(hours, 10);
            const m = parseInt(minutes, 10);
            if (!isNaN(h) && !isNaN(m)) {
                return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            }
        }
    } catch {
        // If parsing fails, return original
    }
    
    return time;
}

