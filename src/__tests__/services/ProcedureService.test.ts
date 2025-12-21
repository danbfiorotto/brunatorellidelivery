import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcedureService } from '../../application/services/ProcedureService';

describe('ProcedureService', () => {
    let service: ProcedureService;

    beforeEach(() => {
        service = new ProcedureService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have getAll method', () => {
        expect(service.getAll).toBeDefined();
        expect(typeof service.getAll).toBe('function');
    });

    it('should have getById method', () => {
        expect(service.getById).toBeDefined();
        expect(typeof service.getById).toBe('function');
    });

    it('should have create method', () => {
        expect(service.create).toBeDefined();
        expect(typeof service.create).toBe('function');
    });

    it('should have update method', () => {
        expect(service.update).toBeDefined();
        expect(typeof service.update).toBe('function');
    });
});

