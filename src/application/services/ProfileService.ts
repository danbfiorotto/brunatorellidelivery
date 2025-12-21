import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { getCSRFToken } from '../../lib/csrf';
import { logger } from '../../lib/logger';
import { PermissionError } from '../../domain/errors/AppError';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { requireAuth, getSession } from '../../lib/auth';
import { apiRateLimiter } from '../../lib/rateLimiter';

interface UserProfile {
    id: string;
    user_id: string;
    name: string;
    phone: string | null;
    language: string;
    currency: string;
    theme?: string;
    notifications_push: boolean;
    notifications_appointments: boolean;
    notifications_pending: boolean;
    notifications_clinics: boolean;
    created_at: string;
    updated_at: string;
}

interface ProfileData {
    name: string;
    phone?: string | null;
    language?: string;
    currency?: string;
    theme?: string;
    notifications_push?: boolean;
    notifications_appointments?: boolean;
    notifications_pending?: boolean;
    notifications_clinics?: boolean;
}

/**
 * Serviço para operações de perfil de usuário.
 * 
 * Gerencia criação, atualização e busca de perfis de usuário,
 * incluindo preferências de idioma, moeda, tema e notificações.
 */
export class ProfileService {
    constructor(
        private readonly db: DatabaseAdapter,
        private readonly errorHandler: IErrorHandler,
        private readonly auditService: IAuditService
    ) {}
    /**
     * Busca o perfil de um usuário
     */
    async getUserProfile(userId: string): Promise<UserProfile | null> {
        try {
            await requireAuth();
            const session = await getSession();
            const currentUserId = session?.user?.id;

            if (currentUserId !== userId) {
                throw new PermissionError('Você não tem permissão para acessar este perfil');
            }

            const requestUserId = currentUserId || 'anonymous';
            if (!apiRateLimiter.canMakeRequest(requestUserId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            const data = await this.db.table('user_profiles')
                .select('*')
                .where('user_id', userId)
                .single()
                .execute<UserProfile>();

            return data || null;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProfileService.getUserProfile', userId });
        }
    }

    /**
     * Cria um novo perfil de usuário
     */
    async createUserProfile(userId: string, profile: ProfileData): Promise<UserProfile> {
        try {
            await requireAuth();
            const session = await getSession();
            const currentUserId = session?.user?.id;

            if (currentUserId !== userId) {
                throw new PermissionError('Você não tem permissão para criar este perfil');
            }

            const requestUserId = currentUserId || 'anonymous';
            if (!apiRateLimiter.canMakeRequest(requestUserId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            // Validar CSRF
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }

            // ✅ Validações explícitas para campos obrigatórios
            if (!profile.name || typeof profile.name !== 'string' || !profile.name.trim()) {
                throw new Error('Nome é obrigatório e não pode estar vazio');
            }

            // ✅ Tratar telefone vazio: strings vazias ou apenas espaços devem ser null
            const normalizedPhone = profile.phone && typeof profile.phone === 'string' && profile.phone.trim()
                ? profile.phone.trim()
                : null;

            const data = await this.db.table('user_profiles')
                .insert([{
                    user_id: userId,
                    name: profile.name.trim(),
                    phone: normalizedPhone,
                    language: profile.language || 'pt-BR',
                    currency: profile.currency || 'BRL',
                    theme: profile.theme || 'light',
                    notifications_push: profile.notifications_push !== undefined ? profile.notifications_push : true,
                    notifications_appointments: profile.notifications_appointments !== undefined ? profile.notifications_appointments : true,
                    notifications_pending: profile.notifications_pending !== undefined ? profile.notifications_pending : true,
                    notifications_clinics: profile.notifications_clinics !== undefined ? profile.notifications_clinics : false
                }])
                .then(res => (Array.isArray(res) ? res[0] : res) as UserProfile);

            await this.auditService.log('create', 'user_profile', data.id, null, profile);
            logger.debug('User profile created successfully', { profileId: data.id });

            return data;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProfileService.createUserProfile', userId, profile });
        }
    }

    /**
     * Atualiza o perfil de um usuário
     */
    async updateUserProfile(userId: string, profile: ProfileData): Promise<UserProfile> {
        try {
            await requireAuth();
            const session = await getSession();
            const currentUserId = session?.user?.id;

            if (currentUserId !== userId) {
                throw new PermissionError('Você não tem permissão para atualizar este perfil');
            }

            const requestUserId = currentUserId || 'anonymous';
            if (!apiRateLimiter.canMakeRequest(requestUserId)) {
                throw new Error('Muitas requisições. Aguarde um momento.');
            }

            // Validar CSRF
            const token = getCSRFToken();
            if (!token) {
                throw new Error('Token CSRF não encontrado. Por favor, recarregue a página.');
            }

            const existing = await this.getUserProfile(userId);

            if (existing) {
                // ✅ Validações explícitas para campos obrigatórios
                if (!profile.name || typeof profile.name !== 'string' || !profile.name.trim()) {
                    throw new Error('Nome é obrigatório e não pode estar vazio');
                }

                // ✅ Tratar telefone vazio: strings vazias ou apenas espaços devem ser null
                const normalizedPhone = profile.phone && typeof profile.phone === 'string' && profile.phone.trim()
                    ? profile.phone.trim()
                    : null;

                const updateData: Partial<UserProfile> = {
                    name: profile.name.trim(),
                    phone: normalizedPhone,
                    updated_at: new Date().toISOString()
                };
                
                // Only update fields that are provided
                if (profile.language !== undefined) {
                    updateData.language = profile.language;
                }
                if (profile.currency !== undefined) {
                    updateData.currency = profile.currency;
                }
                if (profile.theme !== undefined) {
                    updateData.theme = profile.theme;
                }
                if (profile.notifications_push !== undefined) {
                    updateData.notifications_push = profile.notifications_push;
                }
                if (profile.notifications_appointments !== undefined) {
                    updateData.notifications_appointments = profile.notifications_appointments;
                }
                if (profile.notifications_pending !== undefined) {
                    updateData.notifications_pending = profile.notifications_pending;
                }
                if (profile.notifications_clinics !== undefined) {
                    updateData.notifications_clinics = profile.notifications_clinics;
                }
                
                logger.debug('Updating user profile', { 
                    userId, 
                    updateData: { ...updateData, phone: updateData.phone ? '[REDACTED]' : null } 
                });

                const data = await this.db.table('user_profiles')
                    .where('user_id', userId)
                    .update(updateData)
                    .then(res => (Array.isArray(res) ? res[0] : res) as UserProfile);

                await this.auditService.log('update', 'user_profile', userId, existing, profile);
                logger.debug('User profile updated successfully', { 
                    userId, 
                    updatedFields: Object.keys(updateData) 
                });

                return data;
            } else {
                return await this.createUserProfile(userId, profile);
            }
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'ProfileService.updateUserProfile', userId, profile });
        }
    }
}

