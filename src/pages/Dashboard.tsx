import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from '../components/Header';
import DailyControlTable from '../components/DailyControlTable';
import MonthlyDetailsTable from '../components/MonthlyDetailsTable';
import InsightsSection from '../components/InsightsSection';
// import HistorySection from '../components/HistorySection'; // Removido conforme solicitação
import AudienceHistorySection from '../components/AudienceHistorySection';
import { analysisPlannerService } from '../services/analysisPlannerService';
import AdStrategySection from '../components/AdStrategySection';
import AureaDecisionPanel from '../components/AureaDecisionPanel';
import TabNavigation, { TabContent, useTabNavigation } from '../components/TabNavigation';
import RateLimitModal from '../components/RateLimitModal';
import { User } from '../services/authService';
import { metricsService, type MetricData } from '../services/metricsService';


interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onLogout }) => {
  // Estados para controlar origem dos dados
  const [dataSource, setDataSource] = useState<'manual' | 'facebook' | null>(null);
  const [isFacebookConnected, setIsFacebookConnected] = useState(false);

  // 🎯 LOG PARA DEBUG: Monitorar mudanças no isFacebookConnected
  useEffect(() => {

  }, [isFacebookConnected]);

  // Função para obter o ID do usuário do Meta Ads
  const getMetaAdsUserId = (): string => {
    try {
      // 🎯 CORREÇÃO: Usar apenas o Firebase UID para notificações
      // O selectedAdAccount pode mudar quando o cliente muda, mas o userId deve permanecer consistente
      return currentUser?.uid || '';
    } catch (error) {
      console.error('Erro ao obter ID do usuário Meta Ads:', error);
      return currentUser?.uid || '';
    }
  };

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
              // Garantir estado inicial sem cliente/produto selecionados
              setSelectedClient('Selecione um cliente');
              setSelectedProduct('');
              try {
                localStorage.removeItem('currentSelectedClient');
                localStorage.removeItem('selectedClient');
                localStorage.removeItem('currentSelectedProduct');
                localStorage.removeItem('selectedCampaignId');
                localStorage.removeItem('selectedAudience');
              } catch { }
            } else {
              // Se não tem Business Manager ou conta selecionada, considerar como não conectado
              setDataSource(null);
              setIsFacebookConnected(false);
              setSelectedClient('Selecione um cliente');
              setSelectedProduct('');
            }
          } else {
            // Se não está logado, limpar dados
            setDataSource(null);
            setIsFacebookConnected(false);
            setSelectedClient('Selecione um cliente');
            setSelectedProduct('');
          }
        } else {
          // Se não há usuário salvo, garantir que está desconectado
          setDataSource(null);
          setIsFacebookConnected(false);
          setSelectedClient('Selecione um cliente');
          setSelectedProduct('');
        }
      } catch (error) {
        console.error('Erro ao verificar conexão do Meta Ads:', error);
        // Em caso de erro, garantir que está desconectado
        setDataSource(null);
        setIsFacebookConnected(false);
        setSelectedClient('Selecione um cliente');
        setSelectedProduct('');
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
  const [, setAdStrategies] = useState<any[]>([]);



  // Estado para navegação por tabs (Modo Áurea)
  const { activeTab, setActiveTab } = useTabNavigation('visaoGeral');

  // Debug: verificar mudanças no selectedClient
  useEffect(() => {


    // Salvar cliente selecionado no localStorage para uso em outros componentes
    if (selectedClient && selectedClient !== 'Selecione um cliente') {
      localStorage.setItem('selectedClient', selectedClient);
      // Manter compatibilidade com serviços que leem currentSelectedClient
      try { localStorage.setItem('currentSelectedClient', selectedClient); } catch { }
    } else {
      localStorage.removeItem('selectedClient');
      try { localStorage.removeItem('currentSelectedClient'); } catch { }
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

  // 🎯 CORREÇÃO: Forçar abas com base na seleção (Estratégia liberada se tiver cliente, as outras se tiver campanha).
  useEffect(() => {
    const isClientSelected = selectedClient && selectedClient !== 'Selecione um cliente';
    const isCampaignSelected = selectedProduct && selectedProduct !== 'Todas as Campanhas';

    if (isClientSelected && !isCampaignSelected) {
      if (activeTab !== 'estrategia') {
        setActiveTab('estrategia');
      }
    } else if (!isClientSelected) {
      if (activeTab !== 'estrategia') {
        setActiveTab('estrategia');
      }
    }
  }, [selectedClient, selectedProduct, activeTab, setActiveTab]);

  // Estado para configurações do Modo Áurea
  const [aureaSettings, setAureaSettings] = useState<{
    cpaTarget?: number;
    monthlyBudget?: number;
    acqRmdSplit?: { acq: number; rmd: number };
  }>({});

  // Carregar configurações do Modo Áurea
  useEffect(() => {
    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedMonth) {
      metricsService.getAureaSettings(selectedMonth, selectedClient, selectedProduct)
        .then(settings => {
          if (settings) {
            setAureaSettings(settings);
          } else {
            setAureaSettings({});
          }
        })
        .catch(err => console.error('Erro ao carregar configurações Áurea:', err));
    } else {
      setAureaSettings({});
    }
  }, [selectedClient, selectedMonth, selectedProduct]);

  // Handler para salvar configurações do Modo Áurea
  const handleAureaSettingsChange = async (newSettings: {
    cpaTarget?: number;
    monthlyBudget?: number;
    acqRmdSplit?: { acq: number; rmd: number };
  }) => {
    setAureaSettings(newSettings);

    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedMonth) {
      try {
        await metricsService.saveAureaSettings({
          month: selectedMonth,
          client: selectedClient,
          product: selectedProduct,
          ...newSettings
        });

        toast.success('Metas do Mês salvas!');
      } catch (error) {
        console.error("Erro ao salvar metas:", error);
        toast.error('Erro ao salvar metas');
      }
    }
  };

  // 🎯 LOG PARA DEBUG: Monitorar mudanças nos filtros selecionados
  useEffect(() => {

  }, [selectedClient, selectedProduct, selectedAudience, selectedMonth, isFacebookConnected]);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(false); // Mudança: começar como false para não carregar automaticamente
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [monthlyDetailsValues, setMonthlyDetailsValues] = useState<{
    agendamentos: number;
    vendas: number;
    seguidoresNovos: number;
    cpaTarget?: number;
    monthlyBudget?: number;
    funnelType?: string;
    agendamentosEnabled?: boolean;
  }>({ agendamentos: 0, vendas: 0, seguidoresNovos: 0 });
  const [realValuesForClient, setRealValuesForClient] = useState({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
  const [realValuesRefreshTrigger, setRealValuesRefreshTrigger] = useState(0);

  // 🎯 NOVO: Estados para controle de atualização manual
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [lastMetricsUpdate, setLastMetricsUpdate] = useState<Date | null>(null);

  // 🎯 NOVO: Estados para modal de rate limit
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string>('');

  // Estado para controlar ausência de dados e sugerir outros períodos com gasto
  const [noDataForSelection, setNoDataForSelection] = useState(false);
  const [monthsWithData, setMonthsWithData] = useState<string[]>([]);

  // Carregar seleção atual do Firestore na inicialização (desabilitado para evitar auto-seleção após login)
  useEffect(() => {
    const RESTORE_SELECTION_ON_LOAD = false;
    const loadUserSelection = async () => {
      try {
        const { firestoreCampaignSyncService } = await import('../services/firestoreCampaignSyncService');
        const selection = await firestoreCampaignSyncService.getUserSelection();
        if (selection && RESTORE_SELECTION_ON_LOAD) {

          if (selection.selectedCampaignId) {
            const campaign = await firestoreCampaignSyncService.getCampaignById(selection.selectedCampaignId);
            if (campaign) {
              setSelectedProduct(campaign.name);
              localStorage.setItem('currentSelectedProduct', campaign.name);
              localStorage.setItem('selectedCampaignId', selection.selectedCampaignId);
            } else if (selection.selectedProductName) {
              setSelectedProduct(selection.selectedProductName);
              localStorage.setItem('currentSelectedProduct', selection.selectedProductName);
            }
          }
          if (selection.selectedClient) {
            setSelectedClient(selection.selectedClient);
            localStorage.setItem('selectedClient', selection.selectedClient);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar seleção do Firestore:', error);
      }
    };
    loadUserSelection();
  }, []);

  // Garantir que o mês selecionado seja sempre válido
  useEffect(() => {
    const currentMonth = getCurrentMonth();
    if (selectedMonth !== currentMonth) {

      setSelectedMonth(currentMonth);
    }
  }, []);

  // 🎯 NOVA FUNÇÃO: Carregar métricas com controle manual
  const loadMetrics = async (forceRefresh: boolean = false) => {
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
      if (forceRefresh) {
        setIsRefreshingMetrics(true);

        // Limpar cache quando forçar atualização
        metricsService.clearCache();
        metricsService.clearCacheByClient(selectedClient);

        const { metaAdsService } = await import('../services/metaAdsService');
        metaAdsService.clearMetricsCache();

        // Limpar localStorage de métricas
        const keysToRemove = [
          'metaAds_metrics',
          'metaAds_insights',
          'metaAdsDataRefreshed'
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }

      const data = await metricsService.getMetrics(selectedMonth, selectedClient, selectedProduct, selectedAudience, selectedCampaign);
      setMetrics(data);
      setHasInitialLoad(true);

      // 🎯 CORREÇÃO: Atualizar data da última atualização APENAS se a requisição foi bem-sucedida
      if (forceRefresh) {
        setLastMetricsUpdate(new Date());

      }
    } catch (err: any) {
      console.error('Erro ao carregar métricas:', err.message);
      setError(err.message);

      // 🎯 NOVO: Verificar se é erro de rate limit
      if (err.message && err.message.includes('User request limit reached')) {
        setRateLimitError(err.message);
        setShowRateLimitModal(true);

      }

      // 🎯 CORREÇÃO: NÃO atualizar a data de última atualização em caso de erro

    } finally {
      setLoading(false);
      setIsRefreshingMetrics(false);
    }
  };

  // 🎯 NOVA FUNÇÃO: Atualizar métricas manualmente
  const handleRefreshMetrics = async () => {
    await loadMetrics(true);
  };

  // 🎯 MODIFICADO: Carregar métricas apenas quando refreshTrigger mudar (atualização manual)
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadMetrics(true);
    }
  }, [refreshTrigger]);

  // 🎯 NOVA FUNÇÃO: Verificar se existem campanhas no período e carregar métricas automaticamente
  const checkAndLoadMetricsForPeriod = async () => {
    // Não verificar se não há cliente selecionado
    if (selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
      return;
    }

    // Não verificar se não está conectado ao Meta Ads
    if (dataSource === 'facebook' && !isFacebookConnected) {
      return;
    }

    try {
      // Fazer uma requisição mínima para verificar se existem campanhas no período
      const { metaAdsService } = await import('../services/metaAdsService');
      const hasCampaignsInPeriod = await metaAdsService.hasCampaignsInPeriod(selectedClient, selectedMonth);

      // Se existem campanhas no período, carregar métricas automaticamente
      if (hasCampaignsInPeriod) {

        await loadMetrics(false); // Carregar sem forçar refresh (usar cache se disponível)
      } else {

      }
    } catch (error) {
      console.warn('Erro ao verificar campanhas no período:', error);
      // Em caso de erro, não carregar métricas automaticamente
    }
  };

  // 🎯 NOVO: Verificar campanhas quando período ou cliente mudar
  useEffect(() => {
    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes') {
      checkAndLoadMetricsForPeriod();
    }
  }, [selectedMonth, selectedClient]);

  // Verificar quando não há dados para o cliente/período selecionado e sugerir outros meses com gasto
  useEffect(() => {
    const checkNoDataAndSuggestMonths = async () => {
      const hasValidClient = selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes';
      if (!hasValidClient || loading || !!error) {
        setNoDataForSelection(false);
        setMonthsWithData([]);
        return;
      }

      // Definir util para mês atual
      const now = new Date();
      const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const [selMonthName, selYearStr] = selectedMonth.split(' ');
      const selMonthIndex = months.findIndex(m => m.toLowerCase() === selMonthName.toLowerCase());
      const selYear = parseInt(selYearStr);
      const isPastMonth = selYear < now.getFullYear() || (selYear === now.getFullYear() && selMonthIndex < now.getMonth());
      const isCurrentMonth = selYear === now.getFullYear() && selMonthIndex === now.getMonth();
      const isFutureMonth = selYear > now.getFullYear() || (selYear === now.getFullYear() && selMonthIndex > now.getMonth());

      // Para o mês atual: nunca exibir a mensagem (mantém UI)
      if (isCurrentMonth) {
        setNoDataForSelection(false);
        setMonthsWithData([]);
        return;
      }

      if (metrics.length === 0) {
        setNoDataForSelection(true);
        try {
          // Buscar meses com gasto em ambos os sentidos (anteriores e posteriores) ao período selecionado
          const otherMonths = await metricsService.getClientMonthsWithSpend(selectedClient, selectedMonth, 1, 'both');
          // Remover o mês atual da lista sugerida e ordenar crescente
          const filtered = (otherMonths || []).filter(m => m !== selectedMonth);
          const toMonthDate = (m: string): number => {
            const [name, yearStr] = m.split(' ');
            const idx = months.findIndex(mm => mm.toLowerCase() === name.toLowerCase());
            const year = parseInt(yearStr);
            const d = idx >= 0 && !isNaN(year) ? new Date(year, idx, 1) : new Date(0);
            return d.getTime();
          };
          const sortedAsc = [...filtered].sort((a, b) => toMonthDate(a) - toMonthDate(b));
          setMonthsWithData(sortedAsc);
        } catch {
          setMonthsWithData([]);
        }
      } else {
        setNoDataForSelection(false);
        setMonthsWithData([]);
      }
    };

    checkNoDataAndSuggestMonths();
  }, [metrics, selectedClient, selectedMonth, loading, error]);

  // Carregar valores reais de agendamentos e vendas do cliente
  useEffect(() => {




    // Evitar execução desnecessária se não há cliente selecionado
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {

      setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
      return;
    }

    // CORREÇÃO: Permitir recarregamento quando realValuesRefreshTrigger mudar
    // Só bloquear se for a primeira execução e já houver valores (evitar loops na inicialização)
    if ((realValuesForClient.agendamentos > 0 || realValuesForClient.vendas > 0) && realValuesRefreshTrigger === 0) {

      return;
    }

    // Evitar loop infinito - limitar o número de chamadas consecutivas
    if (realValuesRefreshTrigger > 50) {

      return;
    }

    const loadRealValuesForClient = async () => {






      try {


        // CORREÇÃO: Limpar cache completamente para evitar dados incorretos de contextos anteriores

        metricsService.clearCache();

        // CORREÇÃO: Também limpar cache específico do cliente

        metricsService.clearCacheByClient(selectedClient);

        // Debug: verificar dados na coleção monthlyDetails

        await metricsService.debugMonthlyDetails(selectedMonth);

        // 🎯 CARD DEBUG: Verificar dados específicos para este cliente

        try {
          const { db } = await import('../config/firebase');
          const { collection, query, where, getDocs } = await import('firebase/firestore');

          // Verificar se há dados na coleção monthlyDetails para este cliente
          const testQuery = query(
            collection(db, 'monthlyDetails'),
            where('month', '==', selectedMonth),
            where('client', '==', selectedClient)
          );

          const testSnapshot = await getDocs(testQuery);


          testSnapshot.forEach((doc) => {

          });
        } catch (debugError) {
          console.error('🎯 CARD DEBUG - Dashboard - Erro ao verificar dados:', debugError);
        }


        const realValues = await metricsService.getRealValuesForClient(selectedMonth, selectedClient);






        // CORREÇÃO: Se não há dados para o mês atual, retornar valores zerados
        // Não buscar dados de outros meses nem criar dados de teste automaticamente


        const finalValues = {
          agendamentos: realValues.agendamentos || 0,
          vendas: realValues.vendas || 0,
          cpv: realValues.cpv || 0,
          roi: typeof realValues.roi === 'string' ? realValues.roi : '0% (0.0x)'
        };


        setRealValuesForClient(finalValues);


      } catch (error) {
        console.error('🔍 DEBUG - Dashboard - Erro ao carregar valores reais do cliente:', error);
        console.error('🔍 DEBUG - Dashboard - Stack trace do erro:', error instanceof Error ? error.stack : 'N/A');
        setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
      }
    };

    loadRealValuesForClient();
  }, [selectedMonth, selectedClient, realValuesRefreshTrigger]);

  // CORREÇÃO: Reset completo de cache e valores quando cliente ou mês mudam
  useEffect(() => {


    // CORREÇÃO: Limpar TODO o cache E localStorage quando cliente ou mês mudam

    metricsService.clearAllCacheAndStorage();

    // CORREÇÃO: Salvar cliente e mês atuais no localStorage para filtros
    if (selectedClient && selectedClient !== 'Selecione um cliente') {
      localStorage.setItem('currentSelectedClient', selectedClient);

    }

    if (selectedMonth && selectedMonth !== 'Selecione um mês') {
      localStorage.setItem('currentSelectedMonth', selectedMonth);

    }

    setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
    setRealValuesRefreshTrigger(prev => prev + 1);
  }, [selectedClient, selectedMonth]);

  // Listener para atualizar valores reais quando dados dos públicos mudarem
  useEffect(() => {
    const handleAudienceDetailsSaved = (event: CustomEvent) => {


      if (event.detail && event.detail.client === selectedClient && event.detail.month === selectedMonth) {


        // 🎯 CORREÇÃO: Limpar cache completamente antes de forçar o recarregamento

        metricsService.clearCache();
        metricsService.clearCacheByClient(selectedClient);

        // Resetar valores para forçar busca nova
        setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });

        // Rate limit removido - sem delay
        // Forçar recarregamento dos valores reais usando o trigger
        setRealValuesRefreshTrigger(prev => {
          const newValue = prev + 1;

          return newValue;
        });

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


      if (event.detail && event.detail.month === selectedMonth) {


        // Forçar recarregamento dos valores reais usando o trigger
        setRealValuesRefreshTrigger(prev => prev + 1);

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





      if (event.detail && event.detail.month === selectedMonth) {


        // Forçar recarregamento dos valores reais usando o trigger
        setRealValuesRefreshTrigger(prev => {
          const newValue = prev + 1;

          return newValue;
        });

      } else {

      }
    };


    window.addEventListener('campaignValuesChanged', handleCampaignValuesChanged as EventListener);

    return () => {

      window.removeEventListener('campaignValuesChanged', handleCampaignValuesChanged as EventListener);
    };
  }, [selectedMonth, selectedClient]);

  // Listener para quando o relatório é atualizado
  useEffect(() => {
    const handleReportUpdated = (event: CustomEvent) => {




      // Forçar recarregamento dos valores reais usando o trigger
      setRealValuesRefreshTrigger(prev => prev + 1);

    };

    window.addEventListener('reportUpdated', handleReportUpdated as EventListener);

    return () => {
      window.removeEventListener('reportUpdated', handleReportUpdated as EventListener);
    };
  }, []);

  // Listener para quando o cliente é selecionado/changado
  useEffect(() => {
    const handleClientSelectionChanged = () => {




      // Forçar recarregamento dos valores reais usando o trigger
      setRealValuesRefreshTrigger(prev => {
        const newValue = prev + 1;

        return newValue;
      });

    };

    // Disparar evento quando selectedClient mudar
    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes') {

      handleClientSelectionChanged();
    } else {

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
      // Ao trocar de campanha/produto, voltar para visão de produto (sem público)
      setSelectedAudience('Todos os Públicos');
      try { localStorage.removeItem('selectedAdSetId'); } catch { }

      // Armazenar o ID da campanha para usar nas métricas
      if (campaignId) {
        localStorage.setItem('selectedCampaignId', campaignId);
      }

      try {
        // Forçar recarregamento das métricas com a nova campanha
        setRefreshTrigger(prev => prev + 1);

        // 🎯 MUDANÇA: Ao selecionar campanha, redirecionar para Visão Geral
        setActiveTab('visaoGeral');
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
        try {
          // Persistir o vínculo do público com o adSetId no planner para consumo de gastos
          if (selectedClient && selectedProduct) {
            analysisPlannerService.savePlanner(selectedClient, selectedProduct, audienceName, { adSetId }).catch(() => { });
          }
        } catch { }
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



      // Zerar métricas quando não há produtos
      setMetrics([]);
      setSelectedProduct('Todas as Campanhas');
      setSelectedAudience('Todos os Públicos');
      setSelectedCampaign('');

      // Zerar valores reais quando não há produtos
      setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0%' });


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
      setSelectedProduct('Todas as Campanhas');
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

  // 🎯 MODIFICADO: Listener para carregar métricas de todas as campanhas - DESABILITADO
  useEffect(() => {
    const handleLoadAllCampaignsMetrics = async (event: Event) => {
      // 🎯 MUDANÇA: Não carregar automaticamente - apenas log para debug

    };

    window.addEventListener('loadAllCampaignsMetrics', handleLoadAllCampaignsMetrics);

    return () => {
      window.removeEventListener('loadAllCampaignsMetrics', handleLoadAllCampaignsMetrics);
    };
  }, []);

  // 🎯 MODIFICADO: Listener para mudança de cliente - NÃO carrega métricas automaticamente
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
      } else if (source === 'manual') {
        setDataSource('manual');
        setIsFacebookConnected(false);
      }

      // 🎯 MUDANÇA: Não carregar métricas automaticamente - apenas limpar dados atuais
      setMetrics([]);
      setHasInitialLoad(false);
      setLastMetricsUpdate(null);

      // Atualizar valores reais dos cards (estes são do Firebase, não do Meta Ads)
      setRealValuesRefreshTrigger(prev => prev + 1);
    };

    window.addEventListener('clientChanged', handleClientChanged);

    return () => {
      window.removeEventListener('clientChanged', handleClientChanged);
    };
  }, []);

  // 🎯 DEBUG: Adicionar função global para debug de dados de públicos
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugAudienceValues = async (month?: string, product?: string) => {
        try {
          const { metricsService } = await import('../services/metricsService');
          const currentMonth = month || selectedMonth;
          const currentProduct = product || selectedProduct;



          if (!currentMonth || !currentProduct || currentProduct === 'Todas as Campanhas') {

            return { error: 'Parâmetros insuficientes' };
          }

          const result = await metricsService.debugAudienceData(currentMonth, currentProduct);


          return result;
        } catch (error) {
          console.error('🔍 DEBUG - Erro no debug:', error);
          return { error };
        }
      };

      // 🧹 FUNÇÃO DE RESET COMPLETO
      (window as any).resetProductData = async (month?: string, product?: string) => {
        try {
          const { metricsService } = await import('../services/metricsService');
          const currentMonth = month || selectedMonth;
          const currentProduct = product || selectedProduct;



          if (!currentMonth || !currentProduct || currentProduct === 'Todas as Campanhas') {

            return { error: 'Parâmetros insuficientes' };
          }

          const result = await metricsService.resetProductData(currentMonth, currentProduct);


          // Forçar recarregamento da página para garantir estado limpo
          if (result.success) {

            window.location.reload();
          }

          return result;
        } catch (error) {
          console.error('🧹 DEBUG - Erro no reset:', error);
          return { error };
        }
      };

      // Função específica para deletar o público antigo renomeado
      (window as any).deleteOldAudience = async () => {
        if (!selectedMonth || !selectedProduct || !selectedClient) {

          return;
        }

        try {


          // Usar a função resetProductData que já funciona
          const { metricsService } = await import('../services/metricsService');
          const result = await metricsService.resetProductData(selectedMonth, selectedProduct);

          if (result.success) {

            window.location.reload();
          } else {

          }
        } catch (error) {
          console.error('❌ Erro ao deletar público antigo:', error);
        }
      };

      // 🧹 NOVA FUNÇÃO DEBUG: Limpeza de emergência do cache
      (window as any).clearAllCache = () => {

        metricsService.clearAllCacheAndStorage();

        // Forçar reload da página para garantir estado limpo
        if (confirm('Cache limpo! Recarregar a página para garantir estado limpo?')) {
          window.location.reload();
        }
      };

      // 🧹 NOVA FUNÇÃO DEBUG: RESET TOTAL DO SISTEMA
      (window as any).resetEverything = async () => {


        if (!confirm('⚠️ ATENÇÃO: Isso vai APAGAR TODOS OS DADOS do Firebase e cache. Tem certeza?')) {
          return;
        }

        if (!confirm('⚠️ ÚLTIMA CHANCE: Todos os dados da planilha detalhes mensais, públicos, campanhas serão DELETADOS permanentemente. Continuar?')) {
          return;
        }

        try {
          const { db } = await import('../config/firebase');
          const { collection, getDocs, deleteDoc } = await import('firebase/firestore');



          // Limpar todas as coleções principais
          const collections = [
            'monthlyDetails',
            'audienceDetails',
            'campaigns',
            'adSets',
            'strategies',
            'benchmarks',
            'notifications',
            'tasks',
            'shares'
          ];

          for (const collectionName of collections) {

            const querySnapshot = await getDocs(collection(db, collectionName));



            const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);


          }



          // Limpar TODO o localStorage
          localStorage.clear();



          // Limpar sessionStorage também
          sessionStorage.clear();



          // Limpar cache do metricsService
          const { metricsService } = await import('../services/metricsService');
          metricsService.clearAllCacheAndStorage();



          // Limpar cache do Meta Ads
          try {
            const { metaAdsService } = await import('../services/metaAdsService');
            metaAdsService.clearMetricsCache();
          } catch (e) {

          }



          // Resetar estados locais
          setSelectedClient('Selecione um cliente');
          setSelectedProduct('');
          setSelectedAudience('');
          setSelectedCampaign('');
          setMetrics([]);
          setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
          setRealValuesRefreshTrigger(0);
          setRefreshTrigger(0);
          setMonthlyDetailsValues({ agendamentos: 0, vendas: 0, seguidoresNovos: 0 });





          // Mostrar mensagem de sucesso
          alert('✅ RESET TOTAL CONCLUÍDO!\n\nTodos os dados foram apagados.\nSistema resetado como primeira vez.\n\nPágina será recarregada...');

          // Recarregar página após 3 segundos
          setTimeout(() => {
            window.location.reload();
          }, 3000);

        } catch (error) {
          console.error('❌ ERRO durante reset total:', error);
          alert(`❌ ERRO durante reset: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
        }
      };

      // 🎯 NOVA FUNÇÃO DEBUG: Verificar estratégias carregadas
      (window as any).debugStrategies = async (client?: string) => {
        const targetClient = client || selectedClient;


        try {
          const { firestoreStrategyService } = await import('../services/firestoreStrategyService');
          const strategies = await firestoreStrategyService.getStrategiesByClient(targetClient);


          strategies.forEach((strategy, index) => {

          });

          return strategies;
        } catch (error) {
          console.error('❌ Erro ao buscar estratégias:', error);
          return [];
        }
      };

      // 🔍 NOVA FUNÇÃO DEBUG: Verificar filtros de período nos cards
      (window as any).debugPeriodFilter = async (month?: string, client?: string) => {
        const targetMonth = month || selectedMonth;
        const targetClient = client || selectedClient;



        try {
          const { metricsService } = await import('../services/metricsService');

          // Testar a função getRealValuesForClient que é usada pelos cards

          const result = await metricsService.getRealValuesForClient(targetMonth, targetClient);



          return result;
        } catch (error) {
          console.error('❌ Erro ao testar filtros:', error);
          return { error };
        }
      };










      (window as any).debugPeriodData = async (client: string, month: string) => {

        const result = await metricsService.debugPeriodData(client, month);

        return result;
      };



      (window as any).debugAdSetsForProduct = async (client: string, product: string, month: string) => {



        // Verificar se há campaign ID salvo
        const campaignId = localStorage.getItem('selectedCampaignId');


        // Verificar se Meta Ads está conectado
        const { metaAdsService } = await import('../services/metaAdsService');
        if (metaAdsService.isLoggedIn() && metaAdsService.hasSelectedAccount()) {


          try {
            // Buscar campanhas
            const campaigns = await metaAdsService.getCampaigns();


            // Buscar Ad Sets se há campaign ID
            if (campaignId) {
              const adSets = await metaAdsService.getAdSets(campaignId);

            } else {

            }

          } catch (error) {
            console.error('❌ DEBUG - Erro ao buscar dados do Meta Ads:', error);
          }
        } else {

        }
      };



      (window as any).forceLoadAdSets = async () => {


        // Disparar evento para forçar carregamento
        window.dispatchEvent(new CustomEvent('forceLoadAdSets'));

        // Também tentar recarregar via AudiencePicker
        const audiencePickerEvent = new CustomEvent('reloadAudiences', {
          detail: { force: true }
        });
        window.dispatchEvent(audiencePickerEvent);


      };


    }
  }, [selectedMonth, selectedProduct]);

  const handleMetaAdsSync = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Função para atualizar origem dos dados
  const handleDataSourceChange = (source: 'manual' | 'facebook' | null, connected: boolean) => {


    // Verificar se há usuário salvo antes de limpar dados
    const savedUser = localStorage.getItem('facebookUser');

    // Se está tentando mudar para manual mas há usuário salvo, não permitir
    if (source === 'manual' && savedUser) {

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



  // Handler para quando uma estratégia é criada
  const handleStrategyCreated = (strategy: any) => {

    setAdStrategies(prev => [...prev, strategy]);
    toast.success('Estratégia de anúncio criada com sucesso!');
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
            ) : noDataForSelection ? (
              <>
                {/* 🎯 CORREÇÃO: Mensagem informativa sobre falta de dados - PRIMEIRA DOBRA */}
                <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/50 border border-slate-600/30 text-slate-200 px-6 py-6 rounded-xl backdrop-blur-sm shadow-lg mt-8">
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="text-lg font-semibold">Nenhum registro para {selectedClient} em {selectedMonth}.</div>
                    {monthsWithData.length > 0 ? (
                      <div className="text-sm text-gray-400">
                        Foram encontrados gastos em outros períodos.
                        <div className="flex flex-wrap gap-2 mt-2 justify-center">
                          {monthsWithData.map((m) => (
                            <button
                              key={m}
                              onClick={() => setSelectedMonth(m)}
                              className="px-3 py-1 rounded-full border border-slate-600/50 hover:border-purple-500 hover:text-purple-300 transition"
                              title={`Ir para ${m}`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Não identificamos registros deste cliente neste período.</div>
                    )}
                  </div>
                </div>

                {/* Seção de Estratégia de Anúncio */}
                <AdStrategySection
                  selectedClient={selectedClient}
                  selectedMonth={selectedMonth}
                  onStrategyCreated={handleStrategyCreated}
                />
              </>
            ) : (
              <>
                {/* MODO ÁUREA SEMPRE VISÍVEL OMO VISÃO PRINCIPAL */}
                <>

                  {/* 🎯 MODO ÁUREA: Sistema de Navegação por Tabs */}
                  <TabNavigation
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    disabledTabs={
                      (!selectedClient || selectedClient === 'Selecione um cliente')
                        ? ['visaoGeral', 'dia', 'assets', 'estrategia']
                        : (!selectedProduct || selectedProduct === 'Todas as Campanhas')
                          ? ['visaoGeral', 'dia', 'assets']
                          : []
                    }
                  />

                  {/* Tab: Visão Geral - Entrada Principal */}
                  <TabContent activeTab={activeTab} tabId="visaoGeral">
                    <div className="space-y-8">
                      {selectedProduct && selectedProduct !== 'Todas as Campanhas' ? (
                        <>
                          <section className="w-full">
                            <InsightsSection
                              selectedProduct={selectedProduct}
                              selectedClient={selectedClient}
                              selectedMonth={selectedMonth}
                              selectedAudience={selectedAudience}
                              isFacebookConnected={isFacebookConnected}
                              metaAdsUserId={getMetaAdsUserId()}
                              cpaTarget={monthlyDetailsValues.cpaTarget || aureaSettings.cpaTarget}
                            />
                          </section>

                          <section className="w-full">
                            <MonthlyDetailsTable
                              metrics={metrics}
                              selectedProduct={selectedProduct}
                              selectedClient={selectedClient}
                              selectedMonth={selectedMonth}
                              onValuesChange={setMonthlyDetailsValues}
                            />
                          </section>

                          <section className="w-full">
                            {(() => {
                              const getDynamicConversions = (m: any, funnel?: string) => {
                                if (funnel === 'DIRETA') {
                                  return m.sales || 0;
                                }
                                if (funnel === 'AUDIENCIA') {
                                  return m.followers || 0;
                                }
                                return m.leads || 0;
                              };

                              const platformConversionsTotal = metrics.reduce((sum, m) => sum + getDynamicConversions(m, monthlyDetailsValues.funnelType), 0);
                              const realConversionsTotal =
                                monthlyDetailsValues.funnelType === 'DIRETA' ? (monthlyDetailsValues.vendas || 0) :
                                  monthlyDetailsValues.funnelType === 'AUDIENCIA' ? (monthlyDetailsValues.seguidoresNovos || 0) :
                                    (monthlyDetailsValues.agendamentos || 0);

                              // Fator para ajustar as conversões da plataforma (Meta) para bater com os valores reais digitados
                              const scalingFactor = platformConversionsTotal > 0 ? realConversionsTotal / platformConversionsTotal : 1;

                              const totalSpend = metrics.reduce((sum, m) => sum + (m.investment || 0), 0);

                              return (
                                <AureaDecisionPanel
                                  selectedClient={selectedClient}
                                  selectedMonth={selectedMonth}
                                  selectedProduct={selectedProduct}
                                  currentSpend={metrics.reduce((sum, m) => sum + (m.investment || 0), 0)}
                                  conversions={realConversionsTotal}
                                  adSets={
                                    // Agrupar métricas pelo adSetId para não ter duplicados no seletor de RMD
                                    Array.from(
                                      metrics.reduce((acc, m) => {
                                        const id = m.adSetId || m.audience || m.product || String(Date.now());
                                        if (!acc.has(id)) {
                                          acc.set(id, {
                                            id,
                                            name: m.audience || m.product || 'Sem nome',
                                            spend: 0,
                                            conversions: 0,
                                            reach: 0,
                                            impressions: 0,
                                            clicks: 0
                                          });
                                        }

                                        const current = acc.get(id)!;
                                        current.spend += (m.investment || 0);
                                        current.conversions += getDynamicConversions(m, monthlyDetailsValues.funnelType);
                                        current.reach += (m.reach || 0);
                                        current.impressions += (m.impressions || 0);
                                        current.clicks += (m.clicks || 0);

                                        return acc;
                                      }, new Map<string, any>()).values()
                                    ).map((aggr, _, array) => {
                                      let adjustedConversions = 0;
                                      if (platformConversionsTotal > 0) {
                                        adjustedConversions = aggr.conversions * scalingFactor;
                                      } else if (realConversionsTotal > 0) {
                                        // Se a plataforma reportou 0 conversões, mas o usuário digitou um Valor Real
                                        // Distribuímos as conversões reais proporcionalmente ao gasto
                                        if (totalSpend > 0) {
                                          adjustedConversions = realConversionsTotal * (aggr.spend / totalSpend);
                                        } else {
                                          // Se não houver gasto (fallback), divide igualmente entre os conjuntos
                                          adjustedConversions = realConversionsTotal / (array.length || 1);
                                        }
                                      }

                                      return {
                                        id: aggr.id,
                                        name: aggr.name,
                                        spend: aggr.spend,
                                        conversions: adjustedConversions,
                                        cpa: adjustedConversions ? aggr.spend / adjustedConversions : undefined,
                                        ctr: aggr.impressions ? (aggr.clicks / aggr.impressions) * 100 : 0,
                                        reach: aggr.reach,
                                        frequency: aggr.reach ? aggr.impressions / aggr.reach : 0
                                      };
                                    })
                                  }
                                  cpaTarget={monthlyDetailsValues.cpaTarget || 50}
                                  alertCpaTarget={monthlyDetailsValues.cpaTarget || 50}
                                  monthlyBudget={monthlyDetailsValues.monthlyBudget || 3000}
                                  acqRmdSplit={aureaSettings.acqRmdSplit}
                                  onSettingsChange={handleAureaSettingsChange}
                                />
                              );
                            })()}
                          </section>
                        </>
                      ) : (
                        <div className="bg-slate-900/60 border border-slate-700/50 rounded-2xl p-6">
                          <div className="text-slate-100 font-semibold mb-1">Próximo passo</div>
                          <div className="text-slate-400 text-sm">
                            Selecione uma campanha no topo para liberar o planejamento (Insights e Sugestões), as análises do Modo Áurea e a Tabela de Detalhes Mensais.
                          </div>
                        </div>
                      )}
                    </div>
                  </TabContent>

                  {/* Tab: Dia - Controle Diário */}
                  <TabContent activeTab={activeTab} tabId="dia">
                    <DailyControlTable
                      metrics={metrics}
                      selectedCampaign={selectedCampaign}
                      selectedMonth={selectedMonth}
                      selectedAudience={selectedAudience}
                    />
                  </TabContent>



                  {/* Tab: Públicos - Públicos e Criativos */}
                  <TabContent activeTab={activeTab} tabId="assets">
                    {selectedProduct && selectedProduct !== 'Todas as Campanhas' ? (
                      <>
                        <AudienceHistorySection
                          selectedClient={selectedClient}
                          selectedProduct={selectedProduct}
                        />
                      </>
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
                        <p className="text-gray-400">Selecione uma campanha no topo para ver os públicos.</p>
                      </div>
                    )}
                  </TabContent>

                  {/* Tab: Estratégia - Planejamento */}
                  <TabContent activeTab={activeTab} tabId="estrategia">
                    {selectedClient && selectedClient !== 'Selecione um cliente' ? (
                      <AdStrategySection
                        selectedClient={selectedClient}
                        selectedMonth={selectedMonth}
                        onStrategyCreated={handleStrategyCreated}
                      />
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 text-center">
                        <p className="text-gray-400">Selecione um cliente no topo para planejar a estratégia.</p>
                      </div>
                    )}
                  </TabContent>
                </>
              </>
            )}
          </>
        )}
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

      {/* 🎯 NOVO: Modal de Rate Limit */}
      <RateLimitModal
        isOpen={showRateLimitModal}
        onClose={() => {
          setShowRateLimitModal(false);
          setRateLimitError('');
        }}
        errorMessage={rateLimitError}
      />
    </div>
  );
};

export default Dashboard; 