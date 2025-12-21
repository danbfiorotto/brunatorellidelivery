import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { AuthenticationError } from '../../domain/errors/AppError';
import { getSession } from '../../lib/auth';
import { ILogger } from '../../infrastructure/logging/ILogger';
import { Logger } from '../../infrastructure/logging/Logger';

/**
 * Serviço centralizado para gerenciamento de permissões
 * ✅ Centraliza toda lógica de permissões do sistema
 */
export class PermissionService {
    private db: DatabaseAdapter;
    private logger: ILogger;

    constructor(db: DatabaseAdapter, logger: ILogger | null = null) {
        this.db = db;
        this.logger = logger || new Logger();
    }

    /**
     * Verifica se usuário pode acessar um recurso
     * Por padrão, verifica ownership (usuário criou o recurso)
     */
    async canAccess(resource: string, resourceId: string, userId: string): Promise<boolean> {
        try {
            return await this.checkOwnership(resource, resourceId, userId);
        } catch (error) {
            this.logger.warn('Error checking access permission', { resource, resourceId, userId, error });
            return false;
        }
    }

    /**
     * Verifica se usuário pode criar um recurso
     * Por padrão, qualquer usuário autenticado pode criar
     */
    async canCreate(resource: string, userId: string): Promise<boolean> {
        try {
            // Verificar se usuário está autenticado
            const session = await getSession();
            if (!session?.user?.id) {
                return false;
            }
            return session.user.id === userId;
        } catch (error) {
            this.logger.warn('Error checking create permission', { resource, userId, error });
            return false;
        }
    }

    /**
     * Verifica se usuário pode atualizar um recurso
     * Por padrão, verifica ownership
     */
    async canUpdate(resource: string, resourceId: string, userId: string): Promise<boolean> {
        try {
            return await this.checkOwnership(resource, resourceId, userId);
        } catch (error) {
            this.logger.warn('Error checking update permission', { resource, resourceId, userId, error });
            return false;
        }
    }

    /**
     * Verifica se usuário pode deletar um recurso
     * Por padrão, verifica ownership
     */
    async canDelete(resource: string, resourceId: string, userId: string): Promise<boolean> {
        try {
            return await this.checkOwnership(resource, resourceId, userId);
        } catch (error) {
            this.logger.warn('Error checking delete permission', { resource, resourceId, userId, error });
            return false;
        }
    }

    /**
     * Verifica se usuário é dono do recurso (ownership)
     * Busca o recurso no banco e verifica se user_id corresponde
     */
    async checkOwnership(resource: string, resourceId: string, userId: string): Promise<boolean> {
        try {
            // Buscar recurso no banco
            const result = await this.db.table(resource)
                .select('user_id')
                .where('id', resourceId)
                .single()
                .execute<{ user_id?: string }>();

            if (!result) {
                return false;
            }

            // Verificar se user_id corresponde
            return result.user_id === userId;
        } catch (error) {
            this.logger.warn('Error checking ownership', { resource, resourceId, userId, error });
            return false;
        }
    }

    /**
     * Verifica permissão e lança erro se não autorizado
     * @throws {AuthenticationError} Se não autorizado
     */
    async requireAccess(resource: string, resourceId: string, userId: string): Promise<void> {
        const hasAccess = await this.canAccess(resource, resourceId, userId);
        if (!hasAccess) {
            throw new AuthenticationError(`Você não tem permissão para acessar este ${resource}.`);
        }
    }

    /**
     * Verifica permissão de criação e lança erro se não autorizado
     * @throws {AuthenticationError} Se não autorizado
     */
    async requireCreate(resource: string, userId: string): Promise<void> {
        const canCreate = await this.canCreate(resource, userId);
        if (!canCreate) {
            throw new AuthenticationError(`Você não tem permissão para criar ${resource}.`);
        }
    }

    /**
     * Verifica permissão de atualização e lança erro se não autorizado
     * @throws {AuthenticationError} Se não autorizado
     */
    async requireUpdate(resource: string, resourceId: string, userId: string): Promise<void> {
        const canUpdate = await this.canUpdate(resource, resourceId, userId);
        if (!canUpdate) {
            throw new AuthenticationError(`Você não tem permissão para atualizar este ${resource}.`);
        }
    }

    /**
     * Verifica permissão de deleção e lança erro se não autorizado
     * @throws {AuthenticationError} Se não autorizado
     */
    async requireDelete(resource: string, resourceId: string, userId: string): Promise<void> {
        const canDelete = await this.canDelete(resource, resourceId, userId);
        if (!canDelete) {
            throw new AuthenticationError(`Você não tem permissão para excluir este ${resource}.`);
        }
    }
}


