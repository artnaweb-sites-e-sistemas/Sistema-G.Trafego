import React from 'react';
import { X, AlertTriangle, Clock, RefreshCw, Info } from 'lucide-react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage?: string;
}

const RateLimitModal: React.FC<RateLimitModalProps> = ({ isOpen, onClose, errorMessage }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-red-500/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-200">
                Limite de Requisições Atingido
              </h3>
              <p className="text-sm text-slate-400">
                Meta Ads API
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-300 font-medium mb-1">Erro Técnico:</p>
                  <p className="text-red-400 text-xs font-mono break-all">
                    {errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-slate-700/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-slate-300 font-medium">1</span>
              </div>
              <div>
                <p className="text-slate-200 font-medium text-sm">
                  O que aconteceu?
                </p>
                <p className="text-slate-400 text-sm">
                  Você atingiu o limite de requisições simultâneas do Meta Ads. Isso é um mecanismo de proteção da API.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-slate-700/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-slate-300 font-medium">2</span>
              </div>
              <div>
                <p className="text-slate-200 font-medium text-sm">
                  Por que acontece?
                </p>
                <p className="text-slate-400 text-sm">
                  Muitas requisições foram feitas em um curto período. O Meta Ads limita o número de chamadas para proteger seus servidores.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-slate-700/50 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs text-slate-300 font-medium">3</span>
              </div>
              <div>
                <p className="text-slate-200 font-medium text-sm">
                  Como resolver?
                </p>
                <p className="text-slate-400 text-sm">
                  Aguarde alguns minutos e tente novamente. O sistema usa cache para reduzir requisições.
                </p>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-300 font-medium mb-1">💡 Dica:</p>
                <p className="text-blue-400">
                  Dados recentes são carregados instantaneamente do cache. Use o botão "Atualizar" apenas quando precisar de dados frescos.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-slate-700/60 bg-slate-800/30">
          <div className="flex items-center gap-2 text-slate-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Aguarde 2-5 minutos</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};

export default RateLimitModal;
