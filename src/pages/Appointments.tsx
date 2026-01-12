import React, { useState, useEffect, useRef, useCallback, FormEvent, ChangeEvent, MouseEvent } from 'react';
import { Plus, Calendar, DollarSign, User, Building2, Search, Clock, Edit2, Trash2, Upload, Mail, Phone, ArrowUp, ArrowDown, Wifi, WifiOff } from 'lucide-react';
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
import { IAuthClient } from '../infrastructure/auth/IAuthClient';
import { AuthenticationError } from '../domain/errors/AppError';
import { useSessionManager } from '../hooks/useSessionManager';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import { withTimeout, TimeoutError, AbortedError } from '../lib/fetchWithTimeout';

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

interface AppointmentFormData extends Record<string, unknown> {
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
    const formRef = useRef<HTMLFormElement>(null);
    const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
    const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
    const patientInputRef = useRef<HTMLInputElement>(null);
    const suggestionsRef = useRef<HTMLDivElement>(null);
    const [valueDisplay, setValueDisplay] = useState<string>('');
    const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
    
    // Estado inicial do formulário
    const initialFormData: AppointmentFormData = {
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
        currency: currency || 'BRL',
        payment_type: '100',
        payment_percentage: '',
        is_paid: false,
        payment_date: '',
        clinical_evolution: '',
        notes: '',
        radiographs: []
    };
    
    const [formData, setFormData] = useState<AppointmentFormData>(initialFormData);
    
    // Ref para rastrear dados do formulário para salvar rascunho (sem causar re-renders)
    const formDataRef = useRef<AppointmentFormData>(initialFormData);
    
    // Atualizar ref sempre que formData mudar (sem causar re-render)
    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);
    
    // Persistência de rascunho do formulário (apenas restore/clear, sem auto-save para evitar flickering)
    const formDraftKey = editingAppointment ? `appointment_edit_${editingAppointment.id}` : 'appointment_create';
    const storageKey = `form_draft_${formDraftKey}`;
    
    // Função para limpar rascunho (declarada primeiro para ser usada em saveDraft)
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            logger.debug('Appointments - Draft cleared', { key: formDraftKey });
        } catch (error) {
            logger.error(error, { context: 'clearDraft' });
        }
    }, [storageKey, formDraftKey]);
    
    // Função para salvar rascunho manualmente
    const saveDraft = useCallback(() => {
        if (!isModalOpen) return;
        
        // Não salvar se o formulário estiver vazio (após salvar com sucesso)
        const currentData = formDataRef.current;
        const isEmpty = !currentData.patient_name && 
                       !currentData.date && 
                       !currentData.procedure && 
                       !currentData.value;
        
        if (isEmpty) {
            // Se estiver vazio, limpar rascunho em vez de salvar
            clearDraft();
            return;
        }
        
        try {
            const serialized = JSON.stringify(currentData);
            localStorage.setItem(storageKey, serialized);
            logger.debug('Appointments - Draft saved manually', { key: formDraftKey });
        } catch (error) {
            logger.error(error, { context: 'saveDraft' });
        }
    }, [isModalOpen, storageKey, formDraftKey, clearDraft]);
    
    // Função para restaurar rascunho
    const restoreDraft = useCallback(() => {
        if (!isModalOpen) return;
        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored) as AppointmentFormData;
                logger.debug('Appointments - Draft restored', { key: formDraftKey });
                setFormData(parsed);
                formDataRef.current = parsed;
            }
        } catch (error) {
            logger.error(error, { context: 'restoreDraft' });
            localStorage.removeItem(storageKey);
        }
    }, [isModalOpen, storageKey, formDraftKey]);
    
    // Salvar rascunho apenas quando modal fecha ou página esconde (não a cada keystroke)
    useEffect(() => {
        if (!isModalOpen) {
            // Quando modal fecha, verificar se formulário está vazio
            // Se estiver vazio, limpar rascunho (foi salvo com sucesso)
            const isEmpty = !formDataRef.current.patient_name && 
                           !formDataRef.current.date && 
                           !formDataRef.current.procedure && 
                           !formDataRef.current.value;
            
            if (isEmpty) {
                clearDraft();
            }
            return;
        }
        
        // Salvar periodicamente apenas quando modal está aberto (a cada 30 segundos)
        const saveInterval = setInterval(() => {
            saveDraft();
        }, 30000); // Salvar a cada 30 segundos
        
        return () => {
            clearInterval(saveInterval);
            // Salvar ao desmontar apenas se houver dados
            const hasData = formDataRef.current.patient_name || 
                          formDataRef.current.date || 
                          formDataRef.current.procedure || 
                          formDataRef.current.value;
            
            if (hasData) {
                saveDraft();
            }
        };
    }, [isModalOpen, saveDraft, clearDraft]);
    
    // AbortControllers para requisições pendentes
    const abortControllersRef = useRef<Map<string, AbortController>>(new Map());
    
    // Upload de radiografias será feito após criar o appointment
    // Mantemos os File objects no formData para upload posterior
    
    // Fila offline
    const offlineQueue = useOfflineQueue({
        syncCreate: async (operation) => {
            const data = operation.data as CreateAppointmentDTO;
            await appointmentService.create(data, true);
        },
        syncUpdate: async (operation) => {
            const { id, data } = operation.data as { id: string; data: CreateAppointmentDTO };
            await appointmentService.update(id, data);
        },
        onSynced: () => {
            showSuccess('Atendimento sincronizado com sucesso!');
            loadData();
            loadTotalStats();
        },
    });
    
    // Gerenciamento de sessão e visibilidade
    useSessionManager({
        onResetStates: () => {
            logger.debug('Appointments - Resetting states on visibility change');
            setIsSubmitting(false);
        },
        onReinitializeServices: () => {
            logger.debug('Appointments - Reinitializing services after session refresh');
            // Os serviços são obtidos via container.resolve, então não precisam ser reobtidos
            // Mas podemos forçar refresh de dados
            loadData().catch(err => logger.error(err, { context: 'loadData after session refresh' }));
        },
        onPageHide: () => {
            logger.debug('Appointments - Page hiding, aborting requests and saving draft');
            // Abortar todas as requisições pendentes
            abortControllersRef.current.forEach((controller, key) => {
                if (!controller.signal.aborted) {
                    controller.abort();
                    logger.debug('Appointments - Request aborted', { key });
                }
            });
            abortControllersRef.current.clear();
            
            // Salvar rascunho
            saveDraft();
        },
        onPageRestored: () => {
            logger.debug('Appointments - Page restored from BFCache');
            // Restaurar rascunho apenas se o modal estiver aberto
            // Isso garante que os dados sejam recuperados apenas quando necessário
            if (isModalOpen) {
                restoreDraft();
                
                // Revalidar formulário
                if (formRef.current) {
                    requestAnimationFrame(() => {
                        formRef.current?.reportValidity();
                    });
                }
            }
        },
    });

    // Função para carregar totais de todos os appointments via RPC (otimizado)
    // Usa cálculo server-side ao invés de buscar milhares de registros
    const loadTotalStats = async (): Promise<void> => {
        try {
            const totals = await appointmentService.getTotals();
            
            setTotalStats({
                received: totals.received,
                pending: totals.pending,
                total: totals.total,
                totalValue: totals.totalValue
            });
            
            logger.debug('Total stats loaded via RPC', {
                ...totals
            });
        } catch (error) {
            logger.error(error, { context: 'loadTotalStats' });
            // Em caso de erro, manter os valores atuais
        }
    };

    // Timeout de segurança para garantir que isSubmitting seja resetado
    useEffect(() => {
        if (isSubmitting) {
            // Limpar timeout anterior se existir
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
            }
            
            // Definir timeout de segurança (30 segundos)
            submitTimeoutRef.current = setTimeout(() => {
                logger.warn('Submit timeout: forcing isSubmitting to false');
                setIsSubmitting(false);
                submitTimeoutRef.current = null;
            }, 30000);
            
            return () => {
                if (submitTimeoutRef.current) {
                    clearTimeout(submitTimeoutRef.current);
                    submitTimeoutRef.current = null;
                }
            };
        } else {
            // Limpar timeout se não estiver mais submetendo
            if (submitTimeoutRef.current) {
                clearTimeout(submitTimeoutRef.current);
                submitTimeoutRef.current = null;
            }
        }
    }, [isSubmitting]);

    // Listener para quando o app volta do background - renovar sessão se necessário
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible') {
                // App voltou ao foreground, renovar sessão se necessário
                try {
                    const authClient = container.resolve<IAuthClient>('authClient');
                    const refreshedSession = await authClient.refreshSession();
                    if (refreshedSession) {
                        logger.debug('Session refreshed after app visibility change');
                    } else {
                        logger.debug('No session to refresh after visibility change');
                    }
                } catch (error) {
                    logger.warn('Failed to refresh session after visibility change', { error });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [container]);

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
            const editFormData: AppointmentFormData = {
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
                currency: appointment.value?.currency || 'BRL',
                payment_type: appointment.paymentType?.type || '100',
                payment_percentage: appointment.paymentType?.percentage ? String(appointment.paymentType.percentage) : '',
                is_paid: appointment.is_paid || appointment.status === 'paid',
                payment_date: appointment.payment_date || '',
                clinical_evolution: appointment.clinical_evolution || '',
                notes: appointment.notes || '',
                radiographs: []
            };
            
            setFormData(editFormData);
            
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
            // Sempre começar com formulário limpo quando abrir modal normalmente
            // O rascunho só será restaurado se a página for restaurada do BFCache (via onPageRestored)
            const newFormData = { ...initialFormData, currency: currency || 'BRL' };
            setFormData(newFormData);
            setValueDisplay('');
        }
        setIsModalOpen(true);
    };

    // Função de submit reutilizável que pode ser chamada de diferentes formas
    const performSubmit = async (): Promise<void> => {
        // Prevenir múltiplos submits
        if (isSubmitting) {
            logger.debug('Submit blocked: already submitting');
            return;
        }
        
        logger.debug('Starting submit process', { 
            formData: {
                date: formData.date,
                time: formData.time,
                patient_name: formData.patient_name,
                procedure: formData.procedure
            }
        });
        
        setIsSubmitting(true);
        
        // Criar AbortController para esta operação
        const operationId = `save_${Date.now()}`;
        const abortController = new AbortController();
        abortControllersRef.current.set(operationId, abortController);
        
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
        logger.debug('Validating appointment data', { dataToValidate });
        const validation = validateAppointment(dataToValidate, { allowPastDates: true });
        if (!validation.isValid) {
            logger.warn('Validation failed', { errors: validation.errors });
            setValidationErrors(validation.errors);
            setIsSubmitting(false);
            // Mostrar erro visual para o usuário
            showError('Por favor, preencha todos os campos obrigatórios corretamente.');
            return;
        }
        logger.debug('Validation passed');
        
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
            
            // Verificar conectividade ANTES de tentar salvar
            if (!offlineQueue.isOnline) {
                showWarning('Você está offline. O atendimento será salvo localmente e sincronizado quando houver conexão.');
                
                // Salvar na fila offline
                const isEditing = !!editingAppointment;
                if (isEditing) {
                    await offlineQueue.queueOperation('update', 'appointment', {
                        id: editingAppointment.id,
                        data: dataToSave
                    });
                } else {
                    await offlineQueue.queueOperation('create', 'appointment', dataToSave);
                }
                
                // Limpar rascunho e fechar modal
                clearDraft();
                setIsModalOpen(false);
                setIsSubmitting(false);
                abortControllersRef.current.delete(operationId);
                return;
            }
            
            // Revalidar sessão ANTES de tentar salvar (preventivo)
            try {
                const authClient = container.resolve<IAuthClient>('authClient');
                const session = await authClient.getSession();
                
                if (!session?.user) {
                    logger.warn('No session found, attempting refresh');
                    showWarning('Sua sessão expirou. Renovando automaticamente...');
                    
                    const refreshed = await authClient.refreshSession();
                    if (!refreshed) {
                        throw new Error('Não foi possível renovar a sessão. Por favor, faça login novamente.');
                    }
                    
                    showSuccess('Sessão renovada com sucesso!');
                }
            } catch (sessionError) {
                logger.error(sessionError, { context: 'performSubmit.sessionValidation' });
                showError('Erro ao validar sessão. Por favor, tente novamente.');
                setIsSubmitting(false);
                abortControllersRef.current.delete(operationId);
                return;
            }
            
            // Save radiographs array temporarily
            // Incluir todas as radiografias (serão enviadas após criar appointment)
            const radiographsToSave = formData.radiographs || [];
            
            let appointmentId: string;
            let patientId: string | null;
            const isEditing = !!editingAppointment;
            
            // Função auxiliar para tentar criar/atualizar com timeout e AbortController
            const attemptSave = async (signal: AbortSignal): Promise<{ appointmentId: string; patientId: string | null }> => {
                // Verificar se foi abortado antes de começar
                if (signal.aborted) {
                    throw new AbortedError('Operação foi cancelada');
                }
                
                if (isEditing) {
                    logger.debug('Updating appointment', { appointmentId: editingAppointment!.id });
                    const updated = await appointmentService.update(editingAppointment!.id, dataToSave);
                    logger.debug('Appointment updated successfully', { appointmentId: updated.id });
                    return { appointmentId: updated.id, patientId: updated.patientId };
                } else {
                    logger.debug('Creating new appointment');
                    // Permitir datas passadas pois atendimentos são preenchidos após o procedimento
                    const created = await appointmentService.create(dataToSave, true);
                    logger.debug('Appointment created successfully', { appointmentId: created.id });
                    return { appointmentId: created.id, patientId: created.patientId };
                }
            };

            try {
                            // Envolver com timeout e AbortController
                const result = await withTimeout(
                    async (signal) => {
                        if (signal.aborted) {
                            throw new AbortedError('Operação foi cancelada');
                        }
                        return await attemptSave(signal);
                    },
                    {
                        timeout: 30000, // 30 segundos
                        abortController,
                        onTimeout: () => {
                            showWarning('A operação está demorando mais que o esperado...');
                        },
                        onAbort: () => {
                            logger.debug('Save operation aborted');
                        }
                    }
                );
                
                appointmentId = result.appointmentId;
                patientId = result.patientId;
            } catch (saveError) {
                // Limpar AbortController
                abortControllersRef.current.delete(operationId);
                
                // Tratar erros específicos
                if (saveError instanceof AbortedError) {
                    logger.debug('Save operation was aborted');
                    setIsSubmitting(false);
                    return;
                }
                
                if (saveError instanceof TimeoutError) {
                    logger.error(saveError, { context: 'performSubmit.timeout' });
                    showError('A operação demorou muito. Por favor, tente novamente.');
                    setIsSubmitting(false);
                    return;
                }
                // Verificar se é erro de autenticação
                const errorMessage = saveError instanceof Error ? saveError.message : String(saveError);
                const isAuthError = saveError instanceof AuthenticationError || 
                    errorMessage.includes('não autenticado') || 
                    errorMessage.includes('authentication') ||
                    errorMessage.includes('Unauthorized') ||
                    errorMessage.includes('401');
                
                if (isAuthError) {
                    logger.warn('Authentication error detected, attempting to refresh session', { error: saveError });
                    
                    try {
                        // Tentar renovar sessão
                        const authClient = container.resolve<IAuthClient>('authClient');
                        const refreshedSession = await authClient.refreshSession();
                        
                        if (refreshedSession) {
                            logger.debug('Session refreshed successfully, retrying save operation');
                            
                            // Criar novo AbortController para retry
                            const retryController = new AbortController();
                            abortControllersRef.current.set(`${operationId}_retry`, retryController);
                            
                            // Tentar novamente após renovar sessão com timeout
                            const result = await withTimeout(
                                async (signal) => {
                                    if (signal.aborted) {
                                        throw new AbortedError('Operação foi cancelada');
                                    }
                                    return await attemptSave(signal);
                                },
                                {
                                    timeout: 30000,
                                    abortController: retryController,
                                }
                            );
                            
                            appointmentId = result.appointmentId;
                            patientId = result.patientId;
                            
                            abortControllersRef.current.delete(`${operationId}_retry`);
                        } else {
                            throw new Error('Não foi possível renovar a sessão. Por favor, faça login novamente.');
                        }
                    } catch (refreshError) {
                        logger.error(refreshError, { context: 'sessionRefresh' });
                        showError('Sua sessão expirou. Por favor, faça login novamente.');
                        setIsSubmitting(false);
                        return;
                    }
                } else {
                    // Se não for erro de autenticação, propagar o erro normalmente
                    throw saveError;
                }
            }
            
            // Limpar AbortController após sucesso
            abortControllersRef.current.delete(operationId);
            
            // Associar radiografias já enviadas ao appointment
            // Fazer upload de radiografias após criar/atualizar appointment
            // Usar apenas File objects (não URLs já salvas, pois não temos patientId antes)
            if (radiographsToSave.length > 0 && patientId) {
                try {
                    // Filtrar apenas radiografias com File objects
                    const filesToUpload = radiographsToSave.filter((r: RadiographPreview) => r.file);
                    
                    for (const radiograph of filesToUpload) {
                        if (radiograph.file) {
                            // Upload com timeout e AbortController
                            await withTimeout(
                                async (signal) => {
                                    if (signal.aborted) {
                                        throw new AbortedError('Upload cancelado');
                                    }
                                    
                                    await radiographService.uploadRadiograph(
                                        patientId,
                                        appointmentId,
                                        radiograph.file!
                                    );
                                },
                                {
                                    timeout: 60000, // 60s para uploads
                                    abortController,
                                    onTimeout: () => {
                                        logger.warn('Radiograph upload timeout', { fileName: radiograph.name });
                                    },
                                }
                            );
                        }
                    }
                } catch (radiographError) {
                    logger.error(radiographError, { context: 'saveRadiographs' });
                    // Don't fail the whole operation if radiographs fail
                    if (radiographError instanceof TimeoutError) {
                        showWarning('Upload de radiografias demorou muito, mas o atendimento foi salvo.');
                    } else if (radiographError instanceof AbortedError) {
                        logger.debug('Radiograph upload was aborted');
                    } else {
                        showWarning(t('appointments.radiographsError') + ': ' + (radiographError as Error).message);
                    }
                }
            }
            
            // Limpar rascunho e formulário ANTES de fechar modal
            clearDraft();
            setFormData({ ...initialFormData, currency: currency || 'BRL' });
            setEditingAppointment(null);
            setValidationErrors({});
            setValueDisplay('');
            
            // Fechar modal após limpar tudo
            setIsModalOpen(false);
            
            // Resetar estado de submit ANTES de operações assíncronas
            setIsSubmitting(false);
            
            // Mostrar mensagem de sucesso
            showSuccess(
                isEditing 
                    ? t('appointments.updateSuccess') || 'Atendimento atualizado com sucesso!'
                    : t('appointments.createSuccess') || 'Atendimento criado com sucesso!'
            );
            
            // Recarregar dados de forma assíncrona e não-bloqueante
            // Usar setTimeout para garantir que o estado seja atualizado primeiro
            setTimeout(() => {
                loadData().catch((error) => {
                    logger.error(error, { context: 'loadData after save' });
                });
                loadTotalStats().catch((error) => {
                    logger.error(error, { context: 'loadTotalStats after save' });
                });
            }, 100);
            
        } catch (error) {
            // Limpar AbortController em caso de erro
            abortControllersRef.current.delete(operationId);
            
            logger.error(error, { context: 'saveAppointment' });
            
            // Sempre resetar estado, mesmo em caso de erro
            setIsSubmitting(false);
            
            // Tratar erros específicos com mensagens claras
            if (error instanceof TimeoutError) {
                showError('A operação demorou muito. Por favor, verifique sua conexão e tente novamente.');
            } else if (error instanceof AbortedError) {
                logger.debug('Save operation was aborted');
                // Não mostrar erro se foi abortado intencionalmente
            } else {
                try {
                    handleError(error, 'Appointments.saveAppointment');
                } catch (handleErrorException) {
                    // Se handleError lançar uma exceção, logar mas não falhar
                    logger.error(handleErrorException, { context: 'handleError in saveAppointment' });
                    showError('Erro ao salvar atendimento. Por favor, tente novamente.');
                }
            }
        }
    };

    // Handler para o evento onSubmit do formulário
    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();
        e.stopPropagation();
        logger.debug('Form submit event triggered');
        await performSubmit();
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
            
            // Criar previews e iniciar upload otimista imediatamente
            for (const file of validFiles) {
                const reader = new FileReader();
                await new Promise<void>((resolve, reject) => {
                    reader.onloadend = () => {
                        const previewUrl = reader.result as string;
                        
                        // Adicionar preview imediatamente
                        filePreviews.push({
                            file: file, // Manter File object para upload otimista
                            url: previewUrl, // Data URL para preview
                            name: file.name,
                            size: file.size
                        });
                        
                        resolve();
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                // O upload será feito após criar o appointment (quando tivermos patientId)
                // Por enquanto, apenas armazenamos o File object para upload posterior
            }

            // Atualizar formData com previews
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
            className="space-y-4 sm:space-y-6"
        >
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 text-white mb-6 sm:mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1 sm:mb-2">{t('appointments.title')}</h2>
                        <p className="text-sm sm:text-base text-white/90">{t('appointments.subtitle')}</p>
                    </div>
                    <Button 
                        onClick={() => handleOpenModal()} 
                        className="gap-2 bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg w-full sm:w-auto text-sm sm:text-base"
                    >
                        <Plus size={18} />
                        {t('appointments.newAppointment')}
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
                        <p className="text-xs sm:text-sm font-medium text-white/80 mb-1">{t('appointments.totalReceived')}</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white break-words">{formatCurrency(totalReceived, currency)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
                        <p className="text-xs sm:text-sm font-medium text-white/80 mb-1">{t('appointments.pendingValue')}</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white break-words">{formatCurrency(totalPending, currency)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
                        <p className="text-xs sm:text-sm font-medium text-white/80 mb-1">Total</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white break-words">{formatCurrency(totalStats.totalValue || (totalReceived + totalPending), currency)}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/30">
                        <p className="text-xs sm:text-sm font-medium text-white/80 mb-1">{t('appointments.totalAppointments')}</p>
                        <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{totalStats.total}</p>
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
                                className={`px-2 sm:px-3 md:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[44px] ${filterStatus === status
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
                            className="w-full pl-10 pr-4 py-2.5 sm:py-2 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-base sm:text-sm min-h-[44px]"
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
                <form 
                    ref={formRef} 
                    onSubmit={handleSubmit} 
                    className="space-y-4"
                    noValidate={false}
                    onTouchEnd={(e) => {
                        // Log para debug no mobile
                        if (e.target === e.currentTarget) {
                            logger.debug('Form onTouchEnd triggered');
                        }
                    }}
                >
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

                    <div className="flex flex-col gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        {/* Indicador de conectividade e operações pendentes */}
                        <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                                {offlineQueue.isOnline ? (
                                    <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <Wifi size={14} />
                                        <span>Online</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                                        <WifiOff size={14} />
                                        <span>Offline - Salvando localmente</span>
                                    </div>
                                )}
                            </div>
                            {offlineQueue.pendingCount > 0 && (
                                <div className="text-xs text-sky-600 dark:text-sky-400">
                                    {offlineQueue.pendingCount} {offlineQueue.pendingCount === 1 ? 'operação' : 'operações'} pendente{offlineQueue.pendingCount > 1 ? 's' : ''}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex justify-end gap-3">
                            <Button 
                                type="button" 
                                variant="secondary" 
                                onClick={() => {
                                    setIsModalOpen(false);
                                }}
                            >
                                {t('appointments.cancel')}
                            </Button>
                            <Button 
                                type="button"
                                disabled={isSubmitting || (!offlineQueue.isOnline && offlineQueue.isSyncing)}
                                onClick={(e: MouseEvent<HTMLButtonElement>) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Verifica validação HTML5 antes de submeter
                                    if (formRef.current && !formRef.current.checkValidity()) {
                                        requestAnimationFrame(() => {
                                            formRef.current!.reportValidity();
                                        });
                                        return;
                                    }
                                    
                                    // Tentar usar requestSubmit como fallback (melhor para iOS)
                                    if (formRef.current) {
                                        try {
                                            formRef.current.requestSubmit();
                                        } catch {
                                            // Se requestSubmit falhar, chamar diretamente
                                            performSubmit();
                                        }
                                    } else {
                                        // Chama performSubmit diretamente
                                        performSubmit();
                                    }
                                }}
                            >
                                {isSubmitting 
                                    ? (offlineQueue.isOnline 
                                        ? (t('common.saving') || 'Salvando...')
                                        : 'Salvando localmente...')
                                    : editingAppointment 
                                        ? t('appointments.saveChanges') 
                                        : t('appointments.saveAppointment')
                                }
                            </Button>
                        </div>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Appointments;

