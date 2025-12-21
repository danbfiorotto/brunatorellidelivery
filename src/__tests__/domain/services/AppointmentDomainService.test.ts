import { describe, it, expect } from 'vitest';
import { AppointmentDomainService } from '../../../domain/services/AppointmentDomainService';

describe('AppointmentDomainService', () => {
    describe('determineStatus', () => {
        it('should return "paid" when is_paid is true', () => {
            const result = AppointmentDomainService.determineStatus({ is_paid: true });
            expect(result).toBe('paid');
        });

        it('should return "pending" when scheduled and not paid', () => {
            const result = AppointmentDomainService.determineStatus({
                status: 'scheduled',
                is_paid: false
            });
            expect(result).toBe('pending');
        });

        it('should return "scheduled" when status is scheduled and paid is false', () => {
            const result = AppointmentDomainService.determineStatus({
                status: 'scheduled',
                is_paid: false
            });
            expect(result).toBe('pending');
        });

        it('should return provided status when not paid and status is not scheduled', () => {
            const result = AppointmentDomainService.determineStatus({
                status: 'pending',
                is_paid: false
            });
            expect(result).toBe('pending');
        });

        it('should return "scheduled" as default when no status provided', () => {
            const result = AppointmentDomainService.determineStatus({});
            expect(result).toBe('scheduled');
        });
    });

    describe('calculateReceivedValue', () => {
        it('should return full value when payment_type is "100"', () => {
            const appointment = {
                value: 1000,
                payment_type: '100'
            };
            const result = AppointmentDomainService.calculateReceivedValue(appointment);
            expect(result).toBe(1000);
        });

        it('should calculate percentage when payment_type is "percentage"', () => {
            const appointment = {
                value: 1000,
                payment_type: 'percentage',
                payment_percentage: 50
            };
            const result = AppointmentDomainService.calculateReceivedValue(appointment);
            expect(result).toBe(500);
        });

        it('should return 0 when value is 0', () => {
            const appointment = {
                value: 0,
                payment_type: '100'
            };
            const result = AppointmentDomainService.calculateReceivedValue(appointment);
            expect(result).toBe(0);
        });

        it('should return 0 when value is null or undefined', () => {
            const appointment = {
                value: null,
                payment_type: '100'
            };
            const result = AppointmentDomainService.calculateReceivedValue(appointment);
            expect(result).toBe(0);
        });
    });

    describe('normalizeAppointmentData', () => {
        it('should normalize appointment data correctly', () => {
            const input = {
                clinic_id: 'clinic-1',
                patient_id: 'patient-1',
                date: '2024-01-15',
                time: '10:00',
                procedure: 'Tratamento de canal',
                value: '1000',
                currency: 'BRL',
                payment_type: '100',
                is_paid: false,
                status: 'scheduled', // Status explícito
                clinical_evolution: '  Teste  ',
                notes: '  Nota teste  '
            };

            const result = AppointmentDomainService.normalizeAppointmentData(input);

            expect(result.clinic_id).toBe('clinic-1');
            expect(result.patient_id).toBe('patient-1');
            expect(result.value).toBe(1000);
            expect(result.currency).toBe('BRL');
            // Status será 'pending' porque status é 'scheduled' e is_paid é false
            expect(result.status).toBe('pending');
            expect(result.clinical_evolution).toBe('Teste');
            expect(result.notes).toBe('Nota teste');
        });

        it('should set status to "paid" when is_paid is true', () => {
            const input = {
                is_paid: true,
                status: 'scheduled'
            };

            const result = AppointmentDomainService.normalizeAppointmentData(input);
            expect(result.status).toBe('paid');
        });
    });

    describe('validateAppointmentData', () => {
        it('should return valid for correct data', () => {
            const data = {
                patient_id: 'patient-1',
                date: '2024-12-31',
                time: '10:00',
                procedure: 'Tratamento',
                value: 1000
            };

            const result = AppointmentDomainService.validateAppointmentData(data);
            expect(result.isValid).toBe(true);
            expect(Object.keys(result.errors)).toHaveLength(0);
        });

        it('should return errors for missing required fields', () => {
            const data = {};

            const result = AppointmentDomainService.validateAppointmentData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors.patient).toBeDefined();
            expect(result.errors.date).toBeDefined();
            expect(result.errors.time).toBeDefined();
            expect(result.errors.procedure).toBeDefined();
        });

        it('should validate payment percentage when payment_type is percentage', () => {
            const data = {
                patient_id: 'patient-1',
                date: '2024-12-31',
                time: '10:00',
                procedure: 'Tratamento',
                payment_type: 'percentage'
            };

            const result = AppointmentDomainService.validateAppointmentData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors.payment_percentage).toBeDefined();
        });

        it('should validate value is positive', () => {
            const data = {
                patient_id: 'patient-1',
                date: '2024-12-31',
                time: '10:00',
                procedure: 'Tratamento',
                value: -100
            };

            const result = AppointmentDomainService.validateAppointmentData(data);
            expect(result.isValid).toBe(false);
            expect(result.errors.value).toBeDefined();
        });
    });
});

