import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

interface PaginationProps {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    hasNext?: boolean;
    hasPrev?: boolean;
}

/**
 * Componente de Paginação
 */
export const Pagination: React.FC<PaginationProps> = ({
    page,
    totalPages,
    total,
    pageSize,
    onPageChange,
    hasNext = false,
    hasPrev = false
}) => {
    if (totalPages <= 1) {
        return null;
    }

    const handlePageChange = (newPage: number): void => {
        if (newPage >= 1 && newPage <= totalPages) {
            onPageChange(newPage);
        }
    };

    const getPageNumbers = (): number[] => {
        const pages: number[] = [];
        const maxVisible = 5;
        
        let start = Math.max(1, page - Math.floor(maxVisible / 2));
        let end = Math.min(totalPages, start + maxVisible - 1);
        
        if (end - start < maxVisible - 1) {
            start = Math.max(1, end - maxVisible + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        return pages;
    };

    const pageNumbers = getPageNumbers();
    const startRecord = (page - 1) * pageSize + 1;
    const endRecord = Math.min(page * pageSize, total);

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            {/* Informações */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
                Mostrando <span className="font-medium">{startRecord}</span> a{' '}
                <span className="font-medium">{endRecord}</span> de{' '}
                <span className="font-medium">{total}</span> resultados
            </div>

            {/* Controles de navegação */}
            <div className="flex items-center gap-2">
                {/* Botão Anterior */}
                <Button
                    variant="secondary"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={!hasPrev}
                    className="px-3 py-1.5"
                >
                    <ChevronLeft size={16} />
                </Button>

                {/* Números de página */}
                <div className="flex items-center gap-1">
                    {pageNumbers[0] > 1 && (
                        <>
                            <Button
                                variant={1 === page ? 'primary' : 'secondary'}
                                onClick={() => handlePageChange(1)}
                                className="px-3 py-1.5 min-w-[40px]"
                            >
                                1
                            </Button>
                            {pageNumbers[0] > 2 && (
                                <span className="px-2 text-gray-400">...</span>
                            )}
                        </>
                    )}
                    
                    {pageNumbers.map((pageNum) => (
                        <Button
                            key={pageNum}
                            variant={pageNum === page ? 'primary' : 'secondary'}
                            onClick={() => handlePageChange(pageNum)}
                            className="px-3 py-1.5 min-w-[40px]"
                        >
                            {pageNum}
                        </Button>
                    ))}
                    
                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                        <>
                            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                            )}
                            <Button
                                variant={totalPages === page ? 'primary' : 'secondary'}
                                onClick={() => handlePageChange(totalPages)}
                                className="px-3 py-1.5 min-w-[40px]"
                            >
                                {totalPages}
                            </Button>
                        </>
                    )}
                </div>

                {/* Botão Próxima */}
                <Button
                    variant="secondary"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={!hasNext}
                    className="px-3 py-1.5"
                >
                    <ChevronRight size={16} />
                </Button>
            </div>
        </div>
    );
};

export default Pagination;

