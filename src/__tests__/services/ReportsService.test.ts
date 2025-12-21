import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportsService } from '../../application/services/ReportsService';

describe('ReportsService', () => {
    let service: ReportsService;

    beforeEach(() => {
        service = new ReportsService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have getReportsData method', () => {
        expect(service.getReportsData).toBeDefined();
        expect(typeof service.getReportsData).toBe('function');
    });
});

