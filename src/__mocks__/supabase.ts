import { vi } from 'vitest';

interface MockSupabaseClient {
    from: (table: string) => {
        select: (columns?: string) => {
            eq: (column: string, value: unknown) => {
                single: () => Promise<{ data: unknown; error: unknown }>;
                execute: () => Promise<{ data: unknown[]; error: unknown }>;
            };
            order: (column: string, options?: { ascending?: boolean }) => {
                execute: () => Promise<{ data: unknown[]; error: unknown }>;
            };
            execute: () => Promise<{ data: unknown[]; error: unknown }>;
        };
        insert: (data: unknown) => {
            select: (columns?: string) => {
                single: () => Promise<{ data: Record<string, unknown>; error: unknown }>;
            };
        };
        update: (data: unknown) => {
            select: () => Promise<{ data: Record<string, unknown>; error: unknown }>;
        };
        delete: () => Promise<{ error: unknown }>;
    };
    auth: {
        getSession: () => Promise<{
            data: {
                session: {
                    user: {
                        id: string;
                        email: string;
                    };
                };
            };
        }>;
        refreshSession: () => Promise<{
            data: {
                session: {
                    user: {
                        id: string;
                        email: string;
                    };
                };
            };
        }>;
    };
}

/**
 * Cria um mock do cliente Supabase para testes
 * @returns {MockSupabaseClient} Cliente Supabase mockado
 */
export const createMockSupabaseClient = (): MockSupabaseClient => {
    const mockClient: MockSupabaseClient = {
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: null })),
                    execute: vi.fn(() => Promise.resolve({ data: [], error: null }))
                })),
                order: vi.fn(() => ({
                    execute: vi.fn(() => Promise.resolve({ data: [], error: null }))
                })),
                execute: vi.fn(() => Promise.resolve({ data: [], error: null }))
            })),
            insert: vi.fn(() => ({
                select: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: {}, error: null }))
                }))
            })),
            update: vi.fn(() => ({
                select: vi.fn(() => Promise.resolve({ data: {}, error: null }))
            })),
            delete: vi.fn(() => Promise.resolve({ error: null }))
        })),
        auth: {
            getSession: vi.fn(() => Promise.resolve({
                data: {
                    session: {
                        user: {
                            id: 'test-user-id',
                            email: 'test@example.com'
                        }
                    }
                }
            })),
            refreshSession: vi.fn(() => Promise.resolve({
                data: {
                    session: {
                        user: {
                            id: 'test-user-id',
                            email: 'test@example.com'
                        }
                    }
                }
            }))
        }
    };
    
    return mockClient;
};

// Instância padrão para uso em testes
export const mockSupabaseClient = createMockSupabaseClient();

