import { IAppointmentRepository } from '../../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IPatientRepository } from '../../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAuthService } from '../../../infrastructure/auth/IAuthService';
import { IInputValidator } from '../../validators/IInputValidator';
import { ISanitizer } from '../../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../../infrastructure/audit/IAuditService';
import { Appointment } from '../../../domain/entities/Appointment';
import { Patient } from '../../../domain/entities/Patient';
import { AppointmentDomainService } from '../../../domain/services/AppointmentDomainService';
import { NotFoundError, ValidationError } from '../../../domain/errors/AppError';
import { CreateAppointmentSchema } from '../../dto/schemas/AppointmentSchemas';
import { z } from 'zod';

/**
 * Input para criação de appointment
 */
export interface CreateAppointmentInput {
    patientId?: string;
    patientName?: string;
    patientEmail?: string | null;
    patientPhone?: string | null;
    clinicId?: string | null;
    date: string | Date;
    time: string;
    procedure: string;
    value?: number;
    currency?: 'BRL' | 'USD' | 'EUR';
    paymentType?: string;
    paymentPercentage?: number | null;
    isPaid?: boolean;
    paymentDate?: string | Date | null;
    clinicalEvolution?: string | null;
    notes?: string | null;
    allowPastDates?: boolean;
}

/**
 * Output do use case de criação de appointment
 */
export interface CreateAppointmentOutput {
    appointment: Appointment;
}

/**
 * Interface do use case de criação de appointment
 */
export interface ICreateAppointmentUseCase {
    execute(input: CreateAppointmentInput): Promise<CreateAppointmentOutput>;
}

/**
 * Use case para criação de appointment
 */
export class CreateAppointmentUseCase implements ICreateAppointmentUseCase {
    constructor(
        private readonly appointmentRepository: IAppointmentRepository,
        private readonly patientRepository: IPatientRepository,
        private readonly authService: IAuthService,
        private readonly validator: IInputValidator<CreateAppointmentInput>,
        private readonly sanitizer: ISanitizer,
        private readonly auditService: IAuditService
    ) {}

    /**
     * Executa o use case de criação de appointment
     */
    async execute(input: CreateAppointmentInput): Promise<CreateAppointmentOutput> {
        // 1. Validar input
        const validated = await this.validator.validate(input);
        
        // 2. Validar regra de negócio contextual (data no passado)
        if (!AppointmentDomainService.canCreateAppointment(validated.date, validated.allowPastDates || false)) {
            throw new ValidationError({ 
                date: 'Não é possível agendar no passado' 
            });
        }
        
        // 3. Resolver paciente
        const patientId = await this.resolvePatientId(validated);
        
        // 4. Criar entidade
        const appointment = await this.buildAppointment({
            ...validated,
            patientId
        });
        
        // 5. Persistir
        const created = await this.appointmentRepository.create(appointment);
        
        // 6. Side effects (em paralelo) - com tratamento de erros para não falhar a criação
        await Promise.allSettled([
            this.updatePatientLastVisit(patientId, appointment.date).catch((error) => {
                // Não falhar criação se atualização de lastVisit falhar
                logger.warn('Failed to update patient last visit', { patientId, error });
            }),
            this.auditService.log('create', 'appointment', created.id, null, created.toJSON()).catch((error) => {
                // Não falhar criação se audit log falhar (pode ser problema de permissão)
                logger.warn('Failed to log audit action', { error, action: 'create', resourceType: 'appointment', resourceId: created.id });
            })
        ]);
        
        return { appointment: created };
    }

    /**
     * Resolve ID do paciente (busca existente ou cria novo)
     */
    private async resolvePatientId(data: CreateAppointmentInput): Promise<string> {
        if (data.patientId) {
            // Verificar se existe
            const existing = await this.patientRepository.findById(data.patientId);
            if (!existing) {
                throw new NotFoundError('Paciente', data.patientId);
            }
            return data.patientId;
        }
        
        if (data.patientName) {
            // Buscar por nome
            const found = await this.patientRepository.findByNameOrEmail(
                data.patientName, 
                data.patientEmail || null
            );
            
            if (found) {
                return found.id;
            }
            
            // Criar novo paciente
            const userId = await this.authService.getCurrentUserId();
            const newPatient = Patient.create({
                name: this.sanitizer.sanitizeText(data.patientName),
                email: data.patientEmail ? this.sanitizer.sanitizeText(data.patientEmail) : null,
                phone: data.patientPhone ? this.sanitizer.sanitizeText(data.patientPhone) : null,
                userId
            });
            
            const created = await this.patientRepository.create(newPatient);
            return created.id;
        }
        
        throw new ValidationError({ patient: 'Paciente é obrigatório' });
    }
    
    /**
     * Constrói entidade Appointment
     */
    private async buildAppointment(data: CreateAppointmentInput & { patientId: string }): Promise<Appointment> {
        // Determinar status baseado em isPaid
        const status = data.isPaid ? 'paid' : 'pending';
        
        // Criar entidade
        return Appointment.create({
            patientId: data.patientId,
            clinicId: data.clinicId || '',
            date: data.date,
            time: data.time,
            procedure: this.sanitizer.sanitizeText(data.procedure),
            value: data.value || 0,
            currency: data.currency || 'BRL',
            paymentType: data.paymentType || '100',
            paymentPercentage: data.paymentPercentage || null,
            isPaid: data.isPaid || false,
            paymentDate: data.paymentDate || null,
            status,
            clinicalEvolution: data.clinicalEvolution ? this.sanitizer.sanitizeText(data.clinicalEvolution) : null,
            notes: data.notes ? this.sanitizer.sanitizeText(data.notes) : null
        });
    }
    
    /**
     * Atualiza última visita do paciente
     */
    private async updatePatientLastVisit(patientId: string, date: Date | string): Promise<void> {
        try {
            const patient = await this.patientRepository.findById(patientId);
            if (patient) {
                patient.updateLastVisit(date);
                await this.patientRepository.update(patientId, patient);
            }
        } catch (error) {
            // Não falhar criação de appointment se atualização de lastVisit falhar
            // Log será feito pelo audit service
        }
    }
}

