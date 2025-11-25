import React, { useState } from 'react';
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
import { Download, Calendar } from 'lucide-react';
import jsPDF from 'jspdf';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const Reports = () => {
    const [period, setPeriod] = useState('month');

    // Mock Data
    const barData = {
        labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
        datasets: [
            {
                label: 'Recebido',
                data: [12000, 19000, 3000, 5000, 2000, 3000],
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
            },
            {
                label: 'Pendente',
                data: [2000, 3000, 2000, 3000, 1000, 2000],
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
            },
        ],
    };

    const pieData = {
        labels: ['Clínica A', 'Clínica B', 'Clínica C'],
        datasets: [
            {
                data: [12, 19, 3],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 206, 86, 0.5)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.text('Relatório Financeiro', 20, 20);
        doc.text(`Período: ${period}`, 20, 30);
        doc.text('Total Faturado: R$ 45.000,00', 20, 40);
        doc.save('relatorio.pdf');
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
                    <p className="text-gray-500">Análise financeira e de produtividade</p>
                </div>
                <div className="flex gap-2">
                    <select
                        className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    >
                        <option value="7days">Últimos 7 dias</option>
                        <option value="month">Este Mês</option>
                        <option value="last_month">Mês Passado</option>
                        <option value="year">Este Ano</option>
                    </select>
                    <Button onClick={handleExportPDF} variant="outline" className="flex items-center gap-2">
                        <Download size={20} />
                        Exportar PDF
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card title="Total Faturado">
                    <p className="text-3xl font-bold text-gray-900">R$ 45.000,00</p>
                    <p className="text-sm text-green-600 mt-1">+15% vs período anterior</p>
                </Card>
                <Card title="Ticket Médio">
                    <p className="text-3xl font-bold text-gray-900">R$ 450,00</p>
                    <p className="text-sm text-gray-500 mt-1">Por atendimento</p>
                </Card>
                <Card title="Total Atendimentos">
                    <p className="text-3xl font-bold text-gray-900">124</p>
                    <p className="text-sm text-green-600 mt-1">+8 novos pacientes</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Receita vs Pendente">
                    <Bar data={barData} />
                </Card>
                <Card title="Distribuição por Clínica">
                    <div className="h-64 flex justify-center">
                        <Pie data={pieData} />
                    </div>
                </Card>
            </div>

            <Card title="Atendimentos Recentes">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-3 font-semibold text-gray-600">Data</th>
                                <th className="pb-3 font-semibold text-gray-600">Paciente</th>
                                <th className="pb-3 font-semibold text-gray-600">Clínica</th>
                                <th className="pb-3 font-semibold text-gray-600 text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="py-3 text-gray-600">25/11/2025</td>
                                    <td className="py-3 font-medium text-gray-900">Paciente {i}</td>
                                    <td className="py-3 text-gray-600">Clínica Sorriso</td>
                                    <td className="py-3 text-right font-medium text-gray-900">R$ 350,00</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Reports;
