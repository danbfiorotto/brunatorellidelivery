import React, { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    size?: ModalSize;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const sizeClasses: Record<ModalSize, string> = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm"
                    onTouchStart={(e) => {
                        // Prevenir que eventos touch no overlay fechem o modal acidentalmente
                        if (e.target === e.currentTarget) {
                            e.stopPropagation();
                        }
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.2 }}
                        className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col m-0 sm:m-2"
                        style={{ maxWidth: sizeClasses[size] }}
                        onClick={(e) => {
                            // Prevenir que cliques no conteúdo do modal fechem o modal
                            e.stopPropagation();
                        }}
                        onTouchStart={(e) => {
                            // Prevenir que eventos touch no conteúdo do modal sejam propagados
                            e.stopPropagation();
                        }}
                    >
                        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600">
                            <h3 className="text-base sm:text-lg md:text-xl font-bold text-white pr-2 truncate flex-1">{title}</h3>
                            <button
                                onClick={onClose}
                                className="p-2 min-h-[44px] min-w-[44px] text-white/80 hover:text-white rounded-lg hover:bg-white/20 transition-colors flex-shrink-0 flex items-center justify-center"
                                aria-label="Fechar"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-3 sm:p-4 md:p-6 overflow-y-auto flex-1">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default Modal;

