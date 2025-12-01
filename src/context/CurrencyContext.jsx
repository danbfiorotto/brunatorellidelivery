import React, { createContext, useState, useEffect, useContext } from 'react';
import { getUserProfile } from '../services/api';

const CurrencyContext = createContext();

export const CurrencyProvider = ({ children }) => {
    const [currency, setCurrency] = useState(() => {
        // Try to get from localStorage first
        const savedCurrency = localStorage.getItem('currency');
        return savedCurrency || 'BRL';
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadCurrency = async () => {
            // Try to get user from auth state
            try {
                const { supabase } = await import('../lib/supabaseClient');
                const { data: { session } } = await supabase.auth.getSession();
                const user = session?.user;
                
                if (user?.id) {
                    try {
                        const profile = await getUserProfile(user.id);
                        if (profile?.currency) {
                            setCurrency(profile.currency);
                            localStorage.setItem('currency', profile.currency);
                        }
                    } catch (error) {
                        console.error('Error loading currency:', error);
                    }
                }
            } catch (error) {
                console.error('Error getting session:', error);
            }
            setLoading(false);
        };

        loadCurrency();
    }, []);

    const changeCurrency = (newCurrency) => {
        setCurrency(newCurrency);
        localStorage.setItem('currency', newCurrency);
    };

    return (
        <CurrencyContext.Provider value={{ currency, changeCurrency, loading }}>
            {!loading && children}
        </CurrencyContext.Provider>
    );
};

export const useCurrency = () => useContext(CurrencyContext);

