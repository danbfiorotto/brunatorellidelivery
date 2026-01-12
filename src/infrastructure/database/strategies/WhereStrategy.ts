import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Interface para estratégias de filtro WHERE
 * Implementa o padrão Strategy para diferentes operadores
 */
export interface IWhereStrategy {
    /**
     * Aplica o filtro na query
     * @param query - Query do Supabase
     * @param field - Campo a ser filtrado
     * @param value - Valor do filtro
     * @returns Query modificada
     */
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']>;
}

/**
 * Estratégia para operador ILIKE (case-insensitive like)
 */
export class ILikeStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        return query.ilike(field, value as string);
    }
}

/**
 * Estratégia para operador LIKE (case-sensitive like)
 */
export class LikeStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        return query.like(field, value as string);
    }
}

/**
 * Estratégia para operador GTE (greater than or equal)
 */
export class GteStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        return query.gte(field, value);
    }
}

/**
 * Estratégia para operador LTE (less than or equal)
 */
export class LteStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        return query.lte(field, value);
    }
}

/**
 * Estratégia para operador GT (greater than)
 */
export class GtStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        return query.gt(field, value);
    }
}

/**
 * Estratégia para operador LT (less than)
 */
export class LtStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        return query.lt(field, value);
    }
}

/**
 * Estratégia para operador EQ (equal)
 */
export class EqStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhereStrategy.ts:109',message:'EqStrategy.apply: entry',data:{hasQuery:!!query,queryType:typeof query,hasEq:typeof query?.eq === 'function',field,valueType:typeof value},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        if (!query || typeof query.eq !== 'function') {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhereStrategy.ts:115',message:'EqStrategy.apply: invalid query',data:{hasQuery:!!query,queryKeys:query ? Object.keys(query) : [],queryMethods:query ? Object.getOwnPropertyNames(Object.getPrototypeOf(query)) : []},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            throw new Error(`Invalid query object: query.eq is not a function. Query type: ${typeof query}, has query: ${!!query}`);
        }
        
        const result = query.eq(field, value);
        
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/60129495-f832-4b9c-89b3-ac58f147e9d1',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'WhereStrategy.ts:123',message:'EqStrategy.apply: success',data:{hasResult:!!result,resultType:typeof result},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        
        return result;
    }
}

/**
 * Estratégia para operador IN
 */
export class InStrategy implements IWhereStrategy {
    apply(
        query: ReturnType<SupabaseClient['from']>,
        field: string,
        value: unknown
    ): ReturnType<SupabaseClient['from']> {
        if (!Array.isArray(value)) {
            throw new Error(`IN operator requires an array, got ${typeof value}`);
        }
        return query.in(field, value);
    }
}

/**
 * Factory para criar estratégias baseadas no operador
 */
export class WhereStrategyFactory {
    private static strategies: Map<string, IWhereStrategy> = new Map([
        ['ilike', new ILikeStrategy()],
        ['like', new LikeStrategy()],
        ['gte', new GteStrategy()],
        ['lte', new LteStrategy()],
        ['gt', new GtStrategy()],
        ['lt', new LtStrategy()],
        ['eq', new EqStrategy()],
        ['in', new InStrategy()],
    ]);

    /**
     * Obtém a estratégia apropriada baseada no operador
     * @param operator - Nome do operador
     * @returns Estratégia correspondente ou null se não encontrada
     */
    static getStrategy(operator: string): IWhereStrategy | null {
        return this.strategies.get(operator) || null;
    }

    /**
     * Obtém a estratégia apropriada baseada na prioridade de operadores
     * @param valueObj - Objeto com valores de operadores
     * @returns Estratégia correspondente ou null se não encontrada
     */
    static getStrategyByPriority(valueObj: {
        ilike?: string;
        like?: string;
        gte?: unknown;
        lte?: unknown;
        gt?: unknown;
        lt?: unknown;
        eq?: unknown;
        in?: unknown[];
    }): IWhereStrategy | null {
        // Prioridade: operadores específicos primeiro
        if (valueObj.ilike !== undefined) {
            return this.getStrategy('ilike');
        }
        if (valueObj.like !== undefined) {
            return this.getStrategy('like');
        }
        if (valueObj.gte !== undefined) {
            return this.getStrategy('gte');
        }
        if (valueObj.lte !== undefined) {
            return this.getStrategy('lte');
        }
        if (valueObj.gt !== undefined) {
            return this.getStrategy('gt');
        }
        if (valueObj.lt !== undefined) {
            return this.getStrategy('lt');
        }
        if (valueObj.eq !== undefined) {
            return this.getStrategy('eq');
        }
        if (valueObj.in !== undefined && Array.isArray(valueObj.in)) {
            return this.getStrategy('in');
        }
        return null;
    }
}

