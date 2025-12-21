/**
 * Configuração global para testes
 */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { setupDI } from '../infrastructure/di/setup';
import { DIContainer } from '../infrastructure/di/Container';

// Limpar após cada teste
afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Mock do window.matchMedia (usado por alguns componentes)
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: (): void => {},
        removeListener: (): void => {},
        addEventListener: (): void => {},
        removeEventListener: (): void => {},
        dispatchEvent: (): boolean => true,
    }),
});

// Mock do sessionStorage
const sessionStorageMock = (() => {
    const store: Record<string, string> = {};
    return {
        getItem: (key: string): string | null => store[key] || null,
        setItem: (key: string, value: string): void => {
            store[key] = value.toString();
        },
        removeItem: (key: string): void => {
            delete store[key];
        },
        clear: (): void => {
            Object.keys(store).forEach(key => delete store[key]);
        }
    };
})();

Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock
});

/**
 * Cria um novo container de DI para testes
 * ✅ Sempre cria novo container (não usa singleton)
 * Permite testes isolados e diferentes configurações
 */
export function createTestContainer(): DIContainer {
    return setupDI();
}

