import { IAppointmentRepository } from '../../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { Appointment } from '../../../domain/entities/Appointment';

/**
 * Opções de busca para appointments
 */
export interface GetAllAppointmentsOptions {
    page?: number;
    pageSize?: number;
    orderBy?: string;
    orderDirection?: 'asc' | 'desc';
    filters?: Record<string, unknown>;
}

/**
 * Resultado paginado
 */
export interface PaginationResult<T> {
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
 * Input para busca de todos os appointments
 */
export interface GetAllAppointmentsInput {
    options?: GetAllAppointmentsOptions;
}

/**
 * Output do use case de busca de todos os appointments
 */
export interface GetAllAppointmentsOutput {
    appointments: Appointment[] | PaginationResult<Appointment>;
}

/**
 * Interface do use case de busca de todos os appointments
 */
export interface IGetAllAppointmentsUseCase {
    execute(input?: GetAllAppointmentsInput): Promise<GetAllAppointmentsOutput>;
}

/**
 * Use case para busca de todos os appointments
 */
export class GetAllAppointmentsUseCase implements IGetAllAppointmentsUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository
    ) {}

    /**
     * Executa o use case de busca de todos os appointments
     */
    async execute(input: GetAllAppointmentsInput = {}): Promise<GetAllAppointmentsOutput> {
        const result = await this.appointmentRepository.findAll(input.options || {});
        
        if (Array.isArray(result)) {
            return { appointments: result };
        }
        
        return { appointments: result as PaginationResult<Appointment> };
    }
}

