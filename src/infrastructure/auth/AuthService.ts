import { IAuthService } from './IAuthService';
import { IAuthClient } from './IAuthClient';
import { AuthenticationError } from '../../domain/errors/AppError';

/**
 * Serviço de autenticação
 * Encapsula lógica de autenticação usada em services
 */
export class AuthService implements IAuthService {
    constructor(private authClient: IAuthClient) {}

    /**
     * Obtém o ID do usuário atual
     * @throws {AuthenticationError} Se usuário não estiver autenticado
     */
    async getCurrentUserId(): Promise<string> {
        const session = await this.authClient.getSession();
        if (!session?.user?.id) {
            throw new AuthenticationError('Usuário não autenticado');
        }
        return session.user.id;
    }

    /**
     * Verifica se o usuário está autenticado
     */
    async isAuthenticated(): Promise<boolean> {
        return this.authClient.isAuthenticated();
    }
}

