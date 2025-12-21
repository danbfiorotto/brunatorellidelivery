import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { ProfileService } from '../application/services/ProfileService';
import { useDependenciesSafe } from '../hooks/useDependencies';

interface CurrencyContextType {
    currency: string;
    changeCurrency: (newCurrency: string) => void;
    loading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
    children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
    const [currency, setCurrency] = useState<string>(() => {
        // Try to get from localStorage first
        const savedCurrency = localStorage.getItem('currency');
        return savedCurrency || 'BRL';
    });
    const [loading, setLoading] = useState<boolean>(true);

    // ✅ Obter container de DI no nível do componente (não dentro de callback)
    // Usar hook seguro que retorna null se não disponível
    const container = useDependenciesSafe();

    useEffect(() => {
        const loadCurrency = async (): Promise<void> => {
            // Try to get user from auth state
            try {
                const { supabase } = await import('../lib/supabaseClient');
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                
                if (user?.id && container) {
                    try {
                        // Usar container obtido no nível do componente
                        const profileService = container.resolve<ProfileService>('profileService');
                        if (profileService) {
                            const profile = await profileService.getUserProfile(user.id);
                            if (profile?.currency) {
                                setCurrency(profile.currency);
                                localStorage.setItem('currency', profile.currency);
                            }
                        }
                    } catch (error) {
                        logger.error(error, { context: 'loadCurrency' });
                    }
                }
            } catch (error) {
                logger.error(error, { context: 'getSession' });
            }
            setLoading(false);
        };

        loadCurrency();
    }, [container]);

    const changeCurrency = (newCurrency: string): void => {
        setCurrency(newCurrency);
        localStorage.setItem('currency', newCurrency);
    };

    return (
        <CurrencyContext.Provider value={{ currency, changeCurrency, loading }}>
            {!loading && children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = (): CurrencyContextType => {
    const context = useContext(CurrencyContext);
    if (context === undefined) {
        throw new Error('useCurrency must be used within a CurrencyProvider');
    }
    return context;
};

