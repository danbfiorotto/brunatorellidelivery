import React, { useState, useEffect, useRef, FormEvent, ChangeEvent, ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Calendar, FileText, Image as ImageIcon, Edit, Trash2, X, Maximize2, Eye, Building2, DollarSign, Clock, Stethoscope, FileText as NotesIcon } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import { useCurrency } from '../context/CurrencyContext';
import { useDependencies } from '../hooks/useDependencies';
import { formatPhoneNumber, unformatPhoneNumber, calculateReceivedValue, formatDate, formatTime, formatCurrency } from '../lib/utils';
import { sanitizeHTML } from '../lib/sanitize';
import { logger } from '../lib/logger';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from '../components/UI/Toast';

type TabType = 'summary' | 'appointments' | 'radiographies';

interface Patient {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    created_at?: string;
    last_visit?: string | null;
    appointments?: Appointment[];
}

interface Appointment {
    id: string;
    date: string;
    time: string;
    procedure: string;
    value: string | number;
    currency?: string;
    status: 'paid' | 'pending' | 'scheduled';
    payment_type?: string;
    payment_percentage?: number | null;
    is_paid?: boolean;
    payment_date?: string | null;
    clinical_evolution?: string | null;
    notes?: string | null;
    created_at?: string;
    clinics?: {
        id?: string;
        name?: string;
        address?: string;
    } | null;
}

interface Radiograph {
    id: string;
    file_url?: string | null;
    file_name?: string | null;
    created_at?: string;
    appointment?: {
        id: string;
        date: string;
        time?: string;
        procedure?: string;
    } | null;
}

interface FormData {
    name: string;
    email: string;
    phone: string;
}

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    icon: ReactNode;
    label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-1.5 sm:gap-2 pb-3 sm:pb-4 border-b-2 transition-colors min-h-[44px] text-sm sm:text-base whitespace-nowrap ${
            active
                ? 'border-sky-500 text-sky-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
        }`}
    >
        <span className="text-base sm:text-lg">{icon}</span>
        <span>{label}</span>
    </button>
);

const PatientDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { currency } = useCurrency();
    const container = useDependencies();
    const patientService = container.resolve('patientService');
    const radiographService = container.resolve('radiographService');
    const { handleError } = useErrorHandler();
    const { showSuccess, showWarning } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('summary');
    const [patient, setPatient] = useState<Patient | null>(null);
    const [radiographs, setRadiographs] = useState<Radiograph[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [uploading, setUploading] = useState<boolean>(false);
    const [selectedRadiograph, setSelectedRadiograph] = useState<Radiograph | null>(null);
    const [isImageModalOpen, setIsImageModalOpen] = useState<boolean>(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        if (id) {
            loadPatientData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadPatientData = async (): Promise<void> => {
        if (!id) return;
        
        try {
            setLoading(true);
            const [patientData, radiographsData] = await Promise.all([
                patientService.getById(id),
                radiographService.getRadiographs(id)
            ]);
            
            // ✅ Converter entidades Appointment para formato esperado pela página
            if (patientData && (patientData as any).appointments) {
                const appointments = (patientData as any).appointments as any[];
                
                // Formatar data no formato YYYY-MM-DD
                const formatDateToISO = (date: Date): string => {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };
                
                // Converter appointments para formato esperado
                const convertedAppointments: Appointment[] = appointments.map((apt: any) => ({
                    id: apt.id,
                    date: formatDateToISO(apt.date),
                    time: apt.time.toString(),
                    procedure: apt.procedure.toString(),
                    value: apt.value.amount,
                    currency: apt.value.currency,
                    status: apt.status.toString() as 'paid' | 'pending' | 'scheduled',
                    payment_type: apt.paymentType.type,
                    payment_percentage: apt.paymentType.percentage,
                    is_paid: apt.isPaid,
                    payment_date: apt.paymentDate ? formatDateToISO(apt.paymentDate) : null,
                    clinical_evolution: apt.clinicalEvolution,
                    notes: apt.notes,
                    created_at: apt.createdAt.toISOString(),
                    clinics: apt.clinics || null
                }));
                
                // Adicionar appointments convertidos ao patient
                (patientData as any).appointments = convertedAppointments;
            }
            
            setPatient(patientData);
            setRadiographs(radiographsData || []);
            
            if (patientData) {
                setFormData({
                    name: patientData.name || '',
                    email: patientData.email || '',
                    phone: patientData.phone ? formatPhoneNumber(patientData.phone) : ''
                });
            }
            
            logger.debug('PatientDetails - Patient data loaded', {
                patientId: patientData?.id,
                appointmentsCount: (patientData as any)?.appointments?.length || 0,
                radiographsCount: radiographsData?.length || 0
            });
        } catch (error) {
            logger.error(error, { context: 'loadPatientData' });
            handleError(error, 'PatientDetails.loadPatientData');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        if (!id) return;
        
        try {
            const dataToSave = {
                ...formData,
                phone: unformatPhoneNumber(formData.phone)
            };
            await patientService.update(id, dataToSave);
            setIsEditModalOpen(false);
            loadPatientData();
        } catch (error) {
            logger.error(error, { context: 'updatePatient' });
            handleError(error, 'PatientDetails.updatePatient');
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!id) return;
        
        if (window.confirm('Tem certeza que deseja excluir este paciente? Todos os atendimentos relacionados também serão excluídos.')) {
            try {
                await patientService.delete(id);
                showSuccess('Paciente excluído com sucesso!');
                // ✅ Aguardar um pouco para garantir que o Toast seja exibido antes de navegar
                setTimeout(() => {
                    navigate('/patients');
                }, 500);
            } catch (error) {
                logger.error(error, { context: 'deletePatient' });
                handleError(error, 'PatientDetails.deletePatient');
            }
        }
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        if (!id) return;
        
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showWarning('Por favor, selecione apenas arquivos de imagem.');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showWarning('O arquivo é muito grande. Tamanho máximo: 10MB.');
            return;
        }

        try {
            setUploading(true);
            await radiographService.uploadRadiograph(id, null, file);
            await loadPatientData();
            showSuccess('Radiografia enviada com sucesso!');
        } catch (error) {
            logger.error(error, { context: 'uploadRadiograph' });
            handleError(error, 'PatientDetails.uploadRadiograph');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteRadiograph = async (radiographId: string): Promise<void> => {
        if (window.confirm('Tem certeza que deseja excluir esta radiografia?')) {
            try {
                await radiographService.deleteRadiograph(radiographId);
                await loadPatientData();
                if (selectedRadiograph?.id === radiographId) {
                    setIsImageModalOpen(false);
                    setSelectedRadiograph(null);
                }
            } catch (error) {
                logger.error(error, { context: 'deleteRadiograph' });
                handleError(error, 'PatientDetails.deleteRadiograph');
            }
        }
    };

    const handleOpenImageModal = (radiograph: Radiograph): void => {
        setSelectedRadiograph(radiograph);
        setIsImageModalOpen(true);
    };

    const handleOpenAppointmentModal = (appointment: Appointment): void => {
        logger.debug('Opening appointment modal', {
            appointmentId: appointment.id,
            paymentType: appointment.payment_type,
            paymentPercentage: appointment.payment_percentage
        });
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
        .reduce((sum, apt) => sum + calculateReceivedValue(apt), 0);
    
    // ✅ Converter last_visit para string se for Date
    const lastVisit = patient.last_visit 
        ? (patient.last_visit instanceof Date ? patient.last_visit.toISOString().split('T')[0] : patient.last_visit)
        : (patient.appointments && patient.appointments.length > 0 
            ? patient.appointments[0].date 
            : null);
    
    // ✅ Converter created_at para string se for Date
    const createdAt = patient.created_at 
        ? (patient.created_at instanceof Date ? patient.created_at.toISOString() : patient.created_at)
        : null;

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-white mb-6 sm:mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg flex-shrink-0">
                            {patient.name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 truncate">{patient.name}</h2>
                            <p className="text-sm sm:text-base text-white/90 truncate">
                                {patient.email} {patient.phone && `• ${formatPhoneNumber(patient.phone)}`}
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Button 
                            variant="secondary" 
                            className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30 text-sm sm:text-base w-full sm:w-auto"
                            onClick={() => setIsEditModalOpen(true)}
                        >
                            <Edit size={18} />
                            Editar
                        </Button>
                        <Button 
                            variant="danger" 
                            className="flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white border-0 text-sm sm:text-base w-full sm:w-auto"
                            onClick={handleDelete}
                        >
                            <Trash2 size={18} />
                            Excluir
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border-b border-gray-200 bg-white rounded-t-xl sm:rounded-t-2xl overflow-x-auto">
                <nav className="flex gap-4 sm:gap-6 md:gap-8 px-4 sm:px-6 min-w-max sm:min-w-0">
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

            <div className="mt-4 sm:mt-6">
                {activeTab === 'summary' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
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
                                    <span className="font-semibold text-slate-700 dark:text-gray-300">{createdAt ? formatDate(createdAt) : 'N/A'}</span>
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
                                                    {formatCurrency(parseFloat(String(appointment.value || 0)), appointment.currency || currency)}
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
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6">
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
                        <div className="text-center py-6 sm:py-8 border-2 border-dashed border-gray-200 rounded-xl hover:border-sky-300 transition-colors px-4">
                            <ImageIcon className="mx-auto text-gray-300 mb-2 sm:mb-3" size={40} />
                            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-2 sm:mb-3">Fazer upload de nova radiografia</p>
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
                                    className="w-full sm:w-auto"
                                >
                                    {uploading ? 'Enviando...' : 'Selecionar Arquivo'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

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
                                        {formatCurrency(parseFloat(String(selectedAppointment.value || 0)), selectedAppointment.currency || currency)}
                                    </p>
                                    {selectedAppointment.currency && selectedAppointment.currency !== 'BRL' && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Moeda: {selectedAppointment.currency}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <div className="flex items-center gap-2 mb-3">
                                <Stethoscope size={18} className="text-blue-600" />
                                <span className="text-sm font-semibold text-blue-900">Evolução Clínica</span>
                            </div>
                            {selectedAppointment.clinical_evolution && selectedAppointment.clinical_evolution.trim() ? (
                                <p className="text-slate-700 dark:text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedAppointment.clinical_evolution) }} />
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma evolução clínica registrada.</p>
                            )}
                        </div>

                        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
                            <div className="flex items-center gap-2 mb-3">
                                <NotesIcon size={18} className="text-amber-600" />
                                <span className="text-sm font-semibold text-amber-900">Observações</span>
                            </div>
                            {selectedAppointment.notes && selectedAppointment.notes.trim() ? (
                                <p className="text-slate-700 dark:text-gray-300 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHTML(selectedAppointment.notes) }} />
                            ) : (
                                <p className="text-slate-500 italic">Nenhuma observação registrada.</p>
                            )}
                        </div>

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

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Paciente"
            >
                <form onSubmit={handleUpdate} className="space-y-4">
                    <Input
                        label="Nome Completo *"
                        value={formData.name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label="E-mail"
                        type="email"
                        value={formData.email}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label="Telefone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        value={formData.phone}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
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

export default PatientDetails;

