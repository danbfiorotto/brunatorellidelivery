import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { Appointment } from '../../domain/entities/Appointment';
import { IAppointmentService } from './interfaces/IAppointmentService';
import { Currency } from '../../domain/value-objects/Money';
import { PaymentTypeValue } from '../../domain/value-objects/PaymentType';
import {
    ICreateAppointmentUseCase,
    IUpdateAppointmentUseCase,
    IDeleteAppointmentUseCase,
    IGetAppointmentUseCase,
    IGetAllAppointmentsUseCase,
    CreateAppointmentInput,
    UpdateAppointmentInput
} from '../use-cases/appointment';
import type { CreateAppointmentDTO as ZodCreateAppointmentDTO } from '../dto/schemas/AppointmentSchemas';

interface FindAllOptions {
    page?: number;
    pageSize?: number;
    filters?: Record<string, unknown>;
}

interface PaginationResult<T> {
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
 * DTO para criação de appointment
 * @deprecated Use CreateAppointmentInput from use-cases/appointment
 */
export interface CreateAppointmentDTO extends ZodCreateAppointmentDTO {
    currency?: Currency;
    paymentType?: PaymentTypeValue;
    allowPastDates?: boolean;
}

/**
 * Serviço para operações de agendamentos
 * ✅ Refatorado para usar Use Cases explícitos
 * ✅ Separação clara de responsabilidades
 */
export class AppointmentService implements IAppointmentService {
    constructor(
        private readonly createAppointmentUseCase: ICreateAppointmentUseCase,
        private readonly updateAppointmentUseCase: IUpdateAppointmentUseCase,
        private readonly deleteAppointmentUseCase: IDeleteAppointmentUseCase,
        private readonly getAppointmentUseCase: IGetAppointmentUseCase,
        private readonly getAllAppointmentsUseCase: IGetAllAppointmentsUseCase,
        private readonly repository: IAppointmentRepository,
        private readonly errorHandler: IErrorHandler
    ) {}

    /**
     * Busca todos os agendamentos
     * ✅ Usa GetAllAppointmentsUseCase para separação de responsabilidades
     */
    async getAll(options: FindAllOptions = {}): Promise<PaginationResult<Appointment>> {
        try {
            const result = await this.getAllAppointmentsUseCase.execute({ options });
            
            if (Array.isArray(result.appointments)) {
                return {
                    data: result.appointments,
                    pagination: {
                        page: 1,
                        pageSize: result.appointments.length,
                        total: result.appointments.length,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    }
                };
            }
            
            return result.appointments as PaginationResult<Appointment>;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.getAll' });
        }
    }

    /**
     * Busca um agendamento por ID
     * ✅ Usa GetAppointmentUseCase para separação de responsabilidades
     * @throws {NotFoundError} Se agendamento não encontrado
     */
    async getById(id: string): Promise<Appointment> {
        try {
            const result = await this.getAppointmentUseCase.execute({ id });
            return result.appointment;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.getById', id });
        }
    }

    /**
     * Busca agendamentos por paciente
     * ✅ Usa GetAllAppointmentsUseCase com filtros para consistência arquitetural
     */
    async getByPatientId(patientId: string): Promise<Appointment[]> {
        try {
            const result = await this.getAllAppointmentsUseCase.execute({
                options: {
                    filters: { patientId }
                }
            });
            
            return Array.isArray(result.appointments)
                ? result.appointments
                : result.appointments.data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.getByPatientId', patientId });
        }
    }

    /**
     * Busca agendamentos por clínica
     * ✅ Usa GetAllAppointmentsUseCase com filtros para consistência arquitetural
     */
    async getByClinicId(clinicId: string): Promise<Appointment[]> {
        try {
            const result = await this.getAllAppointmentsUseCase.execute({
                options: {
                    filters: { clinicId }
                }
            });
            
            return Array.isArray(result.appointments)
                ? result.appointments
                : result.appointments.data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.getByClinicId', clinicId });
        }
    }

    /**
     * Busca agendamentos por data
     * ✅ Usa GetAllAppointmentsUseCase com filtros para consistência arquitetural
     */
    async getByDate(date: string): Promise<Appointment[]> {
        try {
            const result = await this.getAllAppointmentsUseCase.execute({
                options: {
                    filters: { date: { eq: date } }
                }
            });
            
            return Array.isArray(result.appointments)
                ? result.appointments
                : result.appointments.data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.getByDate', date });
        }
    }

    /**
     * Busca agendamentos por intervalo de datas
     * ✅ Usa GetAllAppointmentsUseCase com filtros para consistência arquitetural
     */
    async getByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
        try {
            const result = await this.getAllAppointmentsUseCase.execute({
                options: {
                    filters: {
                        date: {
                            gte: startDate,
                            lte: endDate
                        }
                    }
                }
            });
            
            return Array.isArray(result.appointments)
                ? result.appointments
                : result.appointments.data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.getByDateRange', startDate, endDate });
        }
    }

    /**
     * Cria um novo agendamento
     * ✅ Usa CreateAppointmentUseCase para separação de responsabilidades
     */
    async create(appointmentData: CreateAppointmentDTO, allowPastDates: boolean = false): Promise<Appointment> {
        try {
            const result = await this.createAppointmentUseCase.execute({
                ...appointmentData,
                allowPastDates
            } as CreateAppointmentInput);
            return result.appointment;
        } catch (error) {
            throw this.errorHandler.handle(error, { 
                context: 'AppointmentService.create', 
                appointmentData 
            });
        }
    }

    /**
     * Atualiza um agendamento
     * ✅ Usa UpdateAppointmentUseCase para separação de responsabilidades
     */
    async update(id: string, appointmentData: Partial<CreateAppointmentDTO>): Promise<Appointment> {
        try {
            const result = await this.updateAppointmentUseCase.execute({
                id,
                ...appointmentData
            } as UpdateAppointmentInput);
            return result.appointment;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.update', id, appointmentData });
        }
    }

    /**
     * Deleta um agendamento
     * ✅ Usa DeleteAppointmentUseCase para separação de responsabilidades
     */
    async delete(id: string): Promise<void> {
        try {
            await this.deleteAppointmentUseCase.execute({ id });
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'AppointmentService.delete', id });
        }
    }
}

