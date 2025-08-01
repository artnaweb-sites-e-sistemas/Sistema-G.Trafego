import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './components/Header';
import MetricsGrid from './components/MetricsGrid';
import DailyControlTable from './components/DailyControlTable';
import MonthlyDetailsTable from './components/MonthlyDetailsTable';
import InsightsSection from './components/InsightsSection';
import HistorySection from './components/HistorySection';
import LoginScreen from './components/LoginScreen';
import { authService, User } from './services/authService';
import { metricsService, MetricData } from './services/metricsService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  
  // Estados para controlar origem dos dados
  const [dataSource, setDataSource] = useState<'manual' | 'facebook' | null>(null);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);

  // Função para obter o mês atual formatado
  const getCurrentMonth = () => {
    const now = new Date();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  // Estados para filtros do dashboard
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [selectedClient, setSelectedClient] = useState('Todos os Clientes');
  const [selectedProduct, setSelectedProduct] = useState('Todos os Produtos');
  const [selectedAudience, setSelectedAudience] = useState('Todos os Públicos');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    // Verificar autenticação inicial
    const checkAuth = () => {
      if (authService.isAuthenticated()) {
        const user = authService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Garantir que o mês selecionado seja sempre válido
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    if (selectedMonth !== currentMonth) {
      console.log('App: Atualizando mês selecionado para mês atual:', currentMonth);
      setSelectedMonth(currentMonth);
    }
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

  // Listener para seleção de Business Manager
  useEffect(() => {
    const handleBusinessManagerSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { businessManager, clientName } = customEvent.detail;
      console.log('Business Manager selecionada:', businessManager, clientName);
      
      // Atualizar cliente selecionado
      setSelectedClient(clientName);
      
      // Aqui você pode adicionar lógica para carregar métricas específicas da BM
      // Por exemplo, buscar contas de anúncios da BM e suas métricas
      try {
        // Forçar recarregamento das métricas com o novo cliente
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Erro ao carregar métricas da Business Manager:', error);
      }
    };

    window.addEventListener('businessManagerSelected', handleBusinessManagerSelected);

    return () => {
      window.removeEventListener('businessManagerSelected', handleBusinessManagerSelected);
    };
  }, []);

  // Listener para seleção de Campanha
  useEffect(() => {
    const handleCampaignSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { campaign, productName, campaignId } = customEvent.detail;
      console.log('Campanha selecionada:', campaign, productName, 'ID:', campaignId);
      
      // Atualizar produto selecionado
      setSelectedProduct(productName);
      
      // Armazenar o ID da campanha para usar nas métricas
      if (campaignId) {
        localStorage.setItem('selectedCampaignId', campaignId);
      }
      
      try {
        // Forçar recarregamento das métricas com a nova campanha
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Erro ao carregar métricas da campanha:', error);
      }
    };

    window.addEventListener('campaignSelected', handleCampaignSelected);

    return () => {
      window.removeEventListener('campaignSelected', handleCampaignSelected);
    };
  }, []);

  // Listener para seleção de Ad Set (Público)
  useEffect(() => {
    const handleAdSetSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { adSet, audienceName, adSetId } = customEvent.detail;
      console.log('Ad Set selecionado:', adSet, audienceName, 'ID:', adSetId);
      
      // Atualizar público selecionado
      setSelectedAudience(audienceName);
      
      // Armazenar o ID do Ad Set para usar nas métricas
      if (adSetId) {
        localStorage.setItem('selectedAdSetId', adSetId);
      }
      
      try {
        // Forçar recarregamento das métricas com o novo Ad Set
        setRefreshTrigger(prev => prev + 1);
      } catch (error) {
        console.error('Erro ao carregar métricas do Ad Set:', error);
      }
    };

    window.addEventListener('adSetSelected', handleAdSetSelected);

    return () => {
      window.removeEventListener('adSetSelected', handleAdSetSelected);
    };
  }, []);

  const handleLogin = async (email: string, password: string) => {
    try {
      setLoginError(null);
      const result = await authService.login(email, password);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        toast.success('Login realizado com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao fazer login');
      }
    } catch (error: any) {
      setLoginError(error.message);
      toast.error(error.message);
    }
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    try {
      setLoginError(null);
      const result = await authService.signUp(email, password, name);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        toast.success('Conta criada com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao criar conta');
      }
    } catch (error: any) {
      setLoginError(error.message);
      toast.error(error.message);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoginError(null);
      const result = await authService.loginWithGoogle();
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setIsAuthenticated(true);
        toast.success('Login com Google realizado com sucesso!');
      } else {
        throw new Error(result.error || 'Erro ao fazer login com Google');
      }
    } catch (error: any) {
      setLoginError(error.message);
      toast.error(error.message);
    }
  };

  const handleLogout = () => {
    authService.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
    setDataSource(null);
    setIsFacebookConnected(false);
    toast.success('Logout realizado com sucesso!');
  };

  const handleMetaAdsSync = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Função para atualizar origem dos dados
  const handleDataSourceChange = (source: 'manual' | 'facebook' | null, connected: boolean) => {
    console.log('Atualizando origem dos dados:', source, connected);
    setDataSource(source);
    setIsFacebookConnected(connected);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900">
        <LoginScreen 
          onLogin={handleLogin}
          onSignUp={handleSignUp}
          onGoogleLogin={handleGoogleLogin}
        />
        <Toaster position="top-right" />
      </div>
    );
  }

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
        dataSource={dataSource}
        isFacebookConnected={isFacebookConnected}
        onDataSourceChange={handleDataSourceChange}
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
        <DailyControlTable metrics={metrics} selectedCampaign={selectedCampaign} selectedMonth={selectedMonth} />
        <HistorySection />
      </div>
      
      <Toaster position="top-right" />
    </div>
  );
}

export default App;