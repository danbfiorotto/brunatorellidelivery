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

// Operators that Supabase supports as UPDATE filters
const UPDATE_SAFE_OPERATORS = new Set<QueryOperator>(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in']);

interface SelectOptions {
    count?: 'exact' | 'planned' | 'estimated';
    head?: boolean;
}

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
    // Conditions persisted for reuse in update() — only UPDATE_SAFE_OPERATORS are stored
    private whereConditions: WhereCondition[] = [];

    constructor(client: SupabaseClient, tableName: string) {
        this.client = client;
        this.tableName = tableName;
        this.query = client.from(tableName);
    }

    /**
     * Applies a single operator to a Supabase query object and returns the new query.
     * Centralises the operator dispatch used by whereOperator() and update().
     */
    private applyOperator(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        operator: QueryOperator,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        switch (operator) {
            case 'eq':    return (query as any).eq(field, value);
            case 'neq':   return (query as any).neq(field, value);
            case 'gt':    return (query as any).gt(field, value);
            case 'gte':   return (query as any).gte(field, value);
            case 'lt':    return (query as any).lt(field, value);
            case 'lte':   return (query as any).lte(field, value);
            case 'like':  return (query as any).like(field, value as string);
            case 'ilike': return (query as any).ilike(field, value as string);
            case 'in':    return (query as any).in(field, value as unknown[]);
            case 'is':    return (query as any).is(field, value);
            default:      throw new Error(`Operador não suportado: ${operator}`);
        }
    }

    select(fields: string | string[] = '*', options?: SelectOptions): this {
        if (options?.count) {
            this.countMode = options.count;
            this.query = this.query.select(fields, { count: options.count, head: options.head });
        } else {
            this.query = this.query.select(fields);
        }
        return this;
    }

    /**
     * Adiciona condição WHERE com operador de igualdade ou objeto de operadores.
     * Note: ilike/like are applied to SELECT queries only — not persisted for UPDATE.
     */
    where(field: string, value: WhereValue): this {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
            const valueObj = value as {
                gte?: unknown; lte?: unknown; gt?: unknown; lt?: unknown;
                ilike?: string; like?: string; eq?: unknown; in?: unknown[];
            };

            // ilike/like: applied to this.query for SELECT but not stored for UPDATE
            if (valueObj.ilike !== undefined) {
                this.query = this.applyOperator(this.query, field, 'ilike', valueObj.ilike);
                return this;
            }
            if (valueObj.like !== undefined) {
                this.query = this.applyOperator(this.query, field, 'like', valueObj.like);
                return this;
            }

            // Range/equality operators: applied and stored for UPDATE reuse
            const ops: Array<[QueryOperator, unknown | undefined]> = [
                ['gte', valueObj.gte], ['lte', valueObj.lte],
                ['gt',  valueObj.gt],  ['lt',  valueObj.lt],
                ['eq',  valueObj.eq],  ['in',  Array.isArray(valueObj.in) ? valueObj.in : undefined],
            ];
            for (const [op, val] of ops) {
                if (val !== undefined) {
                    this.query = this.applyOperator(this.query, field, op, val);
                    this.whereConditions.push({ field, operator: op, value: val });
                }
            }
        } else {
            this.query = this.applyOperator(this.query, field, 'eq', value);
            this.whereConditions.push({ field, operator: 'eq', value });
        }
        return this;
    }

    /**
     * Adiciona condição WHERE com operador customizado.
     * Note: like/ilike/is are not stored for UPDATE — only UPDATE_SAFE_OPERATORS are persisted.
     */
    whereOperator(field: string, operator: QueryOperator, value: unknown): this {
        this.query = this.applyOperator(this.query, field, operator, value);
        if (UPDATE_SAFE_OPERATORS.has(operator)) {
            this.whereConditions.push({ field, operator, value });
        }
        return this;
    }

    whereIn(field: string, values: unknown[]): this {
        this.query = this.query.in(field, values);
        return this;
    }

    or(condition: string): this {
        this.query = this.query.or(condition);
        return this;
    }

    orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): this {
        this.query = this.query.order(field, { ascending: direction === 'asc' });
        return this;
    }

    limit(count: number): this {
        this.query = this.query.limit(count);
        return this;
    }

    range(from: number, to: number): this {
        this.query = this.query.range(from, to);
        return this;
    }

    paginate(page: number = 1, pageSize: number = 20): this {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        return this.range(from, to);
    }

    single(): this {
        this.query = this.query.single();
        return this;
    }

    maybeSingle(): this {
        this.query = this.query.maybeSingle();
        return this;
    }

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

    async executeWithCount<T = unknown>(): Promise<QueryResultWithCount<T>> {
        const { data, count, error } = await this.query;
        if (error) {
            throw new DatabaseError(
                `Erro ao executar query na tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
        return { data: (data || []) as T[], count };
    }

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
     * Executa UPDATE.
     * Supabase requires the order: .from(table).update(data).eq(field, value)
     * so WHERE conditions stored in whereConditions[] are reapplied after .update().
     */
    async update<T = unknown>(data: unknown): Promise<T> {
        let query: ReturnType<SupabaseClient['from']> =
            this.client.from(this.tableName).update(data as object).select() as any;

        for (const { field, operator, value } of this.whereConditions) {
            query = this.applyOperator(query, field, operator, value);
        }

        const { data: result, error } = await (query as any);
        if (error) {
            throw new DatabaseError(
                `Erro ao atualizar na tabela ${this.tableName}: ${error.message}`,
                error
            );
        }
        return result as T;
    }

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

        for (const [field, value] of Object.entries(filters)) {
            if (value === null || value === undefined) continue;

            if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
                const v = value as Record<string, unknown>;
                const ops: Array<[string, QueryOperator]> = [
                    ['gte', 'gte'], ['lte', 'lte'], ['gt', 'gt'], ['lt', 'lt'],
                    ['eq', 'eq'], ['ilike', 'ilike'], ['like', 'like'],
                ];
                for (const [key, op] of ops) {
                    if (v[key] !== undefined) {
                        query = (query as any)[op](field, v[key]);
                    }
                }
                if (v['in'] !== undefined && Array.isArray(v['in'])) {
                    query = (query as any).in(field, v['in']);
                }
            } else {
                query = query.eq(field, value);
            }
        }

        const { count, error } = await query;
        if (error) {
            throw new Error(`Erro ao contar registros: ${error.message}`);
        }
        return count || 0;
    }
}
