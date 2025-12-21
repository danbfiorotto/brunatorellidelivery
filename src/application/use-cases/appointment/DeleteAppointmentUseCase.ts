import { IAppointmentRepository } from '../../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IAuditService } from '../../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { NotFoundError } from '../../../domain/errors/AppError';

/**
 * Input para deleção de appointment
 */
export interface DeleteAppointmentInput {
    id: string;
}

/**
 * Output do use case de deleção de appointment
 */
export interface DeleteAppointmentOutput {
    success: boolean;
}

/**
 * Interface do use case de deleção de appointment
 */
export interface IDeleteAppointmentUseCase {
    execute(input: DeleteAppointmentInput): Promise<DeleteAppointmentOutput>;
}

/**
 * Use case para deleção de appointment
 */
export class DeleteAppointmentUseCase implements IDeleteAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly auditService: IAuditService,
        private readonly cacheService: ICacheService
    ) {}

    /**
     * Executa o use case de deleção de appointment
     */
    async execute(input: DeleteAppointmentInput): Promise<DeleteAppointmentOutput> {
        // 1. Buscar dados para auditoria
        const oldData = await this.appointmentRepository.findById(input.id);
        if (!oldData) {
            throw new NotFoundError('Agendamento', input.id);
        }

        // 2. Deletar
        await this.appointmentRepository.delete(input.id);
        
        // 3. Side effects (em paralelo)
        await Promise.all([
            this.auditService.log('delete', 'appointment', input.id, oldData.toJSON(), null),
            this.cacheService.invalidateByTag('appointments')
        ]);
        
        return { success: true };
    }
}

