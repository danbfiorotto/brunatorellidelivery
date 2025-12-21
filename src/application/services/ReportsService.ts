import { IErrorHandler } from '../../infrastructure/errorHandling/IErrorHandler';
import { IAppointmentService } from './interfaces/IAppointmentService';
import { IPatientService } from './interfaces/IPatientService';
import { Appointment } from '../../domain/entities/Appointment';
import { logger } from '../../lib/logger';

/**
 * Serviço para operações de relatórios.
 * 
 * Fornece métodos para buscar dados agregados de agendamentos
 * em períodos específicos para geração de relatórios.
 */
export class ReportsService {
    constructor(
        private readonly appointmentService: IAppointmentService,
        private readonly patientService: IPatientService,
        private readonly errorHandler: IErrorHandler
    ) {}

    /**
     * Busca dados de relatórios para um período (otimizado com filtro no banco)
     */
    async getReportsData(startDate: string, endDate: string): Promise<Appointment[]> {
        try {
            logger.debug('ReportsService.getReportsData - Starting', { startDate, endDate });
            
            // Usar filtro no banco ao invés de carregar tudo e filtrar em memória
            const appointmentsResult = await this.appointmentService.getAll({
                filters: {
                    date: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                orderBy: 'date',
                orderDirection: 'desc',
                pageSize: 10000 // ✅ Buscar todos os registros do período (sem paginação)
            });
            
            logger.debug('ReportsService.getReportsData - Result received', {
                hasData: !!appointmentsResult.data,
                dataLength: appointmentsResult.data?.length || 0,
                pagination: appointmentsResult.pagination
            });
            
            // ✅ Extrair array de appointments do PaginationResult
            const appointments = appointmentsResult.data || [];

            logger.debug('ReportsService.getReportsData - Returning', {
                appointmentsCount: appointments.length,
                firstAppointment: appointments[0] ? {
                    id: appointments[0].id,
                    date: appointments[0].date,
                    status: appointments[0].status.toString()
                } : null
            });

            return appointments;
        } catch (error) {
            logger.error(error, { context: 'ReportsService.getReportsData', startDate, endDate });
            throw this.errorHandler.handle(error, { context: 'ReportsService.getReportsData', startDate, endDate });
        }
    }
}

