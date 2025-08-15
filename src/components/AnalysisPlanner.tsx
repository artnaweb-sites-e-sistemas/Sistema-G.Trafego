import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { CalendarDays, Clock, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { metricsService, type MetricData } from '../services/metricsService';
import { analysisPlannerService } from '../services/analysisPlannerService';
import dayjs from 'dayjs';

interface AnalysisPlannerProps {
  selectedClient?: string;
  selectedMonth?: string;
  selectedProduct: string;
  selectedAudience?: string;
}

type PlannerStorage = {
  lastAnalysisDate?: string; // YYYY-MM-DD
  intervalDays?: number;
};

const DEFAULT_INTERVAL = 7;

// 🎯 CORREÇÃO: Usar dayjs para evitar problemas de fuso horário
function formatDateBR(date: Date) {
  return dayjs(date).format('DD/MM/YYYY');
}

// 🎯 CORREÇÃO: Usar dayjs para consistência com PendingAudiencesStatus
function addDays(base: Date, days: number) {
  return dayjs(base).add(days, 'day').toDate();
}

function getStorageKey(client: string, product: string, audience?: string) {
  const parts = [client || 'sem-cliente', product || 'sem-produto', audience || 'sem-publico'];
  return `analysisPlanner_${parts.join('|').toLowerCase().replace(/\s+/g, '_')}`;
}

function safeParseDate(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

// Heurística simples de recomendação de intervalo baseada na variação de métricas recentes
function recommendIntervalFromMetrics(metrics: MetricData[]): { days: number; reason: string } {
  if (!metrics || metrics.length === 0) {
    return { days: DEFAULT_INTERVAL, reason: 'Sem dados recentes — manter revisão semanal.' };
  }

  // Ordenar por data (asc)
  const ordered = [...metrics].sort((a, b) => a.date.localeCompare(b.date));

  // Utilidades
  const parseNum = (v: any) => (typeof v === 'number' ? v : Number(v || 0)) || 0;

  // Quebrar em janelas: últimos 7 dias e 7 dias anteriores (se possível)
  const last7 = ordered.slice(-7);
  const prev7 = ordered.slice(-14, -7);

  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

  const ctr = (data: MetricData[]) => {
    const clicks = sum(data.map(d => parseNum(d.clicks)));
    const impressions = sum(data.map(d => parseNum(d.impressions)));
    return impressions > 0 ? (clicks / impressions) * 100 : 0;
  };

  const spend = (data: MetricData[]) => sum(data.map(d => parseNum(d.investment)));
  const leads = (data: MetricData[]) => sum(data.map(d => parseNum(d.leads)));
  const sales = (data: MetricData[]) => sum(data.map(d => parseNum(d.sales)));

  // CPR aproximado: preferir cpr, senão usar custo/leads (ou custo/sales se existir)
  const cprApprox = (data: MetricData[]) => {
    const withCpr = data.map(d => parseNum((d as any).cpr)).filter(v => v > 0);
    if (withCpr.length > 0) return sum(withCpr) / withCpr.length;
    const totalSpend = spend(data);
    const totalLeads = leads(data);
    const totalSales = sales(data);
    if (totalSales > 0) return totalSpend / totalSales;
    if (totalLeads > 0) return totalSpend / totalLeads;
    return 0;
  };

  const lastCtr = ctr(last7);
  const prevCtr = prev7.length ? ctr(prev7) : lastCtr;
  const lastCpr = cprApprox(last7);
  const prevCpr = prev7.length ? cprApprox(prev7) : lastCpr;

  const ctrChange = prevCtr === 0 ? 0 : ((lastCtr - prevCtr) / prevCtr) * 100;
  const cprChange = prevCpr === 0 ? 0 : ((lastCpr - prevCpr) / prevCpr) * 100;

  // Heurística:
  // - Se CPR subiu > 15% ou CTR caiu > 10% -> revisar em 2-3 dias
  // - Se pequenas variações (|CPR| > 5% ou |CTR| > 5%) -> revisar em 4-5 dias
  // - Caso estável -> 7 dias
  if (cprChange > 15 || ctrChange < -10) {
    return { days: 3, reason: 'Oscilação relevante (CPR↑ ou CTR↓). Recomendado acompanhamento mais próximo.' };
  }
  if (Math.abs(cprChange) > 5 || Math.abs(ctrChange) > 5) {
    return { days: 5, reason: 'Variação moderada nas métricas. Recomendado acompanhamento quinzenal curto.' };
  }
  return { days: 7, reason: 'Métricas estáveis. Revisão semanal é suficiente.' };
}

const AnalysisPlanner: React.FC<AnalysisPlannerProps> = ({ selectedClient = '', selectedMonth = '', selectedProduct, selectedAudience = '' }) => {
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string>('');
  const [intervalDays, setIntervalDays] = useState<number>(DEFAULT_INTERVAL);
  const [loadingSuggestion, setLoadingSuggestion] = useState<boolean>(false);
  const [suggested, setSuggested] = useState<{ days: number; reason: string } | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Debug das props recebidas e estados
  useEffect(() => {
    console.log('🔍 AnalysisPlanner - Props recebidas:', {
      selectedClient,
      selectedMonth,
      selectedProduct,
      selectedAudience
    });
  }, [selectedClient, selectedMonth, selectedProduct, selectedAudience]);

  const storageKey = useMemo(() => getStorageKey(selectedClient, selectedProduct, selectedAudience), [selectedClient, selectedProduct, selectedAudience]);

  // Carregar preferências
  useEffect(() => {
    // Reset hydrated state when dependencies change
    setHydrated(false);
    
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: PlannerStorage = JSON.parse(raw);
        if (saved.lastAnalysisDate) setLastAnalysisDate(saved.lastAnalysisDate);
        if (typeof saved.intervalDays === 'number') setIntervalDays(saved.intervalDays);
      }
      
      // Carregar do Firestore (sobrepõe localStorage se existir)
      (async () => {
        try {
          console.log('🔄 Carregando dados do planejador...', { selectedClient, selectedProduct, selectedAudience });
          
          // 1ª tentativa: registro específico do público
          let record = await analysisPlannerService.getPlanner(selectedClient, selectedProduct, selectedAudience);
          // Fallback 1: nível do produto
          if (!record && selectedAudience) {
            record = await analysisPlannerService.getPlanner(selectedClient, selectedProduct, undefined);
          }
          // Fallback 2: procurar por adSetId atual entre todos os planners do produto
          if (!record) {
            try {
              const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
              if (adSetId) {
                const all = await analysisPlannerService.listPlannersForProduct(selectedClient, selectedProduct);
                const byAdSet = all.find(p => p.adSetId === adSetId);
                if (byAdSet) record = byAdSet;
              }
            } catch {}
          }
          // Fallback 3: comparar por nome normalizado do público
          if (!record && selectedAudience) {
            try {
              const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
              const all = await analysisPlannerService.listPlannersForProduct(selectedClient, selectedProduct);
              const byName = all.find(p => norm(p.audience || '') === norm(selectedAudience));
              if (byName) record = byName;
            } catch {}
          }
          
          if (record) {
            console.log('✅ Dados carregados do Firestore:', record);
            if (record.lastAnalysisDate) setLastAnalysisDate(record.lastAnalysisDate);
            if (typeof record.intervalDays === 'number') setIntervalDays(record.intervalDays);
            // Se tinha adSetId no registro mas não está no localStorage, propaga
            try { if (record.adSetId && !localStorage.getItem('selectedAdSetId')) localStorage.setItem('selectedAdSetId', record.adSetId); } catch {}
          } else {
            console.log('ℹ️ Nenhum dado encontrado no Firestore para este contexto');
          }
        } catch (error) {
          console.error('❌ Erro ao carregar dados do Firestore:', error);
        } finally {
          setHydrated(true);
        }
      })();
    } catch (error) {
      console.error('❌ Erro ao carregar preferências:', error);
      setHydrated(true);
    }
  }, [storageKey, selectedClient, selectedProduct, selectedAudience]);

  // Salvar preferências
  useEffect(() => {
    if (!hydrated) return; // evita sobrescrever com valores vazios antes do carregamento
    try {
      const payload: PlannerStorage = { lastAnalysisDate, intervalDays };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
      console.debug('🧭 Planner|autosave ->', { client: selectedClient, product: selectedProduct, audience: selectedAudience, payload, adSetId });
      analysisPlannerService.savePlanner(selectedClient, selectedProduct, selectedAudience, { ...payload, adSetId }).catch(() => {});
    } catch {}
  }, [storageKey, lastAnalysisDate, intervalDays, hydrated]);

  // Buscar métricas para sugerir intervalo
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingSuggestion(true);
      try {
        const month = selectedMonth || localStorage.getItem('selectedMonth') || '';
        const client = selectedClient || localStorage.getItem('currentSelectedClient') || 'Todos os Clientes';
        const product = selectedProduct || localStorage.getItem('currentSelectedProduct') || 'Todos os Produtos';
        const audience = selectedAudience || localStorage.getItem('currentSelectedAudience') || 'Todos os Públicos';
        const data = await metricsService.getMetrics(month, client, product, audience);
        if (!cancelled) {
          setSuggested(recommendIntervalFromMetrics(data));
        }
      } catch {
        if (!cancelled) setSuggested({ days: DEFAULT_INTERVAL, reason: 'Falha ao carregar métricas — manter revisão semanal.' });
      } finally {
        if (!cancelled) setLoadingSuggestion(false);
      }
    };
    // Só sugerir quando houver cliente e produto definidos
    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedProduct && selectedProduct !== 'Todos os Produtos') {
      load();
    } else {
      setSuggested({ days: DEFAULT_INTERVAL, reason: 'Defina cliente e produto para recomendações mais precisas.' });
    }
    return () => { cancelled = true; };
  }, [selectedClient, selectedMonth, selectedProduct, selectedAudience]);

  const lastDateObj = useMemo(() => safeParseDate(lastAnalysisDate), [lastAnalysisDate, forceUpdate]);
  const nextDate = useMemo(() => {
    if (!lastDateObj) return null;
    const calculatedNextDate = addDays(lastDateObj, Math.max(1, intervalDays || DEFAULT_INTERVAL));
    
    // 🎯 DEBUG: Log para sincronização de datas
    console.log('🗓️ SYNC DEBUG - AnalysisPlanner nextDate calculation:', {
      lastAnalysisDate: lastAnalysisDate,
      lastDateObj: lastDateObj.toISOString(),
      intervalDays: intervalDays,
      calculatedNextDate: calculatedNextDate.toISOString(),
      formattedNextDate: formatDateBR(calculatedNextDate),
      forceUpdate: forceUpdate
    });
    
    return calculatedNextDate;
  }, [lastDateObj, intervalDays, forceUpdate]);

  const today = new Date();
  const isPending = nextDate ? today > nextDate : true;

  // Debug dos estados de data - APÓS definição dos valores computados
  useEffect(() => {
    console.log('📅 AnalysisPlanner - Estados atualizados:', {
      lastAnalysisDate,
      intervalDays,
      forceUpdate,
      lastDateObj: lastDateObj?.toISOString(),
      nextDate: nextDate?.toISOString(),
      formattedLastDate: lastAnalysisDate ? formatDateBR(dayjs(lastAnalysisDate).toDate()) : '—',
      formattedNextDate: nextDate ? formatDateBR(nextDate) : '—'
    });
  }, [lastAnalysisDate, intervalDays, forceUpdate, lastDateObj, nextDate]);

  const handleMarkAnalyzedToday = useCallback(async () => {
    setIsUpdating(true);
    
    // 🎯 CORREÇÃO: Usar dayjs com fuso horário local para garantir data correta
    const todayIso = dayjs().format('YYYY-MM-DD');
    const newIntervalDays = suggested?.days ?? intervalDays;
    
    console.log('🔄 Marcando como analisado hoje:', {
      todayIso,
      dayjsToday: dayjs().format('YYYY-MM-DD'),
      jsDateToday: new Date().toISOString().slice(0, 10),
      localDateString: new Date().toLocaleDateString('pt-BR'),
      newIntervalDays,
      selectedClient,
      selectedProduct,
      selectedAudience,
      storageKey,
      currentStates: { lastAnalysisDate, intervalDays }
    });
    
    // Verificar se as props são válidas
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === '' || !selectedProduct || selectedProduct === 'Todos os Produtos') {
      console.warn('⚠️ Props inválidas - não é possível salvar análise:', { selectedClient, selectedProduct });
      alert('Por favor, selecione um cliente válido antes de marcar a análise.');
      setIsUpdating(false);
      return;
    }
    
    // Persistir imediatamente ANTES de atualizar estados
    try {
      const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
      
      // Persistir também no localStorage de forma síncrona PRIMEIRO
      const payload: PlannerStorage = { lastAnalysisDate: todayIso, intervalDays: newIntervalDays };
      console.log('💾 Salvando no localStorage:', { storageKey, payload });
      localStorage.setItem(storageKey, JSON.stringify(payload));
      
      // Depois salvar no Firestore
      console.log('☁️ Salvando no Firestore...');
      await analysisPlannerService.savePlanner(
        selectedClient,
        selectedProduct,
        selectedAudience,
        { lastAnalysisDate: todayIso, intervalDays: newIntervalDays, adSetId }
      );
      
      console.log('✅ Dados salvos com sucesso:', payload);
      
    } catch (error) {
      console.error('❌ Erro ao salvar dados de análise:', error);
      // Em caso de erro, tentar salvar apenas no localStorage
      try {
        const payload: PlannerStorage = { lastAnalysisDate: todayIso, intervalDays: newIntervalDays };
        localStorage.setItem(storageKey, JSON.stringify(payload));
        console.log('💾 Salvo apenas no localStorage como fallback');
      } catch (localStorageError) {
        console.error('❌ Erro crítico - não foi possível salvar nem no localStorage:', localStorageError);
      }
    }

    // Atualiza estados locais DEPOIS do salvamento usando flushSync
    console.log('🔄 Atualizando estados da UI com flushSync...');
    
    flushSync(() => {
      setLastAnalysisDate(() => {
        console.log('📅 Estado lastAnalysisDate sendo atualizado para:', todayIso);
        return todayIso;
      });
      
      setIntervalDays(() => {
        console.log('⏱️ Estado intervalDays sendo atualizado para:', newIntervalDays);
        return newIntervalDays;
      });
      
      setForceUpdate(prev => {
        const newValue = prev + 1;
        console.log('🔄 ForceUpdate incrementado para:', newValue);
        return newValue;
      });
    });
    
    // Atualização direta do DOM como fallback
    const updateDOMDirectly = () => {
      try {
        const lastDateSpan = document.querySelector(`[key*="last-date-"]`);
        const nextDateSpan = document.querySelector(`[key*="next-date-"]`);
        const intervalSpan = document.querySelector(`[key*="interval-"]`);
        
        if (lastDateSpan) {
          lastDateSpan.textContent = formatDateBR(dayjs(todayIso).toDate());
          console.log('🔄 DOM - Última análise atualizada diretamente');
        }
        
        if (intervalSpan) {
          intervalSpan.textContent = newIntervalDays.toString();
          console.log('🔄 DOM - Intervalo atualizado diretamente');
        }
        
        if (nextDateSpan) {
          const nextDate = addDays(dayjs(todayIso).toDate(), newIntervalDays);
          nextDateSpan.textContent = formatDateBR(nextDate);
          console.log('🔄 DOM - Próxima análise atualizada diretamente');
        }
      } catch (domError) {
        console.warn('⚠️ Erro ao atualizar DOM diretamente:', domError);
      }
    };
    
    // Atualização imediata do DOM
    updateDOMDirectly();
    
    // Garantir atualização múltipla para casos de React Strict Mode
    setTimeout(() => {
      console.log('🔄 Segunda atualização da UI...');
      setLastAnalysisDate(() => todayIso);
      setIntervalDays(() => newIntervalDays);
      setForceUpdate(prev => prev + 1);
      updateDOMDirectly();
    }, 50);
    
    setTimeout(() => {
      console.log('🔄 Terceira atualização da UI...');
      setLastAnalysisDate(() => todayIso);
      setIntervalDays(() => newIntervalDays);
      setForceUpdate(prev => prev + 1);
      updateDOMDirectly();
      
      // 🎯 FORÇAR ATUALIZAÇÃO DA SEÇÃO "PÚBLICOS DESTE PRODUTO"
      console.log('🔄 Forçando atualização da seção de públicos...');
      
      // 1. Limpar cache de métricas para forçar recálculo
      try {
        if (typeof (window as any).metricsService?.clearCache === 'function') {
          (window as any).metricsService.clearCache();
        }
      } catch (e) {}
      
      // 2. Disparar evento customizado para notificar outros componentes
      window.dispatchEvent(new CustomEvent('analysisUpdated', {
        detail: {
          client: selectedClient,
          product: selectedProduct,
          audience: selectedAudience,
          lastAnalysisDate: todayIso,
          intervalDays: newIntervalDays
        }
      }));
      
      // 3. Forçar re-render através do localStorage
      const currentRefreshTrigger = localStorage.getItem('refreshTrigger') || '0';
      localStorage.setItem('refreshTrigger', (parseInt(currentRefreshTrigger) + 1).toString());
      
      console.log('✅ Atualização completa finalizada - Data atual:', dayjs().format('DD/MM/YYYY'));
      setIsUpdating(false);
    }, 200);
  }, [selectedClient, selectedProduct, selectedAudience, suggested, intervalDays, storageKey]);

  const applySuggestion = () => {
    if (suggested?.days) setIntervalDays(suggested.days);
  };

  // Efeitos no clique: ripple + tooltip "Aplicado"
  function playButtonClickEffect(btn: HTMLButtonElement, showTooltip: boolean = true) {
    try {
      const ripple = document.createElement('span');
      ripple.className = 'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/25 animate-ping';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);

      if (showTooltip) {
        const tip = document.createElement('div');
        tip.className = 'applied-tooltip';
        tip.textContent = 'Aplicado';
        btn.appendChild(tip);
        setTimeout(() => tip.remove(), 900);
      }
    } catch {}
  }

  return (
    <div key={`analysis-planner-${lastAnalysisDate}-${intervalDays}-${forceUpdate}`} className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 md:p-5 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-amber-300" />
          <h4 className="text-slate-100 font-semibold">Planejamento de Análise</h4>
        </div>
        <div className="flex items-center gap-2">
          {isPending ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-amber-500/20 text-amber-200 border border-amber-400/30">
              <AlertTriangle className="w-4 h-4" /> Pendente de análise
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
              <CheckCircle2 className="w-4 h-4" /> Analisado
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">Última análise</label>
          <div className={`flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-200`}>
            <CalendarDays className="w-4 h-4 text-amber-300" />
            <span>
              {lastAnalysisDate ? formatDateBR(dayjs(lastAnalysisDate).toDate()) : '—'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Intervalo (dias)</label>
          <div className={`flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-200`}>
            <Clock className="w-4 h-4 text-amber-300" />
            <span>{intervalDays}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1">Próxima análise</label>
          <div className={`flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-200`}>
            <Clock className="w-4 h-4 text-amber-300" />
            <span>
              {nextDate ? formatDateBR(nextDate) : '—'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-300" />
          {loadingSuggestion ? (
            <span>Calculando sugestão com base nas métricas recentes…</span>
          ) : (
            <span>
              Sugestão: {suggested?.days ?? DEFAULT_INTERVAL} dias
              {suggested?.reason ? ` — ${suggested.reason}` : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { 
              playButtonClickEffect(e.currentTarget);
              handleMarkAnalyzedToday(); 
            }}
            disabled={isUpdating}
            className={`relative overflow-hidden px-3 py-2 text-sm rounded-lg border transition transform text-white ${
              isUpdating 
                ? 'bg-amber-600/80 border-amber-500/40 cursor-wait' 
                : 'bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] border-emerald-500/40'
            }`}
          >
            {isUpdating ? 'Atualizando...' : 'Marcar como analisado hoje'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPlanner;


