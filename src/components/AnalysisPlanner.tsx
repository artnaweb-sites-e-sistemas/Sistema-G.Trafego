import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { metricsService, type MetricData } from '../services/metricsService';
import { analysisPlannerService } from '../services/analysisPlannerService';
import dayjs from 'dayjs';

interface AnalysisPlannerProps {
  selectedClient: string;
  selectedMonth: string;
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

const AnalysisPlanner: React.FC<AnalysisPlannerProps> = ({ selectedClient, selectedMonth, selectedProduct, selectedAudience }) => {
  const [lastAnalysisDate, setLastAnalysisDate] = useState<string>('');
  const [intervalDays, setIntervalDays] = useState<number>(DEFAULT_INTERVAL);
  const [loadingSuggestion, setLoadingSuggestion] = useState<boolean>(false);
  const [suggested, setSuggested] = useState<{ days: number; reason: string } | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(false);

  const storageKey = useMemo(() => getStorageKey(selectedClient, selectedProduct, selectedAudience), [selectedClient, selectedProduct, selectedAudience]);

  // Carregar preferências
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: PlannerStorage = JSON.parse(raw);
        if (saved.lastAnalysisDate) setLastAnalysisDate(saved.lastAnalysisDate);
        if (typeof saved.intervalDays === 'number') setIntervalDays(saved.intervalDays);
      }
      // Carregar do Firestore (sobrepõe localStorage se existir)
      (async () => {
        
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
          
          if (record.lastAnalysisDate) setLastAnalysisDate(record.lastAnalysisDate);
          if (typeof record.intervalDays === 'number') setIntervalDays(record.intervalDays);
          // Se tinha adSetId no registro mas não está no localStorage, propaga
          try { if (record.adSetId && !localStorage.getItem('selectedAdSetId')) localStorage.setItem('selectedAdSetId', record.adSetId); } catch {}
        }
        setHydrated(true);
      })();
    } catch {}
  }, [storageKey]);

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

  const lastDateObj = safeParseDate(lastAnalysisDate);
  const nextDate = useMemo(() => {
    if (!lastDateObj) return null;
    const calculatedNextDate = addDays(lastDateObj, Math.max(1, intervalDays || DEFAULT_INTERVAL));
    
    // 🎯 DEBUG: Log para sincronização de datas
    console.log('🗓️ SYNC DEBUG - AnalysisPlanner nextDate calculation:', {
      lastAnalysisDate: lastAnalysisDate,
      lastDateObj: lastDateObj.toISOString(),
      intervalDays: intervalDays,
      calculatedNextDate: calculatedNextDate.toISOString(),
      formattedNextDate: formatDateBR(calculatedNextDate)
    });
    
    return calculatedNextDate;
  }, [lastDateObj, intervalDays]);

  const today = new Date();
  const isPending = nextDate ? today > nextDate : true;

  const handleMarkAnalyzedToday = () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    // Atualiza estados locais
    setLastAnalysisDate(todayIso);
    if (suggested?.days) setIntervalDays(suggested.days);

    // Persistir imediatamente (além do useEffect) para evitar perda ao navegar rápido
    try {
      const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
      analysisPlannerService
        .savePlanner(
          selectedClient,
          selectedProduct,
          selectedAudience,
          { lastAnalysisDate: todayIso, intervalDays: suggested?.days ?? intervalDays, adSetId }
        )
        .catch(() => {});
      // Persistir também no localStorage de forma síncrona
      const payload: PlannerStorage = { lastAnalysisDate: todayIso, intervalDays: suggested?.days ?? intervalDays };
      localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch {}
  };

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
    <div className="bg-slate-900/50 border border-slate-700/50 rounded-xl p-4 md:p-5 mb-6">
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
            <span>{lastDateObj ? formatDateBR(lastDateObj) : '—'}</span>
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
            <span>{nextDate ? formatDateBR(nextDate) : '—'}</span>
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
            className={`relative overflow-hidden px-3 py-2 text-sm rounded-lg border bg-emerald-600/80 hover:bg-emerald-600 active:scale-[0.98] transition transform text-white border-emerald-500/40`}
          >
            Marcar como analisado hoje
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPlanner;


