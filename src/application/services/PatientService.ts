import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { Patient } from '../../domain/entities/Patient';
import { IPatientService } from './interfaces/IPatientService';
import {
    ICreatePatientUseCase,
    IUpdatePatientUseCase,
    IDeletePatientUseCase,
    IGetPatientUseCase,
    IGetAllPatientsUseCase,
    CreatePatientInput,
    UpdatePatientInput
} from '../use-cases/patient';
import { isPaginationResult } from '../../lib/typeGuards';

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
 * Serviço para operações de pacientes
 * ✅ Refatorado para usar Use Cases explícitos
 * ✅ Separação clara de responsabilidades
 */
export class PatientService implements IPatientService {
    constructor(
        private readonly createPatientUseCase: ICreatePatientUseCase,
        private readonly updatePatientUseCase: IUpdatePatientUseCase,
        private readonly deletePatientUseCase: IDeletePatientUseCase,
        private readonly getPatientUseCase: IGetPatientUseCase,
        private readonly getAllPatientsUseCase: IGetAllPatientsUseCase,
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly errorHandler: IErrorHandler
    ) {}

    /**
     * Busca todos os pacientes
     */
    async getAll(options: FindAllOptions = {}): Promise<Patient[] | PaginationResult<Patient>> {
        try {
            const result = await this.getAllPatientsUseCase.execute({ options });
            return result.patients;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.getAll' });
        }
    }

    /**
     * Busca um paciente por ID
     * @throws {NotFoundError} Se paciente não encontrado
     */
    async getById(id: string): Promise<Patient> {
        try {
            const result = await this.getPatientUseCase.execute({ id });
            return result.patient;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.getById', id });
        }
    }

    /**
     * Busca paciente por nome ou email
     * ✅ Usa GetAllPatientsUseCase com filtros no banco para melhor performance
     */
    async findByNameOrEmail(name: string, email: string | null = null): Promise<Patient | null> {
        try {
            const filters: Record<string, unknown> = {};
            
            // Construir filtros para busca no banco
            if (name) {
                filters.name = { ilike: `%${name}%` };
            }
            
            if (email) {
                filters.email = { eq: email };
            }
            
            const result = await this.getAllPatientsUseCase.execute({
                options: {
                    filters,
                    pageSize: 1 // Apenas primeiro resultado
                }
            });
            
            const patients = Array.isArray(result.patients)
                ? result.patients
                : result.patients.data;
            
            return patients[0] || null;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.findByNameOrEmail', name, email });
        }
    }

    /**
     * Cria um novo paciente
     * ✅ Usa CreatePatientUseCase para separação de responsabilidades
     */
    async create(patientData: unknown): Promise<Patient> {
        try {
            const result = await this.createPatientUseCase.execute(patientData as CreatePatientInput);
            return result.patient;
        } catch (error) {
            throw this.errorHandler.handle(error, { 
                context: 'PatientService.create', 
                patientData 
            });
        }
    }

    /**
     * Atualiza um paciente
     * ✅ Usa UpdatePatientUseCase para separação de responsabilidades
     */
    async update(id: string, patientData: unknown): Promise<Patient> {
        try {
            const result = await this.updatePatientUseCase.execute({
                id,
                ...(patientData as Omit<UpdatePatientInput, 'id'>)
            });
            return result.patient;
        } catch (error) {
            throw this.errorHandler.handle(error, { 
                context: 'PatientService.update', 
                id, 
                patientData 
            });
        }
    }

    /**
     * Deleta um paciente
     * ✅ Usa DeletePatientUseCase para separação de responsabilidades
     */
    async delete(id: string): Promise<void> {
        try {
            await this.deletePatientUseCase.execute({ id });
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.delete', id });
        }
    }
    
    /**
     * Busca pacientes com estatísticas agregadas
     */
    async getPatientsWithStats(options: {
        page?: number;
        pageSize?: number;
        orderBy?: string;
        orderDirection?: 'asc' | 'desc';
    }): Promise<{
        patients: Patient[];
        pagination: PaginationResult<Patient>['pagination'];
        totalAppointments: number;
    }> {
        try {
            const [patientsResult, appointmentsCount] = await Promise.all([
                this.getAll(options),
                this.getTotalAppointmentsCount()
            ]);
            
            const paginated = patientsResult as PaginationResult<Patient>;
            
            return {
                patients: paginated.data || [],
                pagination: paginated.pagination,
                totalAppointments: appointmentsCount
            };
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.getPatientsWithStats' });
        }
    }
    
    /**
     * Busca pacientes por termo de busca (filtro no banco)
     */
    async searchPatients(options: {
        searchTerm: string;
        page?: number;
        pageSize?: number;
    }): Promise<{
        patients: Patient[];
        pagination: PaginationResult<Patient>['pagination'];
    }> {
        try {
            // Usar getAllPatientsUseCase com filtros
            const result = await this.getAllPatientsUseCase.execute({
                options: {
                    page: options.page,
                    pageSize: options.pageSize,
                    filters: {
                        name: { ilike: `%${options.searchTerm}%` }
                    }
                }
            });
            
            const paginated = Array.isArray(result.patients)
                ? { data: result.patients, pagination: { page: 1, pageSize: result.patients.length, total: result.patients.length, totalPages: 1, hasNext: false, hasPrev: false } }
                : result.patients;
            
            return {
                patients: paginated.data || [],
                pagination: paginated.pagination
            };
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.searchPatients' });
        }
    }
    
    /**
     * Conta total de appointments usando AppointmentRepository
     * ✅ Usa AppointmentRepository injetado via DI
     * ✅ Usa type guard reutilizável
     */
    private async getTotalAppointmentsCount(): Promise<number> {
        try {
            // ✅ Usar AppointmentRepository injetado
            const result = await this.appointmentRepository.findAll({ limit: 1 });
            
            // ✅ Usar type guard reutilizável
            if (isPaginationResult<unknown>(result)) {
                return result.pagination.total;
            }
            
            // Se for array, retornar length
            return (result as unknown[]).length;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'PatientService.getTotalAppointmentsCount' });
        }
    }
    
    
}

