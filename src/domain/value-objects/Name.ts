import { ValidationError } from '../errors/AppError';

/**
 * Value Object para Name
 */
export class Name {
    private readonly _value: string;

    /**
     * Cria uma instância de Name
     * @throws {ValidationError} Se nome inválido
     */
    constructor(value: string) {
        if (!Name.isValid(value)) {
            throw new ValidationError({ name: value }, `Nome inválido: ${value}`);
        }
        this._value = Name.normalize(value);
    }
    
    /**
     * Valida se um nome é válido
     */
    static isValid(name: unknown): name is string {
        if (!name || typeof name !== 'string') return false;
        const trimmed = name.trim();
        return trimmed.length >= 3 && trimmed.length <= 255;
    }
    
    /**
     * Normaliza um nome (trim e capitaliza primeira letra de cada palavra)
     */
    static normalize(name: string): string {
        return name
            .trim()
            .split(/\s+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    /**
     * Retorna o valor do nome como string
     */
    toString(): string {
        return this._value;
    }
    
    /**
     * Retorna o primeiro nome
     */
    get firstName(): string {
        return this._value.split(' ')[0];
    }
    
    /**
     * Retorna o último nome
     */
    get lastName(): string {
        const parts = this._value.split(' ');
        return parts.length > 1 ? parts[parts.length - 1] : '';
    }
    
    /**
     * Compara dois nomes
     */
    equals(other: Name): boolean {
        return other instanceof Name && this._value === other._value;
    }
    
    /**
     * Cria um Name a partir de um valor (factory method)
     */
    static create(value: string | null | undefined): Name | null {
        if (!value) return null;
        return new Name(value);
    }
}

