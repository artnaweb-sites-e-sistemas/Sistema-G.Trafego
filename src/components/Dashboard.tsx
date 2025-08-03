import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './Header';
import MetricsGrid from './MetricsGrid';
import DailyControlTable from './DailyControlTable';
import MonthlyDetailsTable from './MonthlyDetailsTable';
import InsightsSection from './InsightsSection';
import HistorySection from './HistorySection';
import ShareReport from './ShareReport';
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
  const [selectedClient, setSelectedClient] = useState('Selecione um cliente');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [monthlyDetailsValues, setMonthlyDetailsValues] = useState({ agendamentos: 0, vendas: 0 });

  // Garantir que o mês selecionado seja sempre válido
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    if (selectedMonth !== currentMonth) {
    
      setSelectedMonth(currentMonth);
    }
  }, []);

  // Carregar métricas
  useEffect(() => {
    const loadMetrics = async () => {
      
      
      // Não carregar métricas se não há cliente selecionado
      if (selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {

        setMetrics([]);
        setLoading(false);
        return;
      }

      // Não carregar métricas se não está conectado ao Meta Ads
      if (dataSource === 'facebook' && !isFacebookConnected) {

        setMetrics([]);
        setLoading(false);
        return;
      }

      try {
  
        setLoading(true);

        const data = await metricsService.getMetrics(selectedMonth, selectedClient, selectedProduct, selectedAudience, selectedCampaign);

        setMetrics(data);
      } catch (err: any) {
        console.error('Erro ao carregar métricas:', err.message);
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
  
      
      // Atualizar cliente selecionado no Dashboard
      setSelectedClient('Selecione um cliente');
      
      // Zerar métricas quando cliente for limpo
      setMetrics([]);
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      
      // Forçar refresh das métricas para garantir que sejam zeradas
      setRefreshTrigger(prev => prev + 1);
      
  
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
  
      
      // Zerar métricas quando não há produtos
      setMetrics([]);
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      
  
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
  
      
      // Forçar refresh das métricas quando dados são atualizados
      setRefreshTrigger(prev => prev + 1);
      
  
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
  
      
      // Limpar dados do dashboard quando Meta Ads desconecta
      setSelectedClient('Selecione um cliente');
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      setMetrics([]);
      setDataSource(null);
      setIsFacebookConnected(false);
      // Limpar filtros do localStorage
      localStorage.removeItem('currentSelectedClient');
      localStorage.removeItem('selectedProduct');
      localStorage.removeItem('selectedAudience');
      localStorage.removeItem('selectedCampaignId');
      // Forçar refresh para garantir limpeza
      setRefreshTrigger(prev => prev + 1);
      
  
    };

    window.addEventListener('metaAdsLoggedOut', handleMetaAdsLoggedOut);

    return () => {
      window.removeEventListener('metaAdsLoggedOut', handleMetaAdsLoggedOut);
    };
  }, []);

  // Listener para carregar métricas de todas as campanhas
  useEffect(() => {
    const handleLoadAllCampaignsMetrics = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { clientName, source, adAccount } = customEvent.detail;
      
      
      
      try {
        const { metricsService } = await import('../services/metricsService');
        metricsService.clearCache();

        
        // Forçar refresh das métricas
        setRefreshTrigger(prev => prev + 1);
  
      } catch (error) {
        console.warn('🔴 Dashboard: Erro ao carregar métricas de todas as campanhas:', error);
      }
    };

    window.addEventListener('loadAllCampaignsMetrics', handleLoadAllCampaignsMetrics);

    return () => {
      window.removeEventListener('loadAllCampaignsMetrics', handleLoadAllCampaignsMetrics);
    };
  }, []);

  // Listener para mudança de cliente
  useEffect(() => {
    const handleClientChanged = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { clientName, source, businessManager, adAccount } = customEvent.detail;

      
      
      // Atualizar o cliente selecionado
      setSelectedClient(clientName);

      
      // Atualizar dataSource baseado no tipo de cliente
      if (source === 'facebook') {
        setDataSource('facebook');
        setIsFacebookConnected(true);
  
        
        try {
          const { metricsService } = await import('../services/metricsService');
          metricsService.clearCache();
  
          
          // Forçar carregamento imediato das métricas para o cliente selecionado
    
          setRefreshTrigger(prev => prev + 1);
        } catch (error) {
          console.warn('🔴 Dashboard: Erro ao limpar cache:', error);
        }
      } else if (source === 'manual') {
        setDataSource('manual');
        setIsFacebookConnected(false);
  
        
        // Para clientes manuais, também forçar refresh
        setRefreshTrigger(prev => prev + 1);
  
      }
    };

    window.addEventListener('clientChanged', handleClientChanged);

    return () => {
      window.removeEventListener('clientChanged', handleClientChanged);
    };
  }, []);

  const handleMetaAdsSync = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Função para atualizar origem dos dados
  const handleDataSourceChange = (source: 'manual' | 'facebook' | null, connected: boolean) => {

    setDataSource(source);
    setIsFacebookConnected(connected);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 text-white">
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
        monthlyDetailsValues={monthlyDetailsValues}
        metrics={metrics}
      />
      
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-10">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-purple-500 shadow-lg"></div>
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-400 animate-ping opacity-20"></div>
            </div>
          </div>
        ) : error ? (
          <div className="bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-500/30 text-red-300 px-6 py-4 rounded-xl backdrop-blur-sm shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">!</span>
              </div>
              <span>Erro ao carregar dados: {error}</span>
            </div>
          </div>
        ) : (
          <>
            <MetricsGrid metrics={metrics} />
            {selectedProduct && selectedProduct !== 'Todos os Produtos' && (
              <MonthlyDetailsTable 
                metrics={metrics} 
                selectedProduct={selectedProduct}
                selectedMonth={selectedMonth}
                onValuesChange={setMonthlyDetailsValues}
              />
            )}
          </>
        )}
        <InsightsSection />
        <DailyControlTable metrics={metrics} selectedCampaign={selectedCampaign} selectedMonth={selectedMonth} />
        <HistorySection selectedProduct={selectedProduct} />
        {/* <ShareReport
          selectedAudience={selectedAudience}
          selectedProduct={selectedProduct}
          selectedClient={selectedClient}
          selectedMonth={selectedMonth}
          hasGeneratedLinks={false}
          metrics={metrics}
        /> */}
      </main>
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            border: '1px solid #374151',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      />
    </div>
  );
};

export default Dashboard; 