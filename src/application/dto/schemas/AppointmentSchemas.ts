import { z } from 'zod';

/**
 * Schema Zod para criação de agendamento
 */
export const CreateAppointmentSchema = z.object({
    patientId: z.string().uuid('ID do paciente inválido').optional(),
    patientName: z.string().min(3, 'Nome do paciente deve ter pelo menos 3 caracteres').optional(),
    patientEmail: z.string().email('Email inválido').nullable().optional().or(z.literal('')),
    patientPhone: z.string().min(10, 'Telefone inválido').nullable().optional(),
    clinicId: z.string().uuid('ID da clínica inválido').nullable().optional().or(z.literal('')),
    date: z.union([
        z.string().datetime(), // Formato ISO completo: "2024-01-15T00:00:00Z"
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: YYYY-MM-DD)'), // Formato simples: "2024-01-15"
        z.date() // Date object
    ]),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida (formato esperado: HH:mm)'),
    procedure: z.string().min(1, 'Procedimento é obrigatório').max(500, 'Procedimento muito longo'),
    value: z.number().nonnegative('Valor deve ser positivo').optional(),
    currency: z.enum(['BRL', 'USD', 'EUR']).default('BRL').optional(),
    paymentType: z.string().max(10).optional(),
    paymentPercentage: z.number().min(0).max(100).nullable().optional(),
    isPaid: z.boolean().default(false).optional(),
    paymentDate: z.union([
        z.string().datetime(), // Formato ISO completo
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: YYYY-MM-DD)'), // Formato simples
        z.date() // Date object
    ]).nullable().optional(),
    clinicalEvolution: z.string().max(10000, 'Evolução clínica muito longa (máx: 10.000 caracteres)').nullable().optional(),
    notes: z.string().max(5000, 'Notas muito longas (máx: 5.000 caracteres)').nullable().optional(),
}).refine(
    (data) => data.patientId || data.patientName,
    {
        message: 'Paciente é obrigatório (forneça patientId ou patientName)',
        path: ['patient'],
    }
);

/**
 * Schema Zod para atualização de agendamento
 */
export const UpdateAppointmentSchema = z.object({
    patientId: z.string().uuid('ID do paciente inválido').optional(),
    patientName: z.string().min(3, 'Nome do paciente deve ter pelo menos 3 caracteres').optional(),
    patientEmail: z.string().email('Email inválido').nullable().optional().or(z.literal('')),
    patientPhone: z.string().min(10, 'Telefone inválido').nullable().optional(),
    clinicId: z.string().uuid('ID da clínica inválido').nullable().optional().or(z.literal('')),
    date: z.union([
        z.string().datetime(), // Formato ISO completo: "2024-01-15T00:00:00Z"
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: YYYY-MM-DD)'), // Formato simples: "2024-01-15"
        z.date() // Date object
    ]).optional(),
    time: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Hora inválida (formato esperado: HH:mm)').optional(),
    procedure: z.string().min(1, 'Procedimento é obrigatório').max(500, 'Procedimento muito longo').optional(),
    value: z.number().nonnegative('Valor deve ser positivo').optional(),
    currency: z.enum(['BRL', 'USD', 'EUR']).optional(),
    paymentType: z.string().max(10).optional(),
    paymentPercentage: z.number().min(0).max(100).nullable().optional(),
    isPaid: z.boolean().optional(),
    paymentDate: z.union([
        z.string().datetime(), // Formato ISO completo
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida (formato esperado: YYYY-MM-DD)'), // Formato simples
        z.date() // Date object
    ]).nullable().optional(),
    clinicalEvolution: z.string().max(10000, 'Evolução clínica muito longa (máx: 10.000 caracteres)').nullable().optional(),
    notes: z.string().max(5000, 'Notas muito longas (máx: 5.000 caracteres)').nullable().optional(),
});

/**
 * Tipos inferidos dos schemas
 */
export type CreateAppointmentDTO = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentDTO = z.infer<typeof UpdateAppointmentSchema>;





