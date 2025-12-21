import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { logger } from '../lib/logger';
import { ProfileService } from '../application/services/ProfileService';
import { useDependenciesSafe } from '../hooks/useDependencies';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
    theme: Theme;
    changeTheme: (newTheme: Theme) => Promise<(() => void) | null>;
    loading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [theme, setTheme] = useState<Theme>('light'); // Start with light, will be updated from profile
    const [loading, setLoading] = useState<boolean>(true);

    // ✅ Obter container de DI no nível do componente (não dentro de callback)
    // Usar hook seguro que retorna null se não disponível
    const container = useDependenciesSafe();

    // Get system preference (browser/OS)
    const getSystemTheme = (): 'dark' | 'light' => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    // Apply theme based on preference (auto uses system preference)
    const applyTheme = (preference: Theme): void => {
        const root = document.documentElement;
        // Force remove any existing theme classes first
        root.classList.remove('dark');
        
        let actualTheme: 'dark' | 'light' = preference === 'auto' ? getSystemTheme() : preference;
        
        if (actualTheme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        
        // Also update meta theme-color if needed
        const metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (metaThemeColor) {
            metaThemeColor.setAttribute('content', actualTheme === 'dark' ? '#0f172a' : '#ffffff');
        }
    };

    const loadThemeFromProfile = async (userId: string): Promise<boolean> => {
        if (!container) {
            return false;
        }
        
        try {
            // Usar container obtido no nível do componente
            const profileService = container.resolve<ProfileService>('profileService');
            if (profileService) {
                // Load theme from user profile - this has highest priority
                const profile = await profileService.getUserProfile(userId);
                if (profile?.theme) {
                    // User profile theme overrides everything
                    const profileTheme = profile.theme as Theme;
                    setTheme(profileTheme);
                    localStorage.setItem('theme', profileTheme);
                    applyTheme(profileTheme);
                    
                    return true; // Successfully loaded from profile
                }
            }
        } catch (error) {
            logger.error(error, { context: 'loadThemeFromProfile' });
        }
        return false; // Could not load from profile
    };

    const setupSystemThemeListener = (): (() => void) => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Handler for system theme changes
            const handleSystemThemeChange = (): void => {
                // Check current theme preference from state
                const currentPreference = (localStorage.getItem('theme') || 'light') as Theme;
                if (currentPreference === 'auto') {
                    applyTheme('auto');
                }
            };
            
            // Add listener
            if (mediaQuery.addEventListener) {
                mediaQuery.addEventListener('change', handleSystemThemeChange);
            } else {
                // Fallback for older browsers
                mediaQuery.addListener(handleSystemThemeChange);
            }
            
            return () => {
                if (mediaQuery.removeEventListener) {
                    mediaQuery.removeEventListener('change', handleSystemThemeChange);
                } else {
                    mediaQuery.removeListener(handleSystemThemeChange);
                }
            };
        }
        return () => {}; // No-op cleanup
    };

    useEffect(() => {
        let systemThemeCleanup: (() => void) | null = null;
        
        const loadTheme = async (): Promise<void> => {
            // First, ensure we start with light theme (no system preference)
            applyTheme('light');
            
            // Try to get user from auth state
            try {
                const { supabase } = await import('../lib/supabaseClient');
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                
                if (user?.id) {
                    const loadedFromProfile = await loadThemeFromProfile(user.id);
                    if (!loadedFromProfile) {
                        // No theme in profile, use localStorage if available
                        const savedTheme = (localStorage.getItem('theme') || 'light') as Theme;
                        setTheme(savedTheme);
                        applyTheme(savedTheme);
                        
                        // Setup system listener if auto
                        if (savedTheme === 'auto') {
                            systemThemeCleanup = setupSystemThemeListener();
                        }
                    }
                } else {
                    // No user logged in, use localStorage if available
                    const savedTheme = (localStorage.getItem('theme') || 'light') as Theme;
                    setTheme(savedTheme);
                    applyTheme(savedTheme);
                    
                    // Setup system listener if auto
                    if (savedTheme === 'auto') {
                        systemThemeCleanup = setupSystemThemeListener();
                    }
                }
            } catch (error) {
                logger.error(error, { context: 'getSession' });
                // Fallback to localStorage
                const savedTheme = (localStorage.getItem('theme') || 'light') as Theme;
                setTheme(savedTheme);
                applyTheme(savedTheme);
                
                // Setup system listener if auto
                if (savedTheme === 'auto') {
                    systemThemeCleanup = setupSystemThemeListener();
                }
            }
            setLoading(false);
        };

        loadTheme();

        // Listen for auth state changes to reload theme when user logs in
        let authSubscription: { unsubscribe: () => void } | null = null;
        (async () => {
            try {
                const { supabase } = await import('../lib/supabaseClient');
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    // When user logs in, reload theme from profile - this overrides any browser preference
                    if (event === 'SIGNED_IN' && session?.user?.id) {
                        await loadThemeFromProfile(session.user.id);
                    }
                    // When user logs out, reset to localStorage or light
                    if (event === 'SIGNED_OUT') {
                        const savedTheme = localStorage.getItem('theme');
                        if (savedTheme) {
                            const themeValue = savedTheme as Theme;
                            setTheme(themeValue);
                            applyTheme(themeValue);
                        } else {
                            setTheme('light');
                            applyTheme('light');
                        }
                    }
                });
                authSubscription = subscription;
            } catch (error) {
                logger.error(error, { context: 'setupAuthListener' });
            }
        })();

        return () => {
            if (authSubscription) {
                authSubscription.unsubscribe();
            }
            if (systemThemeCleanup) {
                systemThemeCleanup();
            }
        };
    }, []);

    const changeTheme = async (newTheme: Theme): Promise<(() => void) | null> => {
        // Immediately apply the theme change
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        
        // Setup system theme listener if auto
        let systemThemeCleanup: (() => void) | null = null;
        if (newTheme === 'auto') {
            systemThemeCleanup = setupSystemThemeListener();
        }
        
        // Save to user profile if user is logged in - this ensures profile preference overrides everything
        try {
            const { supabase } = await import('../lib/supabaseClient');
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            
            if (user?.id && container) {
                try {
                    const profileService = container.resolve<ProfileService>('profileService');
                    if (profileService) {
                        await profileService.updateUserProfile(user.id, { theme: newTheme });
                        // After saving, ensure it's applied (in case of any race conditions)
                        applyTheme(newTheme);
                    }
                } catch (error) {
                    logger.error(error, { context: 'saveThemeToProfile' });
                }
            }
        } catch (error) {
            logger.error(error, { context: 'getSession' });
        }
        
        return systemThemeCleanup;
    };

    // Ensure theme is always applied when state changes
    useEffect(() => {
        applyTheme(theme);
        
        // Setup system listener if theme is auto
        let systemThemeCleanup: (() => void) | null = null;
        if (theme === 'auto') {
            systemThemeCleanup = setupSystemThemeListener();
        }
        
        return () => {
            if (systemThemeCleanup) {
                systemThemeCleanup();
            }
        };
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, changeTheme, loading }}>
            {!loading && children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

