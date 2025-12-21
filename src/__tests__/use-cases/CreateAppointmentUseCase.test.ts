import { CreateAppointmentUseCase } from '../../application/use-cases/appointment/CreateAppointmentUseCase';
import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAuthService } from '../../infrastructure/auth/IAuthService';
import { IInputValidator } from '../../application/validators/IInputValidator';
import { ISanitizer } from '../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { Appointment } from '../../domain/entities/Appointment';
import { Patient } from '../../domain/entities/Patient';
import { CreateAppointmentInput } from '../../application/use-cases/appointment/CreateAppointmentUseCase';
import { NotFoundError, ValidationError } from '../../domain/errors/AppError';

describe('CreateAppointmentUseCase', () => {
    let useCase: CreateAppointmentUseCase;
    let mockAppointmentRepository: jest.Mocked<IAppointmentRepository>;
    let mockPatientRepository: jest.Mocked<IPatientRepository>;
    let mockAuthService: jest.Mocked<IAuthService>;
    let mockValidator: jest.Mocked<IInputValidator<CreateAppointmentInput>>;
    let mockSanitizer: jest.Mocked<ISanitizer>;
    let mockAuditService: jest.Mocked<IAuditService>;
    
    beforeEach(() => {
        mockAppointmentRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByPatientId: jest.fn(),
            findByClinicId: jest.fn(),
            findByDate: jest.fn(),
            findByDateRange: jest.fn()
        };
        
        mockPatientRepository = {
            findById: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByNameOrEmail: jest.fn()
        };
        
        mockAuthService = {
            getCurrentUserId: jest.fn().mockResolvedValue('user-123'),
            isAuthenticated: jest.fn().mockResolvedValue(true)
        };
        
        mockValidator = {
            validate: jest.fn().mockImplementation((input) => Promise.resolve(input))
        };
        
        mockSanitizer = {
            sanitizeText: jest.fn().mockImplementation((text) => text),
            sanitizeHTML: jest.fn().mockImplementation((html) => html),
            validateAndSanitize: jest.fn().mockImplementation((data) => data),
            deepSanitize: jest.fn().mockImplementation((obj) => obj)
        };
        
        mockAuditService = {
            log: jest.fn().mockResolvedValue(undefined)
        };
        
        useCase = new CreateAppointmentUseCase(
            mockAppointmentRepository,
            mockPatientRepository,
            mockAuthService,
            mockValidator,
            mockSanitizer,
            mockAuditService
        );
    });
    
    it('should create appointment successfully with existing patient', async () => {
        const input: CreateAppointmentInput = {
            patientId: 'patient-123',
            clinicId: 'clinic-123',
            date: new Date().toISOString(),
            time: '10:00',
            procedure: 'Consulta',
            value: 100,
            currency: 'BRL',
            paymentType: '100',
            isPaid: false
        };
        
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const appointment = Appointment.create({
            patientId: input.patientId!,
            clinicId: input.clinicId!,
            date: input.date,
            time: input.time,
            procedure: input.procedure,
            value: input.value!,
            currency: input.currency!,
            paymentType: input.paymentType!,
            isPaid: input.isPaid || false
        });
        
        mockPatientRepository.findById.mockResolvedValue(patient);
        mockAppointmentRepository.create.mockResolvedValue(appointment);
        
        const result = await useCase.execute(input);
        
        expect(mockValidator.validate).toHaveBeenCalledWith(input);
        expect(mockPatientRepository.findById).toHaveBeenCalledWith(input.patientId);
        expect(mockAppointmentRepository.create).toHaveBeenCalled();
        expect(mockAuditService.log).toHaveBeenCalled();
        expect(result.appointment).toEqual(appointment);
    });
    
    it('should create new patient if patientName provided', async () => {
        const input: CreateAppointmentInput = {
            patientName: 'Jane Doe',
            patientEmail: 'jane@example.com',
            clinicId: 'clinic-123',
            date: new Date().toISOString(),
            time: '10:00',
            procedure: 'Consulta',
            value: 100
        };
        
        const newPatient = Patient.create({
            name: input.patientName!,
            email: input.patientEmail!,
            phone: null,
            userId: 'user-123'
        });
        
        const appointment = Appointment.create({
            patientId: newPatient.id,
            clinicId: input.clinicId!,
            date: input.date,
            time: input.time,
            procedure: input.procedure,
            value: input.value!,
            currency: 'BRL',
            paymentType: '100',
            isPaid: false
        });
        
        mockPatientRepository.findByNameOrEmail.mockResolvedValue(null);
        mockPatientRepository.create.mockResolvedValue(newPatient);
        mockAppointmentRepository.create.mockResolvedValue(appointment);
        
        const result = await useCase.execute(input);
        
        expect(mockPatientRepository.findByNameOrEmail).toHaveBeenCalled();
        expect(mockPatientRepository.create).toHaveBeenCalled();
        expect(mockAppointmentRepository.create).toHaveBeenCalled();
        expect(result.appointment).toEqual(appointment);
    });
    
    it('should throw error if patient not found', async () => {
        const input: CreateAppointmentInput = {
            patientId: 'non-existent',
            clinicId: 'clinic-123',
            date: new Date().toISOString(),
            time: '10:00',
            procedure: 'Consulta',
            value: 100
        };
        
        mockPatientRepository.findById.mockResolvedValue(null);
        
        await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
        expect(mockAppointmentRepository.create).not.toHaveBeenCalled();
    });
    
    it('should throw error if validation fails', async () => {
        const input: CreateAppointmentInput = {
            patientId: 'patient-123',
            date: new Date().toISOString(),
            time: 'invalid-time', // Hora inválida
            procedure: 'Consulta',
            value: 100
        };
        
        mockValidator.validate.mockRejectedValue(
            new ValidationError({ time: 'Hora inválida' }, 'Dados inválidos')
        );
        
        await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
        expect(mockAppointmentRepository.create).not.toHaveBeenCalled();
    });
});




