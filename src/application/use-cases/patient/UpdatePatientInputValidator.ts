import { IInputValidator } from '../../validators/IInputValidator';
import { UpdatePatientInput } from './UpdatePatientUseCase';
import { UpdatePatientSchema } from '../../dto/schemas/PatientSchemas';
import { ValidationError } from '../../../domain/errors/AppError';
import { z } from 'zod';

/**
 * Validador específico para UpdatePatientInput
 */
export class UpdatePatientInputValidator implements IInputValidator<UpdatePatientInput> {
    async validate(data: unknown): Promise<UpdatePatientInput> {
        try {
            // Validar que tem id
            if (typeof data !== 'object' || data === null || !('id' in data)) {
                throw new ValidationError(
                    { id: 'ID é obrigatório' },
                    'ID do paciente é obrigatório'
                );
            }

            const validated = UpdatePatientSchema.parse(data);
            return {
                id: (data as { id: string }).id,
                name: validated.name,
                email: validated.email ?? null,
                phone: validated.phone ?? null
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    error.errors,
                    'Dados inválidos para atualização de paciente'
                );
            }
            throw error;
        }
    }
}

