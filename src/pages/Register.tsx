import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, UserPlus } from 'lucide-react';
import Button from '../components/UI/Button';
import { logAction } from '../lib/audit';
import { useToast } from '../components/UI/Toast';
import Logo from '../components/UI/Logo';

const Register: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const { signUp } = useAuth();
    const navigate = useNavigate();
    const { showSuccess, showError } = useToast();

    const validateForm = (): boolean => {
        if (!email || !password || !confirmPassword) {
            setError('Por favor, preencha todos os campos.');
            return false;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return false;
        }

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Por favor, insira um e-mail válido.');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setError('');
        
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            await signUp(email, password);
            
            // ✅ Perfil é criado automaticamente pelo trigger SQL no banco de dados
            // Não é necessário criar manualmente aqui
            
            // Log successful registration
            await logAction('register', 'auth', null, null, { email });
            showSuccess('Conta criada com sucesso! Você pode fazer login agora.');
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conta. Tente novamente.';
            setError(errorMessage);
            showError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50 dark:bg-gray-900">
            {/* Left Side - Hero Section */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-sky-600 to-blue-800 relative overflow-hidden text-white p-12 flex-col justify-between">
                <div className="absolute top-0 left-0 w-full h-full">
                    <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-10 right-10 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl"></div>
                </div>

                <div className="relative z-10">
                    <Logo size="lg" textClassName="text-white text-2xl" />
                    <p className="text-sky-100 mt-2">Gestão inteligente para sua clínica.</p>
                </div>

                <div className="relative z-10 space-y-6">
                    <h1 className="text-5xl font-bold leading-tight">
                        Comece sua jornada hoje.
                    </h1>
                    <p className="text-lg text-sky-100 max-w-md">
                        Crie sua conta e transforme a gestão do seu consultório com nossa plataforma premium.
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-4 text-sm text-sky-200">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>Monitoramento em tempo real</span>
                    </div>
                    <div className="w-1 h-1 bg-sky-400 rounded-full"></div>
                    <span>Segurança de dados</span>
                </div>
            </div>

            {/* Right Side - Register Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-100/50 dark:from-sky-900/30 via-transparent to-transparent"></div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md space-y-8 relative z-10"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Criar Conta</h2>
                        <p className="text-slate-500 dark:text-gray-400 mt-2">Preencha os dados abaixo para criar sua conta.</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm border border-red-100 dark:border-red-800 flex items-center gap-2"
                        >
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">E-mail</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Senha</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                />
                                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">Mínimo de 6 caracteres</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Confirmar Senha</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 text-lg group"
                        >
                            {loading ? 'Criando conta...' : (
                                <>
                                    Criar Conta
                                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-slate-500 dark:text-gray-400">
                        Já tem uma conta?{' '}
                        <Link 
                            to="/login" 
                            className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
                        >
                            Fazer login
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Register;

