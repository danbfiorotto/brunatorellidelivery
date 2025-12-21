import { IInputValidator } from '../../validators/IInputValidator';
import { CreatePatientInput } from './CreatePatientUseCase';
import { CreatePatientSchema } from '../../dto/schemas/PatientSchemas';
import { ValidationError } from '../../../domain/errors/AppError';
import { z } from 'zod';

/**
 * Validador específico para CreatePatientInput
 */
export class CreatePatientInputValidator implements IInputValidator<CreatePatientInput> {
    async validate(data: unknown): Promise<CreatePatientInput> {
        try {
            const validated = CreatePatientSchema.parse(data);
            return {
                name: validated.name,
                email: validated.email ?? null,
                phone: validated.phone ?? null
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    error.errors,
                    'Dados inválidos para criação de paciente'
                );
            }
            throw error;
        }
    }
}

