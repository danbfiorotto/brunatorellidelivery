import { useState, useCallback, useRef } from 'react';
import { useDependencies } from './useDependencies';
import { logger } from '../lib/logger';
import { withTimeout, TimeoutError, AbortedError } from '../lib/fetchWithTimeout';

/**
 * Status de upload de arquivo
 */
type UploadStatus = 'idle' | 'uploading' | 'success' | 'error' | 'cancelled';

/**
 * Interface para item de upload
 */
interface UploadItem {
    /** ID único do upload */
    id: string;
    /** Arquivo sendo enviado */
    file: File;
    /** URL local para preview (blob URL) */
    previewUrl: string;
    /** URL final após upload (do servidor) */
    serverUrl?: string;
    /** Status do upload */
    status: UploadStatus;
    /** Progresso (0-100) */
    progress: number;
    /** Erro se houver */
    error?: Error;
    /** AbortController para cancelamento */
    abortController: AbortController;
}

/**
 * Configuração do hook
 */
interface UseOptimisticUploadConfig {
    /** Bucket de storage */
    bucket?: string;
    /** Pasta no bucket */
    folder?: string;
    /** Timeout para upload (ms) */
    timeout?: number;
    /** Callback de sucesso */
    onSuccess?: (item: UploadItem) => void;
    /** Callback de erro */
    onError?: (item: UploadItem, error: Error) => void;
    /** Callback de cancelamento */
    onCancel?: (item: UploadItem) => void;
}

/**
 * Hook para upload otimista de arquivos
 * 
 * Features:
 * - Upload inicia imediatamente após seleção
 * - Mostra preview local enquanto faz upload
 * - Suporta cancelamento via AbortController
 * - Suporta múltiplos uploads simultâneos
 * - Cleanup automático de blob URLs
 */
export function useOptimisticUpload(config: UseOptimisticUploadConfig = {}) {
    const {
        bucket = 'radiographs',
        folder = '',
        timeout = 60000, // 60 segundos para uploads
        onSuccess,
        onError,
        onCancel,
    } = config;
    
    const container = useDependencies();
    const [uploads, setUploads] = useState<Map<string, UploadItem>>(new Map());
    const pendingUploadsRef = useRef<Map<string, UploadItem>>(new Map());
    
    /**
     * Gera ID único para upload
     */
    const generateId = useCallback(() => {
        return `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }, []);
    
    /**
     * Cria preview local para arquivo
     */
    const createPreview = useCallback((file: File): string => {
        return URL.createObjectURL(file);
    }, []);
    
    /**
     * Limpa blob URL para evitar memory leak
     */
    const revokePreview = useCallback((url: string) => {
        try {
            URL.revokeObjectURL(url);
        } catch {
            // Ignorar erros de revoke
        }
    }, []);
    
    /**
     * Inicia upload de arquivo
     */
    const upload = useCallback(async (file: File): Promise<UploadItem> => {
        const id = generateId();
        const previewUrl = createPreview(file);
        const abortController = new AbortController();
        
        // Criar item de upload
        const uploadItem: UploadItem = {
            id,
            file,
            previewUrl,
            status: 'uploading',
            progress: 0,
            abortController,
        };
        
        // Atualizar estado imediatamente (optimistic)
        setUploads(prev => new Map(prev).set(id, uploadItem));
        pendingUploadsRef.current.set(id, uploadItem);
        
        logger.debug('useOptimisticUpload - Starting upload', { 
            id, 
            fileName: file.name, 
            fileSize: file.size 
        });
        
        try {
            const radiographService = container.resolve('radiographService') as {
                uploadImage: (file: File, folder?: string) => Promise<string>;
            };
            
            // Upload com timeout
            const serverUrl = await withTimeout(
                async () => {
                    // Simular progresso (já que Supabase não dá progresso real)
                    const progressInterval = setInterval(() => {
                        setUploads(prev => {
                            const item = prev.get(id);
                            if (item && item.status === 'uploading' && item.progress < 90) {
                                const updated = { ...item, progress: item.progress + 10 };
                                return new Map(prev).set(id, updated);
                            }
                            return prev;
                        });
                    }, 500);
                    
                    try {
                        const url = await radiographService.uploadImage(file, folder);
                        return url;
                    } finally {
                        clearInterval(progressInterval);
                    }
                },
                { timeout, abortController }
            );
            
            // Atualizar com sucesso
            const successItem: UploadItem = {
                ...uploadItem,
                serverUrl,
                status: 'success',
                progress: 100,
            };
            
            setUploads(prev => new Map(prev).set(id, successItem));
            pendingUploadsRef.current.delete(id);
            
            logger.debug('useOptimisticUpload - Upload success', { id, serverUrl });
            onSuccess?.(successItem);
            
            return successItem;
        } catch (error) {
            let status: UploadStatus = 'error';
            
            if (error instanceof AbortedError) {
                status = 'cancelled';
                onCancel?.(uploadItem);
            } else if (error instanceof TimeoutError) {
                onError?.(uploadItem, error);
            } else {
                onError?.(uploadItem, error as Error);
            }
            
            const errorItem: UploadItem = {
                ...uploadItem,
                status,
                error: error as Error,
            };
            
            setUploads(prev => new Map(prev).set(id, errorItem));
            pendingUploadsRef.current.delete(id);
            
            logger.error(error, { 
                context: 'useOptimisticUpload.upload', 
                id, 
                fileName: file.name 
            });
            
            return errorItem;
        }
    }, [container, bucket, folder, timeout, generateId, createPreview, onSuccess, onError, onCancel]);
    
    /**
     * Cancela upload específico
     */
    const cancel = useCallback((id: string) => {
        const item = uploads.get(id) || pendingUploadsRef.current.get(id);
        
        if (item && item.status === 'uploading') {
            item.abortController.abort();
            
            const cancelledItem: UploadItem = {
                ...item,
                status: 'cancelled',
            };
            
            setUploads(prev => new Map(prev).set(id, cancelledItem));
            pendingUploadsRef.current.delete(id);
            
            logger.debug('useOptimisticUpload - Upload cancelled', { id });
            onCancel?.(cancelledItem);
        }
    }, [uploads, onCancel]);
    
    /**
     * Cancela todos os uploads em andamento
     */
    const cancelAll = useCallback(() => {
        pendingUploadsRef.current.forEach((item) => {
            if (item.status === 'uploading') {
                cancel(item.id);
            }
        });
    }, [cancel]);
    
    /**
     * Remove upload da lista (e limpa preview)
     */
    const remove = useCallback((id: string) => {
        const item = uploads.get(id);
        
        if (item) {
            // Cancelar se ainda estiver em andamento
            if (item.status === 'uploading') {
                item.abortController.abort();
            }
            
            // Limpar blob URL
            revokePreview(item.previewUrl);
            
            // Remover do estado
            setUploads(prev => {
                const newMap = new Map(prev);
                newMap.delete(id);
                return newMap;
            });
            pendingUploadsRef.current.delete(id);
            
            logger.debug('useOptimisticUpload - Upload removed', { id });
        }
    }, [uploads, revokePreview]);
    
    /**
     * Limpa todos os uploads
     */
    const clear = useCallback(() => {
        // Cancelar uploads em andamento
        cancelAll();
        
        // Limpar todos os previews
        uploads.forEach(item => revokePreview(item.previewUrl));
        
        // Limpar estado
        setUploads(new Map());
        pendingUploadsRef.current.clear();
    }, [cancelAll, uploads, revokePreview]);
    
    /**
     * Retenta upload com erro
     */
    const retry = useCallback(async (id: string): Promise<UploadItem | null> => {
        const item = uploads.get(id);
        
        if (item && (item.status === 'error' || item.status === 'cancelled')) {
            // Remover item antigo
            remove(id);
            
            // Fazer novo upload
            return upload(item.file);
        }
        
        return null;
    }, [uploads, remove, upload]);
    
    /**
     * Obtém URLs finais de uploads bem-sucedidos
     */
    const getServerUrls = useCallback((): string[] => {
        return Array.from(uploads.values())
            .filter(item => item.status === 'success' && item.serverUrl)
            .map(item => item.serverUrl!);
    }, [uploads]);
    
    /**
     * Verifica se há uploads em andamento
     */
    const isUploading = Array.from(uploads.values()).some(
        item => item.status === 'uploading'
    );
    
    /**
     * Verifica se todos os uploads foram concluídos
     */
    const allComplete = uploads.size > 0 && Array.from(uploads.values()).every(
        item => item.status === 'success' || item.status === 'error' || item.status === 'cancelled'
    );
    
    return {
        /** Lista de uploads */
        uploads: Array.from(uploads.values()),
        /** Inicia upload de arquivo */
        upload,
        /** Cancela upload específico */
        cancel,
        /** Cancela todos os uploads */
        cancelAll,
        /** Remove upload da lista */
        remove,
        /** Limpa todos os uploads */
        clear,
        /** Retenta upload com erro */
        retry,
        /** Obtém URLs dos uploads bem-sucedidos */
        getServerUrls,
        /** Verifica se há uploads em andamento */
        isUploading,
        /** Verifica se todos os uploads foram concluídos */
        allComplete,
    };
}

export default useOptimisticUpload;
