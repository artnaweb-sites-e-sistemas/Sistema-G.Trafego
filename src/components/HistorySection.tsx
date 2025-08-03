import React, { useState, useEffect } from 'react';
import { Clock, FileText, ExternalLink, Copy, Info, Eye } from 'lucide-react';
import { shareService, ShareLink } from '../services/shareService';
import { toast } from 'react-hot-toast';

interface HistorySectionProps {
  selectedProduct?: string;
}

interface ReportData {
  month: string;
  cpm: string;
  appointments: number;
  cpl: string;
  attendance: number;
  cpv: string;
  sales: number;
  roi: string;
  shareLink: ShareLink;
}

const HistorySection: React.FC<HistorySectionProps> = ({ selectedProduct }) => {
  const [reports, setReports] = useState<ReportData[]>([]);
  const [filteredReports, setFilteredReports] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [selectedProduct]);

  const loadReports = () => {
    setLoading(true);
    
    // Simular carregamento de dados
    setTimeout(() => {
      const allShareLinks = shareService.getAllShareLinks();
      

      
      // Gerar dados simulados baseados nos links compartilhados
      const mockReports: ReportData[] = allShareLinks.map((link, index) => {
        // Extrair informações do link (se disponível)
        const urlParams = new URLSearchParams(link.originalUrl.split('?')[1] || '');
        const audience = urlParams.get('audience') || 'Público - [Aberto] [54 - 60]';
        const product = urlParams.get('product') || 'Pacote Premium';
        const month = urlParams.get('month') || 'Maio/2025';
        
        // Gerar dados simulados realistas
        const baseCPM = 14.37 + (index * 2.5);
        const baseAppointments = 7 + (index * 3);
        const baseSales = 2 + (index * 1);
        
        return {
          month,
          cpm: `R$ ${baseCPM.toFixed(2).replace('.', ',')}`,
          appointments: baseAppointments,
          cpl: `R$ ${(baseCPM * 0.33).toFixed(2).replace('.', ',')}`,
          attendance: Math.floor(baseAppointments * 0.7),
          cpv: `R$ ${(125 + index * 25).toFixed(2).replace('.', ',')}`,
          sales: baseSales,
          roi: `${100 + (index * 25)}% (${(1 + index * 0.25).toFixed(1)}x)`,
          shareLink: link
        };
      });

      // Se não há links compartilhados, criar dados de exemplo para demonstração
      if (mockReports.length === 0) {
        const exampleProducts = [
          'Pacote Premium',
          'Consultoria Mensal', 
          'Gestão de Redes Sociais',
          'Campanha Google Ads'
        ];
        
        const exampleAudiences = [
          'Público - [Aberto] [54 - 60]',
          'Público - [Fechado] [25 - 35]',
          'Público - [Aberto] [35 - 45]',
          'Público - [Fechado] [45 - 55]'
        ];
        
        const exampleMonths = ['Maio/2025', 'Abril/2025', 'Março/2025', 'Fevereiro/2025'];
        
        // Criar 4 relatórios de exemplo
        for (let i = 0; i < 4; i++) {
          const exampleLink: ShareLink = {
            id: `example-${i}`,
            shortCode: `ex${i}ample`,
            originalUrl: `example-url-${i}?product=${exampleProducts[i]}&audience=${exampleAudiences[i]}&month=${exampleMonths[i]}`,
            createdAt: new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000)), // 7 dias atrás cada
            isActive: true
          };
          
          const baseCPM = 14.37 + (i * 3.5);
          const baseAppointments = 7 + (i * 4);
          const baseSales = 2 + (i * 2);
          
          mockReports.push({
            month: exampleMonths[i],
            cpm: `R$ ${baseCPM.toFixed(2).replace('.', ',')}`,
            appointments: baseAppointments,
            cpl: `R$ ${(baseCPM * 0.33).toFixed(2).replace('.', ',')}`,
            attendance: Math.floor(baseAppointments * 0.7),
            cpv: `R$ ${(125 + i * 30).toFixed(2).replace('.', ',')}`,
            sales: baseSales,
            roi: `${100 + (i * 30)}% (${(1 + i * 0.3).toFixed(1)}x)`,
            shareLink: exampleLink
          });
        }
      }

      setReports(mockReports);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    if (selectedProduct && selectedProduct !== '' && selectedProduct !== 'Todos os Produtos') {
      // Filtrar relatórios por produto selecionado
      const filtered = reports.filter(report => {
        const urlParams = new URLSearchParams(report.shareLink.originalUrl.split('?')[1] || '');
        const reportProduct = urlParams.get('product');
        return reportProduct === selectedProduct;
      });
      setFilteredReports(filtered);
    } else {
      // Se nenhum produto selecionado ou "Todos os Produtos", mostrar todos
      setFilteredReports(reports);
    }
  }, [selectedProduct, reports]);

  const copyToClipboard = async (shortCode: string) => {
    try {
      const shortUrl = shareService.getShortUrl(shortCode);
      await navigator.clipboard.writeText(shortUrl);
      toast.success('Link copiado para a área de transferência!');
    } catch (error) {
      toast.error('Erro ao copiar link');
    }
  };

  const openReport = (shortCode: string) => {
    const shortUrl = shareService.getShortUrl(shortCode);
    window.open(shortUrl, '_blank');
  };

  const getAudienceFromLink = (link: ShareLink): string => {
    try {
      const urlParams = new URLSearchParams(link.originalUrl.split('?')[1] || '');
      return urlParams.get('audience') || 'Público - [Aberto] [54 - 60]';
    } catch {
      return 'Público - [Aberto] [54 - 60]';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
            <Clock className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Histórico</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-purple-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Histórico</h2>
        {selectedProduct && (
          <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full">
            {selectedProduct}
          </span>
        )}
      </div>
      
      {filteredReports.length > 0 ? (
      <div className="space-y-4">
          {filteredReports.map((report, index) => (
            <div key={index} className="bg-slate-800/80 rounded-lg border border-slate-600/30 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3 p-4 pb-2">
                <h3 className="font-medium text-slate-100">
                  {getAudienceFromLink(report.shareLink)}
                </h3>
                <span className="text-xs text-slate-400">
                  {new Date(report.shareLink.createdAt).toLocaleDateString('pt-BR')}
                </span>
              </div>
              
              <div className="px-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-8 gap-4 text-sm">
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">MÊS/ANO</span>
                    </div>
                    <div className="text-slate-200 font-medium">{report.month}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">CPM</span>
                      <Info className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-slate-200 font-medium">{report.cpm}</div>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">AGENDAMENTOS</span>
                    </div>
                    <div className="text-slate-200 font-medium">{report.appointments}</div>
          </div>
          
            <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">CPL</span>
                      <Info className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-slate-200 font-medium">{report.cpl}</div>
            </div>
                  
            <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">COMPARECIMENTO</span>
                    </div>
                    <div className="text-slate-200 font-medium">{report.attendance}</div>
            </div>
                  
            <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">CPV</span>
                      <Info className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-slate-200 font-medium">{report.cpv}</div>
            </div>
                  
            <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">VENDAS</span>
                    </div>
                    <div className="text-slate-200 font-medium">{report.sales}</div>
            </div>
                  
            <div>
                    <div className="flex items-center space-x-1 mb-1">
                      <span className="text-slate-400 font-medium text-xs">ROI</span>
                      <Info className="w-3 h-3 text-slate-500" />
                    </div>
                    <div className="text-slate-200 font-medium">{report.roi}</div>
            </div>
          </div>
          
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-slate-400 text-sm">
                    {report.roi}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400 text-xs font-medium">RELATÓRIO</span>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => openReport(report.shareLink.shortCode)}
                        className="p-1.5 text-slate-400 hover:text-blue-400 transition-colors bg-slate-700/50 rounded hover:bg-slate-600/50"
                        title="Visualizar relatório"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(report.shareLink.shortCode)}
                        className="p-1.5 text-slate-400 hover:text-green-400 transition-colors bg-slate-700/50 rounded hover:bg-slate-600/50"
                        title="Copiar link"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openReport(report.shareLink.shortCode)}
                        className="p-1.5 text-slate-400 hover:text-purple-400 transition-colors bg-slate-700/50 rounded hover:bg-slate-600/50"
                        title="Abrir em nova aba"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">
            {selectedProduct 
              ? `Nenhum relatório encontrado para o produto "${selectedProduct}"`
              : 'Nenhum relatório compartilhado encontrado'
            }
          </p>
          <p className="text-slate-500 text-sm mt-2">
            Gere relatórios compartilhados para visualizá-los aqui
          </p>
        </div>
      )}
      
      <div className="mt-8 pt-6 border-t border-slate-700 flex justify-between items-center text-sm text-slate-400">
        <div className="space-x-4">
          <span>Data Início Análise</span>
          <span className="text-slate-200 font-medium">21/07/2023</span>
        </div>
        <div className="space-x-4">
          <span>Data Análise Final</span>
          <span className="text-slate-200 font-medium">
            {filteredReports.length > 0 
              ? new Date().toLocaleDateString('pt-BR')
              : '-'
            }
          </span>
        </div>
        <div className="space-x-4">
          <span>Próxima Data</span>
          <span className="text-slate-200 font-medium">
            {filteredReports.length > 0 
              ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')
              : '-'
            }
          </span>
        </div>
      </div>
    </div>
  );
};

export default HistorySection;