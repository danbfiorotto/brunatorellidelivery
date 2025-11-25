import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, ChevronRight } from 'lucide-react';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';
import { getPatients } from '../services/api';

const Patients = () => {
    const [patients, setPatients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const data = await getPatients();
            setPatients(data || []);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter(patient =>
        patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Pacientes</h2>
                    <p className="text-gray-500">Gerencie seus pacientes</p>
                </div>
                <Button onClick={() => { }} className="flex items-center gap-2">
                    <User size={20} />
                    Novo Paciente
                </Button>
            </div>

            <Card>
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome, email ou telefone..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="space-y-4">
                    {filteredPatients.map((patient) => (
                        <div
                            key={patient.id}
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
                                    {patient.name.charAt(0)}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                                    <p className="text-sm text-gray-500">{patient.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="hidden md:block text-right">
                                    <p className="text-sm text-gray-500 flex items-center gap-1 justify-end">
                                        <Calendar size={14} />
                                        Última visita
                                    </p>
                                    <p className="font-medium text-gray-900">25/11/2025</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Atendimentos</p>
                                    <p className="font-medium text-gray-900">12</p>
                                </div>
                                <ChevronRight className="text-gray-400" size={20} />
                            </div>
                        </div>
                    ))}
                    {filteredPatients.length === 0 && !loading && (
                        <div className="text-center py-8 text-gray-500">
                            Nenhum paciente encontrado.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Patients;
