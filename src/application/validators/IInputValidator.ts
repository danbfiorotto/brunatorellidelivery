/**
 * Interface para validador de input
 * Permite trocar implementação sem alterar código dependente
 */
export interface IInputValidator<T> {
    /**
     * Valida dados de entrada
     * @param data - Dados a serem validados
     * @returns Dados validados
     * @throws {ValidationError} Se validação falhar
     */
    validate(data: unknown): Promise<T>;
}

