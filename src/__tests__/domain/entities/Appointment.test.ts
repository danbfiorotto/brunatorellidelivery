import { describe, it, expect } from 'vitest';
import { Appointment } from '../../../domain/entities/Appointment';
import { DomainError } from '../../../domain/errors/AppError';

describe('Appointment Entity', () => {
    describe('create', () => {
        it('should create a valid appointment', () => {
            // Usar data futura para passar na validação
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const appointment = Appointment.create({
                patientId: 'patient-123',
                clinicId: 'clinic-123',
                date: tomorrow.toISOString().split('T')[0],
                time: '14:30',
                procedure: 'Consulta',
                value: 100,
                currency: 'BRL'
            });

            expect(appointment).toBeInstanceOf(Appointment);
            expect(appointment.patientId).toBe('patient-123');
            expect(appointment.procedure).toBe('Consulta');
        });

        it('should throw error for past date', () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            expect(() => {
                Appointment.create({
                    patientId: 'patient-123',
                    date: yesterday.toISOString().split('T')[0],
                    time: '14:30',
                    procedure: 'Consulta',
                    value: 100
                });
            }).toThrow(DomainError);
        });
    });

    describe('markAsPaid', () => {
        it('should mark appointment as paid', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const appointment = Appointment.create({
                patientId: 'patient-123',
                date: tomorrow.toISOString().split('T')[0],
                time: '14:30',
                procedure: 'Consulta',
                value: 100
            });

            appointment.markAsPaid();
            expect(appointment.isPaid).toBe(true);
            expect(appointment.status).toBe('paid');
        });

        it('should throw error if already paid', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const appointment = Appointment.create({
                patientId: 'patient-123',
                date: tomorrow.toISOString().split('T')[0],
                time: '14:30',
                procedure: 'Consulta',
                value: 100
            });

            appointment.markAsPaid();
            
            expect(() => {
                appointment.markAsPaid();
            }).toThrow(DomainError);
        });
    });

    describe('calculateReceivedValue', () => {
        it('should calculate received value correctly', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const appointment = Appointment.create({
                patientId: 'patient-123',
                date: tomorrow.toISOString().split('T')[0],
                time: '14:30',
                procedure: 'Consulta',
                value: 100,
                paymentType: 'percentage',
                paymentPercentage: 50
            });

            const received = appointment.calculateReceivedValue();
            expect(received.amount).toBe(50);
        });
    });

    describe('canBeCancelled', () => {
        it('should allow cancellation with 24h+ notice', () => {
            // Criar agendamento para daqui a 2 dias para garantir 24h+ de antecedência
            const twoDaysLater = new Date();
            twoDaysLater.setDate(twoDaysLater.getDate() + 2);
            
            const appointment = Appointment.create({
                patientId: 'patient-123',
                date: twoDaysLater.toISOString().split('T')[0],
                time: '14:30',
                procedure: 'Consulta',
                value: 100
            });

            expect(appointment.canBeCancelled()).toBe(true);
        });
    });

    describe('toJSON and fromJSON', () => {
        it('should serialize and deserialize correctly', () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const original = Appointment.create({
                patientId: 'patient-123',
                clinicId: 'clinic-123',
                date: tomorrow.toISOString().split('T')[0],
                time: '14:30',
                procedure: 'Consulta',
                value: 100,
                currency: 'BRL'
            });

            const json = original.toJSON();
            const restored = Appointment.fromJSON(json);

            expect(restored.patientId).toBe(original.patientId);
            expect(restored.procedure).toBe(original.procedure);
        });
    });
});

