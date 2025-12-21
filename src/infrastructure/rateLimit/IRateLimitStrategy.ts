/**
 * Interface para estratégias de rate limiting
 * Permite diferentes limites por tipo de operação
 */
export interface IRateLimitStrategy {
    /**
     * Retorna o limite de requisições para uma operação
     */
    getLimit(operation: string): number;
    
    /**
     * Retorna a janela de tempo em segundos
     */
    getWindow(operation: string): number;
    
    /**
     * Verifica se a estratégia deve ser aplicada para uma operação
     */
    shouldApply(operation: string): boolean;
}




