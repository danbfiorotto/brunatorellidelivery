import React, { useState, useEffect, useRef, ChangeEvent } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Download, Calendar, Filter } from 'lucide-react';
import jsPDF from 'jspdf';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import DateInput from '../components/UI/DateInput';
import { useLanguage } from '../context/LanguageContext';
import { useDependencies } from '../hooks/useDependencies';
import { useCurrency } from '../context/CurrencyContext';
import { calculateReceivedValue, formatDate, formatCurrency } from '../lib/utils';
import { logger } from '../lib/logger';
import { sanitizeText } from '../lib/sanitize';
import { useToast } from '../components/UI/Toast';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

type PeriodType = 'month' | 'last_month' | 'custom';

interface AppointmentData {
    id: string;
    date: string;
    payment_date?: string | null;
    status: 'paid' | 'pending' | 'scheduled';
    value: string | number;
    currency?: string;
    payment_type?: string;
    payment_percentage?: number | null;
    patients?: {
        name?: string;
    } | null;
    clinics?: {
        id?: string;
        name?: string;
    } | null;
}

interface ClinicStat {
    id: string;
    name: string;
    revenue: number;
    appointments: number;
    paid: number;
    ticket: number;
}

interface Stats {
    totalRevenue: number;
    ticketMedio: number;
    totalAppointments: number;
    revenueByAppointment: number;
    revenueByPayment: number;
}

interface PeriodOption {
    value: PeriodType;
    label: string;
}

interface BarChartData {
    labels: string[];
    received: number[];
    pending: number[];
}

interface MonthMap {
    [key: string]: {
        received: number;
        pending: number;
    };
}

const Reports: React.FC = () => {
    const { t } = useLanguage();
    const { currency } = useCurrency();
    const container = useDependencies();
    const reportsService = container.resolve('reportsService');
    const { showWarning } = useToast();
    const [period, setPeriod] = useState<PeriodType>('month');
    const [isCustomPeriodOpen, setIsCustomPeriodOpen] = useState<boolean>(false);
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');
    const [reportsData, setReportsData] = useState<AppointmentData[]>([]);
    const [clinicStats, setClinicStats] = useState<ClinicStat[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [periodDropdownOpen, setPeriodDropdownOpen] = useState<boolean>(false);
    // ✅ Usar useRef para rastrear requisições em andamento sem bloquear o estado
    const isLoadingRef = useRef<boolean>(false);
    const [stats, setStats] = useState<Stats>({
        totalRevenue: 0,
        ticketMedio: 0,
        totalAppointments: 0,
        revenueByAppointment: 0,
        revenueByPayment: 0
    });

    const periodOptions: PeriodOption[] = [
        { value: 'month', label: t('reports.currentMonth') },
        { value: 'last_month', label: t('reports.lastMonth') },
        { value: 'custom', label: t('reports.customPeriod') }
    ];

    const getPeriodLabel = (): string => {
        return periodOptions.find(opt => opt.value === period)?.label || t('reports.currentMonth');
    };

    useEffect(() => {
        // ✅ Usar AbortController para cancelar requisições pendentes e evitar race conditions
        const abortController = new AbortController();
        let isMounted = true;

        const loadData = async () => {
            if (period !== 'custom' || (customStartDate && customEndDate)) {
                try {
                    await loadReportsData();
                } catch (error) {
                    if (!abortController.signal.aborted && isMounted) {
                        logger.error(error, { context: 'Reports useEffect' });
                    }
                }
            }
        };

        loadData();

        return () => {
            isMounted = false;
            abortController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [period, customStartDate, customEndDate]);

    const loadReportsData = async (): Promise<void> => {
        // ✅ Usar ref para evitar múltiplas chamadas simultâneas sem bloquear o estado
        if (isLoadingRef.current) {
            logger.debug('Reports - loadReportsData already in progress, skipping');
            return;
        }

        try {
            isLoadingRef.current = true;
            setLoading(true);
            const now = new Date();
            let startDate: string;
            let endDate: string;

            if (period === 'custom' && customStartDate && customEndDate) {
                startDate = customStartDate;
                endDate = customEndDate;
            } else if (period === 'month') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                endDate = now.toISOString().split('T')[0];
            } else if (period === 'last_month') {
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
                startDate = lastMonth.toISOString().split('T')[0];
                endDate = lastMonthEnd.toISOString().split('T')[0];
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                endDate = now.toISOString().split('T')[0];
            }

            const appointments = await reportsService.getReportsData(startDate, endDate);

            logger.debug('Reports - Appointments received', {
                count: appointments.length,
                firstAppointment: appointments[0] ? {
                    id: appointments[0].id,
                    date: appointments[0].date,
                    hasValue: !!appointments[0].value,
                    hasPatients: !!(appointments[0] as any).patients,
                    hasClinics: !!(appointments[0] as any).clinics
                } : null
            });

            // ✅ Converter entidades Appointment para AppointmentData
            const data: AppointmentData[] = appointments.map((appointment: any) => {
                // Formatar data no formato YYYY-MM-DD
                const formatDateToISO = (date: Date): string => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                return {
                    id: appointment.id,
                    date: formatDateToISO(appointment.date),
                    payment_date: appointment.paymentDate ? formatDateToISO(appointment.paymentDate) : null,
                    status: appointment.status.toString() as 'paid' | 'pending' | 'scheduled',
                    value: appointment.value.amount,
                    currency: appointment.value.currency,
                    payment_type: appointment.paymentType.type,
                    payment_percentage: appointment.paymentType.percentage,
                    patients: appointment.patients ? { name: appointment.patients.name } : null,
                    clinics: appointment.clinics ? { id: appointment.clinics.id, name: appointment.clinics.name } : null
                };
            });

            // ✅ Filtrar dados por data do atendimento
            const filteredData: AppointmentData[] = data.filter(a => a.date >= startDate && a.date <= endDate);

            const paidAppointments = filteredData.filter(a => a.status === 'paid');
            const totalRevenue = paidAppointments.reduce((sum, a) => sum + calculateReceivedValue(a), 0);
            const totalAppointments = filteredData.length;
            const ticketMedio = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;

            setStats({
                totalRevenue,
                ticketMedio,
                totalAppointments,
                revenueByAppointment: totalRevenue,
                revenueByPayment: totalRevenue
            });
            
            const clinicMap: Record<string, ClinicStat> = {};
            filteredData.forEach(apt => {
                const clinicId = apt.clinics?.id || 'no-clinic';
                const clinicName = apt.clinics?.name || 'Sem clínica';
                
                if (!clinicMap[clinicId]) {
                    clinicMap[clinicId] = {
                        id: clinicId,
                        name: clinicName,
                        revenue: 0,
                        appointments: 0,
                        paid: 0,
                        ticket: 0
                    };
                }
                
                clinicMap[clinicId].appointments++;
                if (apt.status === 'paid') {
                    clinicMap[clinicId].revenue += calculateReceivedValue(apt);
                    clinicMap[clinicId].paid++;
                }
            });
            
            const calculatedClinicStats = Object.values(clinicMap)
                .map(clinic => ({
                    ...clinic,
                    ticket: clinic.paid > 0 ? clinic.revenue / clinic.paid : 0
                }))
                .sort((a, b) => b.revenue - a.revenue);
            
            setClinicStats(calculatedClinicStats);
            setReportsData(filteredData);
        } catch (error) {
            logger.error(error, { context: 'loadReportsData' });
        } finally {
            isLoadingRef.current = false;
            setLoading(false);
        }
    };

    const getBarData = (): BarChartData => {
        const monthMap: MonthMap = {};
        reportsData.forEach(apt => {
            const dateString = apt.date;
            const dateParts = dateString.split('-');
            if (dateParts.length === 3) {
                const year = parseInt(dateParts[0], 10);
                const monthNum = parseInt(dateParts[1], 10) - 1;
                const day = parseInt(dateParts[2], 10);
                const dateToUse = new Date(year, monthNum, day);
                const month = dateToUse.toLocaleDateString('pt-BR', { month: 'short' });
                
                if (!monthMap[month]) {
                    monthMap[month] = { received: 0, pending: 0 };
                }
                
                if (apt.status === 'paid') {
                    monthMap[month].received += calculateReceivedValue(apt);
                } else if (apt.status === 'pending' || apt.status === 'scheduled') {
                    const totalValue = parseFloat(String(apt.value || 0));
                    monthMap[month].pending += totalValue;
                }
            }
        });

        const months = Object.keys(monthMap);
        return {
            labels: months,
            received: months.map(month => monthMap[month].received),
            pending: months.map(month => monthMap[month].pending)
        };
    };

    const barChartData = getBarData();

    const barData = {
        labels: barChartData.labels,
        datasets: [
            {
                label: 'Recebido',
                data: barChartData.received,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                hoverBackgroundColor: 'rgba(5, 150, 105, 1)',
                borderRadius: 8,
            },
            {
                label: 'Pendente',
                data: barChartData.pending,
                backgroundColor: 'rgba(245, 158, 11, 0.8)',
                hoverBackgroundColor: 'rgba(217, 119, 6, 1)',
                borderRadius: 8,
            },
        ],
    };

    const totalRevenue = clinicStats.reduce((sum, c) => sum + c.revenue, 0);
    const pieData = {
        labels: clinicStats.map(c => c.name),
        datasets: [
            {
                data: clinicStats.map(c => totalRevenue > 0 ? Math.round((c.revenue / totalRevenue) * 100) : 0),
                backgroundColor: [
                    'rgba(14, 165, 233, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(236, 72, 153, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                ],
                borderColor: [
                    'rgba(14, 165, 233, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(236, 72, 153, 1)',
                    'rgba(59, 130, 246, 1)',
                ],
                borderWidth: 2,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 12, weight: '600' as const }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: '#e2e8f0',
                borderWidth: 1,
                padding: 12,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#f1f5f9', drawBorder: false },
                ticks: { color: '#94a3b8' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#94a3b8' }
            }
        }
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right' as const,
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: { size: 12, weight: '600' as const }
                }
            },
            tooltip: {
                callbacks: {
                    label: function(context: any) {
                        const label = context.label || '';
                        const percentage = context.parsed || 0;
                        const clinicIndex = context.dataIndex;
                        const clinic = clinicStats[clinicIndex];
                        const revenueValue = clinic ? clinic.revenue : 0;
                        return `${label}: ${percentage}% (${formatCurrency(revenueValue, currency)})`;
                    }
                }
            }
        }
    };

    const handleExportPDF = (): void => {
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text('Relatório Financeiro', 20, 20);
        doc.setFontSize(12);
        
        let periodLabel = '';
        if (period === '7days') periodLabel = 'Últimos 7 dias';
        else if (period === 'month') periodLabel = 'Mês atual';
        else if (period === 'last_month') periodLabel = 'Mês anterior';
        else if (period === 'custom') periodLabel = `De ${customStartDate} até ${customEndDate}`;
        
        doc.text(`Período: ${periodLabel}`, 20, 35);
        doc.text(`Total Faturado: ${formatCurrency(stats.totalRevenue, currency)}`, 20, 45);
        doc.text(`Ticket Médio: ${formatCurrency(stats.ticketMedio, currency)}`, 20, 55);
        doc.text(`Total de Atendimentos: ${stats.totalAppointments}`, 20, 65);
        
        let y = 80;
        doc.text('Distribuição por Clínica:', 20, y);
        y += 10;
        clinicStats.forEach((clinic, i) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const percentage = stats.totalRevenue > 0 ? Math.round((clinic.revenue / stats.totalRevenue) * 100) : 0;
            doc.text(`${i + 1}. ${clinic.name}: ${percentage}% - ${formatCurrency(clinic.revenue, currency)}`, 25, y);
            y += 8;
        });
        
        y += 5;
        if (y > 270) {
            doc.addPage();
            y = 20;
        }
        doc.text('Todos os Atendimentos:', 20, y);
        y += 10;
        reportsData.forEach((apt) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.text(`${formatDate(apt.date)} - ${apt.patients?.name || 'Sem paciente'} - ${formatCurrency(parseFloat(String(apt.value)), apt.currency || currency)}`, 25, y);
            y += 8;
        });
        
        const fileName = `relatorio-${periodLabel.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-white mb-6 sm:mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{t('reports.title')}</h2>
                        <p className="text-sm sm:text-base text-white/90">{t('reports.subtitle')}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={() => {
                                    setPeriodDropdownOpen(!periodDropdownOpen);
                                }}
                                className="w-full sm:w-auto pl-10 pr-10 py-2.5 sm:py-3 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-white/50 hover:bg-white/30 transition-colors flex items-center gap-2 min-w-[200px] min-h-[44px] text-sm sm:text-base"
                            >
                                <Filter className="absolute left-3 text-white/80" size={18} />
                                <span className="flex-1 text-left truncate">{getPeriodLabel()}</span>
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            {periodDropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setPeriodDropdownOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                        {periodOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => {
                                                    if (option.value === 'custom') {
                                                        setIsCustomPeriodOpen(true);
                                                        setPeriodDropdownOpen(false);
                                                    } else {
                                                        setPeriod(option.value);
                                                        setPeriodDropdownOpen(false);
                                                    }
                                                }}
                                                className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                                                    period === option.value
                                                        ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 font-medium'
                                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        <Button 
                            onClick={handleExportPDF} 
                            className="bg-white text-sky-600 hover:bg-gray-50 shadow-lg gap-2 w-full sm:w-auto text-sm sm:text-base"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Exportar PDF</span>
                            <span className="sm:hidden">Exportar</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200 p-4 sm:p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-emerald-700 mb-1">
                                📅 Serviços Prestados
                            </p>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-emerald-900 mb-1 break-words">
                                {formatCurrency(stats.totalRevenue, currency)}
                            </p>
                            {loading && <p className="text-[10px] sm:text-xs text-emerald-600 mt-2">Carregando...</p>}
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200 p-4 sm:p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-sky-700 mb-1">Ticket Médio</p>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-sky-900 mb-1 break-words">
                                {formatCurrency(stats.ticketMedio, currency)}
                            </p>
                            <p className="text-[10px] sm:text-xs text-sky-600 mt-2">Por atendimento</p>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-violet-50 to-violet-100/50 border-violet-200 p-4 sm:p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-violet-700 mb-1">Total Atendimentos</p>
                            <p className="text-xl sm:text-2xl md:text-3xl font-bold text-violet-900 mb-1">{stats.totalAppointments}</p>
                            {loading && <p className="text-[10px] sm:text-xs text-violet-600 mt-2">Carregando...</p>}
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="p-4 sm:p-6">
                    <div className="mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">Recebido vs. Pendente</h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Comparativo de valores no período</p>
                    </div>
                    <div className="h-48 sm:h-64 md:h-80">
                        <Bar data={barData} options={chartOptions} />
                    </div>
                </Card>
                <Card className="p-4 sm:p-6">
                    <div className="mb-3 sm:mb-4">
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">Distribuição por Clínica</h3>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Percentual e valores faturados</p>
                    </div>
                    <div className="h-48 sm:h-64 md:h-80">
                        <Pie data={pieData} options={pieOptions} />
                    </div>
                </Card>
            </div>

            <Card className="p-4 sm:p-6">
                <div className="mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1">Atendimentos do Período</h3>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400">Todos os atendimentos do período selecionado ({reportsData.length} {reportsData.length === 1 ? 'atendimento' : 'atendimentos'})</p>
                </div>
                <div className="overflow-x-auto -mx-2 sm:mx-0">
                    <table className="w-full text-left min-w-[640px] sm:min-w-0">
                        <thead>
                            <tr className="border-b border-gray-100 dark:border-gray-700">
                                <th className="pb-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-gray-200 text-xs sm:text-sm">Data</th>
                                <th className="pb-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-gray-200 text-xs sm:text-sm">Paciente</th>
                                <th className="pb-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-gray-200 text-xs sm:text-sm">Clínica</th>
                                <th className="pb-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-gray-200 text-xs sm:text-sm">Status</th>
                                <th className="pb-3 px-3 sm:px-4 font-semibold text-slate-700 dark:text-gray-200 text-right text-xs sm:text-sm">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">Carregando...</td>
                                </tr>
                            ) : reportsData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500 dark:text-gray-400">{t('reports.noAppointments')}</td>
                                </tr>
                            ) : (
                                reportsData.map((appointment) => (
                                    <tr key={appointment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        <td className="py-3 px-3 sm:px-4 text-slate-600 dark:text-gray-300 text-xs sm:text-sm">{formatDate(appointment.date)}</td>
                                        <td className="py-3 px-3 sm:px-4 font-medium text-slate-900 dark:text-white text-xs sm:text-sm">{sanitizeText(appointment.patients?.name) || 'Sem paciente'}</td>
                                        <td className="py-3 px-3 sm:px-4 text-slate-600 dark:text-gray-300 text-xs sm:text-sm">{sanitizeText(appointment.clinics?.name) || 'Sem clínica'}</td>
                                        <td className="py-3 px-3 sm:px-4">
                                            {appointment.status === 'paid' && <Badge variant="success">Pago</Badge>}
                                            {appointment.status === 'pending' && <Badge variant="warning">Pendente</Badge>}
                                            {appointment.status === 'scheduled' && <Badge variant="primary">Agendado</Badge>}
                                        </td>
                                        <td className="py-3 px-3 sm:px-4 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-semibold text-slate-900 dark:text-white">
                                                    {formatCurrency(parseFloat(String(appointment.value)), appointment.currency || currency)}
                                                </span>
                                                {appointment.payment_type === 'percentage' && appointment.payment_percentage && (
                                                    <span className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                                        Recebido: {formatCurrency(calculateReceivedValue(appointment), appointment.currency || currency)} ({appointment.payment_percentage}%)
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isCustomPeriodOpen}
                onClose={() => setIsCustomPeriodOpen(false)}
                title="Período Personalizado"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <DateInput
                            label="Data Inicial"
                            value={customStartDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomStartDate(e.target.value)}
                        />
                        <DateInput
                            label={t('reports.endDate')}
                            value={customEndDate}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setCustomEndDate(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const today = new Date();
                                const twoMonthsAgo = new Date(today);
                                twoMonthsAgo.setMonth(today.getMonth() - 2);
                                setCustomStartDate(twoMonthsAgo.toISOString().split('T')[0]);
                                setCustomEndDate(today.toISOString().split('T')[0]);
                            }}
                            className="text-sm w-full sm:w-auto"
                        >
                            2 meses atrás
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const today = new Date();
                                const threeMonthsAgo = new Date(today);
                                threeMonthsAgo.setMonth(today.getMonth() - 3);
                                setCustomStartDate(threeMonthsAgo.toISOString().split('T')[0]);
                                setCustomEndDate(today.toISOString().split('T')[0]);
                            }}
                            className="text-sm w-full sm:w-auto"
                        >
                            3 meses atrás
                        </Button>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button variant="secondary" onClick={() => setIsCustomPeriodOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={() => {
                            if (customStartDate && customEndDate) {
                                setPeriod('custom');
                                setIsCustomPeriodOpen(false);
                                loadReportsData();
                            } else {
                                showWarning(t('reports.selectDates'));
                            }
                        }}>
                            Aplicar Período
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Reports;

