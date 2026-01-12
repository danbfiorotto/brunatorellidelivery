import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';
import {
    saveOfflineOperation,
    getOfflineOperations,
    removeOfflineOperation,
    incrementRetries,
    isIndexedDBAvailable,
} from '../lib/offlineStorage';

/**
 * Tipo de operação offline
 */
type OfflineOperationType = 'create' | 'update' | 'delete';

/**
 * Interface para operação offline
 */
interface OfflineOperation {
    id: string;
    type: OfflineOperationType;
    entity: string;
    data: unknown;
    timestamp: number;
    retries: number;
}

/**
 * Interface para função de sincronização
 */
type SyncFunction = (operation: OfflineOperation) => Promise<unknown>;

/**
 * Configuração do hook
 */
interface UseOfflineQueueConfig {
    /** Função para sincronizar operação de criação */
    syncCreate?: SyncFunction;
    /** Função para sincronizar operação de atualização */
    syncUpdate?: SyncFunction;
    /** Função para sincronizar operação de deleção */
    syncDelete?: SyncFunction;
    /** Intervalo de tentativas de sincronização (ms) */
    syncInterval?: number;
    /** Número máximo de tentativas */
    maxRetries?: number;
    /** Callback quando operação é sincronizada */
    onSynced?: (operation: OfflineOperation) => void;
    /** Callback quando sincronização falha */
    onSyncError?: (operation: OfflineOperation, error: Error) => void;
}

/**
 * Hook para gerenciar fila offline e sincronização
 * 
 * Features:
 * - Detecta quando dispositivo está offline
 * - Armazena operações em IndexedDB quando offline
 * - Sincroniza automaticamente quando conexão volta
 * - Retry automático com limite de tentativas
 * - Status de conectividade na UI
 */
export function useOfflineQueue(config: UseOfflineQueueConfig = {}) {
    const {
        syncCreate,
        syncUpdate,
        syncDelete,
        syncInterval = 5000, // 5 segundos
        maxRetries = 5,
        onSynced,
        onSyncError,
    } = config;
    
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [pendingOperations, setPendingOperations] = useState<OfflineOperation[]>([]);
    const [isSyncing, setIsSyncing] = useState<boolean>(false);
    const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isSyncingRef = useRef<boolean>(false);
    
    /**
     * Obtém função de sincronização baseada no tipo
     */
    const getSyncFunction = useCallback((type: OfflineOperationType): SyncFunction | undefined => {
        switch (type) {
            case 'create':
                return syncCreate;
            case 'update':
                return syncUpdate;
            case 'delete':
                return syncDelete;
            default:
                return undefined;
        }
    }, [syncCreate, syncUpdate, syncDelete]);
    
    /**
     * Sincroniza uma operação
     */
    const syncOperation = useCallback(async (operation: OfflineOperation): Promise<boolean> => {
        const syncFn = getSyncFunction(operation.type);
        
        if (!syncFn) {
            logger.warn('useOfflineQueue - No sync function for operation type', {
                type: operation.type,
            });
            return false;
        }
        
        try {
            await syncFn(operation);
            
            // Remover da fila após sucesso
            await removeOfflineOperation(operation.id);
            
            logger.debug('useOfflineQueue - Operation synced', {
                id: operation.id,
                type: operation.type,
            });
            
            onSynced?.(operation);
            return true;
        } catch (error) {
            logger.error(error, {
                context: 'useOfflineQueue.syncOperation',
                operationId: operation.id,
            });
            
            // Incrementar retries
            await incrementRetries(operation.id);
            
            const updatedOperation = { ...operation, retries: operation.retries + 1 };
            
            // Se excedeu max retries, remover da fila
            if (updatedOperation.retries >= maxRetries) {
                await removeOfflineOperation(operation.id);
                logger.warn('useOfflineQueue - Operation exceeded max retries, removed', {
                    id: operation.id,
                    retries: updatedOperation.retries,
                });
            }
            
            onSyncError?.(updatedOperation, error as Error);
            return false;
        }
    }, [getSyncFunction, maxRetries, onSynced, onSyncError]);
    
    /**
     * Sincroniza todas as operações pendentes
     */
    const syncAll = useCallback(async () => {
        if (!isOnline || isSyncingRef.current) return;
        
        if (!isIndexedDBAvailable()) {
            logger.warn('useOfflineQueue - IndexedDB not available');
            return;
        }
        
        isSyncingRef.current = true;
        setIsSyncing(true);
        
        try {
            const operations = await getOfflineOperations();
            
            if (operations.length === 0) {
                setPendingOperations([]);
                return;
            }
            
            logger.debug('useOfflineQueue - Syncing operations', {
                count: operations.length,
            });
            
            // Sincronizar uma por vez para evitar sobrecarga
            for (const operation of operations) {
                if (!isOnline) break; // Parar se ficou offline durante sincronização
                
                await syncOperation(operation);
            }
            
            // Atualizar lista de pendentes
            const remaining = await getOfflineOperations();
            setPendingOperations(remaining);
        } catch (error) {
            logger.error(error, { context: 'useOfflineQueue.syncAll' });
        } finally {
            isSyncingRef.current = false;
            setIsSyncing(false);
        }
    }, [isOnline, syncOperation]);
    
    /**
     * Adiciona operação à fila offline
     */
    const queueOperation = useCallback(async (
        type: OfflineOperationType,
        entity: string,
        data: unknown
    ): Promise<string | null> => {
        if (!isIndexedDBAvailable()) {
            logger.warn('useOfflineQueue - IndexedDB not available, operation will be lost');
            return null;
        }
        
        try {
            const id = await saveOfflineOperation({
                type,
                entity,
                data,
            });
            
            // Atualizar lista de pendentes
            const operations = await getOfflineOperations();
            setPendingOperations(operations);
            
            logger.debug('useOfflineQueue - Operation queued', {
                id,
                type,
                entity,
            });
            
            // Se estiver online, tentar sincronizar imediatamente
            if (isOnline) {
                setTimeout(() => syncAll(), 100);
            }
            
            return id;
        } catch (error) {
            logger.error(error, { context: 'useOfflineQueue.queueOperation' });
            return null;
        }
    }, [isOnline, syncAll]);
    
    /**
     * Handler para mudança de conectividade
     */
    const handleOnline = useCallback(() => {
        logger.debug('useOfflineQueue - Device online');
        setIsOnline(true);
        
        // Sincronizar operações pendentes
        setTimeout(() => syncAll(), 500);
    }, [syncAll]);
    
    const handleOffline = useCallback(() => {
        logger.debug('useOfflineQueue - Device offline');
        setIsOnline(false);
    }, []);
    
    // Monitorar conectividade
    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);
    
    // Carregar operações pendentes ao montar
    useEffect(() => {
        if (isIndexedDBAvailable()) {
            getOfflineOperations().then(ops => {
                setPendingOperations(ops);
                
                // Sincronizar se estiver online
                if (isOnline && ops.length > 0) {
                    setTimeout(() => syncAll(), 1000);
                }
            });
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Sincronização periódica quando online
    useEffect(() => {
        if (isOnline && pendingOperations.length > 0) {
            syncIntervalRef.current = setInterval(() => {
                syncAll();
            }, syncInterval);
        } else {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        }
        
        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }
        };
    }, [isOnline, pendingOperations.length, syncInterval, syncAll]);
    
    return {
        /** Status de conectividade */
        isOnline,
        /** Operações pendentes */
        pendingOperations,
        /** Está sincronizando */
        isSyncing,
        /** Número de operações pendentes */
        pendingCount: pendingOperations.length,
        /** Adiciona operação à fila */
        queueOperation,
        /** Força sincronização de todas as operações */
        syncAll,
        /** Limpa todas as operações pendentes */
        clearQueue: async () => {
            const ops = await getOfflineOperations();
            for (const op of ops) {
                await removeOfflineOperation(op.id);
            }
            setPendingOperations([]);
        },
    };
}

export default useOfflineQueue;
