import { logger } from '../../lib/logger';
import { 
    AppError, 
    ValidationError, 
    AuthenticationError, 
    PermissionError,
    DatabaseError,
    NotFoundError,
    RateLimitError
} from '../../domain/errors/AppError';
import { IErrorHandler, ErrorContext, UIError } from './IErrorHandler';

/**
 * Mapeamento de códigos de erro do Supabase
 */
const SUPABASE_ERROR_CODES = {
    AUTHENTICATION: ['PGRST301', 'PGRST302', '42501'],
    NOT_FOUND: ['PGRST116'],
    CONSTRAINT_VIOLATION: ['23505', '23503'],
    DATABASE: ['PGRST', '42']
} as const;

interface ErrorMatcher {
    test: (error: unknown) => boolean;
    transform: (error: unknown) => AppError;
}

/**
 * Matchers para diferentes tipos de erro
 */
const ERROR_MATCHERS: ErrorMatcher[] = [
    // Erro já é AppError
    {
        test: (error): error is AppError => error instanceof AppError,
        transform: (error) => error as AppError
    },
    // Erro do Supabase (PostgrestError)
    {
        test: (error): boolean => {
            const err = error as { code?: string; message?: string };
            return err?.code !== undefined && 
                   (err.code.startsWith('PGRST') || err.code.startsWith('42'));
        },
        transform: (error) => {
            const err = error as { code?: string; message?: string };
            
            // Verificar código específico
            if (err.code && SUPABASE_ERROR_CODES.AUTHENTICATION.some(code => err.code?.startsWith(code))) {
                return new AuthenticationError(err.message || 'Erro de autenticação');
            }
            
            if (err.code && SUPABASE_ERROR_CODES.NOT_FOUND.some(code => err.code === code)) {
                return new NotFoundError('Recurso', null);
            }
            
            if (err.code && SUPABASE_ERROR_CODES.CONSTRAINT_VIOLATION.some(code => err.code === code)) {
                return new ValidationError(
                    { constraint: err.message || 'Violação de constraint' },
                    'Erro de validação no banco de dados'
                );
            }
            
            // Erro genérico de banco
            return new DatabaseError('Erro ao acessar o banco de dados', error);
        }
    },
    // Erro de autenticação do Supabase Auth
    {
        test: (error): boolean => {
            const err = error as { message?: string; status?: number };
            return err?.status === 401 || 
                   err?.message?.toLowerCase().includes('jwt') ||
                   err?.message?.toLowerCase().includes('unauthorized');
        },
        transform: (error) => {
            const err = error as { message?: string };
            return new AuthenticationError(err.message || 'Não autenticado');
        }
    },
    // Erro de permissão
    {
        test: (error): boolean => {
            const err = error as { message?: string; status?: number };
            return err?.status === 403 || 
                   err?.message?.toLowerCase().includes('permission') ||
                   err?.message?.toLowerCase().includes('forbidden');
        },
        transform: (error) => {
            const err = error as { message?: string };
            return new PermissionError(err.message || 'Sem permissão');
        }
    },
    // Rate limit
    {
        test: (error): boolean => {
            const err = error as { message?: string; status?: number };
            return err?.status === 429 || 
                   err?.message?.toLowerCase().includes('rate limit') ||
                   err?.message?.toLowerCase().includes('muitas requisições');
        },
        transform: (error) => {
            const err = error as { message?: string; retryAfter?: number };
            return new RateLimitError(
                err.message || 'Muitas requisições. Aguarde um momento.',
                err.retryAfter || 60
            );
        }
    },
    // Not found
    {
        test: (error): boolean => {
            const err = error as { message?: string; status?: number; code?: string };
            return err?.status === 404 || 
                   err?.code === 'PGRST116' ||
                   err?.message?.toLowerCase().includes('not found') ||
                   err?.message?.toLowerCase().includes('não encontrado');
        },
        transform: (error) => {
            return new NotFoundError('Recurso', null);
        }
    }
];

/**
 * Handler centralizado de erros da aplicação
 */
export class ErrorHandler implements IErrorHandler {
    /**
     * Processa e transforma erros em AppError (método de instância)
     */
    handle(error: unknown, context: ErrorContext = {}): AppError {
        return ErrorHandler.handle(error, context);
    }

    /**
     * Processa erro e retorna formato para UI (método de instância)
     */
    handleForUI(error: unknown, context: ErrorContext = {}): UIError {
        return ErrorHandler.handleForUI(error, context);
    }

    /**
     * Verifica se o erro é de validação (método de instância)
     */
    isValidationError(error: unknown): error is ValidationError {
        return ErrorHandler.isValidationError(error);
    }

    /**
     * Verifica se o erro é de autenticação (método de instância)
     */
    isAuthenticationError(error: unknown): error is AuthenticationError {
        return ErrorHandler.isAuthenticationError(error);
    }

    /**
     * Verifica se o erro é de permissão (método de instância)
     */
    isPermissionError(error: unknown): error is PermissionError {
        return ErrorHandler.isPermissionError(error);
    }

    /**
     * Verifica se o erro é de rate limit (método de instância)
     */
    isRateLimitError(error: unknown): error is RateLimitError {
        return ErrorHandler.isRateLimitError(error);
    }

    /**
     * Processa e transforma erros em AppError (método estático)
     */
    static handle(error: unknown, context: ErrorContext = {}): AppError {
        // Se já é AppError, apenas logar e retornar
        if (error instanceof AppError) {
            logger.error(error, context);
            return error;
        }
        
        // Tentar encontrar matcher
        for (const matcher of ERROR_MATCHERS) {
            if (matcher.test(error)) {
                const appError = matcher.transform(error);
                logger.error(appError, { ...context, originalError: error });
                return appError;
            }
        }
        
        // Erro genérico
        const errorObj = error as { message?: string };
        const appError = new AppError(
            errorObj?.message || 'Erro desconhecido',
            'UNKNOWN_ERROR',
            500,
            error
        );
        logger.error(appError, { ...context, originalError: error });
        return appError;
    }

    /**
     * Processa erro e retorna formato para UI
     */
    static handleForUI(error: unknown, context: ErrorContext = {}): UIError {
        const appError = this.handle(error, context);
        
        return {
            message: appError.message,
            code: appError.code,
            statusCode: appError.statusCode,
            errors: (appError instanceof ValidationError ? appError.errors : null) as Record<string, unknown> | null,
            retryAfter: (appError instanceof RateLimitError ? appError.retryAfter : null)
        };
    }

    /**
     * Verifica se o erro é de validação
     */
    static isValidationError(error: unknown): error is ValidationError {
        return error instanceof ValidationError;
    }

    /**
     * Verifica se o erro é de autenticação
     */
    static isAuthenticationError(error: unknown): error is AuthenticationError {
        return error instanceof AuthenticationError;
    }

    /**
     * Verifica se o erro é de permissão
     */
    static isPermissionError(error: unknown): error is PermissionError {
        return error instanceof PermissionError;
    }

    /**
     * Verifica se o erro é de rate limit
     */
    static isRateLimitError(error: unknown): error is RateLimitError {
        return error instanceof RateLimitError;
    }
}

