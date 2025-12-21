import { GetAppointmentUseCase } from '../../application/use-cases/appointment/GetAppointmentUseCase';
import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { Appointment } from '../../domain/entities/Appointment';
import { Patient } from '../../domain/entities/Patient';
import { GetAppointmentInput } from '../../application/use-cases/appointment/GetAppointmentUseCase';
import { NotFoundError } from '../../domain/errors/AppError';

describe('GetAppointmentUseCase', () => {
    let useCase: GetAppointmentUseCase;
    let mockRepository: jest.Mocked<IAppointmentRepository>;
    
    beforeEach(() => {
        mockRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
            findByPatientId: jest.fn()
        };
        
        useCase = new GetAppointmentUseCase(mockRepository);
    });
    
    it('should return appointment successfully', async () => {
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
        
        const input: GetAppointmentInput = {
            id: appointment.id
        };
        
        mockRepository.findById.mockResolvedValue(appointment);
        
        const result = await useCase.execute(input);
        
        expect(mockRepository.findById).toHaveBeenCalledWith(input.id);
        expect(result.appointment).toEqual(appointment);
    });
    
    it('should throw error if appointment not found', async () => {
        const input: GetAppointmentInput = {
            id: 'non-existent-id'
        };
        
        mockRepository.findById.mockResolvedValue(null);
        
        await expect(useCase.execute(input)).rejects.toThrow(NotFoundError);
    });
    
    it('should return appointment with all properties', async () => {
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
            paymentType: 'Dinheiro',
            isPaid: true,
            userId: 'user-123'
        });
        
        const input: GetAppointmentInput = {
            id: appointment.id
        };
        
        mockRepository.findById.mockResolvedValue(appointment);
        
        const result = await useCase.execute(input);
        
        expect(result.appointment.id).toBe(appointment.id);
        expect(result.appointment.patientId).toBe(patient.id);
        expect(result.appointment.procedure).toBe('Consulta');
        expect(result.appointment.value).toBe(100);
        expect(result.appointment.isPaid).toBe(true);
    });
});

