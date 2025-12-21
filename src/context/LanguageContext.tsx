import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { logger } from '../lib/logger';
import { ProfileService } from '../application/services/ProfileService';
import { useDependenciesSafe } from '../hooks/useDependencies';

type Language = 'pt-BR' | 'en-US' | 'es-ES';

interface LanguageContextType {
    language: Language;
    changeLanguage: (newLanguage: Language) => Promise<void>;
    t: (key: string) => string;
    loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
    children: ReactNode;
}

/**
 * Provider de idioma usando React-i18next
 * ✅ Integra com i18next para gerenciamento de traduções
 * ✅ Sincroniza com perfil do usuário
 * ✅ Persiste preferência no localStorage
 */
export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
    const { i18n, t: i18nT } = useTranslation();
    const [loading, setLoading] = useState<boolean>(true);

    // Obter idioma atual do i18next
    const currentLanguage = (i18n.language || 'pt-BR') as Language;

    // ✅ Obter container de DI no nível do componente (não dentro de callback)
    // Usar hook seguro que retorna null se não disponível
    const container = useDependenciesSafe();

    useEffect(() => {
        const loadLanguage = async (): Promise<void> => {
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
                            if (profile?.language) {
                                const profileLanguage = profile.language as Language;
                                await i18n.changeLanguage(profileLanguage);
                                localStorage.setItem('language', profileLanguage);
                            }
                        }
                    } catch (error) {
                        logger.error(error, { context: 'loadLanguage' });
                    }
                } else {
                    // Se não houver usuário ou container, usar idioma do localStorage ou padrão
                    const savedLanguage = localStorage.getItem('language') as Language;
                    if (savedLanguage && ['pt-BR', 'en-US', 'es-ES'].includes(savedLanguage)) {
                        await i18n.changeLanguage(savedLanguage);
                    }
                }
            } catch (error) {
                logger.error(error, { context: 'getSession' });
            }
            setLoading(false);
        };

        loadLanguage();
    }, [i18n, container]);

    const changeLanguage = async (newLanguage: Language): Promise<void> => {
        await i18n.changeLanguage(newLanguage);
        localStorage.setItem('language', newLanguage);
        
        // Save to user profile if user is logged in
        if (container) {
            try {
                const { supabase } = await import('../lib/supabaseClient');
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                
                if (user?.id) {
                    try {
                        const profileService = container.resolve<ProfileService>('profileService');
                        if (profileService) {
                            await profileService.updateUserProfile(user.id, { language: newLanguage });
                        }
                    } catch (error) {
                        logger.error(error, { context: 'saveLanguage' });
                    }
                }
            } catch (error) {
                logger.error(error, { context: 'getSession' });
            }
        }
    };

    // Wrapper para t() que mantém compatibilidade com o formato antigo (common.save, nav.dashboard, etc)
    const t = (key: string): string => {
        // i18next usa notação de ponto para chaves aninhadas
        return i18nT(key);
    };

    return (
        <LanguageContext.Provider value={{ 
            language: currentLanguage, 
            changeLanguage, 
            t, 
            loading 
        }}>
            {!loading && children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
