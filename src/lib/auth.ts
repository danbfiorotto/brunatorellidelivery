import { Session } from '@supabase/supabase-js';

/**
 * @deprecated Use IAuthClient via DI ao invés destas funções
 * Estas funções serão removidas na próxima versão
 * 
 * Para usar em componentes React: use useDependencies() e container.resolve<IAuthClient>('authClient')
 * Para usar em serviços: injete IAuthClient via construtor
 */

// ⚠️ Estas funções ainda usam getContainer() que está deprecated
// Elas serão refatoradas para usar IAuthClient via DI
// Por enquanto, mantidas para compatibilidade

let authClientInstance: import('../infrastructure/auth/IAuthClient').IAuthClient | null = null;

/**
 * Obtém instância do authClient (lazy initialization)
 * ⚠️ Temporário - será removido quando todos os usos forem migrados
 */
async function getAuthClient(): Promise<import('../infrastructure/auth/IAuthClient').IAuthClient> {
    if (!authClientInstance) {
        // Importação dinâmica para evitar dependência circular
        const { setupDI } = await import('../infrastructure/di/setup');
        const container = setupDI();
        authClientInstance = container.resolve<import('../infrastructure/auth/IAuthClient').IAuthClient>('authClient');
    }
    return authClientInstance;
}

/**
 * Verifica se o usuário está autenticado
 * @deprecated Use IAuthClient.isAuthenticated() via DI
 */
export const isAuthenticated = async (): Promise<boolean> => {
    const client = await getAuthClient();
    return client.isAuthenticated();
};

/**
 * Obtém a sessão atual do usuário
 * @deprecated Use IAuthClient.getSession() via DI
 */
export const getSession = async (): Promise<Session | null> => {
    const client = await getAuthClient();
    return client.getSession();
};

/**
 * Requer autenticação, lança erro se não autenticado
 * @throws {Error} Se usuário não estiver autenticado
 * @deprecated Use IAuthClient.getSession() via DI e verifique se session !== null
 */
export const requireAuth = async (): Promise<Session> => {
    const session = await getSession();
    if (!session) {
        throw new Error('Usuário não autenticado');
    }
    return session;
};

/**
 * Atualiza a sessão se necessário
 * @deprecated Use IAuthClient.refreshSession() via DI
 */
export const refreshSession = async (): Promise<Session | null> => {
    const client = await getAuthClient();
    return client.refreshSession();
};

