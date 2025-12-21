import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastConfig {
    icon: LucideIcon;
    color: string;
    bg: string;
}

const TOAST_TYPES: Record<ToastType, ToastConfig> = {
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
    error: { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/20' },
    warning: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
    info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20' }
};

interface Toast {
    id: number;
    type: ToastType;
    title?: string;
    description?: string;
    duration?: number;
}

interface ToastContextType {
    showToast: (toast: Omit<Toast, 'id'>) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string) => void;
    showWarning: (message: string, title?: string) => void;
    showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

interface ToastItemProps {
    toast: Toast;
    onRemove: (id: number) => void;
}

/**
 * Componente Toast individual
 */
const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
    const [isVisible, setIsVisible] = useState<boolean>(true);
    const Icon = TOAST_TYPES[toast.type]?.icon || Info;
    const typeConfig = TOAST_TYPES[toast.type] || TOAST_TYPES.info;

    useEffect(() => {
        if (toast.duration && toast.duration > 0) {
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => onRemove(toast.id), 300);
            }, toast.duration);

            return () => clearTimeout(timer);
        }
    }, [toast.duration, toast.id, onRemove]);

    if (!isVisible) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
            className={`${typeConfig.bg} border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 min-w-[300px] max-w-md mb-2`}
        >
            <div className="flex items-start gap-3">
                <Icon className={`${typeConfig.color} flex-shrink-0 mt-0.5`} size={20} />
                <div className="flex-1 min-w-0">
                    {toast.title && (
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                            {toast.title}
                        </h4>
                    )}
                    {toast.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                            {toast.description}
                        </p>
                    )}
                </div>
                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(() => onRemove(toast.id), 300);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </motion.div>
    );
};

/**
 * Provider de Toast usando Context API
 */
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    
    const showToast = (toast: Omit<Toast, 'id'>): void => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { ...toast, id }]);
    };
    
    const showSuccess = (message: string, title: string = 'Sucesso'): void => {
        showToast({ type: 'success', title, description: message });
    };
    
    const showError = (message: string, title: string = 'Erro'): void => {
        showToast({ type: 'error', title, description: message });
    };
    
    const showWarning = (message: string, title: string = 'Aviso'): void => {
        showToast({ type: 'warning', title, description: message });
    };
    
    const showInfo = (message: string, title: string = 'Informação'): void => {
        showToast({ type: 'info', title, description: message });
    };
    
    const removeToast = (id: number): void => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };
    
    return (
        <ToastContext.Provider value={{ showToast, showSuccess, showError, showWarning, showInfo }}>
            {children}
            <ToastContainerInternal toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
};

const ToastContainerInternal: React.FC<{ 
    toasts: Toast[]; 
    onRemove: (id: number) => void;
}> = ({ toasts, onRemove }) => {
    if (toasts.length === 0) return null;
    
    return (
        <div className="fixed top-4 right-4 z-50 pointer-events-none">
            <div className="pointer-events-auto">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

/**
 * Hook para usar Toast
 */
export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

/**
 * Container de Toasts (mantido para compatibilidade, mas não é mais usado diretamente)
 * @deprecated Use ToastProvider e useToast hook
 */
export const ToastContainer: React.FC = () => {
    // Este componente não é mais necessário, mas mantido para compatibilidade
    return null;
};

