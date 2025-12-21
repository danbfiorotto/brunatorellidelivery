/**
 * Container de Injeção de Dependências
 */
export class DIContainer {
    private services: Map<string, { factory: (container: DIContainer) => unknown; singleton: boolean }>;
    private singletons: Map<string, unknown>;

    /**
     * Cria uma instância do DIContainer
     */
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }
    
    /**
     * Registra um serviço no container
     * @param name - Nome do serviço
     * @param factory - Função factory que cria o serviço
     * @param singleton - Se deve ser singleton (padrão: false)
     */
    register(name: string, factory: (container: DIContainer) => unknown, singleton: boolean = false): void {
        if (typeof factory !== 'function') {
            throw new Error(`Factory for ${name} must be a function`);
        }
        this.services.set(name, { factory, singleton });
    }
    
    /**
     * Resolve um serviço do container
     * @param name - Nome do serviço
     * @returns Instância do serviço
     * @throws {Error} Se serviço não encontrado
     */
    resolve<T = unknown>(name: string): T {
        const service = this.services.get(name);
        if (!service) {
            throw new Error(`Service ${name} not found`);
        }
        
        // Se for singleton, retornar instância existente ou criar nova
        if (service.singleton) {
            if (!this.singletons.has(name)) {
                this.singletons.set(name, service.factory(this));
            }
            return this.singletons.get(name) as T;
        }
        
        // Se não for singleton, criar nova instância a cada resolução
        return service.factory(this) as T;
    }
    
    /**
     * Verifica se um serviço está registrado
     */
    has(name: string): boolean {
        return this.services.has(name);
    }
    
    /**
     * Remove um serviço do container
     */
    unregister(name: string): void {
        this.services.delete(name);
        this.singletons.delete(name);
    }
    
    /**
     * Limpa todos os serviços (útil para testes)
     */
    clear(): void {
        this.services.clear();
        this.singletons.clear();
    }
}

