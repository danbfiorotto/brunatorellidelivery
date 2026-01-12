import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from '../../domain/errors/AppError';
import { WhereStrategyFactory, EqStrategy } from './strategies/WhereStrategy';

type WhereValue = {
    gte?: unknown;
    lte?: unknown;
    gt?: unknown;
    lt?: unknown;
    ilike?: string;
    like?: string;
    eq?: unknown;
    in?: unknown[];
} | unknown;

type QueryOperator = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in' | 'is';

/**
 * Builder para construir queries de forma fluente
 */
export class QueryBuilder {
    private client: SupabaseClient;
    private tableName: string;
    private query: ReturnType<SupabaseClient['from']>;

    /**
     * Cria uma instância do QueryBuilder
     */
    constructor(client: SupabaseClient, tableName: string) {
        this.client = client;
        this.tableName = tableName;
        this.query = client.from(tableName);
    }

    /**
     * Seleciona campos específicos
     */
    select(fields: string | string[] = '*'): this {
        // Se fields for string e contiver parênteses, é um relacionamento
        if (typeof fields === 'string' && fields.includes('(')) {
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select(fields);
        }
        return this;
    }

    /**
     * Adiciona condição WHERE com operador de igualdade
     * ✅ Refatorado usando Strategy Pattern para melhor manutenibilidade
     */
    where(field: string, value: WhereValue): this {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:52',message:'where: entry',data:{tableName:this.tableName,field,valueType:typeof value,isObject:value && typeof value === 'object',hasQuery:!!this.query,queryType:typeof this.query,hasEq:typeof this.query?.eq === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion
        
        // ✅ Garantir que this.query está inicializado corretamente
        if (!this.query) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:58',message:'where: reinitializing query',data:{tableName:this.tableName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
            // #endregion
            this.query = this.client.from(this.tableName);
        }
        
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            const valueObj = value as { 
                gte?: unknown; 
                lte?: unknown; 
                gt?: unknown; 
                lt?: unknown;
                ilike?: string;
                like?: string;
                eq?: unknown;
                in?: unknown[];
            };
            
            // ✅ Usar Strategy Pattern para aplicar o operador apropriado
            const strategy = WhereStrategyFactory.getStrategyByPriority(valueObj);
            
            if (strategy) {
                // Determinar o valor a ser usado baseado na prioridade
                const strategyValue = 
                    valueObj.ilike ?? 
                    valueObj.like ?? 
                    valueObj.gte ?? 
                    valueObj.lte ?? 
                    valueObj.gt ?? 
                    valueObj.lt ?? 
                    valueObj.eq ?? 
                    valueObj.in ?? 
                    value;
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:85',message:'where: before strategy apply',data:{strategyName:strategy.constructor.name,field,strategyValue,hasQuery:!!this.query,hasEq:typeof this.query?.eq === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
                
                this.query = strategy.apply(this.query, field, strategyValue);
                
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:90',message:'where: after strategy apply',data:{hasQuery:!!this.query,hasEq:typeof this.query?.eq === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                // #endregion
            } else {
                // Fallback para igualdade se nenhuma estratégia encontrada
                const eqStrategy = new EqStrategy();
                this.query = eqStrategy.apply(this.query, field, value);
            }
        } else {
            // Valor simples: usar estratégia de igualdade
            const eqStrategy = new EqStrategy();
            this.query = eqStrategy.apply(this.query, field, value);
        }
        return this;
    }

    /**
     * Adiciona condição WHERE com operador customizado
     * Suporta encadeamento para múltiplos filtros
     */
    whereOperator(field: string, operator: QueryOperator, value: unknown): this {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:119',message:'whereOperator: entry',data:{field,operator,hasQuery:!!this.query,queryType:typeof this.query,hasEq:typeof (this.query as any)?.eq === 'function',hasUpdate:typeof (this.query as any)?.update === 'function',queryKeys:this.query ? Object.keys(this.query) : [],queryMethods:this.query ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.query)) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
        
        // ✅ Garantir que this.query está no estado correto antes de aplicar operadores
        // Se a query não tiver os métodos necessários, reinicializar
        if (!this.query || typeof (this.query as any).eq !== 'function') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:123',message:'whereOperator: reinitializing query',data:{tableName:this.tableName},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            this.query = this.client.from(this.tableName);
        }
        
        try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:134',message:'whereOperator: before operator call',data:{operator,hasQuery:!!this.query,hasEq:typeof (this.query as any)?.eq === 'function',queryType:typeof this.query,queryConstructor:this.query?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            
            // ✅ Verificar novamente antes de usar (pode ter mudado entre a verificação anterior e aqui)
            if (!this.query || typeof (this.query as any).eq !== 'function') {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:138',message:'whereOperator: query invalid, reinitializing before operator call',data:{tableName:this.tableName},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                this.query = this.client.from(this.tableName);
            }
            
            if (operator === 'eq') {
                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:143',message:'whereOperator: calling eq',data:{field,value,hasQuery:!!this.query,hasEq:typeof (this.query as any)?.eq === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
                // #endregion
                this.query = this.query.eq(field, value);
            } else if (operator === 'neq') {
                this.query = this.query.neq(field, value);
            } else if (operator === 'gt') {
                this.query = this.query.gt(field, value);
            } else if (operator === 'gte') {
                this.query = this.query.gte(field, value);
            } else if (operator === 'lt') {
                this.query = this.query.lt(field, value);
            } else if (operator === 'lte') {
                this.query = this.query.lte(field, value);
            } else if (operator === 'like') {
                this.query = this.query.like(field, value as string);
            } else if (operator === 'ilike') {
                this.query = this.query.ilike(field, value as string);
            } else if (operator === 'in') {
                this.query = this.query.in(field, value as unknown[]);
            } else if (operator === 'is') {
                this.query = this.query.is(field, value);
            } else {
                throw new Error(`Operador não suportado: ${operator}`);
            }
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:150',message:'whereOperator: after operator call',data:{hasQuery:!!this.query,hasUpdate:typeof (this.query as any)?.update === 'function',hasSelect:typeof (this.query as any)?.select === 'function'},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
        } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:152',message:'whereOperator: error caught',data:{errorMessage:(error as Error)?.message,operator},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'D'})}).catch(()=>{});
            // #endregion
            // Se houver erro, tentar reinicializar a query e tentar novamente
            this.query = this.client.from(this.tableName);
            if (operator === 'eq') {
                this.query = this.query.eq(field, value);
            } else {
                throw error;
            }
        }
        return this;
    }

    /**
     * Adiciona condição IN
     */
    whereIn(field: string, values: unknown[]): this {
        this.query = this.query.in(field, values);
        return this;
    }
    
    /**
     * Adiciona condição OR (para múltiplas condições)
     */
    or(condition: string): this {
        this.query = this.query.or(condition);
        return this;
    }

    /**
     * Adiciona ordenação
     * Suporta encadeamento para múltiplas ordenações
     */
    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
        // O Supabase permite múltiplas ordenações encadeando .order()
        this.query = this.query.order(field, { ascending: direction === 'asc' });
        return this;
    }

    /**
     * Limita o número de resultados
     */
    limit(count: number): this {
        this.query = this.query.limit(count);
        return this;
    }

    /**
     * Adiciona paginação
     */
    range(from: number, to: number): this {
        this.query = this.query.range(from, to);
        return this;
    }
    
    /**
     * Adiciona paginação usando página e tamanho
     */
    paginate(page: number = 1, pageSize: number = 20): this {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        return this.range(from, to);
    }

    /**
     * Retorna apenas um resultado (single)
     * Lança erro se não encontrar ou encontrar múltiplos
     */
    single(): this {
        this.query = this.query.single();
        return this;
    }

    /**
     * Retorna apenas um resultado ou null se não encontrar (maybeSingle)
     * Não lança erro se não encontrar, apenas retorna null
     */
    maybeSingle(): this {
        this.query = this.query.maybeSingle();
        return this;
    }

    /**
     * Executa a query e retorna os dados
     */
    async execute<T = unknown>(): Promise<T> {
        const { data, error } = await this.query;
        
        if (error) {
            throw new DatabaseError(
                `Erro ao executar query na tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
        
        return data as T;
    }

    /**
     * Executa INSERT
     */
    async insert<T = unknown>(data: unknown): Promise<T> {
        const { data: result, error } = await this.query.insert(data).select();
        
        if (error) {
            throw new DatabaseError(
                `Erro ao inserir na tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
        
        return result as T;
    }

    /**
     * Executa UPDATE
     * ✅ Preserva filtros WHERE aplicados anteriormente
     */
    async update<T = unknown>(data: unknown): Promise<T> {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:285',message:'update: entry',data:{tableName:this.tableName,hasQuery:!!this.query,queryType:typeof this.query,hasUpdate:typeof (this.query as any)?.update === 'function',hasSelect:typeof (this.query as any)?.select === 'function',queryMethods:this.query ? Object.getOwnPropertyNames(Object.getPrototypeOf(this.query)) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        // ✅ IMPORTANTE: Quando whereOperator é chamado, ele modifica this.query
        // O Supabase retorna uma nova query builder após cada operação WHERE
        // Essa nova query builder DEVE ter o método update() disponível
        // Se não tiver, significa que a query está em um estado inválido
        
        if (!this.query) {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:293',message:'update: query is null, reinitializing',data:{tableName:this.tableName},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            this.query = this.client.from(this.tableName);
        }
        
        // Verificar se a query tem o método update
        // Se whereOperator foi chamado, a query deve ter update disponível
        if (typeof (this.query as any).update !== 'function') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:299',message:'update: query does not have update method',data:{hasQuery:!!this.query,queryType:typeof this.query,queryConstructor:this.query?.constructor?.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            // Se não tem update, a query pode estar em um estado inválido
            // Tentar reconstruir a query (mas perdemos os filtros WHERE)
            // Isso indica um problema na forma como estamos encadeando as operações
            throw new DatabaseError(
                `Erro ao atualizar na tabela ${this.tableName}: Query não está no estado correto para update. ` +
                `A query foi modificada por whereOperator mas não tem o método update disponível. ` +
                `Isso pode indicar um problema no encadeamento de operações.`,
                new Error('Query state invalid for update')
            );
        }
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:310',message:'update: calling query.update',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        const { data: result, error } = await this.query.update(data).select();
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'QueryBuilder.ts:313',message:'update: result',data:{hasError:!!error,errorMessage:error?.message,hasResult:!!result},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'E'})}).catch(()=>{});
        // #endregion
        
        if (error) {
            throw new DatabaseError(
                `Erro ao atualizar na tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
        
        return result as T;
    }

    /**
     * Executa DELETE
     */
    async delete(): Promise<void> {
        const { error } = await this.query.delete();
        
        if (error) {
            throw new DatabaseError(
                `Erro ao deletar da tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
    }

    /**
     * Conta registros com filtros opcionais
     */
    async count(filters: Record<string, unknown> = {}): Promise<number> {
        let query = this.client
            .from(this.tableName)
            .select('*', { count: 'exact', head: true });
        
        // ✅ Aplicar filtros corretamente (incluindo múltiplos operadores)
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
                    query = query.gte(field, valueObj.gte);
                }
                if (valueObj.lte !== undefined) {
                    query = query.lte(field, valueObj.lte);
                }
                if (valueObj.gt !== undefined) {
                    query = query.gt(field, valueObj.gt);
                }
                if (valueObj.lt !== undefined) {
                    query = query.lt(field, valueObj.lt);
                }
                if (valueObj.eq !== undefined) {
                    query = query.eq(field, valueObj.eq);
                }
                if (valueObj.in !== undefined && Array.isArray(valueObj.in)) {
                    query = query.in(field, valueObj.in);
                }
                if (valueObj.ilike !== undefined) {
                    query = query.ilike(field, valueObj.ilike);
                }
                if (valueObj.like !== undefined) {
                    query = query.like(field, valueObj.like);
                }
            } else {
                query = query.eq(field, value);
            }
        });
        
        const { count, error } = await query;
        
        if (error) {
            throw new Error(`Erro ao contar registros: ${error.message}`);
        }
        
        return count || 0;
    }
}

