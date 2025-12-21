/**
 * Interface para serviço de cache
 * Permite trocar implementação sem alterar código dependente
 */
export interface ICacheService {
    /**
     * Obtém um valor do cache
     */
    get<T = unknown>(key: string): Promise<T | null>;

    /**
     * Define um valor no cache
     */
    set<T = unknown>(key: string, value: T, ttl?: number | null): Promise<void>;

    /**
     * Remove um item do cache
     */
    delete(key: string): Promise<boolean>;

    /**
     * Limpa todo o cache
     */
    clear(): void;

    /**
     * Invalida itens do cache que correspondem a um padrão
     */
    invalidate(pattern: string): void;

    /**
     * Define um valor no cache com tags para invalidação
     */
    setWithTags<T = unknown>(key: string, value: T, tags?: string[], ttl?: number | null): Promise<void>;

    /**
     * Invalida todos os itens com uma tag específica
     */
    invalidateByTag(tag: string): Promise<void>;

    /**
     * Verifica se uma chave existe no cache (e não expirou)
     */
    has(key: string): boolean;

    /**
     * Limpa itens expirados do cache
     */
    cleanup(): number;

    /**
     * Obtém estatísticas do cache
     */
    getStats(): {
        total: number;
        valid: number;
        expired: number;
        storageItems: number;
    };
}

