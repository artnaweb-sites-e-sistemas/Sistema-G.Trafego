import React from 'react';
import { Lightbulb, Info } from 'lucide-react';

const InsightsSection: React.FC = () => {
  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-gray-900" />
        </div>
        <h2 className="text-xl font-semibold text-white">Insights e Sugestões</h2>
      </div>
      
      <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-300 text-sm leading-relaxed">
              Selecione um período e clique para ver insights personalizados para seus dados de campanha. 
              Nossas análises automatizadas identificarão oportunidades de otimização e tendências importantes.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsSection;