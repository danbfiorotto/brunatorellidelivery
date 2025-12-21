import { Session, AuthChangeEvent, User } from '@supabase/supabase-js';

/**
 * Interface para abstração de cliente de autenticação
 * Permite trocar implementação sem afetar código de negócio
 */
export interface IAuthClient {
    /**
     * Obtém a sessão atual do usuário
     */
    getSession(): Promise<Session | null>;

    /**
     * Realiza login com email e senha
     * @throws {Error} Se credenciais inválidas
     */
    signIn(email: string, password: string): Promise<void>;

    /**
     * Cria uma nova conta de usuário
     * @throws {Error} Se email já existe ou dados inválidos
     */
    signUp(email: string, password: string): Promise<void>;

    /**
     * Realiza logout do usuário
     */
    signOut(): Promise<void>;

    /**
     * Observa mudanças no estado de autenticação
     * @returns Função para cancelar a observação
     */
    onAuthStateChange(
        callback: (event: AuthChangeEvent, session: Session | null) => void
    ): { data: { subscription: { unsubscribe: () => void } } };

    /**
     * Atualiza a sessão se necessário
     */
    refreshSession(): Promise<Session | null>;

    /**
     * Verifica se o usuário está autenticado
     */
    isAuthenticated(): Promise<boolean>;

    /**
     * Obtém o usuário atual
     */
    getCurrentUser(): Promise<User | null>;
}


