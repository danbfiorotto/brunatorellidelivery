import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Factory para criar instância do SupabaseClient
 * Centraliza criação do cliente para facilitar DI e testes
 */
export class DatabaseClientFactory {
    private static instance: SupabaseClient | null = null;

    /**
     * Cria ou retorna instância singleton do SupabaseClient
     * @param supabaseUrl - URL do projeto Supabase (opcional, usa env se não fornecido)
     * @param supabaseKey - Chave anon do Supabase (opcional, usa env se não fornecido)
     */
    static create(supabaseUrl?: string, supabaseKey?: string): SupabaseClient {
        if (this.instance) {
            return this.instance;
        }

        const url = supabaseUrl || import.meta.env.VITE_SUPABASE_URL;
        const key = supabaseKey || import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
            throw new Error('Supabase URL e Key são obrigatórios. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY');
        }

        this.instance = createClient(url, key);
        return this.instance;
    }

    /**
     * Reseta a instância (útil para testes)
     */
    static reset(): void {
        this.instance = null;
    }

    /**
     * Retorna instância existente ou cria nova
     */
    static getInstance(): SupabaseClient {
        return this.create();
    }
}





