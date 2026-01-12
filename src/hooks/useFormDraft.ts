import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';

/**
 * Configuração do hook
 */
interface UseFormDraftConfig<T> {
    /** Chave única para armazenar o rascunho */
    key: string;
    /** Dados iniciais do formulário */
    initialData: T;
    /** Delay para debounce ao salvar (ms) */
    debounceMs?: number;
    /** Callback quando rascunho é restaurado */
    onRestore?: (data: T) => void;
    /** Callback quando rascunho é salvo */
    onSave?: (data: T) => void;
    /** Callback quando rascunho é limpo */
    onClear?: () => void;
    /** Habilitar persistência automática */
    enabled?: boolean;
}

/**
 * Hook para persistir rascunhos de formulário em localStorage
 * 
 * Features:
 * - Salva automaticamente a cada mudança (debounced)
 * - Restaura dados ao montar componente
 * - Suporta múltiplos rascunhos (por chave)
 * - Limpa após salvamento bem-sucedido
 * - Funciona com BFCache do Safari iOS
 */
export function useFormDraft<T extends Record<string, unknown>>(
    config: UseFormDraftConfig<T>
) {
    const {
        key,
        initialData,
        debounceMs = 500,
        onRestore,
        onSave,
        onClear,
        enabled = true,
    } = config;
    
    const storageKey = `form_draft_${key}`;
    const [data, setData] = useState<T>(initialData);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isRestoringRef = useRef<boolean>(false);
    
    /**
     * Salva rascunho no localStorage
     */
    const saveDraft = useCallback((draftData: T) => {
        if (!enabled) return;
        
        try {
            const serialized = JSON.stringify(draftData);
            localStorage.setItem(storageKey, serialized);
            
            logger.debug('useFormDraft - Draft saved', { key, size: serialized.length });
            onSave?.(draftData);
        } catch (error) {
            // Pode falhar se localStorage estiver cheio
            logger.error(error, { context: 'useFormDraft.saveDraft', key });
        }
    }, [enabled, storageKey, key, onSave]);
    
    /**
     * Carrega rascunho do localStorage
     */
    const loadDraft = useCallback((): T | null => {
        if (!enabled) return null;
        
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) return null;
            
            const parsed = JSON.parse(stored) as T;
            logger.debug('useFormDraft - Draft loaded', { key });
            return parsed;
        } catch (error) {
            logger.error(error, { context: 'useFormDraft.loadDraft', key });
            // Limpar dados corrompidos
            localStorage.removeItem(storageKey);
            return null;
        }
    }, [enabled, storageKey, key]);
    
    /**
     * Limpa rascunho do localStorage
     */
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            logger.debug('useFormDraft - Draft cleared', { key });
            onClear?.();
        } catch (error) {
            logger.error(error, { context: 'useFormDraft.clearDraft', key });
        }
    }, [storageKey, key, onClear]);
    
    /**
     * Atualiza dados com debounce
     */
    const updateData = useCallback((newData: T | ((prev: T) => T)) => {
        setData(prev => {
            const updated = typeof newData === 'function' 
                ? (newData as (prev: T) => T)(prev)
                : newData;
            
            // Debounce para evitar muitas escritas no localStorage
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
            
            debounceTimerRef.current = setTimeout(() => {
                saveDraft(updated);
            }, debounceMs);
            
            return updated;
        });
    }, [saveDraft, debounceMs]);
    
    /**
     * Restaura dados do rascunho
     */
    const restoreDraft = useCallback(() => {
        if (isRestoringRef.current) return;
        
        isRestoringRef.current = true;
        
        const draft = loadDraft();
        if (draft) {
            setData(draft);
            onRestore?.(draft);
            logger.debug('useFormDraft - Draft restored', { key });
        }
        
        isRestoringRef.current = false;
    }, [loadDraft, onRestore, key]);
    
    /**
     * Força salvamento imediato (sem debounce)
     */
    const forceSave = useCallback(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }
        saveDraft(data);
    }, [data, saveDraft]);
    
    // Carregar rascunho ao montar
    useEffect(() => {
        if (enabled) {
            restoreDraft();
        }
    }, [enabled, restoreDraft]);
    
    // Salvar rascunho antes de página ser descarregada
    useEffect(() => {
        if (!enabled) return;
        
        const handleBeforeUnload = () => {
            forceSave();
        };
        
        const handlePageHide = () => {
            forceSave();
        };
        
        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('pagehide', handlePageHide);
        
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('pagehide', handlePageHide);
            
            // Salvar ao desmontar também
            forceSave();
        };
    }, [enabled, forceSave]);
    
    // Limpar timer ao desmontar
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);
    
    return {
        /** Dados atuais do formulário */
        data,
        /** Função para atualizar dados (com debounce) */
        setData: updateData,
        /** Restaura rascunho salvo */
        restoreDraft,
        /** Limpa rascunho */
        clearDraft,
        /** Força salvamento imediato */
        forceSave,
        /** Verifica se há rascunho salvo */
        hasDraft: () => {
            if (!enabled) return false;
            try {
                return localStorage.getItem(storageKey) !== null;
            } catch {
                return false;
            }
        },
    };
}

export default useFormDraft;
