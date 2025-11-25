import React, { useState } from 'react';
import { User, Mail, Phone, Globe, Bell, CreditCard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';

const Profile = () => {
    const { user, signOut } = useAuth();
    const [formData, setFormData] = useState({
        name: 'Bruna Torelli Soares',
        email: user?.email || 'brunatorellisoares@hotmail.com',
        phone: '(11) 99999-9999',
        language: 'pt-BR',
        currency: 'BRL'
    });

    const handleSave = (e) => {
        e.preventDefault();
        alert('Configurações salvas!');
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Perfil e Configurações</h2>
                <p className="text-gray-500">Gerencie sua conta e preferências</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Sidebar / User Info */}
                <div className="space-y-6">
                    <Card className="text-center">
                        <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-3xl mx-auto mb-4">
                            {formData.name.charAt(0)}
                        </div>
                        <h3 className="font-bold text-gray-900">{formData.name}</h3>
                        <p className="text-sm text-gray-500 mb-4">Plano PRO</p>
                        <Button variant="outline" onClick={signOut} className="w-full flex items-center justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200">
                            <LogOut size={18} />
                            Sair
                        </Button>
                    </Card>
                </div>

                {/* Settings Form */}
                <div className="md:col-span-2 space-y-6">
                    <Card title="Informações Pessoais">
                        <form onSubmit={handleSave}>
                            <Input
                                label="Nome Completo"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="E-mail"
                                    value={formData.email}
                                    disabled
                                    className="bg-gray-50"
                                />
                                <Input
                                    label="Telefone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button type="submit">Salvar Alterações</Button>
                            </div>
                        </form>
                    </Card>

                    <Card title="Preferências">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Idioma</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.language}
                                        onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                    >
                                        <option value="pt-BR">Português (Brasil)</option>
                                        <option value="en-US">English (US)</option>
                                        <option value="es-ES">Español</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Moeda</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                    >
                                        <option value="BRL">Real (BRL)</option>
                                        <option value="EUR">Euro (EUR)</option>
                                        <option value="USD">Dólar (USD)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Notificações">
                        <div className="space-y-3">
                            {['Novos agendamentos', 'Lembretes de pendências', 'Novidades do sistema'].map((item, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-gray-700">{item}</span>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" defaultChecked />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default Profile;
