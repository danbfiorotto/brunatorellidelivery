import { AppointmentRepository } from '../infrastructure/repositories/implementations/AppointmentRepository';
import { PatientRepository } from '../infrastructure/repositories/implementations/PatientRepository';
import { IAppointmentRepository } from '../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IPatientRepository } from '../infrastructure/repositories/interfaces/IPatientRepository';
import { AppointmentDomainService } from '../domain/services/AppointmentDomainService';
import { PatientDomainService } from '../domain/services/PatientDomainService';
import { logAction } from '../lib/audit';
import { logger } from '../lib/logger';
import { ErrorHandler } from '../infrastructure/errorHandling/ErrorHandler';
import { NotFoundError, ValidationError, AuthenticationError } from '../domain/errors/AppError';
import { CacheService } from '../infrastructure/cache/CacheService';
import { Appointment } from '../domain/entities/Appointment';
import { Patient } from '../domain/entities/Patient';
import { IAppointmentService } from './interfaces/IAppointmentService';
import { getSession } from '../lib/auth';
import { Currency } from '../domain/value-objects/Money';
import { PaymentTypeValue } from '../domain/value-objects/PaymentType';
import { validateCreateAppointmentDTO, validateUpdateAppointmentDTO } from '../application/dto/validators';
import type { CreateAppointmentDTO as ZodCreateAppointmentDTO, UpdateAppointmentDTO as ZodUpdateAppointmentDTO } from '../application/dto/schemas/AppointmentSchemas';

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
 * @deprecated Use ZodCreateAppointmentDTO from application/dto/schemas/AppointmentSchemas
 */
export interface CreateAppointmentDTO extends ZodCreateAppointmentDTO {
    currency?: Currency;
    paymentType?: PaymentTypeValue;
}

/**
 * Serviço para operações de agendamentos
 */
export class AppointmentService implements IAppointmentService {
    private repository: IAppointmentRepository;
    private patientRepository: IPatientRepository;
    private cacheService: CacheService;

    /**
     * Cria uma instância do AppointmentService
     */
    constructor(repository: IAppointmentRepository, patientRepository: IPatientRepository, cacheService: CacheService) {
        this.repository = repository;
        this.patientRepository = patientRepository;
        this.cacheService = cacheService;
    }

    /**
     * Busca todos os agendamentos
     * ✅ Sempre retorna PaginationResult para consistência
     */
    async getAll(options: FindAllOptions = {}): Promise<PaginationResult<Appointment>> {
        try {
            const result = await this.repository.findAll(options);
            
            // Type guard para garantir tipo correto
            if (this.isPaginationResult(result)) {
                return {
                    data: result.data,
                    pagination: result.pagination
                };
            }
            
            // Se não for paginado, normalizar para formato paginado
            return {
                data: result as Appointment[],
                pagination: {
                    page: 1,
                    pageSize: (result as Appointment[]).length,
                    total: (result as Appointment[]).length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            };
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.getAll' });
        }
    }
    
    /**
     * Type guard para verificar se resultado é PaginationResult
     */
    private isPaginationResult<T>(result: T[] | PaginationResult<T>): result is PaginationResult<T> {
        return typeof result === 'object' && 
               result !== null && 
               'pagination' in result && 
               'data' in result;
    }

    /**
     * Busca um agendamento por ID
     * @throws {NotFoundError} Se agendamento não encontrado
     */
    async getById(id: string): Promise<Appointment> {
        try {
            const appointment = await this.repository.findById(id);
            if (!appointment) {
                throw new NotFoundError('Agendamento', id);
            }
            return appointment;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.getById', id });
        }
    }

    /**
     * Busca agendamentos por paciente
     */
    async getByPatientId(patientId: string): Promise<Appointment[]> {
        try {
            return await this.repository.findByPatientId(patientId);
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.getByPatientId', patientId });
        }
    }

    /**
     * Busca agendamentos por clínica
     */
    async getByClinicId(clinicId: string): Promise<Appointment[]> {
        try {
            return await this.repository.findByClinicId(clinicId);
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.getByClinicId', clinicId });
        }
    }

    /**
     * Busca agendamentos por data
     */
    async getByDate(date: string): Promise<Appointment[]> {
        try {
            return await this.repository.findByDate(date);
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.getByDate', date });
        }
    }

    /**
     * Busca agendamentos por intervalo de datas
     */
    async getByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
        try {
            return await this.repository.findByDateRange(startDate, endDate);
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.getByDateRange', startDate, endDate });
        }
    }

    /**
     * Cria um novo agendamento
     */
    async create(appointmentData: CreateAppointmentDTO, allowPastDates: boolean = false): Promise<Appointment> {
        try {
            // 1. Validar DTO (validação de entrada)
            this.validateCreateDTO(appointmentData);
            
            // 2. ✅ Validar regra de negócio contextual (data no passado)
            if (!AppointmentDomainService.canCreateAppointment(appointmentData.date, allowPastDates)) {
                throw new ValidationError({ 
                    date: 'Não é possível agendar no passado' 
                });
            }
            
            // 3. Resolver paciente (Domain Service)
            const patientId = await this.resolvePatientId(appointmentData);
            
            // 4. Criar entidade (Domain Service)
            const appointment = await this.buildAppointment({
                ...appointmentData,
                patientId
            });
            
            // 5. Persistir
            const created = await this.repository.create(appointment);
            
            // 6. Side effects (atualizar última visita) - não deve impedir criação do appointment
            logger.info('AppointmentService.create - Updating patient last visit', {
                patientId,
                appointmentDate: appointment.date,
                timestamp: Date.now()
            });
            this.updatePatientLastVisit(patientId, appointment.date).catch((error) => {
                // Não falhar criação de appointment se atualização de lastVisit falhar
                logger.warn('AppointmentService.create - Failed to update patient last visit (non-blocking)', {
                    patientId,
                    error,
                    appointmentId: created.id,
                    timestamp: Date.now()
                });
            });
            
            logger.debug('Appointment created successfully', { appointmentId: created.id });
            await logAction('create', 'appointment', created.id, null, created.toJSON());
            
            return created;
        } catch (error) {
            throw ErrorHandler.handle(error, { 
                context: 'AppointmentService.create', 
                appointmentData 
            });
        }
    }
    
    /**
     * Valida DTO de criação usando Zod
     * ✅ Usa Zod para validação em runtime
     */
    private validateCreateDTO(data: CreateAppointmentDTO): ZodCreateAppointmentDTO {
        return validateCreateAppointmentDTO(data);
    }
    
    /**
     * Resolve ID do paciente (busca existente ou cria novo)
     */
    private async resolvePatientId(data: CreateAppointmentDTO): Promise<string> {
        if (data.patientId) {
            // Verificar se existe
            const existing = await this.patientRepository.findById(data.patientId);
            if (!existing) {
                throw new NotFoundError('Paciente', data.patientId);
            }
            return data.patientId;
        }
        
        if (data.patientName) {
            // Buscar por nome
            const found = await this.patientRepository.findByNameOrEmail(
                data.patientName, 
                data.patientEmail || null
            );
            
            if (found) {
                return found.id;
            }
            
            // Criar novo paciente
            const userId = await this.getCurrentUserId();
            const newPatient = Patient.create({
                name: data.patientName,
                email: data.patientEmail || null,
                phone: data.patientPhone || null,
                userId
            });
            
            const created = await this.patientRepository.create(newPatient);
            return created.id;
        }
        
        throw new ValidationError({ patient: 'Paciente é obrigatório' });
    }
    
    /**
     * Constrói entidade Appointment
     */
    private async buildAppointment(data: CreateAppointmentDTO & { patientId: string }): Promise<Appointment> {
        // Determinar status baseado em isPaid
        const status = data.isPaid ? 'paid' : 'pending';
        
        // Criar entidade
        return Appointment.create({
            patientId: data.patientId,
            clinicId: data.clinicId || '',
            date: data.date,
            time: data.time,
            procedure: data.procedure,
            value: data.value || 0,
            currency: data.currency || 'BRL',
            paymentType: data.paymentType || '100',
            paymentPercentage: data.paymentPercentage || null,
            isPaid: data.isPaid || false,
            paymentDate: data.paymentDate || null,
            status,
            clinicalEvolution: data.clinicalEvolution || null,
            notes: data.notes || null
        });
    }
    
    /**
     * Atualiza última visita do paciente
     */
    private async updatePatientLastVisit(patientId: string, date: Date | string): Promise<void> {
        const startTimestamp = Date.now();
        logger.info('AppointmentService.updatePatientLastVisit - Called', {
            patientId,
            date,
            timestamp: startTimestamp
        });
        
        try {
            const patient = await this.patientRepository.findById(patientId);
            if (patient) {
                patient.updateLastVisit(date);
                await this.patientRepository.update(patientId, patient);
                
                logger.info('AppointmentService.updatePatientLastVisit - Success', {
                    patientId,
                    date,
                    timestamp: Date.now(),
                    duration: Date.now() - startTimestamp
                });
            } else {
                logger.warn('AppointmentService.updatePatientLastVisit - Patient not found', {
                    patientId,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            // Não falhar criação de appointment se atualização de lastVisit falhar
            logger.warn('AppointmentService.updatePatientLastVisit - Failed (non-blocking)', {
                patientId,
                date,
                error,
                timestamp: Date.now(),
                duration: Date.now() - startTimestamp,
                context: 'updatePatientLastVisit'
            });
        }
    }
    
    /**
     * Obtém ID do usuário atual
     */
    private async getCurrentUserId(): Promise<string> {
        const session = await getSession();
        if (!session?.user?.id) {
            throw new AuthenticationError('Usuário não autenticado');
        }
        return session.user.id;
    }

    /**
     * Atualiza um agendamento
     */
    async update(id: string, appointmentData: Partial<CreateAppointmentDTO>): Promise<Appointment> {
        try {
            // Buscar dados antigos para auditoria
            const oldData = await this.repository.findById(id);
            if (!oldData) {
                throw new NotFoundError('Agendamento', id);
            }

            // Validar dados se fornecidos usando Zod
            if (appointmentData.date || appointmentData.procedure || appointmentData.value !== undefined) {
                this.validateUpdateDTO(appointmentData);
            }

            // Resolver paciente se necessário
            let patientId = appointmentData.patientId || oldData.patientId;
            if (!patientId && appointmentData.patientName) {
                patientId = await this.resolvePatientId(appointmentData as CreateAppointmentDTO);
            }

            // ✅ Usar método da entidade para atualizar
            this.updateAppointmentEntity(oldData, appointmentData);

            // Persistir entidade atualizada
            const data = await this.repository.update(id, oldData);
            
            logger.debug('Appointment updated successfully', { appointmentId: id });
            await logAction('update', 'appointment', id, oldData.toJSON(), data.toJSON());

            // Atualizar última visita do paciente - não deve impedir atualização do appointment
            if (patientId && appointmentData.date) {
                logger.info('AppointmentService.update - Updating patient last visit', {
                    patientId,
                    appointmentDate: appointmentData.date,
                    timestamp: Date.now()
                });
                this.updatePatientLastVisit(patientId, appointmentData.date).catch((error) => {
                    // Não falhar atualização de appointment se atualização de lastVisit falhar
                    logger.warn('AppointmentService.update - Failed to update patient last visit (non-blocking)', {
                        patientId,
                        error,
                        appointmentId: id,
                        timestamp: Date.now()
                    });
                });
            }

            // Invalidar cache
            await Promise.all([
                this.cacheService.invalidateByTag('appointments'),
                this.cacheService.invalidateByTag('patients')
            ]);

            return data;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.update', id, appointmentData });
        }
    }
    
    /**
     * Valida DTO de atualização usando Zod
     * ✅ Usa Zod para validação em runtime
     */
    private validateUpdateDTO(data: Partial<CreateAppointmentDTO>): ZodUpdateAppointmentDTO {
        return validateUpdateAppointmentDTO(data);
    }
    
    /**
     * Atualiza entidade Appointment usando método da entidade
     * ✅ Encapsulamento: lógica de atualização está na entidade
     */
    private updateAppointmentEntity(
        existing: Appointment,
        data: Partial<CreateAppointmentDTO>
    ): void {
        // ✅ Usar método da entidade ao invés de construir nova
        existing.update({
            clinicId: data.clinicId,
            date: data.date,
            time: data.time,
            procedure: data.procedure,
            value: data.value,
            currency: data.currency,
            paymentType: data.paymentType,
            paymentPercentage: data.paymentPercentage,
            isPaid: data.isPaid,
            paymentDate: data.paymentDate,
            clinicalEvolution: data.clinicalEvolution,
            notes: data.notes
        });
    }

    /**
     * Deleta um agendamento
     */
    async delete(id: string): Promise<void> {
        try {
            // Buscar dados para auditoria
            const oldData = await this.repository.findById(id);
            if (!oldData) {
                throw new NotFoundError('Agendamento', id);
            }

            await this.repository.delete(id);
            logger.debug('Appointment deleted successfully', { appointmentId: id });
            await logAction('delete', 'appointment', id, oldData.toJSON(), null);
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('appointments');
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'AppointmentService.delete', id });
        }
    }
}

