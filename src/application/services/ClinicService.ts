import { IClinicRepository } from '../../infrastructure/repositories/interfaces/IClinicRepository';
import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { ISanitizer } from '../../infrastructure/sanitization/ISanitizer';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { calculateReceivedValue } from '../../lib/utils';
import { Clinic } from '../../domain/entities/Clinic';
import { IClinicService } from './interfaces/IClinicService';
import { validateCreateClinicDTO } from '../dto/validators';
import { logger } from '../../lib/logger';

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
    constructor(
        private readonly repository: IClinicRepository,
        private readonly db: DatabaseAdapter,
        private readonly cacheService: ICacheService,
        private readonly errorHandler: IErrorHandler,
        private readonly auditService: IAuditService,
        private readonly sanitizer: ISanitizer
    ) {}

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
            throw this.errorHandler.handle(error, { context: 'ClinicService.getAll' });
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
            throw this.errorHandler.handle(error, { context: 'ClinicService.getById', id });
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
                name: this.sanitizer.sanitizeText(validated.name),
                address: validated.address ? this.sanitizer.sanitizeText(validated.address) : null,
                email: validated.email ? this.sanitizer.sanitizeText(validated.email) : null,
                phone: validated.phone ? this.sanitizer.sanitizeText(validated.phone) : null,
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
            // ✅ Log de auditoria (ignorar erro se a tabela não existir ou não tiver permissão)
            try {
                await this.auditService.log('create', 'clinic', created.id, null, clinic.toJSON());
            } catch (auditError) {
                // ✅ Ignorar erros de auditoria (não crítico)
                logger.debug('Audit log failed (non-critical)', { error: auditError });
            }
            
            // Invalidar cache (ignorar erro se falhar - não crítico)
            // ✅ Usar Promise.race com timeout para evitar travamento
            try {
                await Promise.race([
                    this.cacheService.invalidateByTag('clinics'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Cache invalidation timeout')), 1000)
                    )
                ]).catch((cacheError) => {
                    // ✅ Ignorar erros de cache (não crítico, incluindo timeout)
                    logger.debug('Cache invalidation failed or timed out (non-critical)', { error: cacheError });
                });
            } catch (cacheError) {
                // ✅ Ignorar erros de cache (não crítico)
                logger.debug('Cache invalidation failed (non-critical)', { error: cacheError });
            }
            
            return created;
        } catch (error) {
            // ✅ Se já é ValidationError, apenas relançar
            if (error instanceof ValidationError) {
                throw error;
            }
            
            // ✅ Tratar erros de validação Zod (caso passe direto, o que não deveria acontecer)
            if (error instanceof Error && error.name === 'ZodError') {
                const zodError = error as { errors?: Array<{ path: (string | number)[]; message: string }> };
                const errors: Record<string, string> = {};
                
                if (zodError.errors && Array.isArray(zodError.errors)) {
                    zodError.errors.forEach((err) => {
                        const path = err.path.join('.');
                        errors[path] = err.message;
                    });
                }
                
                throw new ValidationError(errors, 'Dados inválidos');
            }
            
            throw this.errorHandler.handle(error, { context: 'ClinicService.create', clinicData });
        }
    }

    /**
     * Atualiza uma clínica
     */
    async update(id: string, clinic: Partial<Clinic>): Promise<Clinic> {
        try {
            // ✅ Fazer update diretamente - se a clínica não existir, o repositório vai lançar erro
            const data = await this.repository.update(id, clinic);
            logger.debug('Clinic updated successfully', { clinicId: id });
            
            // ✅ Buscar dados antigos para auditoria APÓS o update (não crítico se falhar)
            let oldData: Clinic | null = null;
            try {
                oldData = await Promise.race([
                    this.repository.findById(id),
                    new Promise<null>((_, reject) => 
                        setTimeout(() => reject(new Error('findById timeout')), 2000)
                    )
                ]).catch(() => null);
            } catch (error) {
                // Ignorar erro silenciosamente
            }
            
            // ✅ Log de auditoria (ignorar erro se a tabela não existir ou não tiver permissão)
            try {
                await this.auditService.log('update', 'clinic', id, oldData?.toJSON() || null, clinic);
            } catch (auditError) {
                // ✅ Ignorar erros de auditoria (não crítico)
                logger.debug('Audit log failed (non-critical)', { error: auditError });
            }
            
            // Invalidar cache (ignorar erro se falhar - não crítico)
            // ✅ Usar Promise.race com timeout para evitar travamento
            try {
                await Promise.race([
                    this.cacheService.invalidateByTag('clinics'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Cache invalidation timeout')), 1000)
                    )
                ]).catch(() => {
                    // Ignorar erros de cache silenciosamente
                });
            } catch (cacheError) {
                // ✅ Ignorar erros de cache (não crítico)
                logger.debug('Cache invalidation failed (non-critical)', { error: cacheError });
            }
            
            return data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ClinicService.update', id, clinic });
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
            // ✅ Log de auditoria (ignorar erro se a tabela não existir ou não tiver permissão)
            try {
                await this.auditService.log('delete', 'clinic', id, oldData.toJSON(), null);
            } catch (auditError) {
                // ✅ Ignorar erros de auditoria (não crítico)
                logger.debug('Audit log failed (non-critical)', { error: auditError });
            }
            
            // Invalidar cache (ignorar erro se falhar - não crítico)
            // ✅ Usar Promise.race com timeout para evitar travamento
            try {
                await Promise.race([
                    this.cacheService.invalidateByTag('clinics'),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Cache invalidation timeout')), 1000)
                    )
                ]).catch((cacheError) => {
                    // ✅ Ignorar erros de cache (não crítico, incluindo timeout)
                    logger.debug('Cache invalidation failed or timed out (non-critical)', { error: cacheError });
                });
            } catch (cacheError) {
                // ✅ Ignorar erros de cache (não crítico)
                logger.debug('Cache invalidation failed (non-critical)', { error: cacheError });
            }
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ClinicService.delete', id });
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
            throw this.errorHandler.handle(error, { context: 'ClinicService.getStatsById', clinicId });
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
            throw this.errorHandler.handle(error, { context: 'ClinicService.getStatsBatch', clinicIds });
        }
    }
}

