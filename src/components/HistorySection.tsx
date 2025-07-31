import React from 'react';
import { Clock, FileText } from 'lucide-react';

const HistorySection: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Clock className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-white">Histórico</h2>
      </div>
      
      <div className="space-y-4">
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-white">Públicos - Públicos Capacitação de Leads</h3>
            <span className="text-xs text-gray-400">Última atualização</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-400">RESULTADO</span>
              <div className="text-white font-medium">-</div>
            </div>
            <div>
              <span className="text-gray-400">CTR (%)</span>
              <div className="text-white font-medium">-</div>
            </div>
            <div>
              <span className="text-gray-400">AGENDAMENTOS</span>
              <div className="text-white font-medium">-</div>
            </div>
            <div>
              <span className="text-gray-400">CPM (%)</span>
              <div className="text-white font-medium">-</div>
            </div>
            <div>
              <span className="text-gray-400">VENDAS</span>
              <div className="text-white font-medium">-</div>
            </div>
          </div>
          
          <div className="mt-4 text-right">
            <span className="text-gray-400 text-sm">100% (0,0x)</span>
          </div>
        </div>
        
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Dados históricos serão exibidos aqui quando disponíveis</p>
        </div>
      </div>
      
      <div className="mt-8 pt-6 border-t border-gray-700 flex justify-between items-center text-sm text-gray-400">
        <div className="space-x-4">
          <span>Data Início Análise</span>
          <span className="text-white">21/07/2023</span>
        </div>
        <div className="space-x-4">
          <span>Data Análise Final</span>
          <span className="text-white">-</span>
        </div>
        <div className="space-x-4">
          <span>Próxima Data</span>
          <span className="text-white">-</span>
        </div>
      </div>
    </div>
  );
};

export default HistorySection;