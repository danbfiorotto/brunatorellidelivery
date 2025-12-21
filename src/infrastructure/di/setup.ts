import { DIContainer } from './Container';
import { DatabaseAdapter } from '../database/DatabaseAdapter';
import { DatabaseClientFactory } from '../database/DatabaseClientFactory';
import { CacheService } from '../cache/CacheService';
import { ICacheService } from '../cache/ICacheService';
import { Logger } from '../logging/Logger';
import { ILogger } from '../logging/ILogger';
import { PatientRepository } from '../repositories/implementations/PatientRepository';
import { AppointmentRepository } from '../repositories/implementations/AppointmentRepository';
import { ClinicRepository } from '../repositories/implementations/ClinicRepository';
import { PatientService } from '../../application/services/PatientService';
import { AppointmentService } from '../../application/services/AppointmentService';
import { ClinicService } from '../../application/services/ClinicService';
import { DashboardService } from '../../application/services/DashboardService';
import { ReportsService } from '../../application/services/ReportsService';
import { ProfileService } from '../../application/services/ProfileService';
import { ProcedureService } from '../../application/services/ProcedureService';
import { RadiographService } from '../../application/services/RadiographService';
import { PermissionService } from '../../application/services/PermissionService';
import { SupabaseTransactionManager } from '../database/SupabaseTransactionManager';
import { ITransactionManager } from '../database/ITransactionManager';
import { ErrorHandler } from '../errorHandling/ErrorHandler';
import { IErrorHandler } from '../errorHandling/IErrorHandler';
import { IAuthClient } from '../auth/IAuthClient';
import { IAuthService } from '../auth/IAuthService';
import { AuthService } from '../auth/AuthService';
import { SupabaseAuthClient } from '../auth/SupabaseAuthClient';
import { SupabaseClientAdapter } from '../database/adapters/SupabaseClientAdapter';
import { IAuditService } from '../audit/IAuditService';
import { AuditService } from '../audit/AuditService';
import { ISanitizer } from '../sanitization/ISanitizer';
import { SanitizerService } from '../sanitization/SanitizerService';
// Use Cases - Patient
import {
    CreatePatientUseCase,
    UpdatePatientUseCase,
    DeletePatientUseCase,
    GetPatientUseCase,
    GetAllPatientsUseCase,
    CreatePatientInputValidator,
    UpdatePatientInputValidator
} from '../../application/use-cases/patient';
// Use Cases - Appointment
import {
    CreateAppointmentUseCase,
    UpdateAppointmentUseCase,
    DeleteAppointmentUseCase,
    GetAppointmentUseCase,
    GetAllAppointmentsUseCase,
    CreateAppointmentInputValidator,
    UpdateAppointmentInputValidator
} from '../../application/use-cases/appointment';

/**
 * Configura o container de injeção de dependências
 */
export function setupDI(): DIContainer {
    const container = new DIContainer();
    
    // Infrastructure Layer - Singletons
    container.register('databaseAdapter', () => {
        const supabaseClient = DatabaseClientFactory.getInstance();
        const clientAdapter = new SupabaseClientAdapter(supabaseClient);
        return new DatabaseAdapter(clientAdapter); // ✅ Criar instância com adapter via Factory
    }, true);
    
    // Cache Service - Registrar como interface e implementação
    container.register<ICacheService>('cacheService', () => {
        return new CacheService(); // ✅ Criar instância, não usar singleton global
    }, true);
    
    container.register<ILogger>('logger', () => {
        return new Logger(); // ✅ Nova instância via DI, não singleton global
    }, true);
    
    // Error Handler - Registrar como interface (criar instância)
    container.register<IErrorHandler>('errorHandler', () => new ErrorHandler(), true);
    
    // Audit Service
    container.register<IAuditService>('auditService', () => {
        return new AuditService();
    }, true);
    
    // Sanitizer Service
    container.register<ISanitizer>('sanitizerService', () => {
        return new SanitizerService();
    }, true);
    
    // Auth Client - Abstração de autenticação
    container.register<IAuthClient>('authClient', () => {
        // Obter SupabaseClient diretamente do Factory
        // Auth precisa do cliente Supabase diretamente, não da abstração
        const supabaseClient = DatabaseClientFactory.getInstance();
        return new SupabaseAuthClient(supabaseClient);
    }, true);
    
    // Auth Service - Encapsula lógica de autenticação
    container.register<IAuthService>('authService', (c) => {
        const authClient = c.resolve<IAuthClient>('authClient');
        return new AuthService(authClient);
    }, true);
    
    // Permission Service
    container.register('permissionService', (c) => {
        const dbAdapter = c.resolve<DatabaseAdapter>('databaseAdapter');
        const logger = c.resolve<ILogger>('logger');
        return new PermissionService(dbAdapter, logger);
    }, true);
    
    // Transaction Manager
    container.register<ITransactionManager>('transactionManager', (c) => {
        const dbAdapter = c.resolve<DatabaseAdapter>('databaseAdapter');
        const logger = c.resolve<ILogger>('logger');
        return new SupabaseTransactionManager(dbAdapter, logger);
    }, true);
    
    // Repositories - Recebem dependências via DI
    container.register('patientRepository', (c) => {
        const dbAdapter = c.resolve<DatabaseAdapter>('databaseAdapter');
        const cache = c.resolve<ICacheService>('cacheService');
        const permissionService = c.resolve<PermissionService>('permissionService');
        const authClient = c.resolve<IAuthClient>('authClient');
        return new PatientRepository(dbAdapter, cache as CacheService, permissionService, authClient); // ✅ Injeção de dependência
    }, true);
    
    container.register('appointmentRepository', (c) => {
        const dbAdapter = c.resolve<DatabaseAdapter>('databaseAdapter');
        const cache = c.resolve<ICacheService>('cacheService');
        const permissionService = c.resolve<PermissionService>('permissionService');
        const authClient = c.resolve<IAuthClient>('authClient');
        return new AppointmentRepository(dbAdapter, cache as CacheService, permissionService, authClient); // ✅ Injeção de dependência
    }, true);
    
    container.register('clinicRepository', (c) => {
        const dbAdapter = c.resolve<DatabaseAdapter>('databaseAdapter');
        const cache = c.resolve<ICacheService>('cacheService');
        const permissionService = c.resolve<PermissionService>('permissionService');
        const authClient = c.resolve<IAuthClient>('authClient');
        return new ClinicRepository(dbAdapter, cache as CacheService, permissionService, authClient); // ✅ Injeção de dependência
    }, true);
    
    // Use Cases - Patient
    container.register('createPatientUseCase', (c) => {
        return new CreatePatientUseCase(
            c.resolve('patientRepository'),
            c.resolve<IAuthService>('authService'),
            new CreatePatientInputValidator(),
            c.resolve<ISanitizer>('sanitizerService'),
            c.resolve<IAuditService>('auditService'),
            c.resolve<ICacheService>('cacheService')
        );
    }, true);
    
    container.register('updatePatientUseCase', (c) => {
        return new UpdatePatientUseCase(
            c.resolve('patientRepository'),
            new UpdatePatientInputValidator(),
            c.resolve<ISanitizer>('sanitizerService'),
            c.resolve<IAuditService>('auditService'),
            c.resolve<ICacheService>('cacheService')
        );
    }, true);
    
    container.register('deletePatientUseCase', (c) => {
        return new DeletePatientUseCase(
            c.resolve('patientRepository'),
            c.resolve<IAuditService>('auditService'),
            c.resolve<ICacheService>('cacheService')
        );
    }, true);
    
    container.register('getPatientUseCase', (c) => {
        return new GetPatientUseCase(
            c.resolve('patientRepository')
        );
    }, true);
    
    container.register('getAllPatientsUseCase', (c) => {
        return new GetAllPatientsUseCase(
            c.resolve('patientRepository')
        );
    }, true);
    
    // Use Cases - Appointment
    container.register('createAppointmentUseCase', (c) => {
        return new CreateAppointmentUseCase(
            c.resolve('appointmentRepository'),
            c.resolve('patientRepository'),
            c.resolve<IAuthService>('authService'),
            new CreateAppointmentInputValidator(),
            c.resolve<ISanitizer>('sanitizerService'),
            c.resolve<IAuditService>('auditService')
        );
    }, true);
    
    container.register('updateAppointmentUseCase', (c) => {
        return new UpdateAppointmentUseCase(
            c.resolve('appointmentRepository'),
            c.resolve('patientRepository'),
            new UpdateAppointmentInputValidator(),
            c.resolve<ISanitizer>('sanitizerService'),
            c.resolve<IAuditService>('auditService'),
            c.resolve<ICacheService>('cacheService')
        );
    }, true);
    
    container.register('deleteAppointmentUseCase', (c) => {
        return new DeleteAppointmentUseCase(
            c.resolve('appointmentRepository'),
            c.resolve<IAuditService>('auditService'),
            c.resolve<ICacheService>('cacheService')
        );
    }, true);
    
    container.register('getAppointmentUseCase', (c) => {
        return new GetAppointmentUseCase(
            c.resolve('appointmentRepository')
        );
    }, true);
    
    container.register('getAllAppointmentsUseCase', (c) => {
        return new GetAllAppointmentsUseCase(
            c.resolve('appointmentRepository')
        );
    }, true);
    
    // Services - Singletons
    // ✅ PatientService agora usa Use Cases
    container.register('patientService', (c) => {
        return new PatientService(
            c.resolve('createPatientUseCase'),
            c.resolve('updatePatientUseCase'),
            c.resolve('deletePatientUseCase'),
            c.resolve('getPatientUseCase'),
            c.resolve('getAllPatientsUseCase'),
            c.resolve('appointmentRepository'),
            c.resolve<IErrorHandler>('errorHandler')
        );
    }, true);
    
    // ✅ AppointmentService agora usa Use Cases
    container.register('appointmentService', (c) => {
        return new AppointmentService(
            c.resolve('createAppointmentUseCase'),
            c.resolve('updateAppointmentUseCase'),
            c.resolve('deleteAppointmentUseCase'),
            c.resolve('getAppointmentUseCase'),
            c.resolve('getAllAppointmentsUseCase'),
            c.resolve('appointmentRepository'),
            c.resolve<IErrorHandler>('errorHandler')
        );
    }, true);
    
    container.register('clinicService', (c) => {
        return new ClinicService(
            c.resolve('clinicRepository'),
            c.resolve<DatabaseAdapter>('databaseAdapter'),
            c.resolve<ICacheService>('cacheService'),
            c.resolve<IErrorHandler>('errorHandler'),
            c.resolve<IAuditService>('auditService'),
            c.resolve<ISanitizer>('sanitizerService')
        );
    }, true);
    
    container.register('dashboardService', (c) => {
        return new DashboardService(
            c.resolve('appointmentService'),
            c.resolve('patientService'),
            c.resolve('clinicService'),
            c.resolve<DatabaseAdapter>('databaseAdapter'),
            c.resolve<ICacheService>('cacheService'),
            c.resolve<IErrorHandler>('errorHandler')
        );
    }, true);
    
    container.register('reportsService', (c) => {
        return new ReportsService(
            c.resolve('appointmentService'),
            c.resolve('patientService'),
            c.resolve<IErrorHandler>('errorHandler')
        );
    }, true);
    
    container.register('profileService', (c) => {
        return new ProfileService(
            c.resolve<DatabaseAdapter>('databaseAdapter'),
            c.resolve<IErrorHandler>('errorHandler'),
            c.resolve<IAuditService>('auditService')
        );
    }, true);
    
    container.register('procedureService', (c) => {
        return new ProcedureService(
            c.resolve<DatabaseAdapter>('databaseAdapter'),
            c.resolve<IErrorHandler>('errorHandler'),
            c.resolve<IAuditService>('auditService')
        );
    }, true);
    
    container.register('radiographService', (c) => {
        return new RadiographService(
            c.resolve<DatabaseAdapter>('databaseAdapter'),
            c.resolve<IErrorHandler>('errorHandler'),
            c.resolve<IAuditService>('auditService')
        );
    }, true);
    
    return container;
}

/**
 * @deprecated Use DIProvider e useDependencies ao invés deste singleton
 * Este método será removido na próxima versão
 * 
 * Para produção: Use DIProvider no App.tsx
 * Para testes: Use createTestContainer() em setup.ts
 * 
 * ✅ Singleton real para evitar criar múltiplas instâncias
 */
let globalContainer: DIContainer | null = null;

export function getContainer(): DIContainer {
    if (!globalContainer) {
        console.warn('getContainer() está deprecated. Use DIProvider e useDependencies()');
        globalContainer = setupDI();
    }
    return globalContainer;
}

/**
 * @deprecated Use DIProvider ao invés deste método
 */
export function resolve<T = unknown>(serviceName: string): T {
    return getContainer().resolve<T>(serviceName);
}

