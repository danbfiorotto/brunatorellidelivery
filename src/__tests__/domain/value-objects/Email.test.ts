import { describe, it, expect } from 'vitest';
import { Email } from '../../../domain/value-objects/Email';
import { ValidationError } from '../../../domain/errors/AppError';

describe('Email Value Object', () => {
    describe('create', () => {
        it('should create a valid email', () => {
            const email = Email.create('test@example.com');
            expect(email).toBeInstanceOf(Email);
            expect(email?.toString()).toBe('test@example.com');
        });

        it('should normalize email to lowercase', () => {
            const email = new Email('TEST@EXAMPLE.COM');
            expect(email.toString()).toBe('test@example.com');
        });

        it('should trim whitespace', () => {
            const email = new Email('  test@example.com  ');
            expect(email.toString()).toBe('test@example.com');
        });

        it('should throw error for invalid email', () => {
            expect(() => {
                new Email('invalid-email');
            }).toThrow(ValidationError);
        });

        it('should return null for null/undefined', () => {
            expect(Email.create(null)).toBeNull();
            expect(Email.create(undefined)).toBeNull();
        });
    });

    describe('isValid', () => {
        it('should validate correct emails', () => {
            expect(Email.isValid('test@example.com')).toBe(true);
            expect(Email.isValid('user.name@domain.co.uk')).toBe(true);
        });

        it('should reject invalid emails', () => {
            expect(Email.isValid('invalid')).toBe(false);
            expect(Email.isValid('@example.com')).toBe(false);
            expect(Email.isValid('test@')).toBe(false);
            expect(Email.isValid(null)).toBe(false);
        });
    });

    describe('equals', () => {
        it('should compare emails correctly', () => {
            const email1 = new Email('test@example.com');
            const email2 = new Email('test@example.com');
            const email3 = new Email('other@example.com');

            expect(email1.equals(email2)).toBe(true);
            expect(email1.equals(email3)).toBe(false);
        });
    });

    describe('domain and localPart', () => {
        it('should extract domain correctly', () => {
            const email = new Email('test@example.com');
            expect(email.domain).toBe('example.com');
        });

        it('should extract localPart correctly', () => {
            const email = new Email('test@example.com');
            expect(email.localPart).toBe('test');
        });
    });
});

