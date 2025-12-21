import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAuditService } from '../../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { NotFoundError } from '../../../domain/errors/AppError';

/**
 * Input para deleção de paciente
 */
export interface DeletePatientInput {
    id: string;
}

/**
 * Output do use case de deleção de paciente
 */
export interface DeletePatientOutput {
    success: boolean;
}

/**
 * Interface do use case de deleção de paciente
 */
export interface IDeletePatientUseCase {
    execute(input: DeletePatientInput): Promise<DeletePatientOutput>;
}

/**
 * Use case para deleção de paciente
 */
export class DeletePatientUseCase implements IDeletePatientUseCase {
    constructor(
        private readonly patientRepository: IPatientRepository,
        private readonly auditService: IAuditService,
        private readonly cacheService: ICacheService
    ) {}

    /**
     * Executa o use case de deleção de paciente
     */
    async execute(input: DeletePatientInput): Promise<DeletePatientOutput> {
        // 1. Buscar dados para auditoria
        const oldData = await this.patientRepository.findById(input.id);
        if (!oldData) {
            throw new NotFoundError('Paciente', input.id);
        }

        // 2. Deletar
        await this.patientRepository.delete(input.id);
        
        // 3. Side effects (em paralelo)
        await Promise.all([
            this.auditService.log('delete', 'patient', input.id, oldData.toJSON(), null),
            this.cacheService.invalidateByTag('patients')
        ]);
        
        return { success: true };
    }
}

