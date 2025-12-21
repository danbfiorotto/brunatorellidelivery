import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { ErrorBoundary } from './components/UI/ErrorBoundary';
import { ToastProvider } from './components/UI/Toast';
import { DIProvider } from './hooks/useDependencies';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import Clinics from './pages/Clinics';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Profile from './pages/Profile';

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
                                    <Router>
                                        <Routes>
                                            <Route path="/login" element={<Login />} />
                                            <Route path="/register" element={<Register />} />

                                            <Route path="/" element={
                                                <ProtectedRoute>
                                                    <MainLayout />
                                                </ProtectedRoute>
                                            }>
                                                <Route index element={<Dashboard />} />
                                                <Route path="appointments" element={<Appointments />} />
                                                <Route path="reports" element={<Reports />} />
                                                <Route path="clinics" element={<Clinics />} />
                                                <Route path="patients" element={<Patients />} />
                                                <Route path="patients/:id" element={<PatientDetails />} />
                                                <Route path="profile" element={<Profile />} />
                                            </Route>
                                        </Routes>
                                    </Router>
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

