import { Appointment } from '../../../domain/entities/Appointment';

/**
 * Interface para totais de appointments calculados no servidor
 */
export interface AppointmentTotals {
    total: number;
    received: number;
    pending: number;
    totalValue: number;
    byStatus: {
        scheduled: number;
        pending: number;
        paid: number;
    };
}

/**
 * Interface para AppointmentRepository
 * Define o contrato que todas as implementações devem seguir
 */
export interface IAppointmentRepository {
    /**
     * Busca todos os agendamentos
     */
    findAll(options?: Record<string, unknown>): Promise<Appointment[] | { data: Appointment[]; pagination: unknown }>;

    /**
     * Busca um agendamento por ID
     */
    findById(id: string): Promise<Appointment | null>;

    /**
     * Busca agendamentos por paciente
     */
    findByPatientId(patientId: string): Promise<Appointment[]>;

    /**
     * Busca agendamentos por clínica
     */
    findByClinicId(clinicId: string): Promise<Appointment[]>;

    /**
     * Busca agendamentos por data
     */
    findByDate(date: string): Promise<Appointment[]>;

    /**
     * Busca agendamentos por intervalo de datas
     */
    findByDateRange(startDate: string, endDate: string): Promise<Appointment[]>;

    /**
     * Obtém totais de appointments calculados no servidor
     * Retorna total, valores recebidos, valores pendentes e contagem por status
     */
    getTotals(): Promise<AppointmentTotals>;

    /**
     * Cria um novo agendamento
     * Recebe entidade Appointment que já foi validada
     */
    create(appointment: Appointment): Promise<Appointment>;

    /**
     * Atualiza um agendamento
     * Recebe entidade Appointment que já foi validada e atualizada
     */
    update(id: string, appointment: Appointment): Promise<Appointment>;

    /**
     * Deleta um agendamento
     */
    delete(id: string): Promise<void>;
}

