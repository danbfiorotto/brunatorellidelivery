import { ValidationError } from '../errors/AppError';

/**
 * Value Object para Email
 */
export class Email {
    private readonly _value: string;

    /**
     * Cria uma instância de Email
     * @throws {ValidationError} Se email inválido
     */
    constructor(value: string) {
        if (!Email.isValid(value)) {
            throw new ValidationError({ email: value }, `Email inválido: ${value}`);
        }
        this._value = value.toLowerCase().trim();
    }
    
    /**
     * Valida se um email é válido
     */
    static isValid(email: unknown): email is string {
        if (!email || typeof email !== 'string') return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.trim());
    }
    
    /**
     * Retorna o valor do email como string
     */
    toString(): string {
        return this._value;
    }
    
    /**
     * Compara dois emails
     */
    equals(other: Email): boolean {
        return other instanceof Email && this._value === other._value;
    }
    
    /**
     * Retorna o domínio do email
     */
    get domain(): string {
        return this._value.split('@')[1] || '';
    }
    
    /**
     * Retorna a parte local do email
     */
    get localPart(): string {
        return this._value.split('@')[0] || '';
    }
    
    /**
     * Cria um Email a partir de um valor (factory method)
     */
    static create(value: string | null | undefined): Email | null {
        if (!value) return null;
        return new Email(value);
    }
}

