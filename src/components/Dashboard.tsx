import React, { useState, useEffect, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './Header';
import MetricsGrid from './MetricsGrid';
import DailyControlTable from './DailyControlTable';
import MonthlyDetailsTable from './MonthlyDetailsTable';
import AudienceDetailsTable from './AudienceDetailsTable';
import InsightsSection from './InsightsSection';
import HistorySection from './HistorySection';
import ShareReport from './ShareReport';
import AIBenchmark from './AIBenchmark';
import PerformanceAdsSection from './PerformanceAdsSection';
import AdStrategySection from './AdStrategySection';
import { User } from '../services/authService';
import { metricsService, MetricData } from '../services/metricsService';
import { BenchmarkResults } from '../services/aiBenchmarkService';
import { benchmarkStorage } from '../services/benchmarkStorage';

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout }) => {
  // Estados para controlar origem dos dados
  const [dataSource, setDataSource] = useState<'manual' | 'facebook' | null>(null);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);

  // Verificar status de conexão do Meta Ads ao carregar
  useEffect(() => {
    const checkMetaAdsConnection = async () => {
      try {
        // Verificar se há usuário salvo no localStorage primeiro
        const savedUser = localStorage.getItem('facebookUser');
        
        if (savedUser) {
          const { metaAdsService } = await import('../services/metaAdsService');
          if (metaAdsService.isLoggedIn()) {
            // Verificar se há Business Manager e conta de anúncios selecionadas
            const selectedBusinessManager = localStorage.getItem('selectedBusinessManager');
            const selectedAdAccount = localStorage.getItem('selectedAdAccount');
            
            // Só considerar conectado se tiver usuário, Business Manager E conta de anúncios
            if (selectedBusinessManager && selectedAdAccount) {
              setDataSource('facebook');
              setIsFacebookConnected(true);
            } else {
              // Se não tem Business Manager ou conta selecionada, considerar como não conectado
              setDataSource(null);
              setIsFacebookConnected(false);
            }
          } else {
            // Se não está logado, limpar dados
            setDataSource(null);
            setIsFacebookConnected(false);
          }
        } else {
          // Se não há usuário salvo, garantir que está desconectado
          setDataSource(null);
          setIsFacebookConnected(false);
        }
      } catch (error) {
        console.error('Erro ao verificar conexão do Meta Ads:', error);
        // Em caso de erro, garantir que está desconectado
        setDataSource(null);
        setIsFacebookConnected(false);
      }
    };

    checkMetaAdsConnection();

    // Listener para quando Meta Ads for conectado
    const handleMetaAdsConnected = () => {
      setDataSource('facebook');
      setIsFacebookConnected(true);
    };

    // Listener para quando Meta Ads for desconectado
    const handleMetaAdsDisconnected = () => {
      setDataSource(null);
      setIsFacebookConnected(false);
    };

    window.addEventListener('metaAdsConnected', handleMetaAdsConnected);
    window.addEventListener('metaAdsDisconnected', handleMetaAdsDisconnected);

    return () => {
      window.removeEventListener('metaAdsConnected', handleMetaAdsConnected);
      window.removeEventListener('metaAdsDisconnected', handleMetaAdsDisconnected);
    };
  }, []);

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
  
  // Estados para estratégias de anúncio
  const [adStrategies, setAdStrategies] = useState<any[]>([]);

  // Debug: verificar mudanças no selectedClient
  useEffect(() => {
    console.log('🔍 DEBUG - Dashboard - selectedClient alterado para:', selectedClient);
    
    // Salvar cliente selecionado no localStorage para uso em outros componentes
    if (selectedClient && selectedClient !== 'Selecione um cliente') {
      localStorage.setItem('selectedClient', selectedClient);
    } else {
      localStorage.removeItem('selectedClient');
    }
  }, [selectedClient]);

  // Salvar mês selecionado no localStorage
  useEffect(() => {
    if (selectedMonth) {
      localStorage.setItem('selectedMonth', selectedMonth);
    }
  }, [selectedMonth]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedAudience, setSelectedAudience] = useState('');
  const [selectedCampaign, setSelectedCampaign] = useState('');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [monthlyDetailsValues, setMonthlyDetailsValues] = useState({ agendamentos: 0, vendas: 0 });
  const [realValuesForClient, setRealValuesForClient] = useState({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
  const [realValuesRefreshTrigger, setRealValuesRefreshTrigger] = useState(0);
  const [aiBenchmarkResults, setAiBenchmarkResults] = useState<BenchmarkResults | null>(null);
  
  // Debounce para evitar múltiplas chamadas
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);


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
      
      // CORREÇÃO: Limpeza mais agressiva do cache quando cliente muda
      console.log('🔍 DEBUG - Dashboard - Cliente alterado, limpando cache...');
      
      // Limpar TODAS as chaves de cache do metricsService
      metricsService.clearCache();
      
      // Limpar cache específico do cliente
      metricsService.clearCacheByClient(selectedClient);
      
      // Limpar cache de métricas do Meta Ads também
      const { metaAdsService } = await import('../services/metaAdsService');
      metaAdsService.clearMetricsCache();
      
      // Limpar localStorage de métricas
      const keysToRemove = [
        'metaAds_metrics',
        'metaAds_insights',
        'metaAdsDataRefreshed'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
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

  // Carregar valores reais de agendamentos e vendas do cliente
  useEffect(() => {
    console.log('🔍 DEBUG - Dashboard - useEffect loadRealValuesForClient INICIADO');
    console.time('Dashboard.loadRealValuesForClient');
    console.log('🔍 DEBUG - Dashboard - Estados atuais:', { selectedClient, selectedMonth, realValuesRefreshTrigger });
    console.log('🔍 DEBUG - Dashboard - Stack trace:', new Error().stack?.split('\n').slice(1, 4).join('\n'));
    
    // Evitar execução desnecessária se não há cliente selecionado
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
      console.log('🔍 DEBUG - Dashboard - Cliente não selecionado, pulando carregamento');
      setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
      return;
    }
    
    // Evitar loop infinito - limitar o número de chamadas consecutivas
    if (realValuesRefreshTrigger > 300) {
      console.log('🔍 DEBUG - Dashboard - Muitas chamadas consecutivas detectadas, pausando...');
      return;
    }
    
    const loadRealValuesForClient = async () => {
      console.log('🔍 DEBUG - Dashboard - useEffect loadRealValuesForClient executado');
      console.log('🔍 DEBUG - Dashboard - selectedClient:', selectedClient);
      console.log('🔍 DEBUG - Dashboard - selectedMonth:', selectedMonth);
      console.log('🔍 DEBUG - Dashboard - realValuesRefreshTrigger:', realValuesRefreshTrigger);
      
      try {
        console.log('🔍 DEBUG - Dashboard - Carregando valores reais para cliente:', selectedClient);
        
        // CORREÇÃO: Limpar cache quando cliente muda para evitar dados incorretos
        console.log('🔍 DEBUG - Dashboard - Limpando cache para novo cliente...');
        metricsService.clearCacheByClient(selectedClient);
        
        // Debug: verificar dados na coleção monthlyDetails
        console.log('🔍 DEBUG - Dashboard - Verificando dados na coleção monthlyDetails...');
        await metricsService.debugMonthlyDetails(selectedMonth);
        
        console.log('🔍 DEBUG - Dashboard - Chamando getRealValuesForClient...');
        console.time('metricsService.getRealValuesForClient');
        const realValues = await metricsService.getRealValuesForClient(selectedMonth, selectedClient);
        console.timeEnd('metricsService.getRealValuesForClient');
        console.log('🔍 DEBUG - Dashboard - Resultado da busca:', realValues);
        console.log('🔍 DEBUG - Dashboard - Tipo do resultado:', typeof realValues);
        console.log('🔍 DEBUG - Dashboard - Estrutura do resultado:', JSON.stringify(realValues, null, 2));
        console.log('🔍 DEBUG - Dashboard - Valores CPV e ROI:', {
          cpv: realValues.cpv,
          roi: realValues.roi,
          cpvType: typeof realValues.cpv,
          roiType: typeof realValues.roi
        });
        
        // CORREÇÃO: Se não há dados para o mês atual, retornar valores zerados
        // Não buscar dados de outros meses nem criar dados de teste automaticamente
        console.log('🔍 DEBUG - Dashboard - Definindo valores reais:', realValues);
        setRealValuesForClient({
          agendamentos: realValues.agendamentos || 0,
          vendas: realValues.vendas || 0,
          cpv: realValues.cpv || 0,
          roi: typeof realValues.roi === 'string' ? realValues.roi : '0% (0.0x)'
        });
        console.log('🔍 DEBUG - Dashboard - Valores reais carregados:', realValues);
        console.timeEnd('Dashboard.loadRealValuesForClient');
      } catch (error) {
        console.error('🔍 DEBUG - Dashboard - Erro ao carregar valores reais do cliente:', error);
        console.error('🔍 DEBUG - Dashboard - Stack trace do erro:', error instanceof Error ? error.stack : 'N/A');
        setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
        console.timeEnd('Dashboard.loadRealValuesForClient');
      }
    };

    // Debounce para evitar múltiplas chamadas
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      loadRealValuesForClient();
    }, 300); // 300ms de debounce

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [selectedMonth, selectedClient, realValuesRefreshTrigger]);

  // Listener para atualizar valores reais quando dados dos públicos mudarem
  useEffect(() => {
    const handleAudienceDetailsSaved = (event: CustomEvent) => {
      console.log('🔍 DEBUG - Dashboard - Evento audienceDetailsSaved recebido:', event.detail);
      
      if (event.detail && event.detail.client === selectedClient && event.detail.month === selectedMonth) {
        console.log('🔍 DEBUG - Dashboard - Evento corresponde ao cliente/mês atual, recarregando valores reais...');
        
        // Forçar recarregamento dos valores reais usando o trigger
        setRealValuesRefreshTrigger(prev => prev + 1);
        console.log('🔍 DEBUG - Dashboard - Trigger de refresh dos valores reais acionado');
      }
    };

    window.addEventListener('audienceDetailsSaved', handleAudienceDetailsSaved as EventListener);
    
    return () => {
      window.removeEventListener('audienceDetailsSaved', handleAudienceDetailsSaved as EventListener);
    };
  }, [selectedMonth, selectedClient]);

  // Listener para mudanças na planilha detalhes mensais
  useEffect(() => {
    const handleMonthlyDetailsChanged = (event: CustomEvent) => {
      console.log('🔍 DEBUG - Dashboard - Evento monthlyDetailsChanged recebido:', event.detail);

      if (event.detail && event.detail.month === selectedMonth) {
        console.log('🔍 DEBUG - Dashboard - Planilha detalhes mensais alterada, recarregando valores reais...');

        // Forçar recarregamento dos valores reais usando o trigger
        setRealValuesRefreshTrigger(prev => prev + 1);
        console.log('🔍 DEBUG - Dashboard - Trigger de refresh dos valores reais acionado (planilha)');
      }
    };

    window.addEventListener('monthlyDetailsChanged', handleMonthlyDetailsChanged as EventListener);

    return () => {
      window.removeEventListener('monthlyDetailsChanged', handleMonthlyDetailsChanged as EventListener);
    };
  }, [selectedMonth, selectedClient]);

  // Listener para mudanças nas campanhas (valores editados na planilha)
  useEffect(() => {
    const handleCampaignValuesChanged = (event: CustomEvent) => {
      console.log('🔍 DEBUG - Dashboard - Evento campaignValuesChanged recebido:', event.detail);
      console.log('🔍 DEBUG - Dashboard - Mês do evento:', event.detail?.month);
      console.log('🔍 DEBUG - Dashboard - Mês selecionado:', selectedMonth);
      console.log('🔍 DEBUG - Dashboard - Cliente selecionado:', selectedClient);

      if (event.detail && event.detail.month === selectedMonth) {
        console.log('🔍 DEBUG - Dashboard - Valores das campanhas alterados, recarregando valores reais...');

        // Forçar recarregamento dos valores reais usando o trigger
        setRealValuesRefreshTrigger(prev => {
          const newValue = prev + 1;
          console.log('🔍 DEBUG - Dashboard - Trigger incrementado de', prev, 'para', newValue, '(campanhas)');
          return newValue;
        });
        console.log('🔍 DEBUG - Dashboard - Trigger de refresh dos valores reais acionado (campanhas)');
      } else {
        console.log('🔍 DEBUG - Dashboard - Evento não corresponde ao mês/cliente atual');
      }
    };

    console.log('🔍 DEBUG - Dashboard - Registrando listener para campaignValuesChanged');
    window.addEventListener('campaignValuesChanged', handleCampaignValuesChanged as EventListener);

    return () => {
      console.log('🔍 DEBUG - Dashboard - Removendo listener para campaignValuesChanged');
      window.removeEventListener('campaignValuesChanged', handleCampaignValuesChanged as EventListener);
    };
  }, [selectedMonth, selectedClient]);

  // Listener para quando o relatório é atualizado
  useEffect(() => {
    const handleReportUpdated = (event: CustomEvent) => {
      console.log('🔍 DEBUG - Dashboard - Evento reportUpdated recebido:', event.detail);

      console.log('🔍 DEBUG - Dashboard - Relatório atualizado, recarregando valores reais...');

      // Forçar recarregamento dos valores reais usando o trigger
      setRealValuesRefreshTrigger(prev => prev + 1);
      console.log('🔍 DEBUG - Dashboard - Trigger de refresh dos valores reais acionado (relatório atualizado)');
    };

    window.addEventListener('reportUpdated', handleReportUpdated as EventListener);

    return () => {
      window.removeEventListener('reportUpdated', handleReportUpdated as EventListener);
    };
  }, []);

  // Listener para quando o cliente é selecionado/changado
  useEffect(() => {
    const handleClientSelectionChanged = () => {
      console.log('🔍 DEBUG - Dashboard - Cliente selecionado/changado, forçando refresh dos valores reais...');
      console.log('🔍 DEBUG - Dashboard - Cliente selecionado:', selectedClient);
      console.log('🔍 DEBUG - Dashboard - Mês selecionado:', selectedMonth);
      
      // Forçar recarregamento dos valores reais usando o trigger
      setRealValuesRefreshTrigger(prev => {
        const newValue = prev + 1;
        console.log('🔍 DEBUG - Dashboard - Trigger incrementado de', prev, 'para', newValue);
        return newValue;
      });
      console.log('🔍 DEBUG - Dashboard - Trigger de refresh dos valores reais acionado (seleção de cliente)');
    };

    // Disparar evento quando selectedClient mudar
    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes') {
      console.log('🔍 DEBUG - Dashboard - Cliente válido selecionado, executando handleClientSelectionChanged...');
      handleClientSelectionChanged();
    } else {
      console.log('🔍 DEBUG - Dashboard - Cliente inválido ou não selecionado:', selectedClient);
    }
  }, [selectedClient]);

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
      console.log('🔍 DEBUG - Dashboard - Cliente limpo');
      setSelectedClient('Selecione um cliente');
      setSelectedProduct('');
      setSelectedAudience('');
      setSelectedCampaign('');
      setMetrics([]);
      setLoading(false);
      setError(null);
      setRefreshTrigger(0);
      setRealValuesRefreshTrigger(0);
      setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
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
  
      console.log('🔍 DEBUG - Dashboard - Evento noProductsFound recebido para cliente:', clientName);
      
      // Zerar métricas quando não há produtos
      setMetrics([]);
      setSelectedProduct('Todos os Produtos');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');
      
      // Zerar valores reais quando não há produtos
      setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0%' });
      
      console.log('🔍 DEBUG - Dashboard - Valores zerados devido à ausência de produtos');
    };

    window.addEventListener('noProductsFound', handleNoProductsFound);

    return () => {
      window.removeEventListener('noProductsFound', handleNoProductsFound);
    };
  }, []);

  // Listener para atualizações do Meta Ads
  useEffect(() => {
    const handleMetaAdsDataRefreshed = (event: Event) => {
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
      localStorage.removeItem('selectedAdSetId');
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
    console.log('🔍 DEBUG - Dashboard - handleDataSourceChange chamado:', { source, connected });
    
    // Verificar se há usuário salvo antes de limpar dados
    const savedUser = localStorage.getItem('facebookUser');
    
    // Se está tentando mudar para manual mas há usuário salvo, não permitir
    if (source === 'manual' && savedUser) {
      console.log('🔍 Usuário salvo encontrado, mantendo conexão Facebook');
      return;
    }
    
    setDataSource(source);
    setIsFacebookConnected(connected);
    
    // Se não está conectado ao Meta, limpar todas as seleções
    if (!connected) {
      setSelectedClient('Selecione um cliente');
      setSelectedProduct('');
      setSelectedAudience('');
      setSelectedCampaign('');
      setMetrics([]);
      
      // Limpar localStorage
      localStorage.removeItem('currentSelectedClient');
      localStorage.removeItem('currentSelectedProduct');
      localStorage.removeItem('currentSelectedAudience');
      localStorage.removeItem('selectedCampaignId');
      localStorage.removeItem('selectedAdSetId');
    }
  };

  // Função para lidar com os resultados do benchmark de IA
  const handleBenchmarkGenerated = (results: BenchmarkResults) => {
    setAiBenchmarkResults(results);
    
    // Salvar benchmark no localStorage
    if (selectedProduct && selectedProduct !== 'Todos os Produtos') {
      benchmarkStorage.saveBenchmark(
        selectedProduct, 
        results, 
        selectedClient !== 'Selecione um cliente' ? selectedClient : undefined,
        selectedMonth
      );
    }
    
    toast.success('Benchmark aplicado! Os valores foram atualizados na tabela.');
  };

  // Handler para quando uma estratégia é criada
  const handleStrategyCreated = (strategy: any) => {
    console.log('🔍 DEBUG - Dashboard - Estratégia criada:', strategy);
    setAdStrategies(prev => [...prev, strategy]);
    toast.success('Estratégia de anúncio criada com sucesso!');
  };

  // Carregar benchmark quando produto mudar
  useEffect(() => {
    if (selectedProduct && selectedProduct !== 'Todos os Produtos') {
      const savedBenchmark = benchmarkStorage.loadBenchmark(
        selectedProduct,
        selectedClient !== 'Selecione um cliente' ? selectedClient : undefined,
        selectedMonth
      );
      
      if (savedBenchmark) {
        setAiBenchmarkResults(savedBenchmark);
      } else {
        setAiBenchmarkResults(null);
      }
    } else {
      setAiBenchmarkResults(null);
    }
  }, [selectedProduct, selectedClient, selectedMonth]);

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
            <div className="flex items-center justify-center space-x-3">
              <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs font-bold">!</span>
              </div>
              <span>Erro ao carregar dados: {error}</span>
            </div>
          </div>
        ) : (
          <>
            {/* Se não está conectado ao Meta Ads, mostra mensagem de conexão */}
            {!isFacebookConnected ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="text-lg text-gray-300 mb-2 font-semibold">Conecte-se ao Meta Ads para começar.</div>
                <div className="text-sm text-gray-400">É necessário conectar sua conta Meta Ads antes de selecionar um cliente e visualizar as informações do dashboard.</div>
              </div>
            ) : (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="text-lg text-gray-300 mb-2 font-semibold">Selecione um cliente para visualizar as informações do dashboard.</div>
                <div className="text-sm text-gray-400">Nenhum dado será exibido até que um cliente seja selecionado no topo da página.</div>
              </div>
            ) : (
              <>
                {/* Lógica condicional para renderização das seções */}
                {selectedAudience && selectedAudience !== 'Todos os Públicos' ? (
                  <>
                    <AudienceDetailsTable 
                      metrics={metrics} 
                      selectedAudience={selectedAudience} 
                      selectedProduct={selectedProduct}
                      selectedClient={selectedClient}
                      selectedMonth={selectedMonth} 
                    />
                    <DailyControlTable 
                      metrics={metrics} 
                      selectedCampaign={selectedCampaign} 
                      selectedMonth={selectedMonth}
                      selectedAudience={selectedAudience}
                    />
                    <PerformanceAdsSection />
                  </>
                ) : selectedProduct && selectedProduct !== 'Todos os Produtos' ? (
                  <>
                    <AIBenchmark 
                      selectedProduct={selectedProduct}
                      onBenchmarkGenerated={handleBenchmarkGenerated}
                      savedResults={aiBenchmarkResults}
                    />
                    <MonthlyDetailsTable 
                      metrics={metrics} 
                      selectedProduct={selectedProduct}
                      selectedMonth={selectedMonth}
                      onValuesChange={setMonthlyDetailsValues}
                      aiBenchmarkResults={aiBenchmarkResults}
                    />
                    <InsightsSection />
                  </>
                ) : (
                  <>
                    <MetricsGrid 
                      metrics={metrics} 
                      selectedClient={selectedClient}
                      selectedMonth={selectedMonth}
                      realAgendamentos={realValuesForClient.agendamentos}
                      realVendas={realValuesForClient.vendas}
                      realCPV={realValuesForClient.cpv}
                      realROI={realValuesForClient.roi}
                    />
                    
                    {/* Seção de Estratégia de Anúncio - aparece abaixo das métricas iniciais */}
                    <AdStrategySection 
                      selectedClient={selectedClient}
                      selectedMonth={selectedMonth}
                      onStrategyCreated={handleStrategyCreated}
                    />
                  </>
                )}
              </>
            )}
            {/* Renderizar HistorySection apenas se produto estiver selecionado E público NÃO estiver selecionado */}
            {(selectedProduct && selectedProduct !== 'Todos os Produtos') && (!selectedAudience || selectedAudience === 'Todos os Públicos') && isFacebookConnected && (
              <HistorySection selectedProduct={selectedProduct} />
            )}
          </>
        )}
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