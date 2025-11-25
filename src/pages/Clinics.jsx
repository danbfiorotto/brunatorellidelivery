import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { getClinics, createClinic } from '../services/api';

const Clinics = () => {
    const [clinics, setClinics] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        loadClinics();
    }, []);

    const loadClinics = async () => {
        try {
            const data = await getClinics();
            setClinics(data || []);
        } catch (error) {
            console.error('Error loading clinics:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await createClinic(formData);
            setIsModalOpen(false);
            setFormData({ name: '', address: '', email: '', phone: '' });
            loadClinics();
        } catch (error) {
            console.error('Error creating clinic:', error);
        }
    };

    const filteredClinics = clinics.filter(clinic =>
        clinic.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Clínicas Parceiras</h2>
                    <p className="text-gray-500">Gerencie as clínicas cadastradas</p>
                </div>
                <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
                    <Plus size={20} />
                    Nova Clínica
                </Button>
            </div>

            <Card>
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar clínica..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="pb-3 font-semibold text-gray-600">Nome</th>
                                <th className="pb-3 font-semibold text-gray-600">Cidade/Endereço</th>
                                <th className="pb-3 font-semibold text-gray-600">Contato</th>
                                <th className="pb-3 font-semibold text-gray-600">Status</th>
                                <th className="pb-3 font-semibold text-gray-600 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredClinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4">
                                        <p className="font-medium text-gray-900">{clinic.name}</p>
                                    </td>
                                    <td className="py-4 text-gray-600">{clinic.address}</td>
                                    <td className="py-4">
                                        <p className="text-sm text-gray-900">{clinic.email}</p>
                                        <p className="text-xs text-gray-500">{clinic.phone}</p>
                                    </td>
                                    <td className="py-4">
                                        <Badge variant="success">Ativa</Badge>
                                    </td>
                                    <td className="py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50">
                                                <Edit2 size={18} />
                                            </button>
                                            <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredClinics.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-gray-500">
                                        Nenhuma clínica encontrada.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Adicionar Nova Clínica"
            >
                <form onSubmit={handleSubmit}>
                    <Input
                        label="Nome da Clínica"
                        placeholder="Ex: Clínica Sorriso"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="Endereço"
                        placeholder="Rua, Número, Cidade"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        required
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Telefone"
                            placeholder="(00) 00000-0000"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                        <Input
                            label="E-mail"
                            type="email"
                            placeholder="contato@clinica.com"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Salvar Clínica
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Clinics;
