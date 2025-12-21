import { Clinic } from '../../domain/entities/Clinic';

/**
 * Interface para ClinicRepository
 * Define o contrato que todas as implementações devem seguir
 */
export interface IClinicRepository {
    /**
     * Busca todas as clínicas
     */
    findAll(): Promise<Clinic[]>;

    /**
     * Busca uma clínica por ID
     */
    findById(id: string): Promise<Clinic | null>;

    /**
     * Cria uma nova clínica
     */
    create(clinic: Partial<Clinic>): Promise<Clinic>;

    /**
     * Atualiza uma clínica
     */
    update(id: string, clinic: Partial<Clinic>): Promise<Clinic>;

    /**
     * Deleta uma clínica
     */
    delete(id: string): Promise<void>;
}

