import React, { useState } from 'react';
import { useEffect } from 'react';
import Header from './components/Header';
import MetricsGrid from './components/MetricsGrid';
import MonthlyDetailsTable from './components/MonthlyDetailsTable';
import InsightsSection from './components/InsightsSection';
import DailyControlTable from './components/DailyControlTable';
import HistorySection from './components/HistorySection';
import { metricsService, MetricData } from './services/metricsService';

function App() {
  const [selectedMonth, setSelectedMonth] = useState('Julho 2023');
  const [selectedClient, setSelectedClient] = useState('Todos os Clientes');
  const [selectedProduct, setSelectedProduct] = useState('Todos os Produtos');
  const [selectedAudience, setSelectedAudience] = useState('Todos os Públicos');
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        const data = await metricsService.getMetrics(selectedMonth, selectedClient, selectedProduct, selectedAudience);
        setMetrics(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [selectedMonth, selectedClient, selectedProduct, selectedAudience, refreshTrigger]);

  const handleMetaAdsSync = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header 
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        selectedProduct={selectedProduct}
        setSelectedProduct={setSelectedProduct}
        selectedAudience={selectedAudience}
        setSelectedAudience={setSelectedAudience}
        onMetaAdsSync={handleMetaAdsSync}
      />
      
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900 border border-red-700 text-red-400 px-4 py-3 rounded-lg">
            Erro ao carregar dados: {error}
          </div>
        ) : (
          <>
            <MetricsGrid metrics={metrics} />
            <MonthlyDetailsTable metrics={metrics} />
          </>
        )}
        <InsightsSection />
        <DailyControlTable metrics={metrics} />
        <HistorySection />
      </div>
    </div>
  );
}

export default App;