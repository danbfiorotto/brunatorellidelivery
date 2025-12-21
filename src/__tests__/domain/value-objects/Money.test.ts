import { describe, it, expect } from 'vitest';
import { Money } from '../../../domain/value-objects/Money';
import { ValidationError, DomainError } from '../../../domain/errors/AppError';

describe('Money Value Object', () => {
    describe('create', () => {
        it('should create a valid money value', () => {
            const money = Money.create(100.50, 'BRL');
            expect(money).toBeInstanceOf(Money);
            expect(money.amount).toBe(100.50);
            expect(money.currency).toBe('BRL');
        });

        it('should round to 2 decimal places', () => {
            const money = Money.create(100.999, 'BRL');
            expect(money.amount).toBe(101.00);
        });

        it('should throw error for negative values', () => {
            expect(() => {
                Money.create(-100, 'BRL');
            }).toThrow(ValidationError);
        });

        it('should throw error for invalid currency', () => {
            expect(() => {
                Money.create(100, 'INVALID' as 'BRL' | 'USD' | 'EUR');
            }).toThrow(ValidationError);
        });
    });

    describe('add', () => {
        it('should add two money values', () => {
            const money1 = Money.create(100, 'BRL');
            const money2 = Money.create(50, 'BRL');
            const result = money1.add(money2);
            
            expect(result.amount).toBe(150);
            expect(result.currency).toBe('BRL');
        });

        it('should throw error for different currencies', () => {
            const money1 = Money.create(100, 'BRL');
            const money2 = Money.create(50, 'USD');
            
            expect(() => {
                money1.add(money2);
            }).toThrow(DomainError);
        });
    });

    describe('multiply', () => {
        it('should multiply money by factor', () => {
            const money = Money.create(100, 'BRL');
            const result = money.multiply(2);
            
            expect(result.amount).toBe(200);
        });

        it('should throw error for negative factor', () => {
            const money = Money.create(100, 'BRL');
            
            expect(() => {
                money.multiply(-1);
            }).toThrow(DomainError);
        });
    });

    describe('percentage', () => {
        it('should calculate percentage correctly', () => {
            const money = Money.create(100, 'BRL');
            const result = money.percentage(10);
            
            expect(result.amount).toBe(10);
        });
    });

    describe('format', () => {
        it('should format money correctly', () => {
            const money = Money.create(100.50, 'BRL');
            const formatted = money.format('pt-BR');
            
            expect(formatted).toContain('R$');
            expect(formatted).toContain('100,50');
        });
    });

    describe('equals', () => {
        it('should compare money values correctly', () => {
            const money1 = Money.create(100, 'BRL');
            const money2 = Money.create(100, 'BRL');
            const money3 = Money.create(200, 'BRL');

            expect(money1.equals(money2)).toBe(true);
            expect(money1.equals(money3)).toBe(false);
        });
    });
});

