import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './Header';
import MetricsGrid from './MetricsGrid';
import DailyControlTable from './DailyControlTable';
import MonthlyDetailsTable from './MonthlyDetailsTable';
import InsightsSection from './InsightsSection';
import HistorySection from './HistorySection';
import { User } from '../services/authService';
import { metricsService, MetricData } from '../services/metricsService';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout }) => {
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

  // Carregar estado salvo do localStorage ao inicializar
  useEffect(() => {
    const savedClient = localStorage.getItem('currentSelectedClient');
    const savedProduct = localStorage.getItem('selectedProduct');
    const savedAudience = localStorage.getItem('selectedAudience');
    const savedCampaign = localStorage.getItem('selectedCampaignId');
    
    console.log('Dashboard: Carregando estado salvo do localStorage');
    console.log('Cliente salvo:', savedClient);
    console.log('Produto salvo:', savedProduct);
    console.log('Público salvo:', savedAudience);
    console.log('Campanha salva:', savedCampaign);
    
    if (savedClient && savedClient !== 'Todos os Clientes') {
      setSelectedClient(savedClient);
      console.log('Dashboard: Cliente restaurado:', savedClient);
    }
    
    if (savedProduct && savedProduct !== 'Todos os Produtos') {
      setSelectedProduct(savedProduct);
      console.log('Dashboard: Produto restaurado:', savedProduct);
    }
    
    if (savedAudience && savedAudience !== 'Todos os Públicos') {
      setSelectedAudience(savedAudience);
      console.log('Dashboard: Público restaurado:', savedAudience);
    }
    
    if (savedCampaign) {
      setSelectedCampaign(savedCampaign);
      console.log('Dashboard: Campanha restaurada:', savedCampaign);
    }
  }, []);

  // Garantir que o mês selecionado seja sempre válido
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    if (selectedMonth !== currentMonth) {
      console.log('Dashboard: Atualizando mês selecionado para mês atual:', currentMonth);
      setSelectedMonth(currentMonth);
    }
  }, []);

  // Carregar métricas
  useEffect(() => {
    const loadMetrics = async () => {
      // Não carregar métricas se não há cliente selecionado
      if (selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
        console.log('Dashboard: Nenhum cliente selecionado - zerando métricas');
        setMetrics([]);
        setLoading(false);
        return;
      }

      // Não carregar métricas se não está conectado ao Meta Ads
      if (dataSource === 'facebook' && !isFacebookConnected) {
        console.log('Dashboard: Meta Ads não conectado - zerando métricas');
        setMetrics([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Dashboard: Carregando métricas para cliente:', selectedClient);
        const data = await metricsService.getMetrics(selectedMonth, selectedClient, selectedProduct, selectedAudience, selectedCampaign);
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedMonth, selectedClient, selectedProduct, selectedAudience, selectedCampaign, refreshTrigger, dataSource, isFacebookConnected]);

  // Listener para seleção de Business Manager
  useEffect(() => {
    const handleBusinessManagerSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { businessManager, clientName } = customEvent.detail;
      console.log('Business Manager selecionada:', businessManager, clientName);
      
      // Atualizar cliente selecionado
      setSelectedClient(clientName);
      
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

  // Listener para limpeza de cliente
  useEffect(() => {
    const handleClientCleared = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { clientName } = customEvent.detail;
      console.log('Cliente limpo:', clientName);
      
      // Atualizar cliente selecionado no Dashboard
      setSelectedClient('Selecione um cliente');
      
      // Zerar métricas quando cliente for limpo
      setMetrics([]);
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      
      // Forçar refresh das métricas para garantir que sejam zeradas
      setRefreshTrigger(prev => prev + 1);
      
      console.log('Dashboard: Cliente e métricas zerados após limpeza');
    };

    window.addEventListener('clientCleared', handleClientCleared);

    return () => {
      window.removeEventListener('clientCleared', handleClientCleared);
    };
  }, []);

  // Listener para quando não há produtos encontrados
  useEffect(() => {
    const handleNoProductsFound = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { clientName } = customEvent.detail;
      console.log('Nenhum produto encontrado para cliente:', clientName);
      
      // Zerar métricas quando não há produtos
      setMetrics([]);
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      
      console.log('Dashboard: Métricas zeradas - nenhum produto encontrado');
    };

    window.addEventListener('noProductsFound', handleNoProductsFound);

    return () => {
      window.removeEventListener('noProductsFound', handleNoProductsFound);
    };
  }, []);

  // Listener para atualizações do Meta Ads
  useEffect(() => {
    const handleMetaAdsDataRefreshed = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, timestamp } = customEvent.detail;
      console.log('Dados do Meta Ads atualizados:', type, timestamp);
      
      // Forçar refresh das métricas quando dados são atualizados
      setRefreshTrigger(prev => prev + 1);
      
      console.log('Dashboard: Refresh forçado após atualização do Meta Ads');
    };

    window.addEventListener('metaAdsDataRefreshed', handleMetaAdsDataRefreshed);

    return () => {
      window.removeEventListener('metaAdsDataRefreshed', handleMetaAdsDataRefreshed);
    };
  }, []);

  // Listener para logout do Meta Ads
  useEffect(() => {
    const handleMetaAdsLoggedOut = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { timestamp } = customEvent.detail;
      console.log('Logout do Meta Ads detectado:', timestamp);
      
      // Limpar dados do dashboard quando Meta Ads desconecta
      setSelectedClient('Selecione um cliente');
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      setMetrics([]);
      setDataSource(null);
      setIsFacebookConnected(false);
      
      // Forçar refresh para garantir limpeza
      setRefreshTrigger(prev => prev + 1);
      
      console.log('Dashboard: Dados limpos após logout do Meta Ads');
    };

    window.addEventListener('metaAdsLoggedOut', handleMetaAdsLoggedOut);

    return () => {
      window.removeEventListener('metaAdsLoggedOut', handleMetaAdsLoggedOut);
    };
  }, []);

  const handleMetaAdsSync = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Função para atualizar origem dos dados
  const handleDataSourceChange = (source: 'manual' | 'facebook' | null, connected: boolean) => {
    console.log('Atualizando origem dos dados:', source, connected);
    setDataSource(source);
    setIsFacebookConnected(connected);
  };

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
        onMetaAdsSync={handleMetaAdsSync}
        currentUser={currentUser}
        onLogout={onLogout}
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
};

export default Dashboard; 