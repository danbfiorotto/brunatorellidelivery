import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PatientRepository } from '../../infrastructure/repositories/implementations/PatientRepository';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { CacheService } from '../../infrastructure/cache/CacheService';

describe('PatientRepository', () => {
    let repository: PatientRepository;
    let mockDb: DatabaseAdapter;
    let mockCache: CacheService;

    beforeEach(() => {
        mockDb = {
            table: vi.fn(() => ({
                select: vi.fn(() => ({
                    where: vi.fn(() => ({
                        single: vi.fn(() => ({
                            execute: vi.fn(() => Promise.resolve(null))
                        }))
                    }))
                }))
            }))
        } as unknown as DatabaseAdapter;
        
        mockCache = {
            get: vi.fn(() => null),
            set: vi.fn(),
            delete: vi.fn(),
            invalidate: vi.fn(),
            setWithTags: vi.fn()
        } as unknown as CacheService;
        
        repository = new PatientRepository(mockDb, mockCache);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
        expect(repository.tableName).toBe('patients');
    });

    it('should have findAll method', () => {
        expect(repository.findAll).toBeDefined();
        expect(typeof repository.findAll).toBe('function');
    });

    it('should have findById method', () => {
        expect(repository.findById).toBeDefined();
        expect(typeof repository.findById).toBe('function');
    });

    it('should have findByNameOrEmail method', () => {
        expect(repository.findByNameOrEmail).toBeDefined();
        expect(typeof repository.findByNameOrEmail).toBe('function');
    });

    it('should have create method', () => {
        expect(repository.create).toBeDefined();
        expect(typeof repository.create).toBe('function');
    });

    it('should have update method', () => {
        expect(repository.update).toBeDefined();
        expect(typeof repository.update).toBe('function');
    });

    it('should have delete method', () => {
        expect(repository.delete).toBeDefined();
        expect(typeof repository.delete).toBe('function');
    });
});

