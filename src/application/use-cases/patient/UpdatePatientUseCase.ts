import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { ISanitizer } from '../../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { Patient } from '../../../domain/entities/Patient';
import { NotFoundError } from '../../../domain/errors/AppError';
import { IInputValidator } from '../../validators/InputValidator';

/**
 * Input para atualização de paciente
 */
export interface UpdatePatientInput {
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
}

/**
 * Output do use case de atualização de paciente
 */
export interface UpdatePatientOutput {
    patient: Patient;
}

/**
 * Interface do use case de atualização de paciente
 */
export interface IUpdatePatientUseCase {
    execute(input: UpdatePatientInput): Promise<UpdatePatientOutput>;
}

/**
 * Use case para atualização de paciente
 */
export class UpdatePatientUseCase implements IUpdatePatientUseCase {
    constructor(
        private readonly patientRepository: IPatientRepository,
        private readonly validator: IInputValidator<UpdatePatientInput>,
        private readonly sanitizer: ISanitizer,
        private readonly auditService: IAuditService,
        private readonly cacheService: ICacheService
    ) {}

    /**
     * Executa o use case de atualização de paciente
     */
    async execute(input: UpdatePatientInput): Promise<UpdatePatientOutput> {
        // 1. Validar input
        const validated = await this.validator.validate(input);
        
        // 2. Buscar paciente existente
        const existing = await this.patientRepository.findById(validated.id);
        if (!existing) {
            throw new NotFoundError('Paciente', validated.id);
        }
        
        // 3. Sanitizar e aplicar atualizações
        if (validated.name !== undefined) {
            existing.updateName(this.sanitizer.sanitizeText(validated.name));
        }
        if (validated.email !== undefined) {
            existing.updateEmail(validated.email ? this.sanitizer.sanitizeText(validated.email) : null);
        }
        if (validated.phone !== undefined) {
            existing.updatePhone(validated.phone ? this.sanitizer.sanitizeText(validated.phone) : null);
        }
        
        // 4. Persistir atualização
        const updated = await this.patientRepository.update(validated.id, existing);
        
        // 5. Side effects (em paralelo)
        await Promise.all([
            this.auditService.log('update', 'patient', validated.id, existing.toJSON(), updated.toJSON()),
            this.cacheService.invalidateByTag('patients')
        ]);
        
        return { patient: updated };
    }
}

