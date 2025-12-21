import { BaseRepository } from '../BaseRepository';
import { IClinicRepository } from '../interfaces/IClinicRepository';
import { Clinic, ClinicJSON } from '../../../domain/entities/Clinic';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { PermissionService } from '../../application/services/PermissionService';
import { IAuthClient } from '../../infrastructure/auth/IAuthClient';
import { DatabaseError } from '../../../domain/errors/AppError';
import { SupabaseClientAdapter } from '../../infrastructure/database/adapters/SupabaseClientAdapter';
import { logger } from '../../../lib/logger';

/**
 * Repositório para operações de clínicas
 */
export class ClinicRepository extends BaseRepository implements IClinicRepository {
    constructor(
        db: DatabaseAdapter, 
        cacheService: ICacheService, 
        permissionService: PermissionService | null = null,
        authClient: IAuthClient
    ) {
        super('clinics', db, cacheService, permissionService, authClient);
    }

    /**
     * Busca todas as clínicas ordenadas por data de criação
     * Usa BaseRepository.findAll() com opções padrão
     * ✅ Aceita options para paginação e filtros
     */
    async findAll(options: Record<string, unknown> = {}): Promise<Clinic[] | { data: Clinic[]; pagination: unknown }> {
        const { 
            page, 
            pageSize, 
            orderBy = 'created_at', 
            orderDirection = 'desc', 
            filters = {}
        } = options as { page?: number; pageSize?: number; orderBy?: string; orderDirection?: 'asc' | 'desc'; filters?: Record<string, unknown> };
        
        const result = await super.findAll<ClinicJSON>({
            page,
            pageSize,
            orderBy,
            orderDirection,
            filters
        });

        // Retornar no formato esperado pela interface (compatibilidade)
        return {
            data: result.data.map(item => Clinic.fromJSON(item)),
            pagination: result.pagination
        };
    }

    /**
     * Busca uma clínica por ID
     * ✅ Usa BaseRepository.findById() que já aplica filtro por user_id automaticamente
     */
    async findById(id: string): Promise<Clinic | null> {
        const result = await super.findById<ClinicJSON>(id);

        if (!result) return null;
        return Clinic.fromJSON(result);
    }

    /**
     * Cria uma nova clínica
     * Recebe entidade Clinic que já foi validada
     */
    async create(clinic: Clinic): Promise<Clinic> {
        const result = await this.executeWithMiddlewares<ClinicJSON>(
            async () => {
                const session = await this.ensureAuth();
                
                // ✅ Usar toJSON() da entidade
                const clinicData = clinic.toJSON();
                // ✅ Adicionar user_id automaticamente (BaseRepository.create já faz isso, mas garantindo aqui também)
                clinicData.user_id = session.user.id;
                
                // ✅ Remover updated_at se existir (a tabela clinics não tem essa coluna)
                const { updated_at, ...dataToInsert } = clinicData as any;
                
                const created = await this.query()
                    .insert([dataToInsert])
                    .then(res => (Array.isArray(res) ? res[0] : res) as ClinicJSON);
                
                return created;
            },
            { operation: 'create' },
            { requireCSRF: true, useCache: false }
        );

        return Clinic.fromJSON(result);
    }

    /**
     * Atualiza uma clínica
     */
    async update(id: string, clinic: Partial<Clinic>): Promise<Clinic> {
        const result = await this.executeWithMiddlewares<ClinicJSON>(
            async () => {
                const clinicData: Partial<ClinicJSON> = {
                    name: clinic.name,
                    address: clinic.address || null,
                    email: clinic.email || null,
                    phone: clinic.phone || null,
                    status: clinic.status || 'active',
                    // ✅ updated_at removido porque a tabela clinics não tem essa coluna
                };

                // ✅ Usar Supabase client diretamente para garantir que funciona corretamente
                const supabaseClient = (this.db.getClient() as SupabaseClientAdapter).getSupabaseClient();
                const { data: updated, error } = await supabaseClient
                    .from(this.tableName)
                    .update(clinicData)
                    .eq('id', id)
                    .select()
                    .single();
                
                if (error) {
                    throw new DatabaseError(
                        `Erro ao atualizar na tabela ${this.tableName}: ${error.message}`,
                        error
                    );
                }
                
                return updated as ClinicJSON;
            },
            { operation: 'update', metadata: { id } },
            { requireCSRF: true, useCache: false }
        );

        return Clinic.fromJSON(result);
    }

    /**
     * Deleta uma clínica
     * ✅ Permissões verificadas pelo BaseRepository via PermissionService
     */
    async delete(id: string): Promise<void> {
        await super.delete(id);
    }
}

