/**
 * Type guards para validação de tipos em runtime
 * ✅ Garante type safety em runtime, não apenas em compile-time
 */

/**
 * Interface para resultados paginados
 */
export interface PaginationResult<T> {
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

/**
 * Verifica se um valor é um PaginationResult
 */
export function isPaginationResult<T>(value: unknown): value is PaginationResult<T> {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const obj = value as Record<string, unknown>;

    // Verificar se tem propriedade 'data' e é array
    if (!('data' in obj) || !Array.isArray(obj.data)) {
        return false;
    }

    // Verificar se tem propriedade 'pagination' e é objeto
    if (!('pagination' in obj) || typeof obj.pagination !== 'object' || obj.pagination === null) {
        return false;
    }

    const pagination = obj.pagination as Record<string, unknown>;

    // Verificar propriedades obrigatórias do pagination
    const requiredPaginationFields = ['page', 'pageSize', 'total', 'totalPages', 'hasNext', 'hasPrev'];
    for (const field of requiredPaginationFields) {
        if (!(field in pagination)) {
            return false;
        }
    }

    // Verificar tipos dos campos de pagination
    return (
        typeof pagination.page === 'number' &&
        typeof pagination.pageSize === 'number' &&
        typeof pagination.total === 'number' &&
        typeof pagination.totalPages === 'number' &&
        typeof pagination.hasNext === 'boolean' &&
        typeof pagination.hasPrev === 'boolean'
    );
}

/**
 * Extrai array de dados de um resultado que pode ser array ou PaginationResult
 */
export function extractArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
        return value;
    }

    if (isPaginationResult<T>(value)) {
        return value.data;
    }

    // Tentar extrair de objeto com propriedade 'data'
    if (typeof value === 'object' && value !== null) {
        const obj = value as { data?: unknown };
        if (Array.isArray(obj.data)) {
            return obj.data as T[];
        }
    }

    return [];
}

/**
 * Verifica se um valor é um array não vazio
 */
export function isNonEmptyArray<T>(value: unknown): value is T[] {
    return Array.isArray(value) && value.length > 0;
}

/**
 * Verifica se um valor é um objeto não nulo
 */
export function isNonNullObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

/**
 * Verifica se um valor é uma string não vazia
 */
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Verifica se um valor é um número válido
 */
export function isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}





