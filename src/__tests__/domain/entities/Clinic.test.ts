import { describe, it, expect } from 'vitest';
import { Clinic } from '../../../domain/entities/Clinic';
import { DomainError } from '../../../domain/errors/AppError';

describe('Clinic Entity', () => {
    describe('create', () => {
        it('should create a valid clinic', () => {
            const clinic = Clinic.create({
                name: 'Clínica Teste',
                address: 'Rua Teste, 123',
                email: 'teste@clinica.com',
                phone: '11999999999'
            });

            expect(clinic).toBeInstanceOf(Clinic);
            expect(clinic.name).toBe('Clínica Teste');
            expect(clinic.email).toBe('teste@clinica.com');
            expect(clinic.id).toBeDefined();
        });

        it('should throw error for invalid name', () => {
            expect(() => {
                Clinic.create({
                    name: 'Cl' // Muito curto
                });
            }).toThrow();
        });
    });

    describe('updateName', () => {
        it('should update name successfully', () => {
            const clinic = Clinic.create({
                name: 'Clínica Antiga',
                address: 'Rua Teste'
            });

            clinic.updateName('Clínica Nova');
            expect(clinic.name).toBe('Clínica Nova');
        });
    });

    describe('activate and deactivate', () => {
        it('should activate clinic', () => {
            const clinic = Clinic.create({
                name: 'Clínica Teste',
                status: 'inactive'
            });

            clinic.activate();
            expect(clinic.status).toBe('active');
        });

        it('should deactivate clinic', () => {
            const clinic = Clinic.create({
                name: 'Clínica Teste',
                status: 'active'
            });

            clinic.deactivate();
            expect(clinic.status).toBe('inactive');
        });
    });

    describe('toJSON and fromJSON', () => {
        it('should serialize and deserialize correctly', () => {
            const original = Clinic.create({
                name: 'Clínica Teste',
                address: 'Rua Teste, 123',
                email: 'teste@clinica.com',
                phone: '11999999999'
            });

            const json = original.toJSON();
            const restored = Clinic.fromJSON(json);

            expect(restored.name).toBe(original.name);
            expect(restored.email).toBe(original.email);
        });
    });
});

