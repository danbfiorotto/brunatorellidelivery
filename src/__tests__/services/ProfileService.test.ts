import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProfileService } from '../../application/services/ProfileService';

describe('ProfileService', () => {
    let service: ProfileService;

    beforeEach(() => {
        service = new ProfileService();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should have getUserProfile method', () => {
        expect(service.getUserProfile).toBeDefined();
        expect(typeof service.getUserProfile).toBe('function');
    });

    it('should have createUserProfile method', () => {
        expect(service.createUserProfile).toBeDefined();
        expect(typeof service.createUserProfile).toBe('function');
    });

    it('should have updateUserProfile method', () => {
        expect(service.updateUserProfile).toBeDefined();
        expect(typeof service.updateUserProfile).toBe('function');
    });
});

