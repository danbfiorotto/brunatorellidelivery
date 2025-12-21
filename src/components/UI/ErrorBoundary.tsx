import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import Card from './Card';
import Button from './Button';
import { logger } from '../../lib/logger';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary para capturar erros de renderização
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }
    
    static getDerivedStateFromError(error: Error): Partial<State> {
        return { hasError: true, error };
    }
    
    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        logger.error(error, { 
            errorInfo, 
            context: 'ErrorBoundary',
            componentStack: errorInfo.componentStack 
        });
        this.setState({ errorInfo });
    }
    
    handleReset = (): void => {
        this.setState({ hasError: false, error: null, errorInfo: null });
    };
    
    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center p-4">
                    <Card className="max-w-md w-full">
                        <div className="text-center">
                            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                Oops! Algo deu errado
                            </h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                Ocorreu um erro inesperado. Por favor, tente novamente.
                            </p>
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <details className="text-left mb-4 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                                    <summary className="cursor-pointer font-semibold mb-2">
                                        Detalhes do erro (desenvolvimento)
                                    </summary>
                                    <pre className="whitespace-pre-wrap break-words">
                                        {this.state.error.toString()}
                                        {this.state.errorInfo?.componentStack}
                                    </pre>
                                </details>
                            )}
                            <Button onClick={this.handleReset}>
                                Tentar Novamente
                            </Button>
                        </div>
                    </Card>
                </div>
            );
        }
        return this.props.children;
    }
}

