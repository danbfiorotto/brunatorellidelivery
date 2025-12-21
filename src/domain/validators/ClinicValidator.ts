import { ClinicConstants } from '../constants/ClinicConstants';
import { ValidationError } from '../errors/AppError';
import { ClinicStatus } from '../entities/Clinic';

export interface ClinicValidationData {
    name?: string;
    email?: string | null;
    phone?: string | null;
    status?: ClinicStatus;
}

export interface ValidationOptions {
    throwOnError?: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Validador de domínio para clínicas
 */
export class ClinicValidator {
    /**
     * Valida dados de uma clínica
     */
    static validate(
        data: ClinicValidationData,
        options: ValidationOptions = {}
    ): ValidationResult {
        const { throwOnError = false } = options;
        const errors: Record<string, string> = {};

        // Validação de nome
        if (!data.name || data.name.trim().length === 0) {
            errors.name = 'Nome é obrigatório';
        }

        // Validação de email
        if (data.email && data.email.trim().length > 0) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                errors.email = 'Email inválido';
            }
        }

        // Validação de telefone
        if (data.phone && data.phone.trim().length > 0) {
            const cleaned = data.phone.replace(/\D/g, '');
            if (cleaned.length < 10 || cleaned.length > 11) {
                errors.phone = 'Telefone inválido (deve ter 10 ou 11 dígitos)';
            } else if (data.phone.length > ClinicConstants.MAX_PHONE_LENGTH) {
                errors.phone = `Telefone muito longo (máx: ${ClinicConstants.MAX_PHONE_LENGTH} caracteres)`;
            }
        }

        // Validação de status
        if (data.status && !['active', 'inactive'].includes(data.status)) {
            errors.status = 'Status inválido (deve ser "active" ou "inactive")';
        }

        const isValid = Object.keys(errors).length === 0;

        if (!isValid && throwOnError) {
            throw new ValidationError(errors);
        }

        return {
            isValid,
            errors
        };
    }

    /**
     * Valida apenas campos essenciais
     */
    static validateEssential(data: ClinicValidationData): ValidationResult {
        const errors: Record<string, string> = {};

        if (!data.name || data.name.trim().length === 0) {
            errors.name = 'Nome é obrigatório';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}

