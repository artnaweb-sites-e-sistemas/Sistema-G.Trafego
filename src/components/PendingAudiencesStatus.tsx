import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle2, Loader2, CalendarDays, Pencil, TrendingUp, GitBranch, Clock, PauseCircle } from 'lucide-react';
import { analysisPlannerService } from '../services/analysisPlannerService';
import { metricsService } from '../services/metricsService';
import { metaAdsService } from '../services/metaAdsService';
import dayjs from 'dayjs';
import { adStrategyService } from '../services/adStrategyService';
import Chip from './ui/Chip';
import ProgressBar from './ui/ProgressBar';
import SectionHeader from './ui/SectionHeader';

interface PendingAudiencesStatusProps {
  selectedClient: string;
  selectedProduct: string;
  selectedMonth: string;
}

type AudienceStatus = {
  name: string;
  status: 'pending' | 'ok';
  lastAnalysisDate?: string; // ISO
  nextAnalysisDate?: string; // ISO
  spend?: number;
  plannedBudget?: number;
  suggestionType?: 'vertical' | 'horizontal' | 'alert' | 'wait';
  suggestionTooltip?: string;
  activeDaysTotal?: number;
  activeDaysMonth?: number;
  activeDaysPrevMonth?: number;
  adSetStatus?: string; // ACTIVE | PAUSED | etc
  campaignStatus?: string; // ACTIVE | PAUSED | etc
};

// util não usado após migração para dayjs (mantido aqui apenas como referência)

function getMonthDateRange(monthLabel: string): { since: string; until: string } {
  // monthLabel no formato "Agosto 2025"
  const months: Record<string, number> = {
    'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3, 'maio': 4, 'junho': 5,
    'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
  };
  const parts = (monthLabel || '').toLowerCase().split(/\s+/);
  const monthIdx = months[parts[0]] ?? new Date().getMonth();
  const year = parseInt(parts[1]) || new Date().getFullYear();
  const start = new Date(year, monthIdx, 1);
  const end = new Date(year, monthIdx + 1, 0);
  const since = start.toISOString().slice(0, 10);
  const until = end.toISOString().slice(0, 10);
  return { since, until };
}

const PendingAudiencesStatus: React.FC<PendingAudiencesStatusProps> = ({ selectedClient, selectedProduct, selectedMonth }) => {
  const [loading, setLoading] = useState(true);
  const [audiences, setAudiences] = useState<AudienceStatus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<string | null>(null);
  const [tempBudget, setTempBudget] = useState<string>('');
  const formatBRLFromDigits = (digits: string): string => {
    if (!digits) return '0,00';
    const num = parseInt(digits, 10);
    const value = isNaN(num) ? 0 : num / 100;
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string; color: 'emerald' | 'blue' | 'slate' }>({ visible: false, x: 0, y: 0, content: '', color: 'slate' });

  // Listener para atualizações de análise
  useEffect(() => {
    const handleAnalysisUpdate = () => {
      console.log('🔄 PendingAudiencesStatus - Recebeu evento de atualização de análise');
      // Força recarregamento dos dados
      setLoading(true);
    };

    const handleStorageUpdate = (e: StorageEvent) => {
      if (e.key === 'refreshTrigger') {
        console.log('🔄 PendingAudiencesStatus - Recebeu trigger de refresh via localStorage');
        setLoading(true);
      }
    };

    window.addEventListener('analysisUpdated', handleAnalysisUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    
    return () => {
      window.removeEventListener('analysisUpdated', handleAnalysisUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1) Tentar listar públicos via Meta Ads a partir da campanha selecionada
        let audienceNames: string[] = [];
        const campaignId = localStorage.getItem('selectedCampaignId') || '';
        if (metaAdsService.isLoggedIn() && metaAdsService.getSelectedAccount() && campaignId) {
          try {
            const adsets = await metaAdsService.getAdSets(campaignId);
            audienceNames = (adsets || []).map((a: any) => a?.name).filter(Boolean);
          } catch (e) {
            // Falhou buscar adsets (400/429/rate limit). Segue com fallback; não quebra.
          }
        }

        // 2) Fallback: usar audienceDetails salvos no Firestore
        if (!audienceNames.length) {
          const details = await metricsService.getAllAudienceDetailsForProduct(selectedMonth, selectedProduct);
          audienceNames = details.map((d: any) => d.audience).filter(Boolean);
        }

        // Garantir únicos
        audienceNames = Array.from(new Set(audienceNames));

        // 3) Trazer planners salvos e determinar status
        const planners = await analysisPlannerService.listPlannersForProduct(selectedClient, selectedProduct);
        const today = dayjs().startOf('day');

        // 4) Orçamento pretendido: usar planner quando houver; fallback em estratégias
        let plannedByName: Record<string, number> = {};
        try {
          const strategies = await adStrategyService.getStrategiesByClientAndMonth(selectedClient, selectedMonth);
          plannedByName = strategies.reduce((acc, s) => {
            const audience = s.generatedNames?.audience || '';
            acc[audience] = s.budget?.planned || 0;
            return acc;
          }, {} as Record<string, number>);
        } catch {}

        // 🎯 CORREÇÃO: Buscar dados mais recentes do localStorage primeiro (igual ao AnalysisPlanner)
        const getStorageKey = (client: string, product: string, audience?: string) => {
          const parts = [client || 'sem-cliente', product || 'sem-produto', audience || 'sem-publico'];
          return `analysisPlanner_${parts.join('|').toLowerCase().replace(/\s+/g, '_')}`;
        };

        // Buscar dados do localStorage para cada audiência
        const localStorageData: Record<string, { lastAnalysisDate?: string; intervalDays?: number }> = {};
        audienceNames.forEach(name => {
          try {
            const storageKey = getStorageKey(selectedClient, selectedProduct, name);
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const saved = JSON.parse(raw);
              localStorageData[name] = saved;
              console.log('🗓️ STORAGE DEBUG - Dados do localStorage para:', { audienceName: name, saved });
            }
          } catch (error) {
            console.log('🗓️ STORAGE DEBUG - Erro ao ler localStorage para:', name, error);
          }
        });

        const statusList: AudienceStatus[] = audienceNames.map(name => {
          const rec = planners.find(p => (p.audience || '') === name);
          const localData = localStorageData[name];
          
          // 🎯 CORREÇÃO: Priorizar dados do localStorage (mais recentes) sobre Firestore
          const lastAnalysisDate = localData?.lastAnalysisDate || rec?.lastAnalysisDate;
          const intervalDays = localData?.intervalDays || rec?.intervalDays;
          
          if (!lastAnalysisDate || !intervalDays) {
            console.log('🗓️ DATA DEBUG - Dados insuficientes para:', { name, lastAnalysisDate, intervalDays, hasLocalData: !!localData, hasFirestoreData: !!rec });
            return { name, status: 'pending', lastAnalysisDate: undefined, nextAnalysisDate: undefined, plannedBudget: plannedByName[name] };
          }
          
          // Calcular datas de forma local (sem fuso) e SEM contar o dia atual (começa amanhã)
          const last = dayjs(lastAnalysisDate, 'YYYY-MM-DD').startOf('day');
          const next = last.add(Math.max(1, intervalDays), 'day');
          const pending = today.isAfter(next);
          const planned = typeof rec?.plannedBudget === 'number' ? rec.plannedBudget : plannedByName[name];
          
          // 🎯 DEBUG: Log para sincronização de datas
          console.log('🗓️ SYNC DEBUG - PendingAudiencesStatus nextDate calculation:', {
            audienceName: name,
            dataSource: localData ? 'localStorage' : 'firestore',
            lastAnalysisDate: lastAnalysisDate,
            intervalDays: intervalDays,
            lastDayjs: last.format('YYYY-MM-DD'),
            nextDayjs: next.format('YYYY-MM-DD'),
            nextDateFormatted: next.format('DD/MM/YYYY'),
            pending,
            localStorageData: localData,
            firestoreData: rec ? { lastAnalysisDate: rec.lastAnalysisDate, intervalDays: rec.intervalDays } : null
          });
          
          return { name, status: pending ? 'pending' : 'ok', lastAnalysisDate: lastAnalysisDate, nextAnalysisDate: next.format('YYYY-MM-DD'), plannedBudget: planned };
        });

        // 5) Buscar gasto atual por público, priorizando adSetId salvo no planner
        const { since, until } = getMonthDateRange(selectedMonth);
        // Buscar status da campanha selecionada uma única vez
        let campaignStatus: string | undefined = undefined;
        try {
          const selectedCampaignId = localStorage.getItem('selectedCampaignId') || '';
          if (selectedCampaignId && metaAdsService.isLoggedIn() && metaAdsService.getSelectedAccount()) {
            const camp = await metaAdsService.getCampaignDetails(selectedCampaignId);
            campaignStatus = (camp?.status as string) || undefined;
          }
        } catch {}

        const withSpend = await Promise.all(statusList.map(async (s) => {
          try {
            const rec = planners.find(p => (p.audience || '') === s.name);
            const adSetId = rec?.adSetId;
            if (adSetId && metaAdsService.isLoggedIn() && metaAdsService.getSelectedAccount()) {
              // Este mês (mês selecionado)
              // Não usar fallback de 30 dias aqui para evitar métricas irreais quando não houver dados no período
              const insights = await metaAdsService.getAdSetInsights(adSetId, since, until, { fallbackToLast30Days: false });
              const spend = (insights || []).reduce((sum: number, i: any) => sum + (parseFloat(i?.spend || '0') || 0), 0);

              // Buscar status do ad set (ACTIVE/PAUSED)
              let adSetStatus: string | undefined;
              try {
                const det = await metaAdsService.getAdSetDetails(adSetId);
                adSetStatus = (det?.status as string) || undefined;
              } catch {}
              const activeDaysMonth = (insights || []).reduce((acc: number, i: any) => acc + ((parseFloat(i?.spend || '0') || 0) > 0 ? 1 : 0), 0);

              // Mês anterior
              let activeDaysPrevMonth = 0;
              try {
                const monthsMap: Record<string, number> = { 'janeiro':0,'fevereiro':1,'março':2,'marco':2,'abril':3,'maio':4,'junho':5,'julho':6,'agosto':7,'setembro':8,'outubro':9,'novembro':10,'dezembro':11 };
                const parts = (selectedMonth || '').toLowerCase().split(/\s+/);
                const curIdx = monthsMap[parts[0]] ?? dayjs().month();
                const curYear = parseInt(parts[1],10) || dayjs().year();
                const prev = dayjs(new Date(curYear, curIdx, 1)).subtract(1,'month');
                const prevSince = prev.startOf('month').format('YYYY-MM-DD');
                const prevUntil = prev.endOf('month').format('YYYY-MM-DD');
                // Também sem fallback para mês anterior
                const insightsPrev = await metaAdsService.getAdSetInsights(adSetId, prevSince, prevUntil, { fallbackToLast30Days: false });
                activeDaysPrevMonth = (insightsPrev || []).reduce((acc: number, i: any) => acc + ((parseFloat(i?.spend || '0') || 0) > 0 ? 1 : 0), 0);
              } catch {}
              // Regra: se o mês selecionado é o mês atual, somar mês anterior; 
              // se o mês selecionado é passado, considerar apenas o próprio mês (ignorar anteriores e posteriores)
              const partsSel = (selectedMonth || '').toLowerCase().split(/\s+/);
              const selIdx = ({'janeiro':0,'fevereiro':1,'março':2,'marco':2,'abril':3,'maio':4,'junho':5,'julho':6,'agosto':7,'setembro':8,'outubro':9,'novembro':10,'dezembro':11}[partsSel[0]] ?? dayjs().month());
              const selYear = parseInt(partsSel[1],10) || dayjs().year();
              const isCurrentMonth = dayjs().isSame(dayjs(new Date(selYear, selIdx, 1)), 'month');
              const activeDaysTotal = isCurrentMonth ? (activeDaysMonth + activeDaysPrevMonth) : activeDaysMonth;
              // Converter para nosso formato e calcular métricas simples
              let suggestionType: 'vertical' | 'horizontal' | 'alert' | 'wait' = 'wait';
              let suggestionTooltip = 'Aguardando otimização/mais dados.';
              try {
                const metricData = metaAdsService.convertToMetricData(insights || [], selectedMonth, selectedClient, selectedProduct, s.name) || [];
                const totals = (metricData as any[]).reduce((acc: { investment: number; impressions: number; clicks: number; leads: number; sales: number; frequencySamples: number[]; cplSamples: number[]; cprSamples: number[] }, m: any) => {
                  acc.investment += (m?.investment as number) || 0;
                  acc.impressions += (m?.impressions as number) || 0;
                  acc.clicks += (m?.clicks as number) || 0;
                  acc.leads += (m?.leads as number) || 0;
                  acc.sales += (m?.sales as number) || 0;
                  acc.frequencySamples.push(((m as any)?.frequency as number) || 0);
                  acc.cplSamples.push((m?.cpl as number) || 0);
                  acc.cprSamples.push((m?.cpr as number) || 0);
                  return acc;
                }, { investment: 0, impressions: 0, clicks: 0, leads: 0, sales: 0, frequencySamples: [] as number[], cplSamples: [] as number[], cprSamples: [] as number[] });
                const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
                const freq = totals.frequencySamples.length ? totals.frequencySamples.reduce((a: number, b: number)=>a+b,0)/totals.frequencySamples.length : 0;
                const cpl = totals.leads > 0 ? totals.investment / totals.leads : (totals.cplSamples.find((v: number)=>v>0) || 0);

                // Heurísticas de alerta (baixo desempenho)
                const spendPositive = totals.investment > 100;
                const alertLowCTRHighFreq = ctr < 0.8 && freq >= 2.5;
                const alertHighCPLFewLeads = cpl > 35 && totals.leads < 5;
                const alertSpendNoResults = spendPositive && totals.leads === 0 && totals.sales === 0;
                if (alertSpendNoResults) {
                  suggestionType = 'alert';
                  suggestionTooltip = `Atenção: gasto sem resultados. Revise objetivo da campanha, eventos de conversão e tracking.`;
                } else if (alertLowCTRHighFreq) {
                  suggestionType = 'alert';
                  suggestionTooltip = `Atenção: CTR ${ctr.toFixed(2)}% e frequência ${freq.toFixed(1)} — indício de fadiga. Renove criativos e ajuste público.`;
                } else if (alertHighCPLFewLeads) {
                  suggestionType = 'alert';
                  suggestionTooltip = `Atenção: CPL ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cpl)} com ${totals.leads} leads — teste novos ângulos/segmentações.`;
                }

                // Heurística de bom desempenho (mensagens/leads)
                const hasEnoughLeads = totals.leads >= 10;
                if (suggestionType !== 'alert' && hasEnoughLeads && cpl > 0 && cpl <= 15 && ctr >= 1.5 && freq <= 3.0) {
                  suggestionType = 'vertical';
                  suggestionTooltip = `Desempenho forte: CTR ${ctr.toFixed(2)}%, CPL ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cpl)}, leads ${totals.leads}, freq ${freq.toFixed(1)}.`;
                } else if (suggestionType !== 'alert' && cpl > 0 && cpl <= 25 && ctr >= 1.0 && freq <= 3.0) {
                  suggestionType = 'horizontal';
                  suggestionTooltip = `Bom desempenho: CTR ${ctr.toFixed(2)}%, CPL ${new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cpl)}, freq ${freq.toFixed(1)}. Teste variações/públicos.`;
                } else if (suggestionType !== 'alert') {
                  suggestionType = 'wait';
                  suggestionTooltip = `Aguardando otimização: CTR ${ctr.toFixed(2)}%, CPL ${cpl ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(cpl) : '—'}, leads ${totals.leads}, freq ${freq.toFixed(1)}.`;
                }
              } catch {}
              return { ...s, spend, suggestionType, suggestionTooltip, activeDaysTotal, activeDaysMonth, activeDaysPrevMonth, adSetStatus, campaignStatus } as AudienceStatus;
            }
          } catch {}
          return s;
        }));

        if (!cancelled) setAudiences(withSpend);
      } catch (e: any) {
        if (!cancelled) setError('Não foi possível carregar os públicos deste produto.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (selectedProduct && selectedProduct !== 'Todos os Produtos') {
      load();
    }
    return () => { cancelled = true; };
  }, [selectedClient, selectedProduct, selectedMonth]);

  return (
    <div className="relative overflow-visible bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-xl">
      <div className="relative p-6 md:p-8">
        <SectionHeader title="Públicos deste produto" subtitle="Status de análise por conjunto de anúncios" />

        {/* Barra de progresso agregada (todos os públicos) */}
        {audiences.length > 0 && (
          <div className="mb-6">
            {(() => {
              const totalSpend = audiences.reduce((sum, a) => sum + ((a.spend || 0) as number), 0);
              const totalPlanned = audiences.reduce((sum, a) => sum + ((a.plannedBudget || 0) as number), 0);
              const isCampaignPaused = audiences.some(a => a.campaignStatus === 'PAUSED');
              const allAdSetsPaused = audiences.length > 0 && audiences.every(a => a.adSetStatus === 'PAUSED');
              const { since, until } = getMonthDateRange(selectedMonth);
              const start = new Date(since).getTime();
              const end = new Date(until).getTime();
              const days = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
              const perDay = totalPlanned / days;
              const fmt = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
              const pausedGlobal = isCampaignPaused || allAdSetsPaused;
              const pct = pausedGlobal ? 100 : (totalPlanned > 0 ? Math.min(100, Math.round((totalSpend / totalPlanned) * 100)) : (totalSpend > 0 ? 100 : 0));
              return (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span className="flex items-center gap-2">
                      Gastos neste mês
                      <span className="animated-blue-text font-semibold">{fmt(totalSpend)}</span>
                    </span>
                    {!pausedGlobal && (
                      <span className="text-slate-400 inline-flex items-center gap-1">
                        Pretendido {fmt(totalPlanned)} <span className="text-slate-400">({fmt(perDay)} / dia)</span>
                      </span>
                    )}
                  </div>
                  {/* Destaque forte: barra principal animada com altura customizada 0.55rem */}
                  <ProgressBar value={pct} variant="animated" heightRem={0.55} />
                </>
              );
            })()}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-slate-300">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando públicos…
          </div>
        ) : error ? (
          <div className="text-sm text-red-300">{error}</div>
        ) : audiences.length === 0 ? (
          <div className="text-sm text-slate-400">Nenhum público encontrado para este produto.</div>
        ) : (
          <ul className="space-y-3">
            {audiences.map((a, idx) => {
              const nextDate = a.nextAnalysisDate ? dayjs(a.nextAnalysisDate) : null;
              const nextStr = nextDate ? nextDate.format('DD/MM') : '—';
              // Diferença baseada em início do dia para evitar off-by-one (contagem inclusiva)
              const diff = nextDate ? nextDate.startOf('day').diff(dayjs().startOf('day'), 'day') : null; // >=0: em N dias; <0: há N dias
              
              // 🎯 DEBUG: Log para verificar formatação e diferença de dias
              if (nextDate) {
                console.log('🗓️ DISPLAY DEBUG - PendingAudiencesStatus formatting:', {
                  audienceName: a.name,
                  nextAnalysisDate: a.nextAnalysisDate,
                  nextDateObject: nextDate.format('YYYY-MM-DD'),
                  nextStr: nextStr,
                  diff: diff,
                  today: dayjs().format('YYYY-MM-DD'),
                  diffExplanation: diff !== null ? (diff >= 0 ? `em ${diff} dias` : `há ${Math.abs(diff)} dias`) : 'sem data'
                });
              }
              return (
                <li key={idx} className="flex flex-col gap-3 p-4 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:border-slate-600/50 transition">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Badge de sugestão dinâmica à esquerda do nome (tooltip abre à direita) */}
                      <span className={`shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md border relative
                        ${a.suggestionType==='vertical' ? 'bg-emerald-600/15 border-emerald-500/40' : a.suggestionType==='horizontal' ? 'bg-blue-600/15 border-blue-500/40' : a.suggestionType==='alert' ? 'bg-amber-600/15 border-amber-500/40' : 'bg-slate-600/15 border-slate-500/40'}`}
                        onMouseEnter={(e)=>{
                          const rect = e.currentTarget.getBoundingClientRect();
                          const tooltipWidth = 300; // largura aproximada
                          const tooltipHeight = 80; // altura aproximada
                          const margin = 10;
                          
                          // Com position: fixed, getBoundingClientRect() já considera o scroll
                          // Não precisamos adicionar scrollX/scrollY manualmente
                          
                          // Tentar posicionar à direita primeiro (lado direito do ícone)
                          let x = rect.right + margin;
                          let y = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                          
                          // Se não cabe à direita, posicionar à esquerda (lado esquerdo do ícone)
                          if (x + tooltipWidth > window.innerWidth) {
                            x = rect.left - tooltipWidth - margin;
                            y = rect.top + (rect.height / 2) - (tooltipHeight / 2); // Manter na mesma altura
                          }
                          
                          // Se ainda não cabe à esquerda, posicionar acima
                          if (x < 0) {
                            x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                            y = rect.top - tooltipHeight - margin; // Posicionar acima
                          }
                          
                          // Se não cabe acima, posicionar embaixo como último recurso
                          if (y < 0) {
                            y = rect.bottom + margin; // Posicionar embaixo
                          }
                          
                          // Ajustar horizontalmente se sair da tela
                          if (x < margin) {
                            x = margin;
                          } else if (x + tooltipWidth > window.innerWidth - margin) {
                            x = window.innerWidth - tooltipWidth - margin;
                          }
                          
                          // Ajustar verticalmente se sair da tela
                          if (y < margin) {
                            y = margin;
                          } else if (y + tooltipHeight > window.innerHeight - margin) {
                            y = window.innerHeight - tooltipHeight - margin;
                          }
                          
                          // Determinar estratégia de posicionamento usada
                          let strategy = 'right'; // padrão
                          if (rect.right + margin + tooltipWidth > window.innerWidth) {
                            strategy = 'left';
                            if (rect.left - tooltipWidth - margin < 0) {
                              strategy = 'above';
                              if (rect.top - tooltipHeight - margin < 0) {
                                strategy = 'below';
                              }
                            }
                          }
                          
                          // Debug do posicionamento
                          console.log('🎯 TOOLTIP DEBUG:', {
                            audienceName: a.name,
                            strategy: strategy,
                            elementRect: {
                              top: rect.top,
                              left: rect.left,
                              right: rect.right,
                              bottom: rect.bottom,
                              width: rect.width,
                              height: rect.height
                            },
                            finalPosition: { x, y },
                            windowSize: { width: window.innerWidth, height: window.innerHeight },
                            tooltipSize: { width: tooltipWidth, height: tooltipHeight }
                          });
                          
                          setTooltip({
                            visible: true,
                            x: Math.max(margin, x),
                            y: Math.max(margin, y),
                            content: a.suggestionTooltip || 'Aguardando otimização/mais dados.',
                            color: a.suggestionType==='vertical' ? 'emerald' : a.suggestionType==='horizontal' ? 'blue' : 'slate'
                          });
                        }}
                        onMouseLeave={()=> setTooltip(prev => ({ ...prev, visible: false }))}
                      >
                        {a.suggestionType==='vertical' ? (
                          <TrendingUp className="w-4 h-4 text-emerald-300" />
                        ) : a.suggestionType==='horizontal' ? (
                          <GitBranch className="w-4 h-4 text-blue-300" />
                        ) : a.suggestionType==='alert' ? (
                          <AlertTriangle className="w-4 h-4 text-amber-300" />
                        ) : (
                          <Clock className="w-4 h-4 text-slate-300" />
                        )}
                      </span>
                      <span className="text-slate-200 text-sm font-medium truncate">{a.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {typeof a.activeDaysTotal === 'number' && (
                        <Chip size="xs" color="slate" icon={<Clock className="w-4 h-4 text-slate-400" />}> <span className="text-slate-400">Ativo há</span> <b className="text-slate-200">{a.activeDaysTotal} dias</b> </Chip>
                      )}
                    <Chip size="xs" color="slate" icon={<CalendarDays className="w-4 h-4 text-slate-400" />}> <span className="text-slate-400">Próxima análise em</span>
                      {diff !== null && (diff >= 0
                        ? <span className="text-slate-300"> <b className="text-slate-200 font-semibold">{diff}</b> dias</span>
                        : <span className="text-slate-300"> há <b className="text-slate-200 font-semibold">{Math.abs(diff)}</b> dias</span>)}
                      <span className="text-slate-400"> - </span>
                      {nextStr}
                    </Chip>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs tracking-wide border ${
                      (a.adSetStatus === 'PAUSED' || a.campaignStatus === 'PAUSED')
                        ? 'bg-amber-500/15 text-amber-200 border-amber-400/30'
                        : a.status === 'ok'
                          ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30'
                          : 'bg-rose-500/15 text-rose-200 border-rose-400/30'
                    }`}>
                      {(a.adSetStatus === 'PAUSED' || a.campaignStatus === 'PAUSED') ? (
                        <PauseCircle className="w-4 h-4" />
                      ) : a.status === 'ok' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      {(a.adSetStatus === 'PAUSED' || a.campaignStatus === 'PAUSED') ? 'Pausado' : (a.status === 'ok' ? 'Analisado' : 'Pendente')}
                    </span>
                    </div>
                  </div>
                  {/* Barra de progresso de orçamento (gasto vs pretendido) */}
                  <div className="w-full">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                      <span className="flex items-center gap-2">
                        Gastos neste mês
                        <span className="progress-animated-text font-medium">{new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(a.spend || 0)}</span>
                      </span>
                      {(() => {
                        // 🎯 DEBUG: Log detalhado das condições do orçamento pretendido
                        const adSetNotPaused = a.adSetStatus !== 'PAUSED';
                        const campaignNotPaused = a.campaignStatus !== 'PAUSED';
                        const hasBudget = typeof a.plannedBudget === 'number';
                        const shouldShow = adSetNotPaused && campaignNotPaused && hasBudget;
                        
                        console.log(`🎯 BUDGET DEBUG - ${a.name}:`, {
                          adSetStatus: a.adSetStatus,
                          adSetNotPaused,
                          campaignStatus: a.campaignStatus,
                          campaignNotPaused,
                          plannedBudget: a.plannedBudget,
                          plannedBudgetType: typeof a.plannedBudget,
                          hasBudget,
                          shouldShow
                        });
                        
                        return shouldShow;
                      })() && (
                        <span className="text-slate-500 inline-flex items-center gap-1">
                          {(() => {
                            const { since, until } = getMonthDateRange(selectedMonth);
                            const start = new Date(since).getTime();
                            const end = new Date(until).getTime();
                            const days = Math.max(1, Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1);
                            const perDay = (a.plannedBudget || 0) / days;
                            const fmt = (val: number) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(val || 0);
                            return (
                              <>
                                Pretendido {fmt(a.plannedBudget || 0)} <span className="text-slate-400">({fmt(perDay)} / dia)</span>
                              </>
                            );
                          })()}
                          <button
                            className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded hover:bg-slate-700/60"
                            onClick={() => {
                              setEditingBudget(a.name);
                              const cents = Math.round(((a.plannedBudget || 0) as number) * 100);
                              setTempBudget(String(cents));
                            }}
                            title="Editar orçamento pretendido"
                          >
                            <Pencil className="w-4 h-4 text-slate-300" />
                          </button>
                        </span>
                      )}
                    </div>
                    {(() => {
                      const pct = (a.adSetStatus === 'PAUSED' || a.campaignStatus === 'PAUSED')
                        ? 100
                        : (typeof a.plannedBudget === 'number' && a.plannedBudget > 0)
                          ? Math.min(100, Math.round(((a.spend || 0) / (a.plannedBudget || 1)) * 100))
                          : ((a.spend || 0) > 0 ? 100 : 0);
                      return (
                        <ProgressBar value={pct} variant="muted" size="sm" />
                      );
                    })()}

                    {/* Editor inline de orçamento pretendido */}
                    {editingBudget === a.name && (
                      <div className="mt-2 flex items-center justify-end gap-2 text-[12px]">
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300">R$</span>
                            <input
                              type="text"
                              value={(() => {
                                const digits = String(tempBudget).replace(/\D/g, '');
                                return formatBRLFromDigits(digits);
                              })()}
                              onChange={(e) => {
                                const digits = e.target.value.replace(/\D/g, '');
                                setTempBudget(digits);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  const value = Number(String(tempBudget).replace(/\D/g,'') || '0') / 100;
                                  await analysisPlannerService.savePlanner(selectedClient, selectedProduct, a.name, { plannedBudget: value });
                                  setAudiences(prev => prev.map(x => x.name === a.name ? { ...x, plannedBudget: value } : x));
                                  setEditingBudget(null);
                                } else if (e.key === 'Escape') {
                                  setEditingBudget(null);
                                }
                              }}
                              className="pl-7 pr-2 py-1 rounded bg-slate-800/70 border border-slate-600/50 text-slate-200 w-40 text-right"
                              placeholder="0,00"
                            />
                          </div>
                          <button
                            className="px-2 py-1 rounded bg-emerald-600/80 hover:bg-emerald-600 text-white"
                            onClick={async () => {
                              const value = Number(String(tempBudget).replace(/\D/g,'') || '0') / 100;
                              await analysisPlannerService.savePlanner(selectedClient, selectedProduct, a.name, { plannedBudget: value });
                              setAudiences(prev => prev.map(x => x.name === a.name ? { ...x, plannedBudget: value } : x));
                              setEditingBudget(null);
                            }}
                          >Salvar</button>
                          <button className="px-2 py-1 rounded bg-slate-700/60 hover:bg-slate-700 text-slate-100" onClick={() => setEditingBudget(null)}>Cancelar</button>
                        </div>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Tooltip Portal global para ficar acima de tudo */}
      {tooltip.visible && createPortal(
        <div
          className="suggestion-tooltip"
          style={{ 
            position: 'fixed', 
            left: tooltip.x, 
            top: tooltip.y, 
            zIndex: 2147483647,
            transform: 'translate3d(0, 0, 0)',
            isolation: 'isolate',
            contain: 'layout',
            backfaceVisibility: 'hidden',
            perspective: '1000px',
            willChange: 'transform',
            pointerEvents: 'none'
          }}
        >
          <div className={`min-w-[240px] max-w-[320px] text-xs rounded-lg shadow-xl border ${
            tooltip.color==='emerald' ? 'border-emerald-500/40' : tooltip.color==='blue' ? 'border-blue-500/40' : 'border-slate-600/40'
          }`}>
            <div className="p-3 bg-slate-900 rounded-lg border-slate-600/40">
              <div className="text-slate-200 font-semibold mb-1">Sugestão para este público</div>
              <div className="text-slate-300 leading-relaxed whitespace-pre-line">{tooltip.content}</div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PendingAudiencesStatus;


