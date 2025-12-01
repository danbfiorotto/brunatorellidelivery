import { supabase } from '../lib/supabaseClient';

// ==================== CLINICS ====================
export const getClinics = async () => {
    const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getClinic = async (id) => {
    const { data, error } = await supabase
        .from('clinics')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

export const createClinic = async (clinic) => {
    const { data, error } = await supabase
        .from('clinics')
        .insert([{
            name: clinic.name,
            address: clinic.address || null,
            email: clinic.email || null,
            phone: clinic.phone || null,
            status: 'active'
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateClinic = async (id, clinic) => {
    const { data, error } = await supabase
        .from('clinics')
        .update({
            name: clinic.name,
            address: clinic.address || null,
            email: clinic.email || null,
            phone: clinic.phone || null,
            status: clinic.status || 'active'
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteClinic = async (id) => {
    const { error } = await supabase
        .from('clinics')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ==================== PATIENTS ====================
export const getPatients = async () => {
    const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getPatient = async (id) => {
    const { data, error } = await supabase
        .from('patients')
        .select(`
            *,
            appointments (
                id,
                date,
                time,
                procedure,
                value,
                currency,
                status,
                payment_type,
                payment_percentage,
                is_paid,
                payment_date,
                clinical_evolution,
                notes,
                created_at,
                clinics (
                    id,
                    name,
                    address,
                    email,
                    phone
                )
            )
        `)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

export const createPatient = async (patient) => {
    const { data, error } = await supabase
        .from('patients')
        .insert([{
            name: patient.name,
            email: patient.email || null,
            phone: patient.phone || null
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updatePatient = async (id, patient) => {
    const { data, error } = await supabase
        .from('patients')
        .update({
            name: patient.name,
            email: patient.email || null,
            phone: patient.phone || null,
            last_visit: patient.last_visit || null
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deletePatient = async (id) => {
    const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ==================== APPOINTMENTS ====================
export const getAppointments = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            clinics (id, name, email, phone),
            patients (id, name, email, phone)
        `)
        .order('date', { ascending: false })
        .order('time', { ascending: false });
    if (error) throw error;
    return data || [];
};

export const getAppointment = async (id) => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            *,
            clinics (*),
            patients (*)
        `)
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

export const createAppointment = async (appointmentData) => {
    // First, check if patient exists, if not create it
    let patientId = appointmentData.patient_id;
    
    if (!patientId && appointmentData.patient_name) {
        // Try to find existing patient by name or email
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .or(`name.eq.${appointmentData.patient_name}${appointmentData.patient_email ? `,email.eq.${appointmentData.patient_email}` : ''}`)
            .limit(1)
            .single();
        
        if (existingPatient) {
            patientId = existingPatient.id;
            // Update patient info if provided
            if (appointmentData.patient_email || appointmentData.patient_phone) {
                await updatePatient(patientId, {
                    name: appointmentData.patient_name,
                    email: appointmentData.patient_email,
                    phone: appointmentData.patient_phone
                });
            }
        } else {
            // Create new patient
            const newPatient = await createPatient({
                name: appointmentData.patient_name,
                email: appointmentData.patient_email,
                phone: appointmentData.patient_phone
            });
            patientId = newPatient.id;
        }
    }

    // Determine status based on is_paid
    let status = appointmentData.status || 'scheduled';
    if (appointmentData.is_paid) {
        status = 'paid';
    } else if (status === 'scheduled' && !appointmentData.is_paid) {
        status = 'pending';
    }

    const appointment = {
        clinic_id: appointmentData.clinic_id || null,
        patient_id: patientId,
        date: appointmentData.date,
        time: appointmentData.time,
        procedure: appointmentData.procedure,
        value: parseFloat(appointmentData.value) || 0,
        currency: appointmentData.currency || 'BRL',
        payment_type: appointmentData.payment_type || '100',
        payment_percentage: appointmentData.payment_percentage ? parseFloat(appointmentData.payment_percentage) : null,
        is_paid: appointmentData.is_paid || false,
        payment_date: appointmentData.is_paid && appointmentData.payment_date ? appointmentData.payment_date : null,
        status: status,
        clinical_evolution: appointmentData.clinical_evolution || null,
        notes: appointmentData.notes || null
    };

    const { data, error } = await supabase
        .from('appointments')
        .insert([appointment])
        .select(`
            *,
            clinics (*),
            patients (*)
        `)
        .single();
    
    if (error) {
        console.error('Error inserting appointment:', error);
        console.error('Appointment data that failed:', appointment);
        throw error;
    }
    
    // Debug: log what was saved
    console.log('Appointment saved successfully:', data);
    console.log('Saved clinical_evolution:', data.clinical_evolution);
    console.log('Saved notes:', data.notes);
    
    // Update patient's last_visit
    if (patientId) {
        await updatePatient(patientId, {
            last_visit: appointmentData.date
        });
    }
    
    return data;
};

export const updateAppointment = async (id, appointmentData) => {
    console.log('Updating appointment with data:', appointmentData);
    // Handle patient update if needed
    let patientId = appointmentData.patient_id;
    
    if (!patientId && appointmentData.patient_name) {
        const { data: existingPatient } = await supabase
            .from('patients')
            .select('id')
            .or(`name.eq.${appointmentData.patient_name}${appointmentData.patient_email ? `,email.eq.${appointmentData.patient_email}` : ''}`)
            .limit(1)
            .single();
        
        if (existingPatient) {
            patientId = existingPatient.id;
            if (appointmentData.patient_email || appointmentData.patient_phone) {
                await updatePatient(patientId, {
                    name: appointmentData.patient_name,
                    email: appointmentData.patient_email,
                    phone: appointmentData.patient_phone
                });
            }
        } else {
            const newPatient = await createPatient({
                name: appointmentData.patient_name,
                email: appointmentData.patient_email,
                phone: appointmentData.patient_phone
            });
            patientId = newPatient.id;
        }
    }

    let status = appointmentData.status || 'scheduled';
    if (appointmentData.is_paid) {
        status = 'paid';
    } else if (status === 'scheduled' && !appointmentData.is_paid) {
        status = 'pending';
    }

    const appointment = {
        clinic_id: appointmentData.clinic_id || null,
        patient_id: patientId,
        date: appointmentData.date,
        time: appointmentData.time,
        procedure: appointmentData.procedure,
        value: parseFloat(appointmentData.value) || 0,
        currency: appointmentData.currency || 'BRL',
        payment_type: appointmentData.payment_type || '100',
        payment_percentage: appointmentData.payment_percentage ? parseFloat(appointmentData.payment_percentage) : null,
        is_paid: appointmentData.is_paid || false,
        payment_date: appointmentData.is_paid && appointmentData.payment_date ? appointmentData.payment_date : null,
        status: status,
        clinical_evolution: appointmentData.clinical_evolution && appointmentData.clinical_evolution.trim() ? appointmentData.clinical_evolution.trim() : null,
        notes: appointmentData.notes && appointmentData.notes.trim() ? appointmentData.notes.trim() : null
    };

    // Debug: log appointment data before update
    console.log('Appointment data being updated:', appointment);
    console.log('Clinical evolution value:', appointment.clinical_evolution);
    console.log('Notes value:', appointment.notes);

    const { data, error } = await supabase
        .from('appointments')
        .update(appointment)
        .eq('id', id)
        .select(`
            *,
            clinics (*),
            patients (*)
        `)
        .single();
    
    if (error) {
        console.error('Error updating appointment:', error);
        console.error('Appointment data that failed:', appointment);
        throw error;
    }
    
    // Debug: log what was updated
    console.log('Appointment updated successfully:', data);
    console.log('Updated clinical_evolution:', data.clinical_evolution);
    console.log('Updated notes:', data.notes);
    
    if (patientId) {
        await updatePatient(patientId, {
            last_visit: appointmentData.date
        });
    }
    
    return data;
};

export const deleteAppointment = async (id) => {
    const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// ==================== RADIOGRAPHS ====================
export const getRadiographs = async (patientId) => {
    const { data, error } = await supabase
        .from('radiographs')
        .select(`
            *,
            appointments (
                id,
                date,
                time,
                procedure
            )
        `)
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });
    if (error) {
        console.error('Error fetching radiographs:', error);
        throw error;
    }
    
    // Normalize the data - Supabase returns appointments as array for one-to-many
    // but since appointment_id is a foreign key, it should be a single object
    const normalized = (data || []).map(radio => {
        let appointment = null;
        if (radio.appointments) {
            // If it's an array, take the first item (should only be one)
            if (Array.isArray(radio.appointments) && radio.appointments.length > 0) {
                appointment = radio.appointments[0];
            } else if (typeof radio.appointments === 'object' && radio.appointments !== null && !Array.isArray(radio.appointments)) {
                appointment = radio.appointments;
            }
        }
        return {
            ...radio,
            appointment: appointment
        };
    });
    
    return normalized;
};

// Upload file to Supabase Storage
export const uploadFileToStorage = async (file, folder = 'radiographs') => {
    // Generate unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
        .from('radiographs')
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
        .from('radiographs')
        .getPublicUrl(filePath);

    return {
        url: publicUrl,
        path: filePath,
        fileName: file.name
    };
};

// Delete file from Supabase Storage
export const deleteFileFromStorage = async (filePath) => {
    const { error } = await supabase.storage
        .from('radiographs')
        .remove([filePath]);
    
    if (error) throw error;
};

export const uploadRadiograph = async (patientId, appointmentId, fileOrUrl, fileName = null, fileSize = null) => {
    let fileUrl;
    let finalFileName = fileName || 'radiografia.jpg';
    let finalFileSize = fileSize;

    // Check if it's a File object or a data URL
    if (fileOrUrl instanceof File) {
        // Upload to Supabase Storage
        const uploadResult = await uploadFileToStorage(fileOrUrl);
        fileUrl = uploadResult.url;
        finalFileName = uploadResult.fileName;
        finalFileSize = fileOrUrl.size;
    } else {
        // Legacy: data URL (for backward compatibility)
        fileUrl = fileOrUrl;
    }

    // Save metadata to database
    const { data, error } = await supabase
        .from('radiographs')
        .insert([{
            patient_id: patientId,
            appointment_id: appointmentId || null,
            file_url: fileUrl,
            file_name: finalFileName,
            file_size: finalFileSize,
            description: null
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteRadiograph = async (id) => {
    // First, get the radiograph to find the file path
    const { data: radiograph, error: fetchError } = await supabase
        .from('radiographs')
        .select('file_url')
        .eq('id', id)
        .single();

    if (fetchError) throw fetchError;

    // Try to delete from storage if it's a storage URL
    if (radiograph?.file_url && radiograph.file_url.includes('/storage/v1/object/public/')) {
        try {
            // Extract path from URL
            const urlParts = radiograph.file_url.split('/storage/v1/object/public/radiographs/');
            if (urlParts.length > 1) {
                const filePath = `radiographs/${urlParts[1]}`;
                await deleteFileFromStorage(filePath);
            }
        } catch (storageError) {
            console.warn('Error deleting from storage:', storageError);
            // Continue to delete from database even if storage delete fails
        }
    }

    // Delete from database
    const { error } = await supabase
        .from('radiographs')
        .delete()
        .eq('id', id);
    if (error) throw error;
};

// Helper function to calculate received value
const calculateReceivedValue = (appointment) => {
    const totalValue = parseFloat(appointment.value || 0);
    
    if (appointment.payment_type === '100' || !appointment.payment_type) {
        return totalValue;
    } else if (appointment.payment_type === 'percentage' && appointment.payment_percentage) {
        const percentage = parseFloat(appointment.payment_percentage);
        return (totalValue * percentage) / 100;
    }
    
    return totalValue;
};

// ==================== DASHBOARD STATS ====================
export const getDashboardStats = async () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Get all appointments for current month
    const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('value, status, date, payment_type, payment_percentage')
        .gte('date', startOfMonth.toISOString().split('T')[0]);
    
    if (appointmentsError) throw appointmentsError;
    
    // Calculate stats using received value
    const revenue = (appointments || [])
        .filter(a => a.status === 'paid')
        .reduce((sum, a) => sum + calculateReceivedValue(a), 0);
    
    const pending = (appointments || [])
        .filter(a => a.status === 'pending')
        .reduce((sum, a) => {
            const totalValue = parseFloat(a.value || 0);
            const receivedValue = calculateReceivedValue(a);
            return sum + (totalValue - receivedValue);
        }, 0);
    
    const totalAppointments = (appointments || []).length;
    
    // Get clinics count
    const { count: clinicsCount, error: clinicsError } = await supabase
        .from('clinics')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
    
    if (clinicsError) throw clinicsError;
    
    return {
        revenue,
        pending,
        appointments: totalAppointments,
        clinics: clinicsCount || 0
    };
};

// ==================== REPORTS ====================
export const getReportsData = async (startDate, endDate) => {
    const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
            *,
            clinics (id, name),
            patients (name)
        `)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });
    
    if (error) throw error;
    
    return appointments || [];
};

// ==================== USER PROFILE ====================
export const getUserProfile = async (userId) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
    }
    return data;
};

export const createUserProfile = async (userId, profile) => {
    const { data, error } = await supabase
        .from('user_profiles')
        .insert([{
            user_id: userId,
            name: profile.name,
            phone: profile.phone || null,
            language: profile.language || 'pt-BR',
            currency: profile.currency || 'BRL',
            notifications_push: profile.notifications_push !== undefined ? profile.notifications_push : true,
            notifications_appointments: profile.notifications_appointments !== undefined ? profile.notifications_appointments : true,
            notifications_pending: profile.notifications_pending !== undefined ? profile.notifications_pending : true,
            notifications_clinics: profile.notifications_clinics !== undefined ? profile.notifications_clinics : false,
            notifications_plan_expiry: profile.notifications_plan_expiry !== undefined ? profile.notifications_plan_expiry : true
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateUserProfile = async (userId, profile) => {
    // First check if profile exists
    const existing = await getUserProfile(userId);
    
    if (existing) {
        // Update existing profile
        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                name: profile.name,
                phone: profile.phone || null,
                language: profile.language || 'pt-BR',
                currency: profile.currency || 'BRL',
                notifications_push: profile.notifications_push !== undefined ? profile.notifications_push : true,
                notifications_appointments: profile.notifications_appointments !== undefined ? profile.notifications_appointments : true,
                notifications_pending: profile.notifications_pending !== undefined ? profile.notifications_pending : true,
                notifications_clinics: profile.notifications_clinics !== undefined ? profile.notifications_clinics : false,
                notifications_plan_expiry: profile.notifications_plan_expiry !== undefined ? profile.notifications_plan_expiry : true,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select()
            .single();
        if (error) throw error;
        return data;
    } else {
        // Create new profile
        return await createUserProfile(userId, profile);
    }
};

// ==================== CLINIC STATS ====================
// Get clinic statistics
export const getClinicStats = async () => {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
            value,
            status,
            payment_type,
            payment_percentage,
            clinics (id, name)
        `);
    
    if (error) throw error;
    
    // Group by clinic
    const clinicMap = {};
    (data || []).forEach(apt => {
        const clinicId = apt.clinics?.id;
        const clinicName = apt.clinics?.name || 'Sem clínica';
        
        if (!clinicMap[clinicId]) {
            clinicMap[clinicId] = {
                id: clinicId,
                name: clinicName,
                revenue: 0,
                appointments: 0,
                paid: 0
            };
        }
        
        clinicMap[clinicId].appointments++;
        if (apt.status === 'paid') {
            clinicMap[clinicId].revenue += calculateReceivedValue(apt);
            clinicMap[clinicId].paid++;
        }
    });
    
    return Object.values(clinicMap)
        .map(clinic => ({
            ...clinic,
            ticket: clinic.paid > 0 ? clinic.revenue / clinic.paid : 0
        }))
        .sort((a, b) => b.revenue - a.revenue);
};

// ==================== PROCEDURES ====================
export const getProcedures = async () => {
    const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const getProcedure = async (id) => {
    const { data, error } = await supabase
        .from('procedures')
        .select('*')
        .eq('id', id)
        .single();
    if (error) throw error;
    return data;
};

export const createProcedure = async (procedure) => {
    const { data, error } = await supabase
        .from('procedures')
        .insert([{
            name: procedure.name,
            description: procedure.description || null,
            category: procedure.category || null,
            is_active: procedure.is_active !== undefined ? procedure.is_active : true,
            display_order: procedure.display_order || 0
        }])
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const updateProcedure = async (id, procedure) => {
    const { data, error } = await supabase
        .from('procedures')
        .update({
            name: procedure.name,
            description: procedure.description || null,
            category: procedure.category || null,
            is_active: procedure.is_active !== undefined ? procedure.is_active : true,
            display_order: procedure.display_order || 0
        })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

export const deleteProcedure = async (id) => {
    // Soft delete - set is_active to false instead of deleting
    const { data, error } = await supabase
        .from('procedures')
        .update({ is_active: false })
        .eq('id', id)
        .select()
        .single();
    if (error) throw error;
    return data;
};

// Get stats for a specific clinic
export const getClinicStatsById = async (clinicId) => {
    if (!clinicId) {
        return {
            appointments: 0,
            revenue: 0,
            ticket: 0
        };
    }

    const { data, error } = await supabase
        .from('appointments')
        .select('value, status, payment_type, payment_percentage')
        .eq('clinic_id', clinicId);
    
    if (error) throw error;
    
    const appointments = data || [];
    const totalValue = appointments.reduce((sum, a) => sum + parseFloat(a.value || 0), 0);
    const paidAppointments = appointments.filter(a => a.status === 'paid');
    const revenue = paidAppointments.reduce((sum, a) => sum + calculateReceivedValue(a), 0);
    // Ticket médio baseado em todos os atendimentos (não apenas os pagos)
    const ticket = appointments.length > 0 ? totalValue / appointments.length : 0;
    
    return {
        appointments: appointments.length,
        revenue,
        ticket
    };
};
