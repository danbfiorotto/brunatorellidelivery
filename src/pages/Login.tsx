import React, { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Activity, ArrowRight } from 'lucide-react';
import Button from '../components/UI/Button';
import { logAction } from '../lib/audit';
import Logo from '../components/UI/Logo';

const Login: React.FC = () => {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const { signIn } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await signIn(email, password);
            // Log successful login
            await logAction('login', 'auth', null, null, { email });
            navigate('/');
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
            setError(errorMessage);
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
                        Transforme a gestão do seu consultório.
                    </h1>
                    <p className="text-lg text-sky-100 max-w-md">
                        Organize agendamentos, pacientes e relatórios em um único lugar com nossa plataforma premium.
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

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-sky-100/50 dark:from-sky-900/30 via-transparent to-transparent"></div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md space-y-8 relative z-10"
                >
                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Bem-vindo de volta</h2>
                        <p className="text-slate-500 dark:text-gray-400 mt-2">Por favor, insira seus dados para entrar.</p>
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
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1.5">Senha</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded border-slate-300 text-sky-600 focus:ring-sky-500" />
                                <span className="text-slate-600 dark:text-gray-400">Lembrar de mim</span>
                            </label>
                            <a href="#" className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium">Esqueceu a senha?</a>
                        </div>

                        <Button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 text-lg group"
                        >
                            {loading ? 'Entrando...' : (
                                <>
                                    Entrar na Plataforma
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-sm text-slate-500 dark:text-gray-400">
                        Não tem uma conta?{' '}
                        <Link 
                            to="/register" 
                            className="text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium"
                        >
                            Criar conta
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;

