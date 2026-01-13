import { useEffect, useRef, useCallback, useState } from 'react';
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
    const lastOkAtRef = useRef<number>(0); // Timestamp da última verificação bem-sucedida
    const sessionCheckPromiseRef = useRef<Promise<void> | null>(null);
    const initialCheckPromiseRef = useRef<Promise<void> | null>(null);
    const checkIdCounterRef = useRef<number>(0); // Contador para IDs de verificação
    const currentCheckIdRef = useRef<number>(0); // ID do check atual (para garantir finally correto)
    const didInitRef = useRef<boolean>(false); // Prevenir múltiplos checks "initial"
    const [sessionState, setSessionState] = useState<'loading' | 'ready' | 'invalid'>('loading');
    const SESSION_CHECK_TIMEOUT_MS = 5000; // 5 segundos (session check deve ser rápido - apenas getSession local)
    const REFRESH_TIMEOUT_MS = 8000; // 8 segundos para refresh (requer rede)
    
    /**
     * Verifica e atualiza a sessão se necessário
     * Usa Promise compartilhada (singleflight) + throttle real para evitar verificações concorrentes e frequentes
     * Session check é rápido (apenas getSession local) - timeout de 5s
     * Refresh só acontece se necessário e tem timeout de 8s
     */
    const checkAndRefreshSession = useCallback(async (force: boolean = false, reason: string = 'unknown'): Promise<void> => {
        const now = Date.now();
        const checkId = ++checkIdCounterRef.current;
        const timeSinceLastOk = now - lastOkAtRef.current;
        const inFlight = !!sessionCheckPromiseRef.current;
        
        logger.info('useSessionManager - Session check requested', {
            checkId,
            reason,
            timestamp: now,
            force,
            inFlight, // Logar ANTES de verificar (deve ser false se não há check ativo)
            lastOkAt: lastOkAtRef.current,
            timeSinceLastOk,
            sessionState
        });
        
        // Throttle real: se não for forçado e última verificação bem-sucedida foi há menos de checkInterval, retornar
        if (!force && timeSinceLastOk < checkInterval) {
            logger.debug('useSessionManager - Throttled: last check was recent', {
                checkId,
                reason,
                timestamp: now,
                timeSinceLastOk,
                checkInterval
            });
            return;
        }
        
        // Se já existe uma verificação em andamento, aguardar ela (singleflight)
        if (sessionCheckPromiseRef.current) {
            logger.info('useSessionManager - Session check already in progress, awaiting existing check', {
                checkId,
                reason,
                timestamp: now,
                inFlight: true
            });
            try {
                await sessionCheckPromiseRef.current;
            } catch (error) {
                // Ignorar erros da verificação anterior - cada chamador trata seus próprios erros
                logger.debug('useSessionManager - Previous check had error (ignored)', {
                    checkId,
                    reason,
                    timestamp: now,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
            return;
        }
        
        const checkTimestamp = now;
        currentCheckIdRef.current = checkId; // Armazenar ID do check atual
        
        // Criar nova Promise de verificação com timeout curto (session check deve ser rápido)
        const checkPromise = (async (): Promise<void> => {
            let getSessionTimeoutId: ReturnType<typeof setTimeout> | null = null;
            let refreshTimeoutId: ReturnType<typeof setTimeout> | null = null;
            
            try {
                logger.info('useSessionManager - Checking session (getSession - local, fast)', {
                    checkId,
                    reason,
                    timestamp: checkTimestamp,
                    operation: 'getSession'
                });
                
                const authClient = container.resolve('authClient') as IAuthClient | undefined;
                
                if (!authClient) {
                    logger.warn('useSessionManager - authClient not found', {
                        checkId,
                        reason,
                        timestamp: checkTimestamp
                    });
                    setSessionState('invalid');
                    return;
                }
                
                // 1. getSession (rápido, local) - timeout de 5s
                const getSessionPromise = authClient.getSession();
                const getSessionTimeoutPromise = new Promise<never>((_, reject) => {
                    getSessionTimeoutId = setTimeout(() => {
                        logger.warn('useSessionManager - getSession timeout (5s)', {
                            checkId,
                            reason,
                            timestamp: Date.now(),
                            operation: 'getSession'
                        });
                        reject(new Error('getSession timeout'));
                    }, SESSION_CHECK_TIMEOUT_MS);
                });
                
                const session = await Promise.race([getSessionPromise, getSessionTimeoutPromise]);
                
                // Limpar timeout de getSession
                if (getSessionTimeoutId) {
                    clearTimeout(getSessionTimeoutId);
                    getSessionTimeoutId = null;
                }
                
                if (!session?.user) {
                    logger.warn('useSessionManager - Session expired', {
                        checkId,
                        reason,
                        timestamp: checkTimestamp,
                        hasSession: !!session,
                        result: 'invalid'
                    });
                    setSessionState('invalid');
                    onSessionExpired?.();
                    return;
                }
                
                // Marcar sessão como pronta (getSession foi bem-sucedido)
                logger.info('useSessionManager - Session valid (getSession success)', {
                    checkId,
                    reason,
                    timestamp: checkTimestamp,
                    userId: session.user.id,
                    result: 'ok',
                    operation: 'getSession'
                });
                setSessionState('ready');
                lastCheckRef.current = Date.now();
                lastOkAtRef.current = Date.now();
                
                // 2. Refresh opcional (só se necessário e passou tempo suficiente) - timeout de 8s
                const timeSinceLastCheck = Date.now() - lastCheckRef.current;
                
                if (timeSinceLastCheck > checkInterval && authClient.refreshSession) {
                    try {
                        logger.info('useSessionManager - Refreshing session (refreshSession - network)', {
                            checkId,
                            reason,
                            timestamp: Date.now(),
                            timeSinceLastCheck,
                            operation: 'refreshSession'
                        });
                        
                        const refreshPromise = authClient.refreshSession();
                        const refreshTimeoutPromise = new Promise<never>((_, reject) => {
                            refreshTimeoutId = setTimeout(() => {
                                logger.warn('useSessionManager - refreshSession timeout (8s)', {
                                    checkId,
                                    reason,
                                    timestamp: Date.now(),
                                    operation: 'refreshSession'
                                });
                                reject(new Error('refreshSession timeout'));
                            }, REFRESH_TIMEOUT_MS);
                        });
                        
                        await Promise.race([refreshPromise, refreshTimeoutPromise]);
                        
                        // Limpar timeout de refresh
                        if (refreshTimeoutId) {
                            clearTimeout(refreshTimeoutId);
                            refreshTimeoutId = null;
                        }
                        
                        logger.info('useSessionManager - Session refreshed successfully', {
                            checkId,
                            reason,
                            timestamp: Date.now(),
                            userId: session.user.id,
                            result: 'refresh_ok',
                            operation: 'refreshSession'
                        });
                        
                        // Reobter serviços após refresh (podem ter tokens expirados)
                        onReinitializeServices?.();
                        
                        // Notificar callback de refresh
                        onSessionRefresh?.();
                    } catch (refreshError) {
                        // Refresh falhou, mas getSession foi OK - não marcar como invalid
                        logger.warn('useSessionManager - Session refresh failed (but getSession was OK)', {
                            checkId,
                            reason,
                            error: refreshError,
                            timestamp: Date.now(),
                            result: 'refresh_failed_but_session_ok',
                            operation: 'refreshSession'
                        });
                        // Não marcar como invalid - getSession foi OK, refresh é opcional
                    }
                } else {
                    logger.debug('useSessionManager - Session valid, no refresh needed', {
                        checkId,
                        reason,
                        timestamp: Date.now(),
                        timeSinceLastCheck,
                        checkInterval,
                        result: 'ok_no_refresh'
                    });
                }
                
                logger.info('useSessionManager - Session check completed', {
                    checkId,
                    reason,
                    timestamp: Date.now(),
                    duration: Date.now() - checkTimestamp,
                    result: 'ok',
                    lastOkAt: lastOkAtRef.current
                });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                const isTimeout = errorMessage.includes('timeout');
                
                logger.error('useSessionManager - Session check failed', {
                    checkId,
                    reason,
                    error,
                    timestamp: Date.now(),
                    duration: Date.now() - checkTimestamp,
                    result: isTimeout ? 'timeout' : 'error',
                    isTimeout,
                    context: 'useSessionManager.checkAndRefreshSession'
                });
                
                // NÃO marcar como invalid em timeout - pode ser Safari hibernando
                // Apenas manter estado atual (loading ou ready se já estava)
                if (!isTimeout) {
                    setSessionState('invalid');
                } else {
                    logger.info('useSessionManager - Timeout detected, keeping current state (may be Safari hibernating)', {
                        checkId,
                        reason,
                        currentState: sessionState
                    });
                }
                
                throw error;
            } finally {
                // FINALLY BLINDADO: sempre limpar timeouts e Promise, mesmo em caso de erro/abort
                if (getSessionTimeoutId) {
                    clearTimeout(getSessionTimeoutId);
                }
                if (refreshTimeoutId) {
                    clearTimeout(refreshTimeoutId);
                }
                
                // Só limpar Promise se este ainda é o check atual (evitar race condition)
                if (currentCheckIdRef.current === checkId) {
                    sessionCheckPromiseRef.current = null;
                    currentCheckIdRef.current = 0;
                }
                
                logger.debug('useSessionManager - Check cleanup completed', {
                    checkId,
                    reason,
                    timestamp: Date.now(),
                    promiseCleared: currentCheckIdRef.current === 0
                });
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
            logger.info('useSessionManager - Page became visible, checking session', {
                timestamp
            });
            // NÃO resetar estados automaticamente - isso causa bugs de "não salva após minimizar"
            // O draft já preserva os dados do formulário
            // onResetStates?.(); // Removido - não resetar form/modal automaticamente
            
            // Verificar e refresh sessão (singleflight já previne múltiplas chamadas)
            checkAndRefreshSession(false, 'visibility');
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
            checkAndRefreshSession(false, 'pageshow');
            
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
            checkAndRefreshSession(false, 'focus');
        }
    }, [checkAndRefreshSession]);
    
    /**
     * Handler para online/offline
     */
    const handleOnline = useCallback(() => {
        logger.debug('useSessionManager - Device online');
        checkAndRefreshSession(false, 'online');
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
        
        // Verificação inicial - apenas uma vez por mount real (prevenir múltiplos em StrictMode)
        if (!didInitRef.current) {
            didInitRef.current = true;
            logger.info('useSessionManager - Running initial session check', {
                timestamp: Date.now(),
                isFirstInit: true
            });
            
            const initialPromise = checkAndRefreshSession(true, 'initial').catch((error) => {
                logger.error('useSessionManager - Initial session check failed', {
                    error,
                    timestamp: Date.now()
                });
            });
            initialCheckPromiseRef.current = initialPromise;
        } else {
            logger.debug('useSessionManager - Skipping initial check (already initialized)', {
                timestamp: Date.now()
            });
        }
        
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
        checkSession: (force?: boolean, reason?: string) => checkAndRefreshSession(force || false, reason || 'manual'),
        /** Promise da verificação inicial (para sincronização com loadData) */
        initialCheckPromise: initialCheckPromiseRef.current,
        /** Estado da sessão: 'loading' | 'ready' | 'invalid' (gate para carregamento de dados) */
        sessionState,
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
