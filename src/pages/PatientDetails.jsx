import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { User, Calendar, FileText, Image as ImageIcon, Edit, Trash2 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';

const PatientDetails = () => {
    const { id } = useParams();
    const [activeTab, setActiveTab] = useState('summary');

    // Mock data for now
    const patient = {
        id,
        name: 'Maria Silva',
        email: 'maria.silva@email.com',
        phone: '(11) 99999-9999',
        since: '2024-01-15',
        totalAppointments: 12,
        totalRevenue: 4500,
        lastVisit: '2025-11-20',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                        {patient.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">{patient.name}</h2>
                        <p className="text-gray-500">{patient.email} • {patient.phone}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="flex items-center gap-2">
                        <Edit size={18} />
                        Editar
                    </Button>
                    <Button variant="danger" className="flex items-center gap-2">
                        <Trash2 size={18} />
                        Excluir
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                    <TabButton
                        active={activeTab === 'summary'}
                        onClick={() => setActiveTab('summary')}
                        icon={<User size={18} />}
                        label="Resumo"
                    />
                    <TabButton
                        active={activeTab === 'appointments'}
                        onClick={() => setActiveTab('appointments')}
                        icon={<Calendar size={18} />}
                        label="Atendimentos"
                    />
                    <TabButton
                        active={activeTab === 'radiographies'}
                        onClick={() => setActiveTab('radiographies')}
                        icon={<ImageIcon size={18} />}
                        label="Radiografias"
                    />
                </nav>
            </div>

            {/* Content */}
            <div className="mt-6">
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card title="Estatísticas">
                            <div className="space-y-4">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Total de Atendimentos</span>
                                    <span className="font-semibold">{patient.totalAppointments}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Receita Total</span>
                                    <span className="font-semibold text-green-600">R$ {patient.totalRevenue}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Paciente Desde</span>
                                    <span className="font-semibold">{new Date(patient.since).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </Card>
                        <Card title="Próximo Atendimento">
                            <div className="text-center py-6">
                                <Calendar className="mx-auto text-gray-300 mb-2" size={48} />
                                <p className="text-gray-500">Nenhum agendamento futuro.</p>
                                <Button variant="outline" className="mt-4">Agendar Agora</Button>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <Card>
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-gray-900">Tratamento de Canal - Dente 26</p>
                                        <p className="text-sm text-gray-500">Clínica Sorriso • 20/11/2025</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-gray-900">R$ 800,00</p>
                                        <Badge variant="success">Pago</Badge>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                )}

                {activeTab === 'radiographies' && (
                    <Card>
                        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                            <ImageIcon className="mx-auto text-gray-300 mb-2" size={48} />
                            <p className="text-gray-500">Nenhuma radiografia enviada.</p>
                            <Button variant="outline" className="mt-4">Fazer Upload</Button>
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${active
                ? 'border-blue-600 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
    >
        {icon}
        {label}
    </button>
);

export default PatientDetails;
