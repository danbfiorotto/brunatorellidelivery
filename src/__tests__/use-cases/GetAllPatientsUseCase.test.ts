import { GetAllPatientsUseCase } from '../../application/use-cases/patient/GetAllPatientsUseCase';
import { IPatientRepository } from '../../infrastructure/repositories/interfaces/IPatientRepository';
import { Patient } from '../../domain/entities/Patient';
import { GetAllPatientsInput } from '../../application/use-cases/patient/GetAllPatientsUseCase';

describe('GetAllPatientsUseCase', () => {
    let useCase: GetAllPatientsUseCase;
    let mockRepository: jest.Mocked<IPatientRepository>;
    
    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByNameOrEmail: jest.fn()
        };
        
        useCase = new GetAllPatientsUseCase(mockRepository);
    });
    
    it('should return all patients as array', async () => {
        const patients = [
            Patient.create({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '1234567890',
                userId: 'user-123'
            }),
            Patient.create({
                name: 'Jane Doe',
                email: 'jane@example.com',
                phone: '0987654321',
                userId: 'user-123'
            })
        ];
        
        mockRepository.findAll.mockResolvedValue(patients);
        
        const result = await useCase.execute();
        
        expect(mockRepository.findAll).toHaveBeenCalledWith({});
        expect(result.patients).toEqual(patients);
        expect(Array.isArray(result.patients)).toBe(true);
    });
    
    it('should return paginated result when repository returns pagination', async () => {
        const paginatedResult = {
            data: [
                Patient.create({
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '1234567890',
                    userId: 'user-123'
                })
            ],
            pagination: {
                page: 1,
                pageSize: 10,
                total: 1,
                totalPages: 1,
                hasNext: false,
                hasPrev: false
            }
        };
        
        mockRepository.findAll.mockResolvedValue(paginatedResult);
        
        const input: GetAllPatientsInput = {
            options: {
                page: 1,
                pageSize: 10
            }
        };
        
        const result = await useCase.execute(input);
        
        expect(mockRepository.findAll).toHaveBeenCalledWith(input.options);
        expect(result.patients).toEqual(paginatedResult);
        expect('pagination' in (result.patients as typeof paginatedResult)).toBe(true);
    });
    
    it('should handle empty input', async () => {
        const patients: Patient[] = [];
        
        mockRepository.findAll.mockResolvedValue(patients);
        
        const result = await useCase.execute();
        
        expect(mockRepository.findAll).toHaveBeenCalledWith({});
        expect(result.patients).toEqual(patients);
    });
    
    it('should pass options to repository', async () => {
        const input: GetAllPatientsInput = {
            options: {
                page: 2,
                pageSize: 20,
                filters: { name: 'John' }
            }
        };
        
        const patients: Patient[] = [];
        
        mockRepository.findAll.mockResolvedValue(patients);
        
        await useCase.execute(input);
        
        expect(mockRepository.findAll).toHaveBeenCalledWith(input.options);
    });
});

