import { InputValidator } from './InputValidator';
import { SanitizerService } from '../../infrastructure/sanitization/SanitizerService';
import { CreatePatientSchema, UpdatePatientSchema } from '../dto/schemas/PatientSchemas';
import { CreateAppointmentSchema, UpdateAppointmentSchema } from '../dto/schemas/AppointmentSchemas';
import { CreateClinicSchema, UpdateClinicSchema } from '../dto/schemas/ClinicSchemas';

/**
 * Factory para criar InputValidator com todos os schemas registrados
 */
export function createInputValidator(): InputValidator {
    const sanitizer = new SanitizerService();
    const schemas = new Map([
        ['CreatePatient', CreatePatientSchema],
        ['UpdatePatient', UpdatePatientSchema],
        ['CreateAppointment', CreateAppointmentSchema],
        ['UpdateAppointment', UpdateAppointmentSchema],
        ['CreateClinic', CreateClinicSchema],
        ['UpdateClinic', UpdateClinicSchema],
    ]);
    
    return new InputValidator(sanitizer, schemas);
}




