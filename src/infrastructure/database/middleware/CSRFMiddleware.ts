import { IMiddleware, MiddlewareContext } from './IMiddleware';
import { getCSRFToken } from '../../../lib/csrf';

/**
 * Middleware que valida token CSRF para operações de mutação
 * Lança erro se token CSRF não for encontrado ou inválido
 */
export class CSRFMiddleware implements IMiddleware {
    execute<T>(next: () => Promise<T>, context: MiddlewareContext): Promise<T> {
        // Apenas validar CSRF para operações de mutação
        const mutationOperations = ['create', 'update', 'delete'];
        
        if (mutationOperations.includes(context.operation)) {
            if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
                // SSR/build - não validar
                return next();
            }
            
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }
        }

        return next();
    }
}





