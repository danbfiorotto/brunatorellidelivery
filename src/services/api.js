import { supabase } from '../lib/supabaseClient';

// Clinics
export const getClinics = async () => {
    const { data, error } = await supabase.from('clinics').select('*');
    if (error) throw error;
    return data;
};

export const createClinic = async (clinic) => {
    const { data, error } = await supabase.from('clinics').insert([clinic]).select();
    if (error) throw error;
    return data[0];
};

// Patients
export const getPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) throw error;
    return data;
};

// Appointments
export const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
      *,
      clinics (name),
      patients (name)
    `);
    if (error) throw error;
    return data;
};

export const createAppointment = async (appointment) => {
    const { data, error } = await supabase.from('appointments').insert([appointment]).select();
    if (error) throw error;
    return data[0];
};

// Dashboard Stats
export const getDashboardStats = async () => {
    // Mock implementation for now, or complex queries
    return {
        revenue: 15000,
        pending: 3200,
        appointments: 45,
        clinics: 5
    };
};
