import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    className?: string;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, ...props }) => {
    const variants: Record<string, string> = {
        primary: "bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 text-white shadow-lg shadow-sky-500/30 hover:shadow-sky-500/40 hover:from-sky-600 hover:to-emerald-600",
        secondary: "bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow",
        ghost: "bg-transparent text-slate-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
        danger: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30",
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                "px-6 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;

