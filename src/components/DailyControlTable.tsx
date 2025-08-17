import React, { useState, useEffect } from 'react';
import { Download, Info, Calendar, Gift, Heart, Star, Sun, Moon, ShoppingBag, GraduationCap, Flag } from 'lucide-react';
import { MetricData } from '../services/metricsService';
import { metaAdsService } from '../services/metaAdsService';

interface DailyControlTableProps {
  metrics: MetricData[];
  selectedCampaign?: string;
  selectedMonth?: string;
  customRecordCount?: number;
  selectedAudience?: string;
}

// Componente de Tooltip customizado
const Tooltip: React.FC<{ children: React.ReactNode; content: string; isVisible: boolean; position?: 'top' | 'right' | 'bottom' }> = ({ children, content, isVisible, position = 'top' }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'right':
        return 'top-1/2 -translate-y-1/2 left-full ml-2';
      case 'bottom':
        return 'top-full mt-2 left-1/2 transform -translate-x-1/2';
      default: // top
        return '-top-3 left-1/2 transform -translate-x-1/2 -translate-y-full';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'right':
        return 'absolute top-1/2 -translate-y-1/2 -left-1 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-800';
      case 'bottom':
        return 'absolute -top-1 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800';
      default: // top
        return 'absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800';
    }
  };

  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div className={`absolute z-[9999] px-4 py-3 text-sm text-gray-100 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-2xl border border-gray-600/50 backdrop-blur-sm animate-in fade-in-0 zoom-in-95 duration-200 ${getPositionClasses()}`}>
          <div className="flex items-start space-x-2">
            <div className="w-1 h-1 bg-red-400 rounded-full animate-pulse mt-2 flex-shrink-0"></div>
            <span className="font-medium leading-relaxed normal-case" style={{ 
              whiteSpace: 'nowrap'
            }}>{content}</span>
          </div>
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};

// Interface para épocas sazonais
interface SeasonalEvent {
  icon: React.ReactNode;
  tooltip: string;
  color: string;
}

// Função utilitária para calcular o segundo domingo de um mês
function getSecondSunday(year: number, month: number): number {
  // month: 0 = janeiro
  const firstDay = new Date(year, month, 1).getDay();
  // Se o primeiro dia do mês for domingo, o segundo domingo é dia 8
  // Caso contrário, é o primeiro domingo após o dia 1 + 7 dias
  return firstDay === 0 ? 8 : (15 - firstDay);
}

// Função utilitária para calcular a data da Páscoa (algoritmo de Meeus/Jones/Butcher)
function getEasterDate(year: number): Date {
  const f = Math.floor,
    G = year % 19,
    C = f(year / 100),
    H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
    I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
    J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
    L = I - J,
    month = 3 + f((L + 40) / 44),
    day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

// Função utilitária para calcular a data do Carnaval (47 dias antes da Páscoa)
function getCarnivalDate(year: number): Date {
  const easter = getEasterDate(year);
  const carnival = new Date(easter);
  carnival.setDate(easter.getDate() - 47);
  return carnival;
}

const DailyControlTable: React.FC<DailyControlTableProps> = ({ 
  metrics, 
  selectedCampaign,
  selectedMonth = 'Julho 2023',
  customRecordCount,
  selectedAudience
}) => {

  const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});
  const [dailyData, setDailyData] = useState<any[]>([]);

  // Atualizar dados sempre que métricas ou mês mudarem
  useEffect(() => {
    const newData = generateDailyData();
    setDailyData(newData);
  }, [metrics, selectedMonth]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter épocas sazonais por data
  const getSeasonalEvents = (date: Date): SeasonalEvent[] => {
    const events: SeasonalEvent[] = [];
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    const dayOfWeek = date.getDay(); // 0 = Domingo

    // Janeiro
    if (month === 1) {
      if (day === 1) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "Ano Novo - Feriado nacional",
          color: "text-blue-400"
        });
      }
      if (day === 6) {
        events.push({
          icon: <Star className="w-3 h-3" />,
          tooltip: "Dia de Reis - Tradição católica",
          color: "text-yellow-400"
        });
      }
    }

    // Fevereiro
    if (month === 2) {
      if (day === 14) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Dia dos Namorados - Data comercial importante",
          color: "text-pink-400"
        });
      }
      if (day >= 20 && day <= 26) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "Carnaval - Feriado nacional (data móvel)",
          color: "text-purple-400"
        });
      }
    }

    // Março
    if (month === 3) {
      if (day === 8) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Dia Internacional da Mulher",
          color: "text-pink-400"
        });
      }
      if (day === 15) {
        events.push({
          icon: <ShoppingBag className="w-3 h-3" />,
          tooltip: "Dia do Consumidor - Campanhas promocionais",
          color: "text-green-400"
        });
      }
    }

    // Abril
    if (month === 4) {
      if (day === 21) {
        events.push({
          icon: <Flag className="w-3 h-3" />,
          tooltip: "Tiradentes - Feriado nacional",
          color: "text-green-400"
        });
      }
      // Páscoa
      const easter = getEasterDate(year);
      if (month === (easter.getMonth() + 1) && day === easter.getDate()) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "Páscoa - Feriado nacional (data móvel)",
          color: "text-yellow-400"
        });
      }
    }

    // Maio
    if (month === 5) {
      if (day === 1) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "Dia do Trabalho - Feriado nacional",
          color: "text-red-400"
        });
      }
      // Dia das Mães: segundo domingo de maio
      if (day === getSecondSunday(year, 4)) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Dia das Mães - Data comercial importante",
          color: "text-pink-400"
        });
      }
    }

    // Junho
    if (month === 6) {
      if (day === 12) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Dia dos Namorados - Data comercial importante",
          color: "text-pink-400"
        });
      }
      if (day === 24) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "São João - Festas juninas",
          color: "text-orange-400"
        });
      }
    }

    // Julho
    if (month === 7) {
      if (day === 9) {
        events.push({
          icon: <Flag className="w-3 h-3" />,
          tooltip: "Independência da Bahia - Feriado estadual",
          color: "text-green-400"
        });
      }
    }

    // Agosto
    if (month === 8) {
      // Dia dos Pais: segundo domingo de agosto
      if (day === getSecondSunday(year, 7)) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Dia dos Pais - Data comercial importante",
          color: "text-blue-400"
        });
      }
      if (day === 15) {
        events.push({
          icon: <Flag className="w-3 h-3" />,
          tooltip: "Dia da Assunção de Nossa Senhora",
          color: "text-purple-400"
        });
      }
    }

    // Setembro
    if (month === 9) {
      if (day === 7) {
        events.push({
          icon: <Flag className="w-3 h-3" />,
          tooltip: "Independência do Brasil - Feriado nacional",
          color: "text-green-400"
        });
      }
    }

    // Outubro
    if (month === 10) {
      if (day === 12) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Nossa Senhora Aparecida - Feriado nacional",
          color: "text-purple-400"
        });
      }
      if (day === 15) {
        events.push({
          icon: <GraduationCap className="w-3 h-3" />,
          tooltip: "Dia do Professor",
          color: "text-blue-400"
        });
      }
      if (day === 31) {
        events.push({
          icon: <Moon className="w-3 h-3" />,
          tooltip: "Halloween - Influência cultural",
          color: "text-orange-400"
        });
      }
    }

    // Novembro
    if (month === 11) {
      if (day === 2) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "Finados - Feriado nacional",
          color: "text-gray-400"
        });
      }
      if (day === 15) {
        events.push({
          icon: <Flag className="w-3 h-3" />,
          tooltip: "Proclamação da República - Feriado nacional",
          color: "text-green-400"
        });
      }
      if (day === 20) {
        events.push({
          icon: <Flag className="w-3 h-3" />,
          tooltip: "Dia da Consciência Negra",
          color: "text-yellow-400"
        });
      }
    }

    // Dezembro
    if (month === 12) {
      if (day === 8) {
        events.push({
          icon: <Heart className="w-3 h-3" />,
          tooltip: "Nossa Senhora da Conceição",
          color: "text-purple-400"
        });
      }
             if (day === 25) {
         events.push({
           icon: <Star className="w-3 h-3" />,
           tooltip: "Natal - Feriado nacional",
           color: "text-green-400"
         });
       }
      if (day === 31) {
        events.push({
          icon: <Calendar className="w-3 h-3" />,
          tooltip: "Réveillon - Feriado nacional",
          color: "text-blue-400"
        });
      }
      // Black Friday (última sexta-feira de novembro)
      if (day >= 25 && day <= 30) {
        events.push({
          icon: <ShoppingBag className="w-3 h-3" />,
          tooltip: "Black Friday - Campanhas promocionais",
          color: "text-red-400"
        });
      }
    }

    return events;
  };

  // Função para obter tooltip de cada coluna
  const getColumnTooltip = (column: string): string => {
    const tooltips: { [key: string]: string } = {
      'Data': 'Data do registro de controle diário',
      'Investimento': 'Valor investido em anúncios neste dia',
      'CPM': 'Custo por mil impressões neste dia',
      'Impressões': 'Número de vezes que o anúncio foi exibido neste dia',
      'CPR': 'Custo por resultado dinâmico: prioriza custo por compra; se não houver, custo por lead; caso contrário, custo por clique (tráfego). Mostra “-” quando não houver resultado no dia.',
      'Leads': 'Número de leads gerados neste dia',
      'Compras': 'Número de vendas/conversões realizadas neste dia',
      'Status': 'Status do anúncio: Ativo (com investimento) ou Inativo (sem investimento)'
    };
    return tooltips[column] || 'Informação sobre esta coluna';
  };

  const generateDailyData = () => {
    const data: any[] = [];
    
    // Determinar o mês e ano baseado no selectedMonth
    const monthMap: { [key: string]: number } = {
      'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
      'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
    };
    
    const [monthName, yearStr] = selectedMonth.split(' ');
    const month = monthMap[monthName] || 6; // Default para Julho
    const year = parseInt(yearStr) || 2023;
    
    // Criar data de início do mês
    const startDate = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Data atual para comparação
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
      
      // Verificar se é um dia passado, presente ou futuro
      const isPastDay = currentDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday = currentDate.getDate() === today.getDate() && 
                     currentDate.getMonth() === today.getMonth() && 
                     currentDate.getFullYear() === today.getFullYear();
      const isFutureDay = currentDate > new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Verificar se é domingo
      const isSunday = currentDate.getDay() === 0;
      
      // Obter eventos sazonais
      const seasonalEvents = getSeasonalEvents(currentDate);
      
      data.push({
        date: `${dayStr}/${monthStr}/${yearStr}`,
        dateISO: currentDate.toISOString().split('T')[0], // Para comparação
        investment: formatCurrency(0),
        cpm: formatCurrency(0),
        impressions: 0,
        cpr: '-',
        leads: 0,
        compras: 0,
        status: 'Inativo',
        isPastDay,
        isToday,
        isFutureDay,
        isSunday,
        seasonalEvents
      });
    }
    
    // -------- Nova lógica: escolher apenas a métrica mais recente por serviço em cada dia --------
    type DayKey = string; // YYYY-MM-DD
    interface Agg {
      investment: number;
      impressions: number;
      clicks?: number;
      leads: number;
      compras: number;
      cpr?: number; // Custo por resultado dinâmico
      updatedAt?: any;
      service?: string;
    }
    const dayServiceMap = new Map<DayKey, Map<string, Agg>>();

    metrics.forEach(metric => {
      if (metric.month !== selectedMonth) return;
      const dateKey = metric.date;
      const serviceKey = metric.service || 'Desconhecido';

      if (!dayServiceMap.has(dateKey)) {
        dayServiceMap.set(dateKey, new Map<string, Agg>());
      }
      const serviceMap = dayServiceMap.get(dateKey)!;
      const existing = serviceMap.get(serviceKey);

      if (!existing || (metric.updatedAt && existing.updatedAt && new Date(metric.updatedAt).getTime() > new Date(existing.updatedAt).getTime())) {
        serviceMap.set(serviceKey, metric as any);
      }
    });

    // Agregar por dia somando serviços
    const dayAggMap = new Map<DayKey, Agg>();
    dayServiceMap.forEach((serviceMap, dateKey) => {
      let agg: Agg = { investment: 0, impressions: 0, clicks: 0, leads: 0, compras: 0, cpr: 0 };
      serviceMap.forEach(metric => {
        agg.investment += metric.investment || 0;
        agg.impressions += metric.impressions || 0;
        agg.clicks = (agg.clicks || 0) + (metric.clicks || 0);
        agg.leads += metric.leads || 0;
        agg.compras += metric.compras || 0;
        // CPR será calculado ao aplicar por dia com base em investimento/resultado do próprio dia
      });
      dayAggMap.set(dateKey, agg);
    });

    // Aplicar aos dias
    dayAggMap.forEach((agg, dateKey) => {
      let metricDate: Date;
      try {
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
          const [year, month, day] = dateKey.split('-').map(Number);
          metricDate = new Date(year, month - 1, day);
        } else {
          metricDate = new Date(dateKey);
        }
      } catch {
        metricDate = new Date(dateKey);
      }
      const dayIndex = metricDate.getDate() - 1;
      if (dayIndex >= 0 && dayIndex < data.length) {
        // CPR diário: considerar apenas compras > leads; sem resultado, mostrar '-'
        const resultsCount = (agg.compras && agg.compras > 0)
          ? agg.compras
          : (agg.leads && agg.leads > 0)
            ? agg.leads
            : 0;

        data[dayIndex] = {
          ...data[dayIndex],
          investment: formatCurrency(agg.investment),
          cpm: agg.impressions > 0 ? formatCurrency((agg.investment / agg.impressions) * 1000) : formatCurrency(0),
          impressions: agg.impressions,
          cpr: resultsCount > 0 ? formatCurrency(agg.investment / resultsCount) : '-',
          leads: agg.leads,
          compras: agg.compras,
          status: agg.investment > 0 ? 'Ativo' : 'Inativo'
        };
      }
    });
    
    return data;
  };

  // dailyData agora vem do estado, atualizado pelo useEffect

  const calculateTotals = () => {
    const totals = {
      investment: formatCurrency(0),
      cpm: formatCurrency(0),
      impressions: 0,
      cpr: formatCurrency(0),
      leads: 0,
      compras: 0,
      activeDays: 0
    };

    dailyData.forEach(row => {
      if (row.status === 'Ativo') {
        totals.activeDays++;
        
        // Extrair valores numéricos das strings formatadas
        const investmentValue = parseFloat(row.investment.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        const impressionsValue = row.impressions || 0;
        const leadsValue = row.leads || 0;
        const comprasValue = row.compras || 0;
        const cprValue = parseFloat(row.cpr.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
      
        // Acumular totais
        totals.investment = formatCurrency(parseFloat(totals.investment.replace(/[^\d,.-]/g, '').replace(',', '.')) + investmentValue);
        totals.impressions += impressionsValue;
        totals.leads += leadsValue;
        totals.compras += comprasValue;

        // Calcular médias
        const totalInvestment = parseFloat(totals.investment.replace(/[^\d,.-]/g, '').replace(',', '.'));
        const totalImpressions = totals.impressions;
        const totalLeads = totals.leads;
        const totalCompras = totals.compras;
        
        if (totalImpressions > 0) {
          totals.cpm = formatCurrency((totalInvestment / totalImpressions) * 1000);
        }
        
        // Calcular CPR total alinhado ao histórico: prioriza COMPRAS > LEADS
        if (totalCompras > 0) {
          totals.cpr = formatCurrency(totalInvestment / totalCompras);
        } else if (totalLeads > 0) {
          totals.cpr = formatCurrency(totalInvestment / totalLeads);
        } else {
          // Se não há resultados, CPR é 0
          totals.cpr = formatCurrency(0);
        }
      }
    });

    return totals;
  };

  const totals = calculateTotals();

  const TotalsRow = ({ isHeader = false }: { isHeader?: boolean }) => (
    <tr className={`border-b-2 border-slate-600 ${isHeader ? 'bg-gradient-to-r from-slate-800/60 to-slate-700/60' : 'bg-gradient-to-r from-blue-900/20 to-indigo-900/20'}`}>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {isHeader ? (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <span>TOTAIS</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>{totals.activeDays} dias ativos</span>
          </div>
        )}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.investment}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.cpm}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.impressions}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.cpr}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.leads}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.compras}
      </td>
      <td className="p-4">
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isHeader 
              ? 'bg-blue-900/40 text-blue-300 border border-blue-600/30' 
              : 'bg-green-900/40 text-green-300 border border-green-600/30'
          }`}>
            {isHeader ? 'Resumo Geral' : `${totals.activeDays} dias ativos`}
          </span>
        </div>
      </td>
    </tr>
  );

  return (
    <>
      <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-100 mb-1">Controle Diário</h2>
              <p className="text-slate-400 text-sm">{selectedMonth}</p>
              {selectedCampaign && (
                <p className="text-sm text-slate-400 mt-1">
                  Anúncio selecionado: {selectedCampaign}
                </p>
              )}
              {selectedAudience && (
                <div className="flex items-center mt-2 space-x-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <p className="text-sm text-blue-400 font-medium">
                    Público: {selectedAudience}
                  </p>
                </div>
              )}
            </div>
            {metrics.length > 0 && (
              <div className="bg-emerald-900/30 rounded-lg p-3 border border-emerald-600/30">
                <p className="text-sm text-emerald-400 font-medium">
                  ✓ {customRecordCount || metrics.length} registros carregados do Meta Ads
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>DIA</span>
                    <Tooltip content={getColumnTooltip('Data')} isVisible={tooltipStates['Data'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Data': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Data': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>INVESTIMENTO</span>
                    <Tooltip content={getColumnTooltip('Investimento')} isVisible={tooltipStates['Investimento'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Investimento': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Investimento': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>CPM</span>
                    <Tooltip content={getColumnTooltip('CPM')} isVisible={tooltipStates['CPM'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'CPM': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'CPM': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>IMPRESSÕES</span>
                    <Tooltip content={getColumnTooltip('Impressões')} isVisible={tooltipStates['Impressões'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Impressões': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Impressões': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>CPR</span>
                    <Tooltip content={getColumnTooltip('CPR')} isVisible={tooltipStates['CPR'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'CPR': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'CPR': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>LEADS</span>
                    <Tooltip content={getColumnTooltip('Leads')} isVisible={tooltipStates['Leads'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Leads': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Leads': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                  <div className="flex items-center space-x-2">
                    <span>COMPRAS</span>
                    <Tooltip content={getColumnTooltip('Compras')} isVisible={tooltipStates['Compras'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Compras': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Compras': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
                <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide">
                  <div className="flex items-center space-x-2">
                    <span>STATUS</span>
                    <Tooltip content={getColumnTooltip('Status')} isVisible={tooltipStates['Status'] || false} position="bottom">
                      <div
                        className="cursor-default group/tooltip"
                        onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Status': true }))}
                        onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Status': false }))}
                      >
                        <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                      </div>
                    </Tooltip>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <TotalsRow isHeader />
              {dailyData.map((row, index) => (
                <tr key={index} className={`hover:bg-slate-800/40 transition-all duration-200 ${
                  row.isToday ? 'bg-gradient-to-r from-blue-900/15 via-indigo-900/10 to-blue-900/15 border-l-4 border-l-blue-400 shadow-lg relative' : ''
                } ${index === dailyData.length - 1 ? 'border-b-2 border-slate-600' : 'border-b border-slate-700/30'}`}>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">
                    <div className="flex items-center space-x-2">
                      {row.isToday && (
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                      )}
                      <span className={row.isToday ? 'text-blue-300 font-semibold' : ''}>{row.date}</span>
                      
                      {/* Indicador de domingo */}
                      {row.isSunday && (
                        <span className="text-xs text-yellow-400 font-bold bg-yellow-900/30 px-1 py-0.5 rounded">
                          D
                        </span>
                      )}
                      
                      {/* Ícones de épocas sazonais */}
                      {row.seasonalEvents && row.seasonalEvents.length > 0 && (
                        <div className="flex items-center space-x-1">
                          {row.seasonalEvents.map((event: SeasonalEvent, eventIndex: number) => (
                            <Tooltip 
                              key={eventIndex}
                              content={event.tooltip} 
                              isVisible={tooltipStates[`${row.date}-${eventIndex}`] || false} 
                              position="right"
                            >
                              <div
                                className={`cursor-default group/tooltip ${event.color} hover:scale-110 transition-all duration-200`}
                                onMouseEnter={() => setTooltipStates(prev => ({ ...prev, [`${row.date}-${eventIndex}`]: true }))}
                                onMouseLeave={() => setTooltipStates(prev => ({ ...prev, [`${row.date}-${eventIndex}`]: false }))}
                              >
                                {event.icon}
                              </div>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.investment}</td>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.cpm}</td>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.impressions}</td>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.cpr}</td>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.leads}</td>
                  <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.compras}</td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        row.status === 'Ativo' 
                          ? row.isToday 
                            ? 'bg-emerald-900/80 text-emerald-300 border-2 border-emerald-400 shadow-lg' 
                            : 'bg-emerald-900/60 text-emerald-400 border border-emerald-600/50'
                          : row.isToday
                            ? 'bg-rose-900/80 text-rose-300 border-2 border-rose-400 shadow-lg'
                            : 'bg-rose-900/60 text-rose-400 border border-rose-600/50'
                      }`}>
                        {row.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              <TotalsRow />
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DailyControlTable;