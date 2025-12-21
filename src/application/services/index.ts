/**
 * Exporta todas as classes de services
 * NOTA: Singletons foram removidos. Use DI Container via useDependencies() hook.
 * 
 * @example
 * ```typescript
 * import { useDependencies } from '../hooks/useDependencies';
 * 
 * const container = useDependencies();
 * const patientService = container.resolve('patientService');
 * ```
 */
export { PatientService } from './PatientService';
export { AppointmentService } from './AppointmentService';
export { ClinicService } from './ClinicService';
export { DashboardService } from './DashboardService';
export { ReportsService } from './ReportsService';
export { ProfileService } from './ProfileService';
export { ProcedureService } from './ProcedureService';
export { RadiographService } from './RadiographService';

