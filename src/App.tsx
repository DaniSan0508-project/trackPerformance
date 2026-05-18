import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { usePrimaryColorSync } from './hooks/usePrimaryColorSync';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SettingsPage } from './pages/SettingsPage';
import { StoresPage } from './pages/StoresPage';
import { PostsPage } from './pages/PostsPage';
import { FeedbacksPage } from './pages/FeedbacksPage';
import { TeamPage } from './pages/TeamPage';
import { RewardsPage } from './pages/RewardsPage';
import { CampaignsPage } from './pages/CampaignsPage';
import { SurveysPage } from './pages/SurveysPage';
import { ProductsPage } from './pages/ProductsPage';
import { CommunicationsPage } from './pages/CommunicationsPage';
import { CommunicationsFeedPage } from './pages/CommunicationsFeedPage';
import { JourneysPage } from './pages/JourneysPage';
import { Layout } from './components/Layout';

// Componente interno para sincronizar cor primária
const AppContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  usePrimaryColorSync();
  return <>{children}</>;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const ProtectedLayout = () => (
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <AppContent>
            <Router>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                
                {/* Rotas Protegidas com Layout Persistente */}
                <Route element={<ProtectedLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/stores" element={<StoresPage />} />
                  <Route path="/posts" element={<PostsPage />} />
                  <Route path="/feedbacks" element={<FeedbacksPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/rewards" element={<RewardsPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/journeys" element={<JourneysPage />} />
                  <Route path="/surveys" element={<SurveysPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/communications" element={<CommunicationsPage />} />
                  <Route path="/communications/feed" element={<CommunicationsFeedPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>

                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Router>
          </AppContent>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
