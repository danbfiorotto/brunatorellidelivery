import { RateLimitConfig } from '../infrastructure/rateLimit/RateLimitConfig';

/**
 * Estrutura que representa uma janela de rate limiting
 */
interface RateLimitWindow {
    startTime: number;  // Timestamp de início da janela
    requestCount: number;  // Número de requisições na janela
}

/**
 * Resultado da verificação de rate limit
 */
export interface RateLimitCheckResult {
    allowed: boolean;
    retryAfter?: number;  // Segundos até o reset
    remaining?: number;  // Requisições restantes
    resetAt?: number;  // Timestamp do reset
}

/**
 * Informações de rate limit para uma chave
 */
export interface RateLimitInfo {
    remaining: number;
    resetAt: number;
    retryAfter: number;
    limit: number;
    windowMs: number;
}

/**
 * Rate limiter simples no frontend
 * Em desenvolvimento, é mais tolerante para evitar erros durante desenvolvimento
 */
class RateLimiter {
    private maxRequests: number;
    private windowMs: number;
    private windows: Map<string, RateLimitWindow>;
    private isDevelopment: boolean;
    
    constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.windows = new Map();
        // Em desenvolvimento, aumentar limite em 3x para evitar erros durante desenvolvimento
        this.isDevelopment = import.meta.env.DEV || false;
        if (this.isDevelopment) {
            this.maxRequests = maxRequests * 3;
        }
    }
    
    /**
     * Verifica se pode fazer requisição e retorna informações detalhadas
     */
    checkLimit(key: string): RateLimitCheckResult {
        const now = Date.now();
        const window = this.windows.get(key);
        
        // Se não existe janela ou a janela expirou, criar nova
        if (!window || (now - window.startTime) >= this.windowMs) {
            const newWindow: RateLimitWindow = {
                startTime: now,
                requestCount: 1
            };
            this.windows.set(key, newWindow);
            
            return {
                allowed: true,
                remaining: this.maxRequests - 1,
                resetAt: now + this.windowMs,
                retryAfter: Math.ceil(this.windowMs / 1000)
            };
        }
        
        // Janela ainda ativa
        const resetAt = window.startTime + this.windowMs;
        const retryAfter = Math.ceil((resetAt - now) / 1000);
        
        // Verificar se excedeu o limite
        if (window.requestCount >= this.maxRequests) {
            // Em desenvolvimento, ainda permitir mas retornar informações corretas
            if (this.isDevelopment) {
                return {
                    allowed: true,
                    remaining: 0,
                    resetAt,
                    retryAfter
                };
            }
            
            return {
                allowed: false,
                remaining: 0,
                resetAt,
                retryAfter
            };
        }
        
        // Incrementar contador
        window.requestCount += 1;
        this.windows.set(key, window);
        
        return {
            allowed: true,
            remaining: this.maxRequests - window.requestCount,
            resetAt,
            retryAfter
        };
    }
    
    /**
     * Verifica se pode fazer requisição (método legado para compatibilidade)
     * @deprecated Use checkLimit() para obter informações detalhadas
     */
    canMakeRequest(key: string): boolean {
        return this.checkLimit(key).allowed;
    }
    
    /**
     * Obtém o tempo de retry em segundos para uma chave
     */
    getRetryAfter(key: string): number {
        const window = this.windows.get(key);
        if (!window) {
            return 0;
        }
        
        const now = Date.now();
        const resetAt = window.startTime + this.windowMs;
        
        // Se a janela expirou, não há tempo de retry
        if (now >= resetAt) {
            return 0;
        }
        
        return Math.ceil((resetAt - now) / 1000);
    }
    
    /**
     * Obtém informações completas de rate limit para uma chave
     */
    getRateLimitInfo(key: string): RateLimitInfo | null {
        const window = this.windows.get(key);
        if (!window) {
            return null;
        }
        
        const now = Date.now();
        const resetAt = window.startTime + this.windowMs;
        
        // Se a janela expirou, retornar null
        if (now >= resetAt) {
            return null;
        }
        
        const retryAfter = Math.ceil((resetAt - now) / 1000);
        const remaining = Math.max(0, this.maxRequests - window.requestCount);
        
        return {
            remaining,
            resetAt,
            retryAfter,
            limit: this.maxRequests,
            windowMs: this.windowMs
        };
    }
    
    /**
     * Reseta contador para uma chave
     */
    reset(key: string): void {
        this.windows.delete(key);
    }
    
    /**
     * Limpa janelas expiradas para evitar memory leak
     */
    cleanup(): void {
        const now = Date.now();
        for (const [key, window] of this.windows.entries()) {
            if ((now - window.startTime) >= this.windowMs) {
                this.windows.delete(key);
            }
        }
    }
}

// Instâncias para diferentes endpoints usando constantes
export const apiRateLimiter = new RateLimiter(
    RateLimitConfig.API.MAX_REQUESTS,
    RateLimitConfig.API.WINDOW_MS
);
export const loginRateLimiter = new RateLimiter(
    RateLimitConfig.LOGIN.MAX_REQUESTS,
    RateLimitConfig.LOGIN.WINDOW_MS
);

