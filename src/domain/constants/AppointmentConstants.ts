import { Currency } from '../value-objects/Money';
import { PaymentTypeValue } from '../value-objects/PaymentType';
import { AppointmentStatusValue } from '../value-objects/AppointmentStatus';

/**
 * Constantes relacionadas a agendamentos
 */
export const AppointmentConstants = {
    /** Tamanho máximo do campo de evolução clínica */
    MAX_CLINICAL_EVOLUTION_LENGTH: 10000,
    
    /** Tamanho máximo do campo de notas */
    MAX_NOTES_LENGTH: 5000,
    
    /** Moeda padrão */
    DEFAULT_CURRENCY: 'BRL' as Currency,
    
    /** Tipos de pagamento */
    PAYMENT_TYPES: {
        FULL: '100' as PaymentTypeValue,
        PERCENTAGE: 'percentage' as PaymentTypeValue
    },
    
    /** Status de agendamento */
    STATUS: {
        SCHEDULED: 'scheduled' as AppointmentStatusValue,
        PENDING: 'pending' as AppointmentStatusValue,
        PAID: 'paid' as AppointmentStatusValue
    },
    
    /** Status padrão */
    DEFAULT_STATUS: 'scheduled' as AppointmentStatusValue
} as const;

