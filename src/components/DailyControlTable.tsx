import React from 'react';
import { Plus, Download } from 'lucide-react';
import { MetricData } from '../services/metricsService';

interface DailyControlTableProps {
  metrics: MetricData[];
  selectedCampaign?: string;
  selectedMonth?: string;
}

const DailyControlTable: React.FC<DailyControlTableProps> = ({ 
  metrics, 
  selectedCampaign,
  selectedMonth = 'Julho 2023'
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
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
    
    console.log(`Gerando dados para ${selectedMonth}: ${daysInMonth} dias`);
    
    for (let i = 0; i < daysInMonth; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayStr = currentDate.getDate().toString().padStart(2, '0');
      const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = currentDate.getFullYear().toString();
      
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
        status: 'Inativo'
      });
    }
    
    // Adicionar dados das métricas do Meta Ads
    console.log(`Filtrando ${metrics.length} métricas para ${selectedMonth}`);
    
    metrics.forEach(metric => {
      // Verificar se a métrica pertence ao mês selecionado
      if (metric.month === selectedMonth) {
        const metricDate = new Date(metric.date);
        const dayIndex = metricDate.getDate() - 1;
        
        console.log(`Métrica encontrada para ${metric.date}: investimento ${metric.investment}`);
        
        if (dayIndex >= 0 && dayIndex < data.length) {
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
    });
    
    // Se uma campanha específica está selecionada, destacar que os dados são específicos
    if (selectedCampaign && metrics.length > 0) {
      console.log(`Exibindo dados específicos da campanha: ${selectedCampaign}`);
    }
    
    // Adicionar alguns dados de exemplo se não houver dados reais
    if (metrics.length === 0) {
      console.log('Nenhuma métrica encontrada, usando dados de exemplo');
      // Adicionar dados de exemplo no meio do mês
      const middleDay = Math.floor(data.length / 2);
      if (data[middleDay]) {
        data[middleDay].investment = formatCurrency(1.74);
        data[middleDay].impressions = 66;
        data[middleDay].clicks = 1;
        data[middleDay].cpm = formatCurrency(1.74);
        data[middleDay].ctr = '1,52%';
        data[middleDay].leads = 0;
        data[middleDay].cpl = formatCurrency(0);
        data[middleDay].status = 'Ativo';
      }
    }
    
    return data;
  };

  const dailyData = generateDailyData();

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-white">Controle Diário ({selectedMonth})</h2>
            {selectedCampaign && (
              <p className="text-sm text-gray-400 mt-1">
                Anúncio selecionado: {selectedCampaign}
              </p>
            )}
            {metrics.length > 0 && (
              <p className="text-sm text-green-400 mt-1">
                ✓ {metrics.length} registros carregados do Meta Ads
              </p>
            )}
          </div>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Adicionar Dia</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-3 text-gray-400 font-medium">DIA</th>
              <th className="text-left p-3 text-gray-400 font-medium">INVESTIMENTO ($$$)</th>
              <th className="text-left p-3 text-gray-400 font-medium">IMPRESSÕES</th>
              <th className="text-left p-3 text-gray-400 font-medium">CLIQUES</th>
              <th className="text-left p-3 text-gray-400 font-medium">CPM ($$$)</th>
              <th className="text-left p-3 text-gray-400 font-medium">CTR (%)</th>
              <th className="text-left p-3 text-gray-400 font-medium">LEADS</th>
              <th className="text-left p-3 text-gray-400 font-medium">CPL ($$$)</th>
              <th className="text-left p-3 text-gray-400 font-medium">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {dailyData.map((row, index) => (
              <tr key={index} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                <td className="p-3 text-white">{row.date}</td>
                <td className="p-3 text-white">{row.investment}</td>
                <td className="p-3 text-white">{row.impressions}</td>
                <td className="p-3 text-white">{row.clicks}</td>
                <td className="p-3 text-white">{row.cpm}</td>
                <td className="p-3 text-white">{row.ctr}</td>
                <td className="p-3 text-white">{row.leads}</td>
                <td className="p-3 text-white">{row.cpl}</td>
                <td className="p-3">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      row.status === 'Ativo' 
                        ? 'bg-green-900 text-green-400 border border-green-700' 
                        : 'bg-red-900 text-red-400 border border-red-700'
                    }`}>
                      {row.status}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DailyControlTable;