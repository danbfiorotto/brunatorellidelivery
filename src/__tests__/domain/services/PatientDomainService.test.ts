import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientDomainService } from '../../../domain/services/PatientDomainService';

interface MockPatientRepository {
    findByNameOrEmail: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
}

describe('PatientDomainService', () => {
    let mockPatientRepository: MockPatientRepository;

    beforeEach(() => {
        mockPatientRepository = {
            findByNameOrEmail: vi.fn(),
            create: vi.fn(),
            update: vi.fn()
        };
    });

    describe('resolvePatient', () => {
        it('should return existing patient_id if provided', async () => {
            const patientData = {
                patient_id: 'existing-id'
            };

            const result = await PatientDomainService.resolvePatient(
                patientData,
                mockPatientRepository as unknown as Parameters<typeof PatientDomainService.resolvePatient>[1]
            );

            expect(result).toBe('existing-id');
            expect(mockPatientRepository.findByNameOrEmail).not.toHaveBeenCalled();
        });

        it('should find existing patient by name', async () => {
            const patientData = {
                patient_name: 'João Silva'
            };

            (mockPatientRepository.findByNameOrEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'found-id',
                name: 'João Silva'
            });

            const result = await PatientDomainService.resolvePatient(
                patientData,
                mockPatientRepository as unknown as Parameters<typeof PatientDomainService.resolvePatient>[1]
            );

            expect(result).toBe('found-id');
            expect(mockPatientRepository.findByNameOrEmail).toHaveBeenCalledWith(
                'João Silva',
                undefined
            );
        });

        it('should create new patient if not found', async () => {
            const patientData = {
                patient_name: 'Novo Paciente',
                patient_email: 'novo@email.com',
                patient_phone: '11999999999'
            };

            (mockPatientRepository.findByNameOrEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
            (mockPatientRepository.create as ReturnType<typeof vi.fn>).mockResolvedValue({
                id: 'new-id',
                name: 'Novo Paciente'
            });

            const result = await PatientDomainService.resolvePatient(
                patientData,
                mockPatientRepository as unknown as Parameters<typeof PatientDomainService.resolvePatient>[1]
            );

            expect(result).toBe('new-id');
            expect(mockPatientRepository.create).toHaveBeenCalledWith({
                name: 'Novo Paciente',
                email: 'novo@email.com',
                phone: '11999999999'
            });
        });

        it('should throw error if no patient_id and no patient_name', async () => {
            const patientData = {};

            await expect(
                PatientDomainService.resolvePatient(patientData, mockPatientRepository as unknown as Parameters<typeof PatientDomainService.resolvePatient>[1])
            ).rejects.toThrow('Nome do paciente é obrigatório');
        });
    });

    describe('validatePatientData', () => {
        it('should return valid for correct data', () => {
            const data = {
                name: 'João Silva',
                email: 'joao@email.com',
                phone: '11999999999'
            };

            const result = PatientDomainService.validatePatientData(data);
            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        it('should return error for missing name', () => {
            const data = {
                email: 'joao@email.com'
            };

            const result = PatientDomainService.validatePatientData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors.name).toBeDefined();
        });

        it('should validate email format', () => {
            const data = {
                name: 'João Silva',
                email: 'invalid-email'
            };

            const result = PatientDomainService.validatePatientData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors.email).toBeDefined();
        });

        it('should allow valid email', () => {
            const data = {
                name: 'João Silva',
                email: 'joao@email.com'
            };

            const result = PatientDomainService.validatePatientData(data);
            expect(result.isValid).toBe(true);
        });
    });
});

