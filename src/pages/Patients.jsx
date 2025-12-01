import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Calendar, ChevronRight, Mail, Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Modal from '../components/UI/Modal';
import Input from '../components/UI/Input';
import { getPatients, createPatient, getAppointments } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { formatPhoneNumber, unformatPhoneNumber, formatDate } from '../lib/utils';

const Patients = () => {
    const { t } = useLanguage();
    const [patients, setPatients] = useState([]);
    const [totalAppointments, setTotalAppointments] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    });
    const navigate = useNavigate();

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            const [patientsData, appointmentsData] = await Promise.all([
                getPatients(),
                getAppointments()
            ]);
            setPatients(patientsData || []);
            setTotalAppointments((appointmentsData || []).length);
        } catch (error) {
            console.error('Error loading patients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients
        .filter(patient =>
            patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            patient.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const nameA = (a.name || '').toLowerCase();
            const nameB = (b.name || '').toLowerCase();
            return nameA.localeCompare(nameB, 'pt-BR');
        });

    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
        >
            <div className="bg-gradient-to-r from-sky-500 to-emerald-500 dark:from-sky-600 dark:to-emerald-600 rounded-2xl p-6 md:p-8 text-white mb-8 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-2">{t('patients.title')}</h2>
                        <p className="text-white/90">{t('patients.subtitle')}</p>
                    </div>
                    <Button 
                        onClick={() => setIsModalOpen(true)}
                        className="gap-2 bg-white dark:bg-gray-800 text-sky-600 dark:text-sky-400 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
                    >
                        <User size={20} />
                        {t('patients.newPatient')}
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('patients.totalPatients')}</p>
                        <p className="text-2xl font-bold text-white">{patients.length}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('patients.totalAppointments')}</p>
                        <p className="text-2xl font-bold text-white">{totalAppointments}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
                        <p className="text-sm font-medium text-white/80 mb-1">{t('patients.foundRecords')}</p>
                        <p className="text-2xl font-bold text-white">{filteredPatients.length}</p>
                    </div>
                </div>
            </div>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder={t('patients.searchPlaceholder')}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {loading ? (
                        <div className="p-12 text-center">
                            <p className="text-gray-500 dark:text-gray-400">{t('patients.loading')}</p>
                        </div>
                    ) : (
                        filteredPatients.map((patient) => (
                            <motion.div
                                key={patient.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.15 }}
                                onClick={() => navigate(`/patients/${patient.id}`)}
                                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors group min-h-[80px]"
                            >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-sky-100 to-emerald-100 dark:from-sky-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center text-sky-700 dark:text-sky-300 font-bold text-lg shadow-sm">
                                    {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">{patient.name || 'Sem nome'}</h3>
                                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                                        {patient.email && (
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                <Mail size={12} className="text-gray-500 dark:text-gray-500" /> {patient.email}
                                            </span>
                                        )}
                                        {patient.phone && (
                                            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                                <Phone size={12} className="text-gray-500 dark:text-gray-500" /> {formatPhoneNumber(patient.phone)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 sm:gap-8">
                                {patient.last_visit && (
                                    <div className="hidden sm:block text-right">
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{t('patients.lastVisit')}</p>
                                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-gray-200">
                                            <Calendar size={14} className="text-gray-500 dark:text-gray-500" />
                                            {formatDate(patient.last_visit)}
                                        </div>
                                    </div>
                                )}
                                <ChevronRight className="text-gray-300 dark:text-gray-600 group-hover:text-sky-500 dark:group-hover:text-sky-400 transition-colors" size={20} />
                            </div>
                        </motion.div>
                        ))
                    )}
                    {filteredPatients.length === 0 && !loading && (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <User size={32} className="text-gray-300 dark:text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900 dark:text-white">{t('patients.noPatients')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">{t('patients.trySearch')}</p>
                        </div>
                    )}
                </div>
            </Card>

            {/* Create Patient Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setFormData({ name: '', email: '', phone: '' });
                }}
                title={t('patients.newPatient')}
            >
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                        // Remove phone formatting before saving
                        const dataToSave = {
                            ...formData,
                            phone: unformatPhoneNumber(formData.phone)
                        };
                        await createPatient(dataToSave);
                        setIsModalOpen(false);
                        setFormData({ name: '', email: '', phone: '' });
                        loadPatients();
                    } catch (error) {
                        console.error('Error creating patient:', error);
                        alert(t('patients.createError') + ': ' + error.message);
                    }
                }} className="space-y-4">
                    <Input
                        label={t('patients.fullName')}
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                    <Input
                        label={t('patients.email')}
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    <Input
                        label={t('patients.phone')}
                        type="tel"
                        placeholder="(11) 99999-9999"
                        maxLength={15}
                        value={formData.phone}
                        onChange={(e) => {
                            const formatted = formatPhoneNumber(e.target.value);
                            setFormData({ ...formData, phone: formatted });
                        }}
                    />
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={() => {
                                setIsModalOpen(false);
                                setFormData({ name: '', email: '', phone: '' });
                            }}
                        >
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit">
                            {t('patients.savePatient')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </motion.div>
    );
};

export default Patients;
