import React, { createContext, useContext, useState, useCallback, useRef, useEffect, ReactNode } from 'react';
import { useDependencies } from '../hooks/useDependencies';
import { logger } from '../lib/logger';

/**
 * Interface para Clinic (referência)
 */
interface Clinic {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
}

/**
 * Interface para Patient (referência)
 */
interface Patient {
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
}

/**
 * Interface para Procedure (referência)
 */
interface Procedure {
    id: string;
    name: string;
    description?: string | null;
    category?: string | null;
    is_active?: boolean;
    display_order?: number;
}

/**
 * Cache entry com timestamp para TTL
 */
interface CacheEntry<T> {
    data: T[];
    timestamp: number;
}

/**
 * Estado do contexto de dados de referência
 */
interface ReferenceDataState {
    clinics: Clinic[];
    patients: Patient[];
    procedures: Procedure[];
    isLoading: boolean;
    error: Error | null;
}

/**
 * Contexto de dados de referência
 */
interface ReferenceDataContextType extends ReferenceDataState {
    refreshClinics: () => Promise<void>;
    refreshPatients: () => Promise<void>;
    refreshProcedures: () => Promise<void>;
    refreshAll: () => Promise<void>;
    invalidateAll: () => void;
}

// TTL padrão: 30 minutos
const DEFAULT_TTL_MS = 30 * 60 * 1000;

const ReferenceDataContext = createContext<ReferenceDataContextType | null>(null);

/**
 * Provider para dados de referência
 * Cacheia clinics, patients e procedures com TTL de 30 minutos
 */
export function ReferenceDataProvider({ children }: { children: ReactNode }) {
    const container = useDependencies();
    
    const [state, setState] = useState<ReferenceDataState>({
        clinics: [],
        patients: [],
        procedures: [],
        isLoading: true,
        error: null
    });
    
    // Refs para cache com timestamp
    const clinicsCache = useRef<CacheEntry<Clinic> | null>(null);
    const patientsCache = useRef<CacheEntry<Patient> | null>(null);
    const proceduresCache = useRef<CacheEntry<Procedure> | null>(null);
    
    // Ref para evitar múltiplas chamadas simultâneas
    const loadingRef = useRef<{ clinics: boolean; patients: boolean; procedures: boolean }>({
        clinics: false,
        patients: false,
        procedures: false
    });

    /**
     * Verifica se o cache está válido (não expirou)
     */
    const isCacheValid = useCallback(<T,>(cache: CacheEntry<T> | null, ttl: number = DEFAULT_TTL_MS): boolean => {
        if (!cache) return false;
        return Date.now() - cache.timestamp < ttl;
    }, []);

    /**
     * Carrega clínicas com cache
     */
    const refreshClinics = useCallback(async (force: boolean = false) => {
        // Evitar chamadas simultâneas
        if (loadingRef.current.clinics) return;
        
        // Usar cache se válido e não forçado
        if (!force && isCacheValid(clinicsCache.current)) {
            return;
        }
        
        loadingRef.current.clinics = true;
        
        try {
            const clinicService = container.resolve('clinicService') as any;
            const result = await clinicService.getAll();
            
            // Extrair data de resultado paginado se necessário
            const clinics = result?.data || result || [];
            
            clinicsCache.current = {
                data: clinics,
                timestamp: Date.now()
            };
            
            setState(prev => ({ ...prev, clinics }));
            logger.debug('ReferenceDataContext - Clinics loaded', { count: clinics.length });
        } catch (error) {
            logger.error(error, { context: 'ReferenceDataContext.refreshClinics' });
            setState(prev => ({ ...prev, error: error as Error }));
        } finally {
            loadingRef.current.clinics = false;
        }
    }, [container, isCacheValid]);

    /**
     * Carrega pacientes com cache
     */
    const refreshPatients = useCallback(async (force: boolean = false) => {
        if (loadingRef.current.patients) return;
        
        if (!force && isCacheValid(patientsCache.current)) {
            return;
        }
        
        loadingRef.current.patients = true;
        
        try {
            const patientService = container.resolve('patientService') as any;
            const result = await patientService.getAll();
            
            const patients = result?.data || result || [];
            
            patientsCache.current = {
                data: patients,
                timestamp: Date.now()
            };
            
            setState(prev => ({ ...prev, patients }));
            logger.debug('ReferenceDataContext - Patients loaded', { count: patients.length });
        } catch (error) {
            logger.error(error, { context: 'ReferenceDataContext.refreshPatients' });
            setState(prev => ({ ...prev, error: error as Error }));
        } finally {
            loadingRef.current.patients = false;
        }
    }, [container, isCacheValid]);

    /**
     * Carrega procedimentos com cache
     */
    const refreshProcedures = useCallback(async (force: boolean = false) => {
        if (loadingRef.current.procedures) return;
        
        if (!force && isCacheValid(proceduresCache.current)) {
            return;
        }
        
        loadingRef.current.procedures = true;
        
        try {
            const procedureService = container.resolve('procedureService') as any;
            const result = await procedureService.getAll();
            
            const procedures = result?.data || result || [];
            
            proceduresCache.current = {
                data: procedures,
                timestamp: Date.now()
            };
            
            setState(prev => ({ ...prev, procedures }));
            logger.debug('ReferenceDataContext - Procedures loaded', { count: procedures.length });
        } catch (error) {
            logger.error(error, { context: 'ReferenceDataContext.refreshProcedures' });
            setState(prev => ({ ...prev, error: error as Error }));
        } finally {
            loadingRef.current.procedures = false;
        }
    }, [container, isCacheValid]);

    /**
     * Carrega todos os dados de referência
     */
    const refreshAll = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        try {
            await Promise.all([
                refreshClinics(true),
                refreshPatients(true),
                refreshProcedures(true)
            ]);
        } finally {
            setState(prev => ({ ...prev, isLoading: false }));
        }
    }, [refreshClinics, refreshPatients, refreshProcedures]);

    /**
     * Invalida todo o cache (força reload na próxima leitura)
     */
    const invalidateAll = useCallback(() => {
        clinicsCache.current = null;
        patientsCache.current = null;
        proceduresCache.current = null;
        logger.debug('ReferenceDataContext - Cache invalidated');
    }, []);

    // Carregar dados iniciais
    useEffect(() => {
        const loadInitialData = async () => {
            setState(prev => ({ ...prev, isLoading: true }));
            
            try {
                await Promise.all([
                    refreshClinics(),
                    refreshPatients(),
                    refreshProcedures()
                ]);
            } finally {
                setState(prev => ({ ...prev, isLoading: false }));
            }
        };
        
        loadInitialData();
    }, [refreshClinics, refreshPatients, refreshProcedures]);

    const contextValue: ReferenceDataContextType = {
        ...state,
        refreshClinics: () => refreshClinics(true),
        refreshPatients: () => refreshPatients(true),
        refreshProcedures: () => refreshProcedures(true),
        refreshAll,
        invalidateAll
    };

    return (
        <ReferenceDataContext.Provider value={contextValue}>
            {children}
        </ReferenceDataContext.Provider>
    );
}

/**
 * Hook para acessar dados de referência
 */
export function useReferenceData(): ReferenceDataContextType {
    const context = useContext(ReferenceDataContext);
    
    if (!context) {
        throw new Error('useReferenceData must be used within ReferenceDataProvider');
    }
    
    return context;
}

/**
 * Hook específico para clínicas
 */
export function useClinics() {
    const { clinics, isLoading, refreshClinics } = useReferenceData();
    return { clinics, isLoading, refresh: refreshClinics };
}

/**
 * Hook específico para pacientes
 */
export function usePatients() {
    const { patients, isLoading, refreshPatients } = useReferenceData();
    return { patients, isLoading, refresh: refreshPatients };
}

/**
 * Hook específico para procedimentos
 */
export function useProcedures() {
    const { procedures, isLoading, refreshProcedures } = useReferenceData();
    return { procedures, isLoading, refresh: refreshProcedures };
}

export default ReferenceDataContext;
