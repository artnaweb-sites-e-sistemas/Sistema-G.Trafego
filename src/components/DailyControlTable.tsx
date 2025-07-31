import React from 'react';
import { Plus, Download } from 'lucide-react';
import { MetricData } from '../services/metricsService';

interface DailyControlTableProps {
  metrics: MetricData[];
}

const DailyControlTable: React.FC<DailyControlTableProps> = ({ metrics }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const generateDailyData = () => {
    const data: any[] = [];
    const startDate = new Date(2023, 6, 1); // July 1, 2023
    
    for (let i = 0; i < 31; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const dayStr = currentDate.getDate().toString().padStart(2, '0');
      const monthStr = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const yearStr = currentDate.getFullYear().toString();
      
      data.push({
        date: `${dayStr}/${monthStr}/${yearStr}`,
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
    
    // Add data from Firebase metrics
    metrics.forEach(metric => {
      const metricDate = new Date(metric.date);
      const dayIndex = metricDate.getDate() - 1;
      
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
    });
    
    // Add some sample active days if no data
    if (metrics.length === 0) {
      data[16].investment = formatCurrency(1.74);
    data[16].impressions = 66;
    data[16].clicks = 1;
      data[16].cpm = formatCurrency(1.74);
    data[16].ctr = '1,52%';
    data[16].leads = 0;
      data[16].cpl = formatCurrency(0);
    data[16].status = 'Ativo';
    }
    
    return data;
  };

  const dailyData = generateDailyData();

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Controle Diário (Julho/2023)</h2>
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
              <th className="text-left p-3 text-gray-400 font-medium">AÇÕES</th>
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