import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Tenant, AuthResponse, RefreshResponse } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  logoUrl: string | null;
  login: (data: AuthResponse, rememberMe?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  refreshAccessToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
          return;
        }

        // Check sessionStorage (session only)
        const sessionAuth = sessionStorage.getItem('track_performance_auth');
        if (sessionAuth) {
          const data: AuthResponse = JSON.parse(sessionAuth);
          setUser(data.user);
          setTenant(data.tenant);
          setToken(data.access_token);
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

  // Fetch logo when token is available
  useEffect(() => {
    const fetchLogo = async () => {
      if (!token) return;
      try {
        const response = await api.getTenantConfigs(token, 1, 'path_logo');
        const logoConfig = response.data.find(c => c.config_key === 'path_logo');
        if (logoConfig) {
          setLogoUrl(logoConfig.config_value);
        }
      } catch (error) {
        console.error('Failed to fetch logo', error);
      }
    };
    fetchLogo();
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
    localStorage.removeItem('track_performance_auth');
    sessionStorage.removeItem('track_performance_auth');
  }, []);

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
    <AuthContext.Provider value={{ user, tenant, token, logoUrl, login, logout, isAuthenticated: !!token, refreshAccessToken }}>
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
