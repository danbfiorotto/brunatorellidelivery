import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    title?: string;
    className?: string;
}

const Card: React.FC<CardProps> = ({ children, title, className, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={cn(
                "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg rounded-xl sm:rounded-2xl p-4 sm:p-6",
                "hover:shadow-xl transition-all duration-300",
                className
            )}
            {...props}
        >
            {title && (
                <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
                </div>
            )}
            {children}
        </motion.div>
    );
};

export default Card;

