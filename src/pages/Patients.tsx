import React, { useState, useEffect, useRef, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, ChevronRight, Mail, Phone } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import { useLanguage } from '../context/LanguageContext';
import { useDependencies } from '../hooks/useDependencies';
import { formatPhoneNumber, unformatPhoneNumber, formatDate } from '../lib/utils';
import { logger } from '../lib/logger';
import { validatePatient } from '../lib/validators';
import { sanitizeText } from '../lib/sanitize';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from '../components/UI/Toast';
import Pagination from '../components/UI/Pagination';

interface Patient {
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
    last_visit?: string | null;
}

interface FormData {
    name: string;
    email: string;
    phone: string;
}

interface ValidationErrors {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
}

interface PaginationState {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

interface PaginatedResponse<T> {
    data: T[];
    pagination: PaginationState;
}

const Patients: React.FC = () => {
    const { t } = useLanguage();
    const { handleError } = useErrorHandler();
    const { showSuccess } = useToast();
    const container = useDependencies();
    const patientService = container.resolve('patientService');
    const appointmentService = container.resolve('appointmentService');
    const [patients, setPatients] = useState<Patient[]>([]);
    const [totalAppointments, setTotalAppointments] = useState<number>(0);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        email: '',
        phone: ''
    });
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });
    const navigate = useNavigate();
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const abortController = new AbortController();
        
        const loadData = async (page: number = pagination.page): Promise<void> => {
            if (abortController.signal.aborted) return;
            
            try {
                setLoading(true);
                
                const result = await patientService.getPatientsWithStats({
                    page,
                    pageSize: pagination.pageSize,
                    orderBy: 'name',
                    orderDirection: 'asc'
                });
                
                if (abortController.signal.aborted) return;
                
                setPatients(result.patients);
                setPagination(prev => ({
                    ...prev,
                    page: result.pagination.page,
                    total: result.pagination.total,
                    totalPages: result.pagination.totalPages,
                    hasNext: result.pagination.hasNext,
                    hasPrev: result.pagination.hasPrev
                }));
                setTotalAppointments(result.totalAppointments);
            } catch (error) {
                if (abortController.signal.aborted) return;
                handleError(error, 'loadPatients');
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        
        loadData();
        
        return () => {
            abortController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page]);

    const loadPatients = async (page: number = pagination.page): Promise<void> => {
        try {
            setLoading(true);
            
            // Usar método do service que retorna dados já processados
            const result = await patientService.getPatientsWithStats({
                page,
                pageSize: pagination.pageSize,
                orderBy: 'name',
                orderDirection: 'asc'
            });
            
            setPatients(result.patients);
            setPagination(prev => ({
                ...prev,
                page: result.pagination.page,
                total: result.pagination.total,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNext,
                hasPrev: result.pagination.hasPrev
            }));
            setTotalAppointments(result.totalAppointments);
        } catch (error) {
            handleError(error, 'loadPatients');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number): void => {
        setPagination(prev => ({ ...prev, page: newPage }));
        loadPatients(newPage);
    };

    // Filtro deve ser feito no service, não em memória
    const handleSearch = async (term: string): Promise<void> => {
        if (!term.trim()) {
            loadPatients(1);
            return;
        }
        
        try {
            setLoading(true);
            const result = await patientService.searchPatients({
                searchTerm: term,
                page: 1,
                pageSize: pagination.pageSize
            });
            
            setPatients(result.patients);
            setPagination(prev => ({
                ...prev,
                page: result.pagination.page,
                total: result.pagination.total,
                totalPages: result.pagination.totalPages,
                hasNext: result.pagination.hasNext,
                hasPrev: result.pagination.hasPrev
            }));
        } catch (error) {
            handleError(error, 'handleSearch');
        } finally {
            setLoading(false);
        }
    };
    

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants: Variants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-white mb-6 sm:mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{t('patients.title')}</h2>
                        <p className="text-sm sm:text-base text-white/90">{t('patients.subtitle')}</p>
                    </div>
                    <Button 
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg w-full sm:w-auto text-sm sm:text-base"
                    >
                        <User size={18} />
                        {t('patients.newPatient')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
                        <p className="text-xs sm:text-sm font-medium text-white/80 mb-1">{t('patients.totalPatients')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">{pagination.total}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
                        <p className="text-xs sm:text-sm font-medium text-white/80 mb-1">{t('patients.totalAppointments')}</p>
                        <p className="text-xl sm:text-2xl font-bold text-white">{totalAppointments}</p>
                    </div>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="relative w-full max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder={t('patients.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-base sm:text-sm min-h-[44px]"
                            value={searchTerm}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const value = e.target.value;
                                setSearchTerm(value);
                                
                                // Limpar timeout anterior
                                if (searchTimeoutRef.current) {
                                    clearTimeout(searchTimeoutRef.current);
                                }
                                
                                // Debounce: buscar após 500ms sem digitação
                                searchTimeoutRef.current = setTimeout(() => {
                                    handleSearch(value);
                                }, 500);
                            }}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter') {
                                    handleSearch(searchTerm);
                                }
                            }}
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400">{t('patients.loading')}</p>
                        </div>
                    ) : (
                        patients.map((patient) => (
                            <motion.div
                                key={patient.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => navigate(`/patients/${patient.id}`)}
                                className="flex items-center justify-between p-3 sm:p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group min-h-[70px] sm:min-h-[80px]"
                            >
                            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-sky-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold text-base sm:text-lg shadow-sm flex-shrink-0">
                                    {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors truncate">{sanitizeText(patient.name) || 'Sem nome'}</h3>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                        {patient.email && (
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400 truncate max-w-full">
                                                <Mail size={12} className="text-gray-500 dark:text-gray-500 flex-shrink-0" /> <span className="truncate">{sanitizeText(patient.email)}</span>
                                            </span>
                                        )}
                                        {patient.phone && (
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                <Phone size={12} className="text-gray-500 dark:text-gray-500 flex-shrink-0" /> {formatPhoneNumber(patient.phone)}
                                            </span>
                                        )}
                                    </div>
                                    {patient.last_visit && (
                                        <div className="sm:hidden mt-1">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                                                <Calendar size={12} className="text-gray-500 dark:text-gray-500" />
                                                {formatDate(patient.last_visit)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                                {patient.last_visit && (
                                    <div className="hidden sm:block text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('patients.lastVisit')}</p>
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                                            <Calendar size={14} className="text-gray-500 dark:text-gray-500" />
                                            {formatDate(patient.last_visit)}
                                        </div>
                                    </div>
                                )}
                                <ChevronRight className="text-gray-300 dark:text-gray-600 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors flex-shrink-0" size={20} />
                            </div>
                        </motion.div>
                        ))
                    )}
                    {patients.length === 0 && !loading && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User size={32} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('patients.noPatients')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('patients.trySearch')}</p>
                        </div>
                    )}
                </div>
                
                {!loading && pagination.totalPages > 1 && (
                    <Pagination
                        page={pagination.page}
                        totalPages={pagination.totalPages}
                        total={pagination.total}
                        pageSize={pagination.pageSize}
                        onPageChange={handlePageChange}
                        hasNext={pagination.hasNext}
                        hasPrev={pagination.hasPrev}
                    />
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', email: '', phone: '' });
                    setValidationErrors({});
                }}
                title={t('patients.newPatient')}
            >
                <form onSubmit={async (e: FormEvent<HTMLFormElement>) => {
                    e.preventDefault();
                    const dataToValidate = {
                        ...formData,
                        phone: unformatPhoneNumber(formData.phone)
                    };
                    
                    const validation = validatePatient(dataToValidate);
                    if (!validation.isValid) {
                        setValidationErrors(validation.errors);
                        return;
                    }
                    
                    setValidationErrors({});
                    
                    try {
                        const dataToSave = dataToValidate;
                        await patientService.create(dataToSave);
                        setIsModalOpen(false);
                        setFormData({ name: '', email: '', phone: '' });
                        setValidationErrors({});
                        showSuccess(t('patients.createSuccess') || 'Paciente criado com sucesso!');
                        loadPatients();
                    } catch (error) {
                        handleError(error, 'createPatient');
                    }
                }} className="space-y-4">
                    <div>
                        <Input
                            label={t('patients.fullName')}
                            value={formData.name}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, name: e.target.value });
                                if (validationErrors.name) {
                                    setValidationErrors({ ...validationErrors, name: null });
                                }
                            }}
                            required
                            className={validationErrors.name ? 'border-red-500' : ''}
                        />
                        {validationErrors.name && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                        )}
                    </div>
                    <div>
                        <Input
                            label={t('patients.email')}
                            type="email"
                            value={formData.email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                setFormData({ ...formData, email: e.target.value });
                                if (validationErrors.email) {
                                    setValidationErrors({ ...validationErrors, email: null });
                                }
                            }}
                            className={validationErrors.email ? 'border-red-500' : ''}
                        />
                        {validationErrors.email && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                        )}
                    </div>
                    <div>
                        <Input
                            label={t('patients.phone')}
                            type="tel"
                            placeholder="(11) 99999-9999"
                            maxLength={15}
                            value={formData.phone}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                setFormData({ ...formData, phone: formatted });
                                if (validationErrors.phone) {
                                    setValidationErrors({ ...validationErrors, phone: null });
                                }
                            }}
                            className={validationErrors.phone ? 'border-red-500' : ''}
                        />
                        {validationErrors.phone && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.phone}</p>
                        )}
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => {
                                setIsModalOpen(false);
                                setFormData({ name: '', email: '', phone: '' });
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('patients.savePatient')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Patients;

