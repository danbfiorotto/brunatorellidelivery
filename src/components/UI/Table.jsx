import React from 'react';
import { cn } from '../../lib/utils';

export const Table = ({ children, className, ...props }) => {
    return (
        <div className="w-full overflow-x-auto rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md -mx-2 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
                <table className={cn("w-full text-left text-sm min-w-[640px] sm:min-w-0", className)} {...props}>
                    {children}
                </table>
            </div>
        </div>
    );
};

export const TableHeader = ({ children, className, ...props }) => {
    return (
        <thead className={cn("bg-slate-50/80 dark:bg-gray-800/90 text-slate-700 dark:text-gray-200 font-semibold border-b border-slate-200/60 dark:border-gray-700/80", className)} {...props}>
            {children}
        </thead>
    );
};

export const TableBody = ({ children, className, ...props }) => {
    return (
        <tbody className={cn("divide-y divide-slate-200/60 dark:divide-gray-700/60", className)} {...props}>
            {children}
        </tbody>
    );
};

export const TableRow = ({ children, className, ...props }) => {
    return (
        <tr className={cn("hover:bg-white/40 dark:hover:bg-gray-700/40 transition-colors", className)} {...props}>
            {children}
        </tr>
    );
};

export const TableHead = ({ children, className, ...props }) => {
    return (
        <th className={cn("px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-slate-700 dark:text-gray-200 whitespace-nowrap", className)} {...props}>
            {children}
        </th>
    );
};

export const TableCell = ({ children, className, ...props }) => {
    return (
        <td className={cn("px-3 sm:px-4 md:px-6 py-3 sm:py-4 text-slate-700 dark:text-gray-300 text-xs sm:text-sm", className)} {...props}>
            {children}
        </td>
    );
};
