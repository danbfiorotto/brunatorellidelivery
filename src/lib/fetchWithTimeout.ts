import { logger } from './logger';

/**
 * Erro customizado para timeout de requisição
 */
export class TimeoutError extends Error {
    constructor(message: string = 'Request timeout', public timeoutMs: number = 0) {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Erro customizado para requisição abortada
 */
export class AbortedError extends Error {
    constructor(message: string = 'Request aborted') {
        super(message);
        this.name = 'AbortedError';
    }
}

/**
 * Configuração para fetchWithTimeout
 */
interface FetchWithTimeoutOptions {
    /** Timeout em milissegundos (padrão: 30s) */
    timeout?: number;
    /** AbortController externo para cancelamento manual */
    abortController?: AbortController;
    /** Callback quando ocorre timeout */
    onTimeout?: () => void;
    /** Callback quando requisição é abortada */
    onAbort?: () => void;
}

/**
 * Timeout padrão para requisições (30 segundos)
 */
export const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Executa uma função com timeout e suporte a cancelamento
 * 
 * @example
 * ```ts
 * // Uso básico
 * const result = await withTimeout(
 *   () => supabase.from('appointments').select('*'),
 *   { timeout: 10000 }
 * );
 * 
 * // Com cancelamento manual
 * const controller = new AbortController();
 * const promise = withTimeout(
 *   () => supabase.from('appointments').select('*'),
 *   { abortController: controller }
 * );
 * 
 * // Cancelar se necessário
 * controller.abort();
 * ```
 */
export async function withTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    options: FetchWithTimeoutOptions = {}
): Promise<T> {
    const {
        timeout = DEFAULT_TIMEOUT_MS,
        abortController = new AbortController(),
        onTimeout,
        onAbort,
    } = options;
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    // Promise de timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            abortController.abort();
            onTimeout?.();
            reject(new TimeoutError(`Request timed out after ${timeout}ms`, timeout));
        }, timeout);
    });
    
    try {
        // Race entre a requisição e o timeout
        const result = await Promise.race([
            fn(abortController.signal),
            timeoutPromise
        ]);
        
        return result;
    } catch (error) {
        // Verificar se foi abortado manualmente (não por timeout)
        if (abortController.signal.aborted && !(error instanceof TimeoutError)) {
            onAbort?.();
            throw new AbortedError('Request was aborted');
        }
        
        throw error;
    } finally {
        // Limpar timeout
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Wrapper para fetch nativo com timeout
 */
export async function fetchWithTimeout(
    input: RequestInfo | URL,
    init?: RequestInit,
    options: FetchWithTimeoutOptions = {}
): Promise<Response> {
    return withTimeout(
        async (signal) => {
            const response = await fetch(input, {
                ...init,
                signal,
            });
            
            return response;
        },
        options
    );
}

/**
 * Hook helper para criar AbortController gerenciado
 * Automaticamente cancela requisições ao desmontar componente
 */
export function createManagedAbortController(): {
    controller: AbortController;
    signal: AbortSignal;
    abort: () => void;
    reset: () => AbortController;
} {
    let controller = new AbortController();
    
    return {
        get controller() {
            return controller;
        },
        get signal() {
            return controller.signal;
        },
        abort: () => {
            controller.abort();
        },
        reset: () => {
            if (controller.signal.aborted) {
                controller = new AbortController();
            }
            return controller;
        },
    };
}

/**
 * Executa múltiplas operações com timeout global
 * Útil para Promise.all com timeout
 */
export async function withTimeoutAll<T extends readonly unknown[] | []>(
    promises: { [K in keyof T]: (signal: AbortSignal) => Promise<T[K]> },
    options: FetchWithTimeoutOptions = {}
): Promise<T> {
    const {
        timeout = DEFAULT_TIMEOUT_MS,
        abortController = new AbortController(),
        onTimeout,
        onAbort,
    } = options;
    
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            abortController.abort();
            onTimeout?.();
            reject(new TimeoutError(`Requests timed out after ${timeout}ms`, timeout));
        }, timeout);
    });
    
    try {
        const result = await Promise.race([
            Promise.all(promises.map(fn => fn(abortController.signal))),
            timeoutPromise
        ]);
        
        return result as T;
    } catch (error) {
        if (abortController.signal.aborted && !(error instanceof TimeoutError)) {
            onAbort?.();
            throw new AbortedError('Requests were aborted');
        }
        
        throw error;
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

/**
 * Retry com timeout e backoff exponencial
 */
export async function withRetryAndTimeout<T>(
    fn: (signal: AbortSignal) => Promise<T>,
    options: FetchWithTimeoutOptions & {
        maxRetries?: number;
        retryDelay?: number;
        onRetry?: (attempt: number, error: Error) => void;
    } = {}
): Promise<T> {
    const {
        maxRetries = 2,
        retryDelay = 1000,
        onRetry,
        ...timeoutOptions
    } = options;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await withTimeout(fn, timeoutOptions);
        } catch (error) {
            lastError = error as Error;
            
            // Não fazer retry para erros de abort ou timeout manual
            if (error instanceof AbortedError) {
                throw error;
            }
            
            // Se ainda há tentativas disponíveis
            if (attempt < maxRetries) {
                logger.debug('withRetryAndTimeout - Retrying', {
                    attempt: attempt + 1,
                    maxRetries,
                    error: lastError.message
                });
                
                onRetry?.(attempt + 1, lastError);
                
                // Backoff exponencial
                await new Promise(resolve => 
                    setTimeout(resolve, retryDelay * Math.pow(2, attempt))
                );
            }
        }
    }
    
    throw lastError;
}

export default {
    withTimeout,
    fetchWithTimeout,
    withTimeoutAll,
    withRetryAndTimeout,
    createManagedAbortController,
    TimeoutError,
    AbortedError,
    DEFAULT_TIMEOUT_MS,
};
