import { PatientConstants } from '../constants/PatientConstants';
import { ValidationError } from '../errors/AppError';
import { Name } from '../value-objects/Name';
import { Email } from '../value-objects/Email';
import { Phone } from '../value-objects/Phone';

export interface PatientValidationData {
    name?: string;
    email?: string | null;
    phone?: string | null;
}

export interface ValidationOptions {
    throwOnError?: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Validador de domínio para pacientes
 * Usa Value Objects para validação centralizada
 */
export class PatientValidator {
    /**
     * Valida dados de um paciente usando Value Objects
     */
    static validate(
        data: PatientValidationData,
        options: ValidationOptions = {}
    ): ValidationResult {
        const { throwOnError = false } = options;
        const errors: Record<string, string> = {};

        // Validação de nome usando Name Value Object
        if (!data.name || data.name.trim().length === 0) {
            errors.name = 'Nome é obrigatório';
        } else {
            try {
                Name.create(data.name);
            } catch (error) {
                errors.name = error instanceof Error ? error.message : 'Nome inválido';
            }
        }

        // Validação de email usando Email Value Object
        if (data.email && data.email.trim().length > 0) {
            try {
                Email.create(data.email);
            } catch (error) {
                errors.email = error instanceof Error ? error.message : 'Email inválido';
            }
        }

        // Validação de telefone usando Phone Value Object
        if (data.phone && data.phone.trim().length > 0) {
            try {
                Phone.create(data.phone);
            } catch (error) {
                errors.phone = error instanceof Error ? error.message : 'Telefone inválido';
            }
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
    static validateEssential(data: PatientValidationData): ValidationResult {
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

