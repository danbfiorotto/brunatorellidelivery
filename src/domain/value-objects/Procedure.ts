import { ValidationError } from '../errors/AppError';

/**
 * Value Object para Procedure
 */
export class Procedure {
    private readonly _value: string;

    /**
     * Cria uma instância de Procedure
     * @throws {ValidationError} Se procedimento inválido
     */
    constructor(value: string) {
        if (!value || typeof value !== 'string' || value.trim().length === 0) {
            throw new ValidationError({ procedure: value }, 'Procedimento é obrigatório');
        }
        if (value.trim().length > 255) {
            throw new ValidationError({ procedure: value }, 'Procedimento deve ter no máximo 255 caracteres');
        }
        this._value = value.trim();
    }
    
    toString(): string {
        return this._value;
    }
    
    equals(other: Procedure): boolean {
        return other instanceof Procedure && this._value === other._value;
    }
    
    /**
     * Factory method
     */
    static create(value: string): Procedure {
        return new Procedure(value);
    }
}

