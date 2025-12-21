/**
 * Interface para middlewares que interceptam operações de repositório
 * Implementa o padrão Chain of Responsibility
 */
export interface IMiddleware<T = unknown> {
    /**
     * Executa o middleware antes de executar a operação
     * @param next - Função que executa a próxima operação na cadeia
     * @param context - Contexto da operação (tabela, operação, usuário, etc.)
     * @returns Resultado da operação
     */
    execute(next: () => Promise<T>, context: MiddlewareContext): Promise<T>;
}

/**
 * Contexto passado para middlewares
 * Contém informações sobre a operação sendo executada
 */
export interface MiddlewareContext {
    /**
     * Nome da tabela sendo acessada
     */
    tableName: string;

    /**
     * Nome da operação (ex: 'findAll', 'create', 'update', 'delete')
     */
    operation: string;

    /**
     * ID do usuário executando a operação (se autenticado)
     */
    userId?: string;

    /**
     * Dados adicionais específicos da operação
     */
    metadata?: Record<string, unknown>;
}





