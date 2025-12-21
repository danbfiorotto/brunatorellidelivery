import { ValidationError, DomainError } from '../errors/AppError';

export type Currency = 'BRL' | 'USD' | 'EUR';

/**
 * Value Object para Money
 */
export class Money {
    private readonly _amount: number;
    private readonly _currency: Currency;

    /**
     * Cria uma instância de Money
     * @throws {ValidationError} Se valor inválido
     */
    constructor(amount: number, currency: Currency = 'BRL') {
        if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
            throw new ValidationError({ amount }, 'Valor deve ser um número positivo');
        }
        if (!['BRL', 'USD', 'EUR'].includes(currency)) {
            throw new ValidationError({ currency }, `Moeda não suportada: ${currency}`);
        }
        
        this._amount = Math.round(amount * 100) / 100; // 2 casas decimais
        this._currency = currency;
    }
    
    /**
     * Retorna o valor
     */
    get amount(): number {
        return this._amount;
    }
    
    /**
     * Retorna a moeda
     */
    get currency(): Currency {
        return this._currency;
    }
    
    /**
     * Soma dois valores monetários
     * @throws {DomainError} Se moedas diferentes
     */
    add(other: Money): Money {
        if (this._currency !== other._currency) {
            throw new DomainError('Não é possível somar moedas diferentes');
        }
        return new Money(this._amount + other._amount, this._currency);
    }
    
    /**
     * Subtrai dois valores monetários
     * @throws {DomainError} Se moedas diferentes ou resultado negativo
     */
    subtract(other: Money): Money {
        if (this._currency !== other._currency) {
            throw new DomainError('Não é possível subtrair moedas diferentes');
        }
        const result = this._amount - other._amount;
        if (result < 0) {
            throw new DomainError('Resultado não pode ser negativo');
        }
        return new Money(result, this._currency);
    }
    
    /**
     * Multiplica o valor por um fator
     * @throws {DomainError} Se fator negativo
     */
    multiply(factor: number): Money {
        if (factor < 0) {
            throw new DomainError('Fator deve ser positivo');
        }
        return new Money(this._amount * factor, this._currency);
    }
    
    /**
     * Calcula uma porcentagem do valor
     */
    percentage(percent: number): Money {
        return new Money((this._amount * percent) / 100, this._currency);
    }
    
    /**
     * Formata o valor para exibição
     */
    format(locale: string = 'pt-BR'): string {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: this._currency
        }).format(this._amount);
    }
    
    /**
     * Compara dois valores monetários
     */
    equals(other: Money): boolean {
        return other instanceof Money &&
               this._amount === other._amount &&
               this._currency === other._currency;
    }
    
    /**
     * Verifica se este valor é maior que outro
     * @throws {DomainError} Se moedas diferentes
     */
    isGreaterThan(other: Money): boolean {
        if (this._currency !== other._currency) {
            throw new DomainError('Não é possível comparar moedas diferentes');
        }
        return this._amount > other._amount;
    }
    
    /**
     * Serializa para JSON
     */
    toJSON(): { amount: number; currency: Currency } {
        return {
            amount: this._amount,
            currency: this._currency
        };
    }
    
    /**
     * Cria um Money a partir de JSON
     */
    static fromJSON(json: { amount: number; currency: Currency }): Money {
        return new Money(json.amount, json.currency);
    }
    
    /**
     * Factory method para criar Money
     */
    static create(amount: number, currency: Currency = 'BRL'): Money {
        return new Money(amount, currency);
    }
}

