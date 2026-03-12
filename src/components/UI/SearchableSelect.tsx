import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X } from 'lucide-react';

export interface SearchableSelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    options: SearchableSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    required?: boolean;
}

function normalizeStr(str: string): string {
    return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function matches(option: SearchableSelectOption, query: string): boolean {
    const normalized = normalizeStr(option.label);
    const words = normalizeStr(query).split(/\s+/).filter(Boolean);
    return words.every(word => normalized.includes(word));
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Selecione...',
    className = '',
    required,
}: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const selectedOption = options.find(o => o.value === value);

    const filtered = query.trim()
        ? options.filter(o => matches(o, query))
        : options;

    const handleSelect = useCallback((option: SearchableSelectOption) => {
        onChange(option.value);
        setQuery('');
        setOpen(false);
    }, [onChange]);

    const handleClear = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setOpen(false);
    }, [onChange]);

    const handleOpen = useCallback(() => {
        setOpen(true);
        setQuery('');
        setTimeout(() => inputRef.current?.focus(), 0);
    }, []);

    // Fechar ao clicar fora
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const baseClass =
        'w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all';

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Hidden native select for form validation */}
            {required && (
                <select
                    aria-hidden="true"
                    tabIndex={-1}
                    required={required}
                    value={value}
                    onChange={() => {}}
                    className="absolute inset-0 opacity-0 pointer-events-none w-full h-full"
                >
                    <option value="" />
                    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            )}

            {open ? (
                <div className="relative">
                    <input
                        ref={inputRef}
                        type="text"
                        className={baseClass}
                        placeholder="Digite para buscar..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Escape') { setOpen(false); setQuery(''); }
                            if (e.key === 'Enter' && filtered.length === 1) {
                                e.preventDefault();
                                handleSelect(filtered[0]);
                            }
                        }}
                    />
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />

                    {filtered.length > 0 && (
                        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                            {filtered.map(option => (
                                <li
                                    key={option.value}
                                    className="px-4 py-2.5 cursor-pointer text-slate-900 dark:text-white hover:bg-sky-50 dark:hover:bg-gray-700 first:rounded-t-xl last:rounded-b-xl text-sm"
                                    onMouseDown={e => { e.preventDefault(); handleSelect(option); }}
                                >
                                    {option.label}
                                </li>
                            ))}
                        </ul>
                    )}

                    {filtered.length === 0 && (
                        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg px-4 py-3 text-sm text-gray-400">
                            Nenhum resultado encontrado
                        </div>
                    )}
                </div>
            ) : (
                <button
                    type="button"
                    className={`${baseClass} text-left flex items-center justify-between ${!selectedOption ? 'text-gray-400' : ''}`}
                    onClick={handleOpen}
                >
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                    <span className="flex items-center gap-1 shrink-0 ml-2">
                        {selectedOption && (
                            <X
                                className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                onMouseDown={handleClear}
                            />
                        )}
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                    </span>
                </button>
            )}
        </div>
    );
}
