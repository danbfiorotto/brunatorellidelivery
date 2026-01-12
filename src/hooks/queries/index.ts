/**
 * Exports de hooks de query para React Query
 * Centraliza todos os hooks de busca de dados
 */

export { 
    useAppointments, 
    useInfiniteAppointments, 
    useAppointment 
} from './useAppointments';

export { 
    useAppointmentTotals, 
    useAppointmentTotalsWithDefaults 
} from './useAppointmentTotals';

export { 
    useClinicsQuery, 
    usePatientsQuery, 
    useProceduresQuery, 
    useAllReferenceData,
    useClinics,
    usePatients,
    useProcedures
} from './useReferenceData';
