import { AppointmentConstants } from '../constants/AppointmentConstants';
import { ValidationError } from '../errors/AppError';
import { Time } from '../value-objects/Time';
import { Money, Currency } from '../value-objects/Money';
import { Procedure } from '../value-objects/Procedure';
import { PaymentType, PaymentTypeValue } from '../value-objects/PaymentType';

export interface AppointmentValidationData {
    patient_id?: string;
    patient_name?: string;
    date?: string | Date;
    time?: string;
    procedure?: string;
    value?: number;
    currency?: Currency;
    payment_type?: PaymentTypeValue;
    payment_percentage?: number | null;
    clinical_evolution?: string;
    notes?: string;
}

export interface AppointmentValidationOptions {
    allowPastDates?: boolean;
    throwOnError?: boolean;
}

export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Validador de domínio para agendamentos
 * Usa Value Objects para validação centralizada
 */
export class AppointmentValidator {
    /**
     * Valida dados de um agendamento usando Value Objects
     */
    static validate(
        data: AppointmentValidationData,
        options: AppointmentValidationOptions = {}
    ): ValidationResult {
        const { allowPastDates = false, throwOnError = false } = options;
        const errors: Record<string, string> = {};

        // Validação de paciente
        if (!data.patient_id && !data.patient_name) {
            errors.patient = 'Paciente é obrigatório';
        }

        // Validação de data
        if (!data.date) {
            errors.date = 'Data é obrigatória';
        } else {
            const date = new Date(data.date);
            if (isNaN(date.getTime())) {
                errors.date = 'Data inválida';
            } else if (!allowPastDates && date < new Date().setHours(0, 0, 0, 0)) {
                errors.date = 'Data não pode ser no passado para novos agendamentos';
            }
        }

        // Validação de hora usando Time Value Object
        if (!data.time) {
            errors.time = 'Hora é obrigatória';
        } else {
            try {
                Time.create(data.time);
            } catch (error) {
                errors.time = error instanceof Error ? error.message : 'Hora inválida';
            }
        }

        // Validação de procedimento usando Procedure Value Object
        if (!data.procedure || data.procedure.trim().length === 0) {
            errors.procedure = 'Procedimento é obrigatório';
        } else {
            try {
                Procedure.create(data.procedure);
            } catch (error) {
                errors.procedure = error instanceof Error ? error.message : 'Procedimento inválido';
            }
        }

        // Validação de valor usando Money Value Object
        if (data.value !== undefined && data.value !== null) {
            try {
                Money.create(data.value, data.currency || 'BRL');
            } catch (error) {
                errors.value = error instanceof Error ? error.message : 'Valor inválido';
            }
        }

        // Validação de tipo de pagamento usando PaymentType Value Object
        if (data.payment_type) {
            try {
                PaymentType.create(data.payment_type, data.payment_percentage);
            } catch (error) {
                errors.payment_type = error instanceof Error ? error.message : 'Tipo de pagamento inválido';
            }
        }

        // Validação de evolução clínica
        if (data.clinical_evolution && data.clinical_evolution.length > AppointmentConstants.MAX_CLINICAL_EVOLUTION_LENGTH) {
            errors.clinical_evolution = `Evolução clínica muito longa (máx: ${AppointmentConstants.MAX_CLINICAL_EVOLUTION_LENGTH} caracteres)`;
        }

        // Validação de notas
        if (data.notes && data.notes.length > AppointmentConstants.MAX_NOTES_LENGTH) {
            errors.notes = `Notas muito longas (máx: ${AppointmentConstants.MAX_NOTES_LENGTH} caracteres)`;
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
     * Valida apenas campos essenciais (para validação rápida)
     */
    static validateEssential(data: AppointmentValidationData): ValidationResult {
        const errors: Record<string, string> = {};

        if (!data.patient_id && !data.patient_name) {
            errors.patient = 'Paciente é obrigatório';
        }

        if (!data.date) {
            errors.date = 'Data é obrigatória';
        }

        if (!data.time) {
            errors.time = 'Hora é obrigatória';
        }

        if (!data.procedure || data.procedure.trim().length === 0) {
            errors.procedure = 'Procedimento é obrigatório';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }
}

