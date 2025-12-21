import { Patient } from '../../domain/entities/Patient';

/**
 * Interface para PatientRepository
 * Define o contrato que todas as implementações devem seguir
 */
export interface IPatientRepository {
    /**
     * Busca todos os pacientes
     */
    findAll(options?: Record<string, unknown>): Promise<Patient[] | { data: Patient[]; pagination: unknown }>;

    /**
     * Busca um paciente por ID
     */
    findById(id: string): Promise<Patient | null>;

    /**
     * Busca pacientes por nome ou email
     */
    findByNameOrEmail(name: string, email?: string | null): Promise<Patient | null>;

    /**
     * Cria um novo paciente
     * Recebe entidade Patient que já foi validada
     */
    create(patient: Patient): Promise<Patient>;

    /**
     * Atualiza um paciente
     * Recebe entidade Patient que já foi validada e atualizada
     */
    update(id: string, patient: Patient): Promise<Patient>;

    /**
     * Deleta um paciente
     */
    delete(id: string): Promise<void>;
}

