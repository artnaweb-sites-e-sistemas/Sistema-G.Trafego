import React, { useState, useEffect, useCallback } from 'react';
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
  const getCurrentMonth = useCallback(() => {
    const now = new Date();
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return `${months[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

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
    
    if (savedClient && savedClient !== 'Todos os Clientes') {
      setSelectedClient(savedClient);
    }
    
    if (savedProduct && savedProduct !== 'Todos os Produtos') {
      setSelectedProduct(savedProduct);
    }
    
    if (savedAudience && savedAudience !== 'Todos os Públicos') {
      setSelectedAudience(savedAudience);
    }
    
    if (savedCampaign) {
      setSelectedCampaign(savedCampaign);
    }
  }, []);

  // Garantir que o mês selecionado seja sempre válido
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    if (selectedMonth !== currentMonth) {
      setSelectedMonth(currentMonth);
    }
  }, [selectedMonth, getCurrentMonth]);

  // Carregar métricas
  useEffect(() => {
    const loadMetrics = async () => {
      // Não carregar métricas se não há cliente selecionado
      if (selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
        setMetrics([]);
        setLoading(false);
        return;
      }

      // Se o Meta Ads não está conectado, zerar métricas
      if (dataSource === 'facebook' && !isFacebookConnected) {
        setMetrics([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const data = await metricsService.getMetrics(selectedClient, selectedProduct, selectedAudience, selectedMonth);
        setMetrics(data);
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedClient, selectedProduct, selectedAudience, selectedMonth, dataSource, isFacebookConnected, refreshTrigger]);

  // Consolidar todos os event listeners em um único useEffect
  useEffect(() => {
    const eventHandlers = {
      businessManagerSelected: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { businessManager, clientName } = customEvent.detail;
        setSelectedClient(clientName);
        localStorage.setItem('currentSelectedClient', clientName);
      },

      campaignSelected: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { campaign, productName, campaignId } = customEvent.detail;
        setSelectedProduct(productName);
        setSelectedCampaign(campaignId);
        localStorage.setItem('selectedProduct', productName);
        localStorage.setItem('selectedCampaignId', campaignId);
      },

      adSetSelected: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { adSet, audienceName, adSetId } = customEvent.detail;
        setSelectedAudience(audienceName);
        localStorage.setItem('selectedAudience', audienceName);
        localStorage.setItem('selectedAdSetId', adSetId);
      },

      clientCleared: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { clientName } = customEvent.detail;
        setSelectedClient('Todos os Clientes');
        setSelectedProduct('Todos os Produtos');
        setSelectedAudience('Todos os Públicos');
        setSelectedCampaign('');
        setMetrics([]);
        localStorage.removeItem('currentSelectedClient');
        localStorage.removeItem('selectedProduct');
        localStorage.removeItem('selectedAudience');
        localStorage.removeItem('selectedCampaignId');
      },

      noProductsFound: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { clientName } = customEvent.detail;
        setSelectedProduct('Todos os Produtos');
        setSelectedAudience('Todos os Públicos');
        setSelectedCampaign('');
        setMetrics([]);
      },

      metaAdsDataRefreshed: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { type, timestamp } = customEvent.detail;
        setRefreshTrigger(prev => prev + 1);
      },

      metaAdsLoggedOut: (event: Event) => {
        const customEvent = event as CustomEvent;
        const { timestamp } = customEvent.detail;
        setSelectedClient('Todos os Clientes');
        setSelectedProduct('Todos os Produtos');
        setSelectedAudience('Todos os Públicos');
        setSelectedCampaign('');
        setMetrics([]);
        setDataSource(null);
        setIsFacebookConnected(false);
      },

      loadAllCampaignsMetrics: async (event: Event) => {
        const customEvent = event as CustomEvent;
        const { clientName, source, adAccount } = customEvent.detail;
        try {
          await metricsService.clearCache();
          setRefreshTrigger(prev => prev + 1);
        } catch (error) {
          console.warn('Erro ao limpar cache:', error);
        }
      },

      clientChanged: async (event: Event) => {
        const customEvent = event as CustomEvent;
        const { clientName, source, businessManager, adAccount } = customEvent.detail;
        
        setSelectedClient(clientName);
        localStorage.setItem('currentSelectedClient', clientName);
        
        if (source === 'facebook') {
          setDataSource('facebook');
          setIsFacebookConnected(true);
          try {
            await metricsService.clearCache();
            setRefreshTrigger(prev => prev + 1);
          } catch (error) {
            console.warn('Erro ao limpar cache:', error);
          }
        } else if (source === 'manual') {
          setDataSource('manual');
          setIsFacebookConnected(false);
          setRefreshTrigger(prev => prev + 1);
        }
      }
    };

    // Adicionar todos os event listeners
    Object.entries(eventHandlers).forEach(([eventName, handler]) => {
      window.addEventListener(eventName, handler);
    });

    // Cleanup function
    return () => {
      Object.entries(eventHandlers).forEach(([eventName, handler]) => {
        window.removeEventListener(eventName, handler);
      });
    };
  }, []);

  const handleMetaAdsSync = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  // Função para atualizar origem dos dados
  const handleDataSourceChange = useCallback((source: 'manual' | 'facebook' | null, connected: boolean) => {
    setDataSource(source);
    setIsFacebookConnected(connected);
  }, []);

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
            <MonthlyDetailsTable metrics={metrics} />
          </>
        )}
        <InsightsSection />
        <DailyControlTable metrics={metrics} selectedCampaign={selectedCampaign} selectedMonth={selectedMonth} />
        <HistorySection selectedProduct={selectedProduct} />
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