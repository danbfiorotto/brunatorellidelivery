import { AppointmentStatusValue } from '../value-objects/AppointmentStatus';
import { PaymentTypeValue } from '../value-objects/PaymentType';
import { Currency } from '../value-objects/Money';

export interface AppointmentData {
    is_paid?: boolean;
    status?: AppointmentStatusValue;
    value?: number;
    payment_type?: PaymentTypeValue;
    payment_percentage?: number | null;
    clinic_id?: string | null;
    patient_id?: string;
    patient_name?: string;
    date?: string | Date;
    time?: string;
    procedure?: string;
    currency?: Currency;
    payment_date?: string | Date | null;
    clinical_evolution?: string | null;
    notes?: string | null;
}

export interface NormalizedAppointmentData {
    clinic_id: string | null;
    patient_id: string;
    date: string | Date;
    time: string;
    procedure: string;
    value: number;
    currency: Currency;
    payment_type: PaymentTypeValue;
    payment_percentage: number | null;
    is_paid: boolean;
    payment_date: string | Date | null;
    status: AppointmentStatusValue;
    clinical_evolution: string | null;
    notes: string | null;
}

/**
 * Serviço de domínio para lógica de negócio de agendamentos
 */
export class AppointmentDomainService {
    /**
     * Determina o status do agendamento baseado nos dados fornecidos
     */
    static determineStatus(appointmentData: AppointmentData): AppointmentStatusValue {
        // Se está pago, status é sempre 'paid'
        if (appointmentData.is_paid) {
            return 'paid';
        }

        // Se status é 'scheduled' e não está pago, muda para 'pending'
        if (appointmentData.status === 'scheduled' && !appointmentData.is_paid) {
            return 'pending';
        }

        // Retorna o status fornecido ou 'scheduled' como padrão
        return appointmentData.status || 'scheduled';
    }

    /**
     * Calcula o valor recebido baseado no tipo de pagamento
     */
    static calculateReceivedValue(appointment: AppointmentData): number {
        if (!appointment.value) {
            return 0;
        }

        if (appointment.payment_type === '100') {
            return parseFloat(String(appointment.value));
        }

        if (appointment.payment_type === 'percentage' && appointment.payment_percentage) {
            const percentage = parseFloat(String(appointment.payment_percentage));
            return (parseFloat(String(appointment.value)) * percentage) / 100;
        }

        return 0;
    }

    /**
     * Normaliza dados do agendamento para inserção/atualização
     */
    static normalizeAppointmentData(appointmentData: AppointmentData): NormalizedAppointmentData {
        const status = this.determineStatus(appointmentData);

        return {
            clinic_id: appointmentData.clinic_id || null,
            patient_id: appointmentData.patient_id || '',
            date: appointmentData.date || '',
            time: appointmentData.time || '',
            procedure: appointmentData.procedure || '',
            value: parseFloat(String(appointmentData.value)) || 0,
            currency: appointmentData.currency || 'BRL',
            payment_type: appointmentData.payment_type || '100',
            payment_percentage: appointmentData.payment_percentage 
                ? parseFloat(String(appointmentData.payment_percentage)) 
                : null,
            is_paid: appointmentData.is_paid || false,
            payment_date: appointmentData.is_paid && appointmentData.payment_date 
                ? appointmentData.payment_date 
                : null,
            status: status,
            clinical_evolution: appointmentData.clinical_evolution?.trim() || null,
            notes: appointmentData.notes?.trim() || null
        };
    }

    /**
     * Valida se um agendamento pode ser criado/atualizado
     */
    static validateAppointmentData(appointmentData: AppointmentData): {
        isValid: boolean;
        errors: Record<string, string>;
    } {
        const errors: Record<string, string> = {};

        if (!appointmentData.patient_id && !appointmentData.patient_name) {
            errors.patient = 'Paciente é obrigatório';
        }

        if (!appointmentData.date) {
            errors.date = 'Data é obrigatória';
        }

        if (!appointmentData.time) {
            errors.time = 'Hora é obrigatória';
        }

        if (!appointmentData.procedure || appointmentData.procedure.trim().length === 0) {
            errors.procedure = 'Procedimento é obrigatório';
        }

        if (appointmentData.value !== undefined && appointmentData.value !== null) {
            const numValue = parseFloat(String(appointmentData.value));
            if (isNaN(numValue) || numValue < 0) {
                errors.value = 'Valor deve ser um número positivo';
            }
        }

        if (appointmentData.payment_type === 'percentage') {
            if (!appointmentData.payment_percentage) {
                errors.payment_percentage = 'Percentual é obrigatório quando tipo é "percentage"';
            } else {
                const percentage = parseFloat(String(appointmentData.payment_percentage));
                if (isNaN(percentage) || percentage < 0 || percentage > 100) {
                    errors.payment_percentage = 'Percentual deve ser entre 0 e 100';
                }
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    /**
     * Valida se um appointment pode ser criado (regras de negócio contextuais)
     * ✅ Validação contextual movida da entidade para Domain Service
     * @param date - Data do appointment
     * @param allowPastDates - Se permite datas no passado (útil para histórico, importação)
     * @returns true se pode criar, false caso contrário
     */
    static canCreateAppointment(date: Date | string, allowPastDates: boolean = false): boolean {
        if (allowPastDates) {
            return true; // Permitir datas no passado se explicitamente autorizado
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const appointmentDate = new Date(date);
        appointmentDate.setHours(0, 0, 0, 0);
        
        return appointmentDate >= today;
    }
}

