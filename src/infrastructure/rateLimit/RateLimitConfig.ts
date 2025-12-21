/**
 * Lê valor numérico de variável de ambiente com fallback
 */
function getEnvNumber(key: string, defaultValue: number): number {
    const value = import.meta.env[key];
    if (value === undefined || value === '') {
        return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Configuração de rate limiting
 * Suporta variáveis de ambiente para override dos valores padrão
 * 
 * Limites aumentados para suportar navegação normal entre páginas:
 * - API: 100 requisições/minuto (aumentado de 30 para suportar navegação rápida)
 * - Login: 5 requisições/minuto (mantido para segurança)
 */
export const RateLimitConfig = {
    /** Configuração para API geral */
    API: {
        MAX_REQUESTS: getEnvNumber('VITE_RATE_LIMIT_API_MAX_REQUESTS', 100), // Aumentado de 30 para 100
        WINDOW_MS: getEnvNumber('VITE_RATE_LIMIT_API_WINDOW_MS', 60 * 1000) // 1 minuto padrão
    },
    
    /** Configuração para login */
    LOGIN: {
        MAX_REQUESTS: getEnvNumber('VITE_RATE_LIMIT_LOGIN_MAX_REQUESTS', 5),
        WINDOW_MS: getEnvNumber('VITE_RATE_LIMIT_LOGIN_WINDOW_MS', 60 * 1000) // 1 minuto padrão
    }
} as const;

