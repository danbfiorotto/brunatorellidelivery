import { Patient } from '../entities/Patient';

export interface PatientData {
    patient_id?: string;
    patient_name: string;
    patient_email?: string | null;
    patient_phone?: string | null;
    user_id?: string; // Adicionar user_id para criação
}

export interface IPatientRepository {
    findById(id: string): Promise<Patient | null>;
    findByNameOrEmail(name: string, email?: string | null): Promise<Patient | null>;
    update(id: string, patient: Patient): Promise<Patient>;
    create(patient: Patient): Promise<Patient>;
}

/**
 * Serviço de domínio para lógica de negócio de pacientes
 */
export class PatientDomainService {
    /**
     * Resolve o ID do paciente, buscando existente ou criando novo
     */
    static async resolvePatient(
        patientData: PatientData,
        patientRepository: IPatientRepository
    ): Promise<string> {
        // Se já tem ID, retorna direto
        if (patientData.patient_id) {
            return patientData.patient_id;
        }

        // Se não tem nome, não pode criar/buscar
        if (!patientData.patient_name) {
            throw new Error('Nome do paciente é obrigatório');
        }

        // Buscar paciente existente por nome ou email
        const existingPatient = await patientRepository.findByNameOrEmail(
            patientData.patient_name,
            patientData.patient_email
        );

        if (existingPatient) {
            // Se encontrou e tem dados adicionais, atualiza
            if (patientData.patient_email || patientData.patient_phone) {
                if (patientData.patient_email !== undefined) {
                    existingPatient.updateEmail(patientData.patient_email);
                }
                if (patientData.patient_phone !== undefined) {
                    existingPatient.updatePhone(patientData.patient_phone);
                }
                await patientRepository.update(existingPatient.id, existingPatient);
            }
            return existingPatient.id;
        }

        // Criar novo paciente - precisa de user_id
        if (!patientData.user_id) {
            throw new Error('user_id é obrigatório para criar novo paciente');
        }

        const newPatient = Patient.create({
            name: patientData.patient_name,
            email: patientData.patient_email || null,
            phone: patientData.patient_phone || null,
            userId: patientData.user_id
        });

        const created = await patientRepository.create(newPatient);
        return created.id;
    }

    /**
     * Atualiza a última visita do paciente
     */
    static async updateLastVisit(
        patientId: string,
        visitDate: string,
        patientRepository: IPatientRepository
    ): Promise<void> {
        if (!patientId || !visitDate) {
            return;
        }

        // Buscar paciente existente
        const existingPatient = await patientRepository.findById(patientId);
        if (!existingPatient) {
            return;
        }

        existingPatient.updateLastVisit(visitDate);
        await patientRepository.update(patientId, existingPatient);
    }

    /**
     * Valida dados do paciente
     */
    static validatePatientData(patientData: { name?: string; email?: string }): {
        isValid: boolean;
        errors: Record<string, string>;
    } {
        const errors: Record<string, string> = {};

        if (!patientData.name || patientData.name.trim().length === 0) {
            errors.name = 'Nome é obrigatório';
        }

        if (patientData.email && patientData.email.trim().length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(patientData.email)) {
                errors.email = 'Email inválido';
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}

