import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { logAction } from '../lib/audit';
import { useDependencies } from '../hooks/useDependencies';
import { IAuthClient } from '../infrastructure/auth/IAuthClient';

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
    const container = useDependencies();
    const authClient = container.resolve<IAuthClient>('authClient');
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
        // Log logout before signing out
        if (user?.id) {
            await logAction('logout', 'auth', user.id, null, null);
        }
        await authClient.signOut();
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

