import { GetPatientUseCase } from '../../application/use-cases/patient/GetPatientUseCase';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { Patient } from '../../domain/entities/Patient';
import { NotFoundError } from '../../domain/errors/AppError';

describe('GetPatientUseCase', () => {
    let useCase: GetPatientUseCase;
    let mockRepository: jest.Mocked<IPatientRepository>;
    
    beforeEach(() => {
        mockRepository = {
            findById: jest.fn(),
            findAll: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByNameOrEmail: jest.fn()
        };
        
        useCase = new GetPatientUseCase(mockRepository);
    });
    
    it('should return patient when found', async () => {
        const patientId = 'patient-123';
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        mockRepository.findById.mockResolvedValue(patient);
        
        const result = await useCase.execute({ id: patientId });
        
        expect(mockRepository.findById).toHaveBeenCalledWith(patientId);
        expect(result.patient).toEqual(patient);
    });
    
    it('should throw NotFoundError when patient not found', async () => {
        const patientId = 'non-existent';
        
        mockRepository.findById.mockResolvedValue(null);
        
        await expect(useCase.execute({ id: patientId })).rejects.toThrow(NotFoundError);
        expect(mockRepository.findById).toHaveBeenCalledWith(patientId);
    });
});




