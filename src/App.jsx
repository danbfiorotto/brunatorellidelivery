import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Reports from './pages/Reports';
import Clinics from './pages/Clinics';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import AiAssistant from './pages/AiAssistant';
import Profile from './pages/Profile';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />

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
            <Route path="ai-assistant" element={<AiAssistant />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
