import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useDependencies } from '../useDependencies';
import { QUERY_KEYS, STALE_TIMES } from '../../lib/queryClient';
import { AppointmentTotals } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';

/**
 * Hook para buscar totais de appointments
 * Usa RPC server-side para cálculo eficiente
 * Refetch automático a cada 60 segundos
 */
export function useAppointmentTotals(
    queryOptions?: Omit<UseQueryOptions<AppointmentTotals, Error>, 'queryKey' | 'queryFn'>
) {
    const container = useDependencies();
    const appointmentService = container.resolve('appointmentService') as {
        getTotals: () => Promise<AppointmentTotals>;
    };
    
    return useQuery({
        queryKey: QUERY_KEYS.appointmentTotals,
        queryFn: async () => {
            return appointmentService.getTotals();
        },
        staleTime: STALE_TIMES.aggregations,
        // Refetch em background a cada 60 segundos
        refetchInterval: 60 * 1000,
        // Parar refetch quando janela não está visível
        refetchIntervalInBackground: false,
        ...queryOptions,
    });
}

/**
 * Hook para obter totais com valores padrão
 * Útil quando você precisa de valores mesmo durante loading
 */
export function useAppointmentTotalsWithDefaults(): AppointmentTotals & { isLoading: boolean } {
    const { data, isLoading } = useAppointmentTotals();
    
    return {
        total: data?.total ?? 0,
        received: data?.received ?? 0,
        pending: data?.pending ?? 0,
        totalValue: data?.totalValue ?? 0,
        byStatus: data?.byStatus ?? { scheduled: 0, pending: 0, paid: 0 },
        isLoading,
    };
}

export default useAppointmentTotals;
