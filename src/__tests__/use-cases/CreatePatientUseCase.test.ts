import { CreatePatientUseCase } from '../../application/use-cases/patient/CreatePatientUseCase';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAuthService } from '../../infrastructure/auth/IAuthService';
import { IInputValidator } from '../../application/validators/IInputValidator';
import { ISanitizer } from '../../infrastructure/sanitization/ISanitizer';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { Patient } from '../../domain/entities/Patient';
import { CreatePatientInput } from '../../application/use-cases/patient/CreatePatientUseCase';
import { ValidationError, AuthenticationError } from '../../domain/errors/AppError';

describe('CreatePatientUseCase', () => {
    let useCase: CreatePatientUseCase;
    let mockRepository: jest.Mocked<IPatientRepository>;
    let mockAuthService: jest.Mocked<IAuthService>;
    let mockValidator: jest.Mocked<IInputValidator<CreatePatientInput>>;
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
        
        useCase = new CreatePatientUseCase(
            mockRepository,
            mockAuthService,
            mockValidator,
            mockSanitizer,
            mockAuditService,
            mockCacheService
        );
    });
    
    it('should create patient successfully', async () => {
        const input: CreatePatientInput = {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890'
        };
        
        const createdPatient = Patient.create({
            name: input.name,
            email: input.email,
            phone: input.phone,
            userId: 'user-123'
        });
        
        mockRepository.create.mockResolvedValue(createdPatient);
        
        const result = await useCase.execute(input);
        
        expect(mockValidator.validate).toHaveBeenCalledWith(input);
        expect(mockSanitizer.sanitizeText).toHaveBeenCalled();
        expect(mockAuthService.getCurrentUserId).toHaveBeenCalled();
        expect(mockRepository.create).toHaveBeenCalled();
        expect(mockAuditService.log).toHaveBeenCalledWith(
            'create',
            'patient',
            createdPatient.id,
            null,
            createdPatient.toJSON()
        );
        expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith('patients');
        expect(result.patient).toEqual(createdPatient);
    });
    
    it('should throw error if validation fails', async () => {
        const input: CreatePatientInput = {
            name: '', // Nome vazio
            email: 'invalid-email',
            phone: '123'
        };
        
        mockValidator.validate.mockRejectedValue(
            new ValidationError({ name: 'Nome é obrigatório' }, 'Dados inválidos')
        );
        
        await expect(useCase.execute(input)).rejects.toThrow(ValidationError);
        expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should throw error if user is not authenticated', async () => {
        const input: CreatePatientInput = {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890'
        };
        
        mockAuthService.getCurrentUserId.mockRejectedValue(
            new AuthenticationError('Usuário não autenticado')
        );
        
        await expect(useCase.execute(input)).rejects.toThrow(AuthenticationError);
        expect(mockRepository.create).not.toHaveBeenCalled();
    });
    
    it('should sanitize input data', async () => {
        const input: CreatePatientInput = {
            name: '<script>alert("xss")</script>John Doe',
            email: 'john@example.com',
            phone: '1234567890'
        };
        
        mockSanitizer.sanitizeText.mockImplementation((text) => {
            if (text.includes('<script>')) {
                return 'John Doe'; // Sanitizado
            }
            return text;
        });
        
        const createdPatient = Patient.create({
            name: 'John Doe',
            email: input.email,
            phone: input.phone,
            userId: 'user-123'
        });
        
        mockRepository.create.mockResolvedValue(createdPatient);
        
        await useCase.execute(input);
        
        expect(mockSanitizer.sanitizeText).toHaveBeenCalledWith(input.name);
    });
});




