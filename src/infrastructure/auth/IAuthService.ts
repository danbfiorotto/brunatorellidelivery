/**
 * Interface para serviço de autenticação
 * Encapsula lógica de autenticação usada em services
 */
export interface IAuthService {
    /**
     * Obtém o ID do usuário atual
     * @throws {AuthenticationError} Se usuário não estiver autenticado
     */
    getCurrentUserId(): Promise<string>;

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated(): Promise<boolean>;
}

