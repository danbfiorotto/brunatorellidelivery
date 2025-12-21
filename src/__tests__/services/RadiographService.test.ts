import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RadiographService } from '../../application/services/RadiographService';

describe('RadiographService', () => {
    let service: RadiographService;

    beforeEach(() => {
        service = new RadiographService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have getRadiographs method', () => {
        expect(service.getRadiographs).toBeDefined();
        expect(typeof service.getRadiographs).toBe('function');
    });

    it('should have uploadRadiograph method', () => {
        expect(service.uploadRadiograph).toBeDefined();
        expect(typeof service.uploadRadiograph).toBe('function');
    });

    it('should have deleteRadiograph method', () => {
        expect(service.deleteRadiograph).toBeDefined();
        expect(typeof service.deleteRadiograph).toBe('function');
    });

    it('should have uploadFileToStorage method', () => {
        expect(service.uploadFileToStorage).toBeDefined();
        expect(typeof service.uploadFileToStorage).toBe('function');
    });
});

