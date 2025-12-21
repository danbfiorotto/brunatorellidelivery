import { IMiddleware, MiddlewareContext } from './IMiddleware';
import { IAuthClient } from '../../auth/IAuthClient';
import { RateLimitError } from '../../../domain/errors/AppError';
import { apiRateLimiter } from '../../../lib/rateLimiter';

/**
 * Middleware que verifica rate limiting antes de executar operações
 * Lança RateLimitError se limite de requisições for excedido
 */
export class RateLimitMiddleware implements IMiddleware {
    constructor(private authClient: IAuthClient) {}

    async execute<T>(next: () => Promise<T>, context: MiddlewareContext): Promise<T> {
        const session = await this.authClient.getSession();
        const userId = session?.user?.id || context.userId || 'anonymous';
        
        if (!apiRateLimiter.canMakeRequest(userId)) {
            throw new RateLimitError('Muitas requisições. Aguarde um momento.');
        }

        return next();
    }
}





