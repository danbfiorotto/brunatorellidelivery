import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { Patient } from '../../../domain/entities/Patient';
import { NotFoundError } from '../../../domain/errors/AppError';

/**
 * Input para busca de paciente
 */
export interface GetPatientInput {
    id: string;
}

/**
 * Output do use case de busca de paciente
 */
export interface GetPatientOutput {
    patient: Patient;
}

/**
 * Interface do use case de busca de paciente
 */
export interface IGetPatientUseCase {
    execute(input: GetPatientInput): Promise<GetPatientOutput>;
}

/**
 * Use case para busca de paciente por ID
 */
export class GetPatientUseCase implements IGetPatientUseCase {
    constructor(
        private readonly patientRepository: IPatientRepository
    ) {}

    /**
     * Executa o use case de busca de paciente
     */
    async execute(input: GetPatientInput): Promise<GetPatientOutput> {
        const patient = await this.patientRepository.findById(input.id);
        if (!patient) {
            throw new NotFoundError('Paciente', input.id);
        }
        
        return { patient };
    }
}

