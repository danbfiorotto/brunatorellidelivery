import { z, ZodSchema } from 'zod';
import { ISanitizer } from '../../infrastructure/sanitization/ISanitizer';
import { ValidationError } from '../../domain/errors/AppError';
import { IInputValidator } from './IInputValidator';

/**
 * Validador centralizado de input
 * Combina validação (Zod) e sanitização de forma consistente
 */
export class InputValidator implements IInputValidator<unknown> {
    constructor(
        private sanitizer: ISanitizer,
        private schemas: Map<string, ZodSchema>
    ) {}
    
    /**
     * Valida dados de entrada (implementação genérica)
     * Para validação com schema específico, use validateAndSanitize
     */
    async validate(data: unknown): Promise<unknown> {
        // Implementação genérica - para uso específico, criar validators especializados
        return data;
    }

    /**
     * Valida e sanitiza dados de entrada
     * @param data - Dados a serem validados
     * @param schemaName - Nome do schema a ser usado
     * @returns Dados validados e sanitizados
     * @throws {ValidationError} Se validação falhar
     */
    async validateAndSanitize<T>(
        data: unknown,
        schemaName: string
    ): Promise<T> {
        const schema = this.schemas.get(schemaName);
        if (!schema) {
            throw new Error(`Schema ${schemaName} not found`);
        }
        
        try {
            // Validar com Zod
            const validated = schema.parse(data);
            
            // Sanitizar campos de string
            const sanitized = this.sanitizer.validateAndSanitize(validated, schema) as T;
            
            return sanitized;
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    error.errors,
                    'Dados inválidos'
                );
            }
            throw error;
        }
    }
    
    /**
     * Registra um novo schema
     */
    registerSchema(name: string, schema: ZodSchema): void {
        this.schemas.set(name, schema);
    }
}

