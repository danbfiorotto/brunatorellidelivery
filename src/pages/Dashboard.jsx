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
import { DollarSign, Users, Building2, TrendingUp, Calendar } from 'lucide-react';
import Card from '../components/UI/Card';
import Badge from '../components/UI/Badge';
import { getDashboardStats } from '../services/api';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        revenue: 0,
        pending: 0,
        appointments: 0,
        clinics: 0
    });

    useEffect(() => {
        // Fetch stats
        getDashboardStats().then(setStats);
    }, []);

    const chartData = {
        labels: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        datasets: [
            {
                label: 'Atendimentos',
                data: [12, 19, 3, 5, 2, 3],
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderColor: 'rgb(59, 130, 246)',
                borderWidth: 1,
                borderRadius: 4,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: {
                    display: false,
                }
            },
            x: {
                grid: {
                    display: false,
                }
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Painel Geral</h2>
                    <p className="text-gray-500">Bem-vindo de volta, Dr(a). Bruna!</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
                        Exportar
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        Novo Atendimento
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KpiCard
                    title="Faturamento Mensal"
                    value={`R$ ${stats.revenue.toLocaleString()}`}
                    subtext="+12% vs mês anterior"
                    icon={<DollarSign className="text-green-600" size={24} />}
                    trend="up"
                />
                <KpiCard
                    title="Atendimentos"
                    value={stats.appointments}
                    subtext="Total este mês"
                    icon={<Calendar className="text-blue-600" size={24} />}
                />
                <KpiCard
                    title="Clínicas Ativas"
                    value={stats.clinics}
                    subtext="Parceiros cadastrados"
                    icon={<Building2 className="text-purple-600" size={24} />}
                />
                <KpiCard
                    title="Ticket Médio"
                    value="R$ 350"
                    subtext="Por atendimento"
                    icon={<TrendingUp className="text-orange-600" size={24} />}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Productivity Chart */}
                <div className="lg:col-span-2">
                    <Card title="Produtividade Semanal">
                        <div className="h-64">
                            <Bar data={chartData} options={chartOptions} />
                        </div>
                    </Card>
                </div>

                {/* Clinics Ranking */}
                <div>
                    <Card title="Ranking de Clínicas">
                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 flex items-center justify-center bg-white rounded-full font-bold text-gray-500 shadow-sm">
                                            {i}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">Clínica Sorriso {i}</p>
                                            <p className="text-xs text-gray-500">12 atendimentos</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">R$ 4.200</p>
                                        <Badge variant="success">Active</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const KpiCard = ({ title, value, subtext, icon, trend }) => (
    <Card className="relative overflow-hidden">
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
                <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {trend === 'up' && <span className="text-green-500 font-medium">↑</span>}
                    {subtext}
                </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
                {icon}
            </div>
        </div>
    </Card>
);

export default Dashboard;
