import React, { useEffect, useState } from 'react';
import { History, ChevronDown, ChevronUp, Calendar, FileText, Pencil, Trash2 } from 'lucide-react';
import { analysisHistoryService, type AnalysisHistoryEntry } from '../services/analysisHistoryService';
import AnalysisHistoryModal from './AnalysisHistoryModal';
import dayjs from 'dayjs';

interface AnalysisHistorySectionProps {
  selectedClient: string;
  selectedProduct: string;
  selectedAudience?: string;
  metaAdsUserId?: string;
  /** Quando definido, usa listForReportPublic (relatório compartilhado) */
  ownerId?: string;
  refreshTrigger?: number;
}

const AnalysisHistorySection: React.FC<AnalysisHistorySectionProps> = ({
  selectedClient,
  selectedProduct,
  selectedAudience = '',
  metaAdsUserId,
  ownerId,
  refreshTrigger = 0
}) => {
  const [entries, setEntries] = useState<AnalysisHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [editingEntry, setEditingEntry] = useState<AnalysisHistoryEntry | null>(null);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener('analysisUpdated', handler);
    return () => window.removeEventListener('analysisUpdated', handler);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedClient || selectedClient === 'Selecione um cliente' || !selectedProduct || selectedProduct === 'Todas as Campanhas') {
        setEntries([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = ownerId
          ? await analysisHistoryService.listForReportPublic(
              selectedClient,
              selectedProduct,
              selectedAudience || undefined,
              ownerId
            )
          : await analysisHistoryService.listForCampaign(
              selectedClient,
              selectedProduct,
              selectedAudience || undefined,
              metaAdsUserId
            );
        if (!cancelled) setEntries(list);
      } catch (e) {
        if (!cancelled) setEntries([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedClient, selectedProduct, selectedAudience, metaAdsUserId, ownerId, refreshTrigger, refreshKey]);

  const canEdit = !ownerId;
  const triggerRefresh = () => {
    window.dispatchEvent(new Event('analysisUpdated'));
    setRefreshKey(k => k + 1);
  };

  const handleDelete = async (entry: AnalysisHistoryEntry) => {
    if (!confirm('Excluir esta análise? A alteração será refletida no relatório do cliente.')) return;
    try {
      await analysisHistoryService.deleteEntry(entry.id);
      triggerRefresh();
    } catch (e) {
      console.error('Erro ao excluir:', e);
      alert('Erro ao excluir. Tente novamente.');
    }
  };

  if (entries.length === 0 && !loading) return null;

  return (
    <div className="bg-slate-900/70 border border-slate-700/50 rounded-2xl shadow-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center border border-violet-500/30">
            <History className="w-5 h-5 text-violet-400" />
          </div>
          <div className="text-left">
            <h4 className="text-slate-100 font-semibold">Histórico de Análise</h4>
            <p className="text-xs text-slate-400">
              {entries.length} {entries.length === 1 ? 'registro' : 'registros'} desta campanha
            </p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-slate-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-slate-400" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-slate-700/50">
          {loading ? (
            <div className="p-8 text-center text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500 mx-auto mb-2" />
              <p className="text-sm">Carregando histórico...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-700/50 max-h-80 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-5 hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center mt-0.5">
                      <FileText className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30">
                            {entry.actionLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                            <Calendar className="w-3 h-3" />
                            {dayjs(entry.createdAt).format('DD/MM/YYYY [às] HH:mm')}
                          </span>
                        </div>
                        {canEdit && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setEditingEntry(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-slate-700/50"
                              title="Editar"
                              aria-label="Editar"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700/50"
                              title="Excluir"
                              aria-label="Excluir"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {entry.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {canEdit && (
        <AnalysisHistoryModal
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          onSaved={triggerRefresh}
          client={selectedClient}
          product={selectedProduct}
          audience={selectedAudience || undefined}
          metaAdsUserId={metaAdsUserId}
          entry={editingEntry || undefined}
        />
      )}
    </div>
  );
};

export default AnalysisHistorySection;
