import { describe, it, expect } from 'vitest';
import { Name } from '../../../domain/value-objects/Name';
import { ValidationError } from '../../../domain/errors/AppError';

describe('Name Value Object', () => {
    describe('create', () => {
        it('should create a valid name', () => {
            const name = Name.create('John Doe');
            expect(name).toBeInstanceOf(Name);
            expect(name?.toString()).toBe('John Doe');
        });

        it('should normalize name (capitalize words)', () => {
            const name = new Name('john doe');
            expect(name.toString()).toBe('John Doe');
        });

        it('should trim whitespace', () => {
            const name = new Name('  John Doe  ');
            expect(name.toString()).toBe('John Doe');
        });

        it('should throw error for name too short', () => {
            expect(() => {
                new Name('Jo'); // Muito curto
            }).toThrow(ValidationError);
        });

        it('should throw error for name too long', () => {
            expect(() => {
                new Name('a'.repeat(256)); // Muito longo
            }).toThrow(ValidationError);
        });

        it('should return null for null/undefined', () => {
            expect(Name.create(null)).toBeNull();
            expect(Name.create(undefined)).toBeNull();
        });
    });

    describe('isValid', () => {
        it('should validate correct names', () => {
            expect(Name.isValid('John Doe')).toBe(true);
            expect(Name.isValid('Maria Silva Santos')).toBe(true);
        });

        it('should reject invalid names', () => {
            expect(Name.isValid('Jo')).toBe(false); // Muito curto
            expect(Name.isValid('a'.repeat(256))).toBe(false); // Muito longo
            expect(Name.isValid(null)).toBe(false);
        });
    });

    describe('firstName and lastName', () => {
        it('should extract first and last name correctly', () => {
            const name = new Name('John Doe');
            expect(name.firstName).toBe('John');
            expect(name.lastName).toBe('Doe');
        });

        it('should handle single name', () => {
            const name = new Name('John');
            expect(name.firstName).toBe('John');
            expect(name.lastName).toBe('');
        });
    });

    describe('equals', () => {
        it('should compare names correctly', () => {
            const name1 = new Name('John Doe');
            const name2 = new Name('john doe');
            const name3 = new Name('Jane Doe');

            expect(name1.equals(name2)).toBe(true); // Normalizados são iguais
            expect(name1.equals(name3)).toBe(false);
        });
    });
});

