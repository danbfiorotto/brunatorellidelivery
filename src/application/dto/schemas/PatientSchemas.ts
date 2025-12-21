import { z } from 'zod';

/**
 * Schema de validação para criação de paciente
 */
export const CreatePatientSchema = z.object({
    name: z.string()
        .min(3, 'Nome deve ter pelo menos 3 caracteres')
        .max(255, 'Nome deve ter no máximo 255 caracteres')
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras'),
    email: z.string()
        .email('Email inválido')
        .optional()
        .nullable(),
    phone: z.string()
        .regex(/^[0-9]{10,11}$/, 'Telefone inválido (deve ter 10 ou 11 dígitos)')
        .optional()
        .nullable()
});

export type CreatePatientDTO = z.infer<typeof CreatePatientSchema>;

/**
 * Schema de validação para atualização de paciente
 */
export const UpdatePatientSchema = CreatePatientSchema.partial();

export type UpdatePatientDTO = z.infer<typeof UpdatePatientSchema>;
