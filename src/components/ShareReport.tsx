import React, { useState, useEffect } from 'react';
import { Share2, Copy, CheckCircle, ExternalLink, Link, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { shareService, ShareLink } from '../services/shareService';
import { createPortal } from 'react-dom';
import { MetricData, metricsService } from '../services/metricsService';

interface ShareReportProps {
  selectedAudience: string;
  selectedProduct: string;
  selectedClient: string;
  selectedMonth: string;
  hasGeneratedLinks?: boolean;
  metrics: MetricData[];
  monthlyDetailsValues?: { agendamentos: number; vendas: number };
}

const ShareReport: React.FC<ShareReportProps> = ({
  selectedAudience,
  selectedProduct,
  selectedClient,
  selectedMonth,
  hasGeneratedLinks = false,
  metrics,
  monthlyDetailsValues = { agendamentos: 0, vendas: 0 }
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<ShareLink | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [hasLinkForCurrentSelection, setHasLinkForCurrentSelection] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Verificar se já existe um link para a seleção atual
  useEffect(() => {
    const checkExistingLink = () => {
      if (!selectedProduct || selectedProduct === 'Todos os Produtos') {
        setHasLinkForCurrentSelection(false);
        setGeneratedLink(null);
        return;
      }

      const allLinks = shareService.getAllShareLinks();
      const existingLink = allLinks.find(link => {
        try {
          const urlParams = new URLSearchParams(link.originalUrl.split('?')[1] || '');
          const linkProduct = urlParams.get('product');
          const linkClient = urlParams.get('client');
          const linkMonth = urlParams.get('month');

          return linkProduct === selectedProduct &&
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
        } else {
        // Se não encontrou, limpar o link gerado (relatório foi excluído)
        setGeneratedLink(null);
        }
    };

    checkExistingLink();
  }, [selectedProduct, selectedClient, selectedMonth]);

  // CORREÇÃO: Escutar evento de exclusão de relatório
  useEffect(() => {
    const handleReportDeleted = (event: CustomEvent) => {
      const { shortCode } = event.detail;
      
      // Se o relatório excluído é o mesmo que está sendo exibido, limpar o estado
      if (generatedLink && generatedLink.shortCode === shortCode) {
        setGeneratedLink(null);
        setHasLinkForCurrentSelection(false);
        }
    };

    window.addEventListener('reportDeleted', handleReportDeleted as EventListener);
    
    return () => {
      window.removeEventListener('reportDeleted', handleReportDeleted as EventListener);
    };
  }, [generatedLink]);

  const generateShareLink = async () => {
    setIsGenerating(true);
    try {
      // Salvar métricas atuais no Firebase
      if (metrics && metrics.length > 0) {
        for (const metric of metrics) {
          await metricsService.addMetric(metric);
        }
      }
      
      // Salvar detalhes mensais atuais no Firebase (vinculado ao cliente, produto e mês)
      if (monthlyDetailsValues && selectedProduct && selectedProduct !== 'Todos os Produtos' && selectedClient && selectedClient !== 'Todos os Clientes') {
        await metricsService.saveMonthlyDetails({
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient,
          agendamentos: monthlyDetailsValues.agendamentos,
          vendas: monthlyDetailsValues.vendas,
          investment: monthlyDetailsValues.investment || 0 // Adicionar investimento se disponível
        });
      }
      
      // Rate limit removido - sem pausa
      
      // CORREÇÃO: Criar link curto usando o serviço com valores dos detalhes mensais
      const shareLink = shareService.createShareLink({
        product: selectedProduct,
        client: selectedClient,
        month: selectedMonth,
        monthlyDetails: monthlyDetailsValues
      });
      
      setGeneratedLink(shareLink);
      setHasLinkForCurrentSelection(true);
      
      // Emitir evento para notificar que um link foi gerado
      window.dispatchEvent(new CustomEvent('linkGenerated', {
        detail: { shareLink }
      }));
    } catch (error) {
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
      }
  };

  const openShareLink = () => {
    if (generatedLink) {
      window.open(shareService.getShortUrl(generatedLink.shortCode), '_blank');
    }
  };

  const updateShareLink = async () => {
    if (!generatedLink) return;
    setIsUpdating(true);
    
    try {
      // Sincronizar dados mais recentes do Meta Ads e salvar no Firebase
      let syncedSuccessfully = false;
      try {
        const campaignId = localStorage.getItem('selectedCampaignId') || undefined;
        await metricsService.syncMetaAdsData(selectedMonth, campaignId, selectedClient, selectedProduct, selectedAudience);
        syncedSuccessfully = true;
      } catch (syncError) {
        // Erro na sincronização - continuar com dados existentes
        }

      // Se a sincronização falhou, tentar salvar as métricas existentes
      if (!syncedSuccessfully && metrics && metrics.length > 0) {
        for (const metric of metrics) {
          // Se já existe um id, atualiza; senão, adiciona
          if (metric.id) {
            await metricsService.updateMetric(metric.id, metric);
          } else {
            await metricsService.addMetric(metric);
          }
        }
      }
    
      // Atualizar detalhes mensais no Firebase (vinculado ao cliente, produto e mês)
      if (monthlyDetailsValues && selectedProduct && selectedProduct !== 'Todos os Produtos' && selectedClient && selectedClient !== 'Todos os Clientes') {
        await metricsService.saveMonthlyDetails({
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient,
          agendamentos: monthlyDetailsValues.agendamentos,
          vendas: monthlyDetailsValues.vendas
        });
      }
      
      // Rate limit removido - sem pausa
      
      // Limpar cache específico de relatórios públicos para forçar atualização
      
      // Forçar limpeza do cache via localStorage para comunicação entre abas
      const cacheKey = `public_metrics_${selectedMonth}_${selectedClient}_${selectedProduct}_${selectedAudience || 'Todos os Públicos'}`;
      localStorage.setItem('clearPublicCache', JSON.stringify({
        key: cacheKey,
        timestamp: Date.now(),
        reason: 'shareReportUpdate'
      }));
      
      // Também tentar limpar diretamente se disponível
      try {
        if (typeof window !== 'undefined' && (window as any).PublicReportCache) {
          const cache = (window as any).PublicReportCache.getInstance();
          
          // Limpar cache específico para este relatório
          cache.clearSpecificCache(selectedMonth, selectedClient, selectedProduct, selectedAudience || 'Todos os Públicos');
        }
      } catch (error) {
        // Erro ao limpar cache diretamente - usar localStorage
      }
      
      // Atualizar o link com os parâmetros atuais e valores dos detalhes mensais
      const updatedLink = shareService.updateShareLink(generatedLink.shortCode, {
        product: selectedProduct,
        client: selectedClient,
        month: selectedMonth,
        monthlyDetails: monthlyDetailsValues
      });
      
      if (updatedLink) {
        setGeneratedLink(updatedLink);

        // Limpar cache específico para dados públicos
        metricsService.clearPublicCache(selectedMonth, selectedClient, selectedProduct);
        
        // CORREÇÃO: Notificar página pública sobre atualização de forma mais robusta
        const eventDetail = { 
          type: 'insights', 
          timestamp: Date.now(), 
          source: 'shareReport',
          client: selectedClient,
          product: selectedProduct,
          month: selectedMonth,
          forceUpdate: true // Flag para forçar atualização
        };
        
        // Salvar no localStorage
        localStorage.setItem('metaAdsDataRefreshed', JSON.stringify(eventDetail));
        
        // Disparar evento customizado para notificar outras abas
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'metaAdsDataRefreshed',
          newValue: JSON.stringify(eventDetail),
          url: window.location.href
        }));
        
        // Disparar evento customizado adicional para garantir que seja capturado
        window.dispatchEvent(new CustomEvent('publicReportUpdate', {
          detail: eventDetail
        }));

        toast.success('Relatório atualizado com sucesso!');
      } else {
        toast.error('Erro ao atualizar relatório');
      }
    } catch (error) {
      toast.error('Erro ao atualizar relatório');
    } finally {
      setIsUpdating(false);
    }
  };

  const isDisabled = selectedProduct === 'Todos os Produtos' || 
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
                <div className="flex flex-col">
                  <span className="text-slate-400">Produto:</span>
                  <span className="text-slate-200 font-medium">{selectedProduct}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400">Cliente:</span>
                  <span className="text-slate-200 font-medium">{selectedClient}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400">Período:</span>
                  <span className="text-slate-200 font-medium">{selectedMonth}</span>
                </div>
              </div>
            </div>

            {/* Geração do Link */}
            {!generatedLink ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-slate-400 mb-4">Gere um link personalizado para compartilhar o relatório desta campanha</p>
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
                        <span>Gerar Link da Campanha</span>
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

                  {/* Botão Atualizar Relatório */}
                  <div className="mt-3">
                    <button
                      onClick={updateShareLink}
                      disabled={isUpdating}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 ${
                        isUpdating
                          ? 'bg-orange-700 text-orange-300 cursor-not-allowed'
                          : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white'
                      }`}
                    >
                      {isUpdating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          <span>Atualizando...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          <span>Atualizar Relatório</span>
                        </>
                      )}
                    </button>
                    <p className="text-xs text-slate-400 mt-2 text-center">
                      Última sincronização: {generatedLink?.updatedAt 
                        ? `${new Date(generatedLink.updatedAt).toLocaleDateString('pt-BR')} às ${new Date(generatedLink.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                        : `${new Date(generatedLink?.createdAt || new Date()).toLocaleDateString('pt-BR')} às ${new Date(generatedLink?.createdAt || new Date()).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                      }
                    </p>
                  </div>
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
        title={isDisabled ? 'Selecione um produto específico para compartilhar' : 'Compartilhar Relatório'}
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