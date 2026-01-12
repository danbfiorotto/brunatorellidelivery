import { BaseRepository } from '../BaseRepository';
import { IPatientRepository } from '../interfaces/IPatientRepository';
import { Patient, PatientJSON } from '../../../domain/entities/Patient';
import { Appointment, AppointmentJSON } from '../../../domain/entities/Appointment';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { PermissionService } from '../../application/services/PermissionService';
import { IAuthClient } from '../../infrastructure/auth/IAuthClient';
import { logger } from '../../../lib/logger';

/**
 * Repositório para operações de pacientes
 */
export class PatientRepository extends BaseRepository implements IPatientRepository {
    constructor(
        db: DatabaseAdapter, 
        cacheService: ICacheService, 
        permissionService: PermissionService | null = null,
        authClient: IAuthClient
    ) {
        super('patients', db, cacheService, permissionService, authClient);
    }

    /**
     * Busca todos os pacientes ordenados por data de criação
     * Usa BaseRepository.findAll() com opções padrão
     */
    async findAll(options: Record<string, unknown> = {}) {
        // Usar BaseRepository.findAll() com ordenação padrão
        const defaultOptions = {
            orderBy: 'created_at',
            orderDirection: 'desc',
            ...options
        };
        
        const result = await super.findAll<PatientJSON>(defaultOptions);
        
        // Retornar no formato esperado pela interface (compatibilidade)
        return {
            data: result.data.map(item => Patient.fromJSON(item)),
            pagination: result.pagination
        };
    }

    /**
     * Busca um paciente por ID com seus agendamentos
     * ✅ Otimizado com opções para controlar o que carregar
     */
    async findById(
        id: string, 
        options: {
            includeAppointments?: boolean;
            appointmentsLimit?: number;
            includeClinic?: boolean;
        } = {}
    ): Promise<Patient | null> {
        const { 
            includeAppointments = true, 
            appointmentsLimit = 50,
            includeClinic = true
        } = options;
        
        let selectQuery = '*';
        if (includeAppointments) {
            const clinicFields = includeClinic 
                ? ', clinics (id, name, address, email, phone)'
                : '';
            
            // ✅ Usar appointments (sem !inner) para retornar paciente mesmo sem appointments
            selectQuery = `
                *,
                appointments (
                    id, date, time, procedure, value, currency, status,
                    payment_type, payment_percentage, is_paid, payment_date,
                    clinical_evolution, notes, created_at
                    ${clinicFields}
                )
            `;
        }
        
        const result = await this.executeWithMiddlewares<PatientJSON & { appointments?: unknown } | null>(
            async () => {
                let query = this.query()
                    .select(selectQuery)
                    .where('id', id)
                    .single();
                
                // ✅ Ordenar appointments por data (mais recentes primeiro) e limitar
                if (includeAppointments && appointmentsLimit) {
                    // Nota: O limit aqui não funciona diretamente com relacionamentos no Supabase
                    // Vamos processar após receber os dados
                }
                
                return await query.execute<PatientJSON & { appointments?: unknown }>();
            },
            { operation: 'findById', metadata: { id, options } },
            { defaultValue: null }
        );

        if (!result) {
            logger.debug('PatientRepository.findById - Patient not found', { id });
            return null;
        }
        
        logger.debug('PatientRepository.findById - Result received', {
            patientId: result.id,
            hasAppointments: !!result.appointments,
            appointmentsType: Array.isArray(result.appointments) ? 'array' : typeof result.appointments,
            appointmentsLength: Array.isArray(result.appointments) ? result.appointments.length : (result.appointments ? 1 : 0)
        });
        
        // ✅ Criar entidade Patient
        const patient = Patient.fromJSON(result);
        
        // ✅ Processar appointments se incluídos
        if (includeAppointments && result.appointments) {
            let appointmentsArray: unknown[] = [];
            
            // Normalizar appointments (pode vir como array ou objeto único)
            if (Array.isArray(result.appointments)) {
                appointmentsArray = result.appointments;
            } else if (result.appointments && typeof result.appointments === 'object') {
                appointmentsArray = [result.appointments];
            }
            
            // ✅ Converter appointments para entidades Appointment e adicionar como propriedade adicional
            const processedAppointments = appointmentsArray
                .slice(0, appointmentsLimit) // Limitar após receber
                .map((apt: any) => {
                    try {
                        const appointmentJSON: AppointmentJSON = {
                            id: apt.id,
                            patient_id: result.id,
                            clinic_id: apt.clinic_id || '',
                            date: apt.date,
                            time: apt.time,
                            procedure: apt.procedure,
                            value: apt.value,
                            currency: apt.currency || 'BRL',
                            payment_type: apt.payment_type || '100',
                            payment_percentage: apt.payment_percentage,
                            is_paid: apt.is_paid || false,
                            payment_date: apt.payment_date,
                            status: apt.status || 'scheduled',
                            clinical_evolution: apt.clinical_evolution,
                            notes: apt.notes,
                            created_at: apt.created_at,
                            updated_at: apt.updated_at
                        };
                        
                        const appointment = Appointment.fromJSON(appointmentJSON);
                        
                        // ✅ Adicionar relacionamentos como propriedades adicionais
                        (appointment as unknown as { clinics?: unknown }).clinics = apt.clinics || null;
                        
                        return appointment;
                    } catch (error) {
                        logger.error(error, { 
                            context: 'PatientRepository.findById - Error mapping appointment',
                            appointment: apt 
                        });
                        return null;
                    }
                })
                .filter((apt): apt is Appointment => apt !== null)
                .sort((a, b) => {
                    // Ordenar por data (mais recentes primeiro)
                    const dateA = new Date(a.date);
                    const dateB = new Date(b.date);
                    if (dateA.getTime() !== dateB.getTime()) {
                        return dateB.getTime() - dateA.getTime();
                    }
                    // Se mesma data, ordenar por hora
                    return b.time.localeCompare(a.time);
                });
            
            // ✅ Adicionar appointments como propriedade adicional (não faz parte da entidade)
            (patient as unknown as { appointments?: Appointment[] }).appointments = processedAppointments;
            
            logger.debug('PatientRepository.findById - Appointments processed', {
                patientId: patient.id,
                appointmentsCount: processedAppointments.length,
                firstAppointment: processedAppointments[0] ? {
                    id: processedAppointments[0].id,
                    date: processedAppointments[0].date,
                    procedure: processedAppointments[0].procedure.toString()
                } : null
            });
        } else {
            // ✅ Garantir que appointments seja um array vazio se não incluídos
            (patient as unknown as { appointments?: Appointment[] }).appointments = [];
        }
        
        return patient;
    }

    /**
     * Busca paciente por nome ou email
     */
    async findByNameOrEmail(name: string, email: string | null = null): Promise<Patient | null> {
        if (!name) {
            return null;
        }

        const result = await this.executeWithMiddlewares<PatientJSON | null>(
            async () => {
                let query = this.query()
                    .select('*')
                    .limit(1);
                
                if (email) {
                    // Buscar por nome OU email usando operador OR
                    // Usar busca exata para melhor performance
                    query = query.or(`name.eq.${name},email.eq.${email}`);
                } else {
                    // Buscar apenas por nome - usar busca exata (case-sensitive)
                    // O Supabase PostgREST precisa que o nome seja exato
                    query = query.where('name', name);
                }
                
                // Usar maybeSingle() que retorna null se não encontrar ao invés de lançar erro
                const data = await query.maybeSingle().execute<PatientJSON | null>();
                return data;
            },
            { operation: 'findByNameOrEmail', metadata: { name, email } },
            { defaultValue: null }
        );

        if (!result) return null;
        return Patient.fromJSON(result);
    }

    /**
     * Cria um novo paciente
     * Recebe entidade Patient que já foi validada
     */
    async create(patient: Patient): Promise<Patient> {
        const result = await this.executeWithMiddlewares<PatientJSON>(
            async () => {
                const session = await this.ensureAuth();
                
                // Usar toJSON() da entidade
                const patientData = patient.toJSON();
                patientData.user_id = session.user.id; // Garantir user_id
                
                const created = await this.query()
                    .insert([patientData])
                    .then(res => (Array.isArray(res) ? res[0] : res) as PatientJSON);
                
                return created;
            },
            { operation: 'create' },
            { requireCSRF: true, useCache: false }
        );

        return Patient.fromJSON(result);
    }

    /**
     * Atualiza um paciente
     * Recebe entidade Patient que já foi validada e atualizada
     */
    async update(id: string, patient: Patient): Promise<Patient> {
        const result = await this.executeWithMiddlewares<PatientJSON>(
            async () => {
                // Usar toJSON() da entidade
                const patientData = patient.toJSON();

                // ✅ Usar whereOperator ao invés de where para garantir que a query está no estado correto
                const updated = await this.query()
                    .whereOperator('id', 'eq', id)
                    .update(patientData)
                    .then(res => (Array.isArray(res) ? res[0] : res) as PatientJSON);
                
                return updated;
            },
            { operation: 'update', metadata: { id } },
            { requireCSRF: true, useCache: false }
        );

        return Patient.fromJSON(result);
    }

    /**
     * Deleta um paciente
     * ✅ Permissões verificadas pelo BaseRepository via PermissionService
     */
    async delete(id: string): Promise<void> {
        await super.delete(id);
    }
}

