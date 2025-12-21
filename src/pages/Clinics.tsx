import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { Plus, Search, Edit2, Trash2, MapPin, Phone, Mail, Building2 } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import Badge from '../components/UI/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/UI/Table';
import Pagination from '../components/UI/Pagination';
import { useLanguage } from '../context/LanguageContext';
import { useDependencies } from '../hooks/useDependencies';
import { useCurrency } from '../context/CurrencyContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from '../components/UI/Toast';
import { formatPhoneNumber, unformatPhoneNumber, formatCurrency } from '../lib/utils';
import { logger } from '../lib/logger';
import { validateClinic } from '../lib/validators';
import { sanitizeText } from '../lib/sanitize';

interface Clinic {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
}

interface ClinicStats {
    appointments: number;
    revenue: number;
    ticket: number;
}

interface FormData {
    name: string;
    address: string;
    email: string;
    phone: string;
}

interface ValidationErrors {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
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

const Clinics: React.FC = () => {
    const { t } = useLanguage();
    const { currency } = useCurrency();
    const { handleError } = useErrorHandler();
    const { showSuccess } = useToast();
    const container = useDependencies();
    const clinicService = container.resolve('clinicService');
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [clinicStats, setClinicStats] = useState<Record<string, ClinicStats>>({});
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [editingAppointment, setEditingAppointment] = useState<Clinic | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });

    const [formData, setFormData] = useState<FormData>({
        name: '',
        address: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        const abortController = new AbortController();
        
        const loadDataAsync = async (page: number = pagination.page): Promise<void> => {
            if (abortController.signal.aborted) return;
            
            try {
                setLoading(true);
                const result = await clinicService.getAll({
                    page,
                    pageSize: pagination.pageSize,
                    orderBy: 'created_at',
                    orderDirection: 'desc'
                });
                
                if (abortController.signal.aborted) return;
                
                if (result && typeof result === 'object' && 'data' in result) {
                    const paginatedResult = result as PaginatedResponse<Clinic>;
                    setClinics(paginatedResult.data || []);
                    setPagination(prev => ({
                        ...prev,
                        page: paginatedResult.pagination.page,
                        total: paginatedResult.pagination.total,
                        totalPages: paginatedResult.pagination.totalPages,
                        hasNext: paginatedResult.pagination.hasNext,
                        hasPrev: paginatedResult.pagination.hasPrev
                    }));
                } else {
                    setClinics(Array.isArray(result) ? result : []);
                }
                
                const clinicsData = result && typeof result === 'object' && 'data' in result 
                    ? (result as PaginatedResponse<Clinic>).data 
                    : (Array.isArray(result) ? result : []);
                
                if (clinicsData && clinicsData.length > 0) {
                    try {
                        const clinicIds = clinicsData.map(c => c.id);
                        const statsMap = await clinicService.getStatsBatch(clinicIds);
                        
                        if (abortController.signal.aborted) return;
                        
                        setClinicStats(statsMap);
                    } catch (error) {
                        if (abortController.signal.aborted) return;
                        logger.error(error, { context: 'loadClinicStats' });
                        const statsMap: Record<string, ClinicStats> = {};
                        clinicsData.forEach(clinic => {
                            statsMap[clinic.id] = { appointments: 0, revenue: 0, ticket: 0 };
                        });
                        setClinicStats(statsMap);
                    }
                }
            } catch (error) {
                if (abortController.signal.aborted) return;
                handleError(error, 'loadClinics');
            } finally {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            }
        };
        
        loadDataAsync();
        
        return () => {
            abortController.abort();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.page]);

    const loadClinics = async (page: number = pagination.page): Promise<void> => {
        try {
            setLoading(true);
            const result = await clinicService.getAll({
                page,
                pageSize: pagination.pageSize,
                orderBy: 'created_at',
                orderDirection: 'desc'
            });
            
            if (result && typeof result === 'object' && 'data' in result) {
                const paginatedResult = result as PaginatedResponse<Clinic>;
                setClinics(paginatedResult.data || []);
                setPagination(prev => ({
                    ...prev,
                    page: paginatedResult.pagination.page,
                    total: paginatedResult.pagination.total,
                    totalPages: paginatedResult.pagination.totalPages,
                    hasNext: paginatedResult.pagination.hasNext,
                    hasPrev: paginatedResult.pagination.hasPrev
                }));
            } else {
                setClinics(Array.isArray(result) ? result : []);
            }
            
            const clinicsData = result && typeof result === 'object' && 'data' in result 
                ? (result as PaginatedResponse<Clinic>).data 
                : (Array.isArray(result) ? result : []);
            
            if (clinicsData && clinicsData.length > 0) {
                try {
                    const clinicIds = clinicsData.map(c => c.id);
                    const statsMap = await clinicService.getStatsBatch(clinicIds);
                    setClinicStats(statsMap);
                } catch (error) {
                    logger.error(error, { context: 'loadClinicStats' });
                    const statsMap: Record<string, ClinicStats> = {};
                    clinicsData.forEach(clinic => {
                        statsMap[clinic.id] = { appointments: 0, revenue: 0, ticket: 0 };
                    });
                    setClinicStats(statsMap);
                }
            }
        } catch (error) {
            handleError(error, 'loadClinics');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number): void => {
        setPagination(prev => ({ ...prev, page: newPage }));
        loadClinics(newPage);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        
        try {
            const dataToValidate = {
                ...formData,
                phone: unformatPhoneNumber(formData.phone)
            };
            
            const validation = validateClinic(dataToValidate);
            if (!validation.isValid) {
                setValidationErrors(validation.errors);
                return;
            }
            
            setValidationErrors({});
            
            // ✅ Converter strings vazias para null antes de enviar
            const dataToSave = {
                name: dataToValidate.name,
                address: dataToValidate.address || null,
                email: dataToValidate.email || null,
                phone: dataToValidate.phone || null,
            };
            
            if (editingAppointment) {
                await clinicService.update(editingAppointment.id, dataToSave);
                setIsModalOpen(false);
                setFormData({ name: '', address: '', email: '', phone: '' });
                setEditingAppointment(null);
                setValidationErrors({});
                showSuccess(t('clinics.updateSuccess') || 'Clínica atualizada com sucesso!');
                loadClinics();
            } else {
                await clinicService.create(dataToSave);
                setIsModalOpen(false);
                setFormData({ name: '', address: '', email: '', phone: '' });
                setEditingAppointment(null);
                setValidationErrors({});
                showSuccess(t('clinics.createSuccess') || 'Clínica criada com sucesso!');
                loadClinics();
            }
        } catch (error) {
            logger.error(error, { context: 'saveClinic' });
            handleError(error, 'Clinics.saveClinic');
        }
    };

    const filteredClinics = clinics.filter(clinic =>
        clinic.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('clinics.title')}</h2>
                        <p className="text-white/90">{t('clinics.subtitle')}</p>
                    </div>
                    <Button 
                        onClick={() => setIsModalOpen(true)} 
                        className="gap-2 bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
                    >
                        <Plus size={20} />
                        {t('clinics.newClinic')}
                    </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('clinics.totalClinics')}</p>
                        <p className="text-2xl font-bold text-white">{clinics.length}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('clinics.totalAppointments')}</p>
                        <p className="text-2xl font-bold text-white">
                            {Object.values(clinicStats).reduce((sum, stats) => sum + stats.appointments, 0)}
                        </p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('clinics.averageTicket')}</p>
                        <p className="text-2xl font-bold text-white">
                            {(() => {
                                const totalRevenue = Object.values(clinicStats).reduce((sum, stats) => sum + stats.revenue, 0);
                                const totalAppointments = Object.values(clinicStats).reduce((sum, stats) => sum + stats.appointments, 0);
                                const avgTicket = totalAppointments > 0 ? totalRevenue / totalAppointments : 0;
                                return formatCurrency(Math.round(avgTicket), currency);
                            })()}
                        </p>
                    </div>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder={t('clinics.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            value={searchTerm}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('clinics.name')}</TableHead>
                            <TableHead>{t('clinics.contact')}</TableHead>
                            <TableHead>{t('clinics.address')}</TableHead>
                            <TableHead>{t('clinics.ticketAverage')}</TableHead>
                            <TableHead>{t('clinics.appointments')}</TableHead>
                            <TableHead>{t('clinics.status')}</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredClinics.map((clinic) => (
                            <TableRow key={clinic.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600">
                                            <Building2 size={20} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-900 dark:text-white">{sanitizeText(clinic.name)}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-400" />
                                            {sanitizeText(clinic.email)}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} className="text-slate-400" />
                                            {clinic.phone ? formatPhoneNumber(clinic.phone) : '-'}
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-600 text-sm">
                                        <MapPin size={14} className="text-slate-400" />
                                        {sanitizeText(clinic.address)}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="font-semibold text-slate-700 dark:text-gray-300">
                                        {formatCurrency(clinicStats[clinic.id]?.ticket ? Math.round(clinicStats[clinic.id].ticket) : 0, currency)}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="text-slate-600">{clinicStats[clinic.id]?.appointments || 0}</span>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="success">{t('clinics.active')}</Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => {
                                                setFormData({
                                                    name: clinic.name,
                                                    address: clinic.address || '',
                                                    email: clinic.email || '',
                                                    phone: clinic.phone ? formatPhoneNumber(clinic.phone) : ''
                                                });
                                                setEditingAppointment(clinic);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition-colors"
                                            title={t('clinics.edit')}
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (window.confirm(t('clinics.deleteConfirm'))) {
                                                    try {
                                                        await clinicService.delete(clinic.id);
                                                        loadClinics();
                                                    } catch (error) {
                                                        logger.error(error, { context: 'deleteClinic' });
                                                        handleError(error, 'Clinics.deleteClinic');
                                                    }
                                                }
                                            }}
                                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                                            title={t('clinics.delete')}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

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

                {filteredClinics.length === 0 && !loading && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Building2 size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('clinics.noClinics')}</h3>
                        <p className="text-slate-500 dark:text-gray-400 mt-1">{t('clinics.registerNew')}</p>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingAppointment(null);
                    setFormData({ name: '', address: '', email: '', phone: '' });
                    setValidationErrors({});
                }}
                title={editingAppointment ? t('clinics.editClinic') : t('clinics.newClinic')}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            label={t('clinics.clinicName')}
                            placeholder={t('clinics.clinicNameExample')}
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
                            label={t('clinics.address')}
                            placeholder={t('clinics.addressPlaceholder')}
                            value={formData.address}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Input
                                label={t('clinics.phone')}
                                type="tel"
                                placeholder={t('clinics.phonePlaceholder') || '(11) 99999-9999'}
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
                        <div>
                            <Input
                                label={t('clinics.email')}
                                type="email"
                                placeholder={t('clinics.emailPlaceholder') || 'contato@clinica.com'}
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
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => {
                                setIsModalOpen(false);
                                setEditingAppointment(null);
                                setFormData({ name: '', address: '', email: '', phone: '' });
                            }}
                        >
                            {t('clinics.cancel')}
                        </Button>
                        <Button type="submit">
                            {editingAppointment ? t('clinics.saveChanges') : t('clinics.saveClinic')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Clinics;

