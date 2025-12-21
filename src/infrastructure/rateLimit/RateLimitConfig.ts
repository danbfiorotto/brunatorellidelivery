/**
 * Configuração de rate limiting
 */
export const RateLimitConfig = {
    /** Configuração para API geral */
    API: {
        MAX_REQUESTS: 30,
        WINDOW_MS: 60 * 1000 // 1 minuto
    },
    
    /** Configuração para login */
    LOGIN: {
        MAX_REQUESTS: 5,
        WINDOW_MS: 60 * 1000 // 1 minuto
    }
} as const;

