import { ClinicRepository } from '../infrastructure/repositories/implementations/ClinicRepository';
import { IClinicRepository } from '../infrastructure/repositories/interfaces/IClinicRepository';
import { logAction } from '../lib/audit';
import { logger } from '../lib/logger';
import { ErrorHandler } from '../infrastructure/errorHandling/ErrorHandler';
import { NotFoundError, ValidationError } from '../domain/errors/AppError';
import { CacheService } from '../infrastructure/cache/CacheService';
import { DatabaseAdapter } from '../infrastructure/database/DatabaseAdapter';
import { calculateReceivedValue } from '../lib/utils';
import { Clinic } from '../domain/entities/Clinic';
import { IClinicService } from './interfaces/IClinicService';
import { validateCreateClinicDTO } from '../application/dto/validators';
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

interface ClinicStats {
    appointments: number;
    revenue: number;
    ticket: number;
}

/**
 * Serviço para operações de clínicas
 */
export class ClinicService implements IClinicService {
    private repository: IClinicRepository;
    private db: DatabaseAdapter;
    private cacheService: CacheService;

    /**
     * Cria uma instância do ClinicService
     */
    constructor(repository: IClinicRepository, db: DatabaseAdapter, cacheService: CacheService) {
        this.repository = repository;
        this.db = db;
        this.cacheService = cacheService;
    }

    /**
     * Busca todas as clínicas
     * ✅ Sempre retorna PaginationResult para consistência
     * ✅ Usa options passadas para paginação e filtros
     */
    async getAll(options: FindAllOptions = {}): Promise<PaginationResult<Clinic>> {
        try {
            // ✅ Usar options passadas
            const result = await this.repository.findAll({
                page: options.page,
                pageSize: options.pageSize,
                orderBy: 'created_at',
                orderDirection: 'desc',
                filters: options.filters || {}
            });
            
            // Type guard para garantir tipo correto
            if (this.isPaginationResult(result)) {
                return {
                    data: result.data,
                    pagination: result.pagination
                };
            }
            
            // Se não for paginado, normalizar para formato paginado
            return {
                data: result as Clinic[],
                pagination: {
                    page: 1,
                    pageSize: (result as Clinic[]).length,
                    total: (result as Clinic[]).length,
                    totalPages: 1,
                    hasNext: false,
                    hasPrev: false
                }
            };
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'ClinicService.getAll' });
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
     * Busca uma clínica por ID
     * @throws {NotFoundError} Se clínica não encontrada
     */
    async getById(id: string): Promise<Clinic> {
        try {
            const clinic = await this.repository.findById(id);
            if (!clinic) {
                throw new NotFoundError('Clínica', id);
            }
            return clinic;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'ClinicService.getById', id });
        }
    }

    /**
     * Cria uma nova clínica
     * ✅ Valida DTO de entrada com Zod antes de criar entidade
     * ✅ Sanitiza dados para prevenir XSS
     */
    async create(clinicData: unknown): Promise<Clinic> {
        try {
            // ✅ Validar DTO primeiro
            const validated = validateCreateClinicDTO(clinicData);
            
            // ✅ Sanitizar dados
            const sanitized = {
                name: sanitizeText(validated.name),
                address: validated.address ? sanitizeText(validated.address) : null,
                email: validated.email ? sanitizeText(validated.email) : null,
                phone: validated.phone ? sanitizeText(validated.phone) : null,
                status: 'active' as const
            };
            
            // ✅ Criar entidade (que também valida via Value Objects)
            const clinic = Clinic.create({
                name: sanitized.name,
                address: sanitized.address,
                email: sanitized.email,
                phone: sanitized.phone,
                status: sanitized.status
            });
            
            // ✅ Repository recebe entidade já validada
            const created = await this.repository.create(clinic);
            
            logger.debug('Clinic created successfully', { clinicId: created.id });
            await logAction('create', 'clinic', created.id, null, clinic.toJSON());
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('clinics');
            
            return created;
        } catch (error) {
            // ✅ Tratar erros de validação Zod
            if (error instanceof Error && error.name === 'ZodError') {
                throw new ValidationError(
                    (error as { issues?: unknown[] }).issues || [],
                    'Dados inválidos'
                );
            }
            throw ErrorHandler.handle(error, { context: 'ClinicService.create', clinicData });
        }
    }

    /**
     * Atualiza uma clínica
     */
    async update(id: string, clinic: Partial<Clinic>): Promise<Clinic> {
        try {
            // Buscar dados antigos para auditoria
            const oldData = await this.repository.findById(id);
            if (!oldData) {
                throw new NotFoundError('Clínica', id);
            }

            const data = await this.repository.update(id, clinic);
            logger.debug('Clinic updated successfully', { clinicId: id });
            await logAction('update', 'clinic', id, oldData.toJSON(), clinic);
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('clinics');
            
            return data;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'ClinicService.update', id, clinic });
        }
    }

    /**
     * Deleta uma clínica
     */
    async delete(id: string): Promise<void> {
        try {
            // Buscar dados para auditoria
            const oldData = await this.repository.findById(id);
            if (!oldData) {
                throw new NotFoundError('Clínica', id);
            }

            await this.repository.delete(id);
            logger.debug('Clinic deleted successfully', { clinicId: id });
            await logAction('delete', 'clinic', id, oldData.toJSON(), null);
            
            // Invalidar cache
            await this.cacheService.invalidateByTag('clinics');
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'ClinicService.delete', id });
        }
    }

    /**
     * Busca estatísticas de uma clínica por ID
     * ✅ Usa DatabaseAdapter ao invés de import direto do Supabase
     */
    async getStatsById(clinicId: string): Promise<ClinicStats> {
        try {
            if (!clinicId) {
                return { appointments: 0, revenue: 0, ticket: 0 };
            }

            // ✅ Usar DatabaseAdapter ao invés de import direto
            const appointments = await this.db.table('appointments')
                .select('value, status, payment_type, payment_percentage')
                .where('clinic_id', clinicId)
                .execute<Array<{ value?: number; status?: string; payment_type?: string; payment_percentage?: number }>>();

            const appointmentsArray = Array.isArray(appointments) ? appointments : [];
            const totalValue = appointmentsArray.reduce((sum, a) => sum + parseFloat(String(a.value || 0)), 0);
            const paidAppointments = appointmentsArray.filter(a => a.status === 'paid');
            const revenue = paidAppointments.reduce((sum, a) => sum + calculateReceivedValue(a as { value?: number; payment_type?: string; payment_percentage?: number }), 0);
            const ticket = appointmentsArray.length > 0 ? totalValue / appointmentsArray.length : 0;

            return {
                appointments: appointmentsArray.length,
                revenue: revenue,
                ticket: ticket
            };
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'ClinicService.getStatsById', clinicId });
        }
    }

    /**
     * Busca estatísticas de múltiplas clínicas em batch (resolve N+1)
     * ✅ Usa DatabaseAdapter ao invés de import direto do Supabase
     */
    async getStatsBatch(clinicIds: string[]): Promise<Record<string, ClinicStats>> {
        try {
            if (!clinicIds || clinicIds.length === 0) {
                return {};
            }

            // ✅ Query única para todas as clínicas usando DatabaseAdapter
            const data = await this.db.table('appointments')
                .select('clinic_id, value, status, payment_type, payment_percentage')
                .whereIn('clinic_id', clinicIds)
                .execute<Array<{ clinic_id?: string; value?: number; status?: string; payment_type?: string; payment_percentage?: number }>>();

            // Inicializar mapa com zeros
            const statsMap: Record<string, ClinicStats> = {};
            clinicIds.forEach(id => {
                statsMap[id] = { appointments: 0, revenue: 0, ticket: 0 };
            });

            // Agrupar por clínica
            const appointmentsByClinic: Record<string, Array<{ value?: number; status?: string; payment_type?: string; payment_percentage?: number }>> = {};
            const appointmentsArray = Array.isArray(data) ? data : [];
            appointmentsArray.forEach(apt => {
                const clinicId = apt.clinic_id as string;
                if (!appointmentsByClinic[clinicId]) {
                    appointmentsByClinic[clinicId] = [];
                }
                appointmentsByClinic[clinicId].push(apt);
            });

            // Calcular estatísticas para cada clínica
            Object.keys(appointmentsByClinic).forEach(clinicId => {
                const appointments = appointmentsByClinic[clinicId];
                const totalValue = appointments.reduce((sum, a) => sum + parseFloat(String(a.value || 0)), 0);
                const paidAppointments = appointments.filter(a => a.status === 'paid');
                const revenue = paidAppointments.reduce((sum, a) => sum + calculateReceivedValue(a as { value?: number; payment_type?: string; payment_percentage?: number }), 0);
                const ticket = appointments.length > 0 ? totalValue / appointments.length : 0;

                statsMap[clinicId] = {
                    appointments: appointments.length,
                    revenue: revenue,
                    ticket: ticket
                };
            });

            return statsMap;
        } catch (error) {
            throw ErrorHandler.handle(error, { context: 'ClinicService.getStatsBatch', clinicIds });
        }
    }
}

