import { ValidationError, DomainError } from '../errors/AppError';
import { Money } from './Money';

export type PaymentTypeValue = '100' | 'percentage';

/**
 * Value Object para PaymentType
 */
export class PaymentType {
    private readonly _type: PaymentTypeValue;
    private readonly _percentage: number | null;

    /**
     * Cria uma instância de PaymentType
     * @throws {ValidationError} Se tipo inválido
     */
    constructor(type: PaymentTypeValue, percentage: number | null = null) {
        if (!['100', 'percentage'].includes(type)) {
            throw new ValidationError({ type }, `Tipo de pagamento inválido: ${type}`);
        }
        if (type === 'percentage' && (percentage === null || percentage < 0 || percentage > 100)) {
            throw new ValidationError({ percentage }, 'Porcentagem deve estar entre 0 e 100');
        }
        
        this._type = type;
        this._percentage = type === 'percentage' ? percentage : null;
    }
    
    get type(): PaymentTypeValue {
        return this._type;
    }
    
    get percentage(): number | null {
        return this._percentage;
    }
    
    /**
     * Calcula o valor recebido baseado no tipo de pagamento
     */
    calculateReceivedValue(value: Money): Money {
        if (this._type === '100') {
            return value;
        }
        if (this._type === 'percentage' && this._percentage !== null) {
            return value.percentage(this._percentage);
        }
        throw new DomainError('Tipo de pagamento não suportado');
    }
    
    /**
     * Factory method
     */
    static create(type: PaymentTypeValue, percentage: number | null = null): PaymentType {
        return new PaymentType(type, percentage);
    }
    
    toJSON(): { type: PaymentTypeValue; percentage: number | null } {
        return {
            type: this._type,
            percentage: this._percentage
        };
    }
}

