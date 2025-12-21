import { IInputValidator } from '../../validators/IInputValidator';
import { UpdateAppointmentInput } from './UpdateAppointmentUseCase';
import { UpdateAppointmentSchema } from '../../dto/schemas/AppointmentSchemas';
import { ValidationError } from '../../../domain/errors/AppError';
import { z } from 'zod';

/**
 * Validador específico para UpdateAppointmentInput
 */
export class UpdateAppointmentInputValidator implements IInputValidator<UpdateAppointmentInput> {
    async validate(data: unknown): Promise<UpdateAppointmentInput> {
        try {
            // Validar que tem id
            if (typeof data !== 'object' || data === null || !('id' in data)) {
                throw new ValidationError(
                    { id: 'ID é obrigatório' },
                    'ID do agendamento é obrigatório'
                );
            }

            const validated = UpdateAppointmentSchema.parse(data);
            return {
                id: (data as { id: string }).id,
                patientId: validated.patientId,
                patientName: validated.patientName,
                patientEmail: validated.patientEmail ?? null,
                patientPhone: validated.patientPhone ?? null,
                clinicId: validated.clinicId ?? null,
                date: validated.date,
                time: validated.time,
                procedure: validated.procedure,
                value: validated.value,
                currency: validated.currency,
                paymentType: validated.paymentType,
                paymentPercentage: validated.paymentPercentage ?? null,
                isPaid: validated.isPaid,
                paymentDate: validated.paymentDate ?? null,
                clinicalEvolution: validated.clinicalEvolution ?? null,
                notes: validated.notes ?? null
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    error.errors,
                    'Dados inválidos para atualização de agendamento'
                );
            }
            throw error;
        }
    }
}

