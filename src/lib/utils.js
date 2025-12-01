import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

// Format phone number to Brazilian format: (XX) XXXXX-XXXX
export function formatPhoneNumber(phone) {
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

// Remove phone formatting to save only numbers
export function unformatPhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
}

// Currency symbols and locales
const currencyConfig = {
    'BRL': { symbol: 'R$', locale: 'pt-BR', decimalSeparator: ',', thousandSeparator: '.' },
    'USD': { symbol: '$', locale: 'en-US', decimalSeparator: '.', thousandSeparator: ',' },
    'EUR': { symbol: '€', locale: 'de-DE', decimalSeparator: ',', thousandSeparator: '.' }
};

// Format currency value based on currency code
export function formatCurrency(value, currency = 'BRL') {
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
        : parseFloat(value);
    
    if (isNaN(numValue)) return '';
    
    return formatCurrencyNumber(numValue, currency);
}

// Helper function to format number with currency
function formatCurrencyNumber(numValue, currency = 'BRL') {
    const config = currencyConfig[currency] || currencyConfig['BRL'];
    
    const formatted = numValue.toLocaleString(config.locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    
    // Add currency symbol
    return `${config.symbol} ${formatted}`;
}

// Unformat currency value to save as number (removes all currency symbols)
export function unformatCurrency(value) {
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

// Calculate received value based on payment type and percentage
export function calculateReceivedValue(appointment) {
    if (!appointment) return 0;
    
    const totalValue = parseFloat(appointment.value || 0);
    
    if (appointment.payment_type === '100' || !appointment.payment_type) {
        // 100% - recebe o valor total
        return totalValue;
    } else if (appointment.payment_type === 'percentage' && appointment.payment_percentage) {
        // Porcentagem - calcula o percentual
        const percentage = parseFloat(appointment.payment_percentage);
        return (totalValue * percentage) / 100;
    }
    
    return totalValue;
}

// Format date to Brazilian format: dd/mm/yyyy
export function formatDate(date, options = {}) {
    if (!date) return '';
    
    // If it's already a string in ISO format (YYYY-MM-DD), convert directly
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const parts = date.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    
    // If it's a Date object or other format, use the original method
    const dateObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dateObj.getTime())) return '';
    
    const defaultOptions = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        ...options
    };
    
    return dateObj.toLocaleDateString('pt-BR', defaultOptions);
}

// Format date with time: dd/mm/yyyy HH:mm
export function formatDateTime(date, time = '') {
    if (!date) return '';
    
    const formattedDate = formatDate(date);
    return time ? `${formattedDate} ${formatTime(time)}` : formattedDate;
}

// Format time to 24-hour format (HH:mm)
export function formatTime(time) {
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
    } catch (e) {
        // If parsing fails, return original
    }
    
    return time;
}