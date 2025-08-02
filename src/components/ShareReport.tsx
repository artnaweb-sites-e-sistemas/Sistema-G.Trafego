import React, { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, ExternalLink, Link, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { shareService, ShareLink } from '../services/shareService';
import { createPortal } from 'react-dom';

interface ShareReportProps {
  selectedAudience: string;
  selectedProduct: string;
  selectedClient: string;
  selectedMonth: string;
  hasGeneratedLinks?: boolean;
}

const ShareReport: React.FC<ShareReportProps> = ({
  selectedAudience,
  selectedProduct,
  selectedClient,
  selectedMonth,
  hasGeneratedLinks = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<ShareLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasLinkForCurrentSelection, setHasLinkForCurrentSelection] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Verificar se já existe um link para a seleção atual
  useEffect(() => {
    const checkExistingLink = () => {
      if (!selectedAudience || selectedAudience === 'Todos os Públicos') {
        setHasLinkForCurrentSelection(false);
        return;
      }

      const allLinks = shareService.getAllShareLinks();
      const existingLink = allLinks.find(link => {
        try {
          const urlParams = new URLSearchParams(link.originalUrl.split('?')[1] || '');
          const linkAudience = urlParams.get('audience');
          const linkProduct = urlParams.get('product');
          const linkClient = urlParams.get('client');
          const linkMonth = urlParams.get('month');

          return linkAudience === selectedAudience &&
                 linkProduct === selectedProduct &&
                 linkClient === selectedClient &&
                 linkMonth === selectedMonth;
        } catch {
          return false;
        }
      });

      setHasLinkForCurrentSelection(!!existingLink);
      
      // Se encontrou um link existente, carregar ele
      if (existingLink) {
        setGeneratedLink(existingLink);
      }
    };

    checkExistingLink();
  }, [selectedAudience, selectedProduct, selectedClient, selectedMonth]);

  const generateShareLink = async () => {
    setIsGenerating(true);
    
    try {
      // Simular geração de link (em produção, isso seria uma chamada para a API)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Criar link curto usando o serviço
      const shareLink = shareService.createShareLink({
        audience: selectedAudience,
        product: selectedProduct,
        client: selectedClient,
        month: selectedMonth
      });
      
      setGeneratedLink(shareLink);
      setHasLinkForCurrentSelection(true);
      
      // Emitir evento para notificar que um link foi gerado
      window.dispatchEvent(new CustomEvent('linkGenerated', {
        detail: { shareLink }
      }));
    } catch (error) {
      console.error('Erro ao gerar link:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedLink) return;
    
    try {
      const shortUrl = shareService.getShortUrl(generatedLink.shortCode);
      await navigator.clipboard.writeText(shortUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
    }
  };

  const openShareLink = () => {
    if (!generatedLink) return;
    
    const shortUrl = shareService.getShortUrl(generatedLink.shortCode);
    window.open(shortUrl, '_blank');
  };

  const isDisabled = selectedAudience === 'Todos os Públicos' ||
                    selectedAudience === '' ||
                    selectedProduct === 'Todos os Produtos' || 
                    selectedProduct === '' ||
                    selectedClient === 'Todos os Clientes' ||
                    selectedClient === '';

  // Modal Component usando Portal
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
            setIsOpen(false);
          }
        }}
      >
        <div 
          className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[90vh] overflow-y-auto border border-slate-700"
          style={{
            animation: 'modalSlideIn 0.3s ease-out'
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-700 sticky top-0 bg-slate-900 rounded-t-2xl">
            <h2 className="text-xl font-semibold text-slate-100">Compartilhar Relatório</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-800"
              aria-label="Fechar modal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Informações do Relatório */}
            <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-600/30 backdrop-blur-sm">
              <h3 className="text-slate-100 font-medium mb-3">Relatório Selecionado</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Público:</span>
                  <span className="text-slate-200 font-medium">{selectedAudience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Produto:</span>
                  <span className="text-slate-200 font-medium">{selectedProduct}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="text-slate-200 font-medium">{selectedClient}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Período:</span>
                  <span className="text-slate-200 font-medium">{selectedMonth}</span>
                </div>
              </div>
            </div>

            {/* Status do Link */}
            {hasLinkForCurrentSelection && (
              <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span className="text-green-300 font-medium">Link já existe para esta seleção!</span>
                </div>
                <p className="text-green-400 text-sm mt-1">
                  Um link personalizado já foi gerado para este público, produto e período.
                </p>
              </div>
            )}

            {/* Geração do Link */}
            {!generatedLink ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-slate-400 mb-4">Gere um link personalizado para compartilhar este relatório</p>
                  <button
                    onClick={generateShareLink}
                    disabled={isGenerating}
                    className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center space-x-2 mx-auto ${
                      isGenerating
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        <span>Gerando...</span>
                      </>
                    ) : (
                      <>
                        <Link className="w-4 h-4" />
                        <span>Gerar Link de Compartilhamento</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Link Gerado */}
                <div className="bg-green-900/20 border border-green-500/30 rounded-xl p-4 backdrop-blur-sm">
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <h3 className="text-green-300 font-medium">Link Gerado com Sucesso!</h3>
                  </div>
                  
                  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/50 mb-3">
                    <p className="text-sm text-slate-400 mb-1">Link de Compartilhamento:</p>
                    <p className="text-sm text-slate-200 font-mono break-all">
                      {shareService.getShortUrl(generatedLink.shortCode)}
                    </p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={copyToClipboard}
                      className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                        copied
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                      }`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copiar Link</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={openShareLink}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir</span>
                    </button>
                  </div>
                </div>

                {/* Gerar Novo Link */}
                <div className="text-center">
                  <button
                    onClick={() => {
                      setGeneratedLink(null);
                      setCopied(false);
                      setHasLinkForCurrentSelection(false);
                    }}
                    className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
                  >
                    Gerar Novo Link
                  </button>
                </div>

                {/* Histórico de Links */}
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-slate-100 font-medium">Links Compartilhados</h4>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                    >
                      {showHistory ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  
                  {showHistory && (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {shareService.getAllShareLinks().map((link) => (
                        <div key={link.shortCode} className="bg-slate-800/60 rounded-lg p-3 border border-slate-600/50 backdrop-blur-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">
                                {shareService.getShortUrl(link.shortCode)}
                              </p>
                              <p className="text-xs text-slate-400">
                                Criado em {new Date(link.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <button
                              onClick={() => {
                                shareService.deleteLink(link.shortCode);
                                // Verificar se o link deletado era o atual
                                if (generatedLink && generatedLink.shortCode === link.shortCode) {
                                  setGeneratedLink(null);
                                  setHasLinkForCurrentSelection(false);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-1 transition-colors"
                              title="Excluir link"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>,
      document.body
    );
  };

  return (
    <>
      <button
        onClick={() => {
          if (!isDisabled) {
            setIsOpen(true);
          }
        }}
        disabled={isDisabled}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
          isDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed opacity-50'
            : hasLinkForCurrentSelection
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
        }`}
        title={isDisabled ? 'Selecione um público específico para compartilhar' : 'Compartilhar Relatório'}
      >
        <Share2 className="w-5 h-5" />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          isDisabled
            ? 'bg-gray-500'
            : hasLinkForCurrentSelection
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : 'bg-red-500 shadow-lg shadow-red-500/50'
        }`}></div>
      </button>

      <Modal />
    </>
  );
};

export default ShareReport; 