import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, Tenant, AuthResponse, RefreshResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  logoUrl: string | null;
  coinName: string;
  login: (data: AuthResponse, rememberMe?: boolean) => void;
  logout: () => void;
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
  const [loading, setLoading] = useState(true);

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

  // Fetch tenant configs (logo and coin_name) when token is available
  useEffect(() => {
    const fetchTenantConfigs = async () => {
      if (!token) return;
      try {
        const response = await api.getTenantConfigs(token, 1);
        const logoConfig = response.data.find(c => c.config_key === 'path_logo');
        const coinConfig = response.data.find(c => c.config_key === 'coin_name');
        if (logoConfig) setLogoUrl(logoConfig.config_value);
        if (coinConfig && coinConfig.config_value) setCoinName(String(coinConfig.config_value));

        // Persist coin_name into storage if present so subsequent loads can restore it
        if (coinConfig && coinConfig.config_value) {
          const persist = (storage: Storage) => {
            const stored = storage.getItem('track_performance_auth');
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                parsed.coin_name = String(coinConfig.config_value);
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
    localStorage.removeItem('track_performance_auth');
    sessionStorage.removeItem('track_performance_auth');
  }, []);

  // Listen for unauthorized events from api service
  useEffect(() => {
    const handleUnauthorized = () => {
      logout();
    };

    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, [logout]);

  const refreshAccessToken = useCallback(async () => {
    if (!token) return;

    try {
      const data: RefreshResponse = await api.refreshToken(token);
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
        const userData = await api.getUser(token, user.id);
        // Handle if response is wrapped in { data: ... } or direct
        const freshUser = userData.data || userData;
        
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
    <AuthContext.Provider value={{ user, tenant, token, logoUrl, coinName, login, logout, isAuthenticated: !!token, refreshAccessToken }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
