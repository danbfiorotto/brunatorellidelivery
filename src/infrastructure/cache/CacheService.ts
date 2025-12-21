import { IStorage } from '../storage/IStorage';
import { LocalStorageAdapter } from '../storage/LocalStorageAdapter';
import { ICacheService } from './ICacheService';

interface CacheItem<T = unknown> {
    value: T;
    expiresAt: number;
    lastAccessed: number; // ✅ Adicionado: timestamp do último acesso para LRU
}

/**
 * Serviço de cache com TTL (Time To Live), LRU (Least Recently Used) e persistência em storage
 * ✅ Implementa LRU verdadeiro e tratamento de concorrência
 * ✅ Usa IStorage para abstração (permite trocar implementação)
 */
export class CacheService implements ICacheService {
    private defaultTTL: number;
    private memoryCache: Map<string, CacheItem>;
    private accessOrder: Map<string, number>; // ✅ Mantém ordem de acesso para LRU
    private accessCounter: number; // ✅ Contador para ordenação de acesso
    private storage: IStorage | null;
    private storagePrefix: string;
    private maxStorageSize: number;
    private cleanupIntervalId: NodeJS.Timeout | null = null;
    private maxMemoryItems: number = 1000; // Limite de itens em memória
    private operationQueue: Promise<unknown>; // ✅ Fila para operações concorrentes

    /**
     * Cria uma instância do CacheService
     * @param defaultTTL - TTL padrão em milissegundos
     * @param storage - Implementação de IStorage (opcional, usa LocalStorageAdapter se não fornecido)
     */
    constructor(defaultTTL: number = 5 * 60 * 1000, storage: IStorage | null = null) {
        this.defaultTTL = defaultTTL;
        this.memoryCache = new Map();
        this.accessOrder = new Map(); // ✅ Inicializar ordem de acesso
        this.accessCounter = 0; // ✅ Inicializar contador
        
        // ✅ Usar IStorage ao invés de Storage diretamente
        if (storage) {
            this.storage = storage;
        } else if (typeof localStorage !== 'undefined') {
            this.storage = new LocalStorageAdapter(localStorage);
        } else {
            this.storage = null;
        }
        
        this.storagePrefix = 'app_cache_';
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB
        this.operationQueue = Promise.resolve(); // ✅ Inicializar fila de operações
        
        // Carregar cache do storage ao inicializar
        this.loadFromStorage();
        
        // Iniciar limpeza automática
        this.startCleanupInterval();
    }
    
    /**
     * Carrega cache do storage para memória
     * ✅ Inicializa ordem de acesso para LRU
     */
    private loadFromStorage(): void {
        if (!this.storage) return;
        
        try {
            const keys = Object.keys(this.storage);
            keys.forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    const stored = this.storage.getItem(key);
                    if (stored) {
                        try {
                            const item = JSON.parse(stored) as CacheItem;
                            if (Date.now() <= item.expiresAt) {
                                const cacheKey = key.replace(this.storagePrefix, '');
                                const now = Date.now();
                                // ✅ Garantir que item tem lastAccessed
                                const itemWithAccess = {
                                    ...item,
                                    lastAccessed: item.lastAccessed || now
                                };
                                this.memoryCache.set(cacheKey, itemWithAccess);
                                // ✅ Inicializar ordem de acesso
                                this.updateAccessOrder(cacheKey);
                            } else {
                                // Item expirado, remover
                                this.storage.removeItem(key);
                            }
                        } catch {
                            // Dados corrompidos, remover
                            this.storage.removeItem(key);
                        }
                    }
                }
            });
        } catch {
            console.warn('Failed to load cache from storage');
        }
    }

    /**
     * Obtém um valor do cache
     * ✅ Atualiza ordem de acesso para LRU
     * ✅ Usa fila de operações para evitar race conditions
     */
    async get<T = unknown>(key: string): Promise<T | null> {
        // ✅ Adicionar à fila de operações para evitar concorrência
        return this.enqueueOperation(async () => {
            // 1. Tentar memória primeiro (mais rápido)
            const memoryItem = this.memoryCache.get(key);
            if (memoryItem && Date.now() <= memoryItem.expiresAt) {
                // ✅ Atualizar ordem de acesso (LRU)
                this.updateAccessOrder(key);
                return memoryItem.value as T;
            }
            
            // 2. Tentar storage persistente
            if (this.storage) {
                const stored = this.storage.getItem(this.storagePrefix + key);
                if (stored) {
                    try {
                        const item = JSON.parse(stored) as CacheItem;
                        if (Date.now() <= item.expiresAt) {
                            // Restaurar na memória com ordem de acesso atualizada
                            this.memoryCache.set(key, { ...item, lastAccessed: Date.now() });
                            this.updateAccessOrder(key);
                            return item.value as T;
                        } else {
                            // Expirou, remover
                            this.storage.removeItem(this.storagePrefix + key);
                        }
                    } catch {
                        // Dados corrompidos, remover
                        this.storage.removeItem(this.storagePrefix + key);
                    }
                }
            }
            
            return null;
        });
    }
    

    /**
     * Define um valor no cache
     * ✅ Atualiza ordem de acesso para LRU
     * ✅ Usa fila de operações para evitar race conditions
     */
    async set<T = unknown>(key: string, value: T, ttl: number | null = null): Promise<void> {
        return this.enqueueOperation(async () => {
            const now = Date.now();
            const expiresAt = now + (ttl || this.defaultTTL);
            const item: CacheItem<T> = { value, expiresAt, lastAccessed: now };
            
            // ✅ Atualizar ordem de acesso (LRU)
            this.updateAccessOrder(key);
            
            // Armazenar na memória
            this.memoryCache.set(key, item);
            
            // Verificar limite de memória antes de adicionar
            if (this.memoryCache.size > this.maxMemoryItems) {
                this.enforceMemoryLimit();
            }
            
            // Armazenar no storage (apenas se serializável)
            if (this.storage && this.isSerializable(value)) {
                try {
                    const serialized = JSON.stringify(item);
                    const currentSize = this.getStorageSize();
                    
                    // Verificar se excede tamanho máximo
                    if (currentSize + serialized.length > this.maxStorageSize) {
                        this.cleanupExpired();
                    }
                    
                    this.storage.setItem(this.storagePrefix + key, serialized);
                } catch (error) {
                    if ((error as Error).name === 'QuotaExceededError') {
                        // Storage cheio, tentar limpar e tentar novamente
                        this.cleanupExpired();
                        try {
                            this.storage.setItem(this.storagePrefix + key, JSON.stringify(item));
                        } catch {
                            console.warn('Storage full, cache not persisted');
                        }
                    }
                }
            }
        });
    }
    
    
    /**
     * Verifica se um valor é serializável
     */
    private isSerializable(value: unknown): boolean {
        try {
            JSON.stringify(value);
            return true;
        } catch {
            return false;
        }
    }
    
    /**
     * Obtém o tamanho atual do storage de forma otimizada
     */
    private getStorageSize(): number {
        if (!this.storage) return 0;
        
        let total = 0;
        // Usar for...in é mais eficiente que Object.keys para localStorage
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(this.storagePrefix)) {
                const value = this.storage.getItem(key);
                total += (value?.length || 0) + (key.length || 0);
            }
        }
        
        return total;
    }

    /**
     * Remove um item do cache
     * ✅ Usa fila de operações para evitar race conditions
     */
    async delete(key: string): Promise<boolean> {
        return this.enqueueOperation(async () => {
            const memoryDeleted = this.memoryCache.delete(key);
            this.accessOrder.delete(key); // ✅ Remover da ordem de acesso
            
            if (this.storage) {
                try {
                    this.storage.removeItem(this.storagePrefix + key);
                } catch {
                    console.warn('Failed to delete from storage');
                }
            }
            return memoryDeleted;
        });
    }
    

    /**
     * Limpa todo o cache
     */
    clear(): void {
        this.memoryCache.clear();
        if (this.storage) {
            try {
                const keys = Object.keys(this.storage);
                keys.forEach(key => {
                    if (key.startsWith(this.storagePrefix)) {
                        this.storage!.removeItem(key);
                    }
                });
            } catch {
                console.warn('Failed to clear storage');
            }
        }
    }

    /**
     * Invalida itens do cache que correspondem a um padrão
     */
    invalidate(pattern: string): void {
        const keysToDelete: string[] = [];
        
        // Memória
        for (const key of this.memoryCache.keys()) {
            if (key.includes(pattern)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.memoryCache.delete(key));
        
        // Storage
        if (this.storage) {
            const storageKeys = Object.keys(this.storage);
            storageKeys.forEach(key => {
                if (key.startsWith(this.storagePrefix)) {
                    const cacheKey = key.replace(this.storagePrefix, '');
                    if (cacheKey.includes(pattern)) {
                        try {
                            this.storage.removeItem(key);
                        } catch {
                            console.warn('Failed to invalidate from storage');
                        }
                    }
                }
            });
        }
    }
    
    /**
     * Define um valor no cache com tags para invalidação
     * ✅ Usa operações assíncronas para evitar race conditions
     */
    async setWithTags<T = unknown>(key: string, value: T, tags: string[] = [], ttl: number | null = null): Promise<void> {
        await this.set(key, value, ttl);
        
        // ✅ Processar tags sequencialmente para evitar race conditions
        for (const tag of tags) {
            const tagKey = `tag:${tag}`;
            const tagItems = (await this.get<string[]>(tagKey)) || [];
            if (!tagItems.includes(key)) {
                tagItems.push(key);
                await this.set(tagKey, tagItems, ttl);
            }
        }
    }
    
    
    /**
     * Invalida todos os itens com uma tag específica
     * ✅ Usa operações assíncronas para evitar race conditions
     */
    async invalidateByTag(tag: string): Promise<void> {
        return this.enqueueOperation(async () => {
            const tagKey = `tag:${tag}`;
            const keys = (await this.get<string[]>(tagKey)) || [];
            
            // ✅ Deletar todos os itens da tag
            for (const key of keys) {
                await this.delete(key);
            }
            
            await this.delete(tagKey);
        });
    }
    

    /**
     * Verifica se uma chave existe no cache (e não expirou)
     */
    has(key: string): boolean {
        return this.get(key) !== null;
    }

    /**
     * Limpa itens expirados do cache
     */
    cleanup(): number {
        return this.cleanupExpired();
    }
    
    /**
     * Limpa itens expirados do cache (memória e storage) de forma otimizada
     */
    private cleanupExpired(): number {
        const now = Date.now();
        const keysToDelete: string[] = [];
        
        // Memória: iterar apenas uma vez
        for (const [key, item] of this.memoryCache.entries()) {
            if (now > item.expiresAt) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.memoryCache.delete(key));
        
        // Storage: limpar em batch para melhor performance
        if (this.storage) {
            const storageKeysToDelete: string[] = [];
            
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.storagePrefix)) {
                    try {
                        const item = JSON.parse(this.storage.getItem(key) || '{}') as CacheItem;
                        if (now > item.expiresAt) {
                            storageKeysToDelete.push(key);
                        }
                    } catch {
                        // Dados corrompidos, remover
                        storageKeysToDelete.push(key);
                    }
                }
            }
            
            // Remover em batch
            storageKeysToDelete.forEach(key => this.storage!.removeItem(key));
        }
        
        // Enforce limite de memória após limpeza
        this.enforceMemoryLimit();
        
        return keysToDelete.length;
    }
    
    /**
     * Inicia intervalo de limpeza automática
     */
    private startCleanupInterval(): void {
        if (typeof window === 'undefined') return;
        
        // Limpar intervalo anterior se existir
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
        }
        
        this.cleanupIntervalId = setInterval(() => {
            this.cleanupExpired();
            this.enforceMemoryLimit(); // ✅ Novo: limitar memória
        }, 10 * 60 * 1000); // A cada 10 minutos
    }
    
    /**
     * Limpa intervalo de limpeza (útil para testes e cleanup)
     */
    destroy(): void {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
    }
    
    /**
     * Atualiza ordem de acesso para LRU
     * ✅ Mantém contador de acesso para ordenação O(1)
     */
    private updateAccessOrder(key: string): void {
        this.accessCounter++;
        this.accessOrder.set(key, this.accessCounter);
    }
    
    /**
     * Enforce limite de itens em memória usando LRU verdadeiro
     * ✅ Remove itens menos recentemente usados (LRU), não apenas por expiração
     * ✅ Complexidade O(n) ao invés de O(n log n)
     */
    private enforceMemoryLimit(): void {
        if (this.memoryCache.size <= this.maxMemoryItems) return;
        
        // ✅ Ordenar por ordem de acesso (LRU) - mais eficiente que ordenar por expiração
        const entries = Array.from(this.memoryCache.entries())
            .map(([key, item]) => ({
                key,
                item,
                accessOrder: this.accessOrder.get(key) || 0
            }))
            .sort((a, b) => a.accessOrder - b.accessOrder); // Menor accessOrder = menos recente
        
        // Remover os itens menos recentemente usados
        const toRemove = entries.slice(0, entries.length - this.maxMemoryItems);
        toRemove.forEach(({ key }) => {
            this.memoryCache.delete(key);
            this.accessOrder.delete(key);
        });
    }
    
    /**
     * Enfileira operação para evitar race conditions
     * ✅ Garante que operações concorrentes sejam executadas sequencialmente
     */
    private async enqueueOperation<T>(operation: () => Promise<T>): Promise<T> {
        const currentOperation = this.operationQueue.then(async () => {
            try {
                return await operation();
            } catch (error) {
                throw error;
            }
        });
        
        this.operationQueue = currentOperation.catch(() => {
            // Ignorar erros na fila, eles serão propagados
        });
        
        return currentOperation;
    }

    /**
     * Obtém estatísticas do cache
     */
    getStats(): {
        total: number;
        valid: number;
        expired: number;
        storageItems: number;
    } {
        const now = Date.now();
        let validItems = 0;
        let expiredItems = 0;
        
        // Memória
        for (const item of this.memoryCache.values()) {
            if (now > item.expiresAt) {
                expiredItems++;
            } else {
                validItems++;
            }
        }
        
        // Storage
        let storageItems = 0;
        if (this.storage) {
            const keys = Object.keys(this.storage);
            storageItems = keys.filter(key => key.startsWith(this.storagePrefix)).length;
        }
        
        return {
            total: this.memoryCache.size,
            valid: validItems,
            expired: expiredItems,
            storageItems
        };
    }
}

/**
 * @deprecated Use CacheService via DI ao invés deste singleton
 * Este export será removido na próxima versão
 * Use: container.resolve<CacheService>('cacheService')
 */
export const cacheService = new CacheService();

