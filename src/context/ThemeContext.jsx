import React, { createContext, useState, useEffect, useContext } from 'react';
import { getUserProfile, updateUserProfile } from '../services/api';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState('light'); // Start with light, will be updated from profile
    const [loading, setLoading] = useState(true);

    // Get system preference (browser/OS)
    const getSystemTheme = () => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return 'light';
    };

    // Apply theme based on preference (auto uses system preference)
    const applyTheme = (preference) => {
        const root = document.documentElement;
        // Force remove any existing theme classes first
        root.classList.remove('dark');
        
        let actualTheme = preference;
        
        // If preference is 'auto', use system preference
        if (preference === 'auto') {
            actualTheme = getSystemTheme();
        }
        
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

    const loadThemeFromProfile = async (userId) => {
        try {
            // Load theme from user profile - this has highest priority
            const profile = await getUserProfile(userId);
            if (profile?.theme) {
                // User profile theme overrides everything
                setTheme(profile.theme);
                localStorage.setItem('theme', profile.theme);
                applyTheme(profile.theme);
                
                return true; // Successfully loaded from profile
            }
        } catch (error) {
            console.error('Error loading theme from profile:', error);
        }
        return false; // Could not load from profile
    };

    const setupSystemThemeListener = () => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Handler for system theme changes
            const handleSystemThemeChange = () => {
                // Check current theme preference from state
                const currentPreference = localStorage.getItem('theme') || 'light';
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
        let systemThemeCleanup = null;
        
        const loadTheme = async () => {
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
                        const savedTheme = localStorage.getItem('theme') || 'light';
                        setTheme(savedTheme);
                        applyTheme(savedTheme);
                        
                        // Setup system listener if auto
                        if (savedTheme === 'auto') {
                            systemThemeCleanup = setupSystemThemeListener();
                        }
                    }
                } else {
                    // No user logged in, use localStorage if available
                    const savedTheme = localStorage.getItem('theme') || 'light';
                    setTheme(savedTheme);
                    applyTheme(savedTheme);
                    
                    // Setup system listener if auto
                    if (savedTheme === 'auto') {
                        systemThemeCleanup = setupSystemThemeListener();
                    }
                }
            } catch (error) {
                console.error('Error getting session:', error);
                // Fallback to localStorage
                const savedTheme = localStorage.getItem('theme') || 'light';
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
        let authSubscription = null;
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
                            setTheme(savedTheme);
                            applyTheme(savedTheme);
                        } else {
                            setTheme('light');
                            applyTheme('light');
                        }
                    }
                });
                authSubscription = subscription;
            } catch (error) {
                console.error('Error setting up auth listener:', error);
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

    const changeTheme = async (newTheme) => {
        // Immediately apply the theme change
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
        
        // Setup system theme listener if auto
        let systemThemeCleanup = null;
        if (newTheme === 'auto') {
            systemThemeCleanup = setupSystemThemeListener();
        }
        
        // Save to user profile if user is logged in - this ensures profile preference overrides everything
        try {
            const { supabase } = await import('../lib/supabaseClient');
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            
            if (user?.id) {
                try {
                    await updateUserProfile(user.id, { theme: newTheme });
                    // After saving, ensure it's applied (in case of any race conditions)
                    applyTheme(newTheme);
                } catch (error) {
                    console.error('Error saving theme to profile:', error);
                }
            }
        } catch (error) {
            console.error('Error getting session:', error);
        }
        
        return systemThemeCleanup;
    };

    // Ensure theme is always applied when state changes
    useEffect(() => {
        applyTheme(theme);
        
        // Setup system listener if theme is auto
        let systemThemeCleanup = null;
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

export const useTheme = () => useContext(ThemeContext);

