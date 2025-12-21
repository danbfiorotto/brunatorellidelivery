import { IStorage } from './IStorage';

/**
 * Adaptador para localStorage que implementa IStorage
 * Permite usar localStorage de forma testável e substituível
 */
export class LocalStorageAdapter implements IStorage {
    constructor(private storage: Storage) {
        if (!storage) {
            throw new Error('Storage não pode ser null');
        }
    }

    getItem(key: string): string | null {
        try {
            return this.storage.getItem(key);
        } catch (error) {
            console.warn('Erro ao ler do storage:', error);
            return null;
        }
    }

    setItem(key: string, value: string): void {
        try {
            this.storage.setItem(key, value);
        } catch (error) {
            if ((error as Error).name === 'QuotaExceededError') {
                throw new Error('Storage cheio. Limpe alguns dados.');
            }
            console.warn('Erro ao escrever no storage:', error);
        }
    }

    removeItem(key: string): void {
        try {
            this.storage.removeItem(key);
        } catch (error) {
            console.warn('Erro ao remover do storage:', error);
        }
    }

    clear(): void {
        try {
            this.storage.clear();
        } catch (error) {
            console.warn('Erro ao limpar storage:', error);
        }
    }

    key(index: number): string | null {
        try {
            return this.storage.key(index);
        } catch (error) {
            console.warn('Erro ao obter chave do storage:', error);
            return null;
        }
    }

    get length(): number {
        try {
            return this.storage.length;
        } catch {
            return 0;
        }
    }
}





