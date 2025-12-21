import { Time } from '../value-objects/Time';
import { Money, Currency } from '../value-objects/Money';
import { Procedure } from '../value-objects/Procedure';
import { PaymentType, PaymentTypeValue } from '../value-objects/PaymentType';
import { AppointmentStatus, AppointmentStatusValue } from '../value-objects/AppointmentStatus';
import { DomainError } from '../errors/AppError';

export interface AppointmentProps {
    id: string;
    patientId: string;
    clinicId: string;
    date: string | Date;
    time: string;
    procedure: string;
    value: number;
    currency?: Currency;
    paymentType?: PaymentTypeValue;
    paymentPercentage?: number | null;
    isPaid?: boolean;
    paymentDate?: string | Date | null;
    status?: AppointmentStatusValue;
    clinicalEvolution?: string | null;
    notes?: string | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface AppointmentJSON {
    id: string;
    patient_id: string;
    clinic_id: string;
    date: string;
    time: string;
    procedure: string;
    value: number;
    currency: Currency;
    payment_type: PaymentTypeValue;
    payment_percentage: number | null;
    is_paid: boolean;
    payment_date: string | null;
    status: AppointmentStatusValue;
    clinical_evolution: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Entidade de Domínio: Appointment
 */
export class Appointment {
    private readonly _id: string;
    private readonly _patientId: string;
    private _clinicId: string; // ✅ Mutável para permitir atualização
    private _date: Date; // ✅ Mutável para permitir atualização
    private _time: Time; // ✅ Mutável para permitir atualização
    private _procedure: Procedure; // ✅ Mutável para permitir atualização
    private _value: Money; // ✅ Mutável para permitir atualização
    private _paymentType: PaymentType; // ✅ Mutável para permitir atualização
    private _isPaid: boolean;
    private _paymentDate: Date | null;
    private _status: AppointmentStatus;
    private _clinicalEvolution: string | null; // ✅ Mutável para permitir atualização
    private _notes: string | null; // ✅ Mutável para permitir atualização
    private readonly _createdAt: Date;
    private _updatedAt: Date;

    /**
     * Cria uma instância de Appointment
     */
    constructor({
        id,
        patientId,
        clinicId,
        date,
        time,
        procedure,
        value,
        currency = 'BRL',
        paymentType = '100',
        paymentPercentage = null,
        isPaid = false,
        paymentDate = null,
        status = 'scheduled',
        clinicalEvolution = null,
        notes = null,
        createdAt,
        updatedAt
    }: AppointmentProps) {
        this._id = id;
        this._patientId = patientId;
        this._clinicId = clinicId;
        // ✅ Corrigir problema de timezone: quando date é string 'YYYY-MM-DD', criar Date no timezone local
        this._date = this.parseDate(date);
        this._time = Time.create(time)!;
        this._procedure = Procedure.create(procedure);
        this._value = Money.create(value, currency);
        this._paymentType = PaymentType.create(paymentType, paymentPercentage);
        this._isPaid = isPaid;
        // ✅ Corrigir problema de timezone para paymentDate também
        this._paymentDate = paymentDate ? this.parseDate(paymentDate) : null;
        this._status = AppointmentStatus.create(status, isPaid);
        this._clinicalEvolution = clinicalEvolution;
        this._notes = notes;
        this._createdAt = createdAt ? new Date(createdAt) : new Date();
        this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
        
        this.validateInvariants();
    }
    
    /**
     * Parse date string ou Date object, tratando corretamente strings 'YYYY-MM-DD' no timezone local
     * Evita problema de timezone onde '2024-01-15' vira '2024-01-14' devido à conversão UTC
     */
    private parseDate(date: string | Date): Date {
        if (date instanceof Date) {
            return date;
        }
        
        // Se for string no formato 'YYYY-MM-DD', criar Date no timezone local
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
            const [year, month, day] = date.split('-').map(Number);
            // month - 1 porque Date usa índice 0-11 para meses
            return new Date(year, month - 1, day);
        }
        
        // Para outros formatos, usar new Date normalmente
        return new Date(date);
    }
    
    /**
     * Valida invariantes da entidade
     * ✅ Apenas valida formato e consistência, não regras de negócio contextuais
     * @throws {DomainError} Se invariantes violados
     */
    validateInvariants(): void {
        if (!this._patientId) {
            throw new DomainError('Paciente é obrigatório');
        }
        if (isNaN(this._date.getTime())) {
            throw new DomainError('Data inválida');
        }
        
        // ❌ Removido: validação de "não pode ser no passado"
        // Isso é regra de negócio contextual, não invariante da entidade
        // Validação contextual deve ser feita em Domain Service ou Application Service
        
        if (this._isPaid && !this._paymentDate) {
            throw new DomainError('Data de pagamento é obrigatória quando pago');
        }
    }
    
    // Getters
    get id(): string {
        return this._id;
    }
    
    get patientId(): string {
        return this._patientId;
    }
    
    get clinicId(): string {
        return this._clinicId;
    }
    
    get date(): Date {
        return this._date;
    }
    
    get time(): string {
        return this._time.toString();
    }
    
    get procedure(): string {
        return this._procedure.toString();
    }
    
    get value(): Money {
        return this._value;
    }
    
    get paymentType(): PaymentType {
        return this._paymentType;
    }
    
    get isPaid(): boolean {
        return this._isPaid;
    }
    
    get paymentDate(): Date | null {
        return this._paymentDate;
    }
    
    get status(): string {
        return this._status.toString();
    }
    
    get clinicalEvolution(): string | null {
        return this._clinicalEvolution;
    }
    
    get notes(): string | null {
        return this._notes;
    }
    
    get createdAt(): Date {
        return this._createdAt;
    }
    
    get updatedAt(): Date {
        return this._updatedAt;
    }
    
    /**
     * Marca o agendamento como pago
     */
    markAsPaid(paymentDate: Date | string = new Date()): void {
        if (this._isPaid) {
            throw new DomainError('Agendamento já está pago');
        }
        this._isPaid = true;
        // ✅ Usar parseDate para evitar problemas de timezone
        this._paymentDate = paymentDate instanceof Date ? paymentDate : this.parseDate(paymentDate);
        this._status = AppointmentStatus.paid();
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Calcula o valor recebido baseado no tipo de pagamento
     */
    calculateReceivedValue(): Money {
        return this._paymentType.calculateReceivedValue(this._value);
    }
    
    /**
     * Verifica se o agendamento pode ser cancelado
     */
    canBeCancelled(): boolean {
        const now = new Date();
        const appointmentDateTime = new Date(
            this._date.toISOString().split('T')[0] + 'T' + this._time.toString()
        );
        const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilAppointment >= 24; // Pode cancelar com 24h de antecedência
    }
    
    /**
     * Cancela o agendamento
     */
    cancel(): void {
        if (!this.canBeCancelled()) {
            throw new DomainError('Não é possível cancelar com menos de 24h de antecedência');
        }
        this._status = AppointmentStatus.cancelled();
        this._updatedAt = new Date();
    }
    
    /**
     * Atualiza dados do agendamento
     * ✅ Encapsula lógica de atualização na entidade
     * @throws {DomainError} Se atualização violar regras de negócio
     */
    update(data: {
        clinicId?: string;
        date?: string | Date;
        time?: string;
        procedure?: string;
        value?: number;
        currency?: Currency;
        paymentType?: PaymentTypeValue;
        paymentPercentage?: number | null;
        isPaid?: boolean;
        paymentDate?: string | Date | null;
        clinicalEvolution?: string | null;
        notes?: string | null;
    }): void {
        // Atualizar campos mutáveis
        if (data.clinicId !== undefined) {
            this._clinicId = data.clinicId;
        }
        if (data.date !== undefined) {
            const newDate = this.parseDate(data.date);
            if (isNaN(newDate.getTime())) {
                throw new DomainError('Data inválida');
            }
            this._date = newDate;
        }
        if (data.time !== undefined) {
            this._time = Time.create(data.time)!;
        }
        if (data.procedure !== undefined) {
            this._procedure = Procedure.create(data.procedure);
        }
        if (data.value !== undefined || data.currency !== undefined) {
            this._value = Money.create(
                data.value ?? this._value.amount,
                data.currency ?? this._value.currency
            );
        }
        if (data.paymentType !== undefined || data.paymentPercentage !== undefined) {
            this._paymentType = PaymentType.create(
                data.paymentType ?? this._paymentType.type,
                data.paymentPercentage ?? this._paymentType.percentage
            );
        }
        if (data.isPaid !== undefined) {
            this._isPaid = data.isPaid;
            if (data.isPaid && !this._paymentDate) {
                // ✅ Usar parseDate para evitar problemas de timezone
                this._paymentDate = data.paymentDate ? this.parseDate(data.paymentDate) : new Date();
            }
            // Atualizar status baseado em isPaid
            this._status = AppointmentStatus.create(
                data.isPaid ? 'paid' : (this._status.toString() as AppointmentStatusValue),
                data.isPaid
            );
        }
        if (data.paymentDate !== undefined) {
            // ✅ Usar parseDate para evitar problemas de timezone
            this._paymentDate = data.paymentDate ? this.parseDate(data.paymentDate) : null;
        }
        if (data.clinicalEvolution !== undefined) {
            this._clinicalEvolution = data.clinicalEvolution;
        }
        if (data.notes !== undefined) {
            this._notes = data.notes;
        }
        
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Factory method para criar Appointment
     */
    static create(data: Partial<AppointmentProps> & {
        patientId: string;
        clinicId: string;
        date: string | Date;
        time: string;
        procedure: string;
        value: number;
    }): Appointment {
        return new Appointment({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
        } as AppointmentProps);
    }
    
    /**
     * Serializa para JSON (formato do banco)
     */
    toJSON(): AppointmentJSON {
        // ✅ Usar método helper para formatar data no formato YYYY-MM-DD sem problemas de timezone
        const formatDateToISO = (date: Date): string => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        
        return {
            id: this._id,
            patient_id: this._patientId,
            clinic_id: this._clinicId,
            date: formatDateToISO(this._date), // ✅ Formato YYYY-MM-DD usando valores locais
            time: this._time.toString(),
            procedure: this._procedure.toString(),
            value: this._value.amount,
            currency: this._value.currency,
            payment_type: this._paymentType.type,
            payment_percentage: this._paymentType.percentage,
            is_paid: this._isPaid,
            payment_date: this._paymentDate ? formatDateToISO(this._paymentDate) : null,
            status: this._status.toString() as AppointmentStatusValue,
            clinical_evolution: this._clinicalEvolution,
            notes: this._notes,
            created_at: this._createdAt.toISOString(),
            updated_at: this._updatedAt.toISOString()
        };
    }
    
    /**
     * Deserializa do JSON (formato do banco)
     */
    static fromJSON(json: AppointmentJSON): Appointment {
        return new Appointment({
            id: json.id,
            patientId: json.patient_id,
            clinicId: json.clinic_id,
            date: json.date,
            time: json.time,
            procedure: json.procedure,
            value: json.value,
            currency: json.currency || 'BRL',
            paymentType: json.payment_type,
            paymentPercentage: json.payment_percentage,
            isPaid: json.is_paid,
            paymentDate: json.payment_date,
            status: json.status,
            clinicalEvolution: json.clinical_evolution,
            notes: json.notes,
            createdAt: json.created_at,
            updatedAt: json.updated_at
        });
    }
}

