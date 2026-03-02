import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Bell, 
  Search,
  Menu,
  Store,
  MessageSquare,
  MessageSquarePlus,
  ShoppingBag
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

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
          <NavItem 
            to="/dashboard" 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={location.pathname === '/dashboard'} 
          />
          <NavItem 
            to="/stores" 
            icon={<Store size={20} />} 
            label="Lojas" 
            active={location.pathname === '/stores'} 
          />
          <NavItem 
            to="/posts" 
            icon={<MessageSquare size={20} />} 
            label="Posts" 
            active={location.pathname === '/posts'} 
          />
          <NavItem 
            to="/feedbacks" 
            icon={<MessageSquarePlus size={20} />} 
            label="Feedbacks" 
            active={location.pathname === '/feedbacks'} 
          />
          <NavItem 
            to="/team" 
            icon={<Users size={20} />} 
            label="Equipe" 
            active={location.pathname === '/team'} 
          />
          <NavItem 
            to="/rewards" 
            icon={<ShoppingBag size={20} />} 
            label="Prêmios" 
            active={location.pathname === '/rewards'} 
          />
          <NavItem 
            to="/reports" 
            icon={<TrendingUp size={20} />} 
            label="Relatórios" 
            active={location.pathname === '/reports'} 
          />
          <NavItem 
            to="/settings" 
            icon={<Settings size={20} />} 
            label="Configurações" 
            active={location.pathname === '/settings'} 
          />
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

        {children}

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 px-6 py-3 flex justify-between items-center z-20">
          <MobileNavItem 
            to="/dashboard" 
            icon={<LayoutDashboard size={24} />} 
            active={location.pathname === '/dashboard'} 
          />
          <MobileNavItem 
            to="/stores" 
            icon={<Store size={24} />} 
            active={location.pathname === '/stores'} 
          />
          <MobileNavItem 
            to="/posts" 
            icon={<MessageSquare size={24} />} 
            active={location.pathname === '/posts'} 
          />
          <MobileNavItem 
            to="/feedbacks" 
            icon={<MessageSquarePlus size={24} />} 
            active={location.pathname === '/feedbacks'} 
          />
          <MobileNavItem 
            to="/team" 
            icon={<Users size={24} />} 
            active={location.pathname === '/team'} 
          />
          <MobileNavItem 
            to="/rewards" 
            icon={<ShoppingBag size={24} />} 
            active={location.pathname === '/rewards'} 
          />
          <MobileNavItem 
            to="/reports" 
            icon={<TrendingUp size={24} />} 
            active={location.pathname === '/reports'} 
          />
          <MobileNavItem 
            to="/settings" 
            icon={<Settings size={24} />} 
            active={location.pathname === '/settings'} 
          />
          <button onClick={handleLogout} className="text-zinc-400">
            <LogOut size={24} />
          </button>
        </nav>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; to: string }> = ({ icon, label, active, to }) => (
  <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-zinc-600 hover:bg-zinc-50'}`}>
    {icon}
    <span>{label}</span>
  </Link>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode; active?: boolean; to: string }> = ({ icon, active, to }) => (
  <Link to={to} className={`${active ? 'text-emerald-600' : 'text-zinc-400'}`}>
    {icon}
  </Link>
);
