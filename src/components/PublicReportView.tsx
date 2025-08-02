import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Calendar, User, Package, Users, Info } from 'lucide-react';
import MetricsGrid from './MetricsGrid';
import DailyControlTable from './DailyControlTable';
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

  // Calcular valores baseados no controle diário
  const calculateDailyBasedMetrics = () => {
    const dailyData = generateDailyData();
    
    const totals = {
      investment: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      activeDays: 0
    };

    dailyData.forEach(row => {
      // row.investment já é um número, não precisa extrair de string
      const investmentValue = row.investment || 0;
      const impressionsValue = row.impressions || 0;
      const clicksValue = row.clicks || 0;
      const leadsValue = row.leads || 0;
      
      totals.investment += investmentValue;
      totals.impressions += impressionsValue;
      totals.clicks += clicksValue;
      totals.leads += leadsValue;
      
      if (row.status === 'Ativo') {
        totals.activeDays++;
      }
    });

    // Calcular métricas derivadas
    const avgCPM = totals.impressions > 0 ? (totals.investment / totals.impressions) * 1000 : 0;
    const avgCTR = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
    const avgCPL = totals.leads > 0 ? totals.investment / totals.leads : 0;
    const totalROAS = totals.investment > 0 ? (totals.leads * 100) / totals.investment : 0; // Simulação de receita
    const totalROI = totals.investment > 0 ? ((totals.leads * 100) - totals.investment) / totals.investment * 100 : 0;

    return {
      totalLeads: totals.leads,
      totalRevenue: totals.leads * 100, // Simulação de receita baseada em leads
      totalInvestment: totals.investment,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      avgCTR: Number(avgCTR.toFixed(2)),
      avgCPM: Number(avgCPM.toFixed(2)),
      avgCPL: Number(avgCPL.toFixed(2)),
      totalROAS: Number(totalROAS.toFixed(2)),
      totalROI: Number(totalROI.toFixed(1)),
      totalAppointments: Math.floor(totals.leads * 0.6), // Simulação de agendamentos
      totalSales: Math.floor(totals.leads * 0.4), // Simulação de vendas
      activeDays: totals.activeDays
    };
  };

  // Função para gerar dados diários (copiada do DailyControlTable)
  const generateDailyData = () => {
    const data: any[] = [];
    
    const monthMap: { [key: string]: number } = {
      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };
    
    const [monthName, yearStr] = reportInfo.month.split(' ');
    const month = monthMap[monthName] || 6;
    const year = parseInt(yearStr) || 2023;
    
    const startDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayStr = currentDate.getDate().toString().padStart(2, '0');
      const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = currentDate.getFullYear().toString();
      
      const isPastDay = currentDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = currentDate.getDate() === today.getDate() && 
                     currentDate.getMonth() === today.getMonth() && 
                     currentDate.getFullYear() === today.getFullYear();
      const isFutureDay = currentDate > new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      data.push({
        date: `${dayStr}/${monthStr}/${yearStr}`,
        dateISO: currentDate.toISOString().split('T')[0],
        investment: 0,
        impressions: 0,
        clicks: 0,
        cpm: 0,
        ctr: 0,
        leads: 0,
        cpl: 0,
        status: 'Inativo',
        isPastDay,
        isToday,
        isFutureDay
      });
    }
    
    // Adicionar dados das métricas
    metrics.forEach(metric => {
      if (metric.month === reportInfo.month) {
        let metricDate: Date;
        try {
          if (/^\d{4}-\d{2}-\d{2}$/.test(metric.date)) {
            const [year, month, day] = metric.date.split('-').map(Number);
            metricDate = new Date(year, month - 1, day);
          } else {
            metricDate = new Date(metric.date);
          }
        } catch (error) {
          metricDate = new Date(metric.date);
        }
        
        const dayIndex = metricDate.getDate() - 1;
        
        if (dayIndex >= 0 && dayIndex < data.length) {
          if (!data[dayIndex].isFutureDay) {
            data[dayIndex] = {
              ...data[dayIndex],
              investment: metric.investment,
              impressions: metric.impressions,
              clicks: metric.clicks,
              cpm: metric.cpm,
              ctr: metric.ctr,
              leads: metric.leads,
              cpl: metric.cpl,
              status: metric.investment > 0 ? 'Ativo' : 'Inativo'
            };
          }
        }
      }
    });
    
    return data;
  };

  // Componente de Tooltip customizado
  const Tooltip: React.FC<{ children: React.ReactNode; content: string; isVisible: boolean }> = ({ children, content, isVisible }) => {
    return (
      <div className="relative inline-block">
        {children}
        {isVisible && (
                  <div className="absolute z-[9999] px-4 py-3 text-sm text-gray-100 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-600/50 backdrop-blur-sm whitespace-nowrap -top-3 left-1/2 transform -translate-x-1/2 -translate-y-full animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="flex items-center space-x-2">
            <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse"></div>
            <span className="font-medium">{content}</span>
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
        </div>
        )}
      </div>
    );
  };

  // Componente MetricsGrid customizado para página pública
  const PublicMetricsGrid: React.FC<{ metrics: MetricData[] }> = ({ metrics }) => {
    const aggregated = calculateDailyBasedMetrics();
    const [tooltipStates, setTooltipStates] = useState<{ [key: number]: boolean }>({});

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const metricsCards = [
      { 
        title: 'Impressões', 
        value: aggregated.totalImpressions.toLocaleString('pt-BR'), 
        trend: aggregated.totalImpressions > 0 ? 'up' : 'neutral' as const,
        trendValue: aggregated.totalImpressions > 0 ? '+15.2%' : undefined,
        tooltip: 'Número total de vezes que seu anúncio foi exibido para pessoas'
      },
      { 
        title: 'CPM', 
        value: formatCurrency(aggregated.avgCPM), 
        trend: aggregated.avgCPM > 30 ? 'up' : 'neutral' as const,
        trendValue: aggregated.avgCPM > 30 ? '+2.1%' : undefined,
        tooltip: 'Custo por mil impressões. Quanto você paga para mostrar seu anúncio 1000 vezes'
      },
      { 
        title: 'Leads / Msgs', 
        value: aggregated.totalLeads.toString(), 
        trend: aggregated.totalLeads > 0 ? 'up' : 'neutral' as const,
        trendValue: aggregated.totalLeads > 0 ? '+8.7%' : undefined,
        tooltip: 'Número de pessoas que enviaram mensagem ou se interessaram pelo seu produto'
      },
      { 
        title: 'CPL', 
        value: formatCurrency(aggregated.avgCPL), 
        trend: aggregated.avgCPL < 100 ? 'up' : 'neutral' as const,
        trendValue: aggregated.avgCPL < 100 ? '-5.3%' : undefined,
        tooltip: 'Custo por lead. Quanto você gasta para conseguir cada pessoa interessada'
      },
      { 
        title: 'CPV', 
        value: formatCurrency(aggregated.totalSales > 0 ? aggregated.totalInvestment / aggregated.totalSales : 0), 
        trend: aggregated.totalSales > 0 ? 'neutral' as const : 'neutral' as const,
        tooltip: 'Custo por venda. Quanto você gasta para conseguir cada venda'
      },
      { 
        title: 'ROI', 
        value: `${aggregated.totalROI.toFixed(2)}%`, 
        trend: aggregated.totalROI > 0 ? 'up' : 'neutral' as const,
        trendValue: aggregated.totalROI > 0 ? '+12.4%' : undefined,
        tooltip: 'Retorno sobre investimento. Quanto você ganha de volta para cada real investido'
      },
      { 
        title: 'CTR', 
        value: `${aggregated.avgCTR.toFixed(2)}%`, 
        trend: aggregated.avgCTR > 2 ? 'up' : 'neutral' as const,
        trendValue: aggregated.avgCTR > 2 ? '+0.3%' : undefined,
        tooltip: 'Taxa de cliques. Porcentagem de pessoas que clicaram no seu anúncio'
      },
      { 
        title: 'Agendamentos', 
        value: aggregated.totalAppointments.toString(), 
        trend: aggregated.totalAppointments > 0 ? 'up' : 'neutral' as const,
        trendValue: aggregated.totalAppointments > 0 ? '+6.8%' : undefined,
        tooltip: 'Número de consultas ou reuniões agendadas com clientes'
      },
      { 
        title: 'Quantidade de Vendas', 
        value: aggregated.totalSales.toString(), 
        trend: aggregated.totalSales > 0 ? 'up' : 'neutral' as const,
        trendValue: aggregated.totalSales > 0 ? '+9.2%' : undefined,
        tooltip: 'Número total de vendas realizadas através dos anúncios'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {metricsCards.map((metric, index) => {
          return (
            <div key={index} className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/20 group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wide">{metric.title}</h3>
                    {metric.tooltip && (
                      <Tooltip content={metric.tooltip} isVisible={tooltipStates[index] || false}>
                        <div
                          className="cursor-default group/tooltip"
                          onMouseEnter={() => setTooltipStates(prev => ({ ...prev, [index]: true }))}
                          onMouseLeave={() => setTooltipStates(prev => ({ ...prev, [index]: false }))}
                        >
                          <Info className="w-4 h-4 text-gray-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                        </div>
                      </Tooltip>
                    )}
                  </div>
                  {metric.trend && metric.trendValue && (
                    <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${
                      metric.trend === 'up' ? 'text-green-400 bg-green-500 bg-opacity-10' : 
                      'text-gray-400 bg-gray-500 bg-opacity-10'
                    }`}>
                      <span>{metric.trendValue}</span>
                    </div>
                  )}
                </div>
                <div className="text-4xl font-bold text-white group-hover:text-gray-100 transition-colors">{metric.value}</div>
                {metric.subtitle && (
                  <p className="text-gray-400 text-sm leading-relaxed">{metric.subtitle}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

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
        
        // Carregar métricas públicas (sem depender do estado do Meta Ads)
        const data = await metricsService.getPublicMetrics(month, client, product, audience);
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
          <PublicMetricsGrid metrics={metrics} />
          <DailyControlTable 
            metrics={metrics} 
            selectedMonth={reportInfo.month}
            customRecordCount={calculateDailyBasedMetrics().activeDays}
          />
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