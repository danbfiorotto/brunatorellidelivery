import { Name } from '../value-objects/Name';
import { Email } from '../value-objects/Email';
import { Phone } from '../value-objects/Phone';
import { DomainError } from '../errors/AppError';

export interface PatientProps {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    userId: string;
    lastVisit?: string | Date | null;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface PatientJSON {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    user_id: string;
    last_visit: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Entidade de Domínio: Patient
 */
export class Patient {
    private readonly _id: string;
    private _name: Name;
    private _email: Email | null;
    private _phone: Phone | null;
    private readonly _userId: string;
    private _lastVisit: Date | null;
    private readonly _createdAt: Date;
    private _updatedAt: Date;

    /**
     * Cria uma instância de Patient
     */
    constructor({ id, name, email, phone, userId, lastVisit, createdAt, updatedAt }: PatientProps) {
        this._id = id;
        this._name = Name.create(name)!;
        this._email = email ? Email.create(email) : null;
        this._phone = phone ? Phone.create(phone) : null;
        this._userId = userId;
        this._lastVisit = lastVisit ? new Date(lastVisit) : null;
        this._createdAt = createdAt ? new Date(createdAt) : new Date();
        this._updatedAt = updatedAt ? new Date(updatedAt) : new Date();
        
        this.validateInvariants();
    }
    
    /**
     * Valida invariantes da entidade
     * @throws {DomainError} Se invariantes violados
     */
    validateInvariants(): void {
        if (!this._name) {
            throw new DomainError('Nome é obrigatório');
        }
        if (!this._userId) {
            throw new DomainError('Usuário é obrigatório');
        }
        if (this._lastVisit && this._lastVisit > new Date()) {
            throw new DomainError('Data de última visita não pode ser no futuro');
        }
    }
    
    // Getters
    get id(): string {
        return this._id;
    }
    
    get name(): string {
        return this._name.toString();
    }
    
    get email(): string | null {
        return this._email?.toString() || null;
    }
    
    get phone(): string | null {
        return this._phone?.toString() || null;
    }
    
    get userId(): string {
        return this._userId;
    }
    
    get lastVisit(): Date | null {
        return this._lastVisit;
    }
    
    get createdAt(): Date {
        return this._createdAt;
    }
    
    get updatedAt(): Date {
        return this._updatedAt;
    }
    
    /**
     * Atualiza o nome do paciente
     */
    updateName(newName: string): void {
        this._name = Name.create(newName)!;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Atualiza o email do paciente
     */
    updateEmail(newEmail: string | null): void {
        this._email = newEmail ? Email.create(newEmail) : null;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Atualiza o telefone do paciente
     */
    updatePhone(newPhone: string | null): void {
        this._phone = newPhone ? Phone.create(newPhone) : null;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Atualiza a data da última visita
     */
    updateLastVisit(date: Date | string | null): void {
        if (date && new Date(date) > new Date()) {
            throw new DomainError('Data de última visita não pode ser no futuro');
        }
        this._lastVisit = date ? new Date(date) : null;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Factory method para criar Patient
     */
    static create(data: Partial<PatientProps> & { name: string; userId: string }): Patient {
        return new Patient({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
        } as PatientProps);
    }
    
    /**
     * Serializa para JSON (formato do banco)
     */
    toJSON(): PatientJSON {
        return {
            id: this._id,
            name: this._name.toString(),
            email: this._email?.toString() || null,
            phone: this._phone?.toString() || null,
            user_id: this._userId,
            last_visit: this._lastVisit?.toISOString().split('T')[0] || null,
            created_at: this._createdAt.toISOString(),
            updated_at: this._updatedAt.toISOString()
        };
    }
    
    /**
     * Deserializa do JSON (formato do banco)
     * @throws {DomainError} Se user_id estiver ausente ou inválido
     */
    static fromJSON(json: PatientJSON): Patient {
        // Validar que user_id existe e não é vazio
        if (!json.user_id || typeof json.user_id !== 'string' || json.user_id.trim() === '') {
            throw new DomainError(
                `Patient.fromJSON: user_id é obrigatório. Dados recebidos: ${JSON.stringify({ id: json.id, name: json.name, user_id: json.user_id })}`
            );
        }
        
        return new Patient({
            id: json.id,
            name: json.name,
            email: json.email,
            phone: json.phone,
            userId: json.user_id,
            lastVisit: json.last_visit,
            createdAt: json.created_at,
            updatedAt: json.updated_at
        });
    }
}

