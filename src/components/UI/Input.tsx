import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string | React.ReactNode;
    error?: string;
    className?: string;
    icon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', icon, ...props }, ref) => {
        return (
            <div className={cn("mb-4", className)}>
                {label && (
                    <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                        {typeof label === 'string' ? label : label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10 pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={cn(
                            "w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all",
                            "bg-white dark:bg-gray-800 text-slate-900 dark:text-white",
                            "disabled:bg-gray-50 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed",
                            icon && "pl-10",
                            error ? 'border-red-300 dark:border-red-700 focus:ring-red-200 dark:focus:ring-red-900/30' : 'border-gray-200 dark:border-gray-700'
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;

