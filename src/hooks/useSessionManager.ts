import { useEffect, useRef, useCallback } from 'react';
import { useDependencies } from './useDependencies';
import { logger } from '../lib/logger';

/**
 * Interface para configuração do hook
 */
interface SessionManagerConfig {
    /** Callback quando a sessão é refreshed */
    onSessionRefresh?: () => void;
    /** Callback quando a sessão expira */
    onSessionExpired?: () => void;
    /** Callback para resetar estados travados */
    onVisibilityChange?: (isVisible: boolean) => void;
    /** Intervalo de verificação de sessão (ms) */
    checkInterval?: number;
    /** Habilitar verificação em pageshow */
    enablePageShow?: boolean;
}

/**
 * Interface para o AuthClient
 */
interface IAuthClient {
    getSession: () => Promise<{ user?: { id: string } } | null>;
    refreshSession?: () => Promise<unknown>;
}

/**
 * Hook para gerenciar sessão e visibilidade da página
 * 
 * Funcionalidades:
 * - Verifica sessão ao voltar para a página (visibilitychange)
 * - Verifica sessão em pageshow (iOS PWA)
 * - Refresh automático de token quando necessário
 * - Reset de estados travados ao voltar ao app
 */
export function useSessionManager(config: SessionManagerConfig = {}) {
    const {
        onSessionRefresh,
        onSessionExpired,
        onVisibilityChange,
        checkInterval = 30000, // 30 segundos
        enablePageShow = true,
    } = config;
    
    const container = useDependencies();
    const lastCheckRef = useRef<number>(Date.now());
    const isCheckingRef = useRef<boolean>(false);
    
    /**
     * Verifica e atualiza a sessão se necessário
     */
    const checkAndRefreshSession = useCallback(async () => {
        // Evitar verificações simultâneas
        if (isCheckingRef.current) return;
        
        isCheckingRef.current = true;
        
        try {
            const authClient = container.resolve('authClient') as IAuthClient | undefined;
            
            if (!authClient) {
                logger.warn('useSessionManager - authClient not found');
                return;
            }
            
            const session = await authClient.getSession();
            
            if (!session?.user) {
                logger.debug('useSessionManager - Session expired');
                onSessionExpired?.();
                return;
            }
            
            // Tentar refresh se disponível e passou tempo suficiente
            const timeSinceLastCheck = Date.now() - lastCheckRef.current;
            
            if (timeSinceLastCheck > checkInterval && authClient.refreshSession) {
                try {
                    await authClient.refreshSession();
                    logger.debug('useSessionManager - Session refreshed');
                    onSessionRefresh?.();
                } catch (error) {
                    logger.error(error, { context: 'useSessionManager.refreshSession' });
                }
            }
            
            lastCheckRef.current = Date.now();
        } catch (error) {
            logger.error(error, { context: 'useSessionManager.checkAndRefreshSession' });
        } finally {
            isCheckingRef.current = false;
        }
    }, [container, checkInterval, onSessionRefresh, onSessionExpired]);
    
    /**
     * Handler para mudança de visibilidade
     */
    const handleVisibilityChange = useCallback(() => {
        const isVisible = document.visibilityState === 'visible';
        
        logger.debug('useSessionManager - Visibility changed', { isVisible });
        
        // Notificar callback
        onVisibilityChange?.(isVisible);
        
        // Verificar sessão ao voltar à página
        if (isVisible) {
            checkAndRefreshSession();
        }
    }, [checkAndRefreshSession, onVisibilityChange]);
    
    /**
     * Handler para pageshow (iOS PWA)
     */
    const handlePageShow = useCallback((event: PageTransitionEvent) => {
        // persisted = página restaurada do bfcache
        if (event.persisted) {
            logger.debug('useSessionManager - Page restored from bfcache');
            checkAndRefreshSession();
            onVisibilityChange?.(true);
        }
    }, [checkAndRefreshSession, onVisibilityChange]);
    
    /**
     * Handler para focus da janela
     */
    const handleFocus = useCallback(() => {
        logger.debug('useSessionManager - Window focused');
        
        // Verificar sessão ao focar
        const timeSinceLastCheck = Date.now() - lastCheckRef.current;
        
        // Só verificar se passou mais de 5 segundos
        if (timeSinceLastCheck > 5000) {
            checkAndRefreshSession();
        }
    }, [checkAndRefreshSession]);
    
    /**
     * Handler para online/offline
     */
    const handleOnline = useCallback(() => {
        logger.debug('useSessionManager - Device online');
        checkAndRefreshSession();
    }, [checkAndRefreshSession]);
    
    // Setup de event listeners
    useEffect(() => {
        // Visibility change
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Page show (iOS PWA)
        if (enablePageShow) {
            window.addEventListener('pageshow', handlePageShow);
        }
        
        // Window focus
        window.addEventListener('focus', handleFocus);
        
        // Online/Offline
        window.addEventListener('online', handleOnline);
        
        // Verificação inicial
        checkAndRefreshSession();
        
        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (enablePageShow) {
                window.removeEventListener('pageshow', handlePageShow);
            }
            
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleOnline);
        };
    }, [
        handleVisibilityChange, 
        handlePageShow, 
        handleFocus, 
        handleOnline,
        enablePageShow,
        checkAndRefreshSession
    ]);
    
    return {
        /** Força verificação de sessão */
        checkSession: checkAndRefreshSession,
        /** Último timestamp de verificação */
        lastCheck: lastCheckRef.current,
    };
}

/**
 * Hook simplificado para resetar estados travados em mudança de visibilidade
 * Útil para componentes com estados de loading que podem travar
 */
export function useVisibilityReset(resetCallbacks: (() => void)[]) {
    useSessionManager({
        onVisibilityChange: (isVisible) => {
            if (isVisible) {
                // Resetar todos os estados ao voltar para a página
                resetCallbacks.forEach(callback => callback());
            }
        },
    });
}

export default useSessionManager;
