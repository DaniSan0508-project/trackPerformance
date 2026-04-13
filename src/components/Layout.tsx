import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate, useLocation, Link, Outlet } from 'react-router-dom';
import {
  Gamepad2,
  Users,
  TrendingUp,
  Shield,
  Settings,
  LogOut,
  Bell,
  Search,
  Menu,
  Building2,
  Megaphone,
  ThumbsUp,
  Gift,
  Flag,
  BarChart3,
  FileText,
  Sun,
  Moon,
  Trophy,
    LucidePackage
} from 'lucide-react';

export const Layout: React.FC = () => {
  const { user, logout, logoUrl } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const logoContent = (
    logoUrl ? (
      <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain max-w-[180px]" />
    ) : (
      <div className="flex items-center gap-3">
        <div className="bg-primary-600 p-2 rounded-lg">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-xl text-zinc-900 dark:text-white">TrackPerf</span>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row transition-colors duration-200">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-screen sticky top-0 transition-colors duration-200">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-center md:justify-start min-h-[88px]">
          {logoContent}
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            to="/dashboard"
            icon={<TrendingUp size={20} />}
            label="Indicadores"
            active={location.pathname === '/dashboard'}
          />
          <NavItem
            to="/stores"
            icon={<Building2 size={20} />}
            label="Unidades"
            active={location.pathname === '/stores'}
          />
          <NavItem
            to="/posts"
            icon={<Megaphone size={20} />}
            label="Postagens"
            active={location.pathname === '/posts'}
          />
          <NavItem
            to="/feedbacks"
            icon={<ThumbsUp size={20} />}
            label="Feedbacks"
            active={location.pathname === '/feedbacks'}
          />
          <NavItem
            to="/team"
            icon={<Users size={20} />}
            label="Meu Time"
            active={location.pathname === '/team'}
          />
          <NavItem
            to="/rewards"
            icon={<Gift size={20} />}
            label="Recompensas"
            active={location.pathname === '/rewards'}
          />
          <NavItem
            to="/campaigns"
            icon={<Flag size={20} />}
            label="Campanhas"
            active={location.pathname === '/campaigns'}
          />
            <NavItem
            to="/products"
            icon={<LucidePackage size={20} />}
            label="Produtos"
            active={location.pathname === '/products'}
          />
          <NavItem
            to="/surveys"
            icon={<FileText size={20} />}
            label="Pesquisas"
            active={location.pathname === '/surveys'}
          />
          <NavItem
            to="/settings"
            icon={<Settings size={20} />}
            label="Administração"
            active={location.pathname === '/settings'}
          />
        </nav>

        <div className="p-4 border-t border-zinc-100 dark:border-zinc-800">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 text-zinc-600 dark:text-zinc-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 transition-colors duration-200">
        {/* Header */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 md:px-8 flex items-center justify-between sticky top-0 z-10 transition-colors duration-200">
          <div className="flex items-center gap-4 md:hidden">
             {logoContent}
          </div>

          <div className="hidden md:block">
            {/* Espaçador para manter o alinhamento do lado direito quando não há busca */}
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            <button 
              onClick={toggleTheme}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
              title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            
            <div className="flex items-center gap-3 pl-3 border-l border-zinc-200 dark:border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.user_type}</p>
              </div>
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border-2 border-primary-50 dark:border-primary-900/50 shadow-sm overflow-hidden">
                {user.profile_image_url ? (
                  <img src={user.profile_image_url} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
            </div>
          </div>
        </header>

        <Outlet />

        {/* Mobile Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-3 flex justify-between items-center z-20 transition-colors duration-200">
          <MobileNavItem
            to="/dashboard"
            icon={<Gamepad2 size={24} />}
            active={location.pathname === '/dashboard'}
          />
          <MobileNavItem
            to="/stores"
            icon={<Building2 size={24} />}
            active={location.pathname === '/stores'}
          />
          <MobileNavItem
            to="/posts"
            icon={<Megaphone size={24} />}
            active={location.pathname === '/posts'}
          />
          <MobileNavItem
            to="/feedbacks"
            icon={<ThumbsUp size={24} />}
            active={location.pathname === '/feedbacks'}
          />
          <MobileNavItem
            to="/team"
            icon={<Users size={24} />}
            active={location.pathname === '/team'}
          />
          <MobileNavItem
            to="/rewards"
            icon={<Gift size={24} />}
            active={location.pathname === '/rewards'}
          />
          <MobileNavItem
            to="/campaigns"
            icon={<Flag size={24} />}
            active={location.pathname === '/campaigns'}
          />
          <MobileNavItem
            to="/surveys"
            icon={<FileText size={24} />}
            active={location.pathname === '/surveys'}
          />
          <MobileNavItem
            to="/settings"
            icon={<Settings size={24} />}
            active={location.pathname === '/settings'}
          />
          <button onClick={handleLogout} className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
            <LogOut size={24} />
          </button>
        </nav>
      </main>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; to: string }> = ({ icon, label, active, to }) => (
  <Link to={to} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${active ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'}`}>
    {icon}
    <span>{label}</span>
  </Link>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode; active?: boolean; to: string }> = ({ icon, active, to }) => (
  <Link to={to} className={`${active ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
    {icon}
  </Link>
);
