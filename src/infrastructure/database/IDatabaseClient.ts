import { IQueryBuilder } from './IQueryBuilder';

/**
 * Interface para abstração de cliente de banco de dados
 * Remove acoplamento direto com SupabaseClient
 * Permite migração para outros bancos sem afetar código de negócio
 */
export interface IDatabaseClient {
    /**
     * Retorna um QueryBuilder para a tabela especificada
     */
    from(table: string): IQueryBuilder;
    
    /**
     * Executa uma função RPC (Remote Procedure Call)
     */
    rpc(functionName: string, params?: Record<string, unknown>): Promise<unknown>;
}




