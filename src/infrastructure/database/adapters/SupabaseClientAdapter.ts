import { SupabaseClient } from '@supabase/supabase-js';
import { IDatabaseClient } from '../IDatabaseClient';
import { IQueryBuilder } from '../IQueryBuilder';
import { QueryBuilder } from '../QueryBuilder';

/**
 * Adapter que encapsula SupabaseClient implementando IDatabaseClient
 * Remove acoplamento direto com Supabase da camada de aplicação
 */
export class SupabaseClientAdapter implements IDatabaseClient {
    constructor(private supabaseClient: SupabaseClient) {}

    /**
     * Retorna um QueryBuilder para a tabela especificada
     * O QueryBuilder ainda usa SupabaseClient internamente, mas isso é encapsulado
     */
    from(table: string): IQueryBuilder {
        // QueryBuilder ainda usa SupabaseClient, mas isso é uma dependência interna
        // A interface IQueryBuilder abstrai isso
        return new QueryBuilder(this.supabaseClient, table) as unknown as IQueryBuilder;
    }

    /**
     * Executa uma função RPC (Remote Procedure Call)
     */
    async rpc(functionName: string, params: Record<string, unknown> = {}): Promise<unknown> {
        const { data, error } = await this.supabaseClient.rpc(functionName, params);
        
        if (error) {
            // Se função não existe (404) ou sem permissão (403), retornar null
            if (error.code === 'PGRST116' || error.code === '42883' || error.message?.includes('does not exist')) {
                return null;
            }
            
            if (error.code === '42501' || error.message?.includes('permission denied')) {
                return null;
            }
            
            throw new Error(`Erro ao executar RPC ${functionName}: ${error.message}`);
        }
        
        return data;
    }

    /**
     * Retorna o cliente Supabase subjacente (para casos especiais)
     * ⚠️ Use apenas quando absolutamente necessário
     * Prefira usar métodos do IDatabaseClient
     */
    getSupabaseClient(): SupabaseClient {
        return this.supabaseClient;
    }

    /**
     * Acessa o storage do Supabase (funcionalidade específica)
     * ⚠️ Use apenas para operações de storage que não podem ser abstraídas
     */
    getStorage() {
        return this.supabaseClient.storage;
    }
}

