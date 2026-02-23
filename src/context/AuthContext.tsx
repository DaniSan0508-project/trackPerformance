import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Tenant, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  token: string | null;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedAuth = localStorage.getItem('track_performance_auth');
    if (savedAuth) {
      try {
        const data: AuthResponse = JSON.parse(savedAuth);
        setUser(data.user);
        setTenant(data.tenant);
        setToken(data.access_token);
      } catch (e) {
        localStorage.removeItem('track_performance_auth');
      }
    }
  }, []);

  const login = (data: AuthResponse) => {
    setUser(data.user);
    setTenant(data.tenant);
    setToken(data.access_token);
    localStorage.setItem('track_performance_auth', JSON.stringify(data));
  };

  const logout = () => {
    setUser(null);
    setTenant(null);
    setToken(null);
    localStorage.removeItem('track_performance_auth');
  };

  return (
    <AuthContext.Provider value={{ user, tenant, token, login, logout, isAuthenticated: !!token }}>
      {children}
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
