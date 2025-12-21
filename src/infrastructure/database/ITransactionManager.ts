/**
 * Interface para gerenciamento de transações
 * Permite abstrair implementação de transações do banco de dados
 */
export interface ITransactionManager {
    /**
     * Executa uma função dentro de uma transação
     * Se a função lançar erro, a transação é revertida automaticamente
     */
    transaction<T>(callback: (tx: Transaction) => Promise<T>): Promise<T>;
}

/**
 * Interface para uma transação ativa
 */
export interface Transaction {
    /**
     * ID único da transação
     */
    id: string;
    
    /**
     * Executa uma query dentro da transação
     */
    execute<T = unknown>(query: string, params?: unknown[]): Promise<T>;
    
    /**
     * Confirma a transação
     */
    commit(): Promise<void>;
    
    /**
     * Reverte a transação
     */
    rollback(): Promise<void>;
}





