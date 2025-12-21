import { IDatabaseClient } from './IDatabaseClient';
import { DatabaseClientFactory } from './DatabaseClientFactory';
import { SupabaseClientAdapter } from './adapters/SupabaseClientAdapter';
import { QueryBuilder } from './QueryBuilder';

/**
 * Adaptador para abstrair acesso ao banco de dados
 * ✅ Usa IDatabaseClient ao invés de SupabaseClient diretamente
 * ✅ Remove acoplamento com implementação específica do Supabase
 */
export class DatabaseAdapter {
    private client: IDatabaseClient;

    /**
     * Cria uma instância do DatabaseAdapter
     * @param client - Cliente de banco de dados (opcional, cria SupabaseClientAdapter se não fornecido)
     */
    constructor(client: IDatabaseClient | null = null) {
        if (client) {
            this.client = client;
        } else {
            // Criar adapter do Supabase como padrão
            const supabaseClient = DatabaseClientFactory.getInstance();
            this.client = new SupabaseClientAdapter(supabaseClient);
        }
    }

    /**
     * Retorna um QueryBuilder para a tabela especificada
     */
    table(tableName: string): QueryBuilder {
        // QueryBuilder ainda precisa do SupabaseClient internamente
        // Mas isso é uma dependência interna, não exposta na interface pública
        
        // Verificar se o client tem o método getSupabaseClient (mais robusto que instanceof)
        if (typeof (this.client as SupabaseClientAdapter).getSupabaseClient !== 'function') {
            throw new Error(
                `DatabaseAdapter.table() requer SupabaseClientAdapter. ` +
                `Tipo recebido: ${this.client?.constructor?.name || typeof this.client}. ` +
                `Verifique a configuração do DI.`
            );
        }
        
        const supabaseClient = (this.client as SupabaseClientAdapter).getSupabaseClient();
        return new QueryBuilder(supabaseClient, tableName);
    }

    /**
     * Executa uma query raw (para casos especiais)
     * @throws {Error} Sempre, pois Supabase não suporta queries raw diretamente
     */
    async raw(_query: string, _params: unknown[] = []): Promise<never> {
        // Nota: Supabase não suporta queries raw diretamente
        // Este método pode ser usado para extensões futuras
        throw new Error('Raw queries não são suportadas. Use QueryBuilder.');
    }

    /**
     * Executa uma função RPC (Remote Procedure Call) no banco
     * Útil para chamar funções SQL definidas no banco
     * 
     * @throws {Error} Apenas para erros críticos (não para 404 quando função não existe)
     */
    async rpc(functionName: string, params: Record<string, unknown> = {}): Promise<unknown> {
        return this.client.rpc(functionName, params);
    }

    /**
     * Retorna o cliente de banco de dados (interface, não implementação)
     * ✅ Retorna IDatabaseClient ao invés de SupabaseClient
     */
    getClient(): IDatabaseClient {
        return this.client;
    }
}

/**
 * @deprecated Use DatabaseAdapter via DI ao invés deste singleton
 * Este export será removido na próxima versão
 * Use: container.resolve<DatabaseAdapter>('databaseAdapter')
 */
export const databaseAdapter = new DatabaseAdapter();

