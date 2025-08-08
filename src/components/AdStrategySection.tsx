import React, { useState, useEffect, useRef } from 'react';
import { Plus, Target, MapPin, DollarSign, Edit, Copy, CheckCircle, TrendingUp, GitBranch, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adStrategyService, AdStrategy } from '../services/adStrategyService';
import { metaAdsService } from '../services/metaAdsService';
import { toast } from 'react-hot-toast';

interface AdStrategySectionProps {
  selectedClient: string;
  selectedMonth: string;
  onStrategyCreated: (strategy: AdStrategy) => void;
}

const AdStrategySection: React.FC<AdStrategySectionProps> = ({ 
  selectedClient, 
  selectedMonth, 
  onStrategyCreated 
}) => {
  const [strategies, setStrategies] = useState<AdStrategy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<Partial<AdStrategy>>({
    product: {
      name: '',
      niche: '',
      type: 'online' as const,
      objective: 'trafico' as const
    },
    audience: {
      gender: 'ambos' as const,
      ageRange: '25-45',
      locations: []
    },
    budget: {
      planned: 0,
      current: 0
    },
    generatedNames: {
      product: '',
      audience: ''
    },
    isSynchronized: false
  });
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Set<string>>(new Set());
  const [plannedInput, setPlannedInput] = useState<string>('R$ 0,00');
  const [currentInput, setCurrentInput] = useState<string>('R$ 0,00');
  const [recommendations, setRecommendations] = useState<Record<string, { type: 'vertical' | 'horizontal' | 'wait'; tooltip: string; stats: { spend: number; ctr: number; cpl: number; cpr: number; clicks: number; impressions: number; leads: number; sales: number; objective: 'trafico' | 'mensagens' | 'compras'; adSetsCount: number; periodStart: string; periodEnd: string } }>>({});
  
  // Refs para controlar execução
  const hasEvaluatedRef = useRef<Set<string>>(new Set());
  const hasSyncedRef = useRef<Set<string>>(new Set());

  // Bloquear scroll quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isModalOpen]);

  // Carregar estratégias existentes (todas do cliente)
  useEffect(() => {
    if (selectedClient && selectedMonth) {
      const existingStrategies = adStrategyService.getStrategiesByClient(selectedClient);
      setStrategies(existingStrategies);
      // Resetar refs quando mudar cliente/mês
      hasEvaluatedRef.current.clear();
      hasSyncedRef.current.clear();
    }
  }, [selectedClient, selectedMonth]);

  // Auto-avaliar todas as estratégias e sincronizar as que ainda não estão sincronizadas
  useEffect(() => {
    const run = async () => {
      if (!strategies || strategies.length === 0) return;
      
      // Avaliar sequencialmente para reduzir rate limit
      for (const s of strategies) {
        const evaluationKey = `${s.id}-${selectedMonth}`;
        if (!hasEvaluatedRef.current.has(evaluationKey)) {
          try {
            await evaluateStrategyPerformance(s);
            hasEvaluatedRef.current.add(evaluationKey);
            // pequena pausa para aliviar rate limit
            await new Promise(res => setTimeout(res, 400));
          } catch (e) {
            // segue para próxima
          }
        }
      }
      
      // Sincronizar orçamento apenas das não sincronizadas
      const toSync = strategies.filter(s => !s.isSynchronized);
      if (toSync.length > 0) {
        for (const s of toSync) {
          const syncKey = `${s.id}-${selectedMonth}`;
          if (!hasSyncedRef.current.has(syncKey)) {
            try {
              await syncStrategyBudgetFromMeta(s);
              hasSyncedRef.current.add(syncKey);
              await new Promise(res => setTimeout(res, 300));
            } catch {}
          }
        }
      }
    };
    run();
  }, [strategies, selectedClient, selectedMonth]);

  // Função para copiar texto
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => new Set([...prev, key]));
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => {
        setCopiedStates(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      toast.error('Erro ao copiar texto');
    }
  };

  // Função para formatar moeda
  const formatBRLFromDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  };

  const formatCurrencyNumber = (num: number | undefined): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0);
  };

  // Função para extrair dígitos
  const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Função para abrir modal
  const handleOpenModal = (strategy?: AdStrategy, productName?: string, productNiche?: string) => {
    if (strategy) {
      setCurrentStrategy(strategy);
      setEditingStrategy(strategy.id);
      setPlannedInput(formatCurrencyNumber(strategy.budget?.planned));
      setCurrentInput(formatCurrencyNumber(strategy.budget?.current));
    } else {
      setCurrentStrategy({
        product: {
          name: productName || '',
          niche: productNiche || '',
          type: 'online' as const,
          objective: 'trafico' as const
        },
        audience: {
          gender: 'ambos' as const,
          ageRange: '25-45',
          locations: []
        },
        budget: {
          planned: 0,
          current: 0
        },
        generatedNames: {
          product: '',
          audience: ''
        },
        isSynchronized: false
      });
      setEditingStrategy(null);
      setPlannedInput('R$ 0,00');
      setCurrentInput('R$ 0,00');
    }
    setIsModalOpen(true);
  };

  // Função para fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStrategy({
      product: {
        name: '',
        niche: '',
        type: 'online' as const,
        objective: 'trafico' as const
      },
      audience: {
        gender: 'ambos' as const,
        ageRange: '25-45',
        locations: []
      },
      budget: {
        planned: 0,
        current: 0
      },
      generatedNames: {
        product: '',
        audience: ''
      },
      isSynchronized: false
    });
    setEditingStrategy(null);
    setPlannedInput('R$ 0,00');
    setCurrentInput('R$ 0,00');
  };

  // Função para salvar estratégia
  const handleSaveStrategy = async () => {
    if (!currentStrategy.product?.name || !currentStrategy.product?.niche) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (currentStrategy.audience?.locations.length === 0) {
      toast.error('Por favor, adicione pelo menos uma localização');
      return;
    }

    if (!currentStrategy.budget || (currentStrategy.budget.planned ?? 0) <= 0) {
      toast.error('Por favor, informe um valor pretendido válido');
      return;
    }

    try {
      const strategyToSave: AdStrategy = {
        id: editingStrategy || Date.now().toString(),
        product: currentStrategy.product!,
        audience: currentStrategy.audience!,
        budget: currentStrategy.budget!,
        generatedNames: currentStrategy.generatedNames!,
        client: selectedClient,
        month: selectedMonth,
        createdAt: editingStrategy ? strategies.find(s => s.id === editingStrategy)?.createdAt || new Date() : new Date(),
        isSynchronized: currentStrategy.isSynchronized || false
      };

      if (editingStrategy) {
        adStrategyService.updateStrategy(strategyToSave);
        setStrategies(prev => prev.map(s => s.id === editingStrategy ? strategyToSave : s));
        toast.success('Estratégia atualizada com sucesso!');
      } else {
        adStrategyService.saveStrategy(strategyToSave);
        setStrategies(prev => [...prev, strategyToSave]);
        onStrategyCreated(strategyToSave);
        toast.success('Estratégia criada com sucesso!');
      }

      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao salvar estratégia');
    }
  };

  // Função para deletar estratégia
  const handleDeleteStrategy = (strategyId: string) => {
    adStrategyService.removeStrategy(strategyId);
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
    toast.success('Estratégia removida com sucesso!');
  };

  // Função para adicionar localização
  const handleAddLocation = () => {
    if (locationInput.trim() && !currentStrategy.audience?.locations.includes(locationInput.trim())) {
      setCurrentStrategy(prev => ({
        ...prev,
        audience: {
          ...prev.audience!,
          locations: [...(prev.audience?.locations || []), locationInput.trim()]
        }
      }));
      setLocationInput('');
    }
  };

  // Função para remover localização
  const handleRemoveLocation = (location: string) => {
    setCurrentStrategy(prev => ({
      ...prev,
      audience: {
        ...prev.audience!,
        locations: prev.audience?.locations.filter(l => l !== location) || []
      }
    }));
  };

  // Função para gerar nomes
  const generateNames = () => {
    if (!currentStrategy.product?.name || !currentStrategy.product?.niche || !currentStrategy.product?.objective) return;

    const productName = `[${currentStrategy.product.name} ${currentStrategy.product.type === 'fisico' ? 'presencial' : 'online'}] [${currentStrategy.product.niche}] [${currentStrategy.product.objective === 'trafico' ? 'tráfego' : currentStrategy.product.objective === 'mensagens' ? 'mensagens' : 'compras'}]`;
    
    const audienceName = `[${currentStrategy.audience?.gender === 'homem' ? 'homens' : currentStrategy.audience?.gender === 'mulher' ? 'mulheres' : 'ambos'}] [${currentStrategy.audience?.ageRange}] [${currentStrategy.audience?.locations.join(', ')}]`;

    setCurrentStrategy(prev => ({
      ...prev,
      generatedNames: {
        product: productName,
        audience: audienceName
      }
    }));
  };

  // Gerar nomes quando dados mudam
  useEffect(() => {
    generateNames();
  }, [currentStrategy.product, currentStrategy.audience]);

  // Utilidades
  const getMonthDateRange = (monthLabel: string): { startDate: string; endDate: string } => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [name, yearStr] = monthLabel.split(' ');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const monthIndex = Math.max(0, months.indexOf(name));
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  const normalizeName = (value: string): string =>
    (value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  const namesExactlyMatch = (adSetName: string, strategyAudienceName: string): boolean => {
    return normalizeName(adSetName) === normalizeName(strategyAudienceName);
  };

  // Sincronizar orçamento de UMA estratégia pela correspondência exata do nome do Ad Set
  const syncStrategyBudgetFromMeta = async (strategy: AdStrategy) => {
    if (!strategy?.generatedNames?.audience) return;
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      // Buscar Ad Sets da conta no período
      const adSets = await metaAdsService.getAdSets();

      const wanted = strategy.generatedNames.audience;
      const matching = (adSets || []).filter((ad: any) => namesExactlyMatch(ad.name, wanted));

      let totalSpend = 0;
      if (matching.length > 0) {
        const allInsights = await Promise.all(
          matching.map((ad: any) => metaAdsService.getAdSetInsights(ad.id, startDate, endDate))
        );
        totalSpend = allInsights.flat().reduce((sum: number, insight: any) => sum + parseFloat(insight.spend || '0'), 0);
      }

      // Atualizar apenas para o período atual, não persistir no strategy
      const updated: AdStrategy = {
        ...strategy,
        budget: { ...strategy.budget, current: totalSpend },
        isSynchronized: matching.length > 0
      };

      // Atualizar apenas na UI, não persistir
      setStrategies(prev => prev.map(s => (s.id === strategy.id ? updated : s)));

      // Se a estratégia aberta no modal for a mesma, refletir também
      if (editingStrategy === strategy.id) {
      setCurrentStrategy(prev => ({
        ...prev,
          budget: { ...(prev.budget as any), current: totalSpend },
          isSynchronized: matching.length > 0
        }));
      }
    } catch (error) {
      console.error('Erro ao sincronizar orçamento da estratégia:', error);
    }
  };

  // Avaliar performance de uma estratégia e recomendar escala
  const evaluateStrategyPerformance = async (strategy: AdStrategy) => {
    try {
      const { startDate, endDate } = getMonthDateRange(selectedMonth);
      const adSets = await metaAdsService.getAdSets();
      const wanted = strategy.generatedNames.audience;
      const matching = (adSets || []).filter((ad: any) => namesExactlyMatch(ad.name, wanted));

      // Buscar insights agregados (sem time_increment) para o período
      let totals = { spend: 0, leads: 0, sales: 0, clicks: 0, impressions: 0, cprSamples: [] as number[], cplSamples: [] as number[] };
      
      if (matching.length > 0) {
        const allInsights = await Promise.all(
          matching.map((ad: any) => metaAdsService.getAdSetInsights(ad.id, startDate, endDate))
        );
        const insightsFlat = allInsights.flat().filter((i: any) => parseFloat(i.spend || '0') > 0);
        const metricData = insightsFlat.length > 0
          ? metaAdsService.convertToMetricData(insightsFlat, selectedMonth, selectedClient, strategy.product.name, strategy.generatedNames.audience)
          : [];

        totals = (metricData || []).reduce(
          (acc: any, m: any) => {
            acc.spend += m.investment || 0;
            acc.leads += m.leads || 0;
            acc.sales += m.sales || 0;
            acc.clicks += m.clicks || 0;
            acc.impressions += m.impressions || 0;
            acc.cprSamples.push(m.cpr || 0);
            acc.cplSamples.push(m.cpl || 0);
            return acc;
          },
          { spend: 0, leads: 0, sales: 0, clicks: 0, impressions: 0, cprSamples: [] as number[], cplSamples: [] as number[] }
        );
      }

      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      // Cálculos estritos por totais do período
      const cpr = totals.sales > 0 ? totals.spend / totals.sales : 0;     // Compras
      const cplStrict = totals.leads > 0 ? totals.spend / totals.leads : 0; // Mensagens/Leads
      const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;     // Tráfego

      let rec: { type: 'vertical' | 'horizontal' | 'wait'; tooltip: string } = { type: 'wait', tooltip: 'Aguardando mais dados' };

      const objective = strategy.product.objective; // trafico | mensagens | compras
      const spentEnough = totals.spend >= 50;

      if (objective === 'mensagens' || objective === 'trafico') {
        const clicksEnough = totals.clicks >= 100;
        const perfValue = objective === 'mensagens' ? cplStrict : cpc;
        const goodCPL = perfValue > 0 && perfValue <= (objective === 'mensagens' ? 15 : 1.2);
        const okCPL = perfValue > 0 && perfValue <= (objective === 'mensagens' ? 25 : 2.5);
        if (spentEnough && clicksEnough && goodCPL && ctr >= 1.5) {
          rec = { type: 'vertical', tooltip: `Desempenho forte para ${objective === 'mensagens' ? 'Mensagens' : 'Tráfego'}: CTR ${ctr.toFixed(2)}%, ${objective === 'mensagens' ? 'CPL' : 'CPC'} ${formatCurrencyNumber(perfValue)}. Aumente orçamento gradualmente.` };
        } else if (spentEnough && okCPL && ctr >= 1.0) {
          rec = { type: 'horizontal', tooltip: `Bom desempenho: CTR ${ctr.toFixed(2)}%, ${objective === 'mensagens' ? 'CPL' : 'CPC'} ${formatCurrencyNumber(perfValue)}. Teste novos públicos/variações (escala horizontal).` };
        } else {
          rec = { type: 'wait', tooltip: `Aguardando mais dados: gasto ${formatCurrencyNumber(totals.spend)}, cliques ${totals.clicks}, CTR ${ctr.toFixed(2)}%.` };
        }
      } else if (objective === 'compras') {
        const salesEnough = totals.sales >= 3;
        if (spentEnough && salesEnough && cpr > 0 && cpr <= 30) {
          rec = { type: 'vertical', tooltip: `Compras consistentes: CPR ${formatCurrencyNumber(cpr)} com ${totals.sales} vendas. Escale orçamento (vertical).` };
        } else if (spentEnough && cpr > 0 && cpr <= 50) {
          rec = { type: 'horizontal', tooltip: `Algumas compras: CPR ${formatCurrencyNumber(cpr)}. Expandir públicos/variações (horizontal).` };
        } else {
          rec = { type: 'wait', tooltip: `Pouca sinalização de compras ou CPR alto (${formatCurrencyNumber(cpr)}). Acompanhe antes de escalar.` };
        }
      }

      setRecommendations(prev => ({
        ...prev,
        [strategy.id]: {
          ...rec,
          stats: {
            spend: totals.spend,
            ctr,
            cpl: objective === 'mensagens' ? cplStrict : cpc,
            cpr,
            clicks: totals.clicks,
            impressions: totals.impressions,
            leads: totals.leads,
            sales: totals.sales,
            objective,
            adSetsCount: matching.length,
            periodStart: startDate,
            periodEnd: endDate
          }
        }
      }));

      // Atualizar o budget.current apenas para o período atual (não persistir)
      if (matching.length > 0) {
        setStrategies(prev => prev.map(s => 
          s.id === strategy.id 
            ? { ...s, budget: { ...s.budget, current: totals.spend }, isSynchronized: true }
            : s
        ));
      }
    } catch (error) {
      console.error('Erro ao avaliar performance da estratégia:', error);
      // Não sobreescrever tooltip com erro; manter último sucesso ou estado "aguardando dados"
      setRecommendations(prev => ({
        ...prev,
        [strategy.id]: prev[strategy.id] || {
          type: 'wait',
          tooltip: 'Aguardando dados do período',
          stats: {
            spend: 0, ctr: 0, cpl: 0, cpr: 0, clicks: 0, impressions: 0, leads: 0, sales: 0, objective: strategy.product.objective, adSetsCount: 0, periodStart: '', periodEnd: ''
          }
        }
      }));
    }
  };

  // Agrupar estratégias por produto, exibindo apenas se tiver gasto no período OU se foi criada no período selecionado
  const strategiesByProduct = ((): Record<string, { name: string; niche: string; strategies: AdStrategy[] }> => {
    // Filtrar por visibilidade inteligente
    const filtered = strategies.filter((s) => {
      const rec = recommendations[s.id];
      const hasSpendInPeriod = rec?.stats?.spend >= 0.01;
      const hasAdSetsInPeriod = rec?.stats?.adSetsCount > 0;
      const createdThisMonth = s.month === selectedMonth;
      
      // Só aparece se: tem gasto no período E tem ad sets OU foi criada neste período
      return (hasSpendInPeriod && hasAdSetsInPeriod) || createdThisMonth;
    });
    
    return filtered.reduce((acc, strategy) => {
    const productKey = `${strategy.product.name}-${strategy.product.niche}`;
    if (!acc[productKey]) {
      acc[productKey] = {
        name: strategy.product.name,
        niche: strategy.product.niche,
        strategies: []
      };
    }
    acc[productKey].strategies.push(strategy);
    return acc;
  }, {} as Record<string, { name: string; niche: string; strategies: AdStrategy[] }>);
  })();

  // Função para obter o budget atual do período específico
  const getCurrentPeriodBudget = (strategy: AdStrategy): number => {
    const rec = recommendations[strategy.id];
    return rec?.stats?.spend || 0;
  };

  // Função para obter se está sincronizado no período atual
  const getCurrentPeriodSyncStatus = (strategy: AdStrategy): boolean => {
    const rec = recommendations[strategy.id];
    return rec?.stats?.adSetsCount > 0 || false;
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            </div>
            <div className="flex flex-col justify-center h-11">
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">Estratégias de Anúncio</h3>
              <p className="text-slate-400 text-sm mt-1 leading-tight">Cliente: <span className="text-slate-200 font-semibold">{selectedClient}</span></p>
            </div>
          </div>
          
                      <button
              onClick={() => handleOpenModal()}
              className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] h-11"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Novo Produto</span>
            </button>
        </div>

        {/* Lista de estratégias agrupadas por produto */}
        <div className="space-y-6">
          {Object.entries(strategiesByProduct)
            .filter(([, productData]) => productData.strategies.length > 0)
            .map(([productKey, productData]) => (
            <motion.div
              key={productKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 border border-slate-700/50 rounded-2xl shadow-md overflow-hidden"
            >
              {/* Header do produto */}
              <div 
                className="flex items-center justify-between p-6 cursor-pointer"
                onClick={() => {
                  const newCollapsed = new Set(collapsedProducts);
                  if (newCollapsed.has(productKey)) {
                    newCollapsed.delete(productKey);
                  } else {
                    newCollapsed.add(productKey);
                  }
                  setCollapsedProducts(newCollapsed);
                }}
              >
                <div className="flex items-center gap-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-200">{productData.name}</h4>
                    <p className="text-sm text-slate-400">{productData.niche}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: collapsedProducts.has(productKey) ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>

              {/* Estratégias do produto */}
              <AnimatePresence>
                {!collapsedProducts.has(productKey) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ 
                      height: { duration: 0.15, ease: "easeInOut" },
                      opacity: { duration: 0.1, ease: "easeInOut" }
                    }}
                    className="border-t border-slate-700/50 overflow-hidden"
                  >
                    <div className="p-6 space-y-3">
                      {productData.strategies
                        .map((strategy) => (
                        <motion.div
                          key={strategy.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-500/50 group"
                        >
                          <div className="flex items-start justify-between mb-4">
                                                          <div className="flex-1 relative">
                                {/* Botões de ação no canto superior direito */}
                                <div className="absolute -top-3 -right-3 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-600/40 rounded-xl px-2.5 py-1.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-100">
                                  <button
                                    onClick={() => handleOpenModal(strategy)}
                                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-all duration-200 hover:scale-110"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="w-px h-4 bg-slate-600/40"></div>
                                  <button
                                    onClick={() => handleDeleteStrategy(strategy.id)}
                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/30 rounded-lg transition-all duration-200 hover:scale-110"
                                  >
                                    ×
                                  </button>
                                </div>
                              {/* Nomenclaturas */}
                              <div className="space-y-3 mb-4">
                                <div>
                                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide block mb-2">Produto</span>
                                  <div className="relative">
                                    <div 
                                      onClick={() => copyToClipboard(strategy.generatedNames.product, `product-${strategy.id}`)}
                                      className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30 cursor-pointer hover:border-slate-500/50 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-800/60 transition-all duration-200 group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm text-blue-300 font-medium leading-relaxed flex-1">{strategy.generatedNames.product}</p>
                                        <Copy className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
                                      </div>
                                    </div>
                                    <AnimatePresence>
                                      {copiedStates.has(`product-${strategy.id}`) && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                          className="absolute top-1 right-12 bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400/30 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl z-20 backdrop-blur-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            <span>Copiado para a área de transferência</span>
                                          </div>
                                          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-emerald-500"></div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide block mb-2">Público</span>
                                  <div className="relative">
                                    <div 
                                      onClick={() => copyToClipboard(strategy.generatedNames.audience, `audience-${strategy.id}`)}
                                      className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30 cursor-pointer hover:border-slate-500/50 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-800/60 transition-all duration-200 group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 group/audience">
                                          {/* Badge do estado de escala - tooltip somente sobre o container do público */}
                                          {(() => {
                                            const rec = recommendations[strategy.id];
                                            const base = 'relative inline-flex items-center justify-center w-6 h-6 rounded-md border';
                                            const card = (content: string, color: string) => (
                                              <div className="tooltip-audience fixed z-[999999] hidden">
                                                <div className={`min-w-[260px] max-w-[320px] text-xs rounded-lg shadow-xl border ${color}`}>
                                                  <div className="p-3 bg-slate-900 rounded-lg border-slate-600/40">
                                                    <div className="text-slate-200 font-semibold mb-1">Sugestão para este público</div>
                                                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">{content}</div>
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                            const stats = rec?.stats;
                                            const objectiveLabel = stats?.objective === 'trafico' ? 'Tráfego' : stats?.objective === 'mensagens' ? 'Mensagens' : 'Compras';
                                            const summary = stats
                                              ? `Gasto no período (${stats.periodStart} → ${stats.periodEnd}): ${formatCurrencyNumber(stats.spend)}\nCTR: ${stats.ctr.toFixed(2)}% • Cliques: ${stats.clicks} • Impressões: ${stats.impressions}\n${stats.objective === 'compras' ? 'CPR' : (stats.objective === 'mensagens' ? 'CPL' : 'CPC')}: ${formatCurrencyNumber(stats.cpl)}\n${stats.objective === 'compras' ? `Vendas: ${stats.sales}` : `Leads: ${stats.leads}`}\nAd Sets vinculados (match exato por nome): ${stats.adSetsCount}\nDecisão baseada no objetivo: ${objectiveLabel}.`
                                              : 'Coletando dados deste período...';
                                            if (rec?.type === 'vertical') {
                                              return (
                                                <span 
                                                  className={`${base} bg-emerald-600/15 border-emerald-500/40`}
                                                  onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const tooltip = e.currentTarget.querySelector('.tooltip-audience') as HTMLElement;
                                                    if (tooltip) {
                                                      tooltip.style.left = `${rect.right + 10}px`;
                                                      tooltip.style.top = `${rect.top - 30}px`;
                                                      tooltip.style.display = 'block';
                                                    }
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    const tooltip = e.currentTarget.querySelector('.tooltip-audience') as HTMLElement;
                                                    if (tooltip) {
                                                      tooltip.style.display = 'none';
                                                    }
                                                  }}
                                                >
                                                  <TrendingUp className="w-3.5 h-3.5 text-emerald-300" />
                                                  {card(`Escalar orçamento (vertical).\n${rec.tooltip}\n\n${summary}`, 'border-emerald-500/40')}
                                                </span>
                                              );
                                            }
                                            if (rec?.type === 'horizontal') {
                                              return (
                                                <span 
                                                  className={`${base} bg-blue-600/15 border-blue-500/40`}
                                                  onMouseEnter={(e) => {
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    const tooltip = e.currentTarget.querySelector('.tooltip-audience') as HTMLElement;
                                                    if (tooltip) {
                                                      tooltip.style.left = `${rect.right + 10}px`;
                                                      tooltip.style.top = `${rect.top - 30}px`;
                                                      tooltip.style.display = 'block';
                                                    }
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    const tooltip = e.currentTarget.querySelector('.tooltip-audience') as HTMLElement;
                                                    if (tooltip) {
                                                      tooltip.style.display = 'none';
                                                    }
                                                  }}
                                                >
                                                  <GitBranch className="w-3.5 h-3.5 text-blue-300" />
                                                  {card(`Expandir públicos/variações (horizontal).\n${rec.tooltip}\n\n${summary}`, 'border-blue-500/40')}
                                                </span>
                                              );
                                            }
                                            return (
                                              <span 
                                                className={`${base} bg-slate-600/15 border-slate-500/40`}
                                                onMouseEnter={(e) => {
                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                  const tooltip = e.currentTarget.querySelector('.tooltip-audience') as HTMLElement;
                                                  if (tooltip) {
                                                    tooltip.style.left = `${rect.right + 10}px`;
                                                    tooltip.style.top = `${rect.top - 30}px`;
                                                    tooltip.style.display = 'block';
                                                  }
                                                }}
                                                onMouseLeave={(e) => {
                                                  const tooltip = e.currentTarget.querySelector('.tooltip-audience') as HTMLElement;
                                                  if (tooltip) {
                                                    tooltip.style.display = 'none';
                                                  }
                                                }}
                                              >
                                                <Clock className="w-3.5 h-3.5 text-slate-300" />
                                                {card(`${rec?.tooltip || 'Aguardando otimização/mais dados.'}\n\n${summary}`, 'border-slate-500/40')}
                                              </span>
                                            );
                                          })()}
                                          <p className="text-sm text-yellow-300 font-medium leading-relaxed">{strategy.generatedNames.audience}</p>
                                        </div>
                                        <Copy className="w-3 h-3 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                                      </div>
                                    </div>
                                    <AnimatePresence>
                                      {copiedStates.has(`audience-${strategy.id}`) && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                          className="absolute top-1 right-12 bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400/30 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl z-20 backdrop-blur-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            <span>Copiado para a área de transferência</span>
                                          </div>
                                          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-emerald-500"></div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>

                              {/* Barra de progresso do orçamento */}
                              <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">ORÇAMENTO</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-300 font-medium">R$ {getCurrentPeriodBudget(strategy).toFixed(2).replace('.', ',')} / R$ {strategy.budget.planned.toFixed(2).replace('.', ',')}</span>
                                    <div className="flex items-center gap-1 relative group/sync">
                                      <div 
                                        className={`w-2 h-2 rounded-full ${getCurrentPeriodSyncStatus(strategy) ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse'} cursor-help`}
                                        onMouseEnter={(e) => {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const tooltip = e.currentTarget.parentElement?.querySelector('.tooltip-sync') as HTMLElement;
                                          if (tooltip) {
                                            tooltip.style.left = `${rect.left - 260}px`;
                                            tooltip.style.top = `${rect.top - 30}px`;
                                            tooltip.style.display = 'block';
                                          }
                                        }}
                                        onMouseLeave={(e) => {
                                          const tooltip = e.currentTarget.parentElement?.querySelector('.tooltip-sync') as HTMLElement;
                                          if (tooltip) {
                                            tooltip.style.display = 'none';
                                          }
                                        }}
                                      />
                                      {/* Tooltip elegante */}
                                      <div className="tooltip-sync fixed z-[999999] hidden">
                                        <div className="min-w-[200px] max-w-[250px] text-xs rounded-lg shadow-xl border border-slate-600/40">
                                          <div className="p-3 bg-slate-900 rounded-lg border-slate-600/40">
                                            <div className="text-slate-200 font-semibold mb-1 flex items-center gap-2">
                                              {getCurrentPeriodSyncStatus(strategy) ? (
                                                <>
                                                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                  <span>Sincronizado</span>
                                                </>
                                              ) : (
                                                <>
                                                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                  <span>Não sincronizado</span>
                                                </>
                                              )}
                                            </div>
                                            <div className="text-slate-300 leading-relaxed">
                                              {getCurrentPeriodSyncStatus(strategy) 
                                                ? 'Orçamento atualizado automaticamente com base no gasto real do conjunto de anúncios.'
                                                : 'Para sincronizar, é necessário que exista um conjunto de anúncios no Meta Ads com o nome exatamente igual à nomenclatura do público.'
                                              }
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-600/50 rounded-full h-2.5 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                                    style={{ width: `${Math.min((getCurrentPeriodBudget(strategy) / strategy.budget.planned) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>


                          </div>
                        </motion.div>
                      ))}

                      {/* Botão para adicionar estratégia ao produto */}
                      <motion.button
                        onClick={() => handleOpenModal(undefined, productData.name, productData.niche)}
                        className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-indigo-500/30 border border-blue-500/40 hover:border-blue-400/60 px-6 py-3 text-blue-200 hover:text-blue-100 transition-all duration-300 shadow-lg hover:shadow-xl w-full"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Adicionar Estratégia</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50 flex-shrink-0">
                  <h2 className="text-xl font-bold text-slate-200">
                    {editingStrategy ? 'Editar Estratégia' : 'Nova Estratégia'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-200 transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* Produto */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Definição do Produto</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Produto</label>
                          <input
                            type="text"
                            value={currentStrategy.product?.name || ''}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, name: e.target.value }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Aulas de Pilates"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nicho</label>
                          <input
                            type="text"
                            value={currentStrategy.product?.niche || ''}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, niche: e.target.value }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Pilates"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
                          <select
                            value={currentStrategy.product?.type || 'online'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, type: e.target.value as 'online' | 'fisico' }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="online">Produto Online</option>
                            <option value="fisico">Produto Físico</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Objetivo</label>
                          <select
                            value={currentStrategy.product?.objective || 'trafico'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, objective: e.target.value as 'trafico' | 'mensagens' | 'compras' }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="trafico">Tráfego no Site</option>
                            <option value="mensagens">Conversão em Mensagens</option>
                            <option value="compras">Conversões de Compras</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Público */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Definição do Público</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Público Alvo</label>
                          <select
                            value={currentStrategy.audience?.gender || 'ambos'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              audience: { ...prev.audience!, gender: e.target.value as 'homem' | 'mulher' | 'ambos' }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="ambos">Ambos</option>
                            <option value="homem">Homem</option>
                            <option value="mulher">Mulher</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Faixa Etária</label>
                          <select
                            value={currentStrategy.audience?.ageRange || '25-45'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              audience: { ...prev.audience!, ageRange: e.target.value }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="18-25">18-25 anos</option>
                            <option value="25-35">25-35 anos</option>
                            <option value="35-45">35-45 anos</option>
                            <option value="45-65">45-65 anos</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Localização</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                            className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Digite uma localização e pressione Enter"
                          />
                          <button
                            onClick={handleAddLocation}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Adicionar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentStrategy.audience?.locations.map((location, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-600/30 text-blue-200"
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              {location}
                              <button
                                onClick={() => handleRemoveLocation(location)}
                                className="ml-2 text-blue-300 hover:text-white transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Orçamento */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Orçamento</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Valor Pretendido</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={plannedInput}
                              onChange={(e) => {
                                const digits = extractDigits(e.target.value);
                                setCurrentStrategy(prev => ({
                                  ...prev,
                                  budget: { ...prev.budget!, planned: parseInt(digits) / 100 }
                                }));
                                setPlannedInput(formatBRLFromDigits(digits));
                              }}
                              className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="R$ 0,00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Valor Atual</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={currentInput}
                              onChange={(e) => {
                                if (!currentStrategy.isSynchronized) {
                                  const digits = extractDigits(e.target.value);
                                  setCurrentStrategy(prev => ({
                                    ...prev,
                                    budget: { ...prev.budget!, current: parseInt(digits) / 100 }
                                  }));
                                  setCurrentInput(formatBRLFromDigits(digits));
                                }
                              }}
                              readOnly={currentStrategy.isSynchronized}
                              className={`w-full bg-slate-700/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${currentStrategy.isSynchronized ? 'opacity-50 cursor-not-allowed' : ''}`}
                              placeholder="R$ 0,00"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nomes Gerados */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Nomes Gerados</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nomenclatura do Produto</label>
                          <div className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-blue-400 font-medium">{currentStrategy.generatedNames?.product || 'Preencha os dados do produto'}</p>
                              <button
                                onClick={() => copyToClipboard(currentStrategy.generatedNames?.product || '', 'modal-product')}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <motion.div
                                  animate={copiedStates.has('modal-product') ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Copy className="w-4 h-4" />
                                </motion.div>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nomenclatura do Público</label>
                          <div className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-yellow-400 font-medium">{currentStrategy.generatedNames?.audience || 'Preencha os dados do público'}</p>
                              <button
                                onClick={() => copyToClipboard(currentStrategy.generatedNames?.audience || '', 'modal-audience')}
                                className="text-yellow-400 hover:text-yellow-300 transition-colors"
                              >
                                <motion.div
                                  animate={copiedStates.has('modal-audience') ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Copy className="w-4 h-4" />
                                </motion.div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-slate-700/50 flex-shrink-0">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveStrategy}
                    className="group relative inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>{editingStrategy ? 'Atualizar' : 'Criar'} Estratégia</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdStrategySection;
