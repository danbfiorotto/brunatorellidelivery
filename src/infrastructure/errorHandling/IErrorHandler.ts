import { AppError } from '../../domain/errors/AppError';

/**
 * Contexto de erro para logging
 */
export interface ErrorContext {
    [key: string]: unknown;
}

/**
 * Erro formatado para UI
 */
export interface UIError {
    message: string;
    code: string;
    statusCode: number;
    errors: Record<string, unknown> | null;
    retryAfter: number | null;
}

/**
 * Interface para handler de erros
 * Permite trocar implementação sem alterar código dependente
 */
export interface IErrorHandler {
    /**
     * Processa e transforma erros em AppError
     */
    handle(error: unknown, context?: ErrorContext): AppError;

    /**
     * Processa erro e retorna formato para UI
     */
    handleForUI(error: unknown, context?: ErrorContext): UIError;

    /**
     * Verifica se o erro é de validação
     */
    isValidationError(error: unknown): error is import('../../domain/errors/AppError').ValidationError;

    /**
     * Verifica se o erro é de autenticação
     */
    isAuthenticationError(error: unknown): error is import('../../domain/errors/AppError').AuthenticationError;

    /**
     * Verifica se o erro é de permissão
     */
    isPermissionError(error: unknown): error is import('../../domain/errors/AppError').PermissionError;

    /**
     * Verifica se o erro é de rate limit
     */
    isRateLimitError(error: unknown): error is import('../../domain/errors/AppError').RateLimitError;
}

