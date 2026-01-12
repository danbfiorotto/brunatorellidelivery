import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDependencies } from '../useDependencies';
import { QUERY_KEYS, invalidateAppointmentQueries } from '../../lib/queryClient';
import { Appointment } from '../../domain/entities/Appointment';
import { logger } from '../../lib/logger';

/**
 * Interface para dados de criação de appointment
 */
interface CreateAppointmentData {
    clinic_id?: string;
    patient_id: string;
    date: string;
    time: string;
    procedure: string;
    value: number;
    currency?: string;
    payment_type?: string;
    payment_percentage?: number;
    is_paid?: boolean;
    payment_date?: string;
    clinical_evolution?: string;
    notes?: string;
    patient_name?: string;
    patient_phone?: string;
    patient_email?: string;
}

/**
 * Interface para dados de atualização de appointment
 */
interface UpdateAppointmentData extends Partial<CreateAppointmentData> {
    id: string;
}

/**
 * Resultado paginado para cache snapshot
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
 * Hook para criar appointment com optimistic update
 */
export function useCreateAppointment() {
    const container = useDependencies();
    const queryClient = useQueryClient();
    const appointmentService = container.resolve('appointmentService') as {
        create: (data: CreateAppointmentData, allowPastDates?: boolean) => Promise<Appointment>;
    };
    
    return useMutation({
        mutationFn: async (data: CreateAppointmentData & { allowPastDates?: boolean }) => {
            const { allowPastDates, ...appointmentData } = data;
            return appointmentService.create(appointmentData, allowPastDates);
        },
        onMutate: async (newData) => {
            // Cancelar queries em andamento
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.appointments });
            
            // Snapshot do estado anterior
            const previousAppointments = queryClient.getQueryData(QUERY_KEYS.appointments);
            
            logger.debug('useCreateAppointment - Optimistic update', { newData });
            
            return { previousAppointments };
        },
        onError: (error, _newData, context) => {
            logger.error(error, { context: 'useCreateAppointment' });
            
            // Reverter para estado anterior em caso de erro
            if (context?.previousAppointments) {
                queryClient.setQueryData(QUERY_KEYS.appointments, context.previousAppointments);
            }
        },
        onSuccess: (data) => {
            logger.debug('useCreateAppointment - Success', { appointmentId: data.id });
        },
        onSettled: () => {
            // Invalidar queries para garantir dados atualizados
            invalidateAppointmentQueries();
        },
    });
}

/**
 * Hook para atualizar appointment com optimistic update
 */
export function useUpdateAppointment() {
    const container = useDependencies();
    const queryClient = useQueryClient();
    const appointmentService = container.resolve('appointmentService') as {
        update: (id: string, data: Partial<CreateAppointmentData>) => Promise<Appointment>;
    };
    
    return useMutation({
        mutationFn: async ({ id, ...data }: UpdateAppointmentData) => {
            return appointmentService.update(id, data);
        },
        onMutate: async (updatedData) => {
            // Cancelar queries em andamento
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.appointments });
            await queryClient.cancelQueries({ 
                queryKey: QUERY_KEYS.appointmentDetail(updatedData.id) 
            });
            
            // Snapshot do estado anterior
            const previousAppointments = queryClient.getQueryData(QUERY_KEYS.appointments);
            const previousDetail = queryClient.getQueryData(
                QUERY_KEYS.appointmentDetail(updatedData.id)
            );
            
            // Optimistic update na lista
            queryClient.setQueryData(
                QUERY_KEYS.appointments,
                (old: PaginatedResult<Appointment> | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.map(appointment =>
                            appointment.id === updatedData.id
                                ? { ...appointment, ...updatedData }
                                : appointment
                        ),
                    };
                }
            );
            
            logger.debug('useUpdateAppointment - Optimistic update', { 
                appointmentId: updatedData.id 
            });
            
            return { previousAppointments, previousDetail };
        },
        onError: (error, variables, context) => {
            logger.error(error, { 
                context: 'useUpdateAppointment', 
                appointmentId: variables.id 
            });
            
            // Reverter para estado anterior
            if (context?.previousAppointments) {
                queryClient.setQueryData(QUERY_KEYS.appointments, context.previousAppointments);
            }
            if (context?.previousDetail) {
                queryClient.setQueryData(
                    QUERY_KEYS.appointmentDetail(variables.id),
                    context.previousDetail
                );
            }
        },
        onSuccess: (data, variables) => {
            logger.debug('useUpdateAppointment - Success', { appointmentId: variables.id });
            
            // Atualizar cache do detalhe
            queryClient.setQueryData(
                QUERY_KEYS.appointmentDetail(variables.id),
                data
            );
        },
        onSettled: () => {
            invalidateAppointmentQueries();
        },
    });
}

/**
 * Hook para deletar appointment com optimistic update
 */
export function useDeleteAppointment() {
    const container = useDependencies();
    const queryClient = useQueryClient();
    const appointmentService = container.resolve('appointmentService') as {
        delete: (id: string) => Promise<void>;
    };
    
    return useMutation({
        mutationFn: async (id: string) => {
            return appointmentService.delete(id);
        },
        onMutate: async (id) => {
            // Cancelar queries em andamento
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.appointments });
            
            // Snapshot do estado anterior
            const previousAppointments = queryClient.getQueryData(QUERY_KEYS.appointments);
            
            // Optimistic update: remover da lista
            queryClient.setQueryData(
                QUERY_KEYS.appointments,
                (old: PaginatedResult<Appointment> | undefined) => {
                    if (!old) return old;
                    return {
                        ...old,
                        data: old.data.filter(appointment => appointment.id !== id),
                        pagination: {
                            ...old.pagination,
                            total: old.pagination.total - 1,
                        },
                    };
                }
            );
            
            logger.debug('useDeleteAppointment - Optimistic update', { appointmentId: id });
            
            return { previousAppointments };
        },
        onError: (error, id, context) => {
            logger.error(error, { context: 'useDeleteAppointment', appointmentId: id });
            
            // Reverter para estado anterior
            if (context?.previousAppointments) {
                queryClient.setQueryData(QUERY_KEYS.appointments, context.previousAppointments);
            }
        },
        onSuccess: (_data, id) => {
            logger.debug('useDeleteAppointment - Success', { appointmentId: id });
            
            // Remover do cache de detalhe
            queryClient.removeQueries({ 
                queryKey: QUERY_KEYS.appointmentDetail(id) 
            });
        },
        onSettled: () => {
            invalidateAppointmentQueries();
        },
    });
}

export default {
    useCreateAppointment,
    useUpdateAppointment,
    useDeleteAppointment,
};
