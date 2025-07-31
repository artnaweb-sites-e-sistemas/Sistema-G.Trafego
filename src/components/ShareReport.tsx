import React, { useState } from 'react';
import { Share2, Copy, CheckCircle, ExternalLink } from 'lucide-react';

interface ShareReportProps {
  selectedAudience: string;
  selectedProduct: string;
  selectedClient: string;
  selectedMonth: string;
}

const ShareReport: React.FC<ShareReportProps> = ({
  selectedAudience,
  selectedProduct,
  selectedClient,
  selectedMonth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setIsGenerating(true);
    
    // Simular geração de link (em produção, isso seria uma chamada para a API)
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Criar link personalizado com os parâmetros selecionados
    const baseUrl = window.location.origin;
    const params = new URLSearchParams({
      audience: selectedAudience,
      product: selectedProduct,
      client: selectedClient,
      month: selectedMonth,
      shared: 'true'
    });
    
    const shareLink = `${baseUrl}/shared-report?${params.toString()}`;
    setGeneratedLink(shareLink);
    setIsGenerating(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
    }
  };

  const openShareLink = () => {
    window.open(generatedLink, '_blank');
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
            : 'bg-gray-600 hover:bg-gray-700 text-gray-300 hover:text-white'
        }`}
        title={isDisabled ? 'Selecione um público específico para compartilhar' : 'Compartilhar Relatório'}
      >
        <Share2 className="w-5 h-5" />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          isDisabled
            ? 'bg-gray-500'
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
                        value={generatedLink}
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
                        setGeneratedLink('');
                        setCopied(false);
                      }}
                      className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Gerar Novo
                    </button>
                  </div>
                </div>
              )}

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