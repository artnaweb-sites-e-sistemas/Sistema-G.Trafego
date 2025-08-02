import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

interface MetricsGridProps {
  metrics: MetricData[];
}
const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, trendValue }) => {
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
          <h3 className="text-gray-300 text-sm font-semibold uppercase tracking-wide">{title}</h3>
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

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const aggregated = metricsService.calculateAggregatedMetrics(metrics);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const metricsCards = [
    { 
      title: 'Leads', 
      value: aggregated.totalLeads.toString(), 
      trend: aggregated.totalLeads > 0 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.totalLeads > 0 ? '+12.5%' : undefined
    },
    { 
      title: 'Receita', 
      value: formatCurrency(aggregated.totalRevenue), 
      trend: aggregated.totalRevenue > 0 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.totalRevenue > 0 ? '+8.2%' : undefined
    },
    { 
      title: 'Leads / Mês', 
      value: aggregated.totalLeads.toString(), 
      trend: 'neutral' as const 
    },
    { 
      title: 'Investimento', 
      value: formatCurrency(aggregated.totalInvestment), 
      trend: 'neutral' as const 
    },
    { 
      title: 'ROAS', 
      value: formatCurrency(aggregated.totalROAS), 
      trend: aggregated.totalROAS > 1 ? 'up' as const : 'neutral' as const 
    },
    { 
      title: 'ROI', 
      value: `${aggregated.totalROI.toFixed(1)}% (${(aggregated.totalROAS).toFixed(1)}x)`, 
      subtitle: 'Em investimento retornado em receita', 
      trend: aggregated.totalROI > 0 ? 'up' as const : 'neutral' as const 
    },
    { 
      title: 'CTR', 
      value: `${aggregated.avgCTR}%`, 
      trend: aggregated.avgCTR > 2 ? 'up' as const : 'neutral' as const,
      trendValue: aggregated.avgCTR > 2 ? '+0.3%' : undefined
    },
    { 
      title: 'Agendamentos', 
      value: aggregated.totalAppointments.toString(), 
      trend: 'neutral' as const 
    },
    { 
      title: 'Quantidade de Vendas', 
      value: aggregated.totalSales.toString(), 
      trend: 'neutral' as const 
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