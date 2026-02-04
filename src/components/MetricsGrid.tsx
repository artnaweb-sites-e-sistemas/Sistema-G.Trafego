import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Minus, Info, RefreshCw } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  tooltip?: string;
  compact?: boolean;
  priority?: 'primary' | 'secondary';
}

interface MetricsGridProps {
  metrics: MetricData[];
  selectedClient?: string;
  selectedMonth?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastUpdate?: Date | null;
  compactMode?: boolean;
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

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, trend, trendValue, tooltip, compact = false, priority = 'secondary' }) => {
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
      case 'up': return <ArrowUp className={compact ? 'w-3 h-3' : 'w-4 h-4'} />;
      case 'down': return <ArrowDown className={compact ? 'w-3 h-3' : 'w-4 h-4'} />;
      default: return <Minus className={compact ? 'w-3 h-3' : 'w-4 h-4'} />;
    }
  };

  // Estilos baseados no modo compacto e prioridade
  const cardClasses = compact
    ? `bg-gradient-to-br rounded-xl border transition-all duration-300 shadow-md hover:shadow-lg group ${priority === 'primary'
      ? 'from-purple-900/40 to-indigo-900/40 border-purple-500/30 hover:border-purple-400/50 p-4'
      : 'from-gray-800/60 to-gray-900/60 border-gray-700/40 hover:border-gray-600/50 p-3'
    }`
    : 'bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/50 hover:border-gray-600/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-black/20 group';

  const valueClasses = compact
    ? priority === 'primary' ? 'text-2xl font-bold text-white' : 'text-xl font-bold text-white'
    : 'text-4xl font-bold text-white group-hover:text-gray-100 transition-colors';

  const titleClasses = compact
    ? 'text-gray-400 text-xs font-medium uppercase tracking-wide'
    : 'text-gray-300 text-sm font-semibold uppercase tracking-wide';

  return (
    <div className={cardClasses}>
      <div className={compact ? 'space-y-2' : 'space-y-4'}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className={titleClasses}>{title}</h3>
            {tooltip && !compact && (
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
              <span className={compact ? 'text-[10px]' : ''}>{trendValue}</span>
            </div>
          )}
        </div>
        <div className={valueClasses}>{value}</div>
        {subtitle && !compact && (
          <p className="text-gray-400 text-sm leading-relaxed">{subtitle}</p>
        )}
      </div>
    </div>
  );
};

const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  selectedClient,
  selectedMonth,
  onRefresh,
  isRefreshing = false,
  lastUpdate,
  compactMode = true
}) => {
  // Estado para expandir/contrair cards extras
  const [isExpanded, setIsExpanded] = useState(false);

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
        // Buscar TODOS os produtos (campanhas) do cliente selecionado na planilha detalhes mensais
        const realValues = await metricsService.getRealValuesForClient(selectedMonth || '', selectedClient || '');

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
      if (event.detail && event.detail.client === (selectedClient || '') && event.detail.month === selectedMonth) {
        // Recarregar valores dos cards
        setTimeout(async () => {
          try {
            const realValues = await metricsService.getRealValuesForClient(selectedMonth || '', selectedClient || '');

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

  // 🎯 MODO ÁUREA: KPIs priorizados - Os 6 primeiros são prioritários
  const metricsCards = [
    // ========== KPIs PRIORITÁRIOS (exibidos no modo compacto) ==========
    {
      title: 'Valor Investido',
      value: hasMetrics ? formatCurrency(aggregated.totalInvestment) : formatCurrency(0),
      trend: hasMetrics && aggregated.totalInvestment > 0 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.totalInvestment > 0 ? '+12.5%' : undefined,
      tooltip: 'Valor total gasto em todas as campanhas do período selecionado',
      priority: 'primary' as const
    },
    {
      title: 'CPL',
      value: hasMetrics ? formatCurrency(aggregated.avgCPL) : formatCurrency(0),
      trend: hasMetrics && aggregated.avgCPL < 100 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.avgCPL < 100 ? '-5.3%' : undefined,
      tooltip: 'Custo por lead. Quanto você gasta para conseguir cada pessoa interessada',
      priority: 'primary' as const
    },
    {
      title: 'Leads / Msg',
      value: hasMetrics ? aggregated.totalLeads.toString() : '0',
      trend: hasMetrics && aggregated.totalLeads > 0 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.totalLeads > 0 ? '+8.7%' : undefined,
      tooltip: 'Número de pessoas que enviaram mensagem ou se interessaram pelo seu produto',
      priority: 'primary' as const
    },
    {
      title: 'CPV',
      value: formatCurrency(realMonthlyValues.cpv),
      trend: realMonthlyValues.cpv > 0 ? 'up' as const : 'neutral' as const,
      trendValue: realMonthlyValues.cpv > 0 ? '+5.2%' : undefined,
      tooltip: 'Custo por venda. Investimento total dividido pelo número de vendas',
      priority: 'primary' as const
    },
    {
      title: 'Vendas',
      value: realMonthlyValues.vendas.toString(),
      trend: realMonthlyValues.vendas > 0 ? 'up' as const : 'neutral' as const,
      trendValue: realMonthlyValues.vendas > 0 ? '+9.2%' : undefined,
      tooltip: 'Número total de vendas realizadas através dos anúncios',
      priority: 'primary' as const
    },
    {
      title: 'ROI/ROAS',
      value: realMonthlyValues.roi,
      trend: (() => {
        const roiNumber = parseFloat(realMonthlyValues.roi.replace(/[^\d.-]/g, ''));
        return roiNumber > 0 ? 'up' as const : 'neutral' as const;
      })(),
      trendValue: (() => {
        const roiNumber = parseFloat(realMonthlyValues.roi.replace(/[^\d.-]/g, ''));
        return roiNumber > 0 ? '+12.4%' : undefined;
      })(),
      tooltip: 'Retorno sobre investimento. Percentual de retorno vs investimento',
      priority: 'primary' as const
    },
    // ========== KPIs SECUNDÁRIOS (exibidos apenas no modo expandido) ==========
    {
      title: 'CPM',
      value: hasMetrics ? formatCurrency(aggregated.avgCPM) : formatCurrency(0),
      trend: hasMetrics && aggregated.avgCPM > 30 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.avgCPM > 30 ? '+2.1%' : undefined,
      tooltip: 'Custo por mil impressões. Quanto você paga para mostrar seu anúncio 1000 vezes',
      priority: 'secondary' as const
    },
    {
      title: 'Impressões',
      value: hasMetrics ? aggregated.totalImpressions.toLocaleString('pt-BR') : '0',
      trend: hasMetrics && aggregated.totalImpressions > 0 ? 'up' as const : 'neutral' as const,
      trendValue: hasMetrics && aggregated.totalImpressions > 0 ? '+15.2%' : undefined,
      tooltip: 'Número total de vezes que seu anúncio foi exibido para pessoas',
      priority: 'secondary' as const
    },
    {
      title: 'Agendamentos',
      value: realMonthlyValues.agendamentos.toString(),
      trend: realMonthlyValues.agendamentos > 0 ? 'up' as const : 'neutral' as const,
      trendValue: realMonthlyValues.agendamentos > 0 ? '+6.8%' : undefined,
      tooltip: 'Número de consultas ou reuniões agendadas com clientes',
      priority: 'secondary' as const
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header com botão de atualização */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-white">Métricas Gerais</h2>
          {selectedClient && selectedClient !== 'Selecione um cliente' && (
            <span className="text-sm text-gray-400">
              Cliente: {selectedClient}
            </span>
          )}
        </div>

        {/* Botão de Atualizar e Data da Última Atualização */}
        {selectedClient && selectedClient !== 'Selecione um cliente' && onRefresh && (
          <div className="flex items-center gap-4">
            {/* Data da última atualização */}
            {lastUpdate && (
              <div className="text-sm text-gray-400">
                <span className="font-medium">Última atualização:</span>
                <span className="ml-1">
                  {lastUpdate.toLocaleDateString('pt-BR')} às {lastUpdate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}

            {/* Botão de Atualizar */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${isRefreshing
                ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                }`}
              title="Atualizar métricas do Meta Ads"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Atualizando...' : 'Atualizar Métricas'}
            </button>
          </div>
        )}
      </div>

      {/* Grid de cards - Modo Compacto */}
      {compactMode ? (
        <>
          {/* KPIs Prioritários - Sempre visíveis */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {metricsCards.filter(m => m.priority === 'primary').map((metric, index) => (
              <MetricCard key={index} {...metric} compact={true} />
            ))}
          </div>

          {/* KPIs Secundários - Expansíveis */}
          {isExpanded && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-fadeIn mt-4">
              {metricsCards.filter(m => m.priority === 'secondary').map((metric, index) => (
                <MetricCard key={`secondary-${index}`} {...metric} compact={true} />
              ))}
            </div>
          )}

          {/* Botão de expandir/contrair */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-center gap-2 w-full py-2 mt-3 text-sm text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          >
            {isExpanded ? (
              <>
                <Minus className="w-4 h-4" />
                <span>Mostrar menos métricas</span>
              </>
            ) : (
              <>
                <Info className="w-4 h-4" />
                <span>Ver todas as métricas (+{metricsCards.filter(m => m.priority === 'secondary').length})</span>
              </>
            )}
          </button>
        </>
      ) : (
        /* Modo Completo - Todos os cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {metricsCards.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MetricsGrid;