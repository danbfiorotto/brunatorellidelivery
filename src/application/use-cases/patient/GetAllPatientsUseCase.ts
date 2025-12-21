import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { Patient } from '../../../domain/entities/Patient';

/**
 * Opções de busca para pacientes
 */
export interface GetAllPatientsOptions {
    page?: number;
    pageSize?: number;
    filters?: Record<string, unknown>;
}

/**
 * Resultado paginado
 */
export interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Input para busca de todos os pacientes
 */
export interface GetAllPatientsInput {
    options?: GetAllPatientsOptions;
}

/**
 * Output do use case de busca de todos os pacientes
 */
export interface GetAllPatientsOutput {
    patients: Patient[] | PaginationResult<Patient>;
}

/**
 * Interface do use case de busca de todos os pacientes
 */
export interface IGetAllPatientsUseCase {
    execute(input?: GetAllPatientsInput): Promise<GetAllPatientsOutput>;
}

/**
 * Use case para busca de todos os pacientes
 */
export class GetAllPatientsUseCase implements IGetAllPatientsUseCase {
    constructor(
        private readonly patientRepository: IPatientRepository
    ) {}

    /**
     * Executa o use case de busca de todos os pacientes
     */
    async execute(input: GetAllPatientsInput = {}): Promise<GetAllPatientsOutput> {
        const result = await this.patientRepository.findAll(input.options || {});
        
        if (Array.isArray(result)) {
            return { patients: result };
        }
        
        return { patients: result as PaginationResult<Patient> };
    }
}

