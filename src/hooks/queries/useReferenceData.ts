import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useDependencies } from '../useDependencies';
import { QUERY_KEYS, STALE_TIMES } from '../../lib/queryClient';

/**
 * Interface para Clinic
 */
interface Clinic {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
}

/**
 * Interface para Patient
 */
interface Patient {
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
}

/**
 * Interface para Procedure
 */
interface Procedure {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    is_active?: boolean;
    display_order?: number;
}

/**
 * Interface genérica para resultado paginado
 */
interface PaginatedResult<T> {
    data: T[];
    pagination?: unknown;
}

/**
 * Extrai array de dados de resultado paginado ou array direto
 */
function extractData<T>(result: T[] | PaginatedResult<T> | null): T[] {
    if (!result) return [];
    if (Array.isArray(result)) return result;
    return result.data || [];
}

/**
 * Hook para buscar clínicas com cache de longa duração
 * TTL de 30 minutos pois dados de referência mudam pouco
 */
export function useClinicsQuery(
    queryOptions?: Omit<UseQueryOptions<Clinic[], Error>, 'queryKey' | 'queryFn'>
) {
    const container = useDependencies();
    const clinicService = container.resolve('clinicService') as {
        getAll: () => Promise<Clinic[] | PaginatedResult<Clinic>>;
    };
    
    return useQuery({
        queryKey: QUERY_KEYS.clinics,
        queryFn: async () => {
            const result = await clinicService.getAll();
            return extractData(result);
        },
        staleTime: STALE_TIMES.reference,
        gcTime: STALE_TIMES.reference * 2, // Manter em cache por 1 hora
        ...queryOptions,
    });
}

/**
 * Hook para buscar pacientes com cache de longa duração
 */
export function usePatientsQuery(
    queryOptions?: Omit<UseQueryOptions<Patient[], Error>, 'queryKey' | 'queryFn'>
) {
    const container = useDependencies();
    const patientService = container.resolve('patientService') as {
        getAll: () => Promise<Patient[] | PaginatedResult<Patient>>;
    };
    
    return useQuery({
        queryKey: QUERY_KEYS.patients,
        queryFn: async () => {
            const result = await patientService.getAll();
            return extractData(result);
        },
        staleTime: STALE_TIMES.reference,
        gcTime: STALE_TIMES.reference * 2,
        ...queryOptions,
    });
}

/**
 * Hook para buscar procedimentos com cache de longa duração
 */
export function useProceduresQuery(
    queryOptions?: Omit<UseQueryOptions<Procedure[], Error>, 'queryKey' | 'queryFn'>
) {
    const container = useDependencies();
    const procedureService = container.resolve('procedureService') as {
        getAll: () => Promise<Procedure[] | PaginatedResult<Procedure>>;
    };
    
    return useQuery({
        queryKey: QUERY_KEYS.procedures,
        queryFn: async () => {
            const result = await procedureService.getAll();
            return extractData(result);
        },
        staleTime: STALE_TIMES.reference,
        gcTime: STALE_TIMES.reference * 2,
        ...queryOptions,
    });
}

/**
 * Hook composto para buscar todos os dados de referência
 * Útil para componentes que precisam de múltiplos dados
 */
export function useAllReferenceData() {
    const clinicsQuery = useClinicsQuery();
    const patientsQuery = usePatientsQuery();
    const proceduresQuery = useProceduresQuery();
    
    return {
        clinics: clinicsQuery.data ?? [],
        patients: patientsQuery.data ?? [],
        procedures: proceduresQuery.data ?? [],
        isLoading: clinicsQuery.isLoading || patientsQuery.isLoading || proceduresQuery.isLoading,
        isError: clinicsQuery.isError || patientsQuery.isError || proceduresQuery.isError,
        error: clinicsQuery.error || patientsQuery.error || proceduresQuery.error,
        refetchAll: () => {
            clinicsQuery.refetch();
            patientsQuery.refetch();
            proceduresQuery.refetch();
        },
    };
}

export { useClinicsQuery as useClinics };
export { usePatientsQuery as usePatients };
export { useProceduresQuery as useProcedures };
