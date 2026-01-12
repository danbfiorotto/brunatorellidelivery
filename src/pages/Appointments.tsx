import React, { useState, useEffect, useRef, FormEvent, ChangeEvent, MouseEvent } from 'react';
import { Plus, Calendar, DollarSign, User, Building2, Search, Clock, Edit2, Trash2, Upload, Mail, Phone, ArrowUp, ArrowDown } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Badge from '../components/UI/Badge';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import DateInput from '../components/UI/DateInput';
import TimeInput from '../components/UI/TimeInput';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/UI/Table';
import Pagination from '../components/UI/Pagination';
import { useLanguage } from '../context/LanguageContext';
import { useDependencies } from '../hooks/useDependencies';
import { useCurrency } from '../context/CurrencyContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { useToast } from '../components/UI/Toast';
import { CreateAppointmentDTO } from '../application/services/AppointmentService';
import { formatPhoneNumber, unformatPhoneNumber, formatCurrency, unformatCurrency, calculateReceivedValue, formatDate, formatTime } from '../lib/utils';
import { useLazyLoad } from '../lib/hooks/useLazyLoad';
import { validateImageUpload } from '../lib/fileValidation';
import { validateAppointment } from '../lib/validators';
import { isValidImageUrl, sanitizeText } from '../lib/sanitize';
import { logger } from '../lib/logger';

interface Patient {
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
}

interface Clinic {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
}

interface Procedure {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    is_active?: boolean;
    display_order?: number;
}

interface Appointment {
    id: string;
    clinic_id?: string | null;
    patient_id?: string | null;
    date: string;
    time: string;
    procedure: string;
    value: string | number;
    currency?: string;
    payment_type?: string;
    payment_percentage?: number | null;
    is_paid?: boolean;
    payment_date?: string | null;
    status: 'scheduled' | 'pending' | 'paid';
    clinical_evolution?: string | null;
    notes?: string | null;
    patients?: Patient | null;
    clinics?: Clinic | null;
}

interface AppointmentFormData {
    clinic_id: string;
    date: string;
    time: string;
    patient_name: string;
    patient_phone: string;
    patient_email: string;
    patient_id: string;
    procedure: string;
    custom_procedure: string;
    value: string;
    currency: string;
    payment_type: string;
    payment_percentage: string;
    is_paid: boolean;
    payment_date: string;
    clinical_evolution: string;
    notes: string;
    radiographs: RadiographPreview[];
}

interface RadiographPreview {
    file?: File;
    url: string;
    name: string;
    size: number;
}

interface ValidationErrors {
    date?: string | null;
    time?: string | null;
    patient?: string | null;
    value?: string | null;
    clinical_evolution?: string | null;
    notes?: string | null;
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

type SortColumn = 'patient' | 'procedure' | 'date' | 'clinic' | 'status' | '';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'scheduled' | 'pending' | 'paid';

const Appointments: React.FC = () => {
    const { t } = useLanguage();
    const { currency } = useCurrency();
    const { handleError } = useErrorHandler();
    const { showError, showSuccess, showWarning } = useToast();
    const container = useDependencies();
    const appointmentService = container.resolve('appointmentService');
    const clinicService = container.resolve('clinicService');
    const patientService = container.resolve('patientService');
    const procedureService = container.resolve('procedureService');
    const radiographService = container.resolve('radiographService');
    
    const [appointments, setAppointments] = useState<Appointment[] | PaginatedResponse<Appointment>>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [procedures, setProcedures] = useState<Procedure[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [totalStats, setTotalStats] = useState<{ received: number; pending: number; total: number; totalValue: number }>({
        received: 0,
        pending: 0,
        total: 0,
        totalValue: 0 // Total de valores (recebido + pendente)
    });
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [pagination, setPagination] = useState<PaginationState>({
        page: 1,
        pageSize: 50, // Aumentado de 20 para 50 para mostrar mais appointments por página
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
    });
    const [sortColumn, setSortColumn] = useState<SortColumn>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [uploadingFiles, setUploadingFiles] = useState<boolean>(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const patientInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [valueDisplay, setValueDisplay] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    const [formData, setFormData] = useState<AppointmentFormData>({
        clinic_id: '',
        date: '',
        time: '',
        patient_name: '',
        patient_phone: '',
        patient_email: '',
        patient_id: '',
        procedure: '',
        custom_procedure: '',
        value: '',
        currency: 'BRL',
        payment_type: '100',
        payment_percentage: '',
        is_paid: false,
        payment_date: '',
        clinical_evolution: '',
        notes: '',
        radiographs: []
    });

    // Função para carregar totais de todos os appointments (sem paginação)
    const loadTotalStats = async (): Promise<void> => {
        try {
            // Buscar todos os appointments sem paginação (usando limit alto)
            // O BaseRepository usa 1000 como padrão quando não especifica page/pageSize
            const allAppointmentsResult = await appointmentService.getAll({
                limit: 10000, // Limite alto para buscar todos
                orderBy: 'date',
                orderDirection: 'desc',
                filters: {} // Sem filtros para pegar todos
            });
            
            const allAppointments = Array.isArray(allAppointmentsResult)
                ? allAppointmentsResult
                : (allAppointmentsResult as PaginatedResponse<Appointment>)?.data || [];
            
            // Usar total da paginação se disponível (mais confiável)
            const totalCount = Array.isArray(allAppointmentsResult)
                ? allAppointments.length
                : (allAppointmentsResult as PaginatedResponse<Appointment>)?.pagination?.total || allAppointments.length;
            
            // Debug: verificar status dos appointments
            const statusCounts = allAppointments.reduce((acc, app) => {
                const status = app.status?.toString() || String(app.status);
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            console.log('loadTotalStats - Status counts', statusCounts);
            console.log('loadTotalStats - Sample appointments', allAppointments.slice(0, 5).map(app => ({
                id: app.id,
                status: app.status,
                statusType: typeof app.status,
                statusString: app.status?.toString(),
                isPaid: app.isPaid,
                value: app.value?.amount,
                paymentType: app.paymentType?.type,
                paymentPercentage: app.paymentType?.percentage
            })));
            
            const received = allAppointments
                .filter((app: Appointment) => {
                    const status = app.status?.toString() || String(app.status);
                    return status === 'paid';
                })
                .reduce((sum: number, app: Appointment) => {
                    const receivedValue = app.calculateReceivedValue();
                    return sum + receivedValue.amount;
                }, 0);
            
            // Para pendente, considerar tanto 'pending' quanto 'scheduled' (que ainda não foram pagos)
            // O valor pendente é o valor total do appointment, pois se está pendente/scheduled, não recebeu nada ainda
            const pendingAppointments = allAppointments.filter((app: Appointment) => {
                const status = app.status?.toString() || String(app.status);
                const isPending = status === 'pending' || status === 'scheduled';
                return isPending;
            });
            
            console.log('Pending appointments found', {
                count: pendingAppointments.length,
                sample: pendingAppointments.slice(0, 3).map(app => ({
                    id: app.id,
                    status: app.status?.toString(),
                    isPaid: app.isPaid,
                    value: app.value?.amount
                }))
            });
            
            const pending = pendingAppointments.reduce((sum: number, app: Appointment) => {
                const totalValue = app.value.amount;
                const status = app.status?.toString() || String(app.status);
                const isPaid = app.isPaid;
                
                // IMPORTANTE: Se o appointment está pendente/scheduled, ele NÃO está pago
                // Portanto, o valor recebido REAL é 0 (independente do tipo de pagamento)
                // O calculateReceivedValue() calcula o valor POTENCIAL que SERIA recebido se estivesse pago
                // Mas para appointments não pagos, o valor recebido REAL é sempre 0
                // O valor pendente é o valor total menos o valor recebido (que é 0 para não pagos)
                const receivedValue = 0; // Appointments pendentes não receberam nada ainda
                const pendingValue = totalValue - receivedValue;
                
                console.log('Pending calculation', {
                    id: app.id,
                    status,
                    isPaid,
                    totalValue,
                    receivedValue,
                    pendingValue,
                    paymentType: app.paymentType?.type,
                    paymentPercentage: app.paymentType?.percentage
                });
                
                // Garantir que o valor pendente não seja negativo
                return sum + Math.max(0, pendingValue);
            }, 0);
            
            // Calcular total de valores (recebido + pendente)
            const totalValue = received + pending;
            
            setTotalStats({
                received,
                pending,
                total: totalCount,
                totalValue
            });
            
            console.log('Total stats loaded', {
                received,
                pending,
                total: totalCount,
                totalValue: received + pending,
                appointmentsLoaded: allAppointments.length,
                statusCounts
            });
            
            logger.debug('Total stats loaded', {
                received,
                pending,
                total: totalCount,
                totalValue: received + pending,
                appointmentsLoaded: allAppointments.length,
                statusCounts
            });
        } catch (error) {
            logger.error(error, { context: 'loadTotalStats' });
            // Em caso de erro, manter os valores atuais
        }
    };

    useEffect(() => {
        const abortController = new AbortController();
        
        const loadDataAsync = async (page: number = pagination.page): Promise<void> => {
            if (abortController.signal.aborted) return;
            
            try {
                setLoading(true);
                const [appointmentsResult, clinicsData, patientsData, proceduresData] = await Promise.all([
                    appointmentService.getAll({
                        page,
                        pageSize: pagination.pageSize,
                        orderBy: sortColumn,
                        orderDirection: sortDirection,
                        filters: filterStatus !== 'all' ? { status: filterStatus } : {}
                    }),
                    clinicService.getAll(),
                    patientService.getAll(),
                    procedureService.getAll()
                ]);
                
                // Carregar totais em paralelo
                loadTotalStats();
                
                if (abortController.signal.aborted) return;
                
                // Debug log
                logger.debug('Appointments loaded', { 
                    result: appointmentsResult, 
                    hasData: appointmentsResult && typeof appointmentsResult === 'object' && 'data' in appointmentsResult,
                    isArray: Array.isArray(appointmentsResult),
                    dataLength: appointmentsResult && typeof appointmentsResult === 'object' && 'data' in appointmentsResult 
                        ? (appointmentsResult as PaginatedResponse<Appointment>).data?.length 
                        : Array.isArray(appointmentsResult) 
                            ? appointmentsResult.length 
                            : 0,
                    firstItem: appointmentsResult && typeof appointmentsResult === 'object' && 'data' in appointmentsResult
                        ? (appointmentsResult as PaginatedResponse<Appointment>).data?.[0]
                        : Array.isArray(appointmentsResult)
                            ? appointmentsResult[0]
                            : null
                });
                
                if (appointmentsResult && typeof appointmentsResult === 'object' && 'data' in appointmentsResult) {
                    setAppointments(appointmentsResult as PaginatedResponse<Appointment>);
                    const paginatedResult = appointmentsResult as PaginatedResponse<Appointment>;
                    setPagination(prev => ({
                        ...prev,
                        page: paginatedResult.pagination.page,
                        total: paginatedResult.pagination.total,
                        totalPages: paginatedResult.pagination.totalPages,
                        hasNext: paginatedResult.pagination.hasNext,
                        hasPrev: paginatedResult.pagination.hasPrev
                    }));
                } else {
                    setAppointments(Array.isArray(appointmentsResult) ? appointmentsResult : []);
                }
                
                // Tratar clínicas: verificar se é objeto paginado ou array
                if (clinicsData && typeof clinicsData === 'object' && 'data' in clinicsData) {
                    setClinics((clinicsData as PaginatedResponse<Clinic>).data || []);
                } else {
                    setClinics(Array.isArray(clinicsData) ? clinicsData : []);
                }
                
                // Tratar pacientes: verificar se é objeto paginado ou array
                if (patientsData && typeof patientsData === 'object' && 'data' in patientsData) {
                    setPatients((patientsData as PaginatedResponse<Patient>).data || []);
                } else {
                    setPatients(Array.isArray(patientsData) ? patientsData : []);
                }
                
                // Tratar procedimentos: verificar se é objeto paginado ou array
                if (proceduresData && typeof proceduresData === 'object' && 'data' in proceduresData) {
                    setProcedures((proceduresData as PaginatedResponse<Procedure>).data || []);
                } else {
                    setProcedures(Array.isArray(proceduresData) ? proceduresData : []);
                }
            } catch (error) {
                if (abortController.signal.aborted) return;
                logger.error(error, { context: 'Appointments.loadData' });
                handleError(error, 'loadData');
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
    }, [pagination.page, filterStatus, sortColumn, sortDirection]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent<Document> | Event): void => {
            const mouseEvent = event as MouseEvent;
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(mouseEvent.target as Node) &&
                patientInputRef.current &&
                !patientInputRef.current.contains(mouseEvent.target as Node)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside as EventListener);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside as EventListener);
        };
    }, []);

    const loadData = async (page: number = pagination.page): Promise<void> => {
        try {
            setLoading(true);
            const [appointmentsResult, clinicsData, patientsData, proceduresData] = await Promise.all([
                appointmentService.getAll({
                    page,
                    pageSize: pagination.pageSize,
                    orderBy: sortColumn,
                    orderDirection: sortDirection,
                    filters: filterStatus !== 'all' ? { status: filterStatus } : {}
                }),
                clinicService.getAll(),
                patientService.getAll(),
                procedureService.getAll()
            ]);
            
            // Se retornar objeto com paginação, extrair dados
            if (appointmentsResult && typeof appointmentsResult === 'object' && 'data' in appointmentsResult) {
                setAppointments(appointmentsResult as PaginatedResponse<Appointment>);
                const paginatedResult = appointmentsResult as PaginatedResponse<Appointment>;
                setPagination(prev => ({
                    ...prev,
                    page: paginatedResult.pagination.page,
                    total: paginatedResult.pagination.total,
                    totalPages: paginatedResult.pagination.totalPages,
                    hasNext: paginatedResult.pagination.hasNext,
                    hasPrev: paginatedResult.pagination.hasPrev
                }));
            } else {
                // Compatibilidade com retorno antigo (array)
                setAppointments(Array.isArray(appointmentsResult) ? appointmentsResult : []);
            }
            
            // Tratar clínicas: verificar se é objeto paginado ou array
            if (clinicsData && typeof clinicsData === 'object' && 'data' in clinicsData) {
                setClinics((clinicsData as PaginatedResponse<Clinic>).data || []);
            } else {
                setClinics(Array.isArray(clinicsData) ? clinicsData : []);
            }
            
            // Tratar pacientes: verificar se é objeto paginado ou array
            if (patientsData && typeof patientsData === 'object' && 'data' in patientsData) {
                setPatients((patientsData as PaginatedResponse<Patient>).data || []);
            } else {
                setPatients(Array.isArray(patientsData) ? patientsData : []);
            }
            
            // Tratar procedimentos: verificar se é objeto paginado ou array
            if (proceduresData && typeof proceduresData === 'object' && 'data' in proceduresData) {
                setProcedures((proceduresData as PaginatedResponse<Procedure>).data || []);
            } else {
                setProcedures(Array.isArray(proceduresData) ? proceduresData : []);
            }
        } catch (error) {
            handleError(error, 'loadData');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number): void => {
        setPagination(prev => ({ ...prev, page: newPage }));
        loadData(newPage);
    };

    // Se appointments for objeto com paginação, usar data diretamente (já filtrado no backend)
    const appointmentsList: Appointment[] = Array.isArray(appointments) 
        ? appointments 
        : (appointments as PaginatedResponse<Appointment>)?.data || [];
    
    // Debug log para verificar se os dados estão no estado
    useEffect(() => {
        logger.debug('Appointments state updated', {
            appointmentsType: Array.isArray(appointments) ? 'array' : 'paginated',
            appointmentsListLength: appointmentsList.length,
            firstAppointment: appointmentsList[0] ? {
                id: appointmentsList[0].id,
                procedure: appointmentsList[0].procedure,
                status: appointmentsList[0].status,
                date: appointmentsList[0].date
            } : null
        });
    }, [appointments, appointmentsList]);
    
    const filteredAppointments = appointmentsList.filter((app: Appointment) => {
        const matchesStatus = filterStatus === 'all' || app.status === filterStatus;
        const matchesSearch = !searchTerm || 
            app.patients?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.clinics?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            app.procedure?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const handleSort = (column: SortColumn): void => {
        if (sortColumn === column) {
            // Toggle direction if clicking the same column
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column and default to ascending
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const sortedAppointments = [...filteredAppointments].sort((a: Appointment, b: Appointment) => {
        if (!sortColumn) return 0;

        let aValue: string | number;
        let bValue: string | number;

        switch (sortColumn) {
            case 'patient':
                aValue = a.patients?.name || '';
                bValue = b.patients?.name || '';
                break;
            case 'procedure':
                aValue = a.procedure || '';
                bValue = b.procedure || '';
                break;
            case 'date': {
                // Combine date and time for sorting
                const aDateTime = new Date(`${a.date}T${a.time || '00:00:00'}`);
                const bDateTime = new Date(`${b.date}T${b.time || '00:00:00'}`);
                return sortDirection === 'asc' 
                    ? aDateTime.getTime() - bDateTime.getTime() 
                    : bDateTime.getTime() - aDateTime.getTime();
            }
            case 'clinic': {
                aValue = a.clinics?.name || '';
                bValue = b.clinics?.name || '';
                break;
            }
            case 'status': {
                // Sort by status order: scheduled, pending, paid
                const statusOrder: Record<string, number> = { 'scheduled': 1, 'pending': 2, 'paid': 3 };
                aValue = statusOrder[a.status] || 0;
                bValue = statusOrder[b.status] || 0;
                break;
            }
            default:
                return 0;
        }

        // For string comparisons
        if (sortColumn !== 'date' && sortColumn !== 'status') {
            aValue = String(aValue).toLowerCase();
            bValue = String(bValue).toLowerCase();
            
            if (sortDirection === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        }

        // For status (already handled above)
        if (sortColumn === 'status') {
            return sortDirection === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
        }

        return 0;
    });

    // Se há paginação do backend, usar todos os items da página atual
    // Caso contrário, usar lazy loading para listas grandes
    const isPaginated = appointments && typeof appointments === 'object' && 'pagination' in appointments;
    const { visibleItems: visibleAppointments, hasMore, loadMoreRef } = useLazyLoad<Appointment>(
        sortedAppointments,
        { 
            initialCount: isPaginated ? sortedAppointments.length : 50, // Mostrar todos se paginado, senão 50
            loadMoreCount: 20 
        }
    );

    // Usar totais do banco (totalStats) ao invés de calcular apenas da página atual
    const totalReceived = totalStats.received;
    const totalPending = totalStats.pending;

    const handleOpenModal = (appointment: Appointment | null = null): void => {
        setPatientSuggestions([]);
        setShowSuggestions(false);
        setValueDisplay('');
        
        if (appointment) {
            setEditingAppointment(appointment);
            // Check if procedure exists in the list, if not, set to "outros" and fill custom_procedure
            const procedureExists = procedures.some((p: Procedure) => p.name === appointment.procedure);
            setFormData({
                clinic_id: appointment.clinic_id || '',
                date: appointment.date || '',
                time: appointment.time || '',
                patient_name: appointment.patients?.name || '',
                patient_phone: appointment.patients?.phone ? formatPhoneNumber(appointment.patients.phone) : '',
                patient_email: appointment.patients?.email || '',
                patient_id: appointment.patient_id || '',
                procedure: procedureExists ? appointment.procedure : 'outros',
                custom_procedure: procedureExists ? '' : appointment.procedure || '',
                value: appointment.value ? String(appointment.value.amount) : '',
                currency: appointment.value.currency || 'BRL',
                payment_type: appointment.paymentType.type || '100',
                payment_percentage: appointment.paymentType.percentage ? String(appointment.paymentType.percentage) : '',
                is_paid: appointment.is_paid || appointment.status === 'paid',
                payment_date: appointment.payment_date || '',
                clinical_evolution: appointment.clinical_evolution || '',
                notes: appointment.notes || '',
                radiographs: []
            });
            // Set formatted value display for editing
            if (appointment.value) {
                const numValue = appointment.value.amount;
                if (!isNaN(numValue)) {
                    setValueDisplay(formatCurrency(numValue, appointment.value.currency || currency));
                }
            } else {
                setValueDisplay('');
            }
        } else {
            setEditingAppointment(null);
            setFormData({
                clinic_id: '',
                date: '',
                time: '',
                patient_name: '',
                patient_phone: '',
                patient_email: '',
                patient_id: '',
                procedure: '',
                custom_procedure: '',
                value: '',
                currency: currency,
                payment_type: '100',
                payment_percentage: '',
                is_paid: false,
                payment_date: '',
                clinical_evolution: '',
                notes: '',
                radiographs: []
            });
            setValueDisplay('');
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        e.stopPropagation();
        
        // Prevenir múltiplos submits
        if (isSubmitting) {
            return;
        }
        
        setIsSubmitting(true);
        
        try {
            // Prepare data for validation
        const dataToValidate = {
            date: formData.date,
            time: formData.time,
            patient_id: formData.patient_id,
            patient_name: formData.patient_name,
            value: formData.value ? parseFloat(unformatCurrency(formData.value.toString())) : 0,
            clinical_evolution: formData.clinical_evolution,
            notes: formData.notes
        };
        
        // Validate data - permitir datas passadas pois atendimentos são preenchidos após o procedimento
        const validation = validateAppointment(dataToValidate, { allowPastDates: true });
        if (!validation.isValid) {
            setValidationErrors(validation.errors);
            setIsSubmitting(false);
            return;
        }
        
        // Clear validation errors
        setValidationErrors({});
        
        // Handle custom procedure if "Outros" was selected
            let finalProcedure = formData.procedure;
            if (formData.procedure === 'outros' && formData.custom_procedure.trim()) {
                const customProcedureName = formData.custom_procedure.trim();
                
                // Check if procedure already exists
                const existingProcedure = procedures.find((p: Procedure) => 
                    p.name.toLowerCase() === customProcedureName.toLowerCase()
                );
                
                if (existingProcedure) {
                    // Use existing procedure
                    finalProcedure = existingProcedure.name;
                } else {
                    // Create new procedure
                    try {
                        const maxOrder = procedures.length > 0 
                            ? Math.max(...procedures.map((p: Procedure) => p.display_order || 0)) 
                            : 0;
                        const newProcedure = await procedureService.create({
                            name: customProcedureName,
                            display_order: maxOrder + 1,
                            is_active: true
                        });
                        finalProcedure = newProcedure.name;
                        // Reload procedures to include the new one
                        const updatedProcedures = await procedureService.getAll();
                        setProcedures(updatedProcedures);
                    } catch (error) {
                        logger.error(error, { context: 'createProcedure' });
                        showWarning(t('appointments.procedureError'));
                        finalProcedure = customProcedureName;
                    }
                }
            }
            
            // Remove phone formatting before saving
            // Ensure value is a valid number
            const valueToSave = formData.value ? parseFloat(unformatCurrency(formData.value.toString())) : 0;
            
            // Mapear para CreateAppointmentDTO
            // Converter string vazia para null/undefined para compatibilidade com schema Zod
            const dataToSave: CreateAppointmentDTO = {
                clinicId: formData.clinic_id && formData.clinic_id.trim() ? formData.clinic_id : null,
                date: formData.date,
                time: formData.time,
                patientName: formData.patient_name && formData.patient_name.trim() ? formData.patient_name.trim() : undefined,
                patientPhone: formData.patient_phone && formData.patient_phone.trim() ? unformatPhoneNumber(formData.patient_phone) : undefined,
                patientEmail: formData.patient_email && formData.patient_email.trim() ? formData.patient_email.trim() : undefined,
                patientId: formData.patient_id && formData.patient_id.trim() ? formData.patient_id : undefined,
                procedure: finalProcedure,
                value: isNaN(valueToSave) ? 0 : valueToSave,
                currency: formData.currency || 'BRL',
                paymentType: formData.payment_type || '100',
                paymentPercentage: formData.payment_percentage && formData.payment_percentage.trim() ? parseFloat(formData.payment_percentage) : null,
                isPaid: formData.is_paid || false,
                paymentDate: formData.is_paid && formData.payment_date && formData.payment_date.trim() ? formData.payment_date : null,
                clinicalEvolution: formData.clinical_evolution && formData.clinical_evolution.trim() ? formData.clinical_evolution.trim() : null,
                notes: formData.notes && formData.notes.trim() ? formData.notes.trim() : null
            };
            
            // Debug: log what's being saved
            logger.debug('Saving appointment data', {
                appointment: dataToSave,
                clinicalEvolution: dataToSave.clinicalEvolution,
                notes: dataToSave.notes
            });
            
            // Save radiographs array temporarily
            const radiographsToSave = formData.radiographs || [];
            
            let appointmentId: string;
            let patientId: string | null;
            
            if (editingAppointment) {
                const updated = await appointmentService.update(editingAppointment.id, dataToSave);
                appointmentId = updated.id;
                patientId = updated.patientId;
            } else {
                // Permitir datas passadas pois atendimentos são preenchidos após o procedimento
                const created = await appointmentService.create(dataToSave, true);
                appointmentId = created.id;
                patientId = created.patientId;
            }
            
            // Save radiographs if any were uploaded
            if (radiographsToSave.length > 0 && patientId) {
                try {
                    for (const radiograph of radiographsToSave) {
                        // Use the File object directly if available, otherwise convert from data URL
                        if (radiograph.file) {
                            // Direct file upload to Storage
                            await radiographService.uploadRadiograph(
                                patientId,
                                appointmentId,
                                radiograph.file
                            );
                        } else if (radiograph.url && radiograph.url.startsWith('data:')) {
                            // Legacy: Convert data URL to File
                            const response = await fetch(radiograph.url);
                            const blob = await response.blob();
                            const file = new File([blob], radiograph.name, { type: blob.type });
                            
                            await radiographService.uploadRadiograph(
                                patientId,
                                appointmentId,
                                file
                            );
                        } else {
                            // Already a URL (shouldn't happen, but handle it)
                            await radiographService.uploadRadiograph(
                                patientId,
                                appointmentId,
                                radiograph.url,
                                radiograph.name,
                                radiograph.size
                            );
                        }
                    }
                } catch (radiographError) {
                    logger.error(radiographError, { context: 'saveRadiographs' });
                    // Don't fail the whole operation if radiographs fail
                    showWarning(t('appointments.radiographsError') + ': ' + (radiographError as Error).message);
                }
            }
            
            setIsModalOpen(false);
            setFormData({
                clinic_id: '',
                date: '',
                time: '',
                patient_name: '',
                patient_phone: '',
                patient_email: '',
                patient_id: '',
                procedure: '',
                value: '',
                currency: currency,
                payment_type: '100',
                payment_percentage: '',
                is_paid: false,
                payment_date: '',
                clinical_evolution: '',
                notes: '',
                radiographs: []
            });
            setEditingAppointment(null);
            setValidationErrors({});
            loadData();
            // Recarregar totais após salvar/atualizar
            loadTotalStats();
        } catch (error) {
            logger.error(error, { context: 'saveAppointment' });
            handleError(error, 'Appointments.saveAppointment');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePatientNameChange = (value: string): void => {
        setFormData({ ...formData, patient_name: value });
        
        if (value.length >= 2) {
            const filtered = patients.filter((patient: Patient) =>
                patient.name?.toLowerCase().includes(value.toLowerCase())
            );
            setPatientSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setPatientSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleSelectPatient = (patient: Patient): void => {
        setFormData({
            ...formData,
            patient_name: patient.name || '',
            patient_email: patient.email || '',
            patient_phone: patient.phone ? formatPhoneNumber(patient.phone) : '',
            patient_id: patient.id
        });
        setShowSuggestions(false);
        setPatientSuggestions([]);
    };

    const handleDelete = async (id: string): Promise<void> => {
        if (window.confirm(t('appointments.deleteConfirm'))) {
            try {
                await appointmentService.delete(id);
                showSuccess(t('appointments.deleteSuccess'));
                loadData();
                // Recarregar totais após deletar
                loadTotalStats();
            } catch (error) {
                logger.error(error, { context: 'deleteAppointment' });
                handleError(error, 'Appointments.deleteAppointment');
            }
        }
    };

    const handleRadiographUpload = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Validate files with improved validation
        const validFiles: File[] = [];
        for (const file of files) {
            const validation = await validateImageUpload(file);
            if (validation.isValid) {
                validFiles.push(file);
            } else {
                showWarning(`${file.name}: ${validation.error}`);
            }
        }

        if (validFiles.length === 0) return;

        try {
            setUploadingFiles(true);
            const filePreviews: RadiographPreview[] = [];
            
            // Create previews for display (using data URLs for preview)
            for (const file of validFiles) {
                const reader = new FileReader();
                await new Promise<void>((resolve, reject) => {
                    reader.onloadend = () => {
                        filePreviews.push({
                            file: file, // Keep the original File object for upload
                            url: reader.result as string, // Data URL for preview
                            name: file.name,
                            size: file.size
                        });
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
            }

            setFormData({
                ...formData,
                radiographs: [...(formData.radiographs || []), ...filePreviews]
            });
            
            showSuccess(`${validFiles.length} ${t('appointments.filesSelectedSuccess')}`);
        } catch (error) {
            logger.error(error, { context: 'readFiles' });
            handleError(error, 'Appointments.readFiles');
        } finally {
            setUploadingFiles(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const getStatusBadge = (status: 'scheduled' | 'pending' | 'paid'): React.ReactElement => {
        switch (status) {
            case 'paid': return <Badge variant="success">{t('appointments.paid')}</Badge>;
            case 'pending': return <Badge variant="warning">{t('appointments.pending')}</Badge>;
            case 'scheduled': return <Badge variant="primary">{t('appointments.scheduled')}</Badge>;
            default: return <Badge>{t('appointments.unknown')}</Badge>;
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
        show: { opacity: 1, y: 0 }
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
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('appointments.title')}</h2>
                        <p className="text-white/90">{t('appointments.subtitle')}</p>
                    </div>
                    <Button 
                        onClick={() => handleOpenModal()} 
                        className="gap-2 bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
                    >
                        <Plus size={20} />
                        {t('appointments.newAppointment')}
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('appointments.totalReceived')}</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalReceived, currency)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('appointments.pendingValue')}</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalPending, currency)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">Total</p>
                        <p className="text-2xl font-bold text-white">{formatCurrency(totalStats.totalValue || (totalReceived + totalPending), currency)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('appointments.totalAppointments')}</p>
                        <p className="text-2xl font-bold text-white">{totalStats.total}</p>
                    </div>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-3 sm:p-4 border-b border-slate-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center bg-slate-50/50 dark:bg-gray-800/50">
                    <div className="flex gap-1 sm:gap-2 p-1 bg-slate-200/50 dark:bg-gray-700/50 rounded-xl overflow-x-auto">
                        {(['all', 'scheduled', 'pending', 'paid'] as FilterStatus[]).map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${filterStatus === status
                                        ? 'bg-white dark:bg-gray-600 text-sky-700 dark:text-sky-200 shadow-sm dark:shadow-gray-900/50 font-semibold'
                                        : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-100 hover:bg-slate-200/50 dark:hover:bg-gray-600/50'
                                    }`}
                            >
                                {status === 'all' ? t('appointments.filterAll') :
                                    status === 'paid' ? t('appointments.filterPaid') :
                                        status === 'pending' ? t('appointments.filterPending') : t('appointments.filterScheduled')}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder={t('appointments.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                            value={searchTerm}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('patient')}
                                    className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer group font-semibold"
                                    title="Ordenar por paciente"
                                >
                                    <span>Paciente</span>
                                    <div className="flex flex-col -my-0.5">
                                        <ArrowUp 
                                            size={10} 
                                            className={sortColumn === 'patient' && sortDirection === 'asc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                        <ArrowDown 
                                            size={10} 
                                            className={sortColumn === 'patient' && sortDirection === 'desc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                    </div>
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('procedure')}
                                    className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer group font-semibold"
                                    title="Ordenar por procedimento"
                                >
                                    <span>{t('appointments.procedure')}</span>
                                    <div className="flex flex-col -my-0.5">
                                        <ArrowUp 
                                            size={10} 
                                            className={sortColumn === 'procedure' && sortDirection === 'asc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                        <ArrowDown 
                                            size={10} 
                                            className={sortColumn === 'procedure' && sortDirection === 'desc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                    </div>
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('date')}
                                    className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer group font-semibold"
                                    title="Ordenar por data e hora"
                                >
                                    <span>{t('appointments.dateTime')}</span>
                                    <div className="flex flex-col -my-0.5">
                                        <ArrowUp 
                                            size={10} 
                                            className={sortColumn === 'date' && sortDirection === 'asc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                        <ArrowDown 
                                            size={10} 
                                            className={sortColumn === 'date' && sortDirection === 'desc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                    </div>
                                </button>
                            </TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('clinic')}
                                    className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer group font-semibold"
                                    title="Ordenar por clínica"
                                >
                                    <span>{t('appointments.clinic')}</span>
                                    <div className="flex flex-col -my-0.5">
                                        <ArrowUp 
                                            size={10} 
                                            className={sortColumn === 'clinic' && sortDirection === 'asc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                        <ArrowDown 
                                            size={10} 
                                            className={sortColumn === 'clinic' && sortDirection === 'desc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                    </div>
                                </button>
                            </TableHead>
                            <TableHead className="text-slate-700 dark:text-gray-200 font-semibold">Valor</TableHead>
                            <TableHead>
                                <button
                                    onClick={() => handleSort('status')}
                                    className="flex items-center gap-1.5 text-slate-700 dark:text-gray-200 hover:text-sky-600 dark:hover:text-sky-400 transition-colors cursor-pointer group font-semibold"
                                    title="Ordenar por status"
                                >
                                    <span>{t('appointments.status')}</span>
                                    <div className="flex flex-col -my-0.5">
                                        <ArrowUp 
                                            size={10} 
                                            className={sortColumn === 'status' && sortDirection === 'asc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                        <ArrowDown 
                                            size={10} 
                                            className={sortColumn === 'status' && sortDirection === 'desc' 
                                                ? 'text-sky-600 dark:text-sky-400' 
                                                : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-400'} 
                                        />
                                    </div>
                                </button>
                            </TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleAppointments.map((app: Appointment) => (
                            <TableRow key={app.id}>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-100 to-blue-100 flex items-center justify-center text-sky-700 font-bold text-xs">
                                            {app.patients?.name?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-900 dark:text-white">{sanitizeText(app.patients?.name) || 'Paciente'}</p>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <span className="font-medium text-slate-700 dark:text-gray-300">{sanitizeText(app.procedure)}</span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col text-sm">
                                        <span className="flex items-center gap-1.5 text-slate-700 dark:text-gray-300">
                                            <Calendar size={14} className="text-slate-400 dark:text-gray-500" />
                                            {formatDate(app.date)}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-gray-400 mt-0.5">
                                            <Clock size={14} className="text-slate-400 dark:text-gray-500" />
                                            {formatTime(app.time)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                                        <Building2 size={16} className="text-slate-400 dark:text-gray-500" />
                                        {sanitizeText(app.clinics?.name) || 'Clínica'}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-slate-700 dark:text-white">
                                            {formatCurrency(app.value.amount, app.value.currency || currency)}
                                        </span>
                                        {app.paymentType.type === 'percentage' && app.paymentType.percentage && (
                                            <span className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                                                Recebido: {formatCurrency(app.calculateReceivedValue().amount, app.value.currency || currency)} ({app.paymentType.percentage}%)
                                            </span>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {getStatusBadge(app.status)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => handleOpenModal(app)}
                                            className="p-2 hover:bg-sky-50 dark:hover:bg-gray-700 rounded-lg text-gray-400 dark:text-gray-500 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                                            title="Editar"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(app.id)}
                                            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {hasMore && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-4" ref={loadMoreRef}>
                                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-sky-600"></div>
                                        <span className="text-sm">Carregando mais...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                
                {/* Pagination */}
                {appointments && typeof appointments === 'object' && 'pagination' in appointments && pagination.totalPages > 1 && (
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
                
                {visibleAppointments.length === 0 && sortedAppointments.length > 0 && !loading && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                        Nenhum resultado encontrado com os filtros aplicados
                    </div>
                )}
                {sortedAppointments.length === 0 && !loading && (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Calendar size={32} className="text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('appointments.noAppointments')}</h3>
                        <p className="text-slate-500 dark:text-gray-400 mt-1">{t('appointments.tryFilters')}</p>
                    </div>
                )}
            </Card>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setValidationErrors({});
                }}
                title={editingAppointment ? t('appointments.editAppointment') : t('appointments.newAppointment')}
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">{t('appointments.clinicRequired')}</label>
                            <select
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                value={formData.clinic_id}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, clinic_id: e.target.value })}
                                required
                            >
                                <option value="">Selecione uma clínica</option>
                                {clinics.map((clinic: Clinic) => (
                                    <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <DateInput
                                label={t('appointments.appointmentDate')}
                                value={formData.date}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setFormData({ ...formData, date: e.target.value });
                                    if (validationErrors.date) {
                                        setValidationErrors({ ...validationErrors, date: null });
                                    }
                                }}
                                required
                                className={validationErrors.date ? 'border-red-500' : ''}
                            />
                            {validationErrors.date && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.date}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <TimeInput
                                label={t('appointments.time')}
                                value={formData.time}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    setFormData({ ...formData, time: e.target.value });
                                    if (validationErrors.time) {
                                        setValidationErrors({ ...validationErrors, time: null });
                                    }
                                }}
                                required
                                className={validationErrors.time ? 'border-red-500' : ''}
                            />
                            {validationErrors.time && (
                                <p className="text-red-500 text-sm mt-1">{validationErrors.time}</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                                {t('appointments.patientName')}
                            </label>
                            {validationErrors.patient && (
                                <p className="text-red-500 text-sm mb-1">{validationErrors.patient}</p>
                            )}
                            <div className="relative">
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
                                        <User size={18} />
                                    </div>
                                    <input
                                        ref={patientInputRef}
                                        type="text"
                                        className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all ${
                                            validationErrors.patient 
                                                ? 'border-red-500 dark:border-red-500' 
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                        value={formData.patient_name}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                            handlePatientNameChange(e.target.value);
                                            if (validationErrors.patient) {
                                                setValidationErrors({ ...validationErrors, patient: null });
                                            }
                                        }}
                                        onFocus={() => {
                                            if (patientSuggestions.length > 0) {
                                                setShowSuggestions(true);
                                            }
                                        }}
                                        required
                                    />
                                </div>
                                {showSuggestions && patientSuggestions.length > 0 && (
                                    <div
                                        ref={suggestionsRef}
                                        className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-auto"
                                    >
                                        {patientSuggestions.map((patient: Patient) => (
                                            <div
                                                key={patient.id}
                                                onClick={() => handleSelectPatient(patient)}
                                                className="px-4 py-3 hover:bg-sky-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-sky-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold text-sm">
                                                        {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900 dark:text-white">{patient.name}</p>
                                                        {patient.email && (
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">{patient.email}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label={t('appointments.phone')}
                            type="tel"
                            placeholder="(11) 99999-9999"
                            maxLength={15}
                            icon={<Phone size={18} />}
                            value={formData.patient_phone}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const formatted = formatPhoneNumber(e.target.value);
                                setFormData({ ...formData, patient_phone: formatted });
                            }}
                        />
                        <Input
                            label={t('appointments.email')}
                            type="email"
                            icon={<Mail size={18} />}
                            value={formData.patient_email}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, patient_email: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                            {t('appointments.procedureRequired')}
                        </label>
                        <select
                            className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                            value={formData.procedure}
                            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                const newValue = e.target.value;
                                setFormData({ 
                                    ...formData, 
                                    procedure: newValue,
                                    custom_procedure: newValue === 'outros' ? formData.custom_procedure : ''
                                });
                            }}
                            required
                        >
                            <option value="">{t('appointments.selectProcedure')}</option>
                            {procedures.map((procedure: Procedure) => (
                                <option key={procedure.id} value={procedure.name}>
                                    {procedure.name}
                                </option>
                            ))}
                            <option value="outros">{t('appointments.other')}</option>
                        </select>
                        {formData.procedure === 'outros' && (
                            <div className="mt-3">
                                <Input
                                    label={t('appointments.specifyProcedure')}
                                    placeholder={t('appointments.procedurePlaceholder')}
                                    value={formData.custom_procedure}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, custom_procedure: e.target.value })}
                                    required
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    {t('appointments.procedureAutoSave')}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                                {t('appointments.valueRequired')}
                            </label>
                            {validationErrors.value && (
                                <p className="text-red-500 text-sm mb-1">{validationErrors.value}</p>
                            )}
                            <div className="relative">
                                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10">
                                    <DollarSign size={18} />
                                </div>
                                <input
                                    type="text"
                                    className={`w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all ${
                                        validationErrors.value 
                                            ? 'border-red-500 dark:border-red-500' 
                                            : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                    placeholder={formatCurrency(0, formData.currency || currency)}
                                    value={valueDisplay}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                        const inputValue = e.target.value;
                                        
                                        const currentCurrency = formData.currency || currency;
                                        const currencySymbol = currentCurrency === 'BRL' ? 'R$' : currentCurrency === 'USD' ? '$' : '€';
                                        
                                        // If empty, clear everything
                                        if (inputValue === '' || inputValue === currencySymbol || inputValue === currencySymbol + ' ') {
                                            setValueDisplay('');
                                            setFormData({ ...formData, value: '' });
                                            return;
                                        }
                                        
                                        // Remove currency symbols, spaces, and formatting characters
                                        let cleaned = inputValue
                                            .replace(/R\$/g, '')
                                            .replace(/\$/g, '')
                                            .replace(/€/g, '')
                                            .replace(/\s/g, '')
                                            .replace(/\./g, ''); // Remove thousand separators
                                        
                                        // Allow only numbers and one comma (for decimal)
                                        cleaned = cleaned.replace(/[^\d,]/g, '');
                                        
                                        // Ensure only one comma (decimal separator)
                                        const commaCount = (cleaned.match(/,/g) || []).length;
                                        if (commaCount > 1) {
                                            // Keep only the first comma
                                            const firstCommaIndex = cleaned.indexOf(',');
                                            cleaned = cleaned.substring(0, firstCommaIndex + 1) + cleaned.substring(firstCommaIndex + 1).replace(/,/g, '');
                                        }
                                        
                                        // Limit to 2 decimal places after comma
                                        if (cleaned.includes(',')) {
                                            const parts = cleaned.split(',');
                                            if (parts[1] && parts[1].length > 2) {
                                                cleaned = parts[0] + ',' + parts[1].substring(0, 2);
                                            }
                                        }
                                        
                                        // Update display value (raw input - just numbers and comma)
                                        setValueDisplay(cleaned);
                                        
                                        // Convert to number for storage (treat comma as decimal)
                                        const numString = cleaned.replace(',', '.');
                                        const numValue = parseFloat(numString);
                                        
                                        if (!isNaN(numValue) && numValue >= 0) {
                                            setFormData({ ...formData, value: numValue.toString() });
                                        } else if (cleaned === '' || cleaned === ',') {
                                            setFormData({ ...formData, value: '' });
                                        }
                                    }}
                                    onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
                                        // Format on blur
                                        if (formData.value) {
                                            const numValue = parseFloat(formData.value);
                                            if (!isNaN(numValue) && numValue >= 0) {
                                                setValueDisplay(formatCurrency(numValue, formData.currency || currency));
                                                setFormData({ ...formData, value: numValue.toString() });
                                            } else {
                                                setValueDisplay('');
                                                setFormData({ ...formData, value: '' });
                                            }
                                        } else {
                                            setValueDisplay('');
                                        }
                                    }}
                                    onFocus={(e: React.FocusEvent<HTMLInputElement>) => {
                                        // Show raw value when focused for easier editing
                                        if (formData.value) {
                                            const numValue = parseFloat(formData.value);
                                            if (!isNaN(numValue)) {
                                                // Show as number with comma as decimal separator
                                                const parts = numValue.toString().split('.');
                                                if (parts.length === 2) {
                                                    setValueDisplay(parts[0] + ',' + parts[1]);
                                                } else {
                                                    setValueDisplay(parts[0]);
                                                }
                                            }
                                        } else {
                                            setValueDisplay('');
                                        }
                                    }}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">Moeda</label>
                            <select
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                value={formData.currency}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, currency: e.target.value })}
                            >
                                <option value="BRL">Real (R$)</option>
                                <option value="USD">Dólar ($)</option>
                                <option value="EUR">Euro (€)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">{t('appointments.paymentType')}</label>
                            <select
                                className="w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all"
                                value={formData.payment_type}
                                onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, payment_type: e.target.value })}
                            >
                                <option value="100">100%</option>
                                <option value="percentage">{t('appointments.percentage')}</option>
                            </select>
                        </div>
                    </div>

                    {formData.payment_type === 'percentage' && (
                        <div className="space-y-3">
                            <Input
                                label={t('appointments.percentageValue')}
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.payment_percentage}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, payment_percentage: e.target.value })}
                            />
                            {formData.value && formData.payment_percentage && (
                                <div className="p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-sky-700 dark:text-sky-300">{t('appointments.totalValue')}</span>
                                        <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">
                                            {formatCurrency(parseFloat(formData.value || '0'), formData.currency || currency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-medium text-sky-700 dark:text-sky-300">{t('appointments.percentageValue')}</span>
                                        <span className="text-sm font-semibold text-sky-900 dark:text-sky-200">{formData.payment_percentage}%</span>
                                    </div>
                                    <div className="pt-2 border-t border-sky-200 dark:border-sky-800 flex justify-between items-center">
                                        <span className="text-sm font-bold text-sky-900 dark:text-sky-200">{t('appointments.amountToReceive')}</span>
                                        <span className="text-lg font-bold text-sky-900 dark:text-sky-200">
                                            {formatCurrency((parseFloat(formData.value || '0') * parseFloat(formData.payment_percentage || '0')) / 100, formData.currency || currency)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="is_paid"
                                className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-sky-600 dark:text-sky-400 focus:ring-sky-500 bg-white dark:bg-gray-800"
                                checked={formData.is_paid}
                                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                    const isPaid = e.target.checked;
                                    // Se marcar e não tiver data de pagamento, usar a data do atendimento
                                    // Se desmarcar, limpar data de pagamento
                                    const newPaymentDate = isPaid 
                                        ? (formData.payment_date || formData.date || '') 
                                        : '';
                                    
                                    setFormData({ 
                                        ...formData, 
                                        is_paid: isPaid,
                                        payment_date: newPaymentDate
                                    });
                                    
                                    // Focar no campo de data de pagamento se marcado
                                    if (isPaid) {
                                        setTimeout(() => {
                                            const paymentDateInput = document.querySelector('#payment_date_input') as HTMLInputElement;
                                            if (paymentDateInput) {
                                                paymentDateInput.focus();
                                            }
                                        }, 0);
                                    }
                                }}
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                    // Permitir marcar/desmarcar com Enter ou Space
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        const isPaid = !formData.is_paid;
                                        const newPaymentDate = isPaid 
                                            ? (formData.payment_date || formData.date || '') 
                                            : '';
                                        
                                        setFormData({ 
                                            ...formData, 
                                            is_paid: isPaid,
                                            payment_date: newPaymentDate
                                        });
                                        
                                        // Focar no campo de data de pagamento se marcado, senão no próximo campo
                                        setTimeout(() => {
                                            if (isPaid) {
                                                const paymentDateInput = document.querySelector('#payment_date_input') as HTMLInputElement;
                                                if (paymentDateInput) {
                                                    paymentDateInput.focus();
                                                }
                                            } else {
                                                // Focar no próximo campo após o checkbox
                                                const nextField = document.querySelector('#clinical_evolution') as HTMLTextAreaElement;
                                                if (nextField) {
                                                    nextField.focus();
                                                }
                                            }
                                        }, 0);
                                    }
                                }}
                            />
                                <label htmlFor="is_paid" className="text-sm font-medium text-slate-700 dark:text-gray-300">
                                Pagamento realizado?
                            </label>
                        </div>
                        
                        {formData.is_paid && (
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                                    {t('appointments.paymentDate')}
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                                        (Quando o dinheiro foi recebido)
                                    </span>
                                </label>
                                <DateInput
                                    id="payment_date_input"
                                    key={`payment-date-${formData.is_paid}-${formData.payment_date || formData.date || ''}`}
                                    value={formData.payment_date || formData.date || ''}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, payment_date: e.target.value })}
                                    required={formData.is_paid}
                                    className="mb-0"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Ex: Se o atendimento foi em janeiro mas o pagamento veio em fevereiro (dia 10), informe a data de fevereiro aqui.
                                </p>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                            {t('appointments.clinicalEvolution')}
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                                ({formData.clinical_evolution?.length || 0} / 10.000 caracteres)
                            </span>
                        </label>
                        <textarea
                            id="clinical_evolution"
                            className={`w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all min-h-[120px] resize-y ${
                                validationErrors.clinical_evolution 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-gray-200 dark:border-gray-700'
                            } ${
                                formData.clinical_evolution?.length && formData.clinical_evolution.length > 9000 
                                    ? 'border-amber-500 dark:border-amber-500' 
                                    : ''
                            }`}
                            placeholder={t('appointments.clinicalEvolutionPlaceholder')}
                            value={formData.clinical_evolution}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                                setFormData({ ...formData, clinical_evolution: e.target.value });
                                if (validationErrors.clinical_evolution) {
                                    setValidationErrors({ ...validationErrors, clinical_evolution: null });
                                }
                            }}
                            maxLength={10000}
                        />
                        {validationErrors.clinical_evolution && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.clinical_evolution}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">
                            {t('appointments.notes')}
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-normal ml-2">
                                ({formData.notes?.length || 0} / 5.000 caracteres)
                            </span>
                        </label>
                        <textarea
                            className={`w-full px-4 py-3 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all min-h-[80px] resize-y ${
                                validationErrors.notes 
                                    ? 'border-red-500 dark:border-red-500' 
                                    : 'border-gray-200 dark:border-gray-700'
                            } ${
                                formData.notes?.length && formData.notes.length > 4500 
                                    ? 'border-amber-500 dark:border-amber-500' 
                                    : ''
                            }`}
                            placeholder={t('appointments.notesPlaceholder')}
                            value={formData.notes}
                            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                                setFormData({ ...formData, notes: e.target.value });
                                if (validationErrors.notes) {
                                    setValidationErrors({ ...validationErrors, notes: null });
                                }
                            }}
                            maxLength={5000}
                        />
                        {validationErrors.notes && (
                            <p className="text-red-500 text-sm mt-1">{validationErrors.notes}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2">{t('appointments.radiographs')}</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={handleRadiographUpload}
                        />
                        <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:border-sky-300 dark:hover:border-sky-600 transition-colors">
                            <Upload className="mx-auto text-gray-400 dark:text-gray-500 mb-2" size={32} />
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('appointments.uploadRadiographs')}</p>
                            <div className="flex justify-center">
                                <Button 
                                    variant="secondary" 
                                    type="button" 
                                    className="text-sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingFiles}
                                >
                                    {uploadingFiles ? t('appointments.uploading') : t('appointments.selectFiles')}
                                </Button>
                            </div>
                            {formData.radiographs && formData.radiographs.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    <p className="text-xs font-semibold text-sky-600 dark:text-sky-400">
                                        {formData.radiographs.length} {t('appointments.filesSelected')}
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {formData.radiographs.map((radio: RadiographPreview, index: number) => (
                                            <div 
                                                key={index}
                                                className="relative group border-2 border-sky-200 dark:border-sky-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800"
                                            >
                                                {isValidImageUrl(radio.url) && (
                                                    <img 
                                                        src={radio.url} 
                                                        alt={radio.name}
                                                        className="w-full h-24 object-cover"
                                                    />
                                                )}
                                                {!isValidImageUrl(radio.url) && (
                                                    <div className="w-full h-24 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                                        <span className="text-gray-500">Imagem inválida</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newRadiographs = formData.radiographs.filter((_, i: number) => i !== index);
                                                            setFormData({ ...formData, radiographs: newRadiographs });
                                                        }}
                                                        className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-medium"
                                                        title="Remover"
                                                    >
                                                        {t('appointments.remove')}
                                                    </button>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                                                    {radio.name}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => setIsModalOpen(false)}
                        >
                            {t('appointments.cancel')}
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting 
                                ? t('common.saving') || 'Salvando...' 
                                : editingAppointment 
                                    ? t('appointments.saveChanges') 
                                    : t('appointments.saveAppointment')
                            }
                        </Button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Appointments;

