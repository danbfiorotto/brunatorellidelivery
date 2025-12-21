import { PatientRepository } from '../infrastructure/repositories/implementations/PatientRepository';
import { IPatientRepository } from '../infrastructure/repositories/interfaces/IPatientRepository';
import { IAppointmentRepository } from '../infrastructure/repositories/interfaces/IAppointmentRepository';
import { logAction } from '../lib/audit';
import { logger } from '../lib/logger';
import { ErrorHandler } from '../infrastructure/errorHandling/ErrorHandler';
import { NotFoundError, ValidationError, AuthenticationError } from '../domain/errors/AppError';
import { CacheService } from '../infrastructure/cache/CacheService';
import { Patient } from '../domain/entities/Patient';
import { IPatientService } from './interfaces/IPatientService';
import { getSession } from '../lib/auth';
import { CreatePatientSchema, UpdatePatientSchema } from '../application/dto/schemas/PatientSchemas';
import { sanitizeText } from '../lib/sanitize';

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
 */
export class PatientService implements IPatientService {
    private repository: IPatientRepository;
    private appointmentRepository: IAppointmentRepository;
    private cacheService: CacheService;

    /**
     * Cria uma instância do PatientService
     */
    constructor(
        repository: IPatientRepository, 
        appointmentRepository: IAppointmentRepository,
        cacheService: CacheService
    ) {
        this.repository = repository;
        this.appointmentRepository = appointmentRepository;
        this.cacheService = cacheService;
    }

    /**
     * Busca todos os pacientes
     */
    async getAll(options: FindAllOptions = {}): Promise<Patient[] | PaginationResult<Patient>> {
        try {
            const result = await this.repository.findAll(options);
            if (Array.isArray(result)) {
                return result;
            }
            const paginated = result as { data: Patient[]; pagination: unknown };
            return {
                data: paginated.data,
                pagination: paginated.pagination as PaginationResult<Patient>['pagination']
            };
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'PatientService.getAll' });
        }
    }

    /**
     * Busca um paciente por ID
     * @throws {NotFoundError} Se paciente não encontrado
     */
    async getById(id: string): Promise<Patient> {
        try {
            const patient = await this.repository.findById(id);
            if (!patient) {
                throw new NotFoundError('Paciente', id);
            }
            return patient;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'PatientService.getById', id });
        }
    }

    /**
     * Busca paciente por nome ou email
     */
    async findByNameOrEmail(name: string, email: string | null = null): Promise<Patient | null> {
        try {
            return await this.repository.findByNameOrEmail(name, email);
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'PatientService.findByNameOrEmail', name, email });
        }
    }

    /**
     * Cria um novo paciente
     * ✅ Valida DTO de entrada com Zod antes de criar entidade
     * ✅ Sanitiza dados para prevenir XSS
     */
    async create(patientData: unknown): Promise<Patient> {
        try {
            // ✅ Validar DTO primeiro
            const validated = CreatePatientSchema.parse(patientData);
            
            // ✅ Sanitizar dados
            const sanitized = {
                name: sanitizeText(validated.name),
                email: validated.email ? sanitizeText(validated.email) : null,
                phone: validated.phone ? sanitizeText(validated.phone) : null
            };
            
            // Obter ID do usuário atual
            const userId = await this.getCurrentUserId();
            
            // Criar entidade Patient (que também valida via Value Objects)
            const patient = Patient.create({
                name: sanitized.name,
                email: sanitized.email,
                phone: sanitized.phone,
                userId
            });
            
            // Repository recebe entidade, não dados brutos
            const created = await this.repository.create(patient);
            
            logger.debug('Patient created successfully', { patientId: created.id });
            await logAction('create', 'patient', created.id, null, patient.toJSON());
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('patients');
            
            return created;
        } catch (error) {
            // ✅ Tratar erros de validação Zod
            if (error instanceof Error && error.name === 'ZodError') {
                throw new ValidationError(
                    (error as { issues?: unknown[] }).issues || [],
                    'Dados inválidos'
                );
            }
            throw ErrorHandler.handle(error, { 
                context: 'PatientService.create', 
                patientData 
            });
        }
    }

    /**
     * Atualiza um paciente
     * ✅ Valida DTO de entrada com Zod antes de atualizar
     * ✅ Sanitiza dados para prevenir XSS
     */
    async update(id: string, patientData: unknown): Promise<Patient> {
        try {
            // ✅ Validar DTO primeiro
            const validated = UpdatePatientSchema.parse(patientData);
            
            const existing = await this.repository.findById(id);
            if (!existing) {
                throw new NotFoundError('Paciente', id);
            }
            
            // ✅ Sanitizar e aplicar atualizações usando métodos da entidade
            if (validated.name !== undefined) {
                existing.updateName(sanitizeText(validated.name));
            }
            if (validated.email !== undefined) {
                existing.updateEmail(validated.email ? sanitizeText(validated.email) : null);
            }
            if (validated.phone !== undefined) {
                existing.updatePhone(validated.phone ? sanitizeText(validated.phone) : null);
            }
            
            // Repository recebe entidade atualizada
            const updated = await this.repository.update(id, existing);
            
            logger.debug('Patient updated successfully', { patientId: id });
            await logAction('update', 'patient', id, existing.toJSON(), updated.toJSON());
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('patients');
            
            return updated;
        } catch (error) {
            throw ErrorHandler.handle(error, { 
                context: 'PatientService.update', 
                id, 
                patientData 
            });
        }
    }

    /**
     * Deleta um paciente
     */
    async delete(id: string): Promise<void> {
        try {
            // Buscar dados para auditoria
            const oldData = await this.repository.findById(id);
            if (!oldData) {
                throw new NotFoundError('Paciente', id);
            }

            await this.repository.delete(id);
            logger.debug('Patient deleted successfully', { patientId: id });
            await logAction('delete', 'patient', id, oldData.toJSON(), null);
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('patients');
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'PatientService.delete', id });
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
            throw ErrorHandler.handle(error, { context: 'PatientService.getPatientsWithStats' });
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
            // Usar filtro ILIKE no banco ao invés de filtrar em memória
            const result = await this.repository.findAll({
                page: options.page,
                pageSize: options.pageSize,
                filters: {
                    name: { ilike: `%${options.searchTerm}%` }
                }
            });
            
            const paginated = result as PaginationResult<Patient>;
            
            return {
                patients: paginated.data || [],
                pagination: paginated.pagination
            };
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'PatientService.searchPatients' });
        }
    }
    
    /**
     * Conta total de appointments usando AppointmentRepository
     * ✅ Usa AppointmentRepository injetado via DI
     */
    private async getTotalAppointmentsCount(): Promise<number> {
        try {
            // ✅ Usar AppointmentRepository injetado
            const result = await this.appointmentRepository.findAll({ limit: 1 });
            
            // Type guard para verificar se é PaginationResult
            if (this.isPaginationResult(result)) {
                return result.pagination.total;
            }
            
            // Se for array, retornar length
            return (result as unknown[]).length;
        } catch (error) {
            // ✅ Logar erro mas não silenciar - deixar propagar
            logger.error('Failed to get appointments count', { error });
            throw ErrorHandler.handle(error, { context: 'PatientService.getTotalAppointmentsCount' });
        }
    }
    
    /**
     * Type guard para verificar se resultado é PaginationResult
     */
    private isPaginationResult<T>(result: T[] | { data: T[]; pagination: unknown }): result is { data: T[]; pagination: { total: number } } {
        return typeof result === 'object' && 
               result !== null && 
               'pagination' in result && 
               'data' in result;
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
}

