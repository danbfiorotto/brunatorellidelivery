import { IMiddleware, MiddlewareContext } from './IMiddleware';
import { IAuthClient } from '../../auth/IAuthClient';
import { AuthenticationError } from '../../../domain/errors/AppError';

/**
 * Middleware que verifica autenticação antes de executar operações
 * Lança AuthenticationError se usuário não estiver autenticado
 */
export class AuthMiddleware implements IMiddleware {
    constructor(private authClient: IAuthClient) {}

    async execute<T>(next: () => Promise<T>, context: MiddlewareContext): Promise<T> {
        const session = await this.authClient.getSession();
        
        if (!session) {
            throw new AuthenticationError('Usuário não autenticado');
        }

        // ✅ Adicionar userId ao context diretamente (mutação do objeto passado por referência)
        // Isso permite que próximos middlewares acessem o userId
        context.userId = session.user.id;

        return next();
    }
}

