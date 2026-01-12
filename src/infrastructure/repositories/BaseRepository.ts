import { Session } from '@supabase/supabase-js';
import { getSession } from '../../lib/auth';
import { DatabaseAdapter } from '../database/DatabaseAdapter';
import { ErrorHandler } from '../errorHandling/ErrorHandler';
import { logger } from '../../lib/logger';
import { ICacheService } from '../cache/ICacheService';
import { QueryBuilder } from '../database/QueryBuilder';
import { PermissionService } from '../../application/services/PermissionService';
import { IMiddleware, MiddlewareContext } from '../database/middleware/IMiddleware';
import { AuthMiddleware } from '../database/middleware/AuthMiddleware';
import { RateLimitMiddleware } from '../database/middleware/RateLimitMiddleware';
import { CSRFMiddleware } from '../database/middleware/CSRFMiddleware';
import { CacheMiddleware } from '../database/middleware/CacheMiddleware';
import { IAuthClient } from '../auth/IAuthClient';

interface FindAllOptions {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, unknown>;
    limit?: number;
}

interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

interface ExecuteQueryOptions {
    requireAuth?: boolean;
    checkRateLimit?: boolean;
    requireCSRF?: boolean;
    useCache?: boolean;
    defaultValue?: unknown;
}

/**
 * Classe base para repositórios
 * ✅ Usa middleware pattern para separar responsabilidades
 * Centraliza lógica comum: autenticação, rate limiting, error handling, cache
 */
export class BaseRepository {
    protected tableName: string;
    protected db: DatabaseAdapter;
    protected cacheService: ICacheService;
    protected permissionService: PermissionService | null;
    protected authClient: IAuthClient;
    protected enableCache: boolean;
    private middlewares: IMiddleware[];

    /**
     * Cria uma instância do BaseRepository
     * @param tableName - Nome da tabela
     * @param db - Instância do DatabaseAdapter (injetada via DI)
     * @param cacheService - Instância do ICacheService (injetada via DI)
     * @param permissionService - Instância do PermissionService (injetada via DI, opcional)
     * @param authClient - Instância do IAuthClient (injetada via DI)
     * @param enableCache - Se deve usar cache (padrão: true)
     * @param customMiddlewares - Middlewares customizados (opcional)
     */
    constructor(
        tableName: string, 
        db: DatabaseAdapter, 
        cacheService: ICacheService,
        permissionService: PermissionService | null = null,
        authClient: IAuthClient,
        enableCache: boolean = true,
        customMiddlewares: IMiddleware[] = []
    ) {
        this.tableName = tableName;
        this.db = db;
        this.cacheService = cacheService;
        this.permissionService = permissionService;
        this.authClient = authClient;
        this.enableCache = enableCache;
        
        // ✅ Configurar middlewares padrão
        this.middlewares = [
            new AuthMiddleware(authClient),
            new RateLimitMiddleware(authClient),
            new CSRFMiddleware(),
            ...(enableCache ? [new CacheMiddleware(cacheService, true)] : []),
            ...customMiddlewares
        ];
    }

    /**
     * Gera chave de cache
     */
    protected getCacheKey(method: string, params: unknown = null): string {
        const paramsStr = params ? JSON.stringify(params) : '';
        return `${this.tableName}:${method}:${paramsStr}`;
    }

    /**
     * @deprecated Use executeWithMiddlewares() ao invés deste método
     * Mantido para compatibilidade durante migração
     */
    protected async ensureAuth(): Promise<Session> {
        const session = await getSession();
        if (!session) {
            throw new Error('Usuário não autenticado');
        }
        return session;
    }

    /**
     * Executa uma operação aplicando middlewares em sequência
     * ✅ Implementa Chain of Responsibility pattern
     */
    protected async executeWithMiddlewares<T>(
        operation: () => Promise<T>,
        context: Partial<MiddlewareContext> = {},
        options: ExecuteQueryOptions = {}
    ): Promise<T> {
        const {
            requireAuth: reqAuth = true,
            checkRateLimit: checkLimit = true,
            requireCSRF: reqCSRF = false,
            useCache: useCacheOption = true,
            defaultValue = null
        } = options;

        const fullContext: MiddlewareContext = {
            tableName: this.tableName,
            operation: context.operation || 'unknown',
            ...context
        };

        try {
            // Filtrar middlewares baseado nas opções
            const activeMiddlewares = this.middlewares.filter(middleware => {
                // AuthMiddleware - aplicar se requireAuth
                if (middleware instanceof AuthMiddleware) {
                    return reqAuth;
                }
                // RateLimitMiddleware - aplicar se checkRateLimit
                if (middleware instanceof RateLimitMiddleware) {
                    return checkLimit;
                }
                // CSRFMiddleware - aplicar se requireCSRF
                if (middleware instanceof CSRFMiddleware) {
                    return reqCSRF;
                }
                // CacheMiddleware - aplicar se useCache
                if (middleware instanceof CacheMiddleware) {
                    return useCacheOption && this.enableCache;
                }
                // Outros middlewares customizados - sempre aplicar
                return true;
            });

            // Aplicar middlewares em sequência (chain of responsibility)
            let result = operation;
            for (const middleware of activeMiddlewares) {
                const currentResult = result;
                result = async () => await middleware.execute(currentResult, fullContext) as T;
            }

            const finalResult = await result();

            // Retornar valor padrão se resultado for null/undefined
            if (finalResult === null || finalResult === undefined) {
                return defaultValue as T;
            }

            return finalResult;
        } catch (error) {
            logger.error(error, {
                context: 'BaseRepository.executeWithMiddlewares',
                table: this.tableName,
                operation: fullContext.operation,
                options
            });
            throw ErrorHandler.handle(error, {
                context: 'BaseRepository.executeWithMiddlewares',
                table: this.tableName
            });
        }
    }


    /**
     * Cria um QueryBuilder para a tabela
     */
    protected query(): QueryBuilder {
        return this.db.table(this.tableName);
    }

    /**
     * Busca todos os registros com paginação opcional
     * @returns Sempre retorna PaginationResult, mesmo quando não há paginação
     * ✅ Otimizado: usa count em uma única query quando há paginação
     */
    async findAll<T = unknown>(
        options: FindAllOptions = {}, 
        useCache: boolean = false // ✅ Desabilitar cache temporariamente para debug
    ): Promise<PaginationResult<T>> {
        const { 
            page, 
            pageSize, 
            orderBy = 'created_at', 
            orderDirection = 'desc', 
            filters = {},
            limit = null 
        } = options;
        
        // Se não especificar paginação, usar valores padrão (limite alto para "sem paginação")
        const currentPage = page || 1;
        const currentPageSize = pageSize || limit || 1000; // Limite alto para "sem paginação"
        
        // Determinar se deve usar contagem em uma única query (otimização)
        const useSingleQueryCount = !!(page && pageSize);
        
        // ✅ Obter sessão do usuário atual para filtrar por user_id (fora do async para evitar problemas de escopo)
        let finalFilters: Record<string, unknown> = { ...filters };
        
        const result = await this.executeWithMiddlewares<PaginationResult<T>>(
            async () => {
                const session = await getSession();
                const userId = session?.user?.id;
                
                // ✅ Tabelas que devem ser filtradas por user_id
                const tablesWithUserId = ['patients', 'user_profiles', 'clinics'];
                
                // ✅ Adicionar filtro automático por user_id se a tabela suportar
                if (userId && tablesWithUserId.includes(this.tableName)) {
                    // Se já existe um filtro de user_id, usar o existente, senão adicionar
                    if (!finalFilters.user_id && !finalFilters.userId) {
                        finalFilters = { ...finalFilters, user_id: { eq: userId } };
                    }
                }
                
                // ✅ Otimização: usar count em uma única query quando há paginação
                if (useSingleQueryCount) {
                    // Construir query com count embutido
                    let query = this.query().select('*', { count: 'exact' });
                    
                    // Aplicar filtros
                    query = this.applyFilters(query, finalFilters);
                    
                    // Ordenação
                    if (orderBy) {
                        query = query.orderBy(orderBy, orderDirection);
                    }
                    
                    // Paginação
                    query = query.paginate(currentPage, currentPageSize);
                    
                    logger.debug('BaseRepository.findAll - Executing optimized query with count', { 
                        table: this.tableName, 
                        page: currentPage, 
                        pageSize: currentPageSize,
                        orderBy,
                        orderDirection,
                        filters: finalFilters,
                        userId
                    });
                    
                    // Executar query única que retorna data + count
                    const { data, count } = await query.executeWithCount<T>();
                    const total = count || 0;
                    
                    logger.debug('BaseRepository.findAll - Optimized query result', { 
                        table: this.tableName, 
                        dataLength: data?.length || 0,
                        total,
                        firstItem: data?.[0] 
                    });
                    
                    return {
                        data: data || [],
                        pagination: {
                            page: currentPage,
                            pageSize: currentPageSize,
                            total,
                            totalPages: Math.ceil(total / currentPageSize),
                            hasNext: currentPage * currentPageSize < total,
                            hasPrev: currentPage > 1
                        }
                    };
                }
                
                // Fallback: duas queries separadas (para casos sem paginação)
                const total = await this.getCount(finalFilters);
                logger.debug('BaseRepository.findAll - Count result (fallback)', { table: this.tableName, total, filters: finalFilters, userId });
                
                // Construir query
                let query = this.query().select('*');
                
                // Aplicar filtros (extraído para método privado)
                query = this.applyFilters(query, finalFilters);
                
                // Ordenação
                if (orderBy) {
                    query = query.orderBy(orderBy, orderDirection);
                }
                
                // Paginação
                if (limit) {
                    query = query.limit(limit);
                } else if (currentPageSize < 1000) {
                    // Se especificou pageSize mas não page, usar limit
                    query = query.limit(currentPageSize);
                }
                
                logger.debug('BaseRepository.findAll - Executing query (fallback)', { 
                    table: this.tableName, 
                    page: currentPage, 
                    pageSize: currentPageSize,
                    orderBy,
                    orderDirection,
                    filters: finalFilters,
                    userId
                });
                
                const data = await query.execute<T[]>();
                
                logger.debug('BaseRepository.findAll - Query result (fallback)', { 
                    table: this.tableName, 
                    dataLength: data?.length || 0,
                    total,
                    firstItem: data?.[0] 
                });
                
                return {
                    data: data || [],
                    pagination: {
                        page: currentPage,
                        pageSize: currentPageSize,
                        total,
                        totalPages: Math.ceil(total / currentPageSize),
                        hasNext: currentPage * currentPageSize < total,
                        hasPrev: currentPage > 1
                    }
                };
            },
            { operation: 'findAll', metadata: { page: currentPage, pageSize: currentPageSize, filters: finalFilters } },
            { useCache }
        );
        
        // ✅ Cache é gerenciado pelo CacheMiddleware
        return result;
    }
    
    /**
     * Aplica filtros à query (extraído para método privado)
     * ✅ Corrigido para aplicar múltiplos operadores (gte + lte) corretamente
     */
    private applyFilters(query: QueryBuilder, filters: Record<string, unknown>): QueryBuilder {
        Object.entries(filters).forEach(([field, value]) => {
            if (value === null || value === undefined) return;
            
            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                const valueObj = value as { 
                    gte?: unknown; 
                    lte?: unknown; 
                    gt?: unknown; 
                    lt?: unknown;
                    eq?: unknown;
                    in?: unknown[];
                    ilike?: string;
                    like?: string;
                };
                
                // ✅ Aplicar múltiplos operadores quando necessário (ex: gte + lte para range de datas)
                if (valueObj.gte !== undefined) {
                    query = query.whereOperator(field, 'gte', valueObj.gte);
                }
                if (valueObj.lte !== undefined) {
                    query = query.whereOperator(field, 'lte', valueObj.lte);
                }
                if (valueObj.gt !== undefined) {
                    query = query.whereOperator(field, 'gt', valueObj.gt);
                }
                if (valueObj.lt !== undefined) {
                    query = query.whereOperator(field, 'lt', valueObj.lt);
                }
                if (valueObj.eq !== undefined) {
                    query = query.whereOperator(field, 'eq', valueObj.eq);
                }
                if (valueObj.in !== undefined && Array.isArray(valueObj.in)) {
                    query = query.whereOperator(field, 'in', valueObj.in);
                }
                if (valueObj.ilike !== undefined) {
                    query = query.whereOperator(field, 'ilike', valueObj.ilike);
                }
                if (valueObj.like !== undefined) {
                    query = query.whereOperator(field, 'like', valueObj.like);
                }
            } else {
                query = query.where(field, value);
            }
        });
        
        return query;
    }
    
    /**
     * Conta o total de registros com filtros opcionais
     * ✅ Usa DatabaseAdapter ao invés de import direto do Supabase
     */
    protected async getCount(filters: Record<string, unknown> = {}): Promise<number> {
        const result = await this.executeWithMiddlewares<number>(
            async () => {
                // ✅ Usar DatabaseAdapter via QueryBuilder.count()
                const countResult = await this.db.table(this.tableName).count(filters);
                // Garantir que retorna number
                return typeof countResult === 'number' ? countResult : Number(countResult) || 0;
            },
            { operation: 'getCount' },
            { useCache: false } // Count não usa cache
        );
        return result;
    }

    /**
     * Busca um registro por ID
     */
    async findById<T = unknown>(id: string, useCache: boolean = true): Promise<T | null> {
        if (!id) {
            return null;
        }

        const result = await this.executeWithMiddlewares<T | null>(
            async () => {
                let query = this.query()
                    .select('*')
                    .where('id', id);
                
                // ✅ Adicionar filtro por user_id se necessário
                const session = await getSession();
                const userId = session?.user?.id;
                const tablesWithUserId = ['patients', 'user_profiles', 'clinics'];
                
                if (userId && tablesWithUserId.includes(this.tableName)) {
                    query = query.where('user_id', userId);
                }
                
                const data = await query.single().execute<T>();
                return data;
            },
            { operation: 'findById', metadata: { id } },
            { defaultValue: null, useCache }
        );

        // ✅ Cache é gerenciado pelo CacheMiddleware
        return result;
    }

    /**
     * Cria um novo registro
     */
    async create<T = unknown>(data: Record<string, unknown>, options: { addUserId?: boolean } = {}): Promise<T> {
        const { addUserId = true } = options;

        const result = await this.executeWithMiddlewares<T>(
            async () => {
                const session = await getSession();
                const insertData = { ...data };

                if (addUserId && session?.user?.id) {
                    insertData.user_id = session.user.id;
                }

                const created = await this.query()
                    .insert([insertData])
                    .then(res => (Array.isArray(res) ? res[0] : res) as T);
                
                return created;
            },
            { operation: 'create' },
            { requireCSRF: true, useCache: false }
        );

        // Invalidar cache após criação
        if (this.enableCache) {
            await this.cacheService.invalidateByTag(this.tableName);
        }

        return result;
    }

    /**
     * Atualiza um registro
     * ✅ Verifica permissões antes de atualizar
     */
    async update<T = unknown>(id: string, data: Record<string, unknown>): Promise<T> {
        if (!id) {
            throw new Error('ID é obrigatório para atualização');
        }

        const result = await this.executeWithMiddlewares<T>(
            async () => {
                // Verificar permissão se PermissionService estiver disponível
                if (this.permissionService) {
                    const session = await this.ensureAuth();
                    await this.permissionService.requireUpdate(this.tableName, id, session.user.id);
                }

                // ✅ Usar whereOperator para garantir que a query está no estado correto
                const updated = await this.query()
                    .whereOperator('id', 'eq', id)
                    .update(data)
                    .then(res => (Array.isArray(res) ? res[0] : res) as T);
                
                return updated;
            },
            { operation: 'update', metadata: { id } },
            { requireCSRF: true, useCache: false }
        );

        // Invalidar cache após atualização
        if (this.enableCache) {
            await this.cacheService.invalidateByTag(this.tableName);
            const cacheKey = this.getCacheKey('findById', id);
            await this.cacheService.delete(cacheKey);
        }

        return result;
    }

    /**
     * Deleta um registro
     * ✅ Verifica permissões antes de deletar
     */
    async delete(id: string): Promise<void> {
        if (!id) {
            throw new Error('ID é obrigatório para deleção');
        }

        await this.executeWithMiddlewares<void>(
            async () => {
                // Verificar permissão se PermissionService estiver disponível
                if (this.permissionService) {
                    const session = await this.ensureAuth();
                    await this.permissionService.requireDelete(this.tableName, id, session.user.id);
                }

                // ✅ Usar DatabaseAdapter diretamente para evitar problemas com QueryBuilder
                // Obter o SupabaseClient através do DatabaseAdapter
                const dbClient = this.db.getClient();
                if (typeof (dbClient as any).getSupabaseClient !== 'function') {
                    throw new Error('Não foi possível obter o SupabaseClient para deleção');
                }
                
                const supabaseClient = (dbClient as any).getSupabaseClient();

                // Fazer delete diretamente usando SupabaseClient
                const { error } = await supabaseClient
                    .from(this.tableName)
                    .delete()
                    .eq('id', id);

                if (error) {
                    throw new Error(`Erro ao deletar da tabela ${this.tableName}: ${error.message}`);
                }
            },
            { operation: 'delete', metadata: { id } },
            { requireCSRF: true, useCache: false }
        );

        // Invalidar cache após deleção
        if (this.enableCache) {
            await this.cacheService.invalidateByTag(this.tableName);
            const cacheKey = this.getCacheKey('findById', id);
            await this.cacheService.delete(cacheKey);
        }
    }
}

