import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import Header from './Header';
import MetricsGrid from './MetricsGrid';
import DailyControlTable from './DailyControlTable';
import MonthlyDetailsTable from './MonthlyDetailsTable';
import AudienceDetailsTable from './AudienceDetailsTable';
import InsightsSection from './InsightsSection';
// import HistorySection from './HistorySection'; // Removido conforme solicitação
import AudienceHistorySection from './AudienceHistorySection';
import ShareReport from './ShareReport';
import AIBenchmark from './AIBenchmark';
import PerformanceAdsSection from './PerformanceAdsSection';
import PendingAudiencesStatus from './PendingAudiencesStatus';
import { analysisPlannerService } from '../services/analysisPlannerService';
import AdStrategySection from './AdStrategySection';
import { User } from '../services/authService';
import { metricsService, type MetricData } from '../services/metricsService';
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

  // Função para obter o ID do usuário do Meta Ads
  const getMetaAdsUserId = (): string => {
    try {
      const savedUser = localStorage.getItem('facebookUser');
      const selectedAdAccount = localStorage.getItem('selectedAdAccount');
      
      if (savedUser && selectedAdAccount) {
        const user = JSON.parse(savedUser);
        const adAccount = JSON.parse(selectedAdAccount);
        // Usar combinação do ID do usuário Facebook + ID da conta de anúncios
        return `${user.id}_${adAccount.id}`;
      }
      
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
              } catch {}
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
  const [adStrategies, setAdStrategies] = useState<any[]>([]);

  // Debug: verificar mudanças no selectedClient
  useEffect(() => {
    console.log('🔍 DEBUG - Dashboard - selectedClient alterado para:', selectedClient);
    
    // Salvar cliente selecionado no localStorage para uso em outros componentes
    if (selectedClient && selectedClient !== 'Selecione um cliente') {
      localStorage.setItem('selectedClient', selectedClient);
      // Manter compatibilidade com serviços que leem currentSelectedClient
      try { localStorage.setItem('currentSelectedClient', selectedClient); } catch {}
    } else {
      localStorage.removeItem('selectedClient');
      try { localStorage.removeItem('currentSelectedClient'); } catch {}
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
          console.log('✅ Seleção carregada do Firestore (restauração habilitada):', selection);
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
    console.log('🔍 DEBUG - Dashboard - useEffect loadRealValuesForClient INICIADO');
    console.log('🔍 DEBUG - Dashboard - Estados atuais:', { selectedClient, selectedMonth, realValuesRefreshTrigger });
    console.log('🎯 CARD DEBUG - Dashboard - Trigger para atualização dos cards ativado:', { realValuesRefreshTrigger });
    
    // Evitar execução desnecessária se não há cliente selecionado
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
      console.log('🔍 DEBUG - Dashboard - Cliente não selecionado, definindo valores zerados');
      setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
      return;
    }
    
    // CORREÇÃO: Verificar se já temos dados válidos para evitar carregamentos desnecessários
    if (realValuesForClient.agendamentos > 0 || realValuesForClient.vendas > 0) {
      console.log('🎯 CARD DEBUG - Dashboard - Valores já carregados, pulando nova busca:', realValuesForClient);
      return;
    }
    
    // Evitar loop infinito - limitar o número de chamadas consecutivas
    if (realValuesRefreshTrigger > 50) {
      console.log('🔍 DEBUG - Dashboard - Muitas chamadas consecutivas detectadas, pausando...');
      return;
    }
    
    const loadRealValuesForClient = async () => {
      console.log('🔍 DEBUG - Dashboard - useEffect loadRealValuesForClient executado');
      console.log('🔍 DEBUG - Dashboard - selectedClient:', selectedClient);
      console.log('🔍 DEBUG - Dashboard - selectedMonth:', selectedMonth);
      console.log('🔍 DEBUG - Dashboard - realValuesRefreshTrigger:', realValuesRefreshTrigger);
      console.log('🎯 CARD DEBUG - Dashboard - Iniciando carregamento dos valores reais dos cards...');
      
      try {
        console.log('🔍 DEBUG - Dashboard - Carregando valores reais para cliente:', selectedClient);
        
        // CORREÇÃO: Limpar cache completamente para evitar dados incorretos de contextos anteriores
        console.log('🧹 CACHE DEBUG - Dashboard - FORCE CLEAR - Limpando TODO o cache antes de carregar valores...');
        metricsService.clearCache();
        
        // CORREÇÃO: Também limpar cache específico do cliente
        console.log('🔍 DEBUG - Dashboard - Limpando cache para novo cliente...');
        metricsService.clearCacheByClient(selectedClient);
        
        // Debug: verificar dados na coleção monthlyDetails
        console.log('🔍 DEBUG - Dashboard - Verificando dados na coleção monthlyDetails...');
        await metricsService.debugMonthlyDetails(selectedMonth);
        
        // 🎯 CARD DEBUG: Verificar dados específicos para este cliente
        console.log('🎯 CARD DEBUG - Dashboard - Verificando dados específicos para o cliente:', selectedClient);
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
          console.log('🎯 CARD DEBUG - Dashboard - Documentos encontrados para este cliente:', testSnapshot.size);
          
          testSnapshot.forEach((doc) => {
            console.log('🎯 CARD DEBUG - Dashboard - Documento encontrado:', {
              id: doc.id,
              data: doc.data()
            });
          });
        } catch (debugError) {
          console.error('🎯 CARD DEBUG - Dashboard - Erro ao verificar dados:', debugError);
        }
        
        console.log('🔍 DEBUG - Dashboard - Chamando getRealValuesForClient...');
        const realValues = await metricsService.getRealValuesForClient(selectedMonth, selectedClient);
        console.log('🔍 DEBUG - Dashboard - Resultado da busca:', realValues);
        console.log('🔍 DEBUG - Dashboard - Tipo do resultado:', typeof realValues);
        console.log('🔍 DEBUG - Dashboard - Estrutura do resultado:', JSON.stringify(realValues, null, 2));
        console.log('🔍 DEBUG - Dashboard - Valores CPV e ROI:', {
          cpv: realValues.cpv,
          roi: realValues.roi,
          cpvType: typeof realValues.cpv,
          roiType: typeof realValues.roi
        });
        console.log('🎯 CARD DEBUG - Dashboard - Valores recebidos para os cards:', {
          agendamentos: realValues.agendamentos,
          vendas: realValues.vendas,
          cpv: realValues.cpv,
          roi: realValues.roi
        });
        
        // CORREÇÃO: Se não há dados para o mês atual, retornar valores zerados
        // Não buscar dados de outros meses nem criar dados de teste automaticamente
        console.log('🔍 DEBUG - Dashboard - Definindo valores reais:', realValues);
        
        const finalValues = {
          agendamentos: realValues.agendamentos || 0,
          vendas: realValues.vendas || 0,
          cpv: realValues.cpv || 0,
          roi: typeof realValues.roi === 'string' ? realValues.roi : '0% (0.0x)'
        };
        
        console.log('🎯 CARD DEBUG - Dashboard - Valores finais que serão definidos nos cards:', finalValues);
        setRealValuesForClient(finalValues);
        console.log('🔍 DEBUG - Dashboard - Valores reais carregados:', realValues);
        console.log('🎯 CARD DEBUG - Dashboard - setRealValuesForClient executado com sucesso!');
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
    console.log('🔍 DEBUG - Dashboard - Reset valores por mudança cliente/mês');
    
    // CORREÇÃO: Limpar TODO o cache E localStorage quando cliente ou mês mudam
    console.log('🧹 CACHE DEBUG - Dashboard - Limpando COMPLETAMENTE todo o cache E localStorage por mudança de contexto');
    metricsService.clearAllCacheAndStorage();
    
    // CORREÇÃO: Salvar cliente e mês atuais no localStorage para filtros
    if (selectedClient && selectedClient !== 'Selecione um cliente') {
      localStorage.setItem('currentSelectedClient', selectedClient);
      console.log('🔍 DEBUG - Dashboard - Cliente salvo no localStorage:', selectedClient);
    }
    
    if (selectedMonth && selectedMonth !== 'Selecione um mês') {
      localStorage.setItem('currentSelectedMonth', selectedMonth);
      console.log('🔍 DEBUG - Dashboard - Mês salvo no localStorage:', selectedMonth);
    }
    
    setRealValuesForClient({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
    setRealValuesRefreshTrigger(prev => prev + 1);
  }, [selectedClient, selectedMonth]);

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
      // Ao trocar de campanha/produto, voltar para visão de produto (sem público)
      setSelectedAudience('Todos os Públicos');
      try { localStorage.removeItem('selectedAdSetId'); } catch {}
      
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
        try {
          // Persistir o vínculo do público com o adSetId no planner para consumo de gastos
          if (selectedClient && selectedProduct) {
            analysisPlannerService.savePlanner(selectedClient, selectedProduct, audienceName, { adSetId }).catch(() => {});
          }
        } catch {}
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

      console.log('🎯 CARD DEBUG - Dashboard - handleClientChanged CHAMADO:', { clientName, source });
      
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
          
          // 🎯 CORREÇÃO: Forçar atualização dos cards de valores reais imediatamente
          console.log('🎯 CORREÇÃO - Dashboard - Forçando atualização dos cards após mudança de cliente Facebook');
          setRealValuesRefreshTrigger(prev => prev + 1);
        } catch (error) {
          console.warn('🔴 Dashboard: Erro ao limpar cache:', error);
        }
            } else if (source === 'manual') {
        setDataSource('manual');
        setIsFacebookConnected(false);

        
        // Para clientes manuais, também forçar refresh
        setRefreshTrigger(prev => prev + 1);
        
        // 🎯 CORREÇÃO: Forçar atualização dos cards de valores reais imediatamente
        console.log('🎯 CORREÇÃO - Dashboard - Forçando atualização dos cards após mudança de cliente manual');
        setRealValuesRefreshTrigger(prev => prev + 1);

      }
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
          
          console.log('🔍 DEBUG - Iniciando debug dos valores de público:', { currentMonth, currentProduct });
          
          if (!currentMonth || !currentProduct || currentProduct === 'Todos os Produtos') {
            console.log('❌ DEBUG - Parâmetros insuficientes. Use: debugAudienceValues("mês", "produto")');
            return { error: 'Parâmetros insuficientes' };
          }
          
          const result = await metricsService.debugAudienceData(currentMonth, currentProduct);
          console.log('🔍 DEBUG - Resultado completo:', result);
          
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
          
          console.log('🧹 DEBUG - Iniciando reset completo dos dados:', { currentMonth, currentProduct });
          
          if (!currentMonth || !currentProduct || currentProduct === 'Todos os Produtos') {
            console.log('❌ DEBUG - Parâmetros insuficientes. Use: resetProductData("mês", "produto")');
            return { error: 'Parâmetros insuficientes' };
          }
          
          const result = await metricsService.resetProductData(currentMonth, currentProduct);
          console.log('🧹 DEBUG - Reset concluído:', result);
          
          // Forçar recarregamento da página para garantir estado limpo
          if (result.success) {
            console.log('🔄 DEBUG - Recarregando página para estado limpo...');
            setTimeout(() => {
              window.location.reload();
            }, 2000);
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
          console.log('❌ Selecione um cliente, mês e produto primeiro');
          return;
        }

        try {
          console.log('🗑️ Resetando dados do produto para limpar duplicação...');
          
          // Usar a função resetProductData que já funciona
          const { metricsService } = await import('../services/metricsService');
          const result = await metricsService.resetProductData(selectedMonth, selectedProduct);
          
          if (result.success) {
            console.log('✅ Dados limpos com sucesso! A página será recarregada...');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            console.log('❌ Erro ao limpar dados:', result.error);
          }
        } catch (error) {
          console.error('❌ Erro ao deletar público antigo:', error);
        }
      };

      // 🧹 NOVA FUNÇÃO DEBUG: Limpeza de emergência do cache
      (window as any).clearAllCache = () => {
        console.log('🧹 EMERGÊNCIA - Limpando TODO o cache e localStorage...');
        metricsService.clearAllCacheAndStorage();
        
        // Forçar reload da página para garantir estado limpo
        if (confirm('Cache limpo! Recarregar a página para garantir estado limpo?')) {
          window.location.reload();
        }
      };

      // 🎯 NOVA FUNÇÃO DEBUG: Verificar estratégias carregadas
      (window as any).debugStrategies = async (client?: string) => {
        const targetClient = client || selectedClient;
        console.log(`🎯 DEBUG - Verificando estratégias para cliente: ${targetClient}`);
        
        try {
          const { firestoreStrategyService } = await import('../services/firestoreStrategyService');
          const strategies = await firestoreStrategyService.getStrategiesByClient(targetClient);
          
          console.log(`🎯 DEBUG - Estratégias encontradas no Firestore: ${strategies.length}`);
          strategies.forEach((strategy, index) => {
            console.log(`🎯 DEBUG - Estratégia ${index + 1}:`, {
              id: strategy.id,
              name: strategy.generatedNames?.audience || 'Nome não gerado',
              product: strategy.product?.name || 'Produto sem nome',
              month: strategy.month,
              client: strategy.client,
              synchronized: strategy.isSynchronized
            });
          });
          
          return strategies;
        } catch (error) {
          console.error('❌ Erro ao buscar estratégias:', error);
          return [];
        }
      };

      console.log('🔧 DEBUG - Funções de debug adicionadas ao window:');
      console.log('  - debugAudienceValues("Janeiro 2025", "Nome do Produto") - Ver dados no Firebase');
      console.log('  - resetProductData("Janeiro 2025", "Nome do Produto") - Limpar TODOS os dados e recomeçar');
      console.log('  - deleteOldAudience() - Deletar o público antigo "[Anúncio Jurídico] UTI Negada"');
      console.log('  - clearAllCache() - 🧹 EMERGÊNCIA: Limpar TODO o cache e localStorage');
      console.log('  - debugStrategies("Cliente Nome") - 🎯 VERIFICAR: Estratégias carregadas do Firestore');
    }
  }, [selectedMonth, selectedProduct]);

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
    let isMounted = true;
    const loadBenchmark = async () => {
      if (selectedProduct && selectedProduct !== 'Todos os Produtos') {
        try {
          const savedBenchmark = await benchmarkStorage.loadBenchmark(
            selectedProduct,
            selectedClient !== 'Selecione um cliente' ? selectedClient : undefined,
            selectedMonth
          );
          
          if (isMounted) {
            if (savedBenchmark) {
              setAiBenchmarkResults(savedBenchmark);
            } else {
              setAiBenchmarkResults(null);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar benchmark:', error);
          if (isMounted) {
            setAiBenchmarkResults(null);
          }
        }
      } else {
        if (isMounted) {
          setAiBenchmarkResults(null);
        }
      }
    };

    loadBenchmark();
    
    return () => {
      isMounted = false;
    };
  }, [selectedProduct, selectedClient, selectedMonth]);

  // Flag de recurso para exibir/ocultar a seção de Benchmark com IA
  const SHOW_AI_BENCHMARK = false;

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
              <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/50 border border-slate-600/30 text-slate-200 px-6 py-6 rounded-xl backdrop-blur-sm shadow-lg">
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
                    {SHOW_AI_BENCHMARK && (
                      <AIBenchmark 
                        selectedProduct={selectedProduct}
                        onBenchmarkGenerated={handleBenchmarkGenerated}
                        savedResults={aiBenchmarkResults}
                      />
                    )}
                    {/* Quando apenas produto estiver selecionado, mostrar status dos públicos (sem planner/sugestões) */}
                    {(!selectedAudience || selectedAudience === 'Todos os Públicos') ? (
                      <PendingAudiencesStatus
                        selectedClient={selectedClient}
                        selectedProduct={selectedProduct}
                        selectedMonth={selectedMonth}
                      />
                    ) : (
                      <InsightsSection 
                        selectedProduct={selectedProduct} 
                        results={aiBenchmarkResults}
                        selectedClient={selectedClient}
                        selectedMonth={selectedMonth}
                        selectedAudience={selectedAudience}
                        isFacebookConnected={isFacebookConnected}
                        metaAdsUserId={getMetaAdsUserId()}
                      />
                    )}
                    <MonthlyDetailsTable 
                      metrics={metrics} 
                      selectedProduct={selectedProduct}
                      selectedClient={selectedClient}
                      selectedMonth={selectedMonth}
                      onValuesChange={setMonthlyDetailsValues}
                      aiBenchmarkResults={aiBenchmarkResults}
                    />
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
            {/* Renderizar apenas Histórico de Público (HistorySection removido) */}
            {(selectedProduct && selectedProduct !== 'Todos os Produtos') && (!selectedAudience || selectedAudience === 'Todos os Públicos') && isFacebookConnected && !noDataForSelection && (
              <AudienceHistorySection 
                selectedClient={selectedClient}
                selectedProduct={selectedProduct}
              />
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