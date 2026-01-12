import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { logAction } from '../lib/audit';
import { useDependenciesSafe } from '../hooks/useDependencies';
import { IAuthClient } from '../infrastructure/auth/IAuthClient';
import { setupDI } from '../infrastructure/di/setup';

interface AuthContextType {
    user: User | null;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    // ✅ Usar useDependenciesSafe para evitar erro se DIProvider não estiver disponível
    // Se não estiver disponível, criar container temporário (fallback)
    const container = useDependenciesSafe();
    const authClient = container 
        ? container.resolve<IAuthClient>('authClient')
        : setupDI().resolve<IAuthClient>('authClient');
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        // Check active session
        authClient.getSession().then((session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = authClient.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, [authClient]);

    const signIn = async (email: string, password: string): Promise<void> => {
        await authClient.signIn(email, password);
    };

    const signUp = async (email: string, password: string): Promise<void> => {
        await authClient.signUp(email, password);
    };

    const signOut = async (): Promise<void> => {
        try {
            // Log logout before signing out (não deve bloquear o logout se falhar)
            if (user?.id) {
                try {
                    await logAction('logout', 'auth', user.id, null, null);
                } catch (logError) {
                    // Log de auditoria falhou, mas não deve impedir o logout
                    console.warn('Failed to log logout action:', logError);
                }
            }
            
            // Realizar logout
            await authClient.signOut();
            
            // Limpar estado local imediatamente
            setUser(null);
        } catch (error) {
            // Se o logout falhar, ainda limpar o estado local para evitar estado inconsistente
            setUser(null);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, signIn, signUp, signOut, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

