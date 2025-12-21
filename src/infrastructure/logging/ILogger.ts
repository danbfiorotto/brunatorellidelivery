/**
 * Interface para o serviço de logging
 * Permite injeção de dependência e facilita testes
 */
export interface ILogger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (error: unknown, context?: Record<string, unknown>) => void;
}





