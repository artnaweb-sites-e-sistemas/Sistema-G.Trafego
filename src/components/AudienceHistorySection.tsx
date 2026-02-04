import React, { useEffect, useMemo, useState } from 'react';
import SectionHeader from './ui/SectionHeader';
import { metaAdsMcpService } from '../services/metaAdsMcpService';
import RateLimitModal from './RateLimitModal';
import { metaAdsService } from '../services/metaAdsService';
import { RefreshCw, ArrowLeft } from 'lucide-react';

interface AudienceHistorySectionProps {
  selectedClient: string;
  selectedProduct: string;
}

interface AdSetData {
  month: string;
  adSet: string;
  campaign: string;
  cpm: number;
  cpc: number;
  lpv: number; // 🎯 NOVA: Landing Page Views
  ctr: number;
  txMensagens: number;
  txAgendamento: number;
  txConversaoVendas: number;
  cpr: number;
  roiCombined: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  status: 'active' | 'inactive';
  campaignStatus?: 'active' | 'inactive'; // 🎯 NOVO: Status da campanha
  adSetStatus?: 'active' | 'inactive'; // 🎯 NOVO: Status do conjunto de anúncios
}

interface CachedData {
  data: AdSetData[];
  timestamp: number;
  lastUpdate: string;
}

type SortKey = 'month' | 'adSet' | 'cpm' | 'cpc' | 'lpv' | 'txMensagens' | 'txAgendamento' | 'txConversaoVendas' | 'cpr' | 'roiCombined';

const AudienceHistorySection: React.FC<AudienceHistorySectionProps> = ({ selectedClient, selectedProduct }) => {
  // 🎯 NOVO: Ler estado do toggle do localStorage
  const [agendamentosEnabled, setAgendamentosEnabled] = useState(true);

  // 🎯 NOVO: Carregar estado do toggle do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('agendamentosEnabled');
    if (saved !== null) {
      setAgendamentosEnabled(JSON.parse(saved));
    }
  }, []);

  // 🎯 NOVO: Escutar mudanças no localStorage e eventos customizados
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('agendamentosEnabled');
      if (saved !== null) {
        setAgendamentosEnabled(JSON.parse(saved));
      }
    };

    const handleCustomEvent = (event: CustomEvent) => {
      setAgendamentosEnabled(event.detail.agendamentosEnabled);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('agendamentosEnabledChanged', handleCustomEvent as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('agendamentosEnabledChanged', handleCustomEvent as EventListener);
    };
  }, []);
  const [adSetData, setAdSetData] = useState<AdSetData[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // 🎯 NOVO: Estados para controle de atualização manual
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  // 🎯 NOVO: Estados para modal de rate limit
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string>('');
  
  // 🎯 NOVO: Estados para cache inteligente
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [hasFullData, setHasFullData] = useState(false);
  const [isLoadingFullHistory, setIsLoadingFullHistory] = useState(false);
  const [currentHistoryMonths, setCurrentHistoryMonths] = useState(3); // 🎯 NOVO: Controle de meses carregados
  
  // 🎯 NOVO: Estados para checkboxes de filtro
  const [selectedAdSets, setSelectedAdSets] = useState<Set<string>>(new Set());
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // 🎯 NOVO: Constantes para cache diferenciado (apenas localStorage)
  const RECENT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas para dados recentes (3 meses)
  const HISTORICAL_CACHE_TTL = 30 * 24 * 60 * 60 * 1000; // 30 dias para dados históricos (12+ meses)
  const CACHE_KEY = `audience_history_${selectedClient}_${selectedProduct}`;
  const HISTORICAL_CACHE_KEY = `audience_history_12m_${selectedClient}_${selectedProduct}`;
  const FULL_HISTORY_CACHE_KEY = `audience_history_24m_${selectedClient}_${selectedProduct}`;

  // 🎯 NOVA FUNÇÃO: Salvar dados no cache (apenas localStorage)
  const saveToCache = (data: AdSetData[], forceRefresh: boolean = false, cacheType: 'recent' | '12m' | '24m' = 'recent') => {
    try {
      const cachedData: CachedData = {
        data,
        timestamp: Date.now(),
        lastUpdate: forceRefresh ? new Date().toISOString() : (lastUpdate?.toISOString() || new Date().toISOString())
      };

      // Salvar apenas no localStorage (mais eficiente)
      let cacheKey: string;
      switch (cacheType) {
        case '12m':
          cacheKey = HISTORICAL_CACHE_KEY;
          break;
        case '24m':
          cacheKey = FULL_HISTORY_CACHE_KEY;
          break;
        default:
          cacheKey = CACHE_KEY;
      }
      localStorage.setItem(cacheKey, JSON.stringify(cachedData));
    } catch (error) {
      console.warn('Erro ao salvar cache:', error);
    }
  };

  // 🎯 NOVA FUNÇÃO: Determinar status combinado (campanha + adset)
  const getCombinedStatus = (campaignStatus?: 'active' | 'inactive', adSetStatus?: 'active' | 'inactive'): 'active' | 'inactive' => {
    // 🎯 LÓGICA: Círculo verde APENAS se AMBOS estiverem ativos
    if (campaignStatus === 'active' && adSetStatus === 'active') {
      return 'active';
    }
    // 🎯 Círculo vermelho em qualquer outro caso
    return 'inactive';
  };

  // 🎯 NOVAS FUNÇÕES: Gerenciar checkboxes de filtro
  const handleAdSetSelection = (adSetKey: string, checked: boolean) => {
    setSelectedAdSets(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(adSetKey);
      } else {
        newSet.delete(adSetKey);
      }
      return newSet;
    });
  };



  const clearSelection = () => {
    setSelectedAdSets(new Set());
    setShowOnlySelected(false);
  };

  // 🎯 NOVA FUNÇÃO: Carregar dados do cache (apenas localStorage)
  const loadFromCache = (cacheType: 'recent' | '12m' | '24m' = 'recent'): AdSetData[] | null => {
    try {
      let cacheKey: string;
      let cacheTTL: number;
      
      switch (cacheType) {
        case '12m':
          cacheKey = HISTORICAL_CACHE_KEY;
          cacheTTL = HISTORICAL_CACHE_TTL;
          break;
        case '24m':
          cacheKey = FULL_HISTORY_CACHE_KEY;
          cacheTTL = HISTORICAL_CACHE_TTL;
          break;
        default:
          cacheKey = CACHE_KEY;
          cacheTTL = RECENT_CACHE_TTL;
      }
      
      const cached = localStorage.getItem(cacheKey);
      if (!cached) return null;

      const cachedData: CachedData = JSON.parse(cached);
      const now = Date.now();

      // Verificar se cache ainda é válido
      if ((now - cachedData.timestamp) > cacheTTL) {
        localStorage.removeItem(cacheKey);
        return null;
      }

      // Atualizar estados
      setLastUpdate(new Date(cachedData.lastUpdate));
      setHasInitialLoad(true);

      // 🎯 CORREÇÃO: Garantir que todos os objetos tenham a propriedade lpv
      const validatedData = cachedData.data.map(item => ({
        ...item,
        lpv: item.lpv !== undefined ? item.lpv : 0
      }));

      return validatedData;
    } catch (error) {
      console.warn('Erro ao carregar cache:', error);
      return null;
    }
  };

  // 🎯 NOVA FUNÇÃO: Carregar dados com controle manual
  const loadAdSetData = async (forceRefresh: boolean = false) => {
      if (!selectedProduct || selectedProduct === 'Todos os Produtos') return;
      
      setLoading(true);
    if (forceRefresh) {
      setIsRefreshing(true);
    }
    
    try {
      // 🎯 NOVO: Tentar carregar do cache primeiro (se não for force refresh)
      if (!forceRefresh) {
        const cachedData = loadFromCache();
        if (cachedData && cachedData.length > 0) {
          setAdSetData(cachedData);
          setHasInitialLoad(true);
          setLoading(false);
          setIsRefreshing(false);
          return;
        }
      }

      // 🎯 NOVA LÓGICA: Carregamento inteligente progressivo
      let mcpData: any[] = [];
      let loadedPeriod = '3m';
      
      // 1. Tentar carregar últimos 3 meses primeiro
      
      mcpData = await metaAdsMcpService.getAudienceHistoryByProduct(selectedClient, selectedProduct, 'last_90d');
      
      // 2. Se não encontrou dados, tentar 12 meses
      if (mcpData.length === 0) {
        
        mcpData = await metaAdsMcpService.getAudienceHistoryByProduct(selectedClient, selectedProduct, 'last_365d');
        loadedPeriod = '12m';
        
        // 3. Se ainda não encontrou, tentar máximo
        if (mcpData.length === 0) {
          
          mcpData = await metaAdsMcpService.getAudienceHistoryByProduct(selectedClient, selectedProduct, 'maximum');
          loadedPeriod = '24m';
        }
      }
        
        if (mcpData.length > 0) {
          // Agrupar por combinação única de mês + adset completo
          const groupedData = new Map<string, AdSetData>();
          
          mcpData.forEach(item => {
            // Criar chave única: mês + adset completo
            const uniqueKey = `${item.month}_${item.adSet}`;
            
            // Verificar se os dados são válidos antes de processar
            if (!item.month || !item.adSet || (item.impressions === 0 && item.clicks === 0 && item.spend === 0)) {
              return; // Pular dados inválidos
            }
            
            if (groupedData.has(uniqueKey)) {
              // Somar métricas ao registro existente
              const existing = groupedData.get(uniqueKey)!;
              existing.impressions += item.impressions || 0;
              existing.clicks += item.clicks || 0;
              existing.spend += item.spend || 0;
              existing.reach += item.reach || 0;
              
              // Calcular CPM, CPC e CTR médios ponderados
              const totalImpressions = existing.impressions;
              const totalClicks = existing.clicks;
              const totalSpend = existing.spend;
              
              if (totalImpressions > 0) {
                existing.cpm = (totalSpend / totalImpressions) * 1000;
              }
              if (totalClicks > 0) {
                existing.cpc = totalSpend / totalClicks;
              }
              if (totalImpressions > 0) {
                existing.ctr = (totalClicks / totalImpressions) * 100;
              }
            } else {
              // Criar novo registro
              groupedData.set(uniqueKey, {
                month: item.month,
                adSet: item.adSet,
                campaign: item.campaign,
                cpm: item.cpm || 0,
                cpc: item.cpc || 0,
                lpv: item.lpv || 0, // 🎯 NOVA: Landing Page Views
                ctr: item.ctr || 0,
                txMensagens: item.txMensagens || 0,
                txAgendamento: item.txAgendamento || 0,
                txConversaoVendas: item.txConversaoVendas || 0,
                cpr: item.cpr || 0,
                roiCombined: item.roiCombined || '',
                impressions: item.impressions || 0,
                clicks: item.clicks || 0,
                spend: item.spend || 0,
                reach: item.reach || 0,
              status: item.status,
              campaignStatus: item.campaignStatus || 'inactive',
              adSetStatus: item.adSetStatus || item.status
              });
            }
          });
          
          // Converter para array
          const processedData: AdSetData[] = Array.from(groupedData.values());
          
        setAdSetData(processedData);
        setHasInitialLoad(true);
        
        // 🎯 NOVO: Definir período carregado baseado nos dados encontrados
        if (loadedPeriod === '12m') {
          setCurrentHistoryMonths(12);
          setShowFullHistory(true);
          saveToCache(processedData, forceRefresh, '12m');
        } else if (loadedPeriod === '24m') {
          setCurrentHistoryMonths(24);
          setShowFullHistory(true);
          setHasFullData(true);
          saveToCache(processedData, forceRefresh, '24m');
        } else {
          saveToCache(processedData, forceRefresh, 'recent');
        }
          
        // 🎯 CORREÇÃO: Atualizar data da última atualização APENAS se a requisição foi bem-sucedida
        if (forceRefresh) {
          setLastUpdate(new Date());
          
        }
          
          
      } else {
        setAdSetData([]);
        setHasInitialLoad(true);
          
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados dos conjuntos de anúncio:', error);
        console.error('🔍 Detalhes do erro:', {
          message: error instanceof Error ? error.message : 'Erro desconhecido',
          stack: error instanceof Error ? error.stack : undefined
        });
        
       // 🎯 NOVO: Verificar se é erro de rate limit
       const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
       
       
       
       
       if (errorMessage.includes('User request limit reached') || errorMessage.includes('rate limit') || errorMessage.includes('Rate limit')) {
         
         setRateLimitError(errorMessage);
         setShowRateLimitModal(true);
       } else {
         
       }
       
       // 🎯 CORREÇÃO: NÃO atualizar a data de última atualização em caso de erro
       
       
          setAdSetData([]);
     } finally {
       setLoading(false);
       setIsRefreshing(false);
     }
  };

  // 🎯 NOVA FUNÇÃO: Atualizar dados manualmente
  const handleRefresh = async () => {
    await loadAdSetData(true);
  };

  // 🎯 NOVA FUNÇÃO: Carregar 12 meses de histórico
  const load12MonthsHistory = async () => {
    if (!selectedProduct || selectedProduct === 'Todos os Produtos') return;

    setIsLoadingFullHistory(true);

    try {
      // 🎯 NOVO: Tentar carregar do cache primeiro
      const cached12mData = loadFromCache('12m');
      if (cached12mData && cached12mData.length > 0) {
        setAdSetData(cached12mData);
        setCurrentHistoryMonths(12);
        setShowFullHistory(true);
        setIsLoadingFullHistory(false);
        return;
      }

      // Buscar dados de 12 meses do Meta Ads via MCP
      
      const mcpData = await metaAdsMcpService.getAudienceHistoryByProduct(selectedClient, selectedProduct, 'last_365d');

      if (mcpData.length > 0) {
        // Processar dados de 12 meses (mesma lógica do loadAdSetData)
        const groupedData = new Map<string, AdSetData>();

        mcpData.forEach(item => {
          const uniqueKey = `${item.month}_${item.adSet}`;

          if (!item.month || !item.adSet || (item.impressions === 0 && item.clicks === 0 && item.spend === 0)) {
            return;
          }

          if (groupedData.has(uniqueKey)) {
            const existing = groupedData.get(uniqueKey)!;
            existing.impressions += item.impressions || 0;
            existing.clicks += item.clicks || 0;
            existing.spend += item.spend || 0;
            existing.reach += item.reach || 0;

            const totalImpressions = existing.impressions;
            const totalClicks = existing.clicks;
            const totalSpend = existing.spend;

            if (totalImpressions > 0) {
              existing.cpm = (totalSpend / totalImpressions) * 1000;
            }
            if (totalClicks > 0) {
              existing.cpc = totalSpend / totalClicks;
            }
            if (totalImpressions > 0) {
              existing.ctr = (totalClicks / totalImpressions) * 100;
            }
          } else {
            groupedData.set(uniqueKey, {
              month: item.month,
              adSet: item.adSet,
              campaign: item.campaign,
              cpm: item.cpm || 0,
              cpc: item.cpc || 0,
              lpv: item.lpv || 0, // 🎯 NOVA: Landing Page Views
              ctr: item.ctr || 0,
              txMensagens: item.txMensagens || 0,
              txAgendamento: item.txAgendamento || 0,
              txConversaoVendas: item.txConversaoVendas || 0,
              cpr: item.cpr || 0,
              roiCombined: item.roiCombined || '',
              impressions: item.impressions || 0,
              clicks: item.clicks || 0,
              spend: item.spend || 0,
              reach: item.reach || 0,
              status: item.status,
              campaignStatus: item.campaignStatus || 'inactive',
              adSetStatus: item.adSetStatus || item.status
            });
          }
        });

        const processed12mData: AdSetData[] = Array.from(groupedData.values());

        setAdSetData(processed12mData);
        setCurrentHistoryMonths(12);
        setShowFullHistory(true);

        // Salvar no cache de 12 meses
        saveToCache(processed12mData, false, '12m');

        
      } else {
        
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico de 12 meses:', error);
      } finally {
      setIsLoadingFullHistory(false);
    }
  };

  // 🎯 NOVA FUNÇÃO: Carregar mais 12 meses (24 meses total)
  const loadMore12Months = async () => {
    if (!selectedProduct || selectedProduct === 'Todos os Produtos') return;

    setIsLoadingFullHistory(true);

    try {
      // 🎯 NOVO: Tentar carregar do cache primeiro
      const cached24mData = loadFromCache('24m');
      if (cached24mData && cached24mData.length > 0) {
        // 🎯 CORREÇÃO: Garantir que todos os objetos tenham a propriedade lpv
        const validatedData = cached24mData.map(item => ({
          ...item,
          lpv: item.lpv !== undefined ? item.lpv : 0
        }));
        
        setAdSetData(validatedData);
        setCurrentHistoryMonths(24);
        setHasFullData(true);
        setIsLoadingFullHistory(false);
        return;
      }

      // Buscar dados completos do Meta Ads via MCP
      
      const fullMcpData = await metaAdsMcpService.getAudienceHistoryByProduct(selectedClient, selectedProduct, 'maximum');

      if (fullMcpData.length > 0) {
        // Processar dados completos (mesma lógica do loadAdSetData)
        const groupedData = new Map<string, AdSetData>();

        fullMcpData.forEach(item => {
          const uniqueKey = `${item.month}_${item.adSet}`;

          if (!item.month || !item.adSet || (item.impressions === 0 && item.clicks === 0 && item.spend === 0)) {
            return;
          }

          if (groupedData.has(uniqueKey)) {
            const existing = groupedData.get(uniqueKey)!;
            existing.impressions += item.impressions || 0;
            existing.clicks += item.clicks || 0;
            existing.spend += item.spend || 0;
            existing.reach += item.reach || 0;

            const totalImpressions = existing.impressions;
            const totalClicks = existing.clicks;
            const totalSpend = existing.spend;

            if (totalImpressions > 0) {
              existing.cpm = (totalSpend / totalImpressions) * 1000;
            }
            if (totalClicks > 0) {
              existing.cpc = totalSpend / totalClicks;
            }
            if (totalImpressions > 0) {
              existing.ctr = (totalClicks / totalImpressions) * 100;
            }
          } else {
            groupedData.set(uniqueKey, {
              month: item.month,
              adSet: item.adSet,
              campaign: item.campaign,
              cpm: item.cpm || 0,
              cpc: item.cpc || 0,
              lpv: item.lpv || 0, // 🎯 NOVA: Landing Page Views
              ctr: item.ctr || 0,
              txMensagens: item.txMensagens || 0,
              txAgendamento: item.txAgendamento || 0,
              txConversaoVendas: item.txConversaoVendas || 0,
              cpr: item.cpr || 0,
              roiCombined: item.roiCombined || '',
              impressions: item.impressions || 0,
              clicks: item.clicks || 0,
              spend: item.spend || 0,
              reach: item.reach || 0,
              status: item.status,
              campaignStatus: item.campaignStatus || 'inactive',
              adSetStatus: item.adSetStatus || item.status
            });
          }
        });

        const processed24mData: AdSetData[] = Array.from(groupedData.values());

        setAdSetData(processed24mData);
        setCurrentHistoryMonths(24);
        setHasFullData(true);

        // Salvar no cache de histórico completo
        saveToCache(processed24mData, false, '24m');

        
      } else {
        
      }
    } catch (error) {
      console.error('❌ Erro ao carregar histórico completo:', error);
    } finally {
      setIsLoadingFullHistory(false);
    }
  };

  // 🎯 MODIFICADO: Carregar dados automaticamente quando produto mudar
  useEffect(() => {
    if (selectedProduct && selectedProduct !== 'Todos os Produtos') {
      // 🎯 NOVO: Carregar dados automaticamente (com cache)
      loadAdSetData(false);
      // Resetar estados de histórico completo
      setShowFullHistory(false);
      setHasFullData(false);
      setCurrentHistoryMonths(3);
    } else {
      // Limpar dados quando não há produto selecionado
      setAdSetData([]);
      setHasInitialLoad(false);
      setLastUpdate(null);
      setShowFullHistory(false);
      setHasFullData(false);
      setCurrentHistoryMonths(3);
    }
  }, [selectedClient, selectedProduct]);

  // Ordenar dados
  const sortedData = useMemo(() => {
    const copy = [...adSetData];
    copy.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      
      if (sortBy === 'month') {
        const monthsPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const toMonthTime = (m: string) => {
          const [name, yearStr] = m.split(' ');
          const idx = monthsPt.findIndex(x => x.toLowerCase() === (name || '').toLowerCase());
          const year = parseInt(yearStr || '0');
          if (idx < 0 || !year) return 0;
          return new Date(year, idx, 1).getTime();
        };
        return (toMonthTime(a.month) - toMonthTime(b.month)) * dir;
      } else if (sortBy === 'adSet') {
        return a.adSet.localeCompare(b.adSet) * dir;
      } else if (sortBy === 'cpm') {
        return (a.cpm - b.cpm) * dir;
      } else if (sortBy === 'cpc') {
        return (a.cpc - b.cpc) * dir;
      } else if (sortBy === 'lpv') {
        return (a.lpv - b.lpv) * dir;
      } else if (sortBy === 'txMensagens') {
        return (a.txMensagens - b.txMensagens) * dir;
      } else if (sortBy === 'txAgendamento') {
        return (a.txAgendamento - b.txAgendamento) * dir;
      } else if (sortBy === 'txConversaoVendas') {
        return (a.txConversaoVendas - b.txConversaoVendas) * dir;
      } else if (sortBy === 'cpr') {
        return (a.cpr - b.cpr) * dir;
      } else if (sortBy === 'roiCombined') {
        return a.roiCombined.localeCompare(b.roiCombined) * dir;
      }
      return 0;
    });
    return copy;
  }, [adSetData, sortBy, sortDir]);

  // Filtrar por período e checkboxes
  const filteredData = useMemo(() => {
    let data = sortedData;
    
    // 🎯 NOVO: Se histórico completo está ativo, mostrar todos os dados
    if (showFullHistory) {
      data = sortedData;
    } else {
      // 🎯 CORRIGIDO: Mostrar apenas os últimos 3 meses que tiveram gasto
    const monthsPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    const toMonthTime = (m: string) => {
      const [name, yearStr] = m.split(' ');
      const idx = monthsPt.findIndex(x => x.toLowerCase() === (name || '').toLowerCase());
      const year = parseInt(yearStr || '0');
      if (idx < 0 || !year) return 0;
      return new Date(year, idx, 1).getTime();
    };
    
      // Mostrar apenas os últimos 3 meses que tiveram gasto
      const periodsWithSpend = sortedData.filter(item => item.spend > 0);
      const sortedByDate = [...periodsWithSpend].sort((a, b) => toMonthTime(b.month) - toMonthTime(a.month));
      const last3MonthsWithSpend = sortedByDate.slice(0, 3);
      data = last3MonthsWithSpend;
    }
    
    // 🎯 NOVO: Aplicar filtro por checkboxes selecionados
    if (showOnlySelected && selectedAdSets.size > 0) {
      data = data.filter(row => selectedAdSets.has(`${row.month}_${row.adSet}`));
    }
    
    return data;
  }, [sortedData, showFullHistory, selectedAdSets, showOnlySelected]);

  // Calcular médias
  const averages = useMemo(() => {
    if (filteredData.length === 0) return null;
    
    const totals = filteredData.reduce((acc, row) => ({
      cpm: acc.cpm + (row.cpm || 0),
      cpc: acc.cpc + (row.cpc || 0),
      lpv: acc.lpv + (row.lpv || 0), // 🎯 NOVA: Landing Page Views
      ctr: acc.ctr + (row.ctr || 0),
      spend: acc.spend + (row.spend || 0),
      impressions: acc.impressions + (row.impressions || 0),
      clicks: acc.clicks + (row.clicks || 0),
      reach: acc.reach + (row.reach || 0),
      txMensagens: acc.txMensagens + (row.txMensagens || 0),
      txAgendamento: acc.txAgendamento + (row.txAgendamento || 0),
      txConversaoVendas: acc.txConversaoVendas + (row.txConversaoVendas || 0),
      cpr: acc.cpr + (row.cpr || 0)
    }), { cpm: 0, cpc: 0, lpv: 0, ctr: 0, spend: 0, impressions: 0, clicks: 0, reach: 0, txMensagens: 0, txAgendamento: 0, txConversaoVendas: 0, cpr: 0 });

    return {
      cpm: totals.cpm / filteredData.length,
      cpc: totals.cpc / filteredData.length,
      lpv: totals.lpv / filteredData.length, // 🎯 NOVA: Landing Page Views
      ctr: totals.ctr / filteredData.length,
      spend: totals.spend / filteredData.length,
      impressions: totals.impressions / filteredData.length,
      clicks: totals.clicks / filteredData.length,
      reach: totals.reach / filteredData.length,
      txMensagens: totals.txMensagens / filteredData.length,
      txAgendamento: totals.txAgendamento / filteredData.length,
      txConversaoVendas: totals.txConversaoVendas / filteredData.length,
      cpr: totals.cpr / filteredData.length
    };
  }, [filteredData]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'month' ? 'desc' : 'asc');
    }
  };

  const th = (label: string, key?: SortKey) => (
    <th
      key={key || label}
      onClick={key ? () => handleSort(key) : undefined}
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300 ${key ? 'cursor-pointer select-none' : ''} whitespace-nowrap ${
        key === 'month' ? 'w-[120px]' :
        key === 'adSet' ? 'w-[150px]' :
        key === 'cpm' || key === 'cpc' || key === 'cpr' ? 'w-[80px]' :
        key === 'txMensagens' ? 'w-[100px]' :
        key === 'txAgendamento' ? 'w-[110px]' :
        key === 'txConversaoVendas' ? (agendamentosEnabled ? 'w-[90px]' : 'w-[0px]') :
        key === 'roiCombined' ? 'w-[120px]' : ''
      }`}
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {key && sortBy === key && (
          <span className="text-slate-400">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  const td = (content: React.ReactNode) => (
    <td className="px-3 py-3 text-sm text-slate-200">{content}</td>
  );

  const fmtCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
  const fmtPct = (v: number) => `${Number(v || 0).toFixed(2)}%`;
  const fmtNumber = (v: number) => Number(v || 0).toLocaleString('pt-BR');

  // Componente para linha de médias
  const AverageRow: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => {
    if (filteredData.length === 0) return null;
    
    const avgCpm = filteredData.reduce((sum, item) => sum + item.cpm, 0) / filteredData.length;
    const avgCpc = filteredData.reduce((sum, item) => sum + item.cpc, 0) / filteredData.length;
    const avgLpv = filteredData.reduce((sum, item) => sum + (item.lpv || 0), 0) / filteredData.length; // 🎯 NOVA: Landing Page Views
    const avgTxMensagens = filteredData.reduce((sum, item) => sum + item.txMensagens, 0) / filteredData.length;
    const avgTxAgendamento = filteredData.reduce((sum, item) => sum + item.txAgendamento, 0) / filteredData.length;
    const avgTxConversaoVendas = filteredData.reduce((sum, item) => sum + item.txConversaoVendas, 0) / filteredData.length;
    const avgCpr = filteredData.reduce((sum, item) => sum + item.cpr, 0) / filteredData.length;
    
    // Calcular ROI/ROAS médio
    const avgRoi = filteredData.reduce((sum, item) => {
      const roiValue = parseFloat(item.roiCombined.replace(/[^\d.-]/g, '')) || 0;
      return sum + roiValue;
    }, 0) / filteredData.length;
    
    const avgRoiFormatted = avgRoi > 0 ? `${avgRoi.toFixed(1)}%` : `${avgRoi.toFixed(1)}%`;
    const avgRoiMultiplier = avgRoi > 0 ? `${(avgRoi / 100 + 1).toFixed(1)}x` : '0.0x';
    const avgRoiCombined = `${avgRoiFormatted} / ${avgRoiMultiplier}`;
    
    return (
      <tr className="bg-purple-900/20 border-t border-b border-purple-500/30">
        {/* 🎯 CORRIGIDO: Adicionar coluna do checkbox para alinhar com o cabeçalho */}
        <td className="px-3 py-3 w-[40px] bg-purple-900/40">
          {/* Espaço vazio para alinhar com a coluna de checkbox */}
        </td>
        <td className="px-3 py-3 text-sm font-medium text-purple-100 bg-purple-900/40 w-[120px] whitespace-nowrap">
          Período
        </td>
        {/* 🎯 CORRIGIDO: Adicionar coluna CONJUNTO DE ANÚNCIOS para alinhar com o cabeçalho */}
        <td className="px-3 py-3 text-sm font-medium text-purple-100 bg-purple-900/40 w-[150px] whitespace-nowrap">
          -
        </td>
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[80px] whitespace-nowrap">
          R$ {avgCpm.toFixed(2)}
        </td>
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[80px] whitespace-nowrap">
          R$ {avgCpc.toFixed(2)}
        </td>
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[80px] whitespace-nowrap">
          {(avgLpv || 0).toLocaleString()}
        </td>
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[100px] whitespace-nowrap">
          {avgTxMensagens.toFixed(2)}%
        </td>
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[110px] whitespace-nowrap">
          {avgTxAgendamento.toFixed(2)}%
        </td>
        {agendamentosEnabled && (
          <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[90px] whitespace-nowrap">
            {avgTxConversaoVendas.toFixed(2)}%
          </td>
        )}
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[80px] whitespace-nowrap">
          R$ {avgCpr.toFixed(2)}
        </td>
        <td className="px-3 py-3 text-sm font-semibold text-purple-200 text-right w-[120px] whitespace-nowrap">
          {avgRoiCombined}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <SectionHeader title="Histórico de Público" subtitle={selectedProduct} />
          
          <div className="flex flex-col items-end gap-2">
                         {/* Data da Última Atualização (apenas texto) */}
             {lastUpdate && (
               <div className="text-xs text-slate-400">
                 atualizado em: <span className="font-semibold text-slate-300">{lastUpdate.toLocaleDateString('pt-BR', {
                   day: '2-digit',
                   month: '2-digit',
                   year: 'numeric'
                 })}</span> às <span className="font-semibold text-slate-300">{lastUpdate.toLocaleTimeString('pt-BR', {
                   hour: '2-digit',
                   minute: '2-digit'
                 })}</span>
               </div>
             )}
            
            {/* Botões alinhados na mesma linha */}
            <div className="flex items-center gap-4">
              {/* 🎯 NOVO: Botão Ver Histórico (12 meses) - Design Melhorado */}
              {!showFullHistory && (
            <button
                  onClick={load12MonthsHistory}
                  disabled={loading || isLoadingFullHistory}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    isLoadingFullHistory
                      ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                      : 'bg-slate-700/80 text-slate-200 border border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500/50 shadow-md hover:shadow-lg'
                  }`}
                  title="Carregar histórico de 12 meses"
                >
                  {isLoadingFullHistory ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-slate-400 border-t-transparent"></div>
                  ) : null}
                  {isLoadingFullHistory ? 'Carregando...' : 'Ver Histórico (12 meses)'}
                </button>
              )}

              {/* 🎯 NOVO: Botão Voltar aos Últimos 3 Meses - Design Melhorado */}
              {showFullHistory && (
                <button
                  onClick={() => {
                    setShowFullHistory(false);
                    setCurrentHistoryMonths(3);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-purple-600/20 text-purple-300 border border-purple-500/50 hover:bg-purple-600/30 hover:border-purple-400/60"
                  title="Voltar para os últimos 3 meses"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Voltar aos Últimos 3 Meses
            </button>
              )}

              {/* Botão Atualizar */}
            <button
                onClick={handleRefresh}
                disabled={loading || isRefreshing}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isRefreshing
                    ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                }`}
                title="Atualizar dados do histórico de público"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
            </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* 🎯 NOVO: Indicador de filtro ativo */}
        {!loading && filteredData.length > 0 && (
          <div className="mb-4 text-sm text-slate-400">
            {showFullHistory 
              ? <><b>Histórico de {currentHistoryMonths} meses</b>: exibindo <b>{filteredData.length} períodos</b></>
              : <><b>Períodos com gasto</b>: exibindo <b>{filteredData.length} períodos</b></>
            }
          </div>
        )}


        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500"></div>
            <span className="ml-3 text-slate-300">Carregando dados dos conjuntos de anúncio...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              {/* Cabeçalho da tabela */}
              <thead className="bg-slate-800/50">
                <tr>
                  {/* 🎯 NOVO: Coluna para checkbox */}
                  <th className="px-3 py-3 w-[40px]">
                    <div className="flex items-center justify-center">
                      <span className="text-xs text-slate-400">✓</span>
                    </div>
                  </th>
                  {th('MÊS/ANO', 'month')}
                  {th('CONJUNTO DE ANÚNCIOS', 'adSet')}
                  {th('CPM', 'cpm')}
                                  {th('CPC', 'cpc')}
                {th('LPV', 'lpv')}
                {th('% MENSAGENS', 'txMensagens')}
                {th('% AGENDAMENTO', 'txAgendamento')}
                {agendamentosEnabled && th('% VENDAS', 'txConversaoVendas')}
                {th('CPR', 'cpr')}
                {th('ROI/ROAS', 'roiCombined')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {/* Linha de médias no topo */}
                <AverageRow position="top" />
                
                {/* Dados dos conjuntos de anúncio */}
                {filteredData.map((row, index) => {
                  const adSetKey = `${row.month}_${row.adSet}`;
                  const isSelected = selectedAdSets.has(adSetKey);
                  
                  return (
                    <tr key={`${row.month}-${row.adSet}-${index}`} className={`hover:bg-slate-800/30 transition-colors ${isSelected ? 'bg-purple-900/20 border-l-4 border-l-purple-500' : ''}`}>
                      {/* 🎯 NOVO: Checkbox para seleção */}
                      <td className="px-3 py-3 w-[40px]">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleAdSetSelection(adSetKey, e.target.checked)}
                          className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500 focus:ring-2 cursor-pointer"
                          title={`Selecionar ${row.adSet} - ${row.month}`}
                        />
                      </td>
                    <td className="px-3 py-3 text-sm text-slate-100 font-medium bg-slate-800/30 w-[120px] whitespace-nowrap">
                      {row.month}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200 w-[150px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${getCombinedStatus(row.campaignStatus, row.adSetStatus) === 'inactive' ? 'bg-red-500' : 'bg-emerald-500'}`}
                          title={
                            getCombinedStatus(row.campaignStatus, row.adSetStatus) === 'inactive' 
                              ? `Desativado - Campanha: ${row.campaignStatus || 'desconhecido'}, AdSet: ${row.adSetStatus || 'desconhecido'}`
                              : `Ativado - Campanha: ${row.campaignStatus || 'desconhecido'}, AdSet: ${row.adSetStatus || 'desconhecido'}`
                          }
                        />
                        <div className="relative group">
                        <span 
                            className="truncate cursor-help max-w-[240px] block" 
                        >
                          {row.adSet}
                        </span>
                          {/* 🎯 NOVO: Tooltip customizado seguindo a identidade visual */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 min-w-[300px] max-w-[400px]">
                            <div className="text-xs text-slate-300 font-medium mb-1">
                              Conjunto de Anúncios
                            </div>
                            <div className="text-sm text-slate-100 font-semibold">
                              {row.adSet}
                            </div>
                            {/* Seta do tooltip */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[80px] whitespace-nowrap">
                      R$ {row.cpm.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[80px] whitespace-nowrap">
                      R$ {row.cpc.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[80px] whitespace-nowrap">
                      {(row.lpv || 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[100px] whitespace-nowrap">
                      {row.txMensagens.toFixed(2)}%
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[110px] whitespace-nowrap">
                      {row.txAgendamento.toFixed(2)}%
                    </td>
                    {agendamentosEnabled && (
                      <td className="px-3 py-3 text-sm text-slate-200 text-right w-[90px] whitespace-nowrap">
                        {row.txConversaoVendas.toFixed(2)}%
                      </td>
                    )}
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[80px] whitespace-nowrap">
                      R$ {row.cpr.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-200 text-right w-[120px] whitespace-nowrap">
                      {row.roiCombined}
                    </td>
                  </tr>
                );
                })}
                
                {/* Linha de médias no final */}
                <AverageRow position="bottom" />
              </tbody>
            </table>
          </div>
        )}

        {/* 🎯 NOVO: Controles de Filtro por Checkboxes - Centralizados abaixo da tabela */}
        {!loading && selectedAdSets.size > 0 && (
          <div className="flex justify-center mt-6">
            <div className="flex items-center gap-4 bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
              {/* Botão Mostrar Apenas Selecionados */}
              <button
                onClick={() => setShowOnlySelected(!showOnlySelected)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                  showOnlySelected
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/50'
                    : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/50'
                }`}
                title="Mostrar apenas os selecionados"
              >
                {showOnlySelected ? 'Mostrando Selecionados' : 'Mostrar Selecionados'} ({selectedAdSets.size})
              </button>

              {/* Botão Limpar Seleção */}
              <button
                onClick={clearSelection}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 bg-red-600/20 text-red-300 border border-red-500/50 hover:bg-red-600/30 hover:border-red-400/60"
                title="Limpar seleção e mostrar todos"
              >
                Limpar Seleção
              </button>
            </div>
          </div>
        )}

        {/* 🎯 NOVO: Botão Carregar mais 12 meses - Centralizado abaixo da tabela */}
        {showFullHistory && currentHistoryMonths === 12 && !hasFullData && (
          <div className="flex justify-center mt-6">
            <button
              onClick={loadMore12Months}
              disabled={isLoadingFullHistory}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLoadingFullHistory
                  ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                  : 'bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/50'
              }`}
              title="Carregar mais 12 meses de histórico"
            >
              {isLoadingFullHistory ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
              ) : null}
              {isLoadingFullHistory ? 'Carregando...' : 'Carregar mais 12 meses'}
            </button>
          </div>
        )}
      </div>
      
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

export default AudienceHistorySection;


