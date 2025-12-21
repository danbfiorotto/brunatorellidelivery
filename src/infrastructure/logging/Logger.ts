import { ILogger } from './ILogger';

/**
 * Sanitiza erros removendo dados sensíveis
 */
const sanitizeError = (error: unknown): unknown => {
    if (typeof error === 'string') {
        return error;
    }
    
    if (error && typeof error === 'object') {
        const sanitized = { ...error as Record<string, unknown> };
        
        // Remover campos sensíveis
        const sensitiveFields = ['password', 'token', 'email', 'cpf', 'phone', 'address', 'clinical_evolution', 'notes', 'value', 'payment_date'];
        sensitiveFields.forEach(field => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });
        
        // Sanitizar mensagens de erro
        if (sanitized.message && typeof sanitized.message === 'string') {
            let message = sanitized.message;
            sensitiveFields.forEach(field => {
                const regex = new RegExp(field, 'gi');
                message = message.replace(regex, '[REDACTED]');
            });
            sanitized.message = message;
        }
        
        return sanitized;
    }
    
    return error;
};

/**
 * Implementação do Logger que só funciona em desenvolvimento
 * Pode ser injetada via DI para facilitar testes
 */
export class Logger implements ILogger {
    private isDevelopment: boolean;

    constructor(isDevelopment: boolean = import.meta.env.DEV || false) {
        this.isDevelopment = isDevelopment;
    }

    debug(...args: unknown[]): void {
        if (this.isDevelopment) {
            console.debug(...args);
        }
    }

    info(...args: unknown[]): void {
        if (this.isDevelopment) {
            console.info(...args);
        }
    }

    warn(...args: unknown[]): void {
        if (this.isDevelopment) {
            console.warn(...args);
        }
    }

    error(error: unknown, context: Record<string, unknown> = {}): void {
        // Sempre logar erros, mas sanitizar dados sensíveis
        const sanitizedError = sanitizeError(error);
        const sanitizedContext = sanitizeError(context);
        
        if (this.isDevelopment) {
            // Formatar erro corretamente para evitar "Object Object"
            let errorMessage = 'Unknown error';
            let errorStack: string | undefined;
            
            if (error instanceof Error) {
                errorMessage = error.message;
                errorStack = error.stack;
            } else if (typeof error === 'string') {
                errorMessage = error;
            } else if (error && typeof error === 'object') {
                try {
                    errorMessage = JSON.stringify(error, null, 2);
                } catch {
                    errorMessage = String(error);
                }
            }
            
            console.error('Error:', errorMessage, errorStack ? `\nStack: ${errorStack}` : '', sanitizedContext);
        } else {
            // Em produção, apenas logar mensagem genérica
            console.error('An error occurred');
            
            // Enviar para serviço de logging em produção (Sentry, etc.)
            // sendToLoggingService(sanitizedError, sanitizedContext);
        }
    }
}


