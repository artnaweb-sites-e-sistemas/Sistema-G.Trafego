import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FileText, X, Check } from 'lucide-react';
import {
  analysisHistoryService,
  ANALYSIS_CHECKBOX_OPTIONS,
  type AnalysisHistoryEntry
} from '../services/analysisHistoryService';

interface AnalysisHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  client: string;
  product: string;
  audience?: string;
  metaAdsUserId?: string;
  cpaTarget?: number;
  /** Quando definido, abre em modo edição */
  entry?: AnalysisHistoryEntry;
}

const AnalysisHistoryModal: React.FC<AnalysisHistoryModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  client,
  product,
  audience = '',
  metaAdsUserId,
  cpaTarget = 0,
  entry
}) => {
  const isEdit = !!entry;
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [description, setDescription] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const buildDescription = useCallback(() => {
    const opts = ANALYSIS_CHECKBOX_OPTIONS.filter(o => selectedOptions.has(o.value) && o.defaultText);
    if (opts.length === 0) return '';
    const texts = opts.map(opt => {
      let t = opt.defaultText;
      if (cpaTarget > 0 && (opt.value === 'escala_campanha' || opt.value === 'pacing_desalinhado')) {
        t = t.replace('CPA ideal', `CPA ideal (R$ ${cpaTarget.toFixed(2).replace('.', ',')})`);
      }
      return t;
    });
    return texts.join('\n\n');
  }, [selectedOptions, cpaTarget]);

  useEffect(() => {
    if (isOpen) {
      if (entry) {
        const opts = new Set(entry.actionType.split(',').filter(Boolean));
        setSelectedOptions(opts);
        setDescription(entry.description || '');
      } else {
        setSelectedOptions(new Set());
        setDescription('');
      }
    }
  }, [isOpen, entry]);

  useEffect(() => {
    setDescription(buildDescription());
  }, [buildDescription]);

  const toggleOption = (value: string) => {
    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const handleSave = async () => {
    if (!description.trim()) {
      alert('Selecione ao menos uma opção ou descreva o que foi feito nesta análise.');
      return;
    }

    const labels = ANALYSIS_CHECKBOX_OPTIONS
      .filter(o => selectedOptions.has(o.value))
      .map(o => o.label);
    const actionLabel = labels.length > 0 ? labels.join(', ') : 'Outro';
    const actionType = Array.from(selectedOptions).join(',') || 'outro';

    setIsSaving(true);
    try {
      if (isEdit && entry) {
        await analysisHistoryService.updateEntry(entry.id, {
          actionType,
          actionLabel,
          description: description.trim()
        });
      } else {
        const adSetId = localStorage.getItem('selectedAdSetId') || undefined;
        await analysisHistoryService.addEntry(
          client,
          product,
          audience || undefined,
          actionType,
          actionLabel,
          description.trim(),
          metaAdsUserId,
          adSetId
        );
      }
      onSaved();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar histórico:', error);
      alert('Erro ao salvar. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)'
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">{isEdit ? 'Editar análise' : 'Registrar análise'}</h2>
              <p className="text-xs text-slate-400">O que foi feito nesta análise?</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">O que foi feito nesta análise?</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ANALYSIS_CHECKBOX_OPTIONS.map((opt) => {
                const isChecked = selectedOptions.has(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleOption(opt.value)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-left text-sm transition-all duration-200 border ${
                      isChecked
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                        : 'bg-slate-700/30 border-slate-600/60 text-slate-300 hover:bg-slate-700/50 hover:border-slate-500'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 bg-transparent'
                    }`}>
                      {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </span>
                    <span className="break-words">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descrição (visível ao cliente)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva de forma clara o que foi feito... O cliente verá este texto no relatório."
              rows={6}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 resize-none transition-all"
            />
          </div>
        </div>

        <div className="p-6 border-t border-slate-700 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !description.trim()}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
          >
            {isSaving ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar e marcar como analisado'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AnalysisHistoryModal;
