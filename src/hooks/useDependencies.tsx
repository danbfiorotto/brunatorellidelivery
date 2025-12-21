import { useContext, createContext, ReactNode, useState, useMemo } from 'react';
import { setupDI } from '../infrastructure/di/setup';
import { DIContainer } from '../infrastructure/di/Container';

/**
 * Contexto para injeção de dependências
 */
const DIContext = createContext<DIContainer | null>(null);

interface DIProviderProps {
    children: ReactNode;
    container?: DIContainer | null;
}

/**
 * Provider de DI para React
 * ✅ Sempre cria novo container (não usa singleton global)
 * Permite testes isolados e diferentes configurações
 */
export const DIProvider: React.FC<DIProviderProps> = ({ children, container = null }) => {
    // ✅ Usar useState com inicialização lazy para garantir que o container
    // seja criado apenas uma vez e esteja disponível antes do primeiro render
    const [containerInstance] = useState<DIContainer>(() => {
        return container || setupDI();
    });
    
    // Garantir que o container está disponível
    const containerToUse = useMemo(() => containerInstance, [containerInstance]);
    
    return (
        <DIContext.Provider value={containerToUse}>
            {children}
        </DIContext.Provider>
    );
};

/**
 * Hook para acessar dependências
 * @throws {Error} Se usado fora do DIProvider
 */
export const useDependencies = (): DIContainer => {
    const container = useContext(DIContext);
    if (!container) {
        throw new Error('useDependencies must be used within DIProvider');
    }
    return container;
};

/**
 * Hook para acessar dependências de forma segura (retorna null se não disponível)
 * Útil para contextos que podem ser renderizados antes do DIProvider estar disponível
 */
export const useDependenciesSafe = (): DIContainer | null => {
    return useContext(DIContext);
};

