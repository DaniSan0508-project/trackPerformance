import React from 'react';
import { motion } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  User as UserIcon,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { user, tenant, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 h-screen sticky top-0">
        <div className="p-6 border-b border-zinc-100">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-zinc-900">TrackPerf</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active />
          <NavItem icon={<Users size={20} />} label="Equipe" />
          <NavItem icon={<TrendingUp size={20} />} label="Relatórios" />
          <NavItem icon={<Settings size={20} />} label="Configurações" />
        </nav>

        <div className="p-4 border-t border-zinc-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 text-zinc-600 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-zinc-200 px-4 py-3 md:px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4 md:hidden">
             <div className="bg-emerald-600 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </div>

          <div className="hidden md:flex items-center bg-zinc-100 rounded-xl px-3 py-1.5 w-96">
            <Search size={18} className="text-zinc-400" />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              className="bg-transparent border-none focus:ring-0 text-sm w-full ml-2"
            />
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button className="relative p-2 text-zinc-500 hover:bg-zinc-100 rounded-full transition-all">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-zinc-900">{user.name}</p>
                <p className="text-xs text-zinc-500">{user.user_type}</p>
              </div>
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold border-2 border-emerald-50 shadow-sm">
                {user.name.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-4 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Bem-vindo, {user.name.split(' ')[0]}!</h1>
              <p className="text-zinc-500">Aqui está o que está acontecendo na {tenant?.trading_name}.</p>
            </div>
            <div className="flex gap-2">
              <button className="bg-white border border-zinc-200 px-4 py-2 rounded-xl text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-all">
                Exportar
              </button>
              <button className="bg-emerald-600 px-4 py-2 rounded-xl text-sm font-medium text-white hover:bg-emerald-700 shadow-sm transition-all">
                Novo Relatório
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Vendas Totais" value="R$ 45.280" change="+12.5%" positive />
            <StatCard label="Novos Clientes" value="124" change="+3.2%" positive />
            <StatCard label="Taxa de Conversão" value="2.4%" change="-0.4%" />
            <StatCard label="Satisfação" value="98%" change="+1.2%" positive />
          </div>

          {/* Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp size={20} className="text-emerald-600" />
                Desempenho Semanal
              </h3>
              <div className="h-64 bg-zinc-50 rounded-xl border border-dashed border-zinc-200 flex items-center justify-center text-zinc-400">
                Gráfico de Desempenho (Placeholder)
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 space-y-4">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Building2 size={20} className="text-emerald-600" />
                Dados da Empresa
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
                  <span className="text-sm text-zinc-500">Nome</span>
                  <span className="text-sm font-semibold">{tenant?.trading_name}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
                  <span className="text-sm text-zinc-500">Status</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${tenant?.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {tenant?.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-zinc-50 rounded-xl">
                  <span className="text-sm text-zinc-500">ID do Tenant</span>
                  <span className="text-sm font-semibold">#{tenant?.id}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 flex justify-between items-center z-20">
          <MobileNavItem icon={<LayoutDashboard size={24} />} active />
          <MobileNavItem icon={<Users size={24} />} />
          <MobileNavItem icon={<TrendingUp size={24} />} />
          <MobileNavItem icon={<Settings size={24} />} />
          <button onClick={handleLogout} className="text-zinc-400">
            <LogOut size={24} />
          </button>
        </nav>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean }> = ({ icon, label, active }) => (
  <a href="#" className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'}`}>
    {icon}
    <span>{label}</span>
  </a>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode; active?: boolean }> = ({ icon, active }) => (
  <button className={`${active ? 'text-emerald-600' : 'text-zinc-400'}`}>
    {icon}
  </button>
);

const StatCard: React.FC<{ label: string; value: string; change: string; positive?: boolean }> = ({ label, value, change, positive }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100">
    <p className="text-sm text-zinc-500 mb-1">{label}</p>
    <div className="flex items-end justify-between">
      <h4 className="text-2xl font-bold text-zinc-900">{value}</h4>
      <span className={`text-xs font-bold px-2 py-1 rounded-lg ${positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
        {change}
      </span>
    </div>
  </div>
);
