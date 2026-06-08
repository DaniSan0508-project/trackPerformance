import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Tenant, AuthResponse, RefreshResponse } from '../types';
import { authService } from '../services/auth/authService';
import { tenantConfigsService } from '../services/tenantConfigs/tenantConfigsService';
import { usersService } from '../services/users/usersService';
import { DEFAULT_PRIMARY_COLOR } from '../utils/colorUtils';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  logoUrl: string | null;
  coinName: string;
  primaryColor: string;
  login: (data: AuthResponse, rememberMe?: boolean) => void;
  logout: () => void;
  updateCurrentUser: (updatedUser: User) => void;
  isAuthenticated: boolean;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coinName, setCoinName] = useState<string>('coins');
  const [primaryColor, setPrimaryColor] = useState<string>(DEFAULT_PRIMARY_COLOR);
  const [loading, setLoading] = useState(true);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Initialize state from storage
  useEffect(() => {
    const loadAuthData = () => {
      try {
        // Check localStorage first (remember me)
        const localAuth = localStorage.getItem('track_performance_auth');
        if (localAuth) {
          const data: AuthResponse = JSON.parse(localAuth);
          setUser(data.user);
          setTenant(data.tenant);
          setToken(data.access_token);
          // If coin_name was saved in storage, restore it
          // stored blob may contain coin_name added later
          const parsed = JSON.parse(localAuth);
          if (parsed.coin_name) setCoinName(parsed.coin_name);
          if (parsed.primary_color) setPrimaryColor(parsed.primary_color);
          return;
        }

        // Check sessionStorage (session only)
        const sessionAuth = sessionStorage.getItem('track_performance_auth');
        if (sessionAuth) {
          const data: AuthResponse = JSON.parse(sessionAuth);
          setUser(data.user);
          setTenant(data.tenant);
          setToken(data.access_token);
          const parsed = JSON.parse(sessionAuth);
          if (parsed.coin_name) setCoinName(parsed.coin_name);
          if (parsed.primary_color) setPrimaryColor(parsed.primary_color);
        }
      } catch (e) {
        console.error('Failed to parse auth data', e);
        localStorage.removeItem('track_performance_auth');
        sessionStorage.removeItem('track_performance_auth');
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, []);

  // Fetch tenant configs (logo, coin_name and primary_color) when token is available
  useEffect(() => {
    const fetchTenantConfigs = async () => {
      if (!token) return;
      try {
        const response = await tenantConfigsService.getTenantConfigs(token, 1);
        const logoConfig = response.data.find(c => c.config_key === 'path_logo');
        const coinConfig = response.data.find(c => c.config_key === 'coin_name');
        const primaryColorConfig = response.data.find(c => c.config_key === 'primary_color');

        if (logoConfig) setLogoUrl(logoConfig.config_value);
        if (coinConfig && coinConfig.config_value) setCoinName(String(coinConfig.config_value));
        if (primaryColorConfig && primaryColorConfig.config_value) {
          setPrimaryColor(String(primaryColorConfig.config_value));
        }

        // Persist coin_name and primary_color into storage if present
        if ((coinConfig && coinConfig.config_value) || (primaryColorConfig && primaryColorConfig.config_value)) {
          const persist = (storage: Storage) => {
            const stored = storage.getItem('track_performance_auth');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                if (coinConfig && coinConfig.config_value) {
                  parsed.coin_name = String(coinConfig.config_value);
                }
                if (primaryColorConfig && primaryColorConfig.config_value) {
                  parsed.primary_color = String(primaryColorConfig.config_value);
                }
                storage.setItem('track_performance_auth', JSON.stringify(parsed));
              } catch (e) {
                // ignore
              }
            }
          };
          persist(localStorage);
          persist(sessionStorage);
        }
      } catch (error) {
        console.error('Failed to fetch tenant configs', error);
      }
    };
    fetchTenantConfigs();
  }, [token]);

  const login = (data: AuthResponse, rememberMe: boolean = false) => {
    setUser(data.user);
    setTenant(data.tenant);
    setToken(data.access_token);
    
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('track_performance_auth', JSON.stringify(data));
    
    // Clear the other storage to avoid conflicts
    if (rememberMe) {
      sessionStorage.removeItem('track_performance_auth');
    } else {
      localStorage.removeItem('track_performance_auth');
    }
  };

  const logout = useCallback(() => {
    setUser(null);
    setTenant(null);
    setToken(null);
    setLogoUrl(null);
    setCoinName('coins');
    setPrimaryColor(DEFAULT_PRIMARY_COLOR);
    localStorage.removeItem('track_performance_auth');
    sessionStorage.removeItem('track_performance_auth');
    window.location.href = '/login';
  }, []);

  const updateCurrentUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);

    const updateStorage = (storage: Storage) => {
      const stored = storage.getItem('track_performance_auth');
      if (!stored) return;

      try {
        const parsed = JSON.parse(stored);
        parsed.user = updatedUser;
        storage.setItem('track_performance_auth', JSON.stringify(parsed));
      } catch (e) {
        // ignore
      }
    };

    updateStorage(localStorage);
    updateStorage(sessionStorage);
  }, []);

  // Listen for unauthorized events from api service
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsSessionExpired(true);
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const refreshAccessToken = useCallback(async () => {
    if (!token) return;

    try {
      const data: RefreshResponse = await authService.refreshToken(token);
      setToken(data.access_token);
      
      // Update stored data with new token
      const updateStorage = (storage: Storage) => {
        const stored = storage.getItem('track_performance_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.access_token = data.access_token;
          parsed.expires_in = data.expires_in;
          storage.setItem('track_performance_auth', JSON.stringify(parsed));
        }
      };

      updateStorage(localStorage);
      updateStorage(sessionStorage);
    } catch (error) {
      console.error('Failed to refresh token', error);
      // If refresh fails (e.g., 401), logout
      logout();
    }
  }, [token, logout]);

  // Setup auto-refresh interval
  useEffect(() => {
    if (!token) return;

    // Refresh every 50 minutes (3000000 ms) to be safe before 60 min expiry
    // Or simpler: just refresh periodically
    const REFRESH_INTERVAL = 50 * 60 * 1000; 
    
    const intervalId = setInterval(() => {
      refreshAccessToken();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [token, refreshAccessToken]);

  // Refresh user data to ensure we have latest fields (like user_type_id)
  useEffect(() => {
    const refreshUserData = async () => {
      if (!token || !user?.id) return;
      
      try {
        const userData = await usersService.getUser(token, user.id);
        // Handle if response is wrapped in { data: ... } or direct
        const apiUser = userData.data || userData;
        const freshUser = {
          ...user,
          ...apiUser,
          name: apiUser?.name || user.name,
          email: apiUser?.email || user.email,
        };
        
        // Only update if there are changes to avoid loops, or just update
        // Here we specifically care about user_type_id
        if (JSON.stringify(freshUser) !== JSON.stringify(user)) {
           setUser(freshUser);
           
           // Update storage
           const updateStorage = (storage: Storage) => {
             const stored = storage.getItem('track_performance_auth');
             if (stored) {
               const parsed = JSON.parse(stored);
                parsed.user = freshUser;
                storage.setItem('track_performance_auth', JSON.stringify(parsed));
              }
            };
           
           if (localStorage.getItem('track_performance_auth')) {
             updateStorage(localStorage);
           }
           if (sessionStorage.getItem('track_performance_auth')) {
             updateStorage(sessionStorage);
           }
        }
      } catch (err) {
        console.error('Failed to refresh user data:', err);
      }
    };

    refreshUserData();
  }, [token, user?.id]);

  return (
    <AuthContext.Provider value={{ user, tenant, token, logoUrl, coinName, primaryColor, login, logout, updateCurrentUser, isAuthenticated: !!token, refreshAccessToken }}>
      {!loading && children}
      {isSessionExpired && (
        <SessionExpiredModal
          onConfirm={() => {
            setIsSessionExpired(false);
            logout();
          }}
        />
      )}
    </AuthContext.Provider>
  );
};

interface SessionExpiredModalProps {
  onConfirm: () => void;
}

const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-amber-500">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-zinc-950/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
            <AlertIcon />
          </div>
          <h3 className="text-xl font-bold text-zinc-100 mb-2">Sessão Expirada</h3>
          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
            Sua sessão expirou. Para continuar utilizando a plataforma, por favor faça login novamente.
          </p>
          <button
            onClick={onConfirm}
            className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-orange-500/20 active:scale-[0.98]"
          >
            Fazer Login Novamente
          </button>
        </div>
      </div>
    </div>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
