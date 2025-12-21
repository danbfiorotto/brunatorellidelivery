import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { calculateReceivedValue } from '../../lib/utils';
import { IAppointmentService } from './interfaces/IAppointmentService';
import { IPatientService } from './interfaces/IPatientService';
import { IClinicService } from './interfaces/IClinicService';
import { Appointment } from '../../domain/entities/Appointment';
import { Clinic } from '../../domain/entities/Clinic';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { DatabaseError } from '../../domain/errors/AppError';
import { extractArray } from '../../lib/typeGuards';
import { getSession } from '../../lib/auth';

interface DashboardStats {
    revenue: number;
    pending: number;
    appointments: number;
    clinics: number;
}

interface ClinicRankingItem {
    id: string;
    name: string;
    revenue: number;
    appointments: number;
    paid: number;
    ticket: number;
}

interface WeeklyDataItem {
    label: string;
    finished: number;
    pending: number;
}

interface AllDashboardData {
    stats: DashboardStats;
    ranking: ClinicRankingItem[];
    weeklyData: WeeklyDataItem[];
}

/**
 * Serviço para operações do Dashboard.
 * 
 * Fornece métodos otimizados para buscar estatísticas e dados agregados
 * do dashboard, utilizando queries eficientes para melhor performance.
 */
export class DashboardService {
    constructor(
        private readonly appointmentService: IAppointmentService, 
        private readonly patientService: IPatientService, 
        private readonly clinicService: IClinicService,
        private readonly db: DatabaseAdapter,
        private readonly cache: ICacheService,
        private readonly errorHandler: IErrorHandler
    ) {}

    /**
     * Busca estatísticas do dashboard usando agregações SQL
     */
    async getStats(): Promise<DashboardStats> {
        try {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const startOfMonthStr = startOfMonth.toISOString().split('T')[0];
            
            // Log para debug
            if (import.meta.env.DEV) {
                console.debug('DashboardService.getStats - Starting', {
                    startOfMonth: startOfMonthStr,
                    currentDate: now.toISOString().split('T')[0]
                });
            }
            
            // Usar agregações SQL ao invés de carregar todos os dados
            const [revenueResult, pendingResult, appointmentsCount, clinicsCount] = await Promise.all([
                // Receita: soma de valores recebidos de appointments pagos
                this.getRevenueAggregate(startOfMonthStr),
                // Pendente: soma de valores pendentes
                this.getPendingAggregate(startOfMonthStr),
                // Total de appointments
                this.getAppointmentsCount(startOfMonthStr),
                // Total de clínicas ativas
                this.getActiveClinicsCount()
            ]);
            
            const stats = {
                revenue: Number(revenueResult) || 0,
                pending: Number(pendingResult) || 0,
                appointments: Number(appointmentsCount) || 0,
                clinics: Number(clinicsCount) || 0
            };
            
            // Log para debug
            if (import.meta.env.DEV) {
                console.debug('DashboardService.getStats - Results', {
                    stats,
                    rawResults: {
                        revenue: revenueResult,
                        pending: pendingResult,
                        appointments: appointmentsCount,
                        clinics: clinicsCount
                    }
                });
            }
            
            return stats;
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'DashboardService.getStats' });
        }
    }
    
    /**
     * Calcula receita usando agregação SQL
     */
    private async getRevenueAggregate(startDate: string): Promise<number> {
        try {
            // ✅ Usar DatabaseAdapter.rpc() ao invés de import direto
            const data = await this.db.rpc('calculate_revenue', { start_date: startDate }) as { revenue?: number } | null;
            
            // Se RPC retornou null (função não existe ou sem permissão), usar fallback silenciosamente
            if (data === null) {
                return this.getRevenueFallback(startDate);
            }
            
            if (data?.revenue !== undefined) {
                return Number(data.revenue) || 0;
            }
            
            // Fallback: calcular em memória se RPC não disponível
            return this.getRevenueFallback(startDate);
        } catch (error) {
            // Se RPC falhar, usar fallback (não logar erro esperado)
            // Apenas logar em desenvolvimento para debug
            if (import.meta.env.DEV) {
                console.debug('RPC calculate_revenue não disponível, usando fallback', error);
            }
            return this.getRevenueFallback(startDate);
        }
    }
    
    /**
     * Fallback: calcular receita usando query otimizada no banco
     * ✅ Usa query agregada ao invés de carregar todos os appointments
     * ✅ Adiciona cache para melhorar performance
     */
    private async getRevenueFallback(startDate: string): Promise<number> {
        const cacheKey = `dashboard:revenue:fallback:${startDate}`;
        
        // ✅ Tentar obter do cache primeiro (desabilitar temporariamente para debug)
        // const cached = await this.cache.get<number>(cacheKey);
        // if (cached !== null) {
        //     return cached;
        // }
        
        try {
            // ✅ Usar query agregada no banco ao invés de carregar todos os appointments
            // Usar filtros combinados em um único where para garantir que funcionem corretamente
            const queryBuilder = this.db.table('appointments')
                .select('value, payment_type, payment_percentage, status')
                .where('date', { gte: startDate });
            
            // Adicionar filtro de status separadamente
            const appointments = await queryBuilder
                .whereOperator('status', 'eq', 'paid')
                .execute<Array<{ value: number | string | null; payment_type: string | null; payment_percentage: number | string | null; status: string }>>();
            
            const appointmentsArray = Array.isArray(appointments) ? appointments : [];
            
            // Log para debug
            console.log('DashboardService.getRevenueFallback - Appointments found', {
                count: appointmentsArray.length,
                sample: appointmentsArray.slice(0, 3),
                startDate,
                allAppointments: appointmentsArray
            });
            
            // Calcular receita usando função utilitária
            const revenue = appointmentsArray.reduce((sum, apt) => {
                // Garantir que os dados estão no formato correto
                const appointmentData = {
                    value: apt.value ? parseFloat(String(apt.value)) : 0,
                    payment_type: apt.payment_type || '100',
                    payment_percentage: apt.payment_percentage ? parseFloat(String(apt.payment_percentage)) : null
                };
                
                const receivedValue = calculateReceivedValue(appointmentData);
                console.log('DashboardService.getRevenueFallback - Calculating', {
                    apt,
                    appointmentData,
                    receivedValue,
                    currentSum: sum
                });
                return sum + receivedValue;
            }, 0);
            
            // Log para debug
            console.log('DashboardService.getRevenueFallback - Calculated revenue', {
                revenue,
                appointmentsCount: appointmentsArray.length
            });
            
            // ✅ Cachear resultado por 5 minutos
            await this.cache.set(cacheKey, revenue, 5 * 60 * 1000);
            
            return revenue;
        } catch (error) {
            console.error('DashboardService.getRevenueFallback - Error', error);
            throw this.errorHandler.handle(error, { context: 'DashboardService.getRevenueFallback' });
        }
    }
    
    /**
     * Calcula pendente usando agregação SQL
     */
    private async getPendingAggregate(startDate: string): Promise<number> {
        try {
            // ✅ Usar DatabaseAdapter.rpc() ao invés de import direto
            const data = await this.db.rpc('calculate_pending', { start_date: startDate }) as { pending?: number } | null;
            
            // Se RPC retornou null (função não existe ou sem permissão), usar fallback silenciosamente
            if (data === null) {
                return this.getPendingFallback(startDate);
            }
            
            if (data?.pending !== undefined) {
                return Number(data.pending) || 0;
            }
            
            // Fallback: calcular em memória
            return this.getPendingFallback(startDate);
        } catch (error) {
            // Se RPC falhar, usar fallback (não logar erro esperado)
            // Apenas logar em desenvolvimento para debug
            if (import.meta.env.DEV) {
                console.debug('RPC calculate_pending não disponível, usando fallback', error);
            }
            return this.getPendingFallback(startDate);
        }
    }
    
    /**
     * Fallback: calcular pendente em memória
     * ✅ Usa type guard para validação de tipos
     * ✅ Adiciona cache para melhorar performance
     */
    private async getPendingFallback(startDate: string): Promise<number> {
        const cacheKey = `dashboard:pending:fallback:${startDate}`;
        
        // Tentar obter do cache primeiro (desabilitar temporariamente para debug)
        // const cached = await this.cache.get<number>(cacheKey);
        // if (cached !== null) {
        //     return cached;
        // }
        
        try {
            // Buscar appointments pendentes diretamente do banco para melhor performance
            const queryBuilder = this.db.table('appointments')
                .select('value, payment_type, payment_percentage, status')
                .where('date', { gte: startDate });
            
            // Adicionar filtro de status separadamente
            const appointments = await queryBuilder
                .whereOperator('status', 'eq', 'pending')
                .execute<Array<{ value: number | string | null; payment_type: string | null; payment_percentage: number | string | null; status: string }>>();
            
            const appointmentsArray = Array.isArray(appointments) ? appointments : [];
            
            // Log para debug
            console.log('DashboardService.getPendingFallback - Pending appointments found', {
                count: appointmentsArray.length,
                sample: appointmentsArray.slice(0, 3),
                startDate,
                allAppointments: appointmentsArray
            });
            
            const pending = appointmentsArray.reduce((sum, apt) => {
                // Garantir que os dados estão no formato correto
                const totalValue = apt.value ? parseFloat(String(apt.value)) : 0;
                const appointmentData = {
                    value: totalValue,
                    payment_type: apt.payment_type || '100',
                    payment_percentage: apt.payment_percentage ? parseFloat(String(apt.payment_percentage)) : null
                };
                
                const receivedValue = calculateReceivedValue(appointmentData);
                return sum + (totalValue - receivedValue);
            }, 0);
            
            // Log para debug
            console.log('DashboardService.getPendingFallback - Calculated pending', {
                pending,
                appointmentsCount: appointmentsArray.length
            });
            
            // Cachear resultado por 5 minutos
            await this.cache.set(cacheKey, pending, 5 * 60 * 1000);
            
            return pending;
        } catch (error) {
            console.error('DashboardService.getPendingFallback - Error', error);
            throw this.errorHandler.handle(error, { context: 'DashboardService.getPendingFallback' });
        }
    }
    
    /**
     * Conta appointments usando COUNT SQL
     */
    private async getAppointmentsCount(startDate: string): Promise<number> {
        try {
            // ✅ Usar DatabaseAdapter ao invés de import direto
            return await this.db.table('appointments').count({
                date: { gte: startDate }
            });
        } catch (error) {
            // Fallback: usar service se count falhar
            try {
                const appointmentsResult = await this.appointmentService.getAll({
                    filters: {
                        date: { gte: startDate }
                    }
                });
                
                // ✅ Usar type guard ao invés de type assertion
                const appointments = extractArray<Appointment>(appointmentsResult);
                
                return appointments.length;
            } catch (fallbackError) {
                throw this.errorHandler.handle(fallbackError, { context: 'DashboardService.getAppointmentsCount' });
            }
        }
    }
    
    /**
     * Conta clínicas ativas usando COUNT SQL
     */
    /**
     * Conta clínicas únicas do usuário atual
     * ✅ Filtra por clínicas que têm appointments de patients do usuário
     */
    private async getActiveClinicsCount(): Promise<number> {
        try {
            // ✅ Obter sessão do usuário atual
            const session = await getSession();
            if (!session?.user?.id) {
                // Se não autenticado, retornar 0
                return 0;
            }
            
            const userId = session.user.id;
            
            // ✅ Buscar appointments do usuário para obter clinic_ids únicos
            // Estratégia: buscar appointments através de patients do usuário
            const appointmentsResult = await this.appointmentService.getAll({
                pageSize: 10000 // Buscar todos para contar clínicas únicas
            });
            
            const appointmentsArray = Array.isArray(appointmentsResult) 
                ? appointmentsResult 
                : appointmentsResult.data || [];
            
            // ✅ Filtrar appointments do usuário atual (através de patients)
            // Primeiro, buscar patients do usuário
            const patientsResult = await this.patientService.getAll({
                pageSize: 10000
            });
            
            const patientsArray = Array.isArray(patientsResult)
                ? patientsResult
                : patientsResult.data || [];
            
            const userPatientIds = new Set<string>();
            patientsArray.forEach((patient: any) => {
                if (patient.userId === userId || (patient as any).user_id === userId) {
                    userPatientIds.add(patient.id);
                }
            });
            
            // ✅ Extrair clinic_ids únicos dos appointments do usuário
            const uniqueClinicIds = new Set<string>();
            appointmentsArray.forEach((apt: any) => {
                const patientId = apt.patientId || apt.patient_id;
                if (patientId && userPatientIds.has(patientId)) {
                    const clinicId = apt.clinicId || apt.clinic_id;
                    if (clinicId) {
                        uniqueClinicIds.add(clinicId);
                    }
                }
            });
            
            // ✅ Buscar clínicas ativas desses IDs
            if (uniqueClinicIds.size > 0) {
                const clinicIdsArray = Array.from(uniqueClinicIds);
                const clinicsResult = await this.clinicService.getAll({
                    filters: {
                        id: { in: clinicIdsArray },
                        status: 'active'
                    },
                    pageSize: 10000
                });
                
                const clinics = extractArray<Clinic>(clinicsResult);
                return clinics.length;
            }
            
            return 0;
        } catch (error) {
            // Fallback: retornar 0 se houver erro
            console.error('DashboardService.getActiveClinicsCount - Error', error);
            return 0;
        }
    }

    /**
     * Busca ranking de clínicas por receita (otimizado com função SQL)
     * ✅ Usa função SQL get_clinic_ranking() para melhor performance
     */
    async getClinicRanking(): Promise<ClinicRankingItem[]> {
        try {
            // ✅ Tentar usar função SQL otimizada primeiro
            try {
                const data = await this.db.rpc('get_clinic_ranking') as Array<{
                    clinic_id: string;
                    clinic_name: string;
                    revenue: number;
                    appointments_count: number;
                    paid_count: number;
                    ticket_medio: number;
                }>;
                
                if (data && Array.isArray(data) && data.length > 0) {
                    return data.map(item => ({
                        id: item.clinic_id,
                        name: item.clinic_name,
                        revenue: Number(item.revenue) || 0,
                        appointments: Number(item.appointments_count) || 0,
                        paid: Number(item.paid_count) || 0,
                        ticket: Number(item.ticket_medio) || 0
                    }));
                }
            } catch (rpcError) {
                // Se função SQL não existir, usar fallback em memória
                // Log apenas em desenvolvimento
                if (import.meta.env.DEV) {
                    console.warn('Função SQL get_clinic_ranking não encontrada, usando fallback', rpcError);
                }
            }
            
            // Fallback: calcular em memória (menos eficiente)
            return this.getClinicRankingFallback();
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'DashboardService.getClinicRanking' });
        }
    }
    
    /**
     * Fallback: calcular ranking usando agregação SQL otimizada
     * ✅ Usa agregação SQL ao invés de carregar todos appointments em memória
     * ✅ Adiciona cache para melhorar performance
     */
    private async getClinicRankingFallback(): Promise<ClinicRankingItem[]> {
        const cacheKey = 'dashboard:clinic-ranking:fallback';
        
        // Tentar obter do cache primeiro
        const cached = await this.cache.get<ClinicRankingItem[]>(cacheKey);
        if (cached !== null) {
            return cached;
        }
        
        try {
            // ✅ Usar agregação SQL ao invés de carregar tudo em memória
            // Buscar apenas dados agregados necessários
            const rankingData = await this.db.table('appointments')
                .select(`
                    clinic_id,
                    clinics!inner(id, name),
                    count(*) as appointments_count,
                    sum(case when status = 'paid' then 1 else 0 end) as paid_count,
                    sum(case when status = 'paid' then 
                        case 
                            when payment_type = '100' then value
                            when payment_type = 'percentage' then value * (COALESCE(payment_percentage, 0) / 100.0)
                            else 0
                        end
                    else 0 end) as revenue
                `)
                .groupBy('clinic_id', 'clinics.id', 'clinics.name')
                .orderBy('revenue', 'desc')
                .limit(20) // Limitar top 20
                .execute<Array<{
                    clinic_id: string;
                    clinics: { id: string; name: string };
                    appointments_count: number;
                    paid_count: number;
                    revenue: number;
                }>>();
            
            const ranking = rankingData.map(item => ({
                id: item.clinic_id || item.clinics.id,
                name: item.clinics.name || 'Sem clínica',
                revenue: Number(item.revenue) || 0,
                appointments: Number(item.appointments_count) || 0,
                paid: Number(item.paid_count) || 0,
                ticket: Number(item.paid_count) > 0 
                    ? Number(item.revenue) / Number(item.paid_count) 
                    : 0
            }));
            
            // Cachear resultado por 10 minutos
            await this.cache.set(cacheKey, ranking, 10 * 60 * 1000);
            
            return ranking;
        } catch (error) {
            // Se agregação SQL falhar, usar fallback em memória (comentado para evitar carregar tudo)
            // Por enquanto, retornar array vazio e logar erro
            console.warn('Failed to get clinic ranking via SQL aggregation, returning empty array', error);
            return [];
        }
    }

    /**
     * Busca dados semanais para gráfico (otimizado com filtro no banco)
     */
    async getWeeklyData(): Promise<WeeklyDataItem[]> {
        try {
            // Buscar apenas agendamentos da última semana usando filtro no banco
            const now = new Date();
            const oneWeekAgo = new Date(now);
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
            const nowStr = now.toISOString().split('T')[0];
            
            // Usar filtro de data para limitar resultados no banco
            const appointmentsResult = await this.appointmentService.getAll({
                filters: {
                    date: { 
                        gte: oneWeekAgoStr,
                        lte: nowStr
                    }
                }
            });
            
            // ✅ Usar type guard ao invés de type assertion
            const weekAppointments = extractArray<Appointment>(appointmentsResult);

            // Agrupar por dia
            const dayMap: Record<string, { finished: number; pending: number }> = {};
            weekAppointments.forEach(apt => {
                const aptDate = apt.date instanceof Date ? apt.date : new Date(apt.date);
                const day = aptDate.toLocaleDateString('pt-BR', { weekday: 'short' });
                if (!dayMap[day]) {
                    dayMap[day] = { finished: 0, pending: 0 };
                }
                if (apt.status.toString() === 'paid') {
                    dayMap[day].finished++;
                } else if (apt.status.toString() === 'pending' || apt.status.toString() === 'scheduled') {
                    dayMap[day].pending++;
                }
            });

            const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
            return days.map(day => ({
                label: day,
                finished: dayMap[day]?.finished || 0,
                pending: dayMap[day]?.pending || 0
            }));
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'DashboardService.getWeeklyData' });
        }
    }

    /**
     * Busca todos os dados do dashboard de forma otimizada
     */
    async getAllDashboardData(): Promise<AllDashboardData> {
        try {
            // Executar queries em paralelo
            const [stats, ranking, weeklyData] = await Promise.all([
                this.getStats(),
                this.getClinicRanking(),
                this.getWeeklyData()
            ]);

            return {
                stats,
                ranking,
                weeklyData
            };
        } catch (error) {
            throw this.errorHandler.handle(error, { context: 'DashboardService.getAllDashboardData' });
        }
    }
}

