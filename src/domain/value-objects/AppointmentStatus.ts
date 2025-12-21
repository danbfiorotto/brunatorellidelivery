import { ValidationError } from '../errors/AppError';

export type AppointmentStatusValue = 'scheduled' | 'pending' | 'paid' | 'cancelled';

/**
 * Value Object para AppointmentStatus
 */
export class AppointmentStatus {
    private readonly _value: AppointmentStatusValue;

    /**
     * Cria uma instância de AppointmentStatus
     * @param value - Status ('scheduled', 'pending', 'paid', 'cancelled')
     * @param isPaid - Se está pago (para determinar status automaticamente)
     * @throws {ValidationError} Se status inválido
     */
    constructor(value: AppointmentStatusValue, isPaid: boolean = false) {
        // Se isPaid for true, status deve ser 'paid'
        if (isPaid && value !== 'paid') {
            this._value = 'paid';
        } else {
            if (!['scheduled', 'pending', 'paid', 'cancelled'].includes(value)) {
                throw new ValidationError({ status: value }, `Status inválido: ${value}`);
            }
            this._value = value;
        }
    }
    
    toString(): string {
        return this._value;
    }
    
    equals(other: AppointmentStatus): boolean {
        return other instanceof AppointmentStatus && this._value === other._value;
    }
    
    get isScheduled(): boolean {
        return this._value === 'scheduled';
    }
    
    get isPending(): boolean {
        return this._value === 'pending';
    }
    
    get isPaid(): boolean {
        return this._value === 'paid';
    }
    
    get isCancelled(): boolean {
        return this._value === 'cancelled';
    }
    
    /**
     * Factory methods
     */
    static scheduled(): AppointmentStatus {
        return new AppointmentStatus('scheduled');
    }
    
    static pending(): AppointmentStatus {
        return new AppointmentStatus('pending');
    }
    
    static paid(): AppointmentStatus {
        return new AppointmentStatus('paid', true);
    }
    
    static cancelled(): AppointmentStatus {
        return new AppointmentStatus('cancelled');
    }
    
    /**
     * Cria status a partir de valor
     */
    static create(value: AppointmentStatusValue, isPaid: boolean = false): AppointmentStatus {
        return new AppointmentStatus(value, isPaid);
    }
}

