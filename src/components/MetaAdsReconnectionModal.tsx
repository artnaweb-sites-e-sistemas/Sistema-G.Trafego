import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, Facebook, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface MetaAdsReconnectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReconnect: () => void;
  errorMessage?: string;
}

const MetaAdsReconnectionModal: React.FC<MetaAdsReconnectionModalProps> = ({
  isOpen,
  onClose,
  onReconnect,
  errorMessage
}) => {
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleReconnect = async () => {
    setIsReconnecting(true);
    try {
      await onReconnect();
      onClose();
    } catch (error) {
      console.error('Erro durante reconexão:', error);
    } finally {
      setIsReconnecting(false);
    }
  };

  const Modal = () => {
    if (!mounted || !isOpen) return null;

    return createPortal(
      <div 
        className="fixed inset-0 z-[999999] flex items-center justify-center p-4"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
      >
        <div 
          className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto border border-slate-600/40"
          style={{
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-600/40 sticky top-0 bg-slate-800 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-yellow-900/30 rounded-full border border-yellow-600/40">
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-100">
                  Reconexão Necessária
                </h3>
                <p className="text-sm text-slate-400">
                  Meta Ads desconectado
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="flex items-start space-x-3">
              <Facebook className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-slate-300 mb-3">
                  Detectamos que sua conexão com o Meta Ads foi interrompida ou expirou. 
                  Isso pode acontecer por:
                </p>
                <ul className="text-sm text-slate-400 space-y-2 mb-4">
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>Limite de requisições da API atingido</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>Token de acesso expirado</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-blue-400">•</span>
                    <span>Problemas temporários de conectividade</span>
                  </li>
                </ul>
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                <p className="text-sm text-red-300">
                  <strong>Erro detectado:</strong> {errorMessage}
                </p>
              </div>
            )}

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <p className="text-sm text-blue-300">
                <strong>💡 Solução:</strong> Reconecte sua conta do Meta Ads para 
                sincronizar os dados e continuar usando todas as funcionalidades.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-slate-600/40 bg-slate-700/20 rounded-b-2xl">
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isReconnecting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Facebook className="w-4 h-4" />
              )}
              <span className="whitespace-nowrap">
                {isReconnecting ? 'Reconectando...' : 'Reconectar Meta Ads'}
              </span>
            </button>
            
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-600/40 text-slate-300 rounded-lg hover:bg-slate-700/50 hover:text-slate-100 transition-colors font-medium"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return <Modal />;
};

export default MetaAdsReconnectionModal;
