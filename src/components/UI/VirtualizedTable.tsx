import React, { useCallback, useRef, CSSProperties, ReactNode } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { cn } from '../../lib/utils';

/**
 * Interface para coluna da tabela virtualizada
 */
export interface VirtualizedColumn<T> {
    /** Chave única da coluna */
    key: string;
    /** Header da coluna */
    header: ReactNode;
    /** Largura da coluna (px ou %) */
    width: number | string;
    /** Função para renderizar célula */
    render: (item: T, index: number) => ReactNode;
    /** Classes CSS adicionais para o header */
    headerClassName?: string;
    /** Classes CSS adicionais para célula */
    cellClassName?: string;
}

/**
 * Props para VirtualizedTable
 */
interface VirtualizedTableProps<T> {
    /** Dados da tabela */
    data: T[];
    /** Definição das colunas */
    columns: VirtualizedColumn<T>[];
    /** Altura de cada linha em pixels */
    rowHeight?: number;
    /** Altura total da tabela em pixels */
    height?: number;
    /** Quantidade mínima de itens para usar virtualização */
    virtualizationThreshold?: number;
    /** Classe CSS adicional para o container */
    className?: string;
    /** Chave única para cada item */
    getRowKey?: (item: T, index: number) => string;
    /** Callback ao clicar em uma linha */
    onRowClick?: (item: T, index: number) => void;
    /** Texto quando não há dados */
    emptyMessage?: string;
    /** Mostra indicador de loading */
    isLoading?: boolean;
}

/**
 * Componente de tabela virtualizada para listas longas
 * Renderiza apenas as linhas visíveis para melhorar performance
 */
export function VirtualizedTable<T>({
    data,
    columns,
    rowHeight = 56,
    height = 600,
    virtualizationThreshold = 50,
    className,
    getRowKey,
    onRowClick,
    emptyMessage = 'Nenhum item encontrado',
    isLoading = false,
}: VirtualizedTableProps<T>) {
    const listRef = useRef<List>(null);
    
    // Se há poucos itens, usa tabela normal (sem virtualização)
    const shouldVirtualize = data.length > virtualizationThreshold;
    
    /**
     * Renderiza o header da tabela
     */
    const renderHeader = useCallback(() => (
        <div 
            className="flex bg-slate-50/80 dark:bg-gray-800/90 text-slate-700 dark:text-gray-200 font-semibold border-b border-slate-200/60 dark:border-gray-700/80 sticky top-0 z-10"
            role="row"
        >
            {columns.map((column) => (
                <div
                    key={column.key}
                    className={cn(
                        "px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm font-semibold whitespace-nowrap flex-shrink-0",
                        column.headerClassName
                    )}
                    style={{ width: column.width }}
                    role="columnheader"
                >
                    {column.header}
                </div>
            ))}
        </div>
    ), [columns]);
    
    /**
     * Renderiza uma linha da tabela (para virtualização)
     */
    const Row = useCallback(({ index, style }: ListChildComponentProps) => {
        const item = data[index];
        const key = getRowKey ? getRowKey(item, index) : index.toString();
        
        return (
            <div
                key={key}
                style={style}
                className={cn(
                    "flex items-center hover:bg-white/40 dark:hover:bg-gray-700/40 transition-colors border-b border-slate-200/30 dark:border-gray-700/30",
                    onRowClick && "cursor-pointer"
                )}
                role="row"
                onClick={() => onRowClick?.(item, index)}
            >
                {columns.map((column) => (
                    <div
                        key={column.key}
                        className={cn(
                            "px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-slate-700 dark:text-gray-300 text-xs sm:text-sm flex-shrink-0 overflow-hidden",
                            column.cellClassName
                        )}
                        style={{ width: column.width }}
                        role="cell"
                    >
                        {column.render(item, index)}
                    </div>
                ))}
            </div>
        );
    }, [data, columns, getRowKey, onRowClick]);
    
    /**
     * Renderiza tabela normal (sem virtualização)
     */
    const renderNormalTable = () => (
        <div className="overflow-auto" style={{ maxHeight: height }}>
            {renderHeader()}
            <div role="rowgroup">
                {data.map((item, index) => {
                    const key = getRowKey ? getRowKey(item, index) : index.toString();
                    return (
                        <div
                            key={key}
                            className={cn(
                                "flex items-center hover:bg-white/40 dark:hover:bg-gray-700/40 transition-colors border-b border-slate-200/30 dark:border-gray-700/30",
                                onRowClick && "cursor-pointer"
                            )}
                            style={{ minHeight: rowHeight }}
                            role="row"
                            onClick={() => onRowClick?.(item, index)}
                        >
                            {columns.map((column) => (
                                <div
                                    key={column.key}
                                    className={cn(
                                        "px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3 text-slate-700 dark:text-gray-300 text-xs sm:text-sm flex-shrink-0",
                                        column.cellClassName
                                    )}
                                    style={{ width: column.width }}
                                    role="cell"
                                >
                                    {column.render(item, index)}
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
    
    /**
     * Renderiza tabela virtualizada
     */
    const renderVirtualizedTable = () => (
        <div style={{ height }}>
            {renderHeader()}
            <List
                ref={listRef}
                height={height - 48} // Subtrai altura do header
                itemCount={data.length}
                itemSize={rowHeight}
                width="100%"
                className="scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600"
            >
                {Row}
            </List>
        </div>
    );
    
    // Loading state
    if (isLoading) {
        return (
            <div className={cn(
                "w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md",
                className
            )}>
                {renderHeader()}
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
            </div>
        );
    }
    
    // Empty state
    if (data.length === 0) {
        return (
            <div className={cn(
                "w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md",
                className
            )}>
                {renderHeader()}
                <div className="flex items-center justify-center py-12 text-slate-500 dark:text-gray-400">
                    {emptyMessage}
                </div>
            </div>
        );
    }
    
    return (
        <div 
            className={cn(
                "w-full overflow-hidden rounded-xl sm:rounded-2xl border border-white/40 dark:border-gray-700/40 shadow-lg bg-white/40 dark:bg-gray-800/40 backdrop-blur-md",
                className
            )}
            role="table"
        >
            {shouldVirtualize ? renderVirtualizedTable() : renderNormalTable()}
        </div>
    );
}

/**
 * Hook para calcular altura dinâmica baseada no viewport
 */
export function useTableHeight(offset: number = 300): number {
    const [height, setHeight] = React.useState(600);
    
    React.useEffect(() => {
        const updateHeight = () => {
            setHeight(Math.max(400, window.innerHeight - offset));
        };
        
        updateHeight();
        window.addEventListener('resize', updateHeight);
        
        return () => window.removeEventListener('resize', updateHeight);
    }, [offset]);
    
    return height;
}

export default VirtualizedTable;
