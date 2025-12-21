import { z } from 'zod';

/**
 * Schema Zod para criação de clínica
 * ✅ Aceita strings vazias e converte para null antes de validar
 */
export const CreateClinicSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255, 'Nome muito longo'),
    cnpj: z.preprocess(
        (val) => val === '' || val === undefined ? null : val,
        z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').nullable().optional()
    ),
    phone: z.preprocess(
        (val) => val === '' || val === undefined ? null : val,
        z.string().min(10, 'Telefone inválido').max(15, 'Telefone muito longo').nullable().optional()
    ),
    email: z.preprocess(
        (val) => val === '' || val === undefined ? null : val,
        z.string().email('Email inválido').nullable().optional()
    ),
    address: z.preprocess(
        (val) => val === '' || val === undefined ? null : val,
        z.string().max(500, 'Endereço muito longo').nullable().optional()
    ),
});

/**
 * Schema Zod para atualização de clínica
 */
export const UpdateClinicSchema = z.object({
    name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(255, 'Nome muito longo').optional(),
    cnpj: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 dígitos').nullable().optional().or(z.literal('')),
    phone: z.string().min(10, 'Telefone inválido').max(15, 'Telefone muito longo').nullable().optional(),
    email: z.string().email('Email inválido').nullable().optional().or(z.literal('')),
    address: z.string().max(500, 'Endereço muito longo').nullable().optional(),
});

/**
 * Tipos inferidos dos schemas
 */
export type CreateClinicDTO = z.infer<typeof CreateClinicSchema>;
export type UpdateClinicDTO = z.infer<typeof UpdateClinicSchema>;


