import React from 'react';
import { Lightbulb, Info } from 'lucide-react';

const InsightsSection: React.FC = () => {
  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 shadow-xl p-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
          <Lightbulb className="w-4 h-4 text-slate-900" />
        </div>
        <h2 className="text-xl font-bold text-slate-100">Insights e Sugestões</h2>
      </div>
      
      <div className="bg-slate-800/80 rounded-lg p-4 border-l-4 border-indigo-400 backdrop-blur-sm">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-slate-300 text-sm leading-relaxed">
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