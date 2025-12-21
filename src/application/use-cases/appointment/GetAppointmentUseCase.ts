import { IAppointmentRepository } from '../../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { Appointment } from '../../../domain/entities/Appointment';
import { NotFoundError } from '../../../domain/errors/AppError';

/**
 * Input para busca de appointment
 */
export interface GetAppointmentInput {
    id: string;
}

/**
 * Output do use case de busca de appointment
 */
export interface GetAppointmentOutput {
    appointment: Appointment;
}

/**
 * Interface do use case de busca de appointment
 */
export interface IGetAppointmentUseCase {
    execute(input: GetAppointmentInput): Promise<GetAppointmentOutput>;
}

/**
 * Use case para busca de appointment por ID
 */
export class GetAppointmentUseCase implements IGetAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository
    ) {}

    /**
     * Executa o use case de busca de appointment
     */
    async execute(input: GetAppointmentInput): Promise<GetAppointmentOutput> {
        const appointment = await this.appointmentRepository.findById(input.id);
        if (!appointment) {
            throw new NotFoundError('Agendamento', input.id);
        }
        
        return { appointment };
    }
}

