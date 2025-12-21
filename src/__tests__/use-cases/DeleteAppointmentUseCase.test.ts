import { DeleteAppointmentUseCase } from '../../application/use-cases/appointment/DeleteAppointmentUseCase';
import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { IAuditService } from '../../infrastructure/audit/IAuditService';
import { ICacheService } from '../../infrastructure/cache/ICacheService';
import { Appointment } from '../../domain/entities/Appointment';
import { Patient } from '../../domain/entities/Patient';
import { DeleteAppointmentInput } from '../../application/use-cases/appointment/DeleteAppointmentUseCase';
import { NotFoundError } from '../../domain/errors/AppError';

describe('DeleteAppointmentUseCase', () => {
    let useCase: DeleteAppointmentUseCase;
    let mockRepository: jest.Mocked<IAppointmentRepository>;
    let mockAuditService: jest.Mocked<IAuditService>;
    let mockCacheService: jest.Mocked<ICacheService>;
    
    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByPatientId: jest.fn()
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
        
        useCase = new DeleteAppointmentUseCase(
            mockRepository,
            mockAuditService,
            mockCacheService
        );
    });
    
    it('should delete appointment successfully', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const appointment = Appointment.create({
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
        
        const input: DeleteAppointmentInput = {
            id: appointment.id
        };
        
        mockRepository.findById.mockResolvedValue(appointment);
        mockRepository.delete.mockResolvedValue(undefined);
        
        const result = await useCase.execute(input);
        
        expect(mockRepository.findById).toHaveBeenCalledWith(input.id);
        expect(mockRepository.delete).toHaveBeenCalledWith(input.id);
        expect(mockAuditService.log).toHaveBeenCalledWith(
            'delete',
            'appointment',
            input.id,
            appointment.toJSON(),
            null
        );
        expect(mockCacheService.invalidateByTag).toHaveBeenCalledWith('appointments');
        expect(result.success).toBe(true);
    });
    
    it('should throw error if appointment not found', async () => {
        const input: DeleteAppointmentInput = {
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
        
        const appointment = Appointment.create({
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
        
        const input: DeleteAppointmentInput = {
            id: appointment.id
        };
        
        mockRepository.findById.mockResolvedValue(appointment);
        mockRepository.delete.mockResolvedValue(undefined);
        
        await useCase.execute(input);
        
        const auditCallOrder = mockAuditService.log.mock.invocationCallOrder[0];
        const deleteCallOrder = mockRepository.delete.mock.invocationCallOrder[0];
        
        expect(auditCallOrder).toBeLessThan(deleteCallOrder);
    });
});

