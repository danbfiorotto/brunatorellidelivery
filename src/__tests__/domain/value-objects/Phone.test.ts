import { describe, it, expect } from 'vitest';
import { Phone } from '../../../domain/value-objects/Phone';
import { ValidationError } from '../../../domain/errors/AppError';

describe('Phone Value Object', () => {
    describe('create', () => {
        it('should create a valid phone', () => {
            const phone = Phone.create('11999999999');
            expect(phone).toBeInstanceOf(Phone);
            expect(phone?.toString()).toBe('11999999999');
        });

        it('should normalize phone by removing non-digits', () => {
            const phone = new Phone('(11) 99999-9999');
            expect(phone.toString()).toBe('11999999999');
        });

        it('should throw error for invalid phone', () => {
            expect(() => {
                new Phone('123'); // Muito curto
            }).toThrow(ValidationError);
        });

        it('should return null for null/undefined', () => {
            expect(Phone.create(null)).toBeNull();
            expect(Phone.create(undefined)).toBeNull();
        });
    });

    describe('isValid', () => {
        it('should validate correct phones', () => {
            expect(Phone.isValid('11999999999')).toBe(true);
            expect(Phone.isValid('(11) 99999-9999')).toBe(true);
            expect(Phone.isValid('1199999999')).toBe(true); // 10 dígitos
        });

        it('should reject invalid phones', () => {
            expect(Phone.isValid('123')).toBe(false);
            expect(Phone.isValid('123456789012')).toBe(false); // Muito longo
            expect(Phone.isValid(null)).toBe(false);
        });
    });

    describe('format', () => {
        it('should format phone correctly', () => {
            const phone = new Phone('11999999999');
            const formatted = phone.format();
            expect(formatted).toContain('(11)');
            expect(formatted).toContain('99999-9999');
        });
    });

    describe('equals', () => {
        it('should compare phones correctly', () => {
            const phone1 = new Phone('11999999999');
            const phone2 = new Phone('(11) 99999-9999');
            const phone3 = new Phone('11988888888');

            expect(phone1.equals(phone2)).toBe(true); // Mesmo número normalizado
            expect(phone1.equals(phone3)).toBe(false);
        });
    });
});

