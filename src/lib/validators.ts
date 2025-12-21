/**
 * Valida formato de email
 */
export const validateEmail = (email: string): boolean => {
    if (!email) return true; // Opcional
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Valida formato de telefone brasileiro
 */
export const validatePhone = (phone: string): boolean => {
    if (!phone) return false;
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
};

/**
 * Valida CPF brasileiro
 */
export const validateCPF = (cpf: string): boolean => {
    if (!cpf) return true; // Opcional
    const cleaned = cpf.replace(/\D/g, '');
    
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // Todos dígitos iguais
    
    // Validar dígitos verificadores
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        sum += parseInt(cleaned.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
        sum += parseInt(cleaned.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit >= 10) digit = 0;
    if (digit !== parseInt(cleaned.charAt(10))) return false;
    
    return true;
};

/**
 * Valida CNPJ brasileiro
 */
export const validateCNPJ = (cnpj: string): boolean => {
    if (!cnpj) return true;
    const cleaned = cnpj.replace(/\D/g, '');
    
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false;
    
    // Validar dígitos verificadores
    let length = cleaned.length - 2;
    let numbers = cleaned.substring(0, length);
    const digits = cleaned.substring(length);
    let sum = 0;
    let pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cleaned.substring(0, length);
    sum = 0;
    pos = length - 7;
    
    for (let i = length; i >= 1; i--) {
        sum += parseInt(numbers.charAt(length - i)) * pos--;
        if (pos < 2) pos = 9;
    }
    
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
};

interface DateValidationOptions {
    notFuture?: boolean;
    notPast?: boolean;
    minDate?: string | Date;
    maxDate?: string | Date;
}

/**
 * Valida data
 */
export const validateDate = (date: string | Date, options: DateValidationOptions = {}): boolean => {
    if (!date) return false;
    
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return false;
    
    if (options.notFuture && dateObj > new Date()) return false;
    if (options.notPast && dateObj < new Date()) return false;
    if (options.minDate && dateObj < new Date(options.minDate)) return false;
    if (options.maxDate && dateObj > new Date(options.maxDate)) return false;
    
    return true;
};

/**
 * Valida valor monetário
 */
export const validateCurrency = (value: number | string): boolean => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return !isNaN(num) && num >= 0;
};

/**
 * Valida tamanho de texto
 */
export const validateTextLength = (text: string, maxLength: number): boolean => {
    if (!text) return true;
    return text.length <= maxLength;
};

interface PatientData {
    name?: string;
    email?: string;
    phone?: string;
    cpf?: string;
    birth_date?: string | Date;
}

interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
}

/**
 * Validação completa de formulário de paciente
 */
export const validatePatient = (data: PatientData): ValidationResult => {
    const errors: Record<string, string> = {};
    
    if (!data.name || data.name.trim().length < 3) {
        errors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    if (data.email && !validateEmail(data.email)) {
        errors.email = 'Email inválido';
    }
    
    if (!validatePhone(data.phone || '')) {
        errors.phone = 'Telefone inválido';
    }
    
    if (data.cpf && !validateCPF(data.cpf)) {
        errors.cpf = 'CPF inválido';
    }
    
    if (data.birth_date && !validateDate(data.birth_date, { notFuture: true })) {
        errors.birth_date = 'Data de nascimento inválida';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

interface ClinicData {
    name?: string;
    cnpj?: string;
    phone?: string;
    email?: string;
}

/**
 * Validação completa de formulário de clínica
 */
export const validateClinic = (data: ClinicData): ValidationResult => {
    const errors: Record<string, string> = {};
    
    if (!data.name || data.name.trim().length < 3) {
        errors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    if (data.cnpj && data.cnpj.trim() && !validateCNPJ(data.cnpj)) {
        errors.cnpj = 'CNPJ inválido';
    }
    
    // ✅ Phone é opcional, só validar se fornecido e não vazio
    if (data.phone && data.phone.trim() && !validatePhone(data.phone)) {
        errors.phone = 'Telefone inválido';
    }
    
    // ✅ Email é opcional, só validar se fornecido e não vazio
    if (data.email && data.email.trim() && !validateEmail(data.email)) {
        errors.email = 'Email inválido';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

interface AppointmentData {
    date?: string | Date;
    time?: string;
    value?: number | string;
    clinical_evolution?: string;
    notes?: string;
    patient_id?: string;
    patient_name?: string;
}

interface AppointmentValidationOptions {
    allowPastDates?: boolean;
}

/**
 * DTO para criação de appointment (compatível com CreateAppointmentDTO)
 */
interface CreateAppointmentDTO {
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
    patientPhone?: string;
    clinicId?: string;
    date: string | Date;
    time: string;
    procedure: string;
    value?: number;
    currency?: string;
    paymentType?: string;
    paymentPercentage?: number;
    status?: string;
    clinicalEvolution?: string;
    notes?: string;
}

/**
 * Valida DTO de criação de appointment
 * ✅ Centraliza validação de entrada para evitar duplicação
 */
export const validateCreateAppointmentDTO = (data: CreateAppointmentDTO): ValidationResult => {
    const errors: Record<string, string> = {};
    
    // Validação de paciente
    if (!data.patientId && !data.patientName) {
        errors.patient = 'Paciente é obrigatório';
    }
    
    // Validação de data
    if (!data.date) {
        errors.date = 'Data é obrigatória';
    } else if (!validateDate(data.date)) {
        errors.date = 'Data inválida';
    } else if (!validateDate(data.date, { notPast: true })) {
        errors.date = 'Data não pode ser no passado para novos agendamentos';
    }
    
    // Validação de hora
    if (!data.time) {
        errors.time = 'Hora é obrigatória';
    } else if (typeof data.time === 'string' && !/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/.test(data.time)) {
        errors.time = 'Hora inválida (formato esperado: HH:mm)';
    }
    
    // Validação de procedimento
    if (!data.procedure?.trim()) {
        errors.procedure = 'Procedimento é obrigatório';
    }
    
    // Validação de valor
    if (data.value !== undefined) {
        if (isNaN(data.value) || data.value < 0) {
            errors.value = 'Valor deve ser um número positivo';
        } else if (!validateCurrency(data.value)) {
            errors.value = 'Valor inválido';
        }
    }
    
    // Validação de email (se fornecido)
    if (data.patientEmail && !validateEmail(data.patientEmail)) {
        errors.patientEmail = 'Email inválido';
    }
    
    // Validação de telefone (se fornecido)
    if (data.patientPhone && !validatePhone(data.patientPhone)) {
        errors.patientPhone = 'Telefone inválido';
    }
    
    // Validação de campos de texto longo
    if (data.clinicalEvolution && !validateTextLength(data.clinicalEvolution, 10000)) {
        errors.clinicalEvolution = 'Evolução clínica muito longa (máx: 10.000 caracteres)';
    }
    
    if (data.notes && !validateTextLength(data.notes, 5000)) {
        errors.notes = 'Notas muito longas (máx: 5.000 caracteres)';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validação completa de formulário de agendamento
 * @deprecated Use validateCreateAppointmentDTO para validação de DTOs
 */
export const validateAppointment = (data: AppointmentData, options: AppointmentValidationOptions = {}): ValidationResult => {
    const { allowPastDates = false } = options;
    const errors: Record<string, string> = {};
    
    if (!data.date || !validateDate(data.date)) {
        errors.date = 'Data inválida';
    } else if (!allowPastDates && !validateDate(data.date, { notPast: true })) {
        errors.date = 'Data não pode ser no passado para novos agendamentos';
    }
    
    if (!data.time) {
        errors.time = 'Hora é obrigatória';
    }
    
    if (data.value !== undefined && !validateCurrency(data.value)) {
        errors.value = 'Valor inválido';
    }
    
    if (data.clinical_evolution && !validateTextLength(data.clinical_evolution, 10000)) {
        errors.clinical_evolution = 'Evolução clínica muito longa (máx: 10.000 caracteres)';
    }
    
    if (data.notes && !validateTextLength(data.notes, 5000)) {
        errors.notes = 'Notas muito longas (máx: 5.000 caracteres)';
    }
    
    if (!data.patient_id && !data.patient_name) {
        errors.patient = 'Paciente é obrigatório';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

