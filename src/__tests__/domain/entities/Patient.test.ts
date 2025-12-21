import { describe, it, expect } from 'vitest';
import { Patient } from '../../../domain/entities/Patient';
import { DomainError } from '../../../domain/errors/AppError';

describe('Patient Entity', () => {
    describe('create', () => {
        it('should create a valid patient', () => {
            const patient = Patient.create({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '11999999999',
                userId: 'user-123'
            });

            expect(patient).toBeInstanceOf(Patient);
            expect(patient.name).toBe('John Doe');
            expect(patient.email).toBe('john@example.com');
            expect(patient.id).toBeDefined();
        });

        it('should throw error for invalid name', () => {
            expect(() => {
                Patient.create({
                    name: 'Jo', // Muito curto
                    userId: 'user-123'
                });
            }).toThrow();
        });
    });

    describe('updateName', () => {
        it('should update name successfully', () => {
            const patient = Patient.create({
                name: 'John Doe',
                userId: 'user-123'
            });

            patient.updateName('Jane Doe');
            expect(patient.name).toBe('Jane Doe');
        });
    });

    describe('updateEmail', () => {
        it('should update email successfully', () => {
            const patient = Patient.create({
                name: 'John Doe',
                userId: 'user-123'
            });

            patient.updateEmail('newemail@example.com');
            expect(patient.email).toBe('newemail@example.com');
        });

        it('should allow null email', () => {
            const patient = Patient.create({
                name: 'John Doe',
                email: 'john@example.com',
                userId: 'user-123'
            });

            patient.updateEmail(null);
            expect(patient.email).toBeNull();
        });
    });

    describe('toJSON and fromJSON', () => {
        it('should serialize and deserialize correctly', () => {
            const original = Patient.create({
                name: 'John Doe',
                email: 'john@example.com',
                phone: '11999999999',
                userId: 'user-123'
            });

            const json = original.toJSON();
            const restored = Patient.fromJSON({
                id: json.id,
                name: json.name,
                email: json.email,
                phone: json.phone,
                user_id: json.user_id,
                last_visit: json.last_visit,
                created_at: json.created_at,
                updated_at: json.updated_at
            });

            expect(restored.name).toBe(original.name);
            expect(restored.email).toBe(original.email);
        });
    });
});

