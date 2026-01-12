import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { ReferenceDataProvider } from './context/ReferenceDataContext';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { ToastProvider } from './components/UI/Toast';
import { DIProvider } from './hooks/useDependencies';
import MainLayout from './components/Layout/MainLayout';

// Páginas de autenticação (carregadas imediatamente)
import Login from './pages/Login';
import Register from './pages/Register';

// Lazy loading para páginas pesadas (carregadas sob demanda)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Reports = lazy(() => import('./pages/Reports'));
const Clinics = lazy(() => import('./pages/Clinics'));
const Patients = lazy(() => import('./pages/Patients'));
const PatientDetails = lazy(() => import('./pages/PatientDetails'));
const Profile = lazy(() => import('./pages/Profile'));

/**
 * Componente de fallback para loading durante lazy load
 */
const PageLoadingFallback: React.FC = () => (
    <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-primary-400"></div>
            <p className="text-slate-600 dark:text-gray-400">Carregando...</p>
        </div>
    </div>
);

interface ProtectedRouteProps {
    children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
    }

    if (!user) {
        return <Navigate to="/login" />;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
    return (
        <ErrorBoundary>
            <DIProvider>
                <AuthProvider>
                    <LanguageProvider>
                        <CurrencyProvider>
                            <ThemeProvider>
                                <ToastProvider>
                                    <ReferenceDataProvider>
                                        <Router>
                                            <Routes>
                                                <Route path="/login" element={<Login />} />
                                                <Route path="/register" element={<Register />} />

                                                <Route path="/" element={
                                                    <ProtectedRoute>
                                                        <MainLayout />
                                                    </ProtectedRoute>
                                                }>
                                                    <Route index element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <Dashboard />
                                                        </Suspense>
                                                    } />
                                                    <Route path="appointments" element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <Appointments />
                                                        </Suspense>
                                                    } />
                                                    <Route path="reports" element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <Reports />
                                                        </Suspense>
                                                    } />
                                                    <Route path="clinics" element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <Clinics />
                                                        </Suspense>
                                                    } />
                                                    <Route path="patients" element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <Patients />
                                                        </Suspense>
                                                    } />
                                                    <Route path="patients/:id" element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <PatientDetails />
                                                        </Suspense>
                                                    } />
                                                    <Route path="profile" element={
                                                        <Suspense fallback={<PageLoadingFallback />}>
                                                            <Profile />
                                                        </Suspense>
                                                    } />
                                                </Route>
                                            </Routes>
                                        </Router>
                                    </ReferenceDataProvider>
                                </ToastProvider>
                            </ThemeProvider>
                        </CurrencyProvider>
                    </LanguageProvider>
                </AuthProvider>
            </DIProvider>
        </ErrorBoundary>
    );
};

export default App;

