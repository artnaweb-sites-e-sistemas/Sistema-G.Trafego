import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LoginScreen from './components/LoginScreen';
import MetricsGrid from './components/MetricsGrid';
import MonthlyDetailsTable from './components/MonthlyDetailsTable';
import InsightsSection from './components/InsightsSection';
import DailyControlTable from './components/DailyControlTable';
import HistorySection from './components/HistorySection';
import { metricsService, MetricData } from './services/metricsService';
import { authService, User } from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState('Julho 2023');
  const [selectedClient, setSelectedClient] = useState('Todos os Clientes');
  const [selectedProduct, setSelectedProduct] = useState('Todos os Produtos');
  const [selectedAudience, setSelectedAudience] = useState('Todos os Públicos');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        setIsAuthenticated(true);
        setCurrentUser(user);
      }
    };

    checkAuth();

    // Cleanup quando o componente for desmontado
    return () => {
      authService.cleanup();
    };
  }, []);

  // Carregar métricas apenas se autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await metricsService.getMetrics(selectedMonth, selectedClient, selectedProduct, selectedAudience, selectedCampaign);
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedMonth, selectedClient, selectedProduct, selectedAudience, selectedCampaign, refreshTrigger, isAuthenticated]);

  const handleLogin = async (email: string, password: string) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await authService.login(email, password);
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        setLoginError(null);
      } else {
        setLoginError(result.error || 'Erro ao fazer login');
      }
    } catch (err: any) {
      setLoginError('Erro inesperado ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await authService.signUp(email, password, name);
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        setLoginError(null);
      } else {
        setLoginError(result.error || 'Erro ao criar conta');
      }
    } catch (err: any) {
      setLoginError('Erro inesperado ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setLoginError(null);

    try {
      const result = await authService.loginWithGoogle();
      
      if (result.success && result.user) {
        setIsAuthenticated(true);
        setCurrentUser(result.user);
        setLoginError(null);
      } else {
        setLoginError(result.error || 'Erro ao fazer login com Google');
      }
    } catch (err: any) {
      setLoginError('Erro inesperado ao fazer login com Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const handleMetaAdsSync = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Mostrar tela de login se não autenticado
  if (!isAuthenticated) {
    return (
      <div>
        <LoginScreen 
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onGoogleLogin={handleGoogleLogin}
          isLoading={isLoading}
        />
        {/* Toast de erro */}
        {loginError && (
          <div className="fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 max-w-md">
            <div className="flex items-center justify-between">
              <span>{loginError}</span>
              <button 
                onClick={() => setLoginError(null)}
                className="ml-4 text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Mostrar dashboard se autenticado
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header 
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        selectedAudience={selectedAudience}
        setSelectedAudience={setSelectedAudience}
        selectedCampaign={selectedCampaign}
        setSelectedCampaign={setSelectedCampaign}
        onMetaAdsSync={handleMetaAdsSync}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
            Erro ao carregar dados: {error}
          </div>
        ) : (
          <>
            <MetricsGrid metrics={metrics} />
            <MonthlyDetailsTable metrics={metrics} />
          </>
        )}
        <InsightsSection />
        <DailyControlTable metrics={metrics} selectedCampaign={selectedCampaign} />
        <HistorySection />
      </div>
    </div>
  );
}

export default App;