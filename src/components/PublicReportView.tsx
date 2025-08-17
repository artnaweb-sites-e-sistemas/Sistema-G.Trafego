import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Calendar, User, Package, Users, Info, TrendingUp, TrendingDown, DollarSign, Users as UsersIcon, MessageSquare, ShoppingCart, Target, BarChart3, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import DailyControlTable from './DailyControlTable';
import { metricsService, MetricData } from '../services/metricsService';
import dayjs from 'dayjs';

const PublicReportView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reportInfo, setReportInfo] = useState({
    audience: '',
    product: '',
    client: '',
    month: '',
    campaignType: 'landing_page',
    monthlyDetails: {
      agendamentos: 0,
      vendas: 0,
      ticketMedio: 0
    }
  });

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
    
    const today = new Date();
    
    // 
    
    const startDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
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
    const relevantMetrics = metrics.filter(metric => metric.month === reportInfo.month);
    
    
    
    
    // Mapa de data → mapa de serviço → métrica mais recente
    const dailyServiceMap = new Map<string, Map<string, any>>();
    
    relevantMetrics.forEach((metric, index) => {
      const dateKey = metric.date; // YYYY-MM-DD
      const serviceKey = metric.service || 'Desconhecido';
      
      if (index < 3) {
        
      }
      
      if (!dailyServiceMap.has(dateKey)) {
        dailyServiceMap.set(dateKey, new Map<string, any>());
      }
      const serviceMap = dailyServiceMap.get(dateKey)!;
      const existing = serviceMap.get(serviceKey);
      
      // Se não existe ou a métrica é mais recente, salva
      if (!existing || (metric.updatedAt && existing.updatedAt && new Date(metric.updatedAt).getTime() > new Date(existing.updatedAt).getTime())) {
        serviceMap.set(serviceKey, metric);
      }
    });
    
    // Agora, somar as métricas por data, considerando somente a mais recente de cada serviço
    const dailyMetricsMap = new Map<string, {
      investment: number;
      impressions: number;
      clicks: number;
      leads: number;
    }>();
    
    dailyServiceMap.forEach((serviceMap, dateKey) => {
      let agg = { investment: 0, impressions: 0, clicks: 0, leads: 0 };
      serviceMap.forEach((metric: any) => {
        agg.investment += metric.investment || 0;
        agg.impressions += metric.impressions || 0;
        agg.clicks += metric.clicks || 0;
        agg.leads += metric.leads || 0;
      });
      dailyMetricsMap.set(dateKey, agg);
    });
    
    
    
    // Agora aplicar os valores agregados aos dias
    dailyMetricsMap.forEach((aggregated, dateKey) => {
      let metricDate: Date;
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          const [year, month, day] = dateKey.split('-').map(Number);
          metricDate = new Date(year, month - 1, day);
        } else {
          metricDate = new Date(dateKey);
        }
      } catch (error) {
        metricDate = new Date(dateKey);
      }
      
      const dayIndex = metricDate.getDate() - 1;
      
      if (dayIndex >= 0 && dayIndex < data.length) {
        data[dayIndex] = {
          ...data[dayIndex],
          investment: aggregated.investment,
          impressions: aggregated.impressions,
          clicks: aggregated.clicks,
          leads: aggregated.leads,
          // CPM e CTR serão recalculados depois
          cpm: 0,
          ctr: 0,
          cpl: 0,
          status: aggregated.investment > 0 ? 'Ativo' : 'Inativo'
        };
      }
    });
    
    // Recalcular métricas derivadas após agregação
    data.forEach(day => {
      if (day.investment > 0 && day.impressions > 0) {
        day.cpm = (day.investment / day.impressions) * 1000;
        day.ctr = (day.clicks / day.impressions) * 100;
      }
      if (day.investment > 0 && day.leads > 0) {
        day.cpl = day.investment / day.leads;
      }
    });
    
    return data;
  };

  // Gerar dados diários com memoização para evitar re-renders excessivos
  const dailyData = useMemo(() => {
    return generateDailyData();
  }, [metrics, reportInfo.month]);

  // Calcular valores baseados no controle diário
  const calculateDailyBasedMetrics = useMemo(() => {
    
    
    const totals = {
      investment: 0,
      impressions: 0,
      clicks: 0,
      leads: 0,
      activeDays: 0
    };

    dailyData.forEach((row, index) => {
      const investmentValue = row.investment || 0;
      const impressionsValue = row.impressions || 0;
      const clicksValue = row.clicks || 0;
      const leadsValue = row.leads || 0;
      
      if (index < 5 && (investmentValue > 0 || leadsValue > 0)) { // Log apenas primeiros dias com dados
        
      }
      
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
    const totalROAS = totals.investment > 0 ? (totals.leads * 100) / totals.investment : 0;
    const totalROI = totals.investment > 0 ? ((totals.leads * 100) - totals.investment) / totals.investment * 100 : 0;

    // Usar valores reais dos detalhes mensais se disponíveis, senão usar cálculo baseado em leads
    const realAppointments = reportInfo.monthlyDetails.agendamentos > 0 
      ? reportInfo.monthlyDetails.agendamentos 
      : Math.floor(totals.leads * 0.6);
    
    const realSales = reportInfo.monthlyDetails.vendas > 0 
      ? reportInfo.monthlyDetails.vendas 
      : Math.floor(totals.leads * 0.4);

    // Calcular receita baseada nas vendas reais
    const ticketMedio = reportInfo.monthlyDetails.ticketMedio && reportInfo.monthlyDetails.ticketMedio > 0 ? reportInfo.monthlyDetails.ticketMedio : 250;
    const realRevenue = realSales * ticketMedio;
    const realROAS = totals.investment > 0 ? realRevenue / totals.investment : 0;
    const realROI = totals.investment > 0 ? ((realRevenue - totals.investment) / totals.investment) * 100 : 0;

    return {
      totalLeads: totals.leads,
      totalRevenue: realRevenue,
      totalInvestment: totals.investment,
      totalImpressions: totals.impressions,
      totalClicks: totals.clicks,
      avgCTR: Number(avgCTR.toFixed(2)),
      avgCPM: Number(avgCPM.toFixed(2)),
      avgCPL: Number(avgCPL.toFixed(2)),
      totalROAS: Number(realROAS.toFixed(2)),
      totalROI: Number(realROI.toFixed(1)),
      totalAppointments: realAppointments,
      totalSales: realSales,
      activeDays: totals.activeDays
    };
  }, [dailyData, reportInfo.monthlyDetails]);

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

  // Componente do Painel Executivo (Resumo do que realmente importa)
  const ExecutiveSummary: React.FC = () => {
    const aggregated = calculateDailyBasedMetrics;
    
    const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const getROIStatus = () => {
      if (aggregated.totalROI > 0) {
        return {
          color: 'text-green-200',
          bgColor: 'bg-green-900/5',
          borderColor: 'border-green-600/5',
          text: 'Retorno positivo'
        };
      } else if (aggregated.totalROI === 0) {
        return {
          color: 'text-yellow-200',
          bgColor: 'bg-yellow-900/5',
          borderColor: 'border-yellow-600/5',
          text: 'Em equilíbrio'
        };
      } else {
        return {
          color: 'text-red-200',
          bgColor: 'bg-red-900/5',
          borderColor: 'border-red-600/5',
          text: 'Ainda sem retorno financeiro'
        };
      }
    };

    const roiStatus = getROIStatus();

    return (
      <div className="bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-800/40 rounded-2xl p-8 border border-slate-600/30 mb-8 shadow-lg">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100">Resumo do que realmente importa</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Total Investido */}
          <div className="bg-slate-700/25 rounded-lg p-5 border border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-emerald-900/30 rounded-md">
                <DollarSign className="w-4 h-4 text-emerald-300" />
              </div>
              <h3 className="text-slate-300 font-medium text-sm">Total Investido</h3>
            </div>
            <div className="text-2xl font-semibold text-slate-100 mb-1">{formatCurrency(aggregated.totalInvestment)}</div>
            <p className="text-slate-400 text-xs">Valor total gasto em anúncios</p>
          </div>

          {/* Agendamentos Gerados */}
          <div className="bg-slate-700/25 rounded-lg p-5 border border-blue-500/20 hover:border-blue-500/30 transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-blue-900/30 rounded-md">
                <MessageSquare className="w-4 h-4 text-blue-300" />
              </div>
              <h3 className="text-slate-300 font-medium text-sm">Conversas Marcadas</h3>
            </div>
            <div className="text-2xl font-semibold text-slate-100 mb-1">{aggregated.totalAppointments}</div>
            <p className="text-slate-400 text-xs">Pessoas que agendaram atendimento</p>
          </div>

          {/* Vendas Realizadas */}
          <div className="bg-slate-700/25 rounded-lg p-5 border border-purple-500/20 hover:border-purple-500/30 transition-all duration-300">
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-purple-900/30 rounded-md">
                <ShoppingCart className="w-4 h-4 text-purple-300" />
              </div>
              <h3 className="text-slate-300 font-medium text-sm">Vendas Feitas</h3>
            </div>
            <div className="text-2xl font-semibold text-slate-100 mb-1">{aggregated.totalSales}</div>
            <p className="text-slate-400 text-xs">Vendas realizadas através dos anúncios</p>
          </div>

          {/* ROI */}
          <div className={`rounded-lg p-5 border border-red-500/20 hover:border-red-500/30 transition-all duration-300 ${roiStatus.bgColor}`}>
            <div className="flex items-center space-x-2 mb-3">
              <div className="p-1.5 bg-red-900/30 rounded-md">
                <TrendingUp className="w-4 h-4 text-red-300" />
              </div>
              <h3 className="text-slate-300 font-medium text-sm">Retorno (ROI)</h3>
            </div>
            <div className={`text-2xl font-semibold mb-1 ${roiStatus.color}`}>
              {Number(aggregated.totalROI.toFixed(1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
                .replace(',0','') // remove zero desnecessário
              }%
              {aggregated.totalInvestment > 0 && (
                <span className="text-slate-400 font-normal text-lg"> ({(aggregated.totalRevenue / aggregated.totalInvestment).toFixed(1)}x)</span>
              )}
            </div>
            <p className="text-slate-400 text-xs">{roiStatus.text}</p>
          </div>
        </div>

        {/* Explicação do ROI */}
        {(() => {
          const roiStatus = aggregated.totalROI > 0 ? 'positive' : aggregated.totalROI === 0 ? 'neutral' : 'negative';
          
          const roiConfig = {
            positive: {
              bgColor: 'bg-green-900/5',
              borderColor: 'border-green-500/20',
              iconBg: 'bg-green-900/10',
              iconColor: 'text-green-200',
              titleColor: 'text-green-100',
              textColor: 'text-green-50',
              title: 'Por que o ROI está positivo?',
              message: `Excelente! Sua campanha está gerando lucro com um ROI de ${aggregated.totalROI.toFixed(1)}%. Isso significa que para cada R$ 1,00 investido, você está ganhando R$ ${((aggregated.totalROI / 100) + 1).toFixed(2)}. Continue otimizando para maximizar os resultados.`
            },
            neutral: {
              bgColor: 'bg-yellow-900/5',
              borderColor: 'border-yellow-500/20',
              iconBg: 'bg-yellow-900/10',
              iconColor: 'text-yellow-200',
              titleColor: 'text-yellow-100',
              textColor: 'text-yellow-50',
              title: 'ROI em equilíbrio',
              message: `Seu ROI está em ${aggregated.totalROI.toFixed(1)}%, indicando que a campanha está no ponto de equilíbrio. Isso é um bom sinal para campanhas em desenvolvimento. Foque em otimizações para gerar lucro.`
            },
            negative: {
              bgColor: 'bg-red-900/5',
              borderColor: 'border-red-500/20',
              iconBg: 'bg-red-900/10',
              iconColor: 'text-red-200',
              titleColor: 'text-red-100',
              textColor: 'text-red-50',
              title: 'Por que o ROI está negativo?',
              message: (() => {
                if (aggregated.totalSales > 0) {
                  return `Você teve ${aggregated.totalSales} vendas, mas o custo ainda supera a receita. Isso indica que precisamos otimizar o custo por aquisição para tornar a campanha lucrativa.`;
                } else if (aggregated.totalAppointments > 0) {
                  return `Você gerou ${aggregated.totalAppointments} agendamentos, mas ainda não converteu em vendas. O foco deve ser na qualificação e conversão desses leads.`;
                } else if (aggregated.totalLeads > 0) {
                  return `Você capturou ${aggregated.totalLeads} leads interessados, mas precisa melhorar o processo de agendamento e conversão.`;
                } else {
                  return `O anúncio ainda não gerou lucro em vendas. Isso é comum nas primeiras campanhas e será ajustado nas próximas otimizações.`;
                }
              })()
            }
          };

          const config = roiConfig[roiStatus];
          
          return (
            <div className={`mb-6 p-4 ${config.bgColor} border ${config.borderColor} rounded-lg`}>
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 ${config.iconBg} rounded-md flex-shrink-0 mt-0.5`}>
                  <Info className={`w-4 h-4 ${config.iconColor}`} />
                </div>
                <div>
                  <h4 className={`${config.titleColor} font-medium mb-2 text-base`}>{config.title}</h4>
                  <p className={`${config.textColor} text-sm leading-relaxed`}>
                    {config.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    );
  };



  // Componente de Relatório Explicativo
  const ExplanatoryReport: React.FC = () => {
    const aggregated = calculateDailyBasedMetrics;

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    const generatePerformanceAnalysis = (): {
      title: string;
      message: React.ReactNode;
      type: 'success' | 'warning' | 'info';
    } => {
      const { totalSales, totalAppointments, totalLeads, totalClicks, totalImpressions, totalInvestment, totalROI } = aggregated;
      const isWhatsAppCampaign = reportInfo.campaignType === 'whatsapp';
      
      // Cenário 1: Vendas realizadas (melhor cenário)
      if (totalSales > 0) {
        const costPerSale = totalInvestment / totalSales;
        const roiStatus = totalROI > 0 ? 'positivo' : 'negativo';
        
        if (totalROI > 50) {
          return {
            title: "Resultado Excepcional!",
            message: <>Com um investimento de <strong>{formatCurrency(totalInvestment)}</strong>, você conseguiu <strong>{totalSales} vendas</strong>, resultando em um custo médio de <strong>{formatCurrency(costPerSale)}</strong> por venda. O ROI de <strong>{totalROI.toFixed(1)}%</strong> indica uma campanha altamente lucrativa.</>,
            type: "success"
          };
        } else if (totalROI > 0) {
          return {
            title: "Bom Resultado!",
            message: <>Sua campanha está gerando lucro! Com <strong>{totalSales} vendas</strong> e um ROI de <strong>{totalROI.toFixed(1)}%</strong>, você está no caminho certo. O custo por venda de <strong>{formatCurrency(costPerSale)}</strong> está dentro do esperado.</>,
            type: "success"
          };
        } else {
          return {
            title: "Vendas Realizadas, Mas Precisa Otimizar",
            message: <>Você conseguiu <strong>{totalSales} vendas</strong> com um investimento de <strong>{formatCurrency(totalInvestment)}</strong>, mas o ROI ainda está negativo. Isso indica que o custo por venda (<strong>{formatCurrency(costPerSale)}</strong>) precisa ser reduzido.</>,
            type: "warning"
          };
        }
      }
      
      // Cenário 2: Agendamentos (com ou sem vendas)
      if (totalAppointments > 0) {
        const costPerAppointment = totalInvestment / totalAppointments;
        
        if (totalSales > 0) {
          return {
            title: "Resultado Excelente: Agendamentos e Vendas!",
            message: <><strong>{totalAppointments} pessoas</strong> agendaram atendimento e você conseguiu <strong>{totalSales} vendas</strong>. Isso mostra que tanto o processo de agendamento quanto a conversão estão funcionando bem. Custo por agendamento: <strong>{formatCurrency(costPerAppointment)}</strong>.</>,
            type: "success"
          };
        } else {
          return {
            title: "Pipeline de Vendas Ativo",
            message: <><strong>{totalAppointments} pessoas</strong> agendaram atendimento, criando oportunidades valiosas de venda. O foco agora deve ser na conversão desses leads em vendas. O custo por agendamento foi de <strong>{formatCurrency(costPerAppointment)}</strong>.</>,
            type: "info"
          };
        }
      }
      
      // Cenário 3: Leads mas sem agendamentos
      if (totalLeads > 0 && totalAppointments === 0) {
        const costPerLead = totalInvestment / totalLeads;
        const hasSales = totalSales > 0;
        
        if (hasSales) {
          return {
            title: "Interesse e Vendas Geradas!",
            message: <><strong>{totalLeads} pessoas</strong> se interessaram e enviaram mensagem, gerando <strong>{totalSales} vendas</strong> mesmo sem agendamentos formais. Isso indica que o processo de vendas está funcionando diretamente. Custo por lead: <strong>{formatCurrency(costPerLead)}</strong>.</>,
            type: "success"
          };
        } else {
          return {
            title: "Interesse Gerado, Próximo Passo: Agendamentos",
            message: <><strong>{totalLeads} pessoas</strong> se interessaram e enviaram mensagem, mas ainda não agendaram atendimento. O próximo passo é melhorar o processo de qualificação e agendamento. Custo por lead: <strong>{formatCurrency(costPerLead)}</strong>.</>,
            type: "info"
          };
        }
      }
      
      // Cenário 4: Cliques mas sem leads
      if (totalClicks > 0 && totalLeads === 0) {
        const ctr = (totalClicks / totalImpressions) * 100;
        return {
          title: "Tráfego Gerado, Precisa Melhorar Conversão",
          message: <>Seu anúncio gerou <strong>{totalClicks} cliques</strong> (CTR de <strong>{ctr.toFixed(2)}%</strong>), mas ainda não converteu em leads. {isWhatsAppCampaign ? 'Isso pode indicar que o call-to-action do anúncio precisa ser mais atrativo para gerar mais mensagens diretas.' : 'Isso pode indicar que a página de destino precisa ser otimizada para capturar mais interessados.'}</>,
          type: "warning"
        };
      }
      
      // Cenário 5: Impressões mas sem cliques
      if (totalImpressions > 0 && totalClicks === 0) {
        return {
          title: "Anúncio em Teste",
          message: <>Seu anúncio foi exibido <strong>{totalImpressions.toLocaleString('pt-BR')} vezes</strong>, mas ainda não gerou cliques. Isso é comum no início de campanhas. {isWhatsAppCampaign ? 'Recomendamos ajustar o call-to-action do anúncio para incentivar mais cliques diretos no WhatsApp.' : 'Recomendamos ajustar o texto do anúncio ou o público-alvo para aumentar o engajamento.'}</>,
          type: "info"
        };
      }
      
      // Cenário 6: Sem atividade (pior cenário)
      if (totalInvestment === 0) {
        return {
          title: "Campanha Não Iniciada",
          message: "Não há investimento registrado neste período. Para começar a gerar resultados, é necessário ativar a campanha e definir um orçamento.",
          type: "warning"
        };
      }
      
      // Cenário padrão: Investimento mas sem resultados
      return {
        title: "Campanha em Desenvolvimento",
        message: <>Com um investimento de <strong>{formatCurrency(totalInvestment)}</strong>, a campanha ainda está em fase de teste. Isso é normal nas primeiras semanas. Recomendamos continuar o investimento e monitorar os resultados para otimizações futuras.</>,
        type: "info"
      };
    };

    const performanceAnalysis = generatePerformanceAnalysis();

    return (
      <div className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-100">O que isso significa para o seu negócio?</h2>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-700/20 rounded-lg p-6 border border-slate-600/10">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Alcance do Anúncio</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  <span>Seu anúncio foi exibido <span className="text-slate-100 font-semibold">{aggregated.totalImpressions.toLocaleString('pt-BR')}</span> vezes</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  <span><span className="text-slate-100 font-semibold">{aggregated.totalClicks}</span> pessoas clicaram no anúncio</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-300 rounded-full"></div>
                  <span><span className="text-slate-100 font-semibold">{aggregated.totalLeads}</span> pessoas se interessaram e enviaram mensagem</span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-700/20 rounded-lg p-6 border border-slate-600/10">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Resultados Financeiros</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span><span className="text-slate-100 font-semibold">{aggregated.totalAppointments}</span> conversas foram marcadas</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span><span className="text-slate-100 font-semibold">{aggregated.totalSales}</span> vendas foram realizadas</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>Investimento total: <span className="text-slate-100 font-semibold">{formatCurrency(aggregated.totalInvestment)}</span></span>
                </li>
              </ul>
                        </div>
                  </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Análise de Performance</h3>
            <div className={`p-5 rounded-lg border ${
              performanceAnalysis.type === 'success' ? 'bg-green-900/5 border-green-600/10' :
              performanceAnalysis.type === 'warning' ? 'bg-yellow-900/5 border-yellow-600/10' :
              'bg-blue-900/5 border-blue-600/10'
            }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${
                  performanceAnalysis.type === 'success' ? 'bg-green-900/15' :
                  performanceAnalysis.type === 'warning' ? 'bg-yellow-900/15' :
                  'bg-blue-900/15'
                }`}>
                  {performanceAnalysis.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-200" />
                  ) : performanceAnalysis.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-yellow-200" />
                  ) : (
                    <Info className="w-4 h-4 text-blue-200" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium mb-2 text-base ${
                    performanceAnalysis.type === 'success' ? 'text-green-100' :
                    performanceAnalysis.type === 'warning' ? 'text-yellow-100' :
                    'text-blue-100'
                  }`}>
                    {performanceAnalysis.title}
                  </h4>
                  <p className="leading-relaxed text-slate-300 text-sm">
                    {performanceAnalysis.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadPublicReport = async () => {
      try {
        
        setLoading(true);
        
        // Extrair parâmetros da URL
        const audience = searchParams.get('audience') || '';
        const product = searchParams.get('product') || '';
        const client = searchParams.get('client') || '';
        const month = searchParams.get('month') || '';
        const campaignType = searchParams.get('campaignType') || 'landing_page'; // 'whatsapp' ou 'landing_page'
        
        // Extrair dados dos detalhes mensais se disponíveis
        const agendamentos = parseInt(searchParams.get('agendamentos') || '0');
        const vendas = parseInt(searchParams.get('vendas') || '0');
        const ticketMedioParam = parseFloat(searchParams.get('ticketMedio') || '0');
        
        setReportInfo({ 
          audience, 
          product, 
          client, 
          month, 
          campaignType,
                      monthlyDetails: {
              agendamentos,
              vendas,
              ticketMedio: ticketMedioParam
            }
        });
        
        // Carregar métricas públicas - priorizar dados da campanha (produto)
        
        
        // Se temos um produto específico, carregar dados da campanha
        if (product && product !== 'Todos os Produtos' && product !== '') {
          const data = await metricsService.getPublicMetrics(month, client, product, 'Todos os Públicos');
          
          setMetrics(data);
        } else if (audience && audience !== 'Todos os Públicos' && audience !== '') {
          // Fallback para dados do público se não há produto específico
          const data = await metricsService.getPublicMetrics(month, client, 'Todos os Produtos', audience);
          
          setMetrics(data);
        } else {
          // Carregar dados gerais
          const data = await metricsService.getPublicMetrics(month, client, 'Todos os Produtos', 'Todos os Públicos');
          
          setMetrics(data);
        }
        
        // Sempre tentar buscar detalhes mensais mais recentes salvos no Firebase
        if (product && month && client) {
          try {
            
            const savedDetails = await metricsService.getMonthlyDetails(month, product, client);
            if (savedDetails) {
              
              setReportInfo(prev => ({
                ...prev,
                monthlyDetails: {
                  agendamentos: savedDetails.agendamentos,
                  vendas: savedDetails.vendas,
                  ticketMedio: savedDetails.ticketMedio || 0
                }
              }));
            }
          } catch (error) {
            console.error('Erro ao carregar detalhes salvos:', error);
          }
        }
        
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPublicReport();
  }, [searchParams, refreshTrigger]);

  // Listener para atualizações do relatório via localStorage
  useEffect(() => {
    let lastUpdateTimestamp = 0;
    let isProcessingUpdate = false;

    const checkForUpdates = () => {
      // Evitar processamento simultâneo
      if (isProcessingUpdate) return;
      
      try {
        const storedUpdate = localStorage.getItem('metaAdsDataRefreshed');
        if (storedUpdate) {
          const updateData = JSON.parse(storedUpdate);
          
          // Verificar se é uma atualização nova
          if (updateData.timestamp > lastUpdateTimestamp) {
            lastUpdateTimestamp = updateData.timestamp;
            isProcessingUpdate = true;
            
            
            // Aguardar um pouco para garantir que o Firebase foi atualizado
            setTimeout(() => {
              
              setRefreshTrigger(prev => {
                const newValue = prev + 1;
                
                return newValue;
              });
              // Reset do flag após processamento
              setTimeout(() => {
                isProcessingUpdate = false;
              }, 1000);
            }, 2000);
          }
        }
      } catch (error) {
        console.error('PublicReportView: Erro ao verificar atualizações:', error);
        isProcessingUpdate = false;
      }
    };

    // Verificar imediatamente
    checkForUpdates();

    // Verificar a cada 5 segundos para atualizações mais rápidas
    const interval = setInterval(checkForUpdates, 5000);
    

    return () => {
      clearInterval(interval);
      
    };
  }, []);

  // Adicionar listener para mudanças no localStorage em tempo real
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'metaAdsDataRefreshed' && e.newValue) {
        try {
          const updateData = JSON.parse(e.newValue);
          
          
          // Forçar reload imediato
          setRefreshTrigger(prev => {
            const newValue = prev + 1;
            
            return newValue;
          });
        } catch (error) {
          console.error('PublicReportView: Erro ao processar mudança no localStorage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Encontrar a última data de atualização entre as métricas
  const lastUpdated = metrics.length > 0
    ? metrics.reduce((latest, m) => {
        if (!m.updatedAt) return latest;
        
        let date: Date | null = null;
        
        // Tratar diferentes formatos de data que podem vir do Firebase
        if (m.updatedAt instanceof Date) {
          date = m.updatedAt;
        } else if (m.updatedAt && typeof m.updatedAt === 'object' && 'toDate' in m.updatedAt) {
          // Timestamp do Firestore
          date = (m.updatedAt as any).toDate();
        } else if (typeof m.updatedAt === 'string' || typeof m.updatedAt === 'number') {
          // String ou timestamp em milliseconds
          date = new Date(m.updatedAt);
        }
        
        // Verificar se a data é válida
        if (date && !isNaN(date.getTime())) {
          return (!latest || date > latest) ? date : latest;
        }
        
        return latest;
      }, null as Date | null)
    : null;

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
              {lastUpdated && (
                <span className="text-xs text-slate-400 ml-2">|
                  Última atualização: {dayjs(lastUpdated).format('DD/MM/YYYY HH:mm')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Informações do Relatório */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-slate-800/20 rounded-lg p-4 mb-6 border border-slate-700/10">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
            <h1 className="text-lg font-medium text-slate-300">Relatório da Campanha</h1>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-700/10 rounded-lg border border-slate-600/5">
              <p className="text-slate-500 text-xs mb-1">Campanha</p>
              <p className="text-slate-300 font-medium text-sm leading-relaxed">{reportInfo.product}</p>
            </div>
            
            <div className="p-3 bg-slate-700/10 rounded-lg border border-slate-600/5">
              <p className="text-slate-500 text-xs mb-1">Cliente</p>
              <p className="text-slate-300 font-medium text-sm leading-relaxed">{reportInfo.client}</p>
            </div>
            
            <div className="p-3 bg-slate-700/10 rounded-lg border border-slate-600/5">
              <p className="text-slate-500 text-xs mb-1">Período</p>
              <p className="text-slate-300 font-medium text-sm leading-relaxed">{reportInfo.month}</p>
            </div>
          </div>
        </div>

        {/* Conteúdo do Relatório */}
        <div key={`content-${refreshTrigger}-${metrics.length}`} className="space-y-8">
          {/* Painel Executivo */}
          <ExecutiveSummary key={`executive-${refreshTrigger}-${metrics.length}`} />
          
          {/* Relatório Explicativo */}
          <ExplanatoryReport key={`explanatory-${refreshTrigger}-${metrics.length}`} />
          
          {/* Tabela de Controle Diário */}
          <DailyControlTable 
            key={`table-${refreshTrigger}-${metrics.length}`}
            metrics={metrics} 
            selectedMonth={reportInfo.month}
            customRecordCount={calculateDailyBasedMetrics.activeDays}
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