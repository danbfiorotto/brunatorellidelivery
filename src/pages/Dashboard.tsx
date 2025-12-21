import React, { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { DollarSign, Building2, TrendingUp, Calendar, ArrowUpRight, Download, Plus } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import Button from '../components/UI/Button';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { cn, formatCurrency } from '../lib/utils';
import { logger } from '../lib/logger';
import { sanitizeText } from '../lib/sanitize';
import { useDependencies } from '../hooks/useDependencies';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from '../components/UI/Toast';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

interface DashboardStats {
    revenue: number;
    pending: number;
    appointments: number;
    clinics: number;
}

interface ClinicRanking {
    id: string;
    name: string;
    revenue: number;
    appointments: number;
    ticket: number;
}

interface WeeklyData {
    label: string;
    finished: number;
    pending: number;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { currency } = useCurrency();
    const container = useDependencies();
    const dashboardService = container.resolve('dashboardService');
    const { handleError } = useErrorHandler();
    const [stats, setStats] = useState<DashboardStats>({
        revenue: 0,
        pending: 0,
        appointments: 0,
        clinics: 0
    });
    const [clinicRanking, setClinicRanking] = useState<ClinicRanking[]>([]);
    const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const abortController = new AbortController();
        
        const loadData = async (): Promise<void> => {
            if (abortController.signal.aborted) return;
            
            try {
                setLoading(true);
                const { stats: statsData, ranking: rankingData, weeklyData } = await dashboardService.getAllDashboardData();
                
                console.log('Dashboard - Data received', {
                    stats: statsData,
                    ranking: rankingData,
                    weeklyData
                });
                
                if (abortController.signal.aborted) return;
                
                setStats(statsData);
                setClinicRanking(rankingData);
                setWeeklyData(weeklyData);
            } catch (error) {
                if (abortController.signal.aborted) return;
                logger.error(error, { context: 'loadDashboardData' });
                handleError(error, 'Dashboard.loadDashboardData');
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        
        loadData();
        
        return () => {
            abortController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleExportDashboard = (): void => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Relatório do Dashboard', 20, 20);
        doc.setFontSize(12);
        doc.text(`Faturamento: ${formatCurrency(stats.revenue, currency)}`, 20, 35);
        doc.text(`Pendente: ${formatCurrency(stats.pending, currency)}`, 20, 45);
        doc.text(`Total de Atendimentos: ${stats.appointments}`, 20, 55);
        doc.text(`Clínicas Cadastradas: ${stats.clinics}`, 20, 65);
        doc.text(`Ticket Médio: ${formatCurrency(stats.appointments > 0 ? (stats.revenue / stats.appointments) : 0, currency)}`, 20, 75);
        
        let y = 90;
        doc.text('Top 5 Clínicas:', 20, y);
        y += 10;
        clinicRanking.slice(0, 5).forEach((clinic, i) => {
            doc.text(`${i + 1}. ${clinic.name} - ${formatCurrency(clinic.revenue, currency)}`, 25, y);
            y += 8;
        });
        
        doc.save(`dashboard-${new Date().toISOString().split('T')[0]}.pdf`);
    };


    const chartData = {
        labels: weeklyData.map(d => d.label),
        datasets: [
            {
                label: t('dashboard.finished'),
                data: weeklyData.map(d => d.finished),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                hoverBackgroundColor: 'rgba(5, 150, 105, 1)',
                borderRadius: 8,
                borderSkipped: false,
            },
            {
                label: t('dashboard.pending'),
                data: weeklyData.map(d => d.pending),
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                hoverBackgroundColor: 'rgba(217, 119, 6, 1)',
                borderRadius: 8,
                borderSkipped: false,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { 
                display: true,
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        size: 12,
                        weight: '600' as const
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context: any) => ` ${context.parsed.y} atendimentos`
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    color: '#f1f5f9',
                    drawBorder: false,
                },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('dashboard.title')}</h2>
                        <p className="text-white/90">{t('dashboard.subtitle')}</p>
                    </div>
                    <div className="flex gap-3">
                        <Button 
                            variant="secondary" 
                            className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                            onClick={handleExportDashboard}
                        >
                            <Download size={18} />
                            {t('dashboard.export')}
                        </Button>
                        <Button 
                            className="gap-2 bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
                            onClick={() => navigate('/appointments')}
                        >
                            <Plus size={18} />
                            {t('dashboard.newAppointment')}
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/30 dark:to-emerald-800/30 border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-1">{t('dashboard.monthlyRevenue')}</p>
                            <h3 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100 mb-1">
                                {formatCurrency(stats.revenue, currency)}
                            </h3>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-200 dark:bg-emerald-800/50 px-2 py-0.5 rounded-full">
                                    {t('dashboard.received')}: {formatCurrency(stats.revenue, currency)}
                                </span>
                            </div>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                                {t('dashboard.pending')}: {formatCurrency(stats.pending, currency)}
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-200 dark:bg-emerald-800/50 rounded-xl">
                            <DollarSign className="text-emerald-700 dark:text-emerald-300" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-900/30 dark:to-sky-800/30 border-sky-200 dark:border-sky-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-sky-700 dark:text-sky-300 mb-1">{t('dashboard.appointments')}</p>
                            <h3 className="text-3xl font-bold text-sky-900 dark:text-sky-100 mb-1">{stats.appointments}</h3>
                            <p className="text-xs text-sky-600 dark:text-sky-400 mt-2">{t('dashboard.totalProcedures')}</p>
                        </div>
                        <div className="p-3 bg-sky-200 dark:bg-sky-800/50 rounded-xl">
                            <Calendar className="text-sky-700 dark:text-sky-300" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/30 dark:to-violet-800/30 border-violet-200 dark:border-violet-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 mb-1">{t('dashboard.clinics')}</p>
                            <h3 className="text-3xl font-bold text-violet-900 dark:text-violet-100 mb-1">{stats.clinics}</h3>
                            <p className="text-xs text-violet-600 dark:text-violet-400 mt-2">{t('dashboard.activePartners')}</p>
                        </div>
                        <div className="p-3 bg-violet-200 dark:bg-violet-800/50 rounded-xl">
                            <Building2 className="text-violet-700 dark:text-violet-300" size={24} />
                        </div>
                    </div>
                </Card>

                <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-200 dark:border-amber-800">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">{t('dashboard.averageTicket')}</p>
                            <h3 className="text-3xl font-bold text-amber-900 dark:text-amber-100 mb-1">
                                {formatCurrency(stats.appointments > 0 ? (stats.revenue / stats.appointments) : 0, currency)}
                            </h3>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">{t('dashboard.perAppointment')}</p>
                        </div>
                        <div className="p-3 bg-amber-200 dark:bg-amber-800/50 rounded-xl">
                            <TrendingUp className="text-amber-700 dark:text-amber-300" size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-2">
                    <Card className="h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('dashboard.weeklyProductivity')}</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">{t('dashboard.finishedVsPending')}</p>
                            </div>
                            <select className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500">
                                <option>Últimos 7 dias</option>
                                <option>Este mês</option>
                            </select>
                        </div>
                        <div className="h-64 sm:h-80 w-full">
                            <Bar data={chartData} options={chartOptions} />
                        </div>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t('dashboard.clinicRanking')}</h3>
                                <p className="text-sm text-slate-500 dark:text-gray-400">{t('dashboard.byRevenue')}</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                className="text-xs px-3 py-1.5 h-auto"
                                onClick={() => navigate('/clinics')}
                            >
                                {t('dashboard.viewAll')}
                            </Button>
                        </div>
                        <div className="space-y-3">
                            {clinicRanking.length === 0 && !loading && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">Nenhuma clínica com atendimentos ainda.</p>
                            )}
                            {loading && (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-4">Carregando...</p>
                            )}
                            {clinicRanking.slice(0, 5).map((clinic, i) => {
                                const totalRevenue = clinicRanking.reduce((sum, c) => sum + c.revenue, 0);
                                const percentage = totalRevenue > 0 ? Math.round((clinic.revenue / totalRevenue) * 100) : 0;
                                return (
                                    <div key={clinic.id || i} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors group cursor-pointer border border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-10 h-10 flex items-center justify-center bg-gradient-to-br from-sky-100 to-emerald-100 rounded-full font-bold text-sky-700 shadow-sm flex-shrink-0">
                                                {i + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">{sanitizeText(clinic.name)}</p>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <p className="text-xs text-slate-500 dark:text-gray-400">{clinic.appointments} atendimentos</p>
                                                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                                        {percentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="font-bold text-slate-900 dark:text-white">{formatCurrency(clinic.revenue, currency)}</p>
                                            <p className="text-xs text-slate-500 dark:text-gray-400">Ticket: {formatCurrency(clinic.ticket, currency)}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
};

export default Dashboard;

