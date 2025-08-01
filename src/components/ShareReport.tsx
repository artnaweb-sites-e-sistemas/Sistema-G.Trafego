import React, { useState } from 'react';
import { Share2, Copy, CheckCircle, ExternalLink, Link, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { shareService, ShareLink } from '../services/shareService';

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
                    selectedProduct === 'Todos os Produtos' || 
                    selectedClient === 'Todos os Clientes';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
        className={`p-2 rounded-lg flex items-center justify-center transition-all duration-200 relative ${
          isDisabled
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : hasGeneratedLinks
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
            : hasGeneratedLinks
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : 'bg-blue-500 shadow-lg shadow-blue-500/50'
        }`}></div>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Compartilhar Relatório</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Informações do Relatório */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Relatório Selecionado</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Público:</span>
                    <span className="text-white">{selectedAudience}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Produto:</span>
                    <span className="text-white">{selectedProduct}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cliente:</span>
                    <span className="text-white">{selectedClient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Período:</span>
                    <span className="text-white">{selectedMonth}</span>
                  </div>
                </div>
              </div>

              {/* Geração do Link */}
              {!generatedLink ? (
                <div className="space-y-4">
                  <p className="text-gray-300 text-sm">
                    Gere um link personalizado para compartilhar este relatório. 
                    Qualquer pessoa com o link poderá visualizar os dados sem precisar fazer login.
                  </p>
                  
                  <button
                    onClick={generateShareLink}
                    disabled={isGenerating}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg flex items-center justify-center space-x-2 transition-colors disabled:opacity-50"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Gerando Link...</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-5 h-5" />
                        <span>Gerar Link de Compartilhamento</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Link Gerado */
                <div className="space-y-4">
                  <div className="bg-green-900/30 border border-green-700 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-medium">Link Gerado com Sucesso!</span>
                    </div>
                    <p className="text-green-300 text-sm">
                      O link está pronto para ser compartilhado. Qualquer pessoa pode acessar o relatório sem login.
                    </p>
                  </div>

                  {/* Link Gerado */}
                  <div className="space-y-3">
                    <label className="text-sm text-gray-400">Link de Compartilhamento:</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={generatedLink ? shareService.getShortUrl(generatedLink.shortCode) : ''}
                        readOnly
                        className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm"
                      />
                      <button
                        onClick={copyToClipboard}
                        className="px-3 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                        title="Copiar Link"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex space-x-3">
                    <button
                      onClick={openShareLink}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Abrir Link</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setGeneratedLink(null);
                        setCopied(false);
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Gerar Novo
                    </button>
                  </div>
                </div>
              )}

              {/* Histórico de Links */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-blue-400 font-medium text-sm">📋 Links Compartilhados</h4>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    {showHistory ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
                
                {showHistory && (
                  <div className="bg-gray-700/30 rounded-lg p-3 max-h-40 overflow-y-auto">
                    {shareService.getAllShareLinks().length > 0 ? (
                      <div className="space-y-2">
                        {shareService.getAllShareLinks().slice(0, 5).map((link) => (
                          <div key={link.id} className="flex items-center justify-between p-2 bg-gray-600/30 rounded">
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs truncate">
                                {shareService.getShortUrl(link.shortCode)}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {new Date(link.createdAt).toLocaleDateString('pt-BR')}
                              </p>
                            </div>
                            <div className="flex space-x-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(shareService.getShortUrl(link.shortCode));
                                  toast.success('Link copiado!');
                                }}
                                className="p-1 text-gray-400 hover:text-white transition-colors"
                                title="Copiar"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => {
                                  shareService.deactivateLink(link.shortCode);
                                  toast.success('Link desativado!');
                                  
                                  // Verificar se ainda há links ativos
                                  const remainingLinks = shareService.getAllShareLinks();
                                  if (remainingLinks.length === 0) {
                                    // Emitir evento para notificar que não há mais links
                                    window.dispatchEvent(new CustomEvent('noLinksRemaining'));
                                  }
                                }}
                                className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                title="Desativar"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 text-xs text-center py-2">
                        Nenhum link compartilhado ainda
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Informações Adicionais */}
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
                <h4 className="text-blue-400 font-medium text-sm mb-2">ℹ️ Informações</h4>
                <ul className="text-blue-300 text-xs space-y-1">
                  <li>• O link é válido permanentemente</li>
                  <li>• Não requer login para visualização</li>
                  <li>• Dados são atualizados em tempo real</li>
                  <li>• Pode ser compartilhado por qualquer meio</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareReport; 