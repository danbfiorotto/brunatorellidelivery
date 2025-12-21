import { ITransactionManager, Transaction } from './ITransactionManager';
import { DatabaseAdapter } from './DatabaseAdapter';
import { ILogger } from '../logging/ILogger';
import { Logger } from '../logging/Logger';

/**
 * Implementação de TransactionManager para Supabase
 * 
 * ⚠️ LIMITAÇÃO: Supabase PostgREST não suporta transações multi-tabela nativamente
 * 
 * Estratégias possíveis:
 * 1. Usar RPC functions no banco que executam transações SQL
 * 2. Implementar compensação (Saga pattern) para operações críticas
 * 3. Usar stored procedures no PostgreSQL
 * 
 * Por enquanto, esta implementação simula transações usando RPC functions.
 * Para operações críticas, criar RPC functions no banco que executam transações SQL.
 */
export class SupabaseTransactionManager implements ITransactionManager {
    private db: DatabaseAdapter;
    private logger: ILogger;

    constructor(db: DatabaseAdapter, logger: ILogger | null = null) {
        this.db = db;
        this.logger = logger || new Logger();
    }

    /**
     * Executa uma função dentro de uma transação
     * 
     * ⚠️ NOTA: Para Supabase, transações reais devem ser implementadas via RPC functions
     * Esta implementação é um wrapper que pode ser usado para chamar RPC functions transacionais
     */
    async transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
        const txId = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Criar transação simulada
        // Em produção, isso chamaria uma RPC function que inicia uma transação SQL real
        const transaction: Transaction = {
            id: txId,
            execute: async (query: string, params?: unknown[]) => {
                // Para Supabase, queries diretas não são transacionais
                // Isso deve ser usado apenas com RPC functions que executam transações
                this.logger.warn('Direct query execution in transaction not supported. Use RPC functions for transactional operations.');
                throw new Error('Direct query execution in transaction not supported. Use RPC functions for transactional operations.');
            },
            commit: async () => {
                // Transação será commitada automaticamente pela RPC function
                this.logger.debug('Transaction committed', { txId });
            },
            rollback: async () => {
                // Transação será revertida automaticamente se houver erro na RPC function
                this.logger.debug('Transaction rolled back', { txId });
            }
        };

        try {
            const result = await callback(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            this.logger.error('Transaction failed', { txId, error });
            throw error;
        }
    }

    /**
     * Executa uma RPC function transacional
     * Use este método para operações que precisam ser atômicas
     * 
     * Exemplo de RPC function no banco:
     * ```sql
     * CREATE OR REPLACE FUNCTION create_appointment_with_patient(
     *   p_patient_data jsonb,
     *   p_appointment_data jsonb
     * ) RETURNS jsonb AS $$
     * DECLARE
     *   v_patient_id uuid;
     *   v_appointment_id uuid;
     * BEGIN
     *   -- Inserir paciente
     *   INSERT INTO patients (...) VALUES (...) RETURNING id INTO v_patient_id;
     *   
     *   -- Inserir agendamento
     *   INSERT INTO appointments (...) VALUES (...) RETURNING id INTO v_appointment_id;
     *   
     *   -- Retornar resultado
     *   RETURN jsonb_build_object('patient_id', v_patient_id, 'appointment_id', v_appointment_id);
     * END;
     * $$ LANGUAGE plpgsql;
     * ```
     */
    async executeTransactionalRPC<T = unknown>(
        functionName: string,
        params: Record<string, unknown> = {}
    ): Promise<T> {
        try {
            const result = await this.db.rpc(functionName, params);
            return result as T;
        } catch (error) {
            this.logger.error('Transactional RPC failed', { functionName, params, error });
            throw error;
        }
    }
}





