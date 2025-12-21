import { IAppointmentRepository } from '../../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { IInputValidator } from '../../validators/IInputValidator';
import { ISanitizer } from '../../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../../infrastructure/cache/ICacheService';
import { Appointment } from '../../../domain/entities/Appointment';
import { NotFoundError } from '../../../domain/errors/AppError';
import { UpdateAppointmentSchema } from '../../dto/schemas/AppointmentSchemas';
import { z } from 'zod';

/**
 * Input para atualização de appointment
 */
export interface UpdateAppointmentInput {
    id: string;
    patientId?: string;
    patientName?: string;
    patientEmail?: string | null;
    patientPhone?: string | null;
    clinicId?: string | null;
    date?: string | Date;
    time?: string;
    procedure?: string;
    value?: number;
    currency?: 'BRL' | 'USD' | 'EUR';
    paymentType?: string;
    paymentPercentage?: number | null;
    isPaid?: boolean;
    paymentDate?: string | Date | null;
    clinicalEvolution?: string | null;
    notes?: string | null;
}

/**
 * Output do use case de atualização de appointment
 */
export interface UpdateAppointmentOutput {
    appointment: Appointment;
}

/**
 * Interface do use case de atualização de appointment
 */
export interface IUpdateAppointmentUseCase {
    execute(input: UpdateAppointmentInput): Promise<UpdateAppointmentOutput>;
}

/**
 * Use case para atualização de appointment
 */
export class UpdateAppointmentUseCase implements IUpdateAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly patientRepository: IPatientRepository,
        private readonly validator: IInputValidator<UpdateAppointmentInput>,
        private readonly sanitizer: ISanitizer,
        private readonly auditService: IAuditService,
        private readonly cacheService: ICacheService
    ) {}

    /**
     * Executa o use case de atualização de appointment
     */
    async execute(input: UpdateAppointmentInput): Promise<UpdateAppointmentOutput> {
        // 1. Validar input
        const validated = await this.validator.validate(input);
        
        // 2. Buscar appointment existente
        const existing = await this.appointmentRepository.findById(validated.id);
        if (!existing) {
            throw new NotFoundError('Agendamento', validated.id);
        }

        // 3. Resolver paciente se necessário
        let patientId = validated.patientId || existing.patientId;
        if (!patientId && validated.patientName) {
            patientId = await this.resolvePatientId(validated);
        }

        // 4. Atualizar entidade
        this.updateAppointmentEntity(existing, validated);

        // 5. Persistir
        const updated = await this.appointmentRepository.update(validated.id, existing);
        
        // 6. Side effects (em paralelo)
        await Promise.all([
            this.updatePatientLastVisitIfNeeded(patientId, validated.date),
            this.auditService.log('update', 'appointment', validated.id, existing.toJSON(), updated.toJSON()),
            this.cacheService.invalidateByTag('appointments'),
            this.cacheService.invalidateByTag('patients')
        ]);

        return { appointment: updated };
    }

    /**
     * Resolve ID do paciente se necessário
     */
    private async resolvePatientId(data: UpdateAppointmentInput): Promise<string> {
        if (!data.patientName) {
            throw new Error('patientName é obrigatório quando patientId não é fornecido');
        }

        const found = await this.patientRepository.findByNameOrEmail(
            data.patientName, 
            data.patientEmail || null
        );
        
        if (!found) {
            throw new NotFoundError('Paciente', data.patientName);
        }

        return found.id;
    }

    /**
     * Atualiza entidade Appointment
     */
    private updateAppointmentEntity(
        existing: Appointment,
        data: UpdateAppointmentInput
    ): void {
        existing.update({
            clinicId: data.clinicId,
            date: data.date,
            time: data.time,
            procedure: data.procedure ? this.sanitizer.sanitizeText(data.procedure) : undefined,
            value: data.value,
            currency: data.currency,
            paymentType: data.paymentType,
            paymentPercentage: data.paymentPercentage,
            isPaid: data.isPaid,
            paymentDate: data.paymentDate,
            clinicalEvolution: data.clinicalEvolution ? this.sanitizer.sanitizeText(data.clinicalEvolution) : undefined,
            notes: data.notes ? this.sanitizer.sanitizeText(data.notes) : undefined
        });
    }

    /**
     * Atualiza última visita do paciente se necessário
     */
    private async updatePatientLastVisitIfNeeded(patientId: string, date?: string | Date): Promise<void> {
        if (!date) return;

        try {
            const patient = await this.patientRepository.findById(patientId);
            if (patient) {
                patient.updateLastVisit(date);
                await this.patientRepository.update(patientId, patient);
            }
        } catch (error) {
            // Não falhar atualização de appointment se atualização de lastVisit falhar
        }
    }
}

