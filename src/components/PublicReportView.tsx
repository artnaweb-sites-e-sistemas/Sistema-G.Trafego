import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Calendar, User, Package, Users } from 'lucide-react';
import MetricsGrid from './MetricsGrid';
import MonthlyDetailsTable from './MonthlyDetailsTable';
import { metricsService, MetricData } from '../services/metricsService';

const PublicReportView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportInfo, setReportInfo] = useState({
    audience: '',
    product: '',
    client: '',
    month: ''
  });

  useEffect(() => {
    const loadPublicReport = async () => {
      try {
        setLoading(true);
        
        // Extrair parâmetros da URL
        const audience = searchParams.get('audience') || '';
        const product = searchParams.get('product') || '';
        const client = searchParams.get('client') || '';
        const month = searchParams.get('month') || '';
        
        setReportInfo({ audience, product, client, month });
        
        // Carregar métricas para visualização pública
        const data = await metricsService.getMetrics(month, client, product, audience, '');
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPublicReport();
  }, [searchParams]);

  const handleBackToLogin = () => {
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Carregando relatório...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="bg-red-900/30 border border-red-700 rounded-lg p-6">
            <Lock className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Relatório Não Encontrado</h2>
            <p className="text-red-300 mb-4">{error}</p>
            <button
              onClick={handleBackToLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Público */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBackToLogin}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Voltar ao Login</span>
              </button>
            </div>
            
            <div className="flex items-center space-x-2 text-blue-400">
              <Eye className="w-5 h-5" />
              <span className="text-sm font-medium">Visualização Pública</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Relatório */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gray-800 rounded-xl p-6 mb-8 border border-gray-700">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <h1 className="text-2xl font-bold text-white">Relatório Compartilhado</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              <Users className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-gray-400 text-sm">Público</p>
                <p className="text-white font-medium">{reportInfo.audience}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              <Package className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-gray-400 text-sm">Produto</p>
                <p className="text-white font-medium">{reportInfo.product}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              <User className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-gray-400 text-sm">Cliente</p>
                <p className="text-white font-medium">{reportInfo.client}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-700/50 rounded-lg">
              <Calendar className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-gray-400 text-sm">Período</p>
                <p className="text-white font-medium">{reportInfo.month}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo do Relatório */}
        <div className="space-y-8">
          <MetricsGrid metrics={metrics} />
          <MonthlyDetailsTable metrics={metrics} />
        </div>

        {/* Footer Público */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <div className="text-center text-gray-400 text-sm">
            <p>Este é um relatório compartilhado. Para acessar recursos completos, faça login no sistema.</p>
            <button
              onClick={handleBackToLogin}
              className="mt-2 text-blue-400 hover:text-blue-300 underline"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicReportView; 