import { Name } from '../value-objects/Name';
import { Email } from '../value-objects/Email';
import { Phone } from '../value-objects/Phone';
import { DomainError } from '../errors/AppError';

export type ClinicStatus = 'active' | 'inactive';

export interface ClinicProps {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
    status?: ClinicStatus;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface ClinicJSON {
    id: string;
    name: string;
    address: string | null;
    email: string | null;
    phone: string | null;
    status: ClinicStatus;
    created_at: string;
    updated_at?: string; // ✅ Opcional porque a tabela clinics não tem essa coluna
}

/**
 * Entidade de Domínio: Clinic
 */
export class Clinic {
    private readonly _id: string;
    private _name: Name;
    private _address: string | null;
    private _email: Email | null;
    private _phone: Phone | null;
    private _status: ClinicStatus;
    private readonly _createdAt: Date;
    private _updatedAt: Date;

    /**
     * Cria uma instância de Clinic
     */
    constructor({ id, name, address, email, phone, status = 'active', createdAt, updatedAt }: ClinicProps) {
        this._id = id;
        this._name = Name.create(name)!;
        this._address = address || null;
        this._email = email ? Email.create(email) : null;
        this._phone = phone ? Phone.create(phone) : null;
        this._status = status;
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
        if (!['active', 'inactive'].includes(this._status)) {
            throw new DomainError('Status inválido');
        }
    }
    
    // Getters
    get id(): string {
        return this._id;
    }
    
    get name(): string {
        return this._name.toString();
    }
    
    get address(): string | null {
        return this._address;
    }
    
    get email(): string | null {
        return this._email?.toString() || null;
    }
    
    get phone(): string | null {
        return this._phone?.toString() || null;
    }
    
    get status(): ClinicStatus {
        return this._status;
    }
    
    get createdAt(): Date {
        return this._createdAt;
    }
    
    get updatedAt(): Date {
        return this._updatedAt;
    }
    
    /**
     * Atualiza o nome da clínica
     */
    updateName(newName: string): void {
        this._name = Name.create(newName)!;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Atualiza o endereço da clínica
     */
    updateAddress(newAddress: string | null): void {
        this._address = newAddress;
        this._updatedAt = new Date();
    }
    
    /**
     * Atualiza o email da clínica
     */
    updateEmail(newEmail: string | null): void {
        this._email = newEmail ? Email.create(newEmail) : null;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Atualiza o telefone da clínica
     */
    updatePhone(newPhone: string | null): void {
        this._phone = newPhone ? Phone.create(newPhone) : null;
        this._updatedAt = new Date();
        this.validateInvariants();
    }
    
    /**
     * Ativa a clínica
     */
    activate(): void {
        this._status = 'active';
        this._updatedAt = new Date();
    }
    
    /**
     * Desativa a clínica
     */
    deactivate(): void {
        this._status = 'inactive';
        this._updatedAt = new Date();
    }
    
    /**
     * Factory method para criar Clinic
     */
    static create(data: Partial<ClinicProps> & { name: string }): Clinic {
        return new Clinic({
            ...data,
            id: data.id || crypto.randomUUID(),
            createdAt: data.createdAt || new Date().toISOString(),
            updatedAt: data.updatedAt || new Date().toISOString()
        } as ClinicProps);
    }
    
    /**
     * Serializa para JSON (formato do banco)
     */
    toJSON(): ClinicJSON {
        return {
            id: this._id,
            name: this._name.toString(),
            address: this._address,
            email: this._email?.toString() || null,
            phone: this._phone?.toString() || null,
            status: this._status,
            created_at: this._createdAt.toISOString(),
            // ✅ updated_at removido porque a tabela clinics não tem essa coluna
            // updated_at: this._updatedAt.toISOString()
        };
    }
    
    /**
     * Deserializa do JSON (formato do banco)
     */
    static fromJSON(json: ClinicJSON): Clinic {
        return new Clinic({
            id: json.id,
            name: json.name,
            address: json.address,
            email: json.email,
            phone: json.phone,
            status: json.status || 'active',
            createdAt: json.created_at,
            updatedAt: json.updated_at || json.created_at // ✅ Usar created_at como fallback
        });
    }
}

