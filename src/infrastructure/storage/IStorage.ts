/**
 * Interface para abstração de storage
 * Permite trocar implementação (localStorage, sessionStorage, in-memory, etc.)
 * sem afetar código que usa storage
 */
export interface IStorage {
    /**
     * Obtém um item do storage
     */
    getItem(key: string): string | null;

    /**
     * Define um item no storage
     */
    setItem(key: string, value: string): void;

    /**
     * Remove um item do storage
     */
    removeItem(key: string): void;

    /**
     * Limpa todo o storage
     */
    clear(): void;

    /**
     * Obtém a chave no índice especificado
     */
    key(index: number): string | null;

    /**
     * Número de itens no storage
     */
    readonly length: number;
}





