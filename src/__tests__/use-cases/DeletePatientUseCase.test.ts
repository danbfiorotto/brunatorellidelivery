import { DeletePatientUseCase } from '../../application/use-cases/patient/DeletePatientUseCase';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { Patient } from '../../domain/entities/Patient';
import { DeletePatientInput } from '../../application/use-cases/patient/DeletePatientUseCase';
import { NotFoundError } from '../../domain/errors/AppError';

describe('DeletePatientUseCase', () => {
    let useCase: DeletePatientUseCase;
    let mockRepository: jest.Mocked<IPatientRepository>;
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
        
        useCase = new DeletePatientUseCase(
            mockRepository,
            mockAuditService,
            mockCacheService
        );
    });
    
    it('should delete patient successfully', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const input: DeletePatientInput = {
            id: patient.id
        };
        
        mockRepository.findById.mockResolvedValue(patient);
        mockRepository.delete.mockResolvedValue(undefined);
        
        const result = await useCase.execute(input);
        
        expect(mockRepository.findById).toHaveBeenCalledWith(input.id);
        expect(mockRepository.delete).toHaveBeenCalledWith(input.id);
        expect(mockAuditService.log).toHaveBeenCalledWith(
            'delete',
            'patient',
            input.id,
            patient.toJSON(),
            null
        );
        expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith('patients');
        expect(result.success).toBe(true);
    });
    
    it('should throw error if patient not found', async () => {
        const input: DeletePatientInput = {
            id: 'non-existent-id'
        };
        
        mockRepository.findById.mockResolvedValue(null);
        
        await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
        expect(mockRepository.delete).not.toHaveBeenCalled();
    });
    
    it('should log audit before deletion', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const input: DeletePatientInput = {
            id: patient.id
        };
        
        mockRepository.findById.mockResolvedValue(patient);
        mockRepository.delete.mockResolvedValue(undefined);
        
        await useCase.execute(input);
        
        const auditCallOrder = mockAuditService.log.mock.invocationCallOrder[0];
        const deleteCallOrder = mockRepository.delete.mock.invocationCallOrder[0];
        
        expect(auditCallOrder).toBeLessThan(deleteCallOrder);
    });
});

