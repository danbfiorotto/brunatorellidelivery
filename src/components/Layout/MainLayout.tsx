import React, { useState, ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Building2, BarChart3, User, LogOut, Menu, X, LucideIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../UI/Toast';
import { cn } from '../../lib/utils';
import Logo from '../UI/Logo';

const MainLayout: React.FC = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
    const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
    const { signOut, user } = useAuth();
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const { showError, showSuccess } = useToast();

    const toggleMobileMenu = (): void => setIsMobileMenuOpen(!isMobileMenuOpen);

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
        <div className="flex min-h-screen bg-white dark:bg-gray-900 font-sans text-slate-900 dark:text-white">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-72 fixed h-full z-20 p-4">
                <div className="glass-panel h-full rounded-2xl flex flex-col overflow-hidden dark:bg-gray-800/90 dark:border-gray-700">
                    <div className="p-6 border-b border-slate-100/50 dark:border-gray-700/50 bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-t-2xl">
                        <Logo size="lg" textClassName="text-white" />
                        <p className="text-xs text-white/80 mt-1">Premium Dashboard</p>
                    </div>

                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar dark:scrollbar-thumb-gray-600">
                        <NavItem to="/" icon={<LayoutDashboard size={20} />} label={t('nav.dashboard')} />
                        <NavItem to="/appointments" icon={<Calendar size={20} />} label={t('nav.appointments')} />
                        <NavItem to="/reports" icon={<BarChart3 size={20} />} label={t('nav.reports')} />
                        <NavItem to="/clinics" icon={<Building2 size={20} />} label={t('nav.clinics')} />
                        <NavItem to="/patients" icon={<Users size={20} />} label={t('nav.patients')} />
                    </nav>

                    <div className="p-4 border-t border-slate-100/50 dark:border-gray-700/50">
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 dark:bg-gray-700/50 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-emerald-500 dark:from-sky-500 dark:to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                                {user?.email?.[0].toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{user?.email}</p>
                                <p className="text-xs text-slate-400 dark:text-gray-400">Administrador</p>
                            </div>
                        </div>
                        <NavLink
                            to="/profile"
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg transition-colors mb-2"
                        >
                            <User size={18} />
                            {t('nav.profile')}
                        </NavLink>
                        <button
                            onClick={handleSignOut}
                            disabled={isLoggingOut}
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-30 p-2 sm:p-3">
                <div className="glass-panel rounded-xl p-2 sm:p-3 flex items-center justify-between bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 dark:bg-gray-800/90 dark:border-gray-700">
                    <Logo size="sm" textClassName="text-white text-sm sm:text-base md:text-lg" />
                    <button onClick={toggleMobileMenu} className="p-2 min-h-[44px] min-w-[44px] text-white flex items-center justify-center" aria-label="Menu">
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 z-20 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm lg:hidden pt-24 px-4 pb-4"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <div className="glass-panel dark:bg-gray-800/90 dark:border-gray-700 rounded-2xl p-4 space-y-2" onClick={e => e.stopPropagation()}>
                            <NavItem to="/" icon={<LayoutDashboard size={20} />} label={t('nav.dashboard')} onClick={toggleMobileMenu} />
                            <NavItem to="/appointments" icon={<Calendar size={20} />} label={t('nav.appointments')} onClick={toggleMobileMenu} />
                            <NavItem to="/reports" icon={<BarChart3 size={20} />} label={t('nav.reports')} onClick={toggleMobileMenu} />
                            <NavItem to="/clinics" icon={<Building2 size={20} />} label={t('nav.clinics')} onClick={toggleMobileMenu} />
                            <NavItem to="/patients" icon={<Users size={20} />} label={t('nav.patients')} onClick={toggleMobileMenu} />
                            <div className="h-px bg-slate-100 dark:bg-gray-700 my-2"></div>
                            <NavLink
                                to="/profile"
                                onClick={toggleMobileMenu}
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700 rounded-xl transition-colors"
                            >
                                <User size={20} />
                                {t('nav.profile')}
                            </NavLink>
                            <button
                                onClick={handleSignOut}
                                disabled={isLoggingOut}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoggingOut ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        {t('auth.loggingOut') || 'Saindo...'}
                                    </>
                                ) : (
                                    <>
                                        <LogOut size={20} />
                                        {t('profile.signOut')}
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 lg:ml-72 p-3 sm:p-4 lg:p-8 pt-16 sm:pt-20 lg:pt-8 min-h-screen transition-all duration-300 pb-20 sm:pb-24 lg:pb-8">
                <div className="max-w-7xl mx-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.2 }}
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* Bottom Navigation - Mobile First */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white dark:bg-gray-800 border-t border-slate-200 dark:border-gray-700 shadow-lg safe-area-inset-bottom">
                <div className="flex items-center justify-around px-1 sm:px-2 py-1.5 sm:py-2">
                    <BottomNavItem to="/" icon={<LayoutDashboard size={20} />} label={t('nav.dashboard')} />
                    <BottomNavItem to="/appointments" icon={<Calendar size={20} />} label={t('nav.appointments')} />
                    <BottomNavItem to="/reports" icon={<BarChart3 size={20} />} label={t('nav.reports')} />
                    <BottomNavItem to="/clinics" icon={<Building2 size={20} />} label={t('nav.clinics')} />
                    <BottomNavItem to="/patients" icon={<Users size={20} />} label={t('nav.patients')} />
                    <BottomNavItem to="/profile" icon={<User size={20} />} label={t('nav.profile')} />
                </div>
            </nav>
        </div>
    );
};

interface NavItemProps {
    to: string;
    icon: ReactNode;
    label: string;
    badge?: string | number;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, badge, onClick }) => (
    <NavLink
        to={to}
        onClick={onClick}
        className={({ isActive }) =>
            cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive
                    ? "bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 text-white shadow-lg shadow-sky-500/20"
                    : "text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-sky-600 dark:hover:text-sky-400"
            )
        }
    >
        <span className="relative z-10">{icon}</span>
        <span className="relative z-10 font-medium">{label}</span>
        {badge && (
            <span className="ml-auto relative z-10 text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">
                {badge}
            </span>
        )}
    </NavLink>
);

interface BottomNavItemProps {
    to: string;
    icon: ReactNode;
    label: string;
}

const BottomNavItem: React.FC<BottomNavItemProps> = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            cn(
                "flex flex-col items-center justify-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-1.5 sm:py-2 rounded-xl transition-all duration-200 min-w-[44px] min-h-[60px] sm:min-w-[60px]",
                isActive
                    ? "text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30"
                    : "text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
            )
        }
    >
        <span className="text-base sm:text-lg md:text-xl">{icon}</span>
        <span className="text-[9px] sm:text-[10px] font-medium leading-tight text-center">{label}</span>
    </NavLink>
);

export default MainLayout;

