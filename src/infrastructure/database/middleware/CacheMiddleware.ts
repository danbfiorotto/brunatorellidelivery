import { IMiddleware, MiddlewareContext } from './IMiddleware';
import { ICacheService } from '../../cache/ICacheService';

/**
 * Middleware que gerencia cache para operações de leitura
 * Aplica cache apenas para operações de leitura (findAll, findById)
 */
export class CacheMiddleware implements IMiddleware {
    constructor(
        private cacheService: ICacheService,
        private enabled: boolean = true
    ) {}

    async execute<T>(next: () => Promise<T>, context: MiddlewareContext): Promise<T> {
        // Apenas aplicar cache para operações de leitura
        const readOperations = ['findAll', 'findById', 'findByNameOrEmail'];
        
        if (!this.enabled || !readOperations.includes(context.operation)) {
            return next();
        }

        const cacheKey = this.getCacheKey(context);
        
        // Tentar obter do cache
        const cached = await this.cacheService.get<T>(cacheKey);
        if (cached !== null) {
            return cached;
        }

        // Executar operação e armazenar no cache
        const result = await next();
        
        // Armazenar no cache com TTL de 5 minutos
        await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
        
        return result;
    }

    /**
     * Gera chave de cache baseada no contexto
     */
    private getCacheKey(context: MiddlewareContext): string {
        const metadataStr = context.metadata ? JSON.stringify(context.metadata) : '';
        // Usar formato consistente com BaseRepository.getCacheKey()
        return `${context.tableName}:${context.operation}:${metadataStr}`;
    }
}

