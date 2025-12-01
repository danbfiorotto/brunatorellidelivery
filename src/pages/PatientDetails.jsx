import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, FileText, Image as ImageIcon, Edit, Trash2, X, Maximize2, Eye, Building2, DollarSign, Clock, Stethoscope, FileText as NotesIcon } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import { getPatient, updatePatient, deletePatient, getRadiographs, uploadRadiograph, deleteRadiograph } from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { formatPhoneNumber, unformatPhoneNumber, calculateReceivedValue, formatDate, formatTime, formatCurrency } from '../lib/utils';

const PatientDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currency } = useCurrency();
    const [activeTab, setActiveTab] = useState('summary');
    const [patient, setPatient] = useState(null);
    const [radiographs, setRadiographs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedRadiograph, setSelectedRadiograph] = useState(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const fileInputRef = useRef(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        loadPatientData();
    }, [id]);

    const loadPatientData = async () => {
        try {
            setLoading(true);
            const [patientData, radiographsData] = await Promise.all([
                getPatient(id),
                getRadiographs(id)
            ]);
            setPatient(patientData);
            setRadiographs(radiographsData || []);
            
            if (patientData) {
                setFormData({
                    name: patientData.name || '',
                    email: patientData.email || '',
                    phone: patientData.phone ? formatPhoneNumber(patientData.phone) : ''
                });
            }
        } catch (error) {
            console.error('Error loading patient data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        try {
            // Remove phone formatting before saving
            const dataToSave = {
                ...formData,
                phone: unformatPhoneNumber(formData.phone)
            };
            await updatePatient(id, dataToSave);
            setIsEditModalOpen(false);
            loadPatientData();
        } catch (error) {
            console.error('Error updating patient:', error);
            alert('Erro ao atualizar paciente: ' + error.message);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Tem certeza que deseja excluir este paciente? Todos os atendimentos relacionados também serão excluídos.')) {
            try {
                await deletePatient(id);
                navigate('/patients');
            } catch (error) {
                console.error('Error deleting patient:', error);
                alert('Erro ao excluir paciente: ' + error.message);
            }
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert('O arquivo é muito grande. Tamanho máximo: 10MB.');
            return;
        }

        try {
            setUploading(true);
            
            // Upload directly to Supabase Storage
            await uploadRadiograph(id, null, file);
            await loadPatientData();
            alert('Radiografia enviada com sucesso!');
        } catch (error) {
            console.error('Error uploading radiograph:', error);
            alert('Erro ao enviar radiografia: ' + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteRadiograph = async (radiographId) => {
        if (window.confirm('Tem certeza que deseja excluir esta radiografia?')) {
            try {
                await deleteRadiograph(radiographId);
                await loadPatientData();
                if (selectedRadiograph?.id === radiographId) {
                    setIsImageModalOpen(false);
                    setSelectedRadiograph(null);
                }
            } catch (error) {
                console.error('Error deleting radiograph:', error);
                alert('Erro ao excluir radiografia: ' + error.message);
            }
        }
    };

    const handleOpenImageModal = (radiograph) => {
        setSelectedRadiograph(radiograph);
        setIsImageModalOpen(true);
    };

    const handleOpenAppointmentModal = (appointment) => {
        console.log('Opening appointment modal with data:', appointment);
        console.log('Clinical evolution:', appointment.clinical_evolution);
        console.log('Notes:', appointment.notes);
        console.log('Payment type:', appointment.payment_type);
        console.log('Payment percentage:', appointment.payment_percentage);
        setSelectedAppointment(appointment);
        setIsAppointmentModalOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500 dark:text-gray-400">Carregando...</p>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-500 dark:text-gray-400">Paciente não encontrado.</p>
            </div>
        );
    }

    const totalAppointments = patient.appointments?.length || 0;
    const totalRevenue = (patient.appointments || [])
        .filter(apt => apt.status === 'paid')
        .reduce((sum, apt) => sum + parseFloat(apt.value || 0), 0);
    const lastVisit = patient.last_visit || (patient.appointments && patient.appointments.length > 0 
        ? patient.appointments[0].date 
        : null);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                            {patient.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-1">{patient.name}</h2>
                            <p className="text-white/90">
                                {patient.email} {patient.phone && `• ${formatPhoneNumber(patient.phone)}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="secondary" 
                            className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit size={18} />
                            Editar
                        </Button>
                        <Button 
                            variant="danger" 
                            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white border-0"
                            onClick={handleDelete}
                        >
                            <Trash2 size={18} />
                            Excluir
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 bg-white rounded-t-2xl">
                <nav className="flex gap-8 px-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        <Card className="bg-gradient-to-br from-sky-50 to-sky-100/50 border-sky-200">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Estatísticas</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                    <span className="text-gray-600 dark:text-gray-300 font-medium">Total de Atendimentos</span>
                                    <span className="font-bold text-slate-900 dark:text-white text-lg">{totalAppointments}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Total de Radiografias</span>
                                    <span className="font-bold text-slate-900 dark:text-white text-lg">{radiographs.length}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Receita Total</span>
                                    <span className="font-bold text-emerald-600 text-lg">{formatCurrency(totalRevenue, currency)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                    <span className="text-gray-600 font-medium">Paciente Desde</span>
                                    <span className="font-semibold text-slate-700 dark:text-gray-300">{formatDate(patient.created_at)}</span>
                                </div>
                                {lastVisit && (
                                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-xl">
                                        <span className="text-gray-600 font-medium">Último Atendimento</span>
                                        <span className="font-semibold text-slate-700 dark:text-gray-300">{formatDate(lastVisit)}</span>
                                    </div>
                                )}
                            </div>
                        </Card>
                        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Próximo Atendimento</h3>
                            </div>
                            <div className="text-center py-8">
                                <Calendar className="mx-auto text-emerald-300 mb-3" size={48} />
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhum agendamento futuro.</p>
                                <Button 
                                    className="w-full"
                                    onClick={() => navigate('/appointments')}
                                >
                                    Agendar Agora
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {activeTab === 'appointments' && (
                    <Card>
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Histórico de Atendimentos</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Lista completa de procedimentos realizados</p>
                        </div>
                        <div className="space-y-3">
                            {patient.appointments && patient.appointments.length > 0 ? (
                                patient.appointments.map((appointment) => (
                                    <div 
                                        key={appointment.id} 
                                        className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-gray-200 hover:shadow-sm transition-all cursor-pointer group"
                                        onClick={() => handleOpenAppointmentModal(appointment)}
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold text-slate-900 dark:text-white mb-1">{appointment.procedure}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {appointment.clinics?.name || 'Sem clínica'} • {formatDate(appointment.date)} {formatTime(appointment.time)}
                                            </p>
                                        </div>
                                        <div className="text-right ml-4 flex items-center gap-3">
                                            <div>
                                                <p className="font-bold text-slate-900 dark:text-white mb-1">
                                                    {formatCurrency(parseFloat(appointment.value || 0), appointment.currency || currency)}
                                                </p>
                                                {appointment.payment_type === 'percentage' && appointment.payment_percentage && (
                                                    <p className="text-xs text-slate-500 mb-1">
                                                        Recebido: {formatCurrency(calculateReceivedValue(appointment), appointment.currency || currency)} ({appointment.payment_percentage}%)
                                                    </p>
                                                )}
                                                <Badge variant={appointment.status === 'paid' ? 'success' : appointment.status === 'pending' ? 'warning' : 'primary'}>
                                                    {appointment.status === 'paid' ? 'Pago' : appointment.status === 'pending' ? 'Pendente' : 'Agendado'}
                                                </Badge>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenAppointmentModal(appointment);
                                                }}
                                                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                title="Ver detalhes"
                                            >
                                                <Eye size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-gray-500 dark:text-gray-400 py-8">Nenhum atendimento registrado.</p>
                            )}
                        </div>
                    </Card>
                )}

                {activeTab === 'radiographies' && (
                    <Card>
                        <div className="mb-4">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Radiografias</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Imagens e exames do paciente</p>
                        </div>
                        {radiographs.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                {radiographs.map((radio) => (
                                    <div key={radio.id} className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border-2 border-gray-200 hover:border-sky-300 transition-all cursor-pointer group relative overflow-hidden">
                                        {radio.file_url ? (
                                            <img 
                                                src={radio.file_url} 
                                                alt={radio.file_name || 'Radiografia'} 
                                                className="w-full h-full object-cover rounded-xl"
                                                onClick={() => handleOpenImageModal(radio)}
                                            />
                                        ) : (
                                            <ImageIcon className="text-gray-400 group-hover:text-sky-500 transition-colors" size={32} />
                                        )}
                                        
                                        {/* Overlay com informações */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                                            {radio.appointment && radio.appointment.date && (
                                                <div className="text-white text-xs mb-1 flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    <span>
                                                        {formatDate(radio.appointment.date)} 
                                                        {radio.appointment.time && ` ${formatTime(radio.appointment.time)}`}
                                                    </span>
                                                </div>
                                            )}
                                            {radio.file_name && (
                                                <div className="text-white text-xs truncate">
                                                    {radio.file_name}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Botão de excluir */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteRadiograph(radio.id);
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                            title="Excluir radiografia"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                        
                                        {/* Ícone de expandir */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenImageModal(radio);
                                            }}
                                            className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70 z-10 cursor-pointer"
                                            title="Ampliar imagem"
                                        >
                                            <Maximize2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-sky-300 transition-colors">
                            <ImageIcon className="mx-auto text-gray-300 mb-3" size={48} />
                            <p className="text-gray-600 dark:text-gray-300 mb-2">Fazer upload de nova radiografia</p>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                            <div className="flex justify-center">
                                <Button 
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {/* Appointment Details Modal */}
            <Modal
                isOpen={isAppointmentModalOpen}
                onClose={() => {
                    setIsAppointmentModalOpen(false);
                    setSelectedAppointment(null);
                }}
                title="Detalhes do Atendimento"
                size="xl"
            >
                {selectedAppointment && (
                    <div className="space-y-6">
                        {/* Header Info */}
                        <div className="bg-gradient-to-r from-sky-50 to-emerald-50 rounded-xl p-4 border border-sky-100">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{selectedAppointment.procedure}</h3>
                                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                                        <Badge variant={selectedAppointment.status === 'paid' ? 'success' : selectedAppointment.status === 'pending' ? 'warning' : 'primary'}>
                                            {selectedAppointment.status === 'paid' ? 'Pago' : selectedAppointment.status === 'pending' ? 'Pendente' : 'Agendado'}
                                        </Badge>
                                        <span className="flex items-center gap-1">
                                            <Calendar size={14} />
                                            {formatDate(selectedAppointment.date)}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={14} />
                                            {formatTime(selectedAppointment.time)}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-slate-900 dark:text-white">
                                        {formatCurrency(parseFloat(selectedAppointment.value || 0), selectedAppointment.currency || currency)}
                                    </p>
                                    {selectedAppointment.currency && selectedAppointment.currency !== 'BRL' && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Moeda: {selectedAppointment.currency}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Grid de Informações */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Clínica */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Building2 size={18} className="text-gray-400 dark:text-gray-500" />
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Clínica</span>
                                </div>
                                <p className="text-slate-900 dark:text-white font-medium">
                                    {selectedAppointment.clinics?.name || 'Não informado'}
                                </p>
                                {selectedAppointment.clinics?.address && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{selectedAppointment.clinics.address}</p>
                                )}
                            </div>

                            {/* Informações de Pagamento */}
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <DollarSign size={18} className="text-gray-400 dark:text-gray-500" />
                                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Pagamento</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-slate-900 dark:text-white font-medium">
                                        {selectedAppointment.payment_type === '100' ? '100% do valor' : `Porcentagem: ${selectedAppointment.payment_percentage}%`}
                                    </p>
                                    {selectedAppointment.payment_type === 'percentage' && selectedAppointment.payment_percentage && (
                                        <p className="text-sm text-gray-600 dark:text-gray-300">
                                            Recebido: {formatCurrency(calculateReceivedValue(selectedAppointment), selectedAppointment.currency || currency)}
                                        </p>
                                    )}
                                    {selectedAppointment.is_paid && selectedAppointment.payment_date && (
                                        <p className="text-xs text-gray-500">
                                            Pago em: {formatDate(selectedAppointment.payment_date)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Evolução Clínica */}
                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Stethoscope size={18} className="text-blue-600" />
                                <span className="text-sm font-semibold text-blue-900">Evolução Clínica</span>
                            </div>
                            {selectedAppointment.clinical_evolution && selectedAppointment.clinical_evolution.trim() ? (
                                <p className="text-slate-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAppointment.clinical_evolution}</p>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma evolução clínica registrada.</p>
                            )}
                        </div>

                        {/* Observações */}
                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <div className="flex items-center gap-2 mb-3">
                                <NotesIcon size={18} className="text-amber-600" />
                                <span className="text-sm font-semibold text-amber-900">Observações</span>
                            </div>
                            {selectedAppointment.notes && selectedAppointment.notes.trim() ? (
                                <p className="text-slate-700 dark:text-gray-300 whitespace-pre-wrap">{selectedAppointment.notes}</p>
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma observação registrada.</p>
                            )}
                        </div>

                        {/* Informações Adicionais */}
                        <div className="pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Informações Adicionais</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">ID do Atendimento:</span>
                                    <p className="text-slate-700 dark:text-gray-300 font-mono text-xs mt-1">{selectedAppointment.id}</p>
                                </div>
                                {selectedAppointment.created_at && (
                                    <div>
                                        <span className="text-gray-500">Criado em:</span>
                                        <p className="text-slate-700 dark:text-gray-300 mt-1">{formatDate(selectedAppointment.created_at)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Image View Modal */}
            <Modal
                isOpen={isImageModalOpen}
                onClose={() => {
                    setIsImageModalOpen(false);
                    setSelectedRadiograph(null);
                }}
                title={selectedRadiograph?.file_name || 'Radiografia'}
                size="xl"
            >
                {selectedRadiograph && (
                    <div className="space-y-4">
                        <div className="relative bg-gray-100 rounded-xl overflow-hidden">
                            {selectedRadiograph.file_url && (
                                <img 
                                    src={selectedRadiograph.file_url} 
                                    alt={selectedRadiograph.file_name || 'Radiografia'} 
                                    className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                                />
                            )}
                        </div>
                        
                        <div className="space-y-2 pt-4 border-t border-gray-200">
                            {selectedRadiograph.appointment && selectedRadiograph.appointment.date && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span className="font-medium">Atendimento:</span>
                                    <span>
                                        {formatDate(selectedRadiograph.appointment.date)} 
                                        {selectedRadiograph.appointment.time && ` ${formatTime(selectedRadiograph.appointment.time)}`}
                                    </span>
                                    {selectedRadiograph.appointment.procedure && (
                                        <span className="text-gray-400">• {selectedRadiograph.appointment.procedure}</span>
                                    )}
                                </div>
                            )}
                            {selectedRadiograph.file_name && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <FileText size={16} className="text-gray-400" />
                                    <span className="font-medium">Arquivo:</span>
                                    <span>{selectedRadiograph.file_name}</span>
                                </div>
                            )}
                            {selectedRadiograph.created_at && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <Calendar size={16} className="text-gray-400" />
                                    <span className="font-medium">Enviado em:</span>
                                    <span>{formatDate(selectedRadiograph.created_at)}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                            <Button 
                                variant="danger"
                                onClick={() => {
                                    if (selectedRadiograph) {
                                        handleDeleteRadiograph(selectedRadiograph.id);
                                    }
                                }}
                                className="flex items-center gap-2"
                            >
                                <Trash2 size={18} />
                                Excluir Radiografia
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Edit Patient Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Paciente"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    <Input
                        label="Nome Completo *"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="E-mail"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Telefone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        value={formData.phone}
                        onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setFormData({ ...formData, phone: formatted });
                        }}
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsEditModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Salvar Alterações
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

const TabButton = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 pb-4 border-b-2 transition-colors ${active
                ? 'border-sky-500 text-sky-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
            }`}
    >
        {icon}
        {label}
    </button>
);

export default PatientDetails;
