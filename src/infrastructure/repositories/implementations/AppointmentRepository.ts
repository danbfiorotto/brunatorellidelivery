import { BaseRepository } from '../BaseRepository';
import { IAppointmentRepository } from '../interfaces/IAppointmentRepository';
import { Appointment, AppointmentJSON } from '../../../domain/entities/Appointment';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { PermissionService } from '../../application/services/PermissionService';
import { IAuthClient } from '../../infrastructure/auth/IAuthClient';
import { logger } from '../../../lib/logger';

/**
 * Repositório para operações de agendamentos
 */
export class AppointmentRepository extends BaseRepository implements IAppointmentRepository {
    constructor(
        db: DatabaseAdapter, 
        cacheService: ICacheService, 
        permissionService: PermissionService | null = null,
        authClient: IAuthClient
    ) {
        super('appointments', db, cacheService, permissionService, authClient);
    }

    /**
     * Busca todos os agendamentos com relacionamentos
     */
    async findAll(options: Record<string, unknown> = {}) {
        const { 
            page, 
            pageSize, 
            orderBy = 'date', 
            orderDirection = 'desc', 
            filters = {}
        } = options as { page?: number; pageSize?: number; orderBy?: string; orderDirection?: 'asc' | 'desc'; filters?: Record<string, unknown> };
        
        logger.debug('AppointmentRepository.findAll - Starting', { options, page, pageSize, orderBy, orderDirection, filters });
        
        // ✅ Filtrar appointments por user_id através de patients
        // Usar authClient injetado ao invés de import dinâmico
        const session = await this.authClient.getSession();
        const userId = session?.user?.id;
        
        // ✅ Se há userId, buscar apenas appointments de patients do usuário
        let finalFilters = { ...filters };
        if (userId) {
            // Buscar IDs de patients do usuário atual
            const userPatients = await this.db.table('patients')
                .select('id')
                .where('user_id', { eq: userId })
                .execute<Array<{ id: string }>>();
            
            const userPatientIds = userPatients.map(p => p.id);
            
            // Se o usuário tem patients, filtrar appointments por esses IDs
            // Se não tem patients, retornar array vazio
            if (userPatientIds.length > 0) {
                finalFilters = {
                    ...finalFilters,
                    patient_id: { in: userPatientIds }
                };
            } else {
                // Usuário não tem patients, retornar vazio
                return {
                    data: [],
                    pagination: {
                        page: page || 1,
                        pageSize: pageSize || 50,
                        total: 0,
                        totalPages: 0,
                        hasNext: false,
                        hasPrev: false
                    }
                };
            }
        }
        
        // Usar BaseRepository.findAll() e customizar apenas o select com relacionamentos
        // ✅ Desabilitar cache temporariamente para debug
        const baseResult = await super.findAll<AppointmentJSON>({
            page,
            pageSize,
            orderBy,
            orderDirection,
            filters: finalFilters
        }, false);
        
        logger.debug('AppointmentRepository.findAll - Base result', { 
            dataLength: baseResult.data?.length || 0,
            pagination: baseResult.pagination,
            firstItem: baseResult.data?.[0]
        });
        
        // Buscar relacionamentos em batch para os IDs retornados
        const clinicIds = [...new Set(baseResult.data.map(a => (a as AppointmentJSON).clinic_id).filter(Boolean) as string[])];
        const patientIds = [...new Set(baseResult.data.map(a => (a as AppointmentJSON).patient_id).filter(Boolean) as string[])];
        
        logger.debug('AppointmentRepository.findAll - Related IDs', { clinicIds, patientIds });
        
        // Buscar relacionamentos em paralelo
        const [clinicsData, patientsData] = await Promise.all([
            clinicIds.length > 0 
                ? this.db.table('clinics')
                    .select('id, name, email, phone')
                    .where('id', { in: clinicIds })
                    .execute<Array<{ id: string; name: string; email: string | null; phone: string | null }>>()
                : Promise.resolve([]),
            patientIds.length > 0
                ? this.db.table('patients')
                    .select('id, name, email, phone')
                    .where('id', { in: patientIds })
                    .execute<Array<{ id: string; name: string; email: string | null; phone: string | null }>>()
                : Promise.resolve([])
        ]);
        
        logger.debug('AppointmentRepository.findAll - Related data', { 
            clinicsCount: clinicsData.length, 
            patientsCount: patientsData.length 
        });
        
        // Mapear relacionamentos aos appointments
        const enrichedData = baseResult.data.map(item => {
            const appointment = item as AppointmentJSON;
            
            // Log para debug - verificar se value está presente
            if (import.meta.env.DEV && appointment.value === null || appointment.value === undefined) {
                console.warn('AppointmentRepository.findAll - Appointment sem value', {
                    id: appointment.id,
                    appointment
                });
            }
            
            return {
                ...appointment,
                clinics: clinicsData.find(c => c.id === appointment.clinic_id) || null,
                patients: patientsData.find(p => p.id === appointment.patient_id) || null
            };
        });
        
        // Mapear para entidades Appointment com tratamento de erros
        const finalData: Appointment[] = [];
        for (const item of enrichedData) {
            try {
                // Criar Appointment sem os relacionamentos (que não fazem parte do JSON)
                const appointmentJSON: AppointmentJSON = {
                    id: item.id,
                    patient_id: item.patient_id || '', // Garantir que não seja null
                    clinic_id: item.clinic_id || '', // Garantir que não seja null
                    date: item.date,
                    time: item.time,
                    procedure: item.procedure,
                    value: item.value,
                    currency: item.currency || 'BRL',
                    payment_type: item.payment_type || '100',
                    payment_percentage: item.payment_percentage,
                    is_paid: item.is_paid || false,
                    payment_date: item.payment_date,
                    status: item.status || 'scheduled',
                    clinical_evolution: item.clinical_evolution,
                    notes: item.notes,
                    created_at: item.created_at,
                    updated_at: item.updated_at
                };
                
                const appointment = Appointment.fromJSON(appointmentJSON);
                
                // Adicionar relacionamentos como propriedades adicionais (não fazem parte da entidade)
                (appointment as unknown as { clinics?: unknown; patients?: unknown }).clinics = item.clinics;
                (appointment as unknown as { clinics?: unknown; patients?: unknown }).patients = item.patients;
                
                finalData.push(appointment);
            } catch (error) {
                logger.error(error, { 
                    context: 'AppointmentRepository.findAll - Error mapping appointment',
                    item 
                });
                // Continuar processando outros itens mesmo se um falhar
            }
        }
        
        logger.debug('AppointmentRepository.findAll - Final result', { 
            finalDataLength: finalData.length,
            enrichedDataLength: enrichedData.length,
            firstFinalItem: finalData[0] ? {
                id: finalData[0].id,
                procedure: finalData[0].procedure,
                status: finalData[0].status,
                date: finalData[0].date,
                value: finalData[0].value ? {
                    amount: finalData[0].value.amount,
                    currency: finalData[0].value.currency
                } : null,
                rawValue: enrichedData[0]?.value
            } : null
        });
        
        return {
            data: finalData,
            pagination: baseResult.pagination
        };
    }

    /**
     * Busca um agendamento por ID com relacionamentos
     */
    async findById(id: string): Promise<Appointment | null> {
        const result = await this.executeWithMiddlewares<AppointmentJSON | null>(
            async () => {
                try {
                    const data = await this.query()
                        .select(`
                            *,
                            clinics (*),
                            patients (*)
                        `)
                        .where('id', id)
                        .single()
                        .execute<AppointmentJSON>();
                    
                    return data || null;
                } catch (error) {
                    const errorObj = error as { code?: string; message?: string };
                    // PGRST116 = not found (Supabase)
                    if (errorObj.code === 'PGRST116' || errorObj.message?.includes('not found')) {
                        return null;
                    }
                    throw error;
                }
            },
            { operation: 'findById', metadata: { id } },
            { defaultValue: null }
        );

        if (!result) return null;
        return Appointment.fromJSON(result);
    }

    /**
     * Busca agendamentos por paciente
     */
    async findByPatientId(patientId: string): Promise<Appointment[]> {
        const result = await this.executeWithMiddlewares<AppointmentJSON[]>(
            async () => {
                return await this.query()
                    .select('*')
                    .where('patient_id', patientId)
                    .orderBy('date', 'desc')
                    .orderBy('time', 'desc')
                    .execute<AppointmentJSON[]>();
            },
            { operation: 'findByPatientId', metadata: { patientId } }
        );

        return result.map(item => Appointment.fromJSON(item));
    }

    /**
     * Busca agendamentos por clínica
     */
    async findByClinicId(clinicId: string): Promise<Appointment[]> {
        const result = await this.executeWithMiddlewares<AppointmentJSON[]>(
            async () => {
                return await this.query()
                    .select('*')
                    .where('clinic_id', clinicId)
                    .orderBy('date', 'desc')
                    .orderBy('time', 'desc')
                    .execute<AppointmentJSON[]>();
            },
            { operation: 'findByClinicId', metadata: { clinicId } }
        );

        return result.map(item => Appointment.fromJSON(item));
    }

    /**
     * Busca agendamentos por data
     */
    async findByDate(date: string): Promise<Appointment[]> {
        const result = await this.executeWithMiddlewares<AppointmentJSON[]>(
            async () => {
                return await this.query()
                    .select('*')
                    .whereOperator('date', 'eq', date)
                    .orderBy('time', 'asc')
                    .execute<AppointmentJSON[]>();
            },
            { operation: 'findByDate', metadata: { date } }
        );

        return result.map(item => Appointment.fromJSON(item));
    }

    /**
     * Busca agendamentos por intervalo de datas
     */
    async findByDateRange(startDate: string, endDate: string): Promise<Appointment[]> {
        const result = await this.executeWithMiddlewares<AppointmentJSON[]>(
            async () => {
                return await this.query()
                    .select('*')
                    .whereOperator('date', 'gte', startDate)
                    .whereOperator('date', 'lte', endDate)
                    .orderBy('date', 'asc')
                    .orderBy('time', 'asc')
                    .execute<AppointmentJSON[]>();
            },
            { operation: 'findByDateRange', metadata: { startDate, endDate } }
        );

        return result.map(item => Appointment.fromJSON(item));
    }

    /**
     * Cria um novo agendamento
     * Recebe entidade Appointment que já foi validada
     */
    async create(appointment: Appointment): Promise<Appointment> {
        const result = await this.executeWithMiddlewares<AppointmentJSON>(
            async () => {
                const session = await this.ensureAuth();
                
                // Usar toJSON() da entidade
                const appointmentData = appointment.toJSON();
                appointmentData.user_id = session.user.id; // Garantir user_id
                
                const created = await this.query()
                    .insert([appointmentData])
                    .then(res => (Array.isArray(res) ? res[0] : res) as AppointmentJSON);
                
                return created;
            },
            { operation: 'create' },
            { requireCSRF: true, useCache: false }
        );
        
        // Buscar relacionamentos após criação
        const fullAppointment = await this.findById(result.id);
        if (!fullAppointment) {
            throw new Error('Erro ao criar agendamento');
        }
        return fullAppointment;
    }

    /**
     * Atualiza um agendamento
     * Recebe entidade Appointment que já foi validada e atualizada
     */
    async update(id: string, appointment: Appointment): Promise<Appointment> {
        const result = await this.executeWithMiddlewares<AppointmentJSON>(
            async () => {
                // Usar toJSON() da entidade
                const appointmentData = appointment.toJSON();
                
                const updated = await this.query()
                    .where('id', id)
                    .update(appointmentData)
                    .then(res => (Array.isArray(res) ? res[0] : res) as AppointmentJSON);
                
                return updated;
            },
            { operation: 'update', metadata: { id } },
            { requireCSRF: true, useCache: false }
        );
        
        // Buscar relacionamentos após atualização
        const fullAppointment = await this.findById(result.id);
        if (!fullAppointment) {
            throw new Error('Erro ao atualizar agendamento');
        }
        return fullAppointment;
    }

    /**
     * Deleta um agendamento
     * ✅ Permissões verificadas pelo BaseRepository via PermissionService
     */
    async delete(id: string): Promise<void> {
        await super.delete(id);
    }
}

