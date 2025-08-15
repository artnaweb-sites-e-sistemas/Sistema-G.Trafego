import React, { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { type BenchmarkResults } from '../services/aiBenchmarkService';
import AnalysisPlanner from './AnalysisPlanner';
import { metricsService, type MetricData } from '../services/metricsService';

interface InsightsSectionProps {
  selectedProduct: string;
  results?: BenchmarkResults | null;
  selectedClient?: string;
  selectedMonth?: string;
  selectedAudience?: string;
  isFacebookConnected?: boolean;
  metaAdsUserId?: string;
}

const InsightsSection: React.FC<InsightsSectionProps> = ({ selectedProduct, results, selectedClient = '', selectedMonth = '', selectedAudience = '', isFacebookConnected = false, metaAdsUserId = '' }) => {

  const [autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState<boolean>(false);

  // Gerar sugestões simples baseadas nas métricas reais do período/escopo atual
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedClient || selectedClient === 'Selecione um cliente' || !selectedProduct || selectedProduct === 'Todos os Produtos') {
        setAutoSuggestions([]);
        return;
      }
      setLoadingSuggestions(true);
      try {
        const data = await metricsService.getMetrics(
          selectedMonth || (localStorage.getItem('selectedMonth') || ''),
          selectedClient,
          selectedProduct,
          selectedAudience || 'Todos os Públicos'
        );

        if (cancelled) return;

        const suggestions = generateSuggestions(data);
        setAutoSuggestions(suggestions);
      } catch (e) {
        if (!cancelled) setAutoSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedClient, selectedProduct, selectedAudience, selectedMonth]);

  return (
    <div data-section="insights" className="relative overflow-hidden bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-xl">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-64 h-64 rounded-full bg-gradient-to-br from-yellow-500/10 to-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative p-6 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                <Lightbulb className="h-5 w-5 text-slate-900" />
              </div>
            </div>
            <div className="flex flex-col justify-center h-11">
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">
                Insights e Sugestões
              </h3>
            </div>
          </div>
          {/* Canto direito: Exibir produto/cliente em vez de confiança/simulado */}
          {selectedProduct && (
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <span className="hidden sm:inline">Produto:</span>
              <span className="text-slate-100 font-semibold">[{selectedProduct}]</span>
              {selectedClient && selectedClient !== 'Selecione um cliente' && (
                <span className="text-slate-400">- {selectedClient}</span>
              )}
            </div>
          )}
        </div>

        {/* Planejador de análise */}
        {selectedProduct && selectedProduct !== 'Todos os Produtos' && (
          <AnalysisPlanner
            selectedClient={selectedClient}
            selectedMonth={selectedMonth}
            selectedProduct={selectedProduct}
            selectedAudience={selectedAudience}
            isFacebookConnected={isFacebookConnected}
            metaAdsUserId={metaAdsUserId}
          />
        )}

        {/* Sugestões automáticas simples (com base nas métricas reais) */}
        {(autoSuggestions.length > 0 || loadingSuggestions) && (
          <div className="bg-slate-900/40 border border-slate-700/50 rounded-xl p-4 mb-4">
            <h5 className="text-sm font-semibold text-amber-200 mb-3 flex items-center">
              <span className="w-2 h-2 bg-amber-400 rounded-full mr-2"></span>
              Sugestões automáticas
            </h5>
            {loadingSuggestions ? (
              <p className="text-sm text-slate-400">Gerando sugestões…</p>
            ) : (
              <ul className="space-y-2">
                {autoSuggestions.map((s, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start">
                    <span className="text-amber-400 mr-3 mt-0.5">•</span>
                    <span className="leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Container de “Insights Gerados” removido conforme solicitado */}
      </div>
    </div>
  );
};

export default InsightsSection;

// ------- Helpers -------
function generateSuggestions(metrics: MetricData[]): string[] {
  if (!metrics || metrics.length === 0) return [];
  const ordered = [...metrics].sort((a, b) => a.date.localeCompare(b.date));
  const last7 = ordered.slice(-7);
  const prev7 = ordered.slice(-14, -7);

  const n = (v: any) => (typeof v === 'number' ? v : Number(v || 0)) || 0;
  const sum = (arr: number[]) => arr.reduce((s, v) => s + v, 0);

  const ctr = (data: MetricData[]) => {
    const clicks = sum(data.map(d => n(d.clicks)));
    const impressions = sum(data.map(d => n(d.impressions)));
    return impressions > 0 ? (clicks / impressions) * 100 : 0;
  };
  const spend = (data: MetricData[]) => sum(data.map(d => n(d.investment)));
  const leads = (data: MetricData[]) => sum(data.map(d => n(d.leads)));
  const sales = (data: MetricData[]) => sum(data.map(d => n(d.sales)));
  const freq = (data: MetricData[]) => {
    const vals = data.map(d => n((d as any).frequency)).filter(v => v > 0);
    return vals.length ? sum(vals) / vals.length : 0;
  };
  const cprApprox = (data: MetricData[]) => {
    const cps = data.map(d => n((d as any).cpr)).filter(v => v > 0);
    if (cps.length) return sum(cps) / cps.length;
    const s = spend(data);
    const l = leads(data);
    const sa = sales(data);
    if (sa > 0) return s / sa;
    if (l > 0) return s / l;
    return 0;
  };

  const lastCtr = ctr(last7);
  const prevCtr = prev7.length ? ctr(prev7) : lastCtr;
  const lastCpr = cprApprox(last7);
  const prevCpr = prev7.length ? cprApprox(prev7) : lastCpr;
  const lastSpend = spend(last7);
  const lastLeads = leads(last7);
  const lastSales = sales(last7);
  const lastFreq = freq(last7);

  const ctrChange = prevCtr === 0 ? 0 : ((lastCtr - prevCtr) / prevCtr) * 100;
  const cprChange = prevCpr === 0 ? 0 : ((lastCpr - prevCpr) / prevCpr) * 100;

  const suggestions: string[] = [];

  if (cprChange > 15) {
    suggestions.push(`CPR aumentou ${cprChange.toFixed(0)}% na última semana. Priorize orçamento nos públicos/anúncios com melhor performance e reduza/pausa os de pior resultado.`);
  }
  if (ctrChange < -10) {
    suggestions.push(`CTR caiu ${Math.abs(ctrChange).toFixed(0)}%. Renove criativos (ângulos, copies, criativos), teste novas variações e revise segmentações.`);
  }
  if (lastSpend > 0 && lastLeads === 0 && lastSales === 0) {
    suggestions.push('Gasto sem resultados recentes. Verifique o objetivo da campanha, eventos de conversão e se o tracking está ativo.');
  }
  if (lastFreq >= 2.5 && ctrChange <= 0) {
    suggestions.push('Frequência elevada com queda/estabilidade de CTR. Indício de fadiga — troque criativos e amplie o alcance do público.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Desempenho estável. Considere escalar gradualmente (+10–20%) nos ativos com melhor CPR e CTR.');
  }
  return suggestions;
}