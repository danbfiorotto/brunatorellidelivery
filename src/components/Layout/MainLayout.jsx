import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Building2, BarChart3, MessageSquare, User } from 'lucide-react';

const MainLayout = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Desktop Sidebar (Hidden on mobile) */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-primary-600">Meu EndoDelivery</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavItem to="/" icon={<LayoutDashboard size={20} />} label="Painel" />
                    <NavItem to="/appointments" icon={<Calendar size={20} />} label="Atendimentos" />
                    <NavItem to="/reports" icon={<BarChart3 size={20} />} label="Relatórios" />
                    <NavItem to="/clinics" icon={<Building2 size={20} />} label="Clínicas" />
                    <NavItem to="/patients" icon={<Users size={20} />} label="Pacientes" />
                    <NavItem to="/ai-assistant" icon={<MessageSquare size={20} />} label="Assistente IA" />
                    <NavItem to="/profile" icon={<User size={20} />} label="Perfil" />
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
                <div className="container mx-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 flex justify-around items-center px-2 py-3 shadow-lg">
                <MobileNavItem to="/" icon={<LayoutDashboard size={20} />} label="Painel" />
                <MobileNavItem to="/appointments" icon={<Calendar size={20} />} label="Atendimentos" />
                <MobileNavItem to="/reports" icon={<BarChart3 size={20} />} label="Relatórios" />
                <MobileNavItem to="/clinics" icon={<Building2 size={20} />} label="Clínicas" />
                <MobileNavItem to="/patients" icon={<Users size={20} />} label="Pacientes" />
            </nav>
        </div>
    );
};

const NavItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                ? 'bg-blue-50 text-blue-600 font-medium'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`
        }
    >
        {icon}
        <span>{label}</span>
    </NavLink>
);

const MobileNavItem = ({ to, icon, label }) => (
    <NavLink
        to={to}
        className={({ isActive }) =>
            `flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${isActive ? 'text-blue-600' : 'text-gray-500'
            }`
        }
    >
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
);

export default MainLayout;
