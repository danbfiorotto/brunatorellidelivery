import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { getCSRFToken } from '../../lib/csrf';
import { logger } from '../../lib/logger';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { requireAuth, getSession } from '../../lib/auth';
import { apiRateLimiter } from '../../lib/rateLimiter';

interface Procedure {
    id: string;
    name: string;
    description: string | null;
    category: string | null;
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
}

interface ProcedureData {
    name: string;
    description?: string | null;
    category?: string | null;
    is_active?: boolean;
    display_order?: number;
}

/**
 * Serviço para operações de procedimentos.
 * 
 * Gerencia CRUD de procedimentos médicos, incluindo criação, atualização
 * e busca de procedimentos ativos ordenados por display_order.
 */
export class ProcedureService {
    constructor(
        private readonly db: DatabaseAdapter,
        private readonly errorHandler: IErrorHandler,
        private readonly auditService: IAuditService
    ) {}
    /**
     * Busca todos os procedimentos ativos
     */
    async getAll(): Promise<Procedure[]> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            const data = await this.db.table('procedures')
                .select('*')
                .where('is_active', true)
                .orderBy('display_order', 'asc')
                .execute<Procedure[]>();

            return data || [];
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProcedureService.getAll' });
        }
    }

    /**
     * Busca um procedimento por ID
     */
    async getById(id: string): Promise<Procedure | null> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            try {
                const data = await this.db.table('procedures')
                    .select('*')
                    .where('id', id)
                    .single()
                    .execute<Procedure>();
                return data || null;
            } catch (error) {
                const errorObj = error as { code?: string; message?: string };
                if (errorObj.code === 'PGRST116' || errorObj.message?.includes('not found')) {
                    return null;
                }
                throw error;
            }
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProcedureService.getById', id });
        }
    }

    /**
     * Cria um novo procedimento
     */
    async create(procedure: ProcedureData): Promise<Procedure> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            // Validar CSRF
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }

            const data = await this.db.table('procedures')
                .insert([{
                    name: procedure.name,
                    description: procedure.description || null,
                    category: procedure.category || null,
                    is_active: procedure.is_active !== undefined ? procedure.is_active : true,
                    display_order: procedure.display_order || 0
                }])
                .then(res => (Array.isArray(res) ? res[0] : res) as Procedure);

            await this.auditService.log('create', 'procedure', data.id, null, procedure);
            logger.debug('Procedure created successfully', { procedureId: data.id });

            return data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProcedureService.create', procedure });
        }
    }

    /**
     * Atualiza um procedimento existente
     */
    async update(id: string, procedure: ProcedureData): Promise<Procedure> {
        try {
            await requireAuth();
            const session = await getSession();
            const userId = session?.user?.id || 'anonymous';

            if (!apiRateLimiter.canMakeRequest(userId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            // Validar CSRF
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }

            const data = await this.db.table('procedures')
                .where('id', id)
                .update({
                    name: procedure.name,
                    description: procedure.description || null,
                    category: procedure.category || null,
                    is_active: procedure.is_active !== undefined ? procedure.is_active : true,
                    display_order: procedure.display_order || 0
                })
                .then(res => (Array.isArray(res) ? res[0] : res) as Procedure);

            await this.auditService.log('update', 'procedure', id, null, procedure);
            logger.debug('Procedure updated successfully', { procedureId: id });

            return data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProcedureService.update', id, procedure });
        }
    }
}

