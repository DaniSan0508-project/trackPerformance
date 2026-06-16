import React, {useEffect, useRef, useState} from 'react';
import {useAuth} from '../context/AuthContext';
import {useTheme} from '../context/ThemeContext';
import {useNavigate, useLocation, Link, Outlet} from 'react-router-dom';
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
    Loader2,
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
    LucidePackage,
    Mail,
    User,
    ChevronLeft,
    ChevronRight,
    Map,
} from 'lucide-react';
import {UserProfileModal} from './UserProfileModal';
import { NotificationsSidebar } from './NotificationsSidebar';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC = () => {
    const {user, logout, logoUrl} = useAuth();
    const {theme, toggleTheme} = useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    const [notificationsUnreadCount, setNotificationsUnreadCount] = useState(0);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [showNotificationsSidebar, setShowNotificationsSidebar] = useState(false);
    const [isLogoLoading, setIsLogoLoading] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebar-collapsed');
        return saved === 'true';
    });
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Manage logo loading state with a failsafe timeout
    useEffect(() => {
        // If expanded and there is no custom logo, we show text, so no loading needed
        if (!isCollapsed && !logoUrl) {
            setIsLogoLoading(false);
            return;
        }

        setIsLogoLoading(true);

        // Failsafe: if image is cached and onLoad doesn't fire, remove loading after 500ms
        const timer = setTimeout(() => {
            setIsLogoLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, [isCollapsed, logoUrl]);

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(isCollapsed));
    }, [isCollapsed]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false);
            }
        };

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showUserMenu]);

    const handleLogout = () => {
        logout();
    };

    if (!user) return null;

    const logoContent = (
        <div className="flex items-center justify-center min-h-[48px] relative w-full">
            {/* Loading Indicator */}
            <AnimatePresence>
                {isLogoLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-[1px]"
                    >
                        <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
                {isCollapsed ? (
                    <motion.img
                        key="collapsed-icon"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.2 }}
                        src={theme === 'dark' ? '/logo-icon.png' : '/logo-icon-azul.png'}
                        alt="Icon"
                        onLoad={() => setIsLogoLoading(false)}
                        className={`h-8 w-8 object-contain ${isLogoLoading ? 'invisible' : 'visible'}`}
                    />
                ) : (
                    <motion.div
                        key="expanded-logo"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                        className={`w-full flex justify-center ${isLogoLoading ? 'invisible' : 'visible'}`}
                    >
                        {logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="Logo"
                                onLoad={() => setIsLogoLoading(false)}
                                className="h-10 w-auto object-contain max-w-[180px]"
                            />
                        ) : (
                            <div className="flex items-center justify-center w-full">
                                <img
                                    src={theme === 'dark' ? '/logo-icon.png' : '/logo-icon-azul.png'}
                                    alt="Engora Icon"
                                    className="h-10 w-10 object-contain"
                                    onLoad={() => setIsLogoLoading(false)}
                                />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );

    return (
        <div
            className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col md:flex-row transition-colors duration-200">
            {/* Sidebar - Desktop */}
            <aside
                className={`hidden md:flex flex-col ${isCollapsed ? 'w-20' : 'w-64'} bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 h-screen sticky top-0 transition-all duration-300 z-50`}>
                <div
                    className={`p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} min-h-[88px]`}>
                    {logoContent}
                    {!isCollapsed && (
                        <button 
                            onClick={() => setIsCollapsed(true)}
                            className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 transition-colors"
                        >
                            <ChevronLeft size={18} />
                        </button>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {isCollapsed && (
                        <button 
                            onClick={() => setIsCollapsed(false)}
                            className="w-full flex justify-center p-3 mb-4 rounded-xl text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all"
                            title="Expandir menu"
                        >
                            <ChevronRight size={20} />
                        </button>
                    )}

                    <NavItem
                        to="/dashboard"
                        icon={<TrendingUp size={20}/>}
                        label="Indicadores"
                        active={location.pathname === '/dashboard'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/posts"
                        icon={<Megaphone size={20}/>}
                        label="Postagens"
                        active={location.pathname === '/posts'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/campaigns"
                        icon={<Flag size={20}/>}
                        label="Campanhas"
                        active={location.pathname === '/campaigns'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/journeys"
                        icon={<Map size={20}/>}
                        label="Jornadas"
                        active={location.pathname === '/journeys'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/feedbacks"
                        icon={<ThumbsUp size={20}/>}
                        label="Feedbacks"
                        active={location.pathname === '/feedbacks'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/communications"
                        icon={<Mail size={20}/>}
                        label="Comunicados"
                        active={location.pathname === '/communications'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/surveys"
                        icon={<FileText size={20}/>}
                        label="Pesquisas"
                        active={location.pathname === '/surveys'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/team"
                        icon={<Users size={20}/>}
                        label="Meu Time"
                        active={location.pathname === '/team'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/rewards"
                        icon={<Gift size={20}/>}
                        label="Recompensas"
                        active={location.pathname === '/rewards'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/products"
                        icon={<LucidePackage size={20}/>}
                        label="Produtos"
                        active={location.pathname === '/products'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/stores"
                        icon={<Building2 size={20}/>}
                        label="Unidades"
                        active={location.pathname === '/stores'}
                        isCollapsed={isCollapsed}
                    />
                    <NavItem
                        to="/settings"
                        icon={<Settings size={20}/>}
                        label="Administração"
                        active={location.pathname === '/settings'}
                        isCollapsed={isCollapsed}
                    />
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 transition-colors duration-200">
                {/* Header */}
                <header
                    className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 md:px-8 flex items-center justify-between sticky top-0 z-40 transition-colors duration-200 h-[88px]">
                    <div className="flex items-center gap-4 md:hidden">
                        {logoContent}
                    </div>

                    <div className="hidden md:block">
                        {/* Espaçador para manter o alinhamento do lado direito quando não há busca */}
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        {/* Notificações de Comunicados */}
                        <button
                            onClick={() => setShowNotificationsSidebar(true)}
                            className="relative p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                            title="Notificações"
                        >
                            <Bell size={20}/>
                            {notificationsUnreadCount > 0 && (
                                <span
                                    className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {notificationsUnreadCount > 9 ? '9+' : notificationsUnreadCount}
                </span>
                            )}
                        </button>

                        <button
                            onClick={toggleTheme}
                            className="p-2 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                            title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
                        >
                            {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
                        </button>

                        <div className="flex items-center gap-3 pl-3 border-l border-zinc-200 dark:border-zinc-800">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold text-zinc-900 dark:text-white">{user.name}</p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.user_type}</p>
                            </div>
                            <div ref={userMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setShowUserMenu(prev => !prev)}
                                    className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-primary-700 dark:text-primary-400 font-bold border-2 border-primary-50 dark:border-primary-900/50 shadow-sm overflow-hidden hover:ring-2 hover:ring-primary-400 transition-all focus:outline-none"
                                    title="Menu do usuário"
                                >
                                    {user.profile_image_url ? (
                                        <img src={user.profile_image_url} alt={user.name || 'Usuário'}
                                             className="w-full h-full object-cover"/>
                                    ) : (
                                        user.name?.charAt(0)?.toUpperCase() ?? '?'
                                    )}
                                </button>

                                {showUserMenu && (
                                    <div
                                        className="absolute right-0 mt-2 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg py-1 z-[60]">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                setShowProfileModal(true);
                                            }}
                                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                                        >
                                            <User size={16}/>
                                            Perfil
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowUserMenu(false);
                                                handleLogout();
                                            }}
                                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        >
                                            <LogOut size={16}/>
                                            Sair
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <Outlet/>

                {/* Mobile Nav */}
                <nav
                    className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 px-6 py-3 flex justify-between items-center z-50 transition-colors duration-200">
                    <MobileNavItem
                        to="/dashboard"
                        icon={<Gamepad2 size={24}/>}
                        active={location.pathname === '/dashboard'}
                    />
                    <MobileNavItem
                        to="/stores"
                        icon={<Building2 size={24}/>}
                        active={location.pathname === '/stores'}
                    />
                    <MobileNavItem
                        to="/posts"
                        icon={<Megaphone size={24}/>}
                        active={location.pathname === '/posts'}
                    />
                    <MobileNavItem
                        to="/feedbacks"
                        icon={<ThumbsUp size={24}/>}
                        active={location.pathname === '/feedbacks'}
                    />
                    <MobileNavItem
                        to="/team"
                        icon={<Users size={24}/>}
                        active={location.pathname === '/team'}
                    />
                    <MobileNavItem
                        to="/rewards"
                        icon={<Gift size={24}/>}
                        active={location.pathname === '/rewards'}
                    />
                    <MobileNavItem
                        to="/campaigns"
                        icon={<Flag size={24}/>}
                        active={location.pathname === '/campaigns'}
                    />
                    <MobileNavItem
                        to="/journeys"
                        icon={<Map size={24}/>}
                        active={location.pathname === '/journeys'}
                    />
                    <MobileNavItem
                        to="/surveys"
                        icon={<FileText size={24}/>}
                        active={location.pathname === '/surveys'}
                    />
                    <MobileNavItem
                        to="/communications"
                        icon={<Mail size={24}/>}
                        active={location.pathname === '/communications'}
                    />
                    <MobileNavItem
                        to="/settings"
                        icon={<Settings size={24}/>}
                        active={location.pathname === '/settings'}
                    />
                    <button onClick={handleLogout}
                            className="text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                        <LogOut size={24}/>
                    </button>
                </nav>
            </main>

            <NotificationsSidebar
                isOpen={showNotificationsSidebar}
                onClose={() => setShowNotificationsSidebar(false)}
                onUnreadCountChange={setNotificationsUnreadCount}
            />
            <UserProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)}/>
        </div>
    );
};

const NavItem: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    to: string;
    isCollapsed?: boolean
}> = ({icon, label, active, to, isCollapsed}) => (
    <Link
        to={to}
        className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} p-3 rounded-xl transition-all ${
            active
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
        }`}
        title={isCollapsed ? label : ""}
    >
        <div className="flex-shrink-0">{icon}</div>
        {!isCollapsed && <span className="truncate">{label}</span>}
    </Link>
);

const MobileNavItem: React.FC<{ icon: React.ReactNode; active?: boolean; to: string }> = ({icon, active, to}) => (
    <Link to={to}
          className={`${active ? 'text-primary-600 dark:text-primary-400' : 'text-zinc-400 dark:text-zinc-500'}`}>
        {icon}
    </Link>
);
