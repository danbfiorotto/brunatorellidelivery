import React, { useState, useEffect } from 'react';
import { Plus, Filter, Calendar, DollarSign, User, Building2 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { getAppointments, createAppointment, getClinics, getPatients } from '../services/api';

const Appointments = () => {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // Form State
    const [clinics, setClinics] = useState([]);
    const [patients, setPatients] = useState([]);
    const [formData, setFormData] = useState({
        clinic_id: '',
        patient_id: '',
        date: '',
        time: '',
        procedure: '',
        value: '',
        status: 'scheduled',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [appointmentsData, clinicsData, patientsData] = await Promise.all([
                getAppointments(),
                getClinics(),
                getPatients()
            ]);
            setAppointments(appointmentsData || []);
            setClinics(clinicsData || []);
            setPatients(patientsData || []);
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createAppointment(formData);
            setIsModalOpen(false);
            // Reset form
            setFormData({
                clinic_id: '',
                patient_id: '',
                date: '',
                time: '',
                procedure: '',
                value: '',
                status: 'scheduled',
                notes: ''
            });
            loadData();
        } catch (error) {
            console.error('Error creating appointment:', error);
        }
    };

    const filteredAppointments = appointments.filter(app => {
        if (filterStatus === 'all') return true;
        return app.status === filterStatus;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'paid': return <Badge variant="success">Pago</Badge>;
            case 'pending': return <Badge variant="warning">Pendente</Badge>;
            case 'scheduled': return <Badge variant="info">Agendado</Badge>;
            default: return <Badge>Desconhecido</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Atendimentos</h2>
                    <p className="text-gray-500">Gerencie seus procedimentos</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={20} />
                    Novo Atendimento
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {['all', 'paid', 'pending', 'scheduled'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${filterStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {status === 'all' ? 'Todos' :
                            status === 'paid' ? 'Pagos' :
                                status === 'pending' ? 'Pendentes' : 'Agendados'}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAppointments.map((app) => (
                    <Card key={app.id} className="hover:shadow-md transition-shadow cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                <Calendar size={16} />
                                <span>{new Date(app.date).toLocaleDateString()} • {app.time}</span>
                            </div>
                            {getStatusBadge(app.status)}
                        </div>

                        <h3 className="text-lg font-semibold text-gray-900 mb-1">{app.procedure}</h3>

                        <div className="space-y-2 mb-4">
                            <div className="flex items-center gap-2 text-gray-600">
                                <User size={16} />
                                <span>{app.patients?.name || 'Paciente'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Building2 size={16} />
                                <span>{app.clinics?.name || 'Clínica'}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-1 font-semibold text-gray-900">
                                <DollarSign size={16} className="text-green-600" />
                                {app.value}
                            </div>
                            <button className="text-blue-600 text-sm font-medium hover:underline">
                                Detalhes
                            </button>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Novo Atendimento"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Clínica</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.clinic_id}
                                onChange={(e) => setFormData({ ...formData, clinic_id: e.target.value })}
                                required
                            >
                                <option value="">Selecione...</option>
                                {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paciente</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.patient_id}
                                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                                required
                            >
                                <option value="">Selecione...</option>
                                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Data"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            required
                        />
                        <Input
                            label="Horário"
                            type="time"
                            value={formData.time}
                            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                            required
                        />
                    </div>

                    <Input
                        label="Procedimento"
                        placeholder="Ex: Tratamento de Canal"
                        value={formData.procedure}
                        onChange={(e) => setFormData({ ...formData, procedure: e.target.value })}
                        required
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Valor (R$)"
                            type="number"
                            placeholder="0,00"
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            required
                        />
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="scheduled">Agendado</option>
                                <option value="pending">Pendente</option>
                                <option value="paid">Pago</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
                        <textarea
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows="3"
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Salvar Atendimento
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Appointments;
