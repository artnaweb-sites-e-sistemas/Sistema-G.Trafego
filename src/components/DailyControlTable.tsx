import React, { useState } from 'react';
import { Download, Info } from 'lucide-react';
import { MetricData } from '../services/metricsService';

interface DailyControlTableProps {
  metrics: MetricData[];
  selectedCampaign?: string;
  selectedMonth?: string;
  customRecordCount?: number;
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
            <span className="font-medium leading-relaxed" style={{ 
              whiteSpace: 'nowrap'
            }}>{content}</span>
          </div>
          <div className={getArrowClasses()}></div>
        </div>
      )}
    </div>
  );
};

const DailyControlTable: React.FC<DailyControlTableProps> = ({ 
  metrics, 
  selectedCampaign,
  selectedMonth = 'Julho 2023',
  customRecordCount
}) => {
  const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Função para obter tooltip de cada coluna
  const getColumnTooltip = (column: string): string => {
    const tooltips: { [key: string]: string } = {
      'Data': 'Data do registro de controle diário',
      'Investimento': 'Valor investido em anúncios neste dia',
      'Impressões': 'Número de vezes que o anúncio foi exibido neste dia',
      'Cliques': 'Número de cliques recebidos neste dia',
      'CPM': 'Custo por mil impressões neste dia',
      'CTR': 'Taxa de cliques (porcentagem de impressões que viraram cliques)',
      'Leads': 'Número de leads gerados neste dia',
      'CPL': 'Custo por lead gerado neste dia',
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
      
      data.push({
        date: `${dayStr}/${monthStr}/${yearStr}`,
        dateISO: currentDate.toISOString().split('T')[0], // Para comparação
        investment: formatCurrency(0),
        impressions: 0,
        clicks: 0,
        cpm: formatCurrency(0),
        ctr: '0,00%',
        leads: 0,
        cpl: formatCurrency(0),
        status: 'Inativo',
        isPastDay,
        isToday,
        isFutureDay
      });
    }
    
    // Adicionar dados das métricas do Meta Ads
    metrics.forEach(metric => {
      // Verificar se a métrica pertence ao mês selecionado
      if (metric.month === selectedMonth) {
        // Corrigir problema de timezone - Meta Ads pode retornar datas com offset
        let metricDate: Date;
        try {
          // Se a data está no formato YYYY-MM-DD, criar data local
          if (/^\d{4}-\d{2}-\d{2}$/.test(metric.date)) {
            const [year, month, day] = metric.date.split('-').map(Number);
            metricDate = new Date(year, month - 1, day); // month - 1 porque Date usa 0-based months
          } else {
            metricDate = new Date(metric.date);
          }
        } catch (error) {
          console.warn('Erro ao processar data da métrica:', error);
          return;
        }
        
        // Encontrar o índice do dia correspondente
        const dayIndex = metricDate.getDate() - 1;
        
        if (dayIndex >= 0 && dayIndex < data.length) {
          // Só atualizar se não for um dia futuro
          if (!data[dayIndex].isFutureDay) {
            data[dayIndex] = {
              ...data[dayIndex],
              investment: formatCurrency(metric.investment),
              impressions: metric.impressions,
              clicks: metric.clicks,
              cpm: formatCurrency(metric.cpm),
              ctr: `${metric.ctr.toFixed(2)}%`,
              leads: metric.leads,
              cpl: formatCurrency(metric.cpl),
              status: metric.investment > 0 ? 'Ativo' : 'Inativo'
            };
          }
        }
      }
    });
    
    return data;
  };

  const dailyData = generateDailyData();

  const calculateTotals = () => {
    const totals = {
      investment: formatCurrency(0),
      impressions: 0,
      clicks: 0,
      cpm: formatCurrency(0),
      ctr: '0,00%',
      leads: 0,
      cpl: formatCurrency(0),
      activeDays: 0
    };

    dailyData.forEach(row => {
      if (row.status === 'Ativo') {
        totals.activeDays++;
        
        // Extrair valores numéricos das strings formatadas
        const investmentValue = parseFloat(row.investment.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        const impressionsValue = row.impressions || 0;
        const clicksValue = row.clicks || 0;
        const leadsValue = row.leads || 0;
        const cpmValue = parseFloat(row.cpm.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
        const cplValue = parseFloat(row.cpl.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
      
        // Acumular totais
        totals.investment = formatCurrency(parseFloat(totals.investment.replace(/[^\d,.-]/g, '').replace(',', '.')) + investmentValue);
        totals.impressions += impressionsValue;
        totals.clicks += clicksValue;
        totals.leads += leadsValue;
      
        // Calcular médias
        const totalInvestment = parseFloat(totals.investment.replace(/[^\d,.-]/g, '').replace(',', '.'));
        const totalImpressions = totals.impressions;
        const totalClicks = totals.clicks;
        const totalLeads = totals.leads;
        
        if (totalImpressions > 0) {
          totals.cpm = formatCurrency((totalInvestment / totalImpressions) * 1000);
          totals.ctr = `${((totalClicks / totalImpressions) * 100).toFixed(2)}%`;
        }
        
        if (totalLeads > 0) {
          totals.cpl = formatCurrency(totalInvestment / totalLeads);
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
        {totals.impressions}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.clicks}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.cpm}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.ctr}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.leads}
      </td>
      <td className="p-4 font-bold text-slate-100 border-r border-slate-600/30">
        {totals.cpl}
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
    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl">
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
        <table className="w-full text-sm">
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
                  <span>INVESTIMENTO ($$$)</span>
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
                  <span>CLIQUES</span>
                  <Tooltip content={getColumnTooltip('Cliques')} isVisible={tooltipStates['Cliques'] || false} position="bottom">
                    <div
                      className="cursor-default group/tooltip"
                      onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'Cliques': true }))}
                      onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'Cliques': false }))}
                    >
                      <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                    </div>
                  </Tooltip>
                </div>
              </th>
              <th className="text-left p-4 text-slate-200 font-semibold text-sm uppercase tracking-wide border-r border-slate-600/30">
                <div className="flex items-center space-x-2">
                  <span>CPM ($$$)</span>
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
                  <span>CTR (%)</span>
                  <Tooltip content={getColumnTooltip('CTR')} isVisible={tooltipStates['CTR'] || false} position="bottom">
                    <div
                      className="cursor-default group/tooltip"
                      onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'CTR': true }))}
                      onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'CTR': false }))}
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
                  <span>CPL ($$$)</span>
                  <Tooltip content={getColumnTooltip('CPL')} isVisible={tooltipStates['CPL'] || false} position="bottom">
                    <div
                      className="cursor-default group/tooltip"
                      onMouseEnter={() => setTooltipStates(prev => ({ ...prev, 'CPL': true }))}
                      onMouseLeave={() => setTooltipStates(prev => ({ ...prev, 'CPL': false }))}
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
                  </div>
                </td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.investment}</td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.impressions}</td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.clicks}</td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.cpm}</td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.ctr}</td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.leads}</td>
                <td className="p-4 text-slate-200 font-medium border-r border-slate-600/30">{row.cpl}</td>
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
  );
};

export default DailyControlTable;