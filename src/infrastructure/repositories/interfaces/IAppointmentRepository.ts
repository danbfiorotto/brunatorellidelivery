import { Appointment } from '../../domain/entities/Appointment';

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

