import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { CalendarDays, Clock, CheckCircle2, AlertTriangle, Sparkles, Target, Zap } from 'lucide-react';
import { metricsService, type MetricData } from '../services/metricsService';
import { analysisPlannerService } from '../services/analysisPlannerService';
import dayjs from 'dayjs';
import AnalysisHistoryModal from './AnalysisHistoryModal';

interface AnalysisPlannerProps {
  selectedClient?: string;
  selectedMonth?: string;
  selectedProduct: string;
  selectedAudience?: string;
  isFacebookConnected?: boolean;
  metaAdsUserId?: string;
  cpaTarget?: number;
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
  const result = dayjs(base).add(days, 'day').toDate();

  return result;
}

function getStorageKey(client: string, product: string, audience?: string) {
  const parts = [client || 'sem-cliente', product || 'sem-produto', audience || 'sem-publico'];
  return `analysisPlanner_${parts.join('|').toLowerCase().replace(/\s+/g, '_')}`;
}

function safeParseDate(iso?: string): Date | null {
  if (!iso) return null;

  // 🎯 CORREÇÃO: Usar dayjs para evitar problemas de fuso horário
  // ao interpretar strings YYYY-MM-DD como local ao invés de UTC
  const d = dayjs(iso).toDate();
  const isValid = !isNaN(d.getTime());



  return isValid ? d : null;
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

const AnalysisPlanner: React.FC<AnalysisPlannerProps> = ({
  selectedClient = '',
  selectedMonth = '',
  selectedProduct,
  selectedAudience = '',
  metaAdsUserId = '',
  cpaTarget = 0
}) => {
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string>('');
  const [intervalDays, setIntervalDays] = useState<number>(DEFAULT_INTERVAL);
  const [loadingSuggestion, setLoadingSuggestion] = useState<boolean>(false);
  const [suggested, setSuggested] = useState<{ days: number; reason: string } | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);
  const [forceUpdate, setForceUpdate] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  // Debug das props recebidas e estados
  useEffect(() => {
    //     
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


          // 1ª tentativa: registro específico do público
          let record = await analysisPlannerService.getPlanner(selectedClient, selectedProduct, selectedAudience, metaAdsUserId);
          // Fallback 1: nível da campanha
          if (!record && selectedAudience) {
            record = await analysisPlannerService.getPlanner(selectedClient, selectedProduct, undefined, metaAdsUserId);
          }
          // Fallback 2: procurar por adSetId atual entre todos os planners da campanha
          if (!record) {
            try {
              const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
              if (adSetId) {
                const all = await analysisPlannerService.listPlannersForProduct(selectedClient, selectedProduct);
                const byAdSet = all.find(p => p.adSetId === adSetId);
                if (byAdSet) record = byAdSet;
              }
            } catch { }
          }
          // Fallback 3: comparar por nome normalizado do público
          if (!record && selectedAudience) {
            try {
              const norm = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
              const all = await analysisPlannerService.listPlannersForProduct(selectedClient, selectedProduct);
              const byName = all.find(p => norm(p.audience || '') === norm(selectedAudience));
              if (byName) record = byName;
            } catch { }
          }

          if (record) {

            if (record.lastAnalysisDate) setLastAnalysisDate(record.lastAnalysisDate);
            if (typeof record.intervalDays === 'number') setIntervalDays(record.intervalDays);
            // Se tinha adSetId no registro mas não está no localStorage, propaga
            try { if (record.adSetId && !localStorage.getItem('selectedAdSetId')) localStorage.setItem('selectedAdSetId', record.adSetId); } catch { }
          } else {

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
  }, [storageKey, selectedClient, selectedProduct, selectedAudience, metaAdsUserId]);

  // Salvar preferências
  useEffect(() => {
    if (!hydrated) return; // evita sobrescrever com valores vazios antes do carregamento
    try {
      const payload: PlannerStorage = { lastAnalysisDate, intervalDays };
      localStorage.setItem(storageKey, JSON.stringify(payload));
      const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
      analysisPlannerService.savePlanner(selectedClient, selectedProduct, selectedAudience, { ...payload, adSetId }).catch(() => { });
    } catch { }
  }, [storageKey, lastAnalysisDate, intervalDays, hydrated]);

  // Buscar métricas para sugerir intervalo
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingSuggestion(true);
      try {
        const month = selectedMonth || localStorage.getItem('selectedMonth') || '';
        const client = selectedClient || localStorage.getItem('currentSelectedClient') || 'Todos os Clientes';
        const product = selectedProduct || localStorage.getItem('currentSelectedProduct') || 'Todas as Campanhas';
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
    if (selectedClient && selectedClient !== 'Selecione um cliente' && selectedProduct && selectedProduct !== 'Todas as Campanhas') {
      load();
    } else {
      setSuggested({ days: DEFAULT_INTERVAL, reason: 'Defina cliente e produto para recomendações mais precisas.' });
    }
    return () => { cancelled = true; };
  }, [selectedClient, selectedMonth, selectedProduct, selectedAudience]);

  // Aplicar automaticamente a sugestão quando ela for calculada, apenas se não houver um valor salvo
  useEffect(() => {
    if (suggested?.days && hydrated && !lastAnalysisDate) {
      setIntervalDays(suggested.days);
    }
  }, [suggested, hydrated, lastAnalysisDate]);

  const lastDateObj = useMemo(() => safeParseDate(lastAnalysisDate), [lastAnalysisDate, forceUpdate]);
  const nextDate = useMemo(() => {
    if (!lastDateObj) return null;
    const calculatedNextDate = addDays(lastDateObj, Math.max(1, intervalDays || DEFAULT_INTERVAL));

    // 🎯 DEBUG: Log para sincronização de datas


    return calculatedNextDate;
  }, [lastDateObj, intervalDays, forceUpdate]);

  const today = new Date();
  const isPending = nextDate ? today > nextDate : true;

  // Debug dos estados de data - APÓS definição dos valores computados
  useEffect(() => {
    //     
  }, [lastAnalysisDate, intervalDays, forceUpdate, lastDateObj, nextDate]);

  const handleMarkAnalyzedToday = useCallback(async () => {
    setIsUpdating(true);

    // 🎯 CORREÇÃO: Usar o valor atual do estado intervalDays (que pode ter sido editado pelo usuário)
    const todayIso = dayjs().format('YYYY-MM-DD');
    const newIntervalDays = intervalDays;



    // Verificar se as props são válidas
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === '' || !selectedProduct || selectedProduct === 'Todas as Campanhas') {
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

      localStorage.setItem(storageKey, JSON.stringify(payload));

      // Depois salvar no Firestore

      await analysisPlannerService.savePlanner(
        selectedClient,
        selectedProduct,
        selectedAudience,
        { lastAnalysisDate: todayIso, intervalDays: newIntervalDays, adSetId },
        metaAdsUserId
      );



    } catch (error) {
      console.error('❌ Erro ao salvar dados de análise:', error);
      // Em caso de erro, tentar salvar apenas no localStorage
      try {
        const payload: PlannerStorage = { lastAnalysisDate: todayIso, intervalDays: newIntervalDays };
        localStorage.setItem(storageKey, JSON.stringify(payload));

      } catch (localStorageError) {
        console.error('❌ Erro crítico - não foi possível salvar nem no localStorage:', localStorageError);
      }
    }

    // Atualiza estados locais DEPOIS do salvamento usando flushSync


    flushSync(() => {
      setLastAnalysisDate(() => {

        return todayIso;
      });

      setIntervalDays(() => {

        return newIntervalDays;
      });

      setForceUpdate(prev => {
        const newValue = prev + 1;

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

        }

        if (intervalSpan) {
          intervalSpan.textContent = newIntervalDays.toString();

        }

        if (nextDateSpan) {
          const nextDate = addDays(dayjs(todayIso).toDate(), newIntervalDays);
          nextDateSpan.textContent = formatDateBR(nextDate);

        }
      } catch (domError) {
        console.warn('⚠️ Erro ao atualizar DOM diretamente:', domError);
      }
    };

    // Atualização imediata do DOM
    updateDOMDirectly();

    // Garantir atualização múltipla para casos de React Strict Mode
    setTimeout(() => {

      setLastAnalysisDate(() => todayIso);
      setIntervalDays(() => newIntervalDays);
      setForceUpdate(prev => prev + 1);
      updateDOMDirectly();
    }, 50);

    setTimeout(() => {

      setLastAnalysisDate(() => todayIso);
      setIntervalDays(() => newIntervalDays);
      setForceUpdate(prev => prev + 1);
      updateDOMDirectly();

      // 🎯 FORÇAR ATUALIZAÇÃO DA SEÇÃO "PÚBLICOS DESTE PRODUTO"


      // 1. Limpar cache de métricas para forçar recálculo
      try {
        if (typeof (window as any).metricsService?.clearCache === 'function') {
          (window as any).metricsService.clearCache();
        }
      } catch (e) { }

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


      setIsUpdating(false);
    }, 200);
  }, [selectedClient, selectedProduct, selectedAudience, suggested, intervalDays, storageKey]);



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
    } catch { }
  }

  return (
    <div key={`analysis-planner-${lastAnalysisDate}-${intervalDays}-${forceUpdate}`} className="bg-slate-900/70 border border-slate-700/50 rounded-2xl shadow-lg p-6">
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
          <div className={`flex items-center gap-2 bg-slate-800/70 border border-slate-700/60 rounded-lg px-3 py-2 text-slate-200 focus-within:border-amber-400/50 transition-colors`}>
            <Clock className="w-4 h-4 text-amber-300" />
            <input
              type="number"
              min="1"
              max="90"
              value={intervalDays}
              onChange={(e) => setIntervalDays(parseInt(e.target.value) || 1)}
              className="bg-transparent border-none outline-none w-full text-slate-200 focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
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

      {/* 🎯 MÉTRICAS DE BALIZAMENTO (V2) */}
      <div className="mt-8 pt-6 border-t border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h5 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Métricas de Balizamento</h5>
          </div>
          <div className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase tracking-widest">
            Referência Base
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CPA Máximo */}
          <div className="relative group overflow-hidden bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 hover:border-purple-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Target className="w-8 h-8 text-white" />
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-purple-400"></div>
              CPA Máximo
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              {cpaTarget > 0 ? `R$ ${cpaTarget.toFixed(2).replace('.', ',')}` : '—'}
            </div>
            <div className="text-[9px] text-slate-500 mt-1 font-medium italic">Valor da Meta CPA configurada</div>
          </div>

          {/* Corte CPA */}
          <div className="relative group overflow-hidden bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 hover:border-rose-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-rose-400"></div>
              Corte CPA (+20%)
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-rose-600 bg-clip-text text-transparent">
              {cpaTarget > 0 ? `R$ ${(cpaTarget * 1.2).toFixed(2).replace('.', ',')}` : '—'}
            </div>
            <div className="text-[9px] text-rose-500/70 mt-1 font-medium italic">Limite tolerável com margem de gordura</div>
          </div>

          {/* Tiririca (CJA) */}
          <div className="relative group overflow-hidden bg-slate-800/40 rounded-xl p-4 border border-slate-700/40 hover:border-amber-500/40 transition-all duration-300">
            <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
              <Sparkles className="w-8 h-8 text-amber-500" />
            </div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full bg-amber-400"></div>
              Tiririca (CJA - 3x)
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-600 bg-clip-text text-transparent">
              {cpaTarget > 0 ? `R$ ${(cpaTarget * 3).toFixed(2).replace('.', ',')}` : '—'}
            </div>
            <div className="text-[9px] text-amber-500/70 mt-1 font-medium italic">3x o valor do CPA Max (Alerta crítico)</div>
          </div>
        </div>

        {/* Informativo de Escala */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl group hover:bg-emerald-500/10 transition-all">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none mb-1">Performance Ideal</span>
              <span className="text-[11px] font-medium text-slate-300">
                Custo <strong className="text-emerald-400">ABAIXO</strong> do CPA Máximo: <strong className="text-emerald-400 ml-1">Escala 50%</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-blue-500/5 border border-blue-500/20 rounded-xl group hover:bg-blue-500/10 transition-all">
            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
              <Zap className="w-3 h-3 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-blue-500 uppercase tracking-widest leading-none mb-1">Performance Regular</span>
              <span className="text-[11px] font-medium text-slate-300">
                Custo <strong className="text-blue-400">ENTRE</strong> CPA Máx e Corte: <strong className="text-blue-400 ml-1">Escala 20%</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
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
          <AnalysisHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            onSaved={() => {
              handleMarkAnalyzedToday();
            }}
            client={selectedClient}
            product={selectedProduct}
            audience={selectedAudience}
            metaAdsUserId={metaAdsUserId}
            cpaTarget={cpaTarget}
          />
          <button
            onClick={(e) => {
              if (!selectedClient || selectedClient === 'Selecione um cliente' || !selectedProduct || selectedProduct === 'Todas as Campanhas') {
                alert('Por favor, selecione um cliente válido antes de marcar a análise.');
                return;
              }
              playButtonClickEffect(e.currentTarget);
              setIsHistoryModalOpen(true);
            }}
            disabled={isUpdating}
            className={`group relative px-6 py-2 text-xs font-extrabold rounded-xl transition-all duration-300 transform shadow-lg active:scale-[0.95] ${isUpdating
              ? 'bg-slate-800 text-slate-500 cursor-wait border border-slate-700'
              : 'bg-gradient-to-br from-emerald-500 via-emerald-400 to-green-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] text-slate-950 border border-emerald-300/30'
              }`}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              {isUpdating ? (
                <Clock className="w-4 h-4 animate-spin" />
              ) : (
                <div className="relative">
                  <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-300 text-slate-950" />
                </div>
              )}
              <span className="tracking-tight uppercase text-[11px] whitespace-nowrap">{isUpdating ? 'Salvando...' : 'Marcar como analisado hoje'}</span>
            </div>

            {/* Brilho de Borda Refinado */}
            {!isUpdating && (
              <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPlanner;


