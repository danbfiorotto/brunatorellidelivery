import { RateLimitConfig } from '../infrastructure/rateLimit/RateLimitConfig';

/**
 * Rate limiter simples no frontend
 * Em desenvolvimento, é mais tolerante para evitar erros durante desenvolvimento
 */
class RateLimiter {
    private maxRequests: number;
    private windowMs: number;
    private requests: Map<string, number[]>;
    private isDevelopment: boolean;
    
    constructor(maxRequests: number, windowMs: number) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map();
        // Em desenvolvimento, aumentar limite em 3x para evitar erros durante desenvolvimento
        this.isDevelopment = import.meta.env.DEV || false;
        if (this.isDevelopment) {
            this.maxRequests = maxRequests * 3;
        }
    }
    
    /**
     * Verifica se pode fazer requisição
     */
    canMakeRequest(key: string): boolean {
        // Em desenvolvimento, ser mais tolerante
        if (this.isDevelopment) {
            // Limpar requisições antigas periodicamente para evitar memory leak
            const now = Date.now();
            if (this.requests.has(key)) {
                const userRequests = this.requests.get(key) || [];
                const recentRequests = userRequests.filter(time => 
                    now - time < this.windowMs
                );
                this.requests.set(key, recentRequests);
            }
            // Em dev, sempre permitir (mas ainda rastrear para debug)
            return true;
        }
        
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        
        // Remover requisições antigas
        const recentRequests = userRequests.filter(time => 
            now - time < this.windowMs
        );
        
        if (recentRequests.length >= this.maxRequests) {
            return false;
        }
        
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }
    
    /**
     * Reseta contador para uma chave
     */
    reset(key: string): void {
        this.requests.delete(key);
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

