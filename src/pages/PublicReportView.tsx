import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, Lock, Calendar, User, Package, Users, Info, TrendingUp, TrendingDown, DollarSign, Users as UsersIcon, MessageSquare, ShoppingCart, Target, BarChart3, CheckCircle, AlertTriangle, RefreshCw, MousePointer } from 'lucide-react';
import DailyControlTable from '../components/DailyControlTable';
import { metricsService, MetricData } from '../services/metricsService';
import dayjs from 'dayjs';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';

// Cache inteligente para relatórios compartilhados
class PublicReportCache {
  private static instance: PublicReportCache;
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  public static getInstance(): PublicReportCache {
    if (!PublicReportCache.instance) {
      PublicReportCache.instance = new PublicReportCache();
    }

    // Disponibilizar globalmente para outros componentes
    if (typeof window !== 'undefined') {
      (window as any).PublicReportCache = PublicReportCache;
    }

    return PublicReportCache.instance;
  }

  async getCachedData(key: string, fetchFunction: () => Promise<any>): Promise<any> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < cached.ttl) {
      return cached.data;
    }

    const data = await fetchFunction();
    this.cache.set(key, {
      data,
      timestamp: now,
      ttl: this.DEFAULT_TTL
    });

    return data;
  }

  generateKey(month: string, client: string, product: string, audience: string): string {
    return `public_metrics_${month}_${client}_${product}_${audience}`;
  }

  clearCache(): void {
    this.cache.clear();
  }

  clearSpecificCache(month: string, client: string, product: string, audience: string): void {
    const key = this.generateKey(month, client, product, audience);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
  }
}

type FunnelType = 'WHATSAPP' | 'LEADS' | 'DIRETA' | 'AUDIENCIA';

type ObjectiveInfo = {
  key: FunnelType;
  label: string;
};

function normalizeFunnelType(value?: string | null): FunnelType | null {
  if (!value) return null;
  const normalized = value.toUpperCase();
  if (normalized === 'WHATSAPP' || normalized === 'LEADS' || normalized === 'DIRETA' || normalized === 'AUDIENCIA') {
    return normalized;
  }
  return null;
}

function mapCampaignTypeToFunnel(campaignType?: string): FunnelType {
  const normalized = (campaignType || '').toLowerCase();
  if (normalized === 'whatsapp') return 'WHATSAPP';
  if (normalized === 'leads' || normalized === 'landing_page' || normalized === 'landing-page') return 'LEADS';
  if (normalized === 'direta' || normalized === 'direct' || normalized === 'trafego_direto') return 'DIRETA';
  if (normalized === 'audiencia' || normalized === 'audience') return 'AUDIENCIA';
  return 'WHATSAPP';
}

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
      ticketMedio: 0,
      seguidoresNovos: 0,
      funnelType: null as FunnelType | null,
      monthlyBudget: 0,
      agendamentosEnabled: true
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
    const realAppointments = reportInfo.monthlyDetails.agendamentos !== undefined
      ? reportInfo.monthlyDetails.agendamentos
      : Math.floor(totals.leads * 0.6);

    const realSales = reportInfo.monthlyDetails.vendas !== undefined
      ? reportInfo.monthlyDetails.vendas
      : Math.floor(totals.leads * 0.4);

    // Calcular receita baseada nas vendas reais
    const ticketMedio = reportInfo.monthlyDetails.ticketMedio && reportInfo.monthlyDetails.ticketMedio > 0 ? reportInfo.monthlyDetails.ticketMedio : 250;
    const realRevenue = realSales * ticketMedio;
    const realROAS = totals.investment > 0 ? realRevenue / totals.investment : 0;
    const realROI = totals.investment > 0 ? ((realRevenue - totals.investment) / totals.investment) * 100 : 0;
    const seguidoresNovos = reportInfo.monthlyDetails.seguidoresNovos || 0;
    const costPerFollower = seguidoresNovos > 0 ? totals.investment / seguidoresNovos : 0;

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
      activeDays: totals.activeDays,
      totalFollowers: seguidoresNovos,
      costPerFollower: Number(costPerFollower.toFixed(2))
    };
  }, [dailyData, reportInfo.monthlyDetails]);

  const objectiveInfo = useMemo<ObjectiveInfo>(() => {
    const byMonthlyDetails = normalizeFunnelType(reportInfo.monthlyDetails.funnelType);
    if (byMonthlyDetails) {
      const labels: Record<FunnelType, string> = {
        WHATSAPP: 'WhatsApp',
        LEADS: 'Captura de Leads',
        DIRETA: 'Tráfego Direto',
        AUDIENCIA: 'Audiência'
      };
      return { key: byMonthlyDetails, label: labels[byMonthlyDetails] };
    }

    const fallback = mapCampaignTypeToFunnel(reportInfo.campaignType);
    const fallbackLabels: Record<FunnelType, string> = {
      WHATSAPP: 'WhatsApp',
      LEADS: 'Captura de Leads',
      DIRETA: 'Tráfego Direto',
      AUDIENCIA: 'Audiência'
    };
    return { key: fallback, label: fallbackLabels[fallback] };
  }, [reportInfo.campaignType, reportInfo.monthlyDetails.funnelType]);

  const agendamentosInUse = reportInfo.monthlyDetails.agendamentosEnabled !== false;

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

  // Função para formatar moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Componente do Painel Executivo (Resumo do que realmente importa)
  const ExecutiveSummary: React.FC = () => {
    const aggregated = calculateDailyBasedMetrics;
    const isAudience = objectiveInfo.key === 'AUDIENCIA';
    const isDirect = objectiveInfo.key === 'DIRETA';
    const isWhatsApp = objectiveInfo.key === 'WHATSAPP';
    const isLeads = objectiveInfo.key === 'LEADS';

    const getROIStatus = () => {
      if (aggregated.totalROI > 0) return { color: 'text-green-200', bg: 'bg-green-900/5', text: 'Retorno positivo' };
      if (aggregated.totalROI === 0) return { color: 'text-yellow-200', bg: 'bg-yellow-900/5', text: 'Em equilíbrio' };
      return { color: 'text-red-200', bg: 'bg-red-900/5', text: 'Ainda sem retorno financeiro' };
    };

    const roiStatus = getROIStatus();

    const metricCards = (() => {
      if (objectiveInfo.key === 'AUDIENCIA') {
        return [
          {
            title: 'Seguidores Novos',
            value: aggregated.totalFollowers.toLocaleString('pt-BR'),
            subtitle: 'Objetivo principal da campanha de audiência',
            icon: UsersIcon,
            border: 'border-indigo-500/20 hover:border-indigo-500/30',
            bg: 'bg-indigo-900/30'
          },
          {
            title: 'Custo por Seguidor',
            value: aggregated.totalFollowers > 0 ? formatCurrency(aggregated.costPerFollower) : '—',
            subtitle: 'Investimento médio por novo seguidor',
            icon: Target,
            border: 'border-blue-500/20 hover:border-blue-500/30',
            bg: 'bg-blue-900/30'
          },
          {
            title: 'CTR Médio',
            value: `${aggregated.avgCTR.toLocaleString('pt-BR', { maximumFractionDigits: 2 }).replace(',00', '')}%`,
            subtitle: 'Engajamento com o anúncio',
            icon: BarChart3,
            border: 'border-cyan-500/20 hover:border-cyan-500/30',
            bg: 'bg-cyan-900/30'
          }
        ];
      }

      if (isDirect) {
        return [
          {
            title: 'Cliques Qualificados',
            value: aggregated.totalClicks.toLocaleString('pt-BR'),
            subtitle: 'Tráfego levado para a página',
            icon: MousePointer,
            border: 'border-blue-500/20 hover:border-blue-500/30',
            bg: 'bg-blue-900/30'
          },
          {
            title: 'Vendas Feitas',
            value: aggregated.totalSales.toLocaleString('pt-BR'),
            subtitle: 'Conversões finais da campanha',
            icon: ShoppingCart,
            border: 'border-purple-500/20 hover:border-purple-500/30',
            bg: 'bg-purple-900/30'
          },
          {
            title: 'Custo por Venda',
            value: aggregated.totalSales > 0 ? formatCurrency(aggregated.totalInvestment / aggregated.totalSales) : '—',
            subtitle: 'Investimento médio por venda',
            icon: DollarSign,
            border: 'border-amber-500/20 hover:border-amber-500/30',
            bg: 'bg-amber-900/30'
          }
        ];
      }

      const cards = [
        {
          title: isWhatsApp ? 'Conversas Iniciadas' : 'Leads Captados',
          value: aggregated.totalLeads.toLocaleString('pt-BR'),
          subtitle: isWhatsApp ? 'Pessoas que enviaram mensagem' : 'Contatos captados no funil',
          icon: MessageSquare,
          border: 'border-blue-500/20 hover:border-blue-500/30',
          bg: 'bg-blue-900/30'
        },
        {
          title: 'Agendamentos',
          value: aggregated.totalAppointments.toLocaleString('pt-BR'),
          subtitle: 'Oportunidades criadas para o time comercial',
          icon: Calendar,
          border: 'border-indigo-500/20 hover:border-indigo-500/30',
          bg: 'bg-indigo-900/30'
        },
        {
          title: 'Vendas Feitas',
          value: aggregated.totalSales.toLocaleString('pt-BR'),
          subtitle: 'Conversões finais da campanha',
          icon: ShoppingCart,
          border: 'border-purple-500/20 hover:border-purple-500/30',
          bg: 'bg-purple-900/30'
        },
        {
          title: 'Retorno (ROI)',
          value: `${Number(aggregated.totalROI.toFixed(1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 }).replace(',0', '')}%`,
          subtitle: roiStatus.text,
          icon: TrendingUp,
          border: 'border-red-500/20 hover:border-red-500/30',
          bg: 'bg-red-900/30',
          valueClass: roiStatus.color
        }
      ];

      // WhatsApp: sem uso em agendamento => remove card Agendamentos
      if (isWhatsApp && !agendamentosInUse) {
        return cards.filter(card => card.title !== 'Agendamentos');
      }

      // WhatsApp: com uso em agendamento => remove card ROI
      if (isWhatsApp && agendamentosInUse) {
        return cards.filter(card => card.title !== 'Retorno (ROI)');
      }

      // Captura de Leads: remover card de vendas
      if (isLeads) {
        return cards.filter(card => card.title !== 'Vendas Feitas');
      }

      return cards;
    })();

    return (
      <div className="bg-gradient-to-br from-slate-800/40 via-slate-700/30 to-slate-800/40 rounded-2xl p-8 border border-slate-600/30 mb-8 shadow-lg">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-100">Resumo do que realmente importa</h2>
          <p className="text-slate-400 text-sm mt-1">Objetivo da campanha: <span className="text-slate-200 font-medium">{objectiveInfo.label}</span></p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
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

          {metricCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`bg-slate-700/25 rounded-lg p-5 border ${card.border} transition-all duration-300`}>
                <div className="flex items-center space-x-2 mb-3">
                  <div className={`p-1.5 rounded-md ${card.bg}`}>
                    <Icon className="w-4 h-4 text-slate-200" />
                  </div>
                  <h3 className="text-slate-300 font-medium text-sm">{card.title}</h3>
                </div>
                <div className={`text-2xl font-semibold mb-1 ${card.valueClass || 'text-slate-100'}`}>{card.value}</div>
                <p className="text-slate-400 text-xs">{card.subtitle}</p>
              </div>
            );
          })}
        </div>

        {/* Explicação de performance */}
        {(() => {
          const roiMode = aggregated.totalROI > 0 ? 'positive' : aggregated.totalROI === 0 ? 'neutral' : 'negative';
          const configByMode = {
            positive: { bgColor: 'bg-green-900/5', borderColor: 'border-green-500/20', iconBg: 'bg-green-900/10', iconColor: 'text-green-200', titleColor: 'text-green-100', textColor: 'text-green-50' },
            neutral: { bgColor: 'bg-yellow-900/5', borderColor: 'border-yellow-500/20', iconBg: 'bg-yellow-900/10', iconColor: 'text-yellow-200', titleColor: 'text-yellow-100', textColor: 'text-yellow-50' },
            negative: { bgColor: 'bg-red-900/5', borderColor: 'border-red-500/20', iconBg: 'bg-red-900/10', iconColor: 'text-red-200', titleColor: 'text-red-100', textColor: 'text-red-50' }
          };
          const modeStyle = configByMode[roiMode];

          let title = 'Leitura rápida da performance';
          let message = '';
          if (isAudience) {
            title = 'Leitura rápida da campanha de audiência';
            message = aggregated.totalFollowers > 0
              ? `A campanha gerou ${aggregated.totalFollowers.toLocaleString('pt-BR')} novos seguidores com custo médio de ${formatCurrency(aggregated.costPerFollower)} por seguidor. Use esse valor para comparar eficiência entre criativos e públicos.`
              : `A campanha ainda não gerou seguidores novos no período. Ajuste segmentação e criativos para aumentar o volume de novos seguidores.`;
          } else if (isDirect) {
            title = 'Leitura rápida da campanha de tráfego direto';
            message = aggregated.totalSales > 0
              ? `Você levou ${aggregated.totalClicks.toLocaleString('pt-BR')} visitantes e converteu ${aggregated.totalSales.toLocaleString('pt-BR')} vendas. O próximo passo é reduzir custo por venda sem perder volume de tráfego qualificado.`
              : `A campanha gerou tráfego (${aggregated.totalClicks.toLocaleString('pt-BR')} cliques), mas ainda sem vendas. Otimize página, oferta e follow-up para converter melhor o tráfego.`;
          } else {
            title = objectiveInfo.key === 'WHATSAPP' ? 'Leitura rápida da campanha para WhatsApp' : 'Leitura rápida da campanha de captura de leads';
            message = aggregated.totalLeads > 0
              ? `Você captou ${aggregated.totalLeads.toLocaleString('pt-BR')} contatos. O foco agora é aumentar a conversão de ${aggregated.totalAppointments.toLocaleString('pt-BR')} agendamentos em vendas.`
              : `A campanha ainda não gerou contatos suficientes no período. Revise oferta, criativo e chamada para ação para aumentar captação.`;
          }

          return (
            <div className={`mb-6 p-4 ${modeStyle.bgColor} border ${modeStyle.borderColor} rounded-lg`}>
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 ${modeStyle.iconBg} rounded-md flex-shrink-0 mt-0.5`}>
                  <Info className={`w-4 h-4 ${modeStyle.iconColor}`} />
                </div>
                <div>
                  <h4 className={`${modeStyle.titleColor} font-medium mb-2 text-base`}>{title}</h4>
                  <p className={`${modeStyle.textColor} text-sm leading-relaxed`}>
                    {message}
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
    const isAudience = objectiveInfo.key === 'AUDIENCIA';
    const isDirect = objectiveInfo.key === 'DIRETA';

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
      if (totalInvestment === 0) {
        return {
          title: 'Campanha Não Iniciada',
          message: 'Não há investimento registrado neste período. Para gerar resultado, é necessário ativar a campanha e manter consistência de execução.',
          type: 'warning'
        };
      }

      if (isAudience) {
        if (aggregated.totalFollowers > 0) {
          return {
            title: 'Audiência em crescimento',
            message: <>A campanha gerou <strong>{aggregated.totalFollowers.toLocaleString('pt-BR')} seguidores novos</strong> com investimento de <strong>{formatCurrency(totalInvestment)}</strong>. O custo por seguidor está em <strong>{formatCurrency(aggregated.costPerFollower)}</strong>.</>,
            type: 'success'
          };
        }
        if (totalClicks > 0) {
          return {
            title: 'Há tráfego, mas faltou conversão em seguidores',
            message: <>Seu anúncio já trouxe <strong>{totalClicks.toLocaleString('pt-BR')} cliques</strong>, mas ainda sem crescimento de seguidores. Ajuste a promessa criativa e o CTA para foco em follow.</>,
            type: 'warning'
          };
        }
        return {
          title: 'Campanha em fase de aprendizado',
          message: <>A campanha de audiência está em aquecimento. Continue testando criativos e públicos para aumentar alcance e crescimento de seguidores.</>,
          type: 'info'
        };
      }

      if (isDirect) {
        if (totalSales > 0) {
          const costPerSale = totalInvestment / totalSales;
          return {
            title: totalROI > 0 ? 'Tráfego convertendo em vendas' : 'Vendas geradas, com espaço para otimização',
            message: <>Você gerou <strong>{totalSales.toLocaleString('pt-BR')} vendas</strong> a partir de <strong>{totalClicks.toLocaleString('pt-BR')} cliques</strong>. O custo médio por venda está em <strong>{formatCurrency(costPerSale)}</strong> e o ROI atual é <strong>{totalROI.toFixed(1)}%</strong>.</>,
            type: totalROI > 0 ? 'success' : 'warning'
          };
        }
        if (totalClicks > 0) {
          return {
            title: 'Tráfego gerado, sem conversão final',
            message: <>Foram gerados <strong>{totalClicks.toLocaleString('pt-BR')} cliques</strong>, mas ainda sem vendas no período. O próximo foco é otimização de página, oferta e sequência comercial.</>,
            type: 'warning'
          };
        }
        return {
          title: 'Campanha em desenvolvimento',
          message: <>Com investimento ativo, a campanha ainda está em validação de tráfego e conversão. Mantenha testes de criativo e proposta para estabilizar vendas.</>,
          type: 'info'
        };
      }

      // WHATSAPP e LEADS
      if (totalSales > 0) {
        const costPerSale = totalInvestment / totalSales;
        return {
          title: totalROI > 0 ? 'Funil comercial com resultado' : 'Funil gerando vendas com margem apertada',
          message: <>Você captou <strong>{totalLeads.toLocaleString('pt-BR')} contatos</strong>, teve <strong>{totalAppointments.toLocaleString('pt-BR')} agendamentos</strong> e concluiu <strong>{totalSales.toLocaleString('pt-BR')} vendas</strong>. Custo por venda: <strong>{formatCurrency(costPerSale)}</strong>.</>,
          type: totalROI > 0 ? 'success' : 'warning'
        };
      }
      if (totalLeads > 0) {
        const costPerLead = totalInvestment / totalLeads;
        return {
          title: 'Captação ativa, falta converter melhor',
          message: <>A campanha já gerou <strong>{totalLeads.toLocaleString('pt-BR')} contatos</strong> com custo por lead de <strong>{formatCurrency(costPerLead)}</strong>. O ganho agora está em elevar agendamento e fechamento.</>,
          type: 'info'
        };
      }
      if (totalClicks > 0) {
        return {
          title: 'Tráfego sem captação',
          message: <>Há cliques no anúncio, mas sem leads relevantes. Ajuste promessa, CTA e estrutura da página/formulário para melhorar captura.</>,
          type: 'warning'
        };
      }
      return {
        title: 'Campanha em desenvolvimento',
        message: <>A campanha está em fase inicial de aprendizado. Continue monitorando para identificar o melhor conjunto de criativo e público.</>,
        type: 'info'
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
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Aquisição e Tráfego</h3>
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
                  <span>
                    {isAudience ? (
                      <><span className="text-slate-100 font-semibold">{aggregated.totalFollowers.toLocaleString('pt-BR')}</span> novos seguidores foram conquistados</>
                    ) : isDirect ? (
                      <>A campanha gerou <span className="text-slate-100 font-semibold">{aggregated.totalClicks.toLocaleString('pt-BR')}</span> visitas qualificadas</>
                    ) : (
                      <><span className="text-slate-100 font-semibold">{aggregated.totalLeads.toLocaleString('pt-BR')}</span> contatos entraram no funil</>
                    )}
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-slate-700/20 rounded-lg p-6 border border-slate-600/10">
              <h3 className="text-lg font-semibold text-slate-100 mb-4">Resultado de Negócio</h3>
              <ul className="space-y-3 text-slate-300">
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>
                    {isAudience ? (
                      <>Custo por seguidor em <span className="text-slate-100 font-semibold">{aggregated.totalFollowers > 0 ? formatCurrency(aggregated.costPerFollower) : '—'}</span></>
                    ) : isDirect ? (
                      <>ROI atual da campanha: <span className="text-slate-100 font-semibold">{Number(aggregated.totalROI.toFixed(1)).toLocaleString('pt-BR', { maximumFractionDigits: 1 }).replace(',0', '')}%</span></>
                    ) : (
                      <><span className="text-slate-100 font-semibold">{aggregated.totalAppointments.toLocaleString('pt-BR')}</span> oportunidades foram agendadas</>
                    )}
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>
                    {isAudience ? (
                      <>CTR médio em <span className="text-slate-100 font-semibold">{aggregated.avgCTR.toLocaleString('pt-BR', { maximumFractionDigits: 2 }).replace(',00', '')}%</span></>
                    ) : (
                      <><span className="text-slate-100 font-semibold">{aggregated.totalSales.toLocaleString('pt-BR')}</span> vendas foram realizadas</>
                    )}
                  </span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span>
                    {isAudience ? (
                      <>Investimento total em audiência: <span className="text-slate-100 font-semibold">{formatCurrency(aggregated.totalInvestment)}</span></>
                    ) : (
                      <>Investimento total: <span className="text-slate-100 font-semibold">{formatCurrency(aggregated.totalInvestment)}</span></>
                    )}
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Análise de Performance</h3>
            <div className={`p-5 rounded-lg border ${performanceAnalysis.type === 'success' ? 'bg-green-900/5 border-green-600/10' :
                performanceAnalysis.type === 'warning' ? 'bg-yellow-900/5 border-yellow-600/10' :
                  'bg-blue-900/5 border-blue-600/10'
              }`}>
              <div className="flex items-start space-x-3">
                <div className={`p-1.5 rounded-md flex-shrink-0 mt-0.5 ${performanceAnalysis.type === 'success' ? 'bg-green-900/15' :
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
                  <h4 className={`font-medium mb-2 text-base ${performanceAnalysis.type === 'success' ? 'text-green-100' :
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
  const [authReady, setAuthReady] = useState(false);

  // Autenticação anônima para permitir leitura do Firestore sem login
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Sem usuário logado: entrar anonimamente para ter token válido no Firestore
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn('Autenticação anônima falhou, tentando sem auth:', err);
        }
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadPublicReport = async () => {
      try {
        setLoading(true);
        if (!authReady) return;

        // Extrair parâmetros da URL
        const audience = searchParams.get('audience') || '';
        const product = searchParams.get('product') || '';
        const client = searchParams.get('client') || '';
        const month = searchParams.get('month') || '';
        const campaignType = searchParams.get('campaignType') || 'landing_page';
        const sharedFunnelType = normalizeFunnelType(searchParams.get('funnelType'));

        // Extrair dados dos detalhes mensais se disponíveis
        const agendamentos = parseInt(searchParams.get('agendamentos') || '0');
        const vendas = parseInt(searchParams.get('vendas') || '0');
        const ticketMedioParam = parseFloat(searchParams.get('ticketMedio') || '0');
        const sharedAgendamentosEnabled = searchParams.get('agendamentosEnabled');

        const newReportInfo = {
          audience,
          product,
          client,
          month,
          campaignType,
          monthlyDetails: {
            agendamentos,
            vendas,
            ticketMedio: ticketMedioParam,
            seguidoresNovos: parseInt(searchParams.get('seguidoresNovos') || '0'),
            funnelType: sharedFunnelType,
            monthlyBudget: parseFloat(searchParams.get('monthlyBudget') || '0'),
            agendamentosEnabled: sharedAgendamentosEnabled !== 'false'
          }
        };

        setReportInfo(newReportInfo);

        // Verificar se há atualizações pendentes para este relatório específico
        try {
          const storedUpdate = localStorage.getItem('metaAdsDataRefreshed');
          if (storedUpdate) {
            const updateData = JSON.parse(storedUpdate);
            const isRelevant = updateData.client === newReportInfo.client &&
              updateData.product === newReportInfo.product &&
              updateData.month === newReportInfo.month &&
              newReportInfo.client !== '' &&
              newReportInfo.product !== '';

            // Verificar se já processamos esta atualização (evitar loop)
            const lastProcessedUpdate = localStorage.getItem('lastProcessedUpdate');
            const isAlreadyProcessed = lastProcessedUpdate && JSON.parse(lastProcessedUpdate).timestamp === updateData.timestamp;

            if (isRelevant && !isAlreadyProcessed) {
              // Marcar como processada
              localStorage.setItem('lastProcessedUpdate', JSON.stringify(updateData));

              // Limpar o localStorage para evitar loop infinito
              localStorage.removeItem('metaAdsDataRefreshed');

              setTimeout(() => {
                setRefreshTrigger(prev => prev + 1);
              }, 1000);
            } else if (isAlreadyProcessed) {
              // Limpar mesmo assim para evitar acúmulo
              localStorage.removeItem('metaAdsDataRefreshed');
            }
          }
        } catch (error) {
          console.error('Erro ao verificar atualização pendente:', error);
        }

        // Usar cache inteligente para carregar métricas
        const cache = PublicReportCache.getInstance();

        // Determinar parâmetros de busca
        let searchProduct = product;
        let searchAudience = audience;

        if (product && product !== 'Todas as Campanhas' && product !== '') {
          searchProduct = product;
          searchAudience = 'Todos os Públicos';
        } else if (audience && audience !== 'Todos os Públicos' && audience !== '') {
          searchProduct = 'Todas as Campanhas';
          searchAudience = audience;
        } else {
          searchProduct = 'Todas as Campanhas';
          searchAudience = 'Todos os Públicos';
        }



        // Gerar chave do cache
        const cacheKey = cache.generateKey(month, client, searchProduct, searchAudience);

        // Carregar métricas usando cache
        const data = await cache.getCachedData(cacheKey, async () => {
          const firebaseData = await metricsService.getPublicMetrics(month, client, searchProduct, searchAudience);
          return firebaseData;
        });

        setMetrics(data);

        // Carregar detalhes mensais em background (sem cache para sempre ter dados atualizados)
        if (product && month && client) {
          try {
            const savedDetails = await metricsService.getMonthlyDetails(month, product, client);
            if (savedDetails) {
              setReportInfo(prev => ({
                ...prev,
                monthlyDetails: {
                  agendamentos: savedDetails.agendamentos,
                  vendas: savedDetails.vendas,
                  ticketMedio: savedDetails.ticketMedio || 0,
                  seguidoresNovos: (savedDetails as any).seguidoresNovos || 0,
                  funnelType: normalizeFunnelType((savedDetails as any).funnelType) || prev.monthlyDetails.funnelType,
                  monthlyBudget: (savedDetails as any).monthlyBudget || 0,
                  agendamentosEnabled: typeof (savedDetails as any).agendamentosEnabled === 'boolean'
                    ? (savedDetails as any).agendamentosEnabled
                    : prev.monthlyDetails.agendamentosEnabled
                }
              }));
            }
          } catch (error) {
            console.error('Erro ao carregar detalhes salvos:', error);
          }
        }

      } catch (err: any) {
        console.error('Erro ao carregar relatório público:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPublicReport();
  }, [searchParams, refreshTrigger, authReady]);

  // Listener para atualizações do relatório via localStorage (apenas quando relevante)
  useEffect(() => {
    let lastUpdateTimestamp = 0;
    let isProcessingUpdate = false;

    const checkForUpdates = () => {
      // Evitar processamento simultâneo
      if (isProcessingUpdate) {
        return;
      }

      try {
        const storedUpdate = localStorage.getItem('metaAdsDataRefreshed');

        if (storedUpdate) {
          const updateData = JSON.parse(storedUpdate);

          // Só atualizar se é uma mudança real e relevante para este relatório
          const isRelevant = updateData.client === reportInfo.client &&
            updateData.product === reportInfo.product &&
            updateData.month === reportInfo.month;

          const isNewer = updateData.timestamp > lastUpdateTimestamp;

          if (isNewer && isRelevant) {
            lastUpdateTimestamp = updateData.timestamp;
            isProcessingUpdate = true;

            // Aguardar um pouco para garantir que o Firebase foi atualizado
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
              // Reset do flag após processamento
              setTimeout(() => {
                isProcessingUpdate = false;
              }, 1000);
            }, 2000);
          } else {
            // Atualização ignorada - não relevante ou não mais nova
          }
        }
      } catch (error) {
        console.error('Erro ao verificar atualizações:', error);
        isProcessingUpdate = false;
      }
    };

    // Verificar apenas uma vez ao carregar
    checkForUpdates();

    // Remover polling automático - só atualizar quando houver mudança específica
    // const interval = setInterval(checkForUpdates, 5000);

    return () => {
      // clearInterval(interval);
    };
  }, [reportInfo.client, reportInfo.product, reportInfo.month]);

  // Listener para mudanças no localStorage e eventos customizados (apenas quando relevante)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Comando de limpeza de cache
      if (e.key === 'clearPublicCache' && e.newValue) {
        try {
          const clearCommand = JSON.parse(e.newValue);

          if (clearCommand.reason === 'shareReportUpdate') {
            const cache = PublicReportCache.getInstance();
            // Extrair parâmetros da chave do cache
            const keyParts = clearCommand.key.split('_');
            if (keyParts.length >= 6) {
              const month = keyParts[2] + ' ' + keyParts[3];
              const client = keyParts[4] + ' ' + keyParts[5];
              const product = keyParts.slice(6, -2).join('_');
              const audience = keyParts[keyParts.length - 1];

              cache.clearSpecificCache(month, client, product, audience);
            }

            // Forçar recarregamento dos dados
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
            }, 500);
          }
        } catch (error) {
          console.error('Erro ao processar comando de limpeza:', error);
        }
      }

      if (e.key === 'metaAdsDataRefreshed' && e.newValue) {
        try {
          const updateData = JSON.parse(e.newValue);

          // Só atualizar se é relevante para este relatório específico
          const isRelevant = updateData.client === reportInfo.client &&
            updateData.product === reportInfo.product &&
            updateData.month === reportInfo.month;

          if (isRelevant) {
            // Aguardar um pouco para garantir que o Firebase foi atualizado
            setTimeout(() => {
              setRefreshTrigger(prev => prev + 1);
            }, 1000); // Reduzido para 1 segundo
          }
        } catch (error) {
          console.error('Erro ao processar mudança no localStorage:', error);
        }
      }
    };

    const handleCustomUpdate = (e: CustomEvent) => {
      try {
        const updateData = e.detail;

        // Só atualizar se é relevante para este relatório específico
        const isRelevant = updateData.client === reportInfo.client &&
          updateData.product === reportInfo.product &&
          updateData.month === reportInfo.month;

        if (isRelevant) {
          // Atualização mais imediata para eventos customizados
          setTimeout(() => {
            setRefreshTrigger(prev => prev + 1);
          }, 500); // Apenas 500ms para eventos customizados
        }
      } catch (error) {
        console.error('Erro ao processar evento customizado:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('publicReportUpdate', handleCustomUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('publicReportUpdate', handleCustomUpdate as EventListener);
    };
  }, [reportInfo.client, reportInfo.product, reportInfo.month]);

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