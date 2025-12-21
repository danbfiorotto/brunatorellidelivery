import { ErrorHandler } from '../../infrastructure/errorHandling/ErrorHandler';
import { AppError } from '../../domain/errors/AppError';

interface ErrorContext {
    [key: string]: unknown;
}

interface UIError {
    message: string;
    code: string;
    statusCode: number;
    errors: Record<string, unknown> | null;
    retryAfter: number | null;
}

/**
 * Wrapper sobre ErrorHandler para padronizar tratamento de erros na camada de aplicação
 * Garante uso consistente do ErrorHandler em todos os services
 */
export class ApplicationErrorHandler {
    /**
     * Processa e transforma erros em AppError
     * Sempre usa ErrorHandler centralizado
     */
    static handle(error: unknown, context: ErrorContext): AppError {
        return ErrorHandler.handle(error, context);
    }
    
    /**
     * Processa erro e retorna formato para UI
     */
    static handleForUI(error: unknown, context: ErrorContext): UIError {
        return ErrorHandler.handleForUI(error, context);
    }
}




