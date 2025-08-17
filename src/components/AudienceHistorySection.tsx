import React, { useEffect, useMemo, useState } from 'react';
import SectionHeader from './ui/SectionHeader';
import { metricsService } from '../services/metricsService';
import { analysisPlannerService } from '../services/analysisPlannerService';
import { metaAdsService } from '../services/metaAdsService';

interface AudienceHistorySectionProps {
  selectedClient: string;
  selectedProduct: string;
}

type SortKey = 'month' | 'adSet' | 'cpm' | 'cpc' | 'ctr' | 'cpr' | 'roiCombined';

const AudienceHistorySection: React.FC<AudienceHistorySectionProps> = ({ selectedClient, selectedProduct }) => {
  const [rows, setRows] = useState<Array<{ month: string; adSet: string; cpm: number; cpc: number; ctr: number; cpr: number; roiCombined: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('month');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusByAdSet, setStatusByAdSet] = useState<Record<string, 'active' | 'inactive'>>({});
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; content: string; variant: 'status' | 'text' }>(
    { visible: false, x: 0, y: 0, content: '', variant: 'status' }
  );
  // Colunas fixas

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!selectedProduct || selectedProduct === 'Todos os Produtos') return;
      setLoading(true);
      try {
        // Carregar TODOS os conjuntos de anúncios relacionados ao produto (campanha) em todos os períodos com gasto
        const data = await metricsService.getProductHistoryAllPeriods(selectedClient, selectedProduct, { onlyPrimaryAdSet: false });
        if (mounted) setRows(data);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [selectedClient, selectedProduct]);

  // 🎯 NOVO: Listener para atualizar ROI/ROAS em tempo real quando ticket médio mudar
  useEffect(() => {
    let updateTimeout: NodeJS.Timeout;
    
    const handleTicketMedioChanged = async (event: CustomEvent) => {
      const { product, client } = event.detail;
      
      // Só atualizar se for o produto e cliente atual
      if (product === selectedProduct && client === selectedClient) {
        setLoading(true);
        try {
          // Recarregar dados do histórico com novo ticket médio
          const data = await metricsService.getProductHistoryAllPeriods(selectedClient, selectedProduct, { onlyPrimaryAdSet: false });
          setRows(data);
          } catch (error) {
          console.error('❌ Erro ao atualizar histórico:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    const handleTicketMedioChangedImmediate = (event: CustomEvent) => {
      const { product, client } = event.detail;
      
      // Só processar se for o produto e cliente atual
      if (product === selectedProduct && client === selectedClient) {
        // Cancelar timeout anterior se existir
        if (updateTimeout) {
          clearTimeout(updateTimeout);
        }
        
        // Agendar atualização com debounce de 300ms para evitar muitas requisições
        updateTimeout = setTimeout(async () => {
          try {
            const data = await metricsService.getProductHistoryAllPeriods(selectedClient, selectedProduct, { onlyPrimaryAdSet: false });
            setRows(data);
            } catch (error) {
            console.error('❌ Erro ao atualizar histórico imediatamente:', error);
          }
          // Não mostrar loading para atualização imediata para manter fluidez
        }, 300);
      }
    };

    window.addEventListener('ticketMedioChanged', handleTicketMedioChanged as EventListener);
    window.addEventListener('ticketMedioChangedImmediate', handleTicketMedioChangedImmediate as EventListener);
    
    return () => {
      window.removeEventListener('ticketMedioChanged', handleTicketMedioChanged as EventListener);
      window.removeEventListener('ticketMedioChangedImmediate', handleTicketMedioChangedImmediate as EventListener);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  }, [selectedProduct, selectedClient]);

  // Carregar status (ativo/inativo) do ad set e campanha
  useEffect(() => {
    let mounted = true;
    const loadStatuses = async () => {
      if (!rows || rows.length === 0) return;
      try {
        const planners = await analysisPlannerService.listPlannersForProduct(selectedClient, selectedProduct);
        const campaignId = localStorage.getItem('selectedCampaignId') || '';
        let campaignActive = true;
        try {
          const campaigns = await metaAdsService.getCampaigns();
          const found = (campaigns || []).find((c: any) => (c.id || c.account_id) === campaignId || c.id === campaignId);
          campaignActive = (found?.status || 'ACTIVE') === 'ACTIVE';
        } catch {}

        const normalize = (s: string) => (s || '')
          .toLowerCase()
          .replace(/\[[^\]]*\]/g, ' ')
          .replace(/\([^)]*\)/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const audienceToAdSetId = new Map<string, string>();
        planners.forEach(p => {
          if (p.audience && p.adSetId) {
            audienceToAdSetId.set(normalize(p.audience), p.adSetId);
          }
        });

        const statusMap: Record<string, 'active' | 'inactive'> = {};
        for (const r of rows) {
          const key = r.adSet;
          let adSetId = audienceToAdSetId.get(normalize(r.adSet));
          let adSetActive = true;
          if (adSetId) {
            try {
              const det = await metaAdsService.getAdSetDetails(adSetId);
              adSetActive = (det?.status || 'ACTIVE') === 'ACTIVE';
            } catch {}
          }
          statusMap[key] = adSetActive && campaignActive ? 'active' : 'inactive';
        }

        if (mounted) setStatusByAdSet(statusMap);
      } catch {}
    };

    loadStatuses();
    return () => { mounted = false; };
  }, [rows, selectedClient, selectedProduct]);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
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
      }
      if (sortBy === 'roiCombined') {
        const toRoiNum = (s?: string) => {
          if (!s) return 0;
          const match = s.match(/([-\d\.]+)%/);
          return match ? parseFloat(match[1]) : 0;
        };
        return (toRoiNum(a.roiCombined) - toRoiNum(b.roiCombined)) * dir;
      }
      const va = (a as any)[sortBy] || 0;
      const vb = (b as any)[sortBy] || 0;
      return (Number(va) - Number(vb)) * dir;
    });
    return copy;
  }, [rows, sortBy, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortDir(key === 'month' ? 'desc' : 'asc');
    }
  };

  const th = (label: string, key: SortKey) => (
    <th
      key={key}
      onClick={() => handleSort(key)}
      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-300 cursor-pointer select-none"
    >
      <div className="inline-flex items-center gap-1">
        <span>{label}</span>
        {sortBy === key && (
          <span className="text-slate-400">{sortDir === 'asc' ? '▲' : '▼'}</span>
        )}
      </div>
    </th>
  );

  const td = (content: React.ReactNode) => (
    <td className="px-4 py-3 text-sm text-slate-200">{content}</td>
  );

  const fmtCurrency = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
  const fmtPct = (v: number) => `${Number(v || 0).toFixed(2)}%`;
  const fmtX = (v: number) => `${Number(v || 0).toFixed(2)}x`;

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <SectionHeader title="Histórico de Público" subtitle={selectedProduct} />
      </div>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500"></div>
            <span className="ml-3 text-slate-300">Carregando...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/40">
                <tr>
                  <th
                    onClick={() => handleSort('month')}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-100 cursor-pointer select-none bg-slate-800/60 border-y border-slate-700/60"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Mês/Ano</span>
                      {sortBy === 'month' && (
                        <span className="text-slate-400">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </div>
                  </th>
                  {th('Conjunto de Anúncios', 'adSet')}
                  {th('CPM', 'cpm')}
                  {th('CPC', 'cpc')}
                  {th('CTR', 'ctr')}
                   {th('CPR', 'cpr')}
                   {th('ROI/ROAS', 'roiCombined')}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {sortedRows.map((r) => (
                  <tr key={`${r.month}-${r.adSet}`} className="hover:bg-slate-800/40">
                    <td className="px-4 py-3 text-sm text-slate-100 font-medium bg-slate-800/30">
                      {r.month}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-200 w-[360px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`inline-block w-2 h-2 rounded-full ${statusByAdSet[r.adSet]==='inactive' ? 'bg-red-500' : 'bg-emerald-500'}`}
                          onMouseEnter={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({ visible: true, x: rect.left + 12, y: rect.top - 6, content: statusByAdSet[r.adSet]==='inactive' ? 'Desativado' : 'Ativado', variant: 'status' });
                          }}
                          onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '' })}
                        />
                        <span
                          className="truncate max-w-[320px]"
                          onMouseEnter={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            setTooltip({ visible: true, x: rect.left, y: rect.top - 6, content: r.adSet, variant: 'text' });
                          }}
                          onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, content: '' })}
                        >
                          {r.adSet}
                        </span>
                      </div>
                    </td>
                    {td(fmtCurrency(r.cpm))}
                    {td(fmtCurrency(r.cpc))}
                    {td(fmtPct(r.ctr))}
                    {td(fmtCurrency(r.cpr))}
                    {td(r.roiCombined || '0% (0.0x)')}
                  </tr>
                ))}
                 {sortedRows.length === 0 && (
                  <tr>
                     <td colSpan={7} className="px-4 py-6 text-center text-slate-400">Nenhum histórico encontrado para este produto.</td>
                  </tr>
                )}
              </tbody>
            </table>
            {tooltip.visible && (
              <div
                style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 2147483647 }}
                className="pointer-events-none"
              >
                <div className={`${tooltip.variant==='text' ? 'min-w-[160px] max-w-[320px]' : 'whitespace-nowrap'} text-xs rounded-lg shadow-xl border border-slate-600/40`}>
                  <div className={`px-3 py-2 rounded-lg bg-slate-900/95 text-slate-200 ${tooltip.variant==='status' ? 'px-2 py-1' : ''}`}>
                    {tooltip.content}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudienceHistorySection;

