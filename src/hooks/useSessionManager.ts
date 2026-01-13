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
    const [sessionState, setSessionState] = useState<'loading' | 'ready' | 'invalid'>('loading');
    const SAFETY_TIMEOUT_MS = 30000; // 30 segundos
    
    /**
     * Verifica e atualiza a sessão se necessário
     * Usa Promise compartilhada (singleflight) + throttle real para evitar verificações concorrentes e frequentes
     */
    const checkAndRefreshSession = useCallback(async (force: boolean = false, reason: string = 'unknown'): Promise<void> => {
        const now = Date.now();
        const checkId = ++checkIdCounterRef.current;
        const timeSinceLastOk = now - lastOkAtRef.current;
        
        logger.info('useSessionManager - Session check requested', {
            checkId,
            reason,
            timestamp: now,
            force,
            inFlight: !!sessionCheckPromiseRef.current,
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
                    timestamp: now
                });
            }
            return;
        }
        
        const checkTimestamp = now;
        
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
                        logger.info('useSessionManager - Checking session', {
                            checkId,
                            reason,
                            timestamp: checkTimestamp
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
                        
                        const session = await authClient.getSession();
                        
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
                        
                        // Marcar sessão como pronta
                        logger.info('useSessionManager - Session valid', {
                            checkId,
                            reason,
                            timestamp: checkTimestamp,
                            userId: session.user.id,
                            result: 'ok'
                        });
                        setSessionState('ready');
                        
                        // Tentar refresh se disponível e passou tempo suficiente
                        const timeSinceLastCheck = Date.now() - lastCheckRef.current;
                        
                        if (timeSinceLastCheck > checkInterval && authClient.refreshSession) {
                            try {
                                logger.info('useSessionManager - Refreshing session', {
                                    checkId,
                                    reason,
                                    timestamp: Date.now(),
                                    timeSinceLastCheck,
                                    result: 'refresh'
                                });
                                await authClient.refreshSession();
                                logger.info('useSessionManager - Session refreshed successfully', {
                                    checkId,
                                    reason,
                                    timestamp: Date.now(),
                                    userId: session.user.id,
                                    result: 'refresh_ok'
                                });
                                
                                // Reobter serviços após refresh (podem ter tokens expirados)
                                onReinitializeServices?.();
                                
                                // Notificar callback de refresh
                                onSessionRefresh?.();
                            } catch (error) {
                                logger.error('useSessionManager - Session refresh failed', {
                                    checkId,
                                    reason,
                                    error,
                                    timestamp: Date.now(),
                                    result: 'refresh_failed',
                                    context: 'useSessionManager.refreshSession'
                                });
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
                        
                        // Atualizar timestamps apenas se sessão foi validada com sucesso
                        lastCheckRef.current = Date.now();
                        lastOkAtRef.current = Date.now();
                        
                        logger.info('useSessionManager - Session check completed', {
                            checkId,
                            reason,
                            timestamp: Date.now(),
                            duration: Date.now() - checkTimestamp,
                            result: 'ok',
                            lastOkAt: lastOkAtRef.current
                        });
                    })(),
                    timeoutPromise
                ]);
            } catch (error) {
                logger.error('useSessionManager - Session check failed', {
                    checkId,
                    reason,
                    error,
                    timestamp: Date.now(),
                    duration: Date.now() - checkTimestamp,
                    result: 'error',
                    context: 'useSessionManager.checkAndRefreshSession'
                });
                setSessionState('invalid');
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
        
        // Verificação inicial - forçar verificação mesmo se recente
        const initialPromise = checkAndRefreshSession(true, 'initial').catch((error) => {
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
