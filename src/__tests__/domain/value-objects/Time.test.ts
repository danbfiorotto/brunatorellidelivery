import { describe, it, expect } from 'vitest';
import { Time } from '../../../domain/value-objects/Time';
import { ValidationError } from '../../../domain/errors/AppError';

describe('Time Value Object', () => {
    describe('create', () => {
        it('should create a valid time', () => {
            const time = Time.create('14:30');
            expect(time).toBeInstanceOf(Time);
            expect(time?.toString()).toBe('14:30');
        });

        it('should normalize time with seconds', () => {
            const time = new Time('14:30:45');
            expect(time.toString()).toBe('14:30');
        });

        it('should throw error for invalid time', () => {
            expect(() => {
                new Time('25:00'); // Hora inválida
            }).toThrow(ValidationError);
        });

        it('should return null for null/undefined', () => {
            expect(Time.create(null)).toBeNull();
            expect(Time.create(undefined)).toBeNull();
        });
    });

    describe('isValid', () => {
        it('should validate correct times', () => {
            expect(Time.isValid('14:30')).toBe(true);
            expect(Time.isValid('09:00')).toBe(true);
            expect(Time.isValid('23:59')).toBe(true);
        });

        it('should reject invalid times', () => {
            expect(Time.isValid('25:00')).toBe(false);
            expect(Time.isValid('14:60')).toBe(false);
            expect(Time.isValid('invalid')).toBe(false);
        });
    });

    describe('hours and minutes', () => {
        it('should extract hours and minutes correctly', () => {
            const time = new Time('14:30');
            expect(time.hours).toBe(14);
            expect(time.minutes).toBe(30);
        });
    });

    describe('isBefore and isAfter', () => {
        it('should compare times correctly', () => {
            const time1 = new Time('09:00');
            const time2 = new Time('14:30');
            const time3 = new Time('18:00');

            expect(time1.isBefore(time2)).toBe(true);
            expect(time2.isAfter(time1)).toBe(true);
            expect(time2.isBefore(time3)).toBe(true);
        });
    });
});

