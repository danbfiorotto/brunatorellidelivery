import { IRateLimitStrategy } from '../IRateLimitStrategy';

/**
 * Estratégia padrão de rate limiting
 * Define limites diferentes por tipo de operação
 */
export class DefaultRateLimitStrategy implements IRateLimitStrategy {
    private readonly limits: Record<string, { limit: number; window: number }> = {
        'create': { limit: 10, window: 60 }, // 10 por minuto
        'update': { limit: 20, window: 60 }, // 20 por minuto
        'delete': { limit: 5, window: 60 },   // 5 por minuto
        'read': { limit: 100, window: 60 },  // 100 por minuto
        'login': { limit: 5, window: 60 },   // 5 por minuto
        'default': { limit: 50, window: 60 } // 50 por minuto (padrão)
    };
    
    getLimit(operation: string): number {
        return this.limits[operation]?.limit || this.limits.default.limit;
    }
    
    getWindow(operation: string): number {
        return this.limits[operation]?.window || this.limits.default.window;
    }
    
    shouldApply(operation: string): boolean {
        return operation in this.limits || true; // Sempre aplicar, usar default se não encontrado
    }
}




