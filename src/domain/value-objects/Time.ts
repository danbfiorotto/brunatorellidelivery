import { ValidationError } from '../errors/AppError';

/**
 * Value Object para Time (horário)
 */
export class Time {
    private readonly _value: string;

    /**
     * Cria uma instância de Time
     * @param value - Valor do horário (formato HH:mm ou HH:mm:ss)
     * @throws {ValidationError} Se horário inválido
     */
    constructor(value: string) {
        if (!Time.isValid(value)) {
            throw new ValidationError({ time: value }, `Horário inválido: ${value}`);
        }
        this._value = Time.normalize(value);
    }
    
    /**
     * Valida se um horário é válido
     */
    static isValid(time: unknown): time is string {
        if (!time || typeof time !== 'string') return false;
        const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
        return timeRegex.test(time.trim());
    }
    
    /**
     * Normaliza um horário para formato HH:mm
     */
    static normalize(time: string): string {
        const trimmed = time.trim();
        // Se tiver segundos, remover
        if (trimmed.length === 8) {
            return trimmed.slice(0, 5);
        }
        return trimmed;
    }
    
    /**
     * Retorna o valor do horário como string
     */
    toString(): string {
        return this._value;
    }
    
    /**
     * Retorna horas
     */
    get hours(): number {
        return parseInt(this._value.split(':')[0] || '0', 10);
    }
    
    /**
     * Retorna minutos
     */
    get minutes(): number {
        return parseInt(this._value.split(':')[1] || '0', 10);
    }
    
    /**
     * Compara dois horários
     */
    equals(other: Time): boolean {
        return other instanceof Time && this._value === other._value;
    }
    
    /**
     * Verifica se este horário é antes de outro
     */
    isBefore(other: Time): boolean {
        if (this.hours < other.hours) return true;
        if (this.hours === other.hours && this.minutes < other.minutes) return true;
        return false;
    }
    
    /**
     * Verifica se este horário é depois de outro
     */
    isAfter(other: Time): boolean {
        if (this.hours > other.hours) return true;
        if (this.hours === other.hours && this.minutes > other.minutes) return true;
        return false;
    }
    
    /**
     * Cria um Time a partir de um valor (factory method)
     */
    static create(value: string | null | undefined): Time | null {
        if (!value) return null;
        return new Time(value);
    }
}

