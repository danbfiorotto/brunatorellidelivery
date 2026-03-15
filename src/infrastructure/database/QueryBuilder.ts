import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseError } from '../../domain/errors/AppError';

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
 * Options for select query with count support
 */
interface SelectOptions {
    count?: 'exact' | 'planned' | 'estimated';
    head?: boolean;
}

/**
 * Result with data and optional count
 */
export interface QueryResultWithCount<T> {
    data: T[];
    count: number | null;
}

interface WhereCondition {
    field: string;
    operator: QueryOperator;
    value: unknown;
}

/**
 * Builder para construir queries de forma fluente
 */
export class QueryBuilder {
    private client: SupabaseClient;
    private tableName: string;
    private query: ReturnType<SupabaseClient['from']>;
    private countMode: 'exact' | 'planned' | 'estimated' | null = null;
    private whereConditions: WhereCondition[] = [];

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
     * @param fields - Campos a selecionar
     * @param options - Opções de select (count, head)
     */
    select(fields: string | string[] = '*', options?: SelectOptions): this {
        if (options?.count) {
            this.countMode = options.count;
            this.query = this.query.select(fields, { count: options.count, head: options.head });
        } else if (typeof fields === 'string' && fields.includes('(')) {
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select(fields);
        }
        return this;
    }

    /**
     * Adiciona condição WHERE com operador de igualdade
     */
    where(field: string, value: WhereValue): this {
        if (!this.query) {
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

            // Aplicar todos os operadores presentes e guardar para reuso no update
            if (valueObj.ilike !== undefined) {
                this.query = this.query.ilike(field, valueObj.ilike as string);
            } else if (valueObj.like !== undefined) {
                this.query = this.query.like(field, valueObj.like as string);
            } else {
                if (valueObj.gte !== undefined) {
                    this.query = this.query.gte(field, valueObj.gte);
                    this.whereConditions.push({ field, operator: 'gte', value: valueObj.gte });
                }
                if (valueObj.lte !== undefined) {
                    this.query = this.query.lte(field, valueObj.lte);
                    this.whereConditions.push({ field, operator: 'lte', value: valueObj.lte });
                }
                if (valueObj.gt !== undefined) {
                    this.query = this.query.gt(field, valueObj.gt);
                    this.whereConditions.push({ field, operator: 'gt', value: valueObj.gt });
                }
                if (valueObj.lt !== undefined) {
                    this.query = this.query.lt(field, valueObj.lt);
                    this.whereConditions.push({ field, operator: 'lt', value: valueObj.lt });
                }
                if (valueObj.eq !== undefined) {
                    this.query = this.query.eq(field, valueObj.eq);
                    this.whereConditions.push({ field, operator: 'eq', value: valueObj.eq });
                }
                if (valueObj.in !== undefined && Array.isArray(valueObj.in)) {
                    this.query = this.query.in(field, valueObj.in);
                    this.whereConditions.push({ field, operator: 'in', value: valueObj.in });
                }
            }
        } else {
            this.query = this.query.eq(field, value);
            this.whereConditions.push({ field, operator: 'eq', value });
        }
        return this;
    }

    /**
     * Adiciona condição WHERE com operador customizado
     */
    whereOperator(field: string, operator: QueryOperator, value: unknown): this {
        if (!this.query) {
            this.query = this.client.from(this.tableName);
        }

        if (operator === 'eq') {
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

        // Guardar condição para reuso no update (exceto like/ilike/is que não são suportados em update filter)
        if (['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in'].includes(operator)) {
            this.whereConditions.push({ field, operator: operator as QueryOperator, value });
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
     * Executa a query e retorna dados com count em uma única requisição
     * Otimiza performance eliminando chamada separada de count
     * Requer que select() tenha sido chamado com { count: 'exact' }
     */
    async executeWithCount<T = unknown>(): Promise<QueryResultWithCount<T>> {
        const { data, count, error } = await this.query;
        
        if (error) {
            throw new DatabaseError(
                `Erro ao executar query na tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
        
        return {
            data: (data || []) as T[],
            count: count
        };
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
     * ✅ Constrói a query na ordem correta do Supabase: .update(data).eq(field, value)
     * Os filtros WHERE aplicados anteriormente são reaplicados após o update
     */
    async update<T = unknown>(data: unknown): Promise<T> {
        // O Supabase exige a ordem: .from(table).update(data).eq(field, value)
        // Não é possível fazer .from(table).eq(field, value).update(data)
        // Por isso reconstruímos a query aplicando os filtros após o update
        const baseQuery = this.client.from(this.tableName).update(data as object).select();

        // Reaplicar os filtros WHERE que foram acumulados em this.whereConditions
        let finalQuery = baseQuery;
        for (const condition of this.whereConditions) {
            const { field, operator, value } = condition;
            if (operator === 'eq') {
                finalQuery = (finalQuery as any).eq(field, value);
            } else if (operator === 'neq') {
                finalQuery = (finalQuery as any).neq(field, value);
            } else if (operator === 'gt') {
                finalQuery = (finalQuery as any).gt(field, value);
            } else if (operator === 'gte') {
                finalQuery = (finalQuery as any).gte(field, value);
            } else if (operator === 'lt') {
                finalQuery = (finalQuery as any).lt(field, value);
            } else if (operator === 'lte') {
                finalQuery = (finalQuery as any).lte(field, value);
            } else if (operator === 'in') {
                finalQuery = (finalQuery as any).in(field, value);
            }
        }

        const { data: result, error } = await finalQuery;

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

