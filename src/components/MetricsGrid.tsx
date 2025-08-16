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
}

// Componente de Tooltip customizado
const Tooltip: React.FC<{ children: React.ReactNode; content: string; isVisible: boolean }> = ({ children, content, isVisible }) => {
  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className="absolute z-[9999] px-4 py-3 text-sm text-gray-100 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-600/50 backdrop-blur-sm -top-3 left-1/2 transform -translate-x-1/2 -translate-y-full animate-in fade-in-0 zoom-in-95 duration-200" style={{ width: '280px', maxWidth: '280px' }}>
          <div className="space-y-2">
            {/* Ícone de alerta */}
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="font-semibold text-blue-300 text-xs uppercase tracking-wide">Informação</span>
            </div>
            
            {/* Conteúdo */}
            <div className="text-sm leading-relaxed">
              <p className="text-gray-200">{content}</p>
            </div>
          </div>
          
          {/* Seta do tooltip */}
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

const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics, selectedClient, selectedMonth }) => {
  console.log('🎯 CARD DEBUG - MetricsGrid - Props recebidas:', {
    selectedClient,
    selectedMonth,
    metricsLength: metrics?.length || 0
  });
  
  // CORREÇÃO: Garantir que aggregated seja calculado corretamente mesmo sem métricas
  const aggregated = metricsService.calculateAggregatedMetrics(metrics || []);
  
  // CORREÇÃO: Se não há métricas, garantir que todos os valores sejam zerados
  const hasMetrics = metrics && metrics.length > 0;
  
  // 🎯 NOVO: Estados para valores reais da planilha detalhes mensais (agendamentos, vendas, CPV e ROI)
  const [realMonthlyValues, setRealMonthlyValues] = React.useState({ 
    agendamentos: 0, 
    vendas: 0, 
    cpv: 0, 
    roi: '0% (0.0x)' 
  });
  
  // 🎯 NOVO: Buscar valores reais da planilha detalhes mensais quando cliente/mês mudarem
  React.useEffect(() => {
    const loadRealMonthlyValues = async () => {
      if (!selectedClient || selectedClient === 'Selecione um cliente' || !selectedMonth) {
        setRealMonthlyValues({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
        return;
      }
      
      try {
        console.log('🎯 CARD DEBUG - MetricsGrid - Buscando valores reais da planilha detalhes mensais:', { selectedClient, selectedMonth });
        
        // Buscar TODOS os produtos (campanhas) do cliente selecionado na planilha detalhes mensais
        const realValues = await metricsService.getRealValuesForClient(selectedMonth || '', selectedClient || '');
        
        console.log('🎯 CARD DEBUG - MetricsGrid - Valores obtidos da planilha:', realValues);
        
        setRealMonthlyValues({
          agendamentos: realValues.agendamentos || 0,
          vendas: realValues.vendas || 0,
          cpv: realValues.cpv || 0,
          roi: realValues.roi || '0% (0.0x)'
        });
      } catch (error) {
        console.error('🎯 CARD DEBUG - MetricsGrid - Erro ao buscar valores reais:', error);
        setRealMonthlyValues({ agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' });
      }
    };
    
    loadRealMonthlyValues();
  }, [selectedClient, selectedMonth]);
  
  // 🎯 NOVO: Listener para atualizar cards quando dados dos públicos mudarem
  React.useEffect(() => {
    const handleAudienceDetailsSaved = (event: CustomEvent) => {
      console.log('🎯 CARD DEBUG - MetricsGrid - Evento audienceDetailsSaved recebido:', event.detail);
      
      if (event.detail && event.detail.client === (selectedClient || '') && event.detail.month === selectedMonth) {
        console.log('🎯 CARD DEBUG - MetricsGrid - Dados do público alterados, recarregando valores dos cards...');
        
        // Recarregar valores dos cards
        setTimeout(async () => {
          try {
            const realValues = await metricsService.getRealValuesForClient(selectedMonth || '', selectedClient || '');
            console.log('🎯 CARD DEBUG - MetricsGrid - Novos valores carregados:', realValues);
            
            setRealMonthlyValues({
              agendamentos: realValues.agendamentos || 0,
              vendas: realValues.vendas || 0,
              cpv: realValues.cpv || 0,
              roi: realValues.roi || '0% (0.0x)'
            });
          } catch (error) {
            console.error('🎯 CARD DEBUG - MetricsGrid - Erro ao recarregar valores:', error);
          }
        }, 500); // Delay para garantir que Firebase processou a atualização
      }
    };

    window.addEventListener('audienceDetailsSaved', handleAudienceDetailsSaved as EventListener);
    
    return () => {
      window.removeEventListener('audienceDetailsSaved', handleAudienceDetailsSaved as EventListener);
    };
  }, [selectedMonth, selectedClient]);
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const metricsCards = [
    { 
      title: 'Valor Investido', 
      value: hasMetrics ? formatCurrency(aggregated.totalInvestment) : formatCurrency(0), 
      trend: hasMetrics && aggregated.totalInvestment > 0 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.totalInvestment > 0 ? '+12.5%' : undefined,
      tooltip: 'Valor total gasto em todas as campanhas do período selecionado'
    },
    { 
      title: 'CPM', 
      value: hasMetrics ? formatCurrency(aggregated.avgCPM) : formatCurrency(0), 
      trend: hasMetrics && aggregated.avgCPM > 30 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.avgCPM > 30 ? '+2.1%' : undefined,
      tooltip: 'Custo por mil impressões. Quanto você paga para mostrar seu anúncio 1000 vezes'
    },
    { 
      title: 'Impressões', 
      value: hasMetrics ? aggregated.totalImpressions.toLocaleString('pt-BR') : '0', 
      trend: hasMetrics && aggregated.totalImpressions > 0 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.totalImpressions > 0 ? '+15.2%' : undefined,
      tooltip: 'Número total de vezes que seu anúncio foi exibido para pessoas'
    },
    { 
      title: 'CPL', 
      value: hasMetrics ? formatCurrency(aggregated.avgCPL) : formatCurrency(0), 
      trend: hasMetrics && aggregated.avgCPL < 100 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.avgCPL < 100 ? '-5.3%' : undefined,
      tooltip: 'Custo por lead. Quanto você gasta para conseguir cada pessoa interessada'
    },
    { 
      title: 'CPV', 
      value: (() => {
        console.log('🎯 CARD DEBUG - MetricsGrid - CPV Card:', { 
          realMonthlyCPV: realMonthlyValues.cpv
        });
        
        // 🎯 CORREÇÃO: Usar valor real CPV calculado da planilha detalhes mensais
        const cpvValue = realMonthlyValues.cpv;
        console.log('🎯 CARD DEBUG - MetricsGrid - CPV usando valor da planilha detalhes mensais:', cpvValue);
        return formatCurrency(cpvValue);
      })(), 
      trend: (() => {
        return realMonthlyValues.cpv > 0 ? 'up' as const : 'neutral' as const;
      })(),
      trendValue: (() => {
        return realMonthlyValues.cpv > 0 ? '+5.2%' : undefined;
      })(),
      tooltip: 'Custo por venda. Investimento total dividido pelo número de vendas (calculado com dados reais da planilha detalhes mensais)'
    },
    { 
      title: 'ROI/ROAS', 
      value: (() => {
        console.log('🎯 CARD DEBUG - MetricsGrid - ROI/ROAS Card:', { 
          realMonthlyROI: realMonthlyValues.roi
        });
        
        // 🎯 CORREÇÃO: Usar valor real ROI/ROAS calculado da planilha detalhes mensais
        const roiValue = realMonthlyValues.roi;
        console.log('🎯 CARD DEBUG - MetricsGrid - ROI/ROAS usando valor da planilha detalhes mensais:', roiValue);
        return roiValue;
      })(), 
      trend: (() => {
        // Extrair o número do ROI para determinar o trend
        const roiNumber = parseFloat(realMonthlyValues.roi.replace(/[^\d.-]/g, ''));
        return roiNumber > 0 ? 'up' as const : 'neutral' as const;
      })(),
      trendValue: (() => {
        const roiNumber = parseFloat(realMonthlyValues.roi.replace(/[^\d.-]/g, ''));
        return roiNumber > 0 ? '+12.4%' : undefined;
      })(),
      tooltip: 'Retorno sobre investimento. Percentual de retorno e múltiplo de receita vs investimento (calculado com dados reais da planilha detalhes mensais)'
    },
    { 
      title: 'Leads / Msg', 
      value: hasMetrics ? aggregated.totalLeads.toString() : '0', 
      trend: hasMetrics && aggregated.totalLeads > 0 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.totalLeads > 0 ? '+8.7%' : undefined,
      tooltip: 'Número de pessoas que enviaram mensagem ou se interessaram pelo seu produto'
    },
    { 
      title: 'Agendamentos', 
      value: (() => {
        console.log('🎯 CARD DEBUG - MetricsGrid - Agendamentos Card:', { 
          realMonthlyAgendamentos: realMonthlyValues.agendamentos
        });
        
        // 🎯 CORREÇÃO: Usar valores reais da planilha detalhes mensais (soma de todos os produtos do cliente)
        const agendamentosValue = realMonthlyValues.agendamentos;
        console.log('🎯 CARD DEBUG - MetricsGrid - Agendamentos usando valor da planilha detalhes mensais:', agendamentosValue);
        return agendamentosValue.toString();
      })(), 
      trend: (() => {
        return realMonthlyValues.agendamentos > 0 ? 'up' as const : 'neutral' as const;
      })(),
      trendValue: (() => {
        return realMonthlyValues.agendamentos > 0 ? '+6.8%' : undefined;
      })(),
      tooltip: 'Número de consultas ou reuniões agendadas com clientes (soma de todos os produtos do cliente na planilha detalhes mensais)'
    },
    { 
      title: 'Quantidade de Vendas', 
      value: (() => {
        console.log('🎯 CARD DEBUG - MetricsGrid - Vendas Card:', { 
          realMonthlyVendas: realMonthlyValues.vendas
        });
        
        // 🎯 CORREÇÃO: Usar valores reais da planilha detalhes mensais (soma de todos os produtos do cliente)
        const vendasValue = realMonthlyValues.vendas;
        console.log('🎯 CARD DEBUG - MetricsGrid - Vendas usando valor da planilha detalhes mensais:', vendasValue);
        return vendasValue.toString();
      })(), 
      trend: (() => {
        return realMonthlyValues.vendas > 0 ? 'up' as const : 'neutral' as const;
      })(),
      trendValue: (() => {
        return realMonthlyValues.vendas > 0 ? '+9.2%' : undefined;
      })(),
      tooltip: 'Número total de vendas realizadas através dos anúncios (soma de todos os produtos do cliente na planilha detalhes mensais)'
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