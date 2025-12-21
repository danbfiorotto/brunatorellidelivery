import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { User, Mail, Phone, Globe, Moon, Sun, LogOut, Monitor, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useTheme } from '../context/ThemeContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import { formatPhoneNumber, unformatPhoneNumber } from '../lib/utils';
import { useDependencies } from '../hooks/useDependencies';
import { logger } from '../lib/logger';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from '../components/UI/Toast';

interface FormData {
    name: string;
    email: string;
    phone: string;
    language: string;
    currency: string;
    theme: string;
}

const Profile: React.FC = () => {
    const { user, signOut } = useAuth();
    const { language, changeLanguage, t } = useLanguage();
    const { changeCurrency } = useCurrency();
    const { theme, changeTheme } = useTheme();
    const container = useDependencies();
    const profileService = container.resolve('profileService');
    const { handleError } = useErrorHandler();
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(true);
    const [saving, setSaving] = useState<boolean>(false);
    const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: user?.email || '',
        phone: '',
        language: 'pt-BR',
        currency: 'BRL',
        theme: 'light'
    });

    useEffect(() => {
        if (user) {
            loadProfile();
        }
    }, [user?.id]);

    const loadProfile = async (): Promise<void> => {
        if (!user?.id) return;
        
        try {
            setLoading(true);
            const profile = await profileService.getUserProfile(user.id);
            if (profile) {
                setFormData({
                    name: profile.name || '',
                    email: user?.email || '',
                    phone: profile.phone ? formatPhoneNumber(profile.phone) : '',
                    language: profile.language || 'pt-BR',
                    currency: profile.currency || 'BRL',
                    theme: profile.theme || theme || 'light'
                });
            }
        } catch (error) {
            logger.error(error, { context: 'loadProfile' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (!user?.id) {
            showError(t('profile.userNotAuthenticated') || 'Usuário não autenticado');
            return;
        }

        try {
            setSaving(true);
            // Remove phone formatting before saving
            const dataToSave = {
                ...formData,
                phone: unformatPhoneNumber(formData.phone)
            };
            
            logger.debug('Saving profile data', { 
                userId: user.id, 
                hasPhone: !!dataToSave.phone,
                phoneLength: dataToSave.phone?.length || 0
            });
            
            await profileService.updateUserProfile(user.id, dataToSave);
            
            // Update language in context if it changed
            if (dataToSave.language !== language) {
                changeLanguage(dataToSave.language);
            }
            
            // Update currency in context if it changed
            if (dataToSave.currency) {
                changeCurrency(dataToSave.currency);
            }
            
            // Update theme in context if it changed
            if (dataToSave.theme && dataToSave.theme !== theme) {
                changeTheme(dataToSave.theme);
            }
            
            showSuccess(t('profile.settingsSaved') || 'Configurações salvas com sucesso!');
            // Reload profile to show formatted phone
            await loadProfile();
        } catch (error) {
            logger.error(error, { context: 'saveProfile' });
            handleError(error, 'Profile.saveProfile');
        } finally {
            setSaving(false);
        }
    };

    const handleSignOut = async (): Promise<void> => {
        if (isLoggingOut) return; // Prevenir múltiplos cliques
        
        setIsLoggingOut(true);
        try {
            await signOut();
            showSuccess(t('auth.logoutSuccess') || 'Logout realizado com sucesso');
            // Redirecionar após um pequeno delay para permitir que o toast seja exibido
            setTimeout(() => {
                navigate('/login', { replace: true });
            }, 500);
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            showError(
                error instanceof Error ? error.message : (t('auth.logoutError') || 'Erro ao fazer logout. Tente novamente.')
            );
            setIsLoggingOut(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-xl">
                <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('profile.title')}</h2>
                <p className="text-white/90">{t('profile.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                {/* Sidebar / User Info */}
                <div className="space-y-6">
                    <Card className="text-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-sky-400 to-emerald-500 dark:from-sky-500 dark:to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4 shadow-lg">
                            {formData.name.charAt(0)}
                        </div>
                        <h3 className="font-bold text-slate-900 dark:text-white mb-1">{formData.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{formData.email}</p>
                        <Button 
                            variant="secondary" 
                            onClick={handleSignOut}
                            disabled={isLoggingOut}
                            className="w-full flex items-center justify-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700 dark:hover:text-red-300 border-red-200 dark:border-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoggingOut ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    {t('auth.loggingOut') || 'Saindo...'}
                                </>
                            ) : (
                                <>
                                    <LogOut size={18} />
                                    {t('profile.signOut')}
                                </>
                            )}
                        </Button>
                    </Card>
                </div>

                {/* Settings Form */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.personalInfo')}</h3>
                        </div>
                        <form onSubmit={handleSave}>
                            <Input
                                label={t('profile.fullName')}
                                value={formData.name}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input
                                    label={t('profile.email')}
                                    value={formData.email}
                                    disabled
                                />
                                <Input
                                    label={t('profile.phone')}
                                    type="tel"
                                    placeholder="(11) 99999-9999"
                                    maxLength={15}
                                    value={formData.phone}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        const formatted = formatPhoneNumber(e.target.value);
                                        setFormData({ ...formData, phone: formatted });
                                    }}
                                />
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button type="submit" disabled={saving || loading}>
                                    {saving ? t('common.saving') : t('profile.saveChanges')}
                                </Button>
                            </div>
                        </form>
                    </Card>

                    <Card>
                        <div className="mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">{t('profile.preferences')}</h3>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('profile.language')}</label>
                                        <select
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                            value={formData.language}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                                const newLanguage = e.target.value;
                                                setFormData({ ...formData, language: newLanguage });
                                                changeLanguage(newLanguage);
                                            }}
                                        >
                                            <option value="pt-BR">Português (Brasil)</option>
                                            <option value="en-US">English (US)</option>
                                            <option value="es-ES">Español</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">{t('profile.currency')}</label>
                                        <select
                                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                            value={formData.currency}
                                            onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                                        >
                                            <option value="BRL">Real (BRL)</option>
                                            <option value="EUR">Euro (EUR)</option>
                                            <option value="USD">Dólar (USD)</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">{t('profile.theme')}</label>
                                    <select
                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                        value={formData.theme}
                                        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                            const newTheme = e.target.value;
                                            setFormData({ ...formData, theme: newTheme });
                                            changeTheme(newTheme as 'light' | 'dark' | 'auto');
                                        }}
                                    >
                                        <option value="light">{t('profile.lightMode')}</option>
                                        <option value="dark">{t('profile.darkMode')}</option>
                                        <option value="auto">{t('profile.autoMode')}</option>
                                    </select>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                        {formData.theme === 'dark' 
                                            ? t('profile.darkModeDescription')
                                            : formData.theme === 'auto'
                                            ? t('profile.autoModeDescription')
                                            : t('profile.lightModeDescription')
                                        }
                                    </p>
                                </div>
                            </div>
                            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <Button type="submit" disabled={saving || loading}>
                                    {saving ? t('common.saving') : t('profile.savePreferences')}
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Profile;

