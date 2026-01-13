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
    /** Callback para resetar estados travados (ex: isSubmitting) */
    onResetStates?: () => void;
    /** Callback para reobter instâncias de serviços após refresh */
    onReinitializeServices?: () => void;
    /** Callback para resetar estados travados */
    onVisibilityChange?: (isVisible: boolean) => void;
    /** Callback antes de página ser ocultada (pagehide) - para salvar estado e abortar requisições */
    onPageHide?: () => void;
    /** Callback quando página é restaurada do BFCache (pageshow com persisted=true) */
    onPageRestored?: () => void;
    /** Intervalo de verificação de sessão (ms) */
    checkInterval?: number;
    /** Habilitar verificação em pageshow */
    enablePageShow?: boolean;
    /** Habilitar handler de pagehide */
    enablePageHide?: boolean;
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
        onResetStates,
        onReinitializeServices,
        onVisibilityChange,
        onPageHide,
        onPageRestored,
        checkInterval = 30000, // 30 segundos
        enablePageShow = true,
        enablePageHide = true,
    } = config;
    
    const container = useDependencies();
    const lastCheckRef = useRef<number>(Date.now());
    const sessionCheckPromiseRef = useRef<Promise<void> | null>(null);
    const initialCheckPromiseRef = useRef<Promise<void> | null>(null);
    const SAFETY_TIMEOUT_MS = 30000; // 30 segundos
    
    /**
     * Verifica e atualiza a sessão se necessário
     * Usa Promise compartilhada para evitar verificações concorrentes
     */
    const checkAndRefreshSession = useCallback(async (): Promise<void> => {
        // Se já existe uma verificação em andamento, aguardar ela
        if (sessionCheckPromiseRef.current) {
            logger.debug('useSessionManager - Session check already in progress, awaiting existing check', {
                timestamp: Date.now()
            });
            try {
                await sessionCheckPromiseRef.current;
            } catch (error) {
                // Ignorar erros da verificação anterior - cada chamador trata seus próprios erros
                logger.debug('useSessionManager - Previous check had error (ignored)', {
                    timestamp: Date.now()
                });
            }
            return;
        }
        
        const checkTimestamp = Date.now();
        
        // Criar nova Promise de verificação com timeout de segurança
        const checkPromise = (async (): Promise<void> => {
            let timeoutId: ReturnType<typeof setTimeout> | null = null;
            
            try {
                // Timeout de segurança para evitar Promises travadas
                const timeoutPromise = new Promise<never>((_, reject) => {
                    timeoutId = setTimeout(() => {
                        logger.warn('useSessionManager - Session check timeout (30s), aborting', {
                            timestamp: Date.now()
                        });
                        reject(new Error('Session check timeout'));
                    }, SAFETY_TIMEOUT_MS);
                });
                
                // Race entre verificação e timeout
                await Promise.race([
                    (async () => {
                        logger.info('useSessionManager - Checking session', { timestamp: checkTimestamp });
                        const authClient = container.resolve('authClient') as IAuthClient | undefined;
                        
                        if (!authClient) {
                            logger.warn('useSessionManager - authClient not found', { timestamp: checkTimestamp });
                            return;
                        }
                        
                        const session = await authClient.getSession();
                        
                        if (!session?.user) {
                            logger.warn('useSessionManager - Session expired', {
                                timestamp: checkTimestamp,
                                hasSession: !!session
                            });
                            onSessionExpired?.();
                            return;
                        }
                        
                        // Tentar refresh se disponível e passou tempo suficiente
                        const timeSinceLastCheck = Date.now() - lastCheckRef.current;
                        
                        if (timeSinceLastCheck > checkInterval && authClient.refreshSession) {
                            try {
                                logger.info('useSessionManager - Refreshing session', {
                                    timestamp: Date.now(),
                                    timeSinceLastCheck
                                });
                                await authClient.refreshSession();
                                logger.info('useSessionManager - Session refreshed successfully', {
                                    timestamp: Date.now(),
                                    userId: session.user.id
                                });
                                
                                // Reobter serviços após refresh (podem ter tokens expirados)
                                onReinitializeServices?.();
                                
                                // Notificar callback de refresh
                                onSessionRefresh?.();
                            } catch (error) {
                                logger.error('useSessionManager - Session refresh failed', {
                                    error,
                                    timestamp: Date.now(),
                                    context: 'useSessionManager.refreshSession'
                                });
                            }
                        } else {
                            logger.debug('useSessionManager - Session valid, no refresh needed', {
                                timestamp: Date.now(),
                                timeSinceLastCheck,
                                checkInterval
                            });
                        }
                        
                        lastCheckRef.current = Date.now();
                    })(),
                    timeoutPromise
                ]);
            } catch (error) {
                logger.error('useSessionManager - Session check failed', {
                    error,
                    timestamp: Date.now(),
                    context: 'useSessionManager.checkAndRefreshSession'
                });
                throw error;
            } finally {
                // Sempre limpar timeout e Promise, mesmo em caso de erro
                if (timeoutId) {
                    clearTimeout(timeoutId);
                }
                // Limpar a Promise do ref para permitir nova verificação
                sessionCheckPromiseRef.current = null;
            }
        })();
        
        // Armazenar a Promise para que outras chamadas possam aguardá-la
        sessionCheckPromiseRef.current = checkPromise;
        
        // Aguardar a verificação
        await checkPromise;
    }, [container, checkInterval, onSessionRefresh, onSessionExpired, onReinitializeServices]);
    
    /**
     * Handler para mudança de visibilidade
     */
    const handleVisibilityChange = useCallback(() => {
        const isVisible = document.visibilityState === 'visible';
        const timestamp = Date.now();
        
        logger.info('useSessionManager - Visibility changed', {
            isVisible,
            state: document.visibilityState,
            timestamp
        });
        
        // Notificar callback
        onVisibilityChange?.(isVisible);
        
        // Verificar sessão ao voltar à página
        if (isVisible) {
            logger.info('useSessionManager - Page became visible, resetting states and checking session', {
                timestamp
            });
            // Resetar estados travados (ex: isSubmitting)
            onResetStates?.();
            
            // Verificar e refresh sessão
            checkAndRefreshSession();
        } else {
            logger.info('useSessionManager - Page became hidden', { timestamp });
        }
    }, [checkAndRefreshSession, onVisibilityChange, onResetStates]);
    
    /**
     * Handler para pageshow (iOS PWA)
     */
    const handlePageShow = useCallback((event: PageTransitionEvent) => {
        const timestamp = Date.now();
        // persisted = página restaurada do bfcache
        if (event.persisted) {
            logger.info('useSessionManager - Page restored from BFCache', {
                persisted: event.persisted,
                timestamp
            });
            
            // Resetar estados travados
            onResetStates?.();
            
            // Notificar que página foi restaurada
            onPageRestored?.();
            
            // Verificar sessão
            checkAndRefreshSession();
            
            // Notificar mudança de visibilidade
            onVisibilityChange?.(true);
        } else {
            logger.debug('useSessionManager - Page shown (not from BFCache)', { timestamp });
        }
    }, [checkAndRefreshSession, onVisibilityChange, onResetStates, onPageRestored]);
    
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
    
    /**
     * Handler para pagehide (antes de página ser descarregada ou minimizada)
     * Importante para iOS Safari que pode congelar a página no BFCache
     */
    const handlePageHide = useCallback((event: PageTransitionEvent) => {
        const timestamp = Date.now();
        logger.info('useSessionManager - Page hiding', {
            persisted: event.persisted,
            timestamp
        });
        
        // Se a página vai para o BFCache, salvar estado e abortar requisições
        if (event.persisted) {
            logger.info('useSessionManager - Page going to BFCache, saving state', { timestamp });
            onPageHide?.();
        }
    }, [onPageHide]);
    
    // Setup de event listeners
    useEffect(() => {
        // Visibility change
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Page show (iOS PWA)
        if (enablePageShow) {
            window.addEventListener('pageshow', handlePageShow);
        }
        
        // Page hide (iOS Safari BFCache)
        if (enablePageHide) {
            window.addEventListener('pagehide', handlePageHide);
        }
        
        // Window focus
        window.addEventListener('focus', handleFocus);
        
        // Online/Offline
        window.addEventListener('online', handleOnline);
        
        // Verificação inicial - criar Promise e armazenar para sincronização
        const initialPromise = checkAndRefreshSession().catch((error) => {
            logger.error('useSessionManager - Initial session check failed', {
                error,
                timestamp: Date.now()
            });
        });
        initialCheckPromiseRef.current = initialPromise;
        
        // Cleanup
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            
            if (enablePageShow) {
                window.removeEventListener('pageshow', handlePageShow);
            }
            
            if (enablePageHide) {
                window.removeEventListener('pagehide', handlePageHide);
            }
            
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('online', handleOnline);
            
            // Limpar Promise inicial ao desmontar
            initialCheckPromiseRef.current = null;
        };
    }, [
        handleVisibilityChange, 
        handlePageShow,
        handlePageHide,
        handleFocus, 
        handleOnline,
        enablePageShow,
        enablePageHide,
        checkAndRefreshSession
    ]);
    
    return {
        /** Força verificação de sessão */
        checkSession: checkAndRefreshSession,
        /** Promise da verificação inicial (para sincronização com loadData) */
        initialCheckPromise: initialCheckPromiseRef.current,
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
