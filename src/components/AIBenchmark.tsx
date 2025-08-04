import React, { useState } from 'react';
import { Brain, Loader2, TrendingUp, Target, DollarSign, Users, MapPin, Lightbulb, CheckCircle, AlertCircle, Info, Clock, Zap } from 'lucide-react';
import { aiBenchmarkService, BenchmarkData, BenchmarkResults } from '../services/aiBenchmarkService';
import { AIBenchmarkService } from '../services/aiBenchmarkService';
import { benchmarkStorage } from '../services/benchmarkStorage';
import { toast } from 'react-hot-toast';

interface AIBenchmarkProps {
  selectedProduct: string;
  onBenchmarkGenerated: (results: BenchmarkResults) => void;
  savedResults?: BenchmarkResults | null;
}

const AIBenchmark: React.FC<AIBenchmarkProps> = ({ selectedProduct, onBenchmarkGenerated, savedResults }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [lastResults, setLastResults] = useState<BenchmarkResults | null>(null);
  
  const [formData, setFormData] = useState<BenchmarkData>({
    productNiche: '',
    targetAudience: {
      ageRange: '25-45',
      gender: 'Todos',
      interests: [],
      location: 'Brasil'
    },
    productValue: 0,
    productType: 'Produto Digital',
    campaignObjective: 'Conversões',
    salesProcess: {
      requiresScheduling: false,
      salesMethod: 'direct',
      avgSalesTime: 'imediato'
    },
    leadQuality: 'medium',
    competitionLevel: 'medium',
    additionalInfo: ''
  });

  const [newInterest, setNewInterest] = useState('');

  // Sincronizar com resultados salvos
  React.useEffect(() => {
    if (savedResults) {
      setLastResults(savedResults);
    } else {
      setLastResults(null);
    }
  }, [savedResults]);

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const addInterest = () => {
    if (newInterest.trim() && !formData.targetAudience.interests.includes(newInterest.trim())) {
      setFormData(prev => ({
        ...prev,
        targetAudience: {
          ...prev.targetAudience,
          interests: [...prev.targetAudience.interests, newInterest.trim()]
        }
      }));
      setNewInterest('');
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      targetAudience: {
        ...prev.targetAudience,
        interests: prev.targetAudience.interests.filter(i => i !== interest)
      }
    }));
  };

  const handleGenerateBenchmark = async () => {
    if (!formData.productNiche.trim()) {
      toast.error('Por favor, informe o nicho do produto');
      return;
    }
    
    if (formData.productValue <= 0) {
      toast.error('Por favor, informe um valor válido para o produto');
      return;
    }

    if (formData.targetAudience.interests.length === 0) {
      toast.error('Por favor, adicione pelo menos um interesse do público');
      return;
    }

    setIsLoading(true);

    try {
      const results = await aiBenchmarkService.generateBenchmark(formData);
      setLastResults(results);
      onBenchmarkGenerated(results);
      
      if (results.confidence < 80) {
        toast.success(`Benchmark gerado usando algoritmo local (${results.confidence}% confiança). Para valores mais precisos, verifique sua quota da OpenAI.`, {
          duration: 5000
        });
      } else {
        toast.success(`Benchmark gerado com IA! Confiança: ${results.confidence}%`);
      }
      
      setShowForm(false);
    } catch (error) {
      console.error('Erro ao gerar benchmark:', error);
      toast.error('Erro ao gerar benchmark. Verifique sua conexão e tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (!AIBenchmarkService.validateConfiguration()) {
    return (
      <div className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 border border-yellow-500/30 rounded-xl p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Brain className="h-6 w-6 text-yellow-400" />
          <h3 className="text-xl font-semibold text-yellow-100">Benchmark com IA</h3>
        </div>
        <p className="text-yellow-200">
          Para usar esta funcionalidade, configure a variável VITE_OPENAI_API_KEY no seu arquivo .env
        </p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/95 via-purple-900/40 to-indigo-900/60 backdrop-blur-sm border border-purple-400/30 rounded-2xl shadow-2xl">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10"></div>
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-radial from-purple-400/20 via-transparent to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-radial from-blue-400/15 via-transparent to-transparent rounded-full blur-2xl"></div>
      
      <div className="relative p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
              <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-2xl shadow-lg">
                <Brain className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-200 via-blue-200 to-cyan-200 bg-clip-text text-transparent">
                Benchmark com IA
              </h3>
              <p className="text-slate-300 mt-1 font-medium">
                Produto: <span className="text-purple-300 font-semibold">{selectedProduct}</span>
              </p>
            </div>
          </div>
          
          {!showForm && (
            <div className="flex items-center space-x-4">
              {lastResults && (
                <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 backdrop-blur-sm border border-emerald-400/30 rounded-full px-4 py-2 shadow-lg">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-emerald-200 font-medium">
                    Benchmark ativo ({lastResults.confidence}% confiança)
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowForm(true)}
                className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 hover:from-purple-500 hover:via-blue-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/30 hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>{lastResults ? 'Regenerar Benchmark' : 'Gerar Benchmark'}</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {showForm && (
          <div className="space-y-10">
            {/* Progresso do Formulário */}
            <div className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 backdrop-blur-sm border border-slate-600/40 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-lg font-semibold text-slate-200">Configuração do Benchmark</h4>
                <div className="flex items-center space-x-2 text-sm text-slate-400">
                  <Clock className="w-4 h-4" />
                  <span>Etapa {currentStep} de 4</span>
                </div>
              </div>
              
              <div className="relative">
                <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden mb-6">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out shadow-lg"
                    style={{ width: `${(currentStep / 4) * 100}%` }}
                  ></div>
                </div>
                
                <div className="flex justify-between">
                  {[
                    { step: 1, label: 'Produto', icon: Target, color: 'from-purple-500 to-purple-600' },
                    { step: 2, label: 'Público', icon: Users, color: 'from-blue-500 to-blue-600' },
                    { step: 3, label: 'Vendas', icon: Zap, color: 'from-emerald-500 to-emerald-600' },
                    { step: 4, label: 'Detalhes', icon: Clock, color: 'from-orange-500 to-orange-600' }
                  ].map(({ step, label, icon: Icon, color }) => (
                    <div key={step} className="flex flex-col items-center space-y-3">
                      <div className={`relative transition-all duration-500 ${
                        step <= currentStep ? 'scale-110' : 'scale-100'
                      }`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                          step < currentStep 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30' 
                            : step === currentStep
                            ? `bg-gradient-to-r ${color} text-white shadow-lg shadow-current/30`
                            : 'bg-slate-700/80 text-slate-400 border border-slate-600'
                        }`}>
                          {step < currentStep ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : (
                            <Icon className="w-5 h-5" />
                          )}
                        </div>
                        {step <= currentStep && (
                          <div className={`absolute inset-0 bg-gradient-to-r ${step < currentStep ? 'from-emerald-500 to-teal-500' : color} rounded-full animate-ping opacity-20`}></div>
                        )}
                      </div>
                      <span className={`text-xs font-medium transition-colors duration-300 ${
                        step <= currentStep ? 'text-purple-200' : 'text-slate-500'
                      }`}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Etapas do Formulário - Design Simples */}
            <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/60 backdrop-blur-sm border border-slate-600/40 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl blur-lg opacity-30"></div>
                  <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-3 rounded-xl shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-slate-200">
                    {currentStep === 1 && 'Sobre o seu produto'}
                    {currentStep === 2 && 'Quem é seu público?'}
                    {currentStep === 3 && 'Como você vende?'}
                    {currentStep === 4 && 'Últimos detalhes'}
                  </h3>
                  <p className="text-slate-400 mt-1">
                    {currentStep === 1 && 'Vamos entender melhor o que você vende'}
                    {currentStep === 2 && 'Vamos conhecer seus clientes ideais'}
                    {currentStep === 3 && 'Entenda seu processo de conversão'}
                    {currentStep === 4 && 'Finalize as configurações para um benchmark preciso'}
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Etapa 1: Produto */}
                {currentStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Em qual área você atua? 🎯
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {['Fitness/Saúde', 'Educação', 'Tecnologia', 'Beleza', 'Financeiro', 'Imóveis', 'Alimentação', 'Outro'].map((niche) => (
                          <button
                            key={niche}
                            onClick={() => handleInputChange('productNiche', niche === 'Outro' ? '' : niche)}
                            className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                              formData.productNiche === niche || (niche === 'Outro' && !['Fitness/Saúde', 'Educação', 'Tecnologia', 'Beleza', 'Financeiro', 'Imóveis', 'Alimentação'].includes(formData.productNiche))
                                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg border-2 border-purple-400' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-purple-400/50'
                            }`}
                          >
                            {niche}
                          </button>
                        ))}
                      </div>
                      {(formData.productNiche === '' || !['Fitness/Saúde', 'Educação', 'Tecnologia', 'Beleza', 'Financeiro', 'Imóveis', 'Alimentação'].includes(formData.productNiche)) && (
                        <input
                          type="text"
                          value={formData.productNiche}
                          onChange={(e) => handleInputChange('productNiche', e.target.value)}
                          placeholder="Digite seu nicho (ex: Consultoria empresarial, Coaching, etc.)"
                          className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        />
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Qual o valor do seu produto? 💰
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                        {[
                          { label: 'Até R$ 100', value: 50 },
                          { label: 'R$ 100-500', value: 300 },
                          { label: 'R$ 500-2000', value: 1000 },
                          { label: 'R$ 2000+', value: 0 }
                        ].map((range) => (
                          <button
                            key={range.label}
                            onClick={() => handleInputChange('productValue', range.value)}
                            className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                              (range.value === 0 && formData.productValue >= 2000) || 
                              (range.value !== 0 && formData.productValue === range.value)
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-emerald-400/50'
                            }`}
                          >
                            {range.label}
                          </button>
                        ))}
                      </div>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="number"
                          value={formData.productValue || ''}
                          onChange={(e) => handleInputChange('productValue', parseFloat(e.target.value) || 0)}
                          placeholder="Ou digite o valor exato"
                          min="0"
                          step="0.01"
                          className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Como você entrega seu produto? 📦
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          { value: 'Produto Digital', icon: '💻', desc: 'Cursos, ebooks, apps' },
                          { value: 'Produto Físico', icon: '📦', desc: 'Itens tangíveis' },
                          { value: 'Serviço', icon: '🛠️', desc: 'Consultoria, freelance' },
                          { value: 'Curso Online', icon: '🎓', desc: 'Educação online' },
                          { value: 'Software/App', icon: '📱', desc: 'Tecnologia' },
                          { value: 'Consultoria', icon: '👥', desc: 'Mentoria, coaching' }
                        ].map((type) => (
                          <button
                            key={type.value}
                            onClick={() => handleInputChange('productType', type.value)}
                            className={`p-4 rounded-lg text-left transition-all duration-200 ${
                              formData.productType === type.value
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-blue-400/50'
                            }`}
                          >
                            <div className="text-lg mb-1">{type.icon}</div>
                            <div className="font-medium text-sm">{type.value}</div>
                            <div className="text-xs opacity-75 mt-1">{type.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Etapa 2: Público */}
                {currentStep === 2 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Qual a idade do seu público? 👥
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { label: '18-25 anos', value: '18-25' },
                          { label: '25-35 anos', value: '25-35' },
                          { label: '35-45 anos', value: '35-45' },
                          { label: '45+ anos', value: '45-65' }
                        ].map((age) => (
                          <button
                            key={age.value}
                            onClick={() => handleInputChange('targetAudience.ageRange', age.value)}
                            className={`p-3 rounded-lg text-center transition-all duration-200 ${
                              formData.targetAudience.ageRange === age.value
                                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-blue-400/50'
                            }`}
                          >
                            {age.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Interesses do público 🎯
                      </label>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {formData.targetAudience.interests.map((interest, index) => (
                            <span
                              key={index}
                              className="bg-blue-600/30 text-blue-200 px-3 py-1 rounded-full text-sm flex items-center space-x-2"
                            >
                              <span>{interest}</span>
                              <button
                                onClick={() => removeInterest(interest)}
                                className="text-blue-300 hover:text-white transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input
                            type="text"
                            value={newInterest}
                            onChange={(e) => setNewInterest(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                            placeholder="Ex: fitness, emagrecimento, musculação..."
                            className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                          <button
                            onClick={addInterest}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors font-medium"
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Etapa 3: Vendas */}
                {currentStep === 3 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Como funciona sua venda? 🚀
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { value: 'direct', label: 'Venda Direta', desc: 'Cliente compra na hora' },
                          { value: 'consultation', label: 'Consultoria', desc: 'Precisa conversar antes' },
                          { value: 'demo', label: 'Demonstração', desc: 'Mostra o produto funcionando' },
                          { value: 'trial', label: 'Teste Grátis', desc: 'Cliente testa antes de comprar' }
                        ].map((method) => (
                          <button
                            key={method.value}
                            onClick={() => handleInputChange('salesProcess.salesMethod', method.value)}
                            className={`p-4 rounded-lg text-left transition-all duration-200 ${
                              formData.salesProcess.salesMethod === method.value
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-emerald-400/50'
                            }`}
                          >
                            <div className="font-medium mb-2">{method.label}</div>
                            <div className="text-sm opacity-75">{method.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Qual seu objetivo principal? 🎯
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['Conversões', 'Leads', 'Tráfego', 'Awareness'].map((objective) => (
                          <button
                            key={objective}
                            onClick={() => handleInputChange('campaignObjective', objective)}
                            className={`p-3 rounded-lg text-center transition-all duration-200 ${
                              formData.campaignObjective === objective
                                ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-orange-400/50'
                            }`}
                          >
                            {objective}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Etapa 4: Detalhes */}
                {currentStep === 4 && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Como você define a qualidade dos seus leads? 🎯
                      </label>
                      <div className="space-y-3">
                        {[
                          { value: 'high', label: 'Alta Qualidade', desc: 'Público muito segmentado' },
                          { value: 'medium', label: 'Qualidade Média', desc: 'Público moderadamente segmentado' },
                          { value: 'low', label: 'Qualidade Ampla', desc: 'Público mais amplo, foco em volume' }
                        ].map((quality) => (
                          <button
                            key={quality.value}
                            onClick={() => handleInputChange('leadQuality', quality.value)}
                            className={`w-full p-4 rounded-lg text-left transition-all duration-200 ${
                              formData.leadQuality === quality.value
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-purple-400/50'
                            }`}
                          >
                            <div className="font-medium mb-1">{quality.label}</div>
                            <div className="text-sm opacity-75">{quality.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Nível de competição no seu nicho? 🏆
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                          { value: 'low', label: 'Pouca Competição', desc: 'CPM e CPC menores' },
                          { value: 'medium', label: 'Competição Normal', desc: 'Custos padrão' },
                          { value: 'high', label: 'Muita Competição', desc: 'CPM e CPC maiores' }
                        ].map((competition) => (
                          <button
                            key={competition.value}
                            onClick={() => handleInputChange('competitionLevel', competition.value)}
                            className={`p-4 rounded-lg text-center transition-all duration-200 ${
                              formData.competitionLevel === competition.value
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg' 
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/50 hover:border-cyan-400/50'
                            }`}
                          >
                            <div className="font-medium text-sm mb-1">{competition.label}</div>
                            <div className="text-xs opacity-75">{competition.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-3">
                        Informações adicionais (opcional) 💡
                      </label>
                      <textarea
                        value={formData.additionalInfo}
                        onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                        placeholder="Ex: Sazonalidade específica, características únicas..."
                        rows={3}
                        className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Navegação */}
              <div className="flex justify-between mt-8 pt-6 border-t border-slate-600/30">
                <div className="flex space-x-3">
                  {currentStep > 1 && (
                    <button
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Voltar
                    </button>
                  )}
                  <button
                    onClick={() => setShowForm(false)}
                    className="px-6 py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                </div>
                
                <div className="flex space-x-3">
                  {currentStep < 4 ? (
                    <button
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={
                        (currentStep === 1 && (!formData.productNiche || !formData.productValue)) ||
                        (currentStep === 2 && formData.targetAudience.interests.length === 0)
                      }
                      className="group relative overflow-hidden bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/25 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                      <div className="relative flex items-center space-x-2">
                        <span>Próximo</span>
                        <TrendingUp className="h-4 w-4" />
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={handleGenerateBenchmark}
                      disabled={isLoading}
                      className="group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:from-slate-600 disabled:to-slate-600 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 disabled:cursor-not-allowed"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-300"></div>
                      <div className="relative flex items-center space-x-2">
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Gerando...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4" />
                            <span>Gerar Benchmark</span>
                          </>
                        )}
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resultados */}
        {lastResults && !showForm && (
          <div className="mt-8 relative overflow-hidden bg-gradient-to-br from-slate-800/60 via-emerald-900/20 to-cyan-900/30 backdrop-blur-sm border border-emerald-400/30 rounded-2xl shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-cyan-500/10"></div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-radial from-emerald-400/20 via-transparent to-transparent rounded-full blur-2xl"></div>
            
            <div className="relative p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-xl blur-lg opacity-30"></div>
                    <div className="relative bg-gradient-to-r from-emerald-600 to-cyan-600 p-2 rounded-xl shadow-lg">
                      <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold bg-gradient-to-r from-emerald-200 to-cyan-200 bg-clip-text text-transparent">
                      Benchmark Gerado
                    </h4>
                    <p className="text-slate-300 text-sm">
                      Confiança: {lastResults.confidence}%
                      {lastResults.confidence < 80 && (
                        <span className="ml-2 px-2 py-1 bg-amber-500/30 text-amber-200 text-xs rounded-full border border-amber-400/30">
                          🤖 Simulado
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'CPM', value: formatCurrency(lastResults.cpm), color: 'from-blue-500 to-cyan-500', icon: '💰' },
                  { label: 'CPC', value: formatCurrency(lastResults.cpc), color: 'from-purple-500 to-pink-500', icon: '🎯' },
                  { label: 'CTR', value: `${lastResults.ctr.toFixed(2)}%`, color: 'from-green-500 to-emerald-500', icon: '📊' },
                  { label: 'Tx Mensagens', value: `${lastResults.txMensagens.toFixed(2)}%`, color: 'from-orange-500 to-red-500', icon: '💬' },
                  { label: 'Tx Agendamento', value: `${lastResults.txAgendamento.toFixed(2)}%`, color: 'from-indigo-500 to-purple-500', icon: '📅' },
                  { label: 'Tx Conversão', value: `${lastResults.txConversaoVendas.toFixed(2)}%`, color: 'from-emerald-500 to-teal-500', icon: '✅' }
                ].map((metric, index) => (
                  <div key={index} className="group relative">
                    <div className={`absolute inset-0 bg-gradient-to-r ${metric.color} rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                    <div className="relative bg-slate-800/60 backdrop-blur-sm border border-slate-600/40 rounded-xl p-4 text-center transition-all duration-300 hover:border-slate-500/60 hover:bg-slate-700/60">
                      <div className="text-xl mb-1">{metric.icon}</div>
                      <div className="text-xs text-slate-400 mb-1 font-medium">{metric.label}</div>
                      <div className={`text-lg font-bold bg-gradient-to-r ${metric.color} bg-clip-text text-transparent`}>
                        {metric.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {lastResults.insights.length > 0 && (
                <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-600/30 rounded-xl p-4">
                  <h5 className="text-sm font-semibold text-emerald-200 mb-3 flex items-center">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                    Insights da IA
                  </h5>
                  <ul className="space-y-2">
                    {lastResults.insights.map((insight, index) => (
                      <li key={index} className="text-sm text-slate-300 flex items-start">
                        <span className="text-emerald-400 mr-3 mt-0.5">•</span>
                        <span className="leading-relaxed">{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIBenchmark;