import { ClinicStatus } from '../entities/Clinic';

/**
 * Constantes relacionadas a clínicas
 */
export const ClinicConstants = {
    /** Status padrão de clínica */
    DEFAULT_STATUS: 'active' as ClinicStatus,
    
    /** Tamanho máximo do campo de telefone */
    MAX_PHONE_LENGTH: 15
} as const;

