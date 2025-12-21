import { ValidationError } from '../errors/AppError';

/**
 * Value Object para Phone
 */
export class Phone {
    private readonly _value: string;

    /**
     * Cria uma instância de Phone
     * @throws {ValidationError} Se telefone inválido
     */
    constructor(value: string) {
        if (!Phone.isValid(value)) {
            throw new ValidationError({ phone: value }, `Telefone inválido: ${value}`);
        }
        this._value = Phone.normalize(value);
    }
    
    /**
     * Valida se um telefone é válido
     */
    static isValid(phone: unknown): phone is string {
        if (!phone || typeof phone !== 'string') return false;
        const cleaned = phone.replace(/\D/g, '');
        return cleaned.length >= 10 && cleaned.length <= 11;
    }
    
    /**
     * Normaliza um telefone removendo caracteres não numéricos
     */
    static normalize(phone: string): string {
        return phone.replace(/\D/g, '');
    }
    
    /**
     * Retorna o valor do telefone como string
     */
    toString(): string {
        return this._value;
    }
    
    /**
     * Formata o telefone para exibição
     */
    format(): string {
        const cleaned = this._value;
        if (cleaned.length === 11) {
            return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        }
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    /**
     * Compara dois telefones
     */
    equals(other: Phone): boolean {
        return other instanceof Phone && this._value === other._value;
    }
    
    /**
     * Cria um Phone a partir de um valor (factory method)
     */
    static create(value: string | null | undefined): Phone | null {
        if (!value) return null;
        return new Phone(value);
    }
}

