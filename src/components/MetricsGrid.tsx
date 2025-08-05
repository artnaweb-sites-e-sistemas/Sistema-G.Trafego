import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Minus, Info } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  tooltip?: string;
}

interface MetricsGridProps {
  metrics: MetricData[];
  selectedClient?: string;
  selectedMonth?: string;
  realAgendamentos?: number;
  realVendas?: number;
  realCPV?: number;
  realROI?: string;
}

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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, trendValue, tooltip }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return <ArrowUp className="w-4 h-4" />;
      case 'down': return <ArrowDown className="w-4 h-4" />;
      default: return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/20 group">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wide">{title}</h3>
            {tooltip && (
              <Tooltip content={tooltip} isVisible={showTooltip}>
                                        <div
                          className="cursor-default group/tooltip"
                          onMouseEnter={() => setShowTooltip(true)}
                          onMouseLeave={() => setShowTooltip(false)}
                        >
                          <Info className="w-4 h-4 text-gray-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                        </div>
              </Tooltip>
            )}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center space-x-1 text-xs font-medium px-2 py-1 rounded-full ${getTrendColor()} bg-opacity-10 ${trend === 'up' ? 'bg-green-500' : trend === 'down' ? 'bg-red-500' : 'bg-gray-500'}`}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div className="text-4xl font-bold text-white group-hover:text-gray-100 transition-colors">{value}</div>
        {subtitle && (
          <p className="text-gray-400 text-sm leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, selectedClient, selectedMonth, realAgendamentos, realVendas, realCPV, realROI }) => {
  console.log('🔍 DEBUG - MetricsGrid - Props recebidas:', {
    selectedClient,
    selectedMonth,
    realAgendamentos,
    realVendas,
    realCPV,
    realROI,
    metricsCount: metrics.length
  });
  
  const aggregated = metricsService.calculateAggregatedMetrics(metrics);
  
  console.log('🔍 DEBUG - MetricsGrid - Valores agregados:', aggregated);
  console.log('🔍 DEBUG - MetricsGrid - Valores reais para cards:', {
    agendamentos: realAgendamentos,
    vendas: realVendas,
    cpv: realCPV,
    roi: realROI
  });
  
  console.log('🔍 DEBUG - MetricsGrid - Tipos dos valores:', {
    agendamentosType: typeof realAgendamentos,
    vendasType: typeof realVendas,
    cpvType: typeof realCPV,
    roiType: typeof realROI
  });

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
      trend: aggregated.totalImpressions > 0 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.totalImpressions > 0 ? '+15.2%' : undefined,
      tooltip: 'Número total de vezes que seu anúncio foi exibido para pessoas'
    },
    { 
      title: 'CPM', 
      value: formatCurrency(aggregated.avgCPM), 
      trend: aggregated.avgCPM > 30 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.avgCPM > 30 ? '+2.1%' : undefined,
      tooltip: 'Custo por mil impressões. Quanto você paga para mostrar seu anúncio 1000 vezes'
    },
    { 
      title: 'Leads / Msgs', 
      value: aggregated.totalLeads.toString(), 
      trend: aggregated.totalLeads > 0 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.totalLeads > 0 ? '+8.7%' : undefined,
      tooltip: 'Número de pessoas que enviaram mensagem ou se interessaram pelo seu produto'
    },
    { 
      title: 'CPL', 
      value: formatCurrency(aggregated.avgCPL), 
      trend: aggregated.avgCPL < 100 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.avgCPL < 100 ? '-5.3%' : undefined,
      tooltip: 'Custo por lead. Quanto você gasta para conseguir cada pessoa interessada'
    },
    { 
      title: 'CPV', 
      value: (() => {
        const cpvValue = realCPV !== undefined ? realCPV : (aggregated.totalSales > 0 ? aggregated.totalInvestment / aggregated.totalSales : 0);
        console.log('🔍 DEBUG - MetricsGrid - Card CPV - Valor calculado:', {
          realCPV,
          aggregatedTotalSales: aggregated.totalSales,
          aggregatedTotalInvestment: aggregated.totalInvestment,
          calculatedValue: aggregated.totalSales > 0 ? aggregated.totalInvestment / aggregated.totalSales : 0,
          finalValue: cpvValue
        });
        return formatCurrency(cpvValue);
      })(), 
      trend: (realCPV !== undefined ? realCPV : aggregated.totalSales) > 0 ? 'neutral' as const : 'neutral' as const,
      tooltip: 'Custo por venda. Quanto você gasta para conseguir cada venda (valores reais da planilha de detalhes mensais)'
    },
    { 
      title: 'ROI/ROAS', 
      value: (() => {
        const roiValue = realROI !== undefined ? realROI : `${aggregated.totalROI.toFixed(2)}%`;
        console.log('🔍 DEBUG - MetricsGrid - Card ROI/ROAS - Valor calculado:', {
          realROI,
          aggregatedTotalROI: aggregated.totalROI,
          finalValue: roiValue
        });
        return roiValue;
      })(), 
      trend: (realROI !== undefined ? parseFloat(realROI.replace(/[^\d.-]/g, '')) : aggregated.totalROI) > 0 ? 'up' as const : 'neutral' as const,
      trendValue: (realROI !== undefined ? parseFloat(realROI.replace(/[^\d.-]/g, '')) : aggregated.totalROI) > 0 ? '+12.4%' : undefined,
      tooltip: 'Retorno sobre investimento. Quanto você ganha de volta para cada real investido (valores reais da planilha de detalhes mensais)'
    },
    { 
      title: 'CTR', 
      value: `${aggregated.avgCTR.toFixed(2)}%`, 
      trend: aggregated.avgCTR > 2 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.avgCTR > 2 ? '+0.3%' : undefined,
      tooltip: 'Taxa de cliques. Porcentagem de pessoas que clicaram no seu anúncio'
    },
    { 
      title: 'Agendamentos', 
      value: (realAgendamentos !== undefined ? realAgendamentos : aggregated.totalAppointments).toString(), 
      trend: (realAgendamentos !== undefined ? realAgendamentos : aggregated.totalAppointments) > 0 ? 'up' as const : 'neutral' as const,
      trendValue: (realAgendamentos !== undefined ? realAgendamentos : aggregated.totalAppointments) > 0 ? '+6.8%' : undefined,
      tooltip: 'Número de consultas ou reuniões agendadas com clientes (valores reais da planilha de detalhes mensais)'
    },
    { 
      title: 'Quantidade de Vendas', 
      value: (realVendas !== undefined ? realVendas : aggregated.totalSales).toString(), 
      trend: (realVendas !== undefined ? realVendas : aggregated.totalSales) > 0 ? 'up' as const : 'neutral' as const,
      trendValue: (realVendas !== undefined ? realVendas : aggregated.totalSales) > 0 ? '+9.2%' : undefined,
      tooltip: 'Número total de vendas realizadas através dos anúncios (valores reais da planilha de detalhes mensais)'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {metricsCards.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
};

export default MetricsGrid;