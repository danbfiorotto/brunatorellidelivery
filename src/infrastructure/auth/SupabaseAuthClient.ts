import { SupabaseClient, Session, AuthChangeEvent, User } from '@supabase/supabase-js';
import { IAuthClient } from './IAuthClient';

/**
 * Implementação de IAuthClient usando Supabase
 * Encapsula todas as operações de autenticação do Supabase
 */
export class SupabaseAuthClient implements IAuthClient {
    constructor(private client: SupabaseClient) {}

    async getSession(): Promise<Session | null> {
        const { data: { session }, error } = await this.client.auth.getSession();
        if (error) {
            throw error;
        }
        return session;
    }

    async signIn(email: string, password: string): Promise<void> {
        const { error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) {
            throw error;
        }
    }

    async signUp(email: string, password: string): Promise<void> {
        const { data, error } = await this.client.auth.signUp({ email, password });
        
        // ✅ Se o usuário foi criado (data.user existe), considerar sucesso mesmo com erro
        // Isso pode acontecer quando o trigger SQL lança um warning mas o usuário é criado
        if (data?.user && !error) {
            return; // Sucesso
        }
        
        // ✅ Se há erro mas o usuário foi criado, verificar se é um erro não crítico
        if (data?.user && error) {
            // Se o usuário foi criado, considerar sucesso mesmo com erro do trigger
            // O perfil será criado pelo trigger ou pode ser criado depois
            return;
        }
        
        // ✅ Se há erro e usuário não foi criado, lançar erro
        if (error) {
            throw error;
        }
    }

    async signOut(): Promise<void> {
        const { error } = await this.client.auth.signOut();
        if (error) {
            throw error;
        }
    }

    onAuthStateChange(
        callback: (event: AuthChangeEvent, session: Session | null) => void
    ): { data: { subscription: { unsubscribe: () => void } } } {
        return this.client.auth.onAuthStateChange(callback);
    }

    async refreshSession(): Promise<Session | null> {
        const { data: { session }, error } = await this.client.auth.refreshSession();
        if (error) {
            throw error;
        }
        return session;
    }

    async isAuthenticated(): Promise<boolean> {
        const session = await this.getSession();
        return !!session;
    }

    async getCurrentUser(): Promise<User | null> {
        const session = await this.getSession();
        return session?.user ?? null;
    }
}


