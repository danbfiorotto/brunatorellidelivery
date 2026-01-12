import { QueryClient } from '@tanstack/react-query';
import { logger } from './logger';

/**
 * Configuração do QueryClient para React Query
 * 
 * Otimizado para:
 * - Reduzir requisições desnecessárias
 * - Melhorar UX com dados stale-while-revalidate
 * - Retry inteligente com backoff exponencial
 * - Cache eficiente em memória
 */

/**
 * TTL padrões para diferentes tipos de dados
 */
export const STALE_TIMES = {
    /** Listas paginadas - 30 segundos */
    lists: 30 * 1000,
    /** Dados de referência (clinics, patients, procedures) - 30 minutos */
    reference: 30 * 60 * 1000,
    /** Totais e agregações - 60 segundos */
    aggregations: 60 * 1000,
    /** Detalhes de item individual - 5 minutos */
    detail: 5 * 60 * 1000,
} as const;

/**
 * Query keys para consistência e invalidação
 */
export const QUERY_KEYS = {
    appointments: ['appointments'] as const,
    appointmentTotals: ['appointments', 'totals'] as const,
    appointmentDetail: (id: string) => ['appointments', 'detail', id] as const,
    clinics: ['clinics'] as const,
    patients: ['patients'] as const,
    procedures: ['procedures'] as const,
    dashboard: ['dashboard'] as const,
    reports: ['reports'] as const,
} as const;

/**
 * Função de retry com backoff exponencial
 */
function retryDelay(attemptIndex: number): number {
    return Math.min(1000 * 2 ** attemptIndex, 30000);
}

/**
 * Determina se deve fazer retry baseado no erro
 */
function shouldRetry(failureCount: number, error: Error): boolean {
    // Não fazer retry para erros de autenticação
    if (error.message?.includes('auth') || error.message?.includes('401')) {
        return false;
    }
    
    // Não fazer retry para erros de permissão
    if (error.message?.includes('permission') || error.message?.includes('403')) {
        return false;
    }
    
    // Não fazer retry para erros de validação
    if (error.message?.includes('validation') || error.message?.includes('400')) {
        return false;
    }
    
    // Retry até 2 vezes para outros erros
    return failureCount < 2;
}

/**
 * QueryClient configurado com defaults otimizados
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Tempo antes de considerar dados "stale" (padrão para listas)
            staleTime: STALE_TIMES.lists,
            
            // Tempo que dados ficam em cache após não serem mais usados
            gcTime: 5 * 60 * 1000, // 5 minutos
            
            // Retry com backoff exponencial
            retry: shouldRetry,
            retryDelay,
            
            // Não refetch automaticamente ao focar a janela
            // (evita requisições desnecessárias em apps mobile)
            refetchOnWindowFocus: false,
            
            // Não refetch ao reconectar (evita múltiplas requisições)
            refetchOnReconnect: false,
            
            // Refetch em background para dados stale
            refetchOnMount: 'always',
            
            // Manter dados anteriores durante refetch
            placeholderData: (previousData: unknown) => previousData,
        },
        mutations: {
            // Retry apenas uma vez para mutations
            retry: 1,
            retryDelay: 1000,
            
            // Handler global para erros de mutation
            onError: (error: Error) => {
                logger.error(error, { context: 'React Query Mutation Error' });
            },
        },
    },
});

/**
 * Helper para invalidar queries relacionadas a appointments
 */
export function invalidateAppointmentQueries() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointments });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.appointmentTotals });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboard });
}

/**
 * Helper para invalidar queries de dados de referência
 */
export function invalidateReferenceQueries() {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.clinics });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.patients });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.procedures });
}

/**
 * Helper para pré-carregar dados de referência
 */
export async function prefetchReferenceData(
    fetchClinics: () => Promise<unknown>,
    fetchPatients: () => Promise<unknown>,
    fetchProcedures: () => Promise<unknown>
) {
    await Promise.all([
        queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.clinics,
            queryFn: fetchClinics,
            staleTime: STALE_TIMES.reference,
        }),
        queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.patients,
            queryFn: fetchPatients,
            staleTime: STALE_TIMES.reference,
        }),
        queryClient.prefetchQuery({
            queryKey: QUERY_KEYS.procedures,
            queryFn: fetchProcedures,
            staleTime: STALE_TIMES.reference,
        }),
    ]);
}

export default queryClient;
