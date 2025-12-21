import { UpdatePatientUseCase } from '../../application/use-cases/patient/UpdatePatientUseCase';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { IInputValidator } from '../../application/validators/IInputValidator';
import { ISanitizer } from '../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { Patient } from '../../domain/entities/Patient';
import { UpdatePatientInput } from '../../application/use-cases/patient/UpdatePatientUseCase';
import { ValidationError, NotFoundError } from '../../domain/errors/AppError';

describe('UpdatePatientUseCase', () => {
    let useCase: UpdatePatientUseCase;
    let mockRepository: jest.Mocked<IPatientRepository>;
    let mockValidator: jest.Mocked<IInputValidator<UpdatePatientInput>>;
    let mockSanitizer: jest.Mocked<ISanitizer>;
    let mockAuditService: jest.Mocked<IAuditService>;
    let mockCacheService: jest.Mocked<ICacheService>;
    
    beforeEach(() => {
        mockRepository = {
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
        
        useCase = new UpdatePatientUseCase(
            mockRepository,
            mockValidator,
            mockSanitizer,
            mockAuditService,
            mockCacheService
        );
    });
    
    it('should update patient successfully', async () => {
        const existingPatient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const input: UpdatePatientInput = {
            id: existingPatient.id,
            name: 'Jane Doe',
            email: 'jane@example.com'
        };
        
        const updatedPatient = Patient.create({
            name: 'Jane Doe',
            email: 'jane@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        mockRepository.findById.mockResolvedValue(existingPatient);
        mockRepository.update.mockResolvedValue(updatedPatient);
        
        const result = await useCase.execute(input);
        
        expect(mockValidator.validate).toHaveBeenCalledWith(input);
        expect(mockRepository.findById).toHaveBeenCalledWith(input.id);
        expect(mockSanitizer.sanitizeText).toHaveBeenCalled();
        expect(mockRepository.update).toHaveBeenCalled();
        expect(mockAuditService.log).toHaveBeenCalled();
        expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith('patients');
        expect(result.patient).toEqual(updatedPatient);
    });
    
    it('should throw error if patient not found', async () => {
        const input: UpdatePatientInput = {
            id: 'non-existent-id',
            name: 'Jane Doe'
        };
        
        mockRepository.findById.mockResolvedValue(null);
        
        await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
        expect(mockRepository.update).not.toHaveBeenCalled();
    });
    
    it('should throw error if validation fails', async () => {
        const input: UpdatePatientInput = {
            id: 'patient-id',
            name: '' // Nome vazio
        };
        
        mockValidator.validate.mockRejectedValue(
            new ValidationError({ name: 'Nome não pode ser vazio' }, 'Dados inválidos')
        );
        
        await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
        expect(mockRepository.update).not.toHaveBeenCalled();
    });
    
    it('should sanitize input data', async () => {
        const existingPatient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const input: UpdatePatientInput = {
            id: existingPatient.id,
            name: '<script>alert("xss")</script>Jane Doe'
        };
        
        mockSanitizer.sanitizeText.mockImplementation((text) => {
            if (text.includes('<script>')) {
                return 'Jane Doe';
            }
            return text;
        });
        
        const updatedPatient = Patient.create({
            name: 'Jane Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        mockRepository.findById.mockResolvedValue(existingPatient);
        mockRepository.update.mockResolvedValue(updatedPatient);
        
        await useCase.execute(input);
        
        expect(mockSanitizer.sanitizeText).toHaveBeenCalledWith(input.name);
    });
    
    it('should handle partial updates', async () => {
        const existingPatient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const input: UpdatePatientInput = {
            id: existingPatient.id,
            name: 'John Updated'
        };
        
        const updatedPatient = Patient.create({
            name: 'John Updated',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        mockRepository.findById.mockResolvedValue(existingPatient);
        mockRepository.update.mockResolvedValue(updatedPatient);
        
        const result = await useCase.execute(input);
        
        expect(result.patient.name).toBe('John Updated');
        expect(result.patient.email).toBe('john@example.com');
    });
});

