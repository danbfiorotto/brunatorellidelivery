import { GetAllAppointmentsUseCase } from '../../application/use-cases/appointment/GetAllAppointmentsUseCase';
import { IAppointmentRepository } from '../../infrastructure/repositories/interfaces/IAppointmentRepository';
import { Appointment } from '../../domain/entities/Appointment';
import { Patient } from '../../domain/entities/Patient';
import { GetAllAppointmentsInput } from '../../application/use-cases/appointment/GetAllAppointmentsUseCase';

describe('GetAllAppointmentsUseCase', () => {
    let useCase: GetAllAppointmentsUseCase;
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
        
        useCase = new GetAllAppointmentsUseCase(mockRepository);
    });
    
    it('should return all appointments as array', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const appointments = [
            Appointment.create({
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
            }),
            Appointment.create({
                patientId: patient.id,
                patientName: patient.name,
                patientEmail: patient.email,
                patientPhone: patient.phone,
                date: new Date('2024-01-16'),
                time: '14:00',
                procedure: 'Exame',
                value: 200,
                currency: 'BRL',
                userId: 'user-123'
            })
        ];
        
        mockRepository.findAll.mockResolvedValue(appointments);
        
        const result = await useCase.execute();
        
        expect(mockRepository.findAll).toHaveBeenCalledWith({});
        expect(result.appointments).toEqual(appointments);
        expect(Array.isArray(result.appointments)).toBe(true);
    });
    
    it('should return paginated result when repository returns pagination', async () => {
        const patient = Patient.create({
            name: 'John Doe',
            email: 'john@example.com',
            phone: '1234567890',
            userId: 'user-123'
        });
        
        const paginatedResult = {
            data: [
                Appointment.create({
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
        
        const input: GetAllAppointmentsInput = {
            options: {
                page: 1,
                pageSize: 10
            }
        };
        
        const result = await useCase.execute(input);
        
        expect(mockRepository.findAll).toHaveBeenCalledWith(input.options);
        expect(result.appointments).toEqual(paginatedResult);
        expect('pagination' in (result.appointments as typeof paginatedResult)).toBe(true);
    });
    
    it('should handle empty input', async () => {
        const appointments: Appointment[] = [];
        
        mockRepository.findAll.mockResolvedValue(appointments);
        
        const result = await useCase.execute();
        
        expect(mockRepository.findAll).toHaveBeenCalledWith({});
        expect(result.appointments).toEqual(appointments);
    });
    
    it('should pass options to repository', async () => {
        const input: GetAllAppointmentsInput = {
            options: {
                page: 2,
                pageSize: 20,
                filters: { patientId: 'patient-123' }
            }
        };
        
        const appointments: Appointment[] = [];
        
        mockRepository.findAll.mockResolvedValue(appointments);
        
        await useCase.execute(input);
        
        expect(mockRepository.findAll).toHaveBeenCalledWith(input.options);
    });
});

