import { z } from 'zod';
import { ValidationError } from '../../domain/errors/AppError';
import { CreatePatientSchema, UpdatePatientSchema } from './schemas/PatientSchemas';
import { CreateAppointmentSchema, UpdateAppointmentSchema } from './schemas/AppointmentSchemas';
import { CreateClinicSchema, UpdateClinicSchema } from './schemas/ClinicSchemas';

/**
 * Valida um DTO usando um schema Zod
 * @throws {ValidationError} Se validação falhar
 */
export function validateDTO<T>(schema: z.ZodSchema<T>, data: unknown): T {
    try {
        return schema.parse(data);
    } catch (error) {
        // ✅ Verificar se é ZodError de forma mais robusta
        const isZodError = error instanceof z.ZodError || 
                          (error && typeof error === 'object' && 'issues' in error && Array.isArray((error as any).issues));
        
        if (isZodError) {
            const zodError = error as z.ZodError;
            const errors: Record<string, string> = {};
            
            // ✅ Usar issues se errors não existir (compatibilidade com diferentes versões do Zod)
            const issues = zodError.errors || (zodError as any).issues || [];
            
            if (Array.isArray(issues) && issues.length > 0) {
                issues.forEach((err: any) => {
                    const path = err.path && Array.isArray(err.path) ? err.path.join('.') : 'unknown';
                    errors[path] = err.message || 'Erro de validação';
                });
            } else {
                // Fallback caso não haja issues
                errors['unknown'] = zodError.message || 'Erro de validação';
            }
            
            throw new ValidationError(errors);
        }
        throw error;
    }
}

/**
 * Valida DTO de criação de paciente
 */
export function validateCreatePatientDTO(data: unknown) {
    return validateDTO(CreatePatientSchema, data);
}

/**
 * Valida DTO de atualização de paciente
 */
export function validateUpdatePatientDTO(data: unknown) {
    return validateDTO(UpdatePatientSchema, data);
}

/**
 * Valida DTO de criação de agendamento
 */
export function validateCreateAppointmentDTO(data: unknown) {
    return validateDTO(CreateAppointmentSchema, data);
}

/**
 * Valida DTO de atualização de agendamento
 */
export function validateUpdateAppointmentDTO(data: unknown) {
    return validateDTO(UpdateAppointmentSchema, data);
}

/**
 * Valida DTO de criação de clínica
 */
export function validateCreateClinicDTO(data: unknown) {
    return validateDTO(CreateClinicSchema, data);
}

/**
 * Valida DTO de atualização de clínica
 */
export function validateUpdateClinicDTO(data: unknown) {
    return validateDTO(UpdateClinicSchema, data);
}


