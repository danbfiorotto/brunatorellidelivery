/**
 * Resultado da verificação de rate limit
 */
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
}

/**
 * Opções para verificação de rate limit
 */
export interface RateLimitOptions {
    operation?: string;
    customLimit?: number;
    customWindow?: number;
}

/**
 * Interface para serviços de rate limiting
 */
export interface IRateLimiter {
    /**
     * Verifica se o usuário pode fazer uma requisição
     * @param userId - ID do usuário
     * @param operation - Tipo de operação (create, update, delete, read, etc)
     * @param options - Opções adicionais
     * @returns Resultado da verificação
     */
    checkLimit(
        userId: string,
        operation: string,
        options?: RateLimitOptions
    ): Promise<RateLimitResult>;
}




