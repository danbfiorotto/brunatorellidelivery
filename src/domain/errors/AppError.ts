/**
 * Classe base para erros da aplicação
 */
export class AppError extends Error {
    public readonly code: string;
    public readonly statusCode: number;
    public readonly details: unknown;
    public readonly timestamp: string;

    constructor(
        message: string,
        code: string = 'UNKNOWN_ERROR',
        statusCode: number = 500,
        details: unknown = null
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();
        
        // Manter stack trace limpo
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Converte o erro para um objeto serializável
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp
        };
    }
}

/**
 * Erro de validação
 */
export class ValidationError extends AppError {
    public readonly errors: Record<string, unknown>;

    constructor(errors: Record<string, unknown>, message: string = 'Dados inválidos') {
        super(message, 'VALIDATION_ERROR', 400, errors);
        this.errors = errors;
    }
}

/**
 * Erro de autenticação
 */
export class AuthenticationError extends AppError {
    constructor(message: string = 'Não autenticado') {
        super(message, 'AUTH_ERROR', 401);
    }
}

/**
 * Erro de permissão
 */
export class PermissionError extends AppError {
    constructor(message: string = 'Sem permissão para realizar esta ação') {
        super(message, 'PERMISSION_ERROR', 403);
    }
}

/**
 * Erro de rate limit
 */
export class RateLimitError extends AppError {
    public readonly retryAfter: number;

    constructor(message: string = 'Muitas requisições. Aguarde um momento.', retryAfter: number = 60) {
        super(message, 'RATE_LIMIT_ERROR', 429);
        this.retryAfter = retryAfter;
    }
}

/**
 * Erro de banco de dados
 */
export class DatabaseError extends AppError {
    public readonly originalError: unknown;

    constructor(message: string = 'Erro ao acessar o banco de dados', originalError: unknown = null) {
        super(message, 'DATABASE_ERROR', 500);
        this.originalError = originalError;
    }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends AppError {
    public readonly resource: string;
    public readonly id: string | null;

    constructor(resource: string = 'Recurso', id: string | null = null) {
        const message = id 
            ? `${resource} com ID ${id} não encontrado`
            : `${resource} não encontrado`;
        super(message, 'NOT_FOUND_ERROR', 404);
        this.resource = resource;
        this.id = id;
    }
}

/**
 * Erro de domínio (regras de negócio)
 */
export class DomainError extends AppError {
    constructor(message: string = 'Violação de regra de negócio') {
        super(message, 'DOMAIN_ERROR', 400);
    }
}

