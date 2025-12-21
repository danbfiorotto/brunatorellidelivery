import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClinicRepository } from '../../infrastructure/repositories/implementations/ClinicRepository';
import { DatabaseAdapter } from '../../infrastructure/database/DatabaseAdapter';
import { CacheService } from '../../infrastructure/cache/CacheService';
import { createMockSupabaseClient } from '../../__mocks__/supabase';

describe('ClinicRepository', () => {
    let repository: ClinicRepository;
    let mockClient: ReturnType<typeof createMockSupabaseClient>;
    let mockDb: DatabaseAdapter;
    let mockCache: CacheService;

    beforeEach(() => {
        mockClient = createMockSupabaseClient();
        
        mockDb = {
            table: vi.fn(() => ({
                select: vi.fn(() => ({
                    orderBy: vi.fn(() => ({
                        execute: vi.fn(() => Promise.resolve([]))
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
        
        repository = new ClinicRepository(mockDb, mockCache);
    });

    it('should be defined', () => {
        expect(repository).toBeDefined();
        expect(repository.tableName).toBe('clinics');
    });

    it('should have findAll method', () => {
        expect(repository.findAll).toBeDefined();
        expect(typeof repository.findAll).toBe('function');
    });

    it('should have findById method', () => {
        expect(repository.findById).toBeDefined();
        expect(typeof repository.findById).toBe('function');
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

