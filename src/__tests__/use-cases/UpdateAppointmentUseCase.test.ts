import { UpdateAppointmentUseCase } from '../../application/use-cases/appointment/UpdateAppointmentUseCase';
import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { IInputValidator } from '../../application/validators/IInputValidator';
import { ISanitizer } from '../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { Appointment } from '../../domain/entities/Appointment';
import { Patient } from '../../domain/entities/Patient';
import { UpdateAppointmentInput } from '../../application/use-cases/appointment/UpdateAppointmentUseCase';
import { ValidationError, NotFoundError } from '../../domain/errors/AppError';

describe('UpdateAppointmentUseCase', () => {
    let useCase: UpdateAppointmentUseCase;
    let mockAppointmentRepository: jest.Mocked<IAppointmentRepository>;
    let mockPatientRepository: jest.Mocked<IPatientRepository>;
    let mockValidator: jest.Mocked<IInputValidator<UpdateAppointmentInput>>;
    let mockSanitizer: jest.Mocked<ISanitizer>;
    let mockAuditService: jest.Mocked<IAuditService>;
    let mockCacheService: jest.Mocked<ICacheService>;
    
    beforeEach(() => {
        mockAppointmentRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByPatientId: jest.fn()
        };
        
        mockPatientRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByNameOrEmail: jest.fn()
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
        
        mockCacheService = {
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(true),
            clear: jest.fn(),
            invalidate: jest.fn(),
            setWithTags: jest.fn().mockResolvedValue(undefined),
            invalidateByTag: jest.fn().mockResolvedValue(undefined),
            has: jest.fn().mockReturnValue(false),
            cleanup: jest.fn().mockReturnValue(0),
            getStats: jest.fn().mockReturnValue({
                total: 0,
                valid: 0,
                expired: 0,
                storageItems: 0
            })
        };
        
        useCase = new UpdateAppointmentUseCase(
            mockAppointmentRepository,
            mockPatientRepository,
            mockValidator,
            mockSanitizer,
            mockAuditService,
            mockCacheService
        );
    });
    
    it('should update appointment successfully', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const existingAppointment = Appointment.create({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            patientPhone: patient.phone,
            date: new Date('2024-01-15'),
            time: '10:00',
            procedure: 'Consulta',
            value: 100,
            currency: 'BRL',
            userId: 'user-123'
        });
        
        const input: UpdateAppointmentInput = {
            id: existingAppointment.id,
            procedure: 'Exame',
            value: 200
        };
        
        const updatedAppointment = Appointment.create({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            patientPhone: patient.phone,
            date: new Date('2024-01-15'),
            time: '10:00',
            procedure: 'Exame',
            value: 200,
            currency: 'BRL',
            userId: 'user-123'
        });
        
        mockAppointmentRepository.findById.mockResolvedValue(existingAppointment);
        mockAppointmentRepository.update.mockResolvedValue(updatedAppointment);
        
        const result = await useCase.execute(input);
        
        expect(mockValidator.validate).toHaveBeenCalledWith(input);
        expect(mockAppointmentRepository.findById).toHaveBeenCalledWith(input.id);
        expect(mockAppointmentRepository.update).toHaveBeenCalled();
        expect(mockAuditService.log).toHaveBeenCalled();
        expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith('appointments');
        expect(result.appointment).toEqual(updatedAppointment);
    });
    
    it('should throw error if appointment not found', async () => {
        const input: UpdateAppointmentInput = {
            id: 'non-existent-id',
            procedure: 'Exame'
        };
        
        mockAppointmentRepository.findById.mockResolvedValue(null);
        
        await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
        expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });
    
    it('should throw error if validation fails', async () => {
        const input: UpdateAppointmentInput = {
            id: 'appointment-id',
            value: -100 // Valor negativo
        };
        
        mockValidator.validate.mockRejectedValue(
            new ValidationError({ value: 'Valor deve ser positivo' }, 'Dados inválidos')
        );
        
        await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
        expect(mockAppointmentRepository.update).not.toHaveBeenCalled();
    });
    
    it('should sanitize text fields', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const existingAppointment = Appointment.create({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            patientPhone: patient.phone,
            date: new Date('2024-01-15'),
            time: '10:00',
            procedure: 'Consulta',
            value: 100,
            currency: 'BRL',
            userId: 'user-123'
        });
        
        const input: UpdateAppointmentInput = {
            id: existingAppointment.id,
            procedure: '<script>alert("xss")</script>Exame',
            notes: '<script>alert("xss")</script>Notas'
        };
        
        mockSanitizer.sanitizeText.mockImplementation((text) => {
            if (text.includes('<script>')) {
                return text.replace(/<script>.*?<\/script>/gi, '');
            }
            return text;
        });
        
        const updatedAppointment = Appointment.create({
            patientId: patient.id,
            patientName: patient.name,
            patientEmail: patient.email,
            patientPhone: patient.phone,
            date: new Date('2024-01-15'),
            time: '10:00',
            procedure: 'Exame',
            value: 100,
            currency: 'BRL',
            userId: 'user-123'
        });
        
        mockAppointmentRepository.findById.mockResolvedValue(existingAppointment);
        mockAppointmentRepository.update.mockResolvedValue(updatedAppointment);
        
        await useCase.execute(input);
        
        expect(mockSanitizer.sanitizeText).toHaveBeenCalled();
    });
});

