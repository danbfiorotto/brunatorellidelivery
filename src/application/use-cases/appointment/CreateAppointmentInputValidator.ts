import { IInputValidator } from '../../validators/IInputValidator';
import { CreateAppointmentInput } from './CreateAppointmentUseCase';
import { CreateAppointmentSchema } from '../../dto/schemas/AppointmentSchemas';
import { ValidationError } from '../../../domain/errors/AppError';
import { z } from 'zod';

/**
 * Validador específico para CreateAppointmentInput
 */
export class CreateAppointmentInputValidator implements IInputValidator<CreateAppointmentInput> {
    async validate(data: unknown): Promise<CreateAppointmentInput> {
        try {
            const validated = CreateAppointmentSchema.parse(data);
            return {
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
                notes: validated.notes ?? null,
                allowPastDates: false // Default
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                throw new ValidationError(
                    error.errors,
                    'Dados inválidos para criação de agendamento'
                );
            }
            throw error;
        }
    }
}

