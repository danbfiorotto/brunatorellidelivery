import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAuthService } from '../../../infrastructure/auth/IAuthService';
import { IInputValidator } from '../../validators/InputValidator';
import { ISanitizer } from '../../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { Patient } from '../../../domain/entities/Patient';
import { CreatePatientSchema } from '../../dto/schemas/PatientSchemas';

/**
 * Input para criação de paciente
 */
export interface CreatePatientInput {
    name: string;
    email?: string | null;
    phone?: string | null;
}

/**
 * Output do use case de criação de paciente
 */
export interface CreatePatientOutput {
    patient: Patient;
}

/**
 * Interface do use case de criação de paciente
 */
export interface ICreatePatientUseCase {
    execute(input: CreatePatientInput): Promise<CreatePatientOutput>;
}

/**
 * Use case para criação de paciente
 * Separa responsabilidades: validação, sanitização, criação, persistência, side effects
 */
export class CreatePatientUseCase implements ICreatePatientUseCase {
    constructor(
        private readonly patientRepository: IPatientRepository,
        private readonly authService: IAuthService,
        private readonly validator: IInputValidator<CreatePatientInput>,
        private readonly sanitizer: ISanitizer,
        private readonly auditService: IAuditService,
        private readonly cacheService: ICacheService
    ) {}

    /**
     * Executa o use case de criação de paciente
     */
    async execute(input: CreatePatientInput): Promise<CreatePatientOutput> {
        // 1. Validar input
        const validated = await this.validator.validate(input);
        
        // 2. Sanitizar dados
        const sanitized = {
            name: this.sanitizer.sanitizeText(validated.name),
            email: validated.email ? this.sanitizer.sanitizeText(validated.email) : null,
            phone: validated.phone ? this.sanitizer.sanitizeText(validated.phone) : null
        };
        
        // 3. Obter contexto (userId)
        const userId = await this.authService.getCurrentUserId();
        
        // 4. Criar entidade (Domain)
        const patient = Patient.create({
            name: sanitized.name,
            email: sanitized.email,
            phone: sanitized.phone,
            userId
        });
        
        // 5. Persistir (Infrastructure)
        const created = await this.patientRepository.create(patient);
        
        // 6. Side effects (em paralelo para melhor performance)
        await Promise.all([
            this.auditService.log('create', 'patient', created.id, null, created.toJSON()),
            this.cacheService.invalidateByTag('patients')
        ]);
        
        return { patient: created };
    }
}

