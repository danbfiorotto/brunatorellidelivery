import { useCallback } from 'react';
import { useToast } from '../components/UI/Toast';
import { ErrorHandler } from '../infrastructure/errorHandling/ErrorHandler';
import { logger } from '../lib/logger';
import { AppError } from '../domain/errors/AppError';

interface UseErrorHandlerReturn {
    handleError: (error: unknown, context?: string) => AppError;
    clearError: () => void;
}

/**
 * Hook para tratamento de erros na UI
 */
export const useErrorHandler = (): UseErrorHandlerReturn => {
    const { showError } = useToast();
    
    const handleError = useCallback((error: unknown, context: string = ''): AppError => {
        const appError = ErrorHandler.handle(error, { context });
        
        // Log para monitoramento
        logger.error(appError, { context });
        
        // Mostrar toast não-bloqueante
        let message = appError.message || 'Ocorreu um erro inesperado';
        
        // Mapear erros técnicos para mensagens amigáveis
        if (appError.code) {
            switch (appError.code) {
                case 'PGRST116':
                    message = 'Registro não encontrado';
                    break;
                case '23505': // Unique violation
                    message = 'Este registro já existe';
                    break;
                case '23503': // Foreign key violation
                    message = 'Não é possível excluir este registro pois está em uso';
                    break;
                case 'RATE_LIMIT_ERROR':
                case 'RATE_LIMIT': // Mantido para compatibilidade
                    message = 'Muitas requisições. Aguarde um momento.';
                    break;
                case 'AUTH_REQUIRED':
                case 'AUTH_ERROR':
                    message = 'Você precisa estar autenticado para realizar esta ação';
                    break;
                default:
                    if (appError.message) {
                        message = appError.message;
                    }
            }
        }
        
        // Se houver retryAfter, incluir na mensagem (especialmente para rate limit)
        const rateLimitError = appError as { retryAfter?: number };
        if (rateLimitError.retryAfter && rateLimitError.retryAfter > 0) {
            message += ` Tente novamente em ${rateLimitError.retryAfter} segundos.`;
        }
        
        showError(message, 'Erro');
        
        return appError;
    }, [showError]);
    
    const clearError = useCallback((): void => {
        // Implementar se necessário manter estado de erro
    }, []);
    
    return { handleError, clearError };
};

