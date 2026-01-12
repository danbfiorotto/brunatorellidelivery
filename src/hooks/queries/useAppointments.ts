import { useQuery, useInfiniteQuery, UseQueryOptions } from '@tanstack/react-query';
import { useDependencies } from '../useDependencies';
import { QUERY_KEYS, STALE_TIMES } from '../../lib/queryClient';
import { Appointment } from '../../domain/entities/Appointment';

/**
 * Interface para opções de busca de appointments
 */
interface AppointmentQueryOptions {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, unknown>;
}

/**
 * Interface para resultado paginado
 */
interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Hook para buscar appointments com paginação
 * Usa React Query para cache e refetch automático
 */
export function useAppointments(
    options: AppointmentQueryOptions = {},
    queryOptions?: Omit<UseQueryOptions<PaginatedResult<Appointment>, Error>, 'queryKey' | 'queryFn'>
) {
    const container = useDependencies();
    const appointmentService = container.resolve('appointmentService') as {
        getAll: (options: AppointmentQueryOptions) => Promise<PaginatedResult<Appointment>>;
    };
    
    const queryKey = [...QUERY_KEYS.appointments, options] as const;
    
    return useQuery({
        queryKey,
        queryFn: async () => {
            const result = await appointmentService.getAll(options);
            return result;
        },
        staleTime: STALE_TIMES.lists,
        ...queryOptions,
    });
}

/**
 * Hook para buscar appointments com scroll infinito
 * Útil para listas muito longas
 */
export function useInfiniteAppointments(
    options: Omit<AppointmentQueryOptions, 'page'> = {}
) {
    const container = useDependencies();
    const appointmentService = container.resolve('appointmentService') as {
        getAll: (options: AppointmentQueryOptions) => Promise<PaginatedResult<Appointment>>;
    };
    
    const pageSize = options.pageSize || 50;
    
    return useInfiniteQuery({
        queryKey: [...QUERY_KEYS.appointments, 'infinite', options] as const,
        queryFn: async ({ pageParam = 1 }) => {
            const result = await appointmentService.getAll({
                ...options,
                page: pageParam,
                pageSize,
            });
            return result;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.pagination.hasNext) {
                return lastPage.pagination.page + 1;
            }
            return undefined;
        },
        staleTime: STALE_TIMES.lists,
    });
}

/**
 * Hook para buscar um appointment específico por ID
 */
export function useAppointment(
    id: string | undefined,
    queryOptions?: Omit<UseQueryOptions<Appointment | null, Error>, 'queryKey' | 'queryFn'>
) {
    const container = useDependencies();
    const appointmentService = container.resolve('appointmentService') as {
        getById: (id: string) => Promise<Appointment>;
    };
    
    return useQuery({
        queryKey: QUERY_KEYS.appointmentDetail(id || ''),
        queryFn: async () => {
            if (!id) return null;
            return appointmentService.getById(id);
        },
        enabled: !!id,
        staleTime: STALE_TIMES.detail,
        ...queryOptions,
    });
}

export default useAppointments;
