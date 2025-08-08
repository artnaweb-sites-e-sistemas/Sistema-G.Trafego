import React, { useState, useEffect } from 'react';
import { Plus, Package, Target, Users, MapPin, DollarSign, Edit, Copy, RefreshCw, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adStrategyService, AdStrategy } from '../services/adStrategyService';
import { metaAdsService } from '../services/metaAdsService';
import { toast } from 'react-hot-toast';

interface AdStrategySectionProps {
  selectedClient: string;
  selectedMonth: string;
  onStrategyCreated: (strategy: AdStrategy) => void;
}

const AdStrategySection: React.FC<AdStrategySectionProps> = ({ 
  selectedClient, 
  selectedMonth, 
  onStrategyCreated 
}) => {
  const [strategies, setStrategies] = useState<AdStrategy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<Partial<AdStrategy>>({
    product: {
      name: '',
      niche: '',
      type: 'online' as const,
      objective: 'trafico' as const
    },
    audience: {
      gender: 'ambos' as const,
      ageRange: '25-45',
      locations: []
    },
    budget: {
      planned: 0,
      current: 0
    },
    generatedNames: {
      product: '',
      audience: ''
    },
    isSynchronized: false
  });
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null);
  const [locationInput, setLocationInput] = useState('');
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Set<string>>(new Set());

  // Bloquear scroll quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isModalOpen]);

  // Carregar estratégias existentes
  useEffect(() => {
    if (selectedClient && selectedMonth) {
      const existingStrategies = adStrategyService.getStrategiesByClientAndMonth(selectedClient, selectedMonth);
      setStrategies(existingStrategies);
    }
  }, [selectedClient, selectedMonth]);

  // Função para copiar texto
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates(prev => new Set([...prev, key]));
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => {
        setCopiedStates(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }, 2000);
    } catch (err) {
      toast.error('Erro ao copiar texto');
    }
  };

  // Função para formatar moeda
  const formatBRLFromDigits = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    const number = parseInt(digits) / 100;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  };

  // Função para extrair dígitos
  const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Função para abrir modal
  const handleOpenModal = (strategy?: AdStrategy, productName?: string, productNiche?: string) => {
    if (strategy) {
      setCurrentStrategy(strategy);
      setEditingStrategy(strategy.id);
    } else {
      setCurrentStrategy({
        product: {
          name: productName || '',
          niche: productNiche || '',
          type: 'online' as const,
          objective: 'trafico' as const
        },
        audience: {
          gender: 'ambos' as const,
          ageRange: '25-45',
          locations: []
        },
        budget: {
          planned: 0,
          current: 0
        },
        generatedNames: {
          product: '',
          audience: ''
        },
        isSynchronized: false
      });
      setEditingStrategy(null);
    }
    setIsModalOpen(true);
  };

  // Função para fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStrategy({
      product: {
        name: '',
        niche: '',
        type: 'online' as const,
        objective: 'trafico' as const
      },
      audience: {
        gender: 'ambos' as const,
        ageRange: '25-45',
        locations: []
      },
      budget: {
        planned: 0,
        current: 0
      },
      generatedNames: {
        product: '',
        audience: ''
      },
      isSynchronized: false
    });
    setEditingStrategy(null);
  };

  // Função para salvar estratégia
  const handleSaveStrategy = async () => {
    if (!currentStrategy.product?.name || !currentStrategy.product?.niche) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (currentStrategy.audience?.locations.length === 0) {
      toast.error('Por favor, adicione pelo menos uma localização');
      return;
    }

    if (currentStrategy.budget?.planned <= 0) {
      toast.error('Por favor, informe um valor pretendido válido');
      return;
    }

    try {
      const strategyToSave: AdStrategy = {
        id: editingStrategy || Date.now().toString(),
        product: currentStrategy.product!,
        audience: currentStrategy.audience!,
        budget: currentStrategy.budget!,
        generatedNames: currentStrategy.generatedNames!,
        client: selectedClient,
        month: selectedMonth,
        createdAt: editingStrategy ? strategies.find(s => s.id === editingStrategy)?.createdAt || new Date() : new Date(),
        isSynchronized: currentStrategy.isSynchronized || false
      };

      if (editingStrategy) {
        adStrategyService.updateStrategy(strategyToSave);
        setStrategies(prev => prev.map(s => s.id === editingStrategy ? strategyToSave : s));
        toast.success('Estratégia atualizada com sucesso!');
      } else {
        adStrategyService.saveStrategy(strategyToSave);
        setStrategies(prev => [...prev, strategyToSave]);
        onStrategyCreated(strategyToSave);
        toast.success('Estratégia criada com sucesso!');
      }

      handleCloseModal();
    } catch (error) {
      toast.error('Erro ao salvar estratégia');
    }
  };

  // Função para deletar estratégia
  const handleDeleteStrategy = (strategyId: string) => {
    adStrategyService.removeStrategy(strategyId);
    setStrategies(prev => prev.filter(s => s.id !== strategyId));
    toast.success('Estratégia removida com sucesso!');
  };

  // Função para adicionar localização
  const handleAddLocation = () => {
    if (locationInput.trim() && !currentStrategy.audience?.locations.includes(locationInput.trim())) {
      setCurrentStrategy(prev => ({
        ...prev,
        audience: {
          ...prev.audience!,
          locations: [...(prev.audience?.locations || []), locationInput.trim()]
        }
      }));
      setLocationInput('');
    }
  };

  // Função para remover localização
  const handleRemoveLocation = (location: string) => {
    setCurrentStrategy(prev => ({
      ...prev,
      audience: {
        ...prev.audience!,
        locations: prev.audience?.locations.filter(l => l !== location) || []
      }
    }));
  };

  // Função para gerar nomes
  const generateNames = () => {
    if (!currentStrategy.product?.name || !currentStrategy.product?.niche || !currentStrategy.product?.objective) return;

    const productName = `[${currentStrategy.product.name} ${currentStrategy.product.type === 'fisico' ? 'presencial' : 'online'}] [${currentStrategy.product.niche}] [${currentStrategy.product.objective === 'trafico' ? 'tráfego' : currentStrategy.product.objective === 'mensagens' ? 'mensagens' : 'compras'}]`;
    
    const audienceName = `[${currentStrategy.audience?.gender === 'homem' ? 'homens' : currentStrategy.audience?.gender === 'mulher' ? 'mulheres' : 'ambos'}] [${currentStrategy.audience?.ageRange}] [${currentStrategy.audience?.locations.join(', ')}]`;

    setCurrentStrategy(prev => ({
      ...prev,
      generatedNames: {
        product: productName,
        audience: audienceName
      }
    }));
  };

  // Gerar nomes quando dados mudam
  useEffect(() => {
    generateNames();
  }, [currentStrategy.product, currentStrategy.audience]);

  // Buscar valores do Meta Ads
  const fetchMetaAdsValues = async () => {
    if (!currentStrategy.generatedNames?.audience) return;

    try {
      const insights = await metaAdsService.getAdSetInsights(selectedMonth);
      const matchingAdSets = insights.filter(insight => {
        const normalizedInsightName = insight.adset_name.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        const normalizedGeneratedName = currentStrategy.generatedNames!.audience.toLowerCase().replace(/[^a-z0-9\s]/g, '');
        
        const insightWords = normalizedInsightName.split(' ');
        const generatedWords = normalizedGeneratedName.split(' ');
        
        const commonWords = insightWords.filter(word => generatedWords.includes(word));
        return commonWords.length >= 2; // Pelo menos 2 palavras em comum
      });

      const totalSpend = matchingAdSets.reduce((sum, insight) => sum + parseFloat(insight.spend), 0);
      
      setCurrentStrategy(prev => ({
        ...prev,
        budget: {
          ...prev.budget!,
          current: totalSpend
        },
        isSynchronized: matchingAdSets.length > 0
      }));
    } catch (error) {
      console.error('Erro ao buscar valores do Meta Ads:', error);
    }
  };

  // Agrupar estratégias por produto
  const strategiesByProduct = strategies.reduce((acc, strategy) => {
    const productKey = `${strategy.product.name}-${strategy.product.niche}`;
    if (!acc[productKey]) {
      acc[productKey] = {
        name: strategy.product.name,
        niche: strategy.product.niche,
        strategies: []
      };
    }
    acc[productKey].strategies.push(strategy);
    return acc;
  }, {} as Record<string, { name: string; niche: string; strategies: AdStrategy[] }>);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-xl">
      <div className="p-6 md:p-8">
        <div className="flex items-center justify-between mb-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-md">
                <Target className="h-5 w-5 text-white" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 animate-pulse" />
            </div>
            <div className="flex flex-col justify-center h-11">
              <h3 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent leading-tight">Estratégias de Anúncio</h3>
              <p className="text-slate-400 text-sm mt-1 leading-tight">Cliente: <span className="text-slate-200 font-semibold">{selectedClient}</span></p>
            </div>
          </div>
          
                      <button
              onClick={() => handleOpenModal()}
              className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] h-11"
            >
              <Plus className="h-4 w-4 mr-2" />
              <span>Novo Produto</span>
            </button>
        </div>

        {/* Lista de estratégias agrupadas por produto */}
        <div className="space-y-6">
          {Object.entries(strategiesByProduct).map(([productKey, productData]) => (
            <motion.div
              key={productKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 border border-slate-700/50 rounded-2xl shadow-md overflow-hidden"
            >
              {/* Header do produto */}
              <div 
                className="flex items-center justify-between p-6 cursor-pointer"
                onClick={() => {
                  const newCollapsed = new Set(collapsedProducts);
                  if (newCollapsed.has(productKey)) {
                    newCollapsed.delete(productKey);
                  } else {
                    newCollapsed.add(productKey);
                  }
                  setCollapsedProducts(newCollapsed);
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-slate-200">{productData.name}</h4>
                    <p className="text-sm text-slate-400">{productData.niche}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: collapsedProducts.has(productKey) ? 0 : 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </motion.div>
              </div>

              {/* Estratégias do produto */}
              <AnimatePresence>
                {!collapsedProducts.has(productKey) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ 
                      height: { duration: 0.15, ease: "easeInOut" },
                      opacity: { duration: 0.1, ease: "easeInOut" }
                    }}
                    className="border-t border-slate-700/50 overflow-hidden"
                  >
                    <div className="p-6 space-y-3">
                      {productData.strategies.map((strategy) => (
                        <motion.div
                          key={strategy.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-500/50 group"
                        >
                          <div className="flex items-start justify-between mb-4">
                                                          <div className="flex-1 relative">
                                {/* Botões de ação no canto superior direito */}
                                <div className="absolute -top-3 -right-3 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-600/40 rounded-xl px-2.5 py-1.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-100">
                                  <button
                                    onClick={() => handleOpenModal(strategy)}
                                    className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-all duration-200 hover:scale-110"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="w-px h-4 bg-slate-600/40"></div>
                                  <button
                                    onClick={() => handleDeleteStrategy(strategy.id)}
                                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/30 rounded-lg transition-all duration-200 hover:scale-110"
                                  >
                                    ×
                                  </button>
                                </div>
                              {/* Nomenclaturas */}
                              <div className="space-y-3 mb-4">
                                <div>
                                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide block mb-2">Produto</span>
                                  <div className="relative">
                                    <div 
                                      onClick={() => copyToClipboard(strategy.generatedNames.product, `product-${strategy.id}`)}
                                      className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30 cursor-pointer hover:border-slate-500/50 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-800/60 transition-all duration-200 group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm text-blue-300 font-medium leading-relaxed flex-1">{strategy.generatedNames.product}</p>
                                        <Copy className="w-3 h-3 text-blue-400 group-hover:text-blue-300 transition-colors" />
                                      </div>
                                    </div>
                                    <AnimatePresence>
                                      {copiedStates.has(`product-${strategy.id}`) && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                          className="absolute top-1 right-12 bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400/30 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl z-20 backdrop-blur-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            <span>Copiado para a área de transferência</span>
                                          </div>
                                          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-emerald-500"></div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide block mb-2">Público</span>
                                  <div className="relative">
                                    <div 
                                      onClick={() => copyToClipboard(strategy.generatedNames.audience, `audience-${strategy.id}`)}
                                      className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30 cursor-pointer hover:border-slate-500/50 hover:bg-gradient-to-r hover:from-slate-700/60 hover:to-slate-800/60 transition-all duration-200 group"
                                    >
                                      <div className="flex items-center justify-between">
                                        <p className="text-sm text-yellow-300 font-medium leading-relaxed flex-1">{strategy.generatedNames.audience}</p>
                                        <Copy className="w-3 h-3 text-yellow-400 group-hover:text-yellow-300 transition-colors" />
                                      </div>
                                    </div>
                                    <AnimatePresence>
                                      {copiedStates.has(`audience-${strategy.id}`) && (
                                        <motion.div
                                          initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                          exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                          className="absolute top-1 right-12 bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400/30 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl z-20 backdrop-blur-sm"
                                        >
                                          <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                            <span>Copiado para a área de transferência</span>
                                          </div>
                                          <div className="absolute top-1/2 -right-3 transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-emerald-500"></div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </div>
                              </div>

                              {/* Barra de progresso do orçamento */}
                              <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">ORÇAMENTO</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-300 font-medium">R$ {strategy.budget.current.toFixed(2).replace('.', ',')} / R$ {strategy.budget.planned.toFixed(2).replace('.', ',')}</span>
                                    <div className="flex items-center gap-1">
                                      <div className={`w-2 h-2 rounded-full ${strategy.isSynchronized ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
                                      <button
                                        onClick={fetchMetaAdsValues}
                                        className="text-slate-400 hover:text-slate-300 transition-colors p-1 rounded hover:bg-slate-600/30"
                                        title={strategy.isSynchronized ? 'Sincronizado com Meta Ads - Valor atualizado automaticamente.' : 'Para sincronizar, é necessário que o nome do público (conjunto de anúncio) no Meta Ads, seja igual ao nome definido na estratégia criada.'}
                                      >
                                        <RefreshCw className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div className="w-full bg-slate-600/50 rounded-full h-2.5 overflow-hidden">
                                  <div 
                                    className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 shadow-sm"
                                    style={{ width: `${Math.min((strategy.budget.current / strategy.budget.planned) * 100, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </div>


                          </div>
                        </motion.div>
                      ))}

                      {/* Botão para adicionar estratégia ao produto */}
                      <motion.button
                        onClick={() => handleOpenModal(undefined, productData.name, productData.niche)}
                        className="group relative inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-indigo-500/30 border border-blue-500/40 hover:border-blue-400/60 px-6 py-3 text-blue-200 hover:text-blue-100 transition-all duration-300 shadow-lg hover:shadow-xl w-full"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Plus className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-medium">Adicionar Estratégia</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50 flex-shrink-0">
                  <h2 className="text-xl font-bold text-slate-200">
                    {editingStrategy ? 'Editar Estratégia' : 'Nova Estratégia'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="text-slate-400 hover:text-slate-200 transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* Produto */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Definição do Produto</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nome do Produto</label>
                          <input
                            type="text"
                            value={currentStrategy.product?.name || ''}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, name: e.target.value }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Aulas de Pilates"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nicho</label>
                          <input
                            type="text"
                            value={currentStrategy.product?.niche || ''}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, niche: e.target.value }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Ex: Pilates"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Tipo</label>
                          <select
                            value={currentStrategy.product?.type || 'online'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, type: e.target.value as 'online' | 'fisico' }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="online">Produto Online</option>
                            <option value="fisico">Produto Físico</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Objetivo</label>
                          <select
                            value={currentStrategy.product?.objective || 'trafico'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              product: { ...prev.product!, objective: e.target.value as 'trafico' | 'mensagens' | 'compras' }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="trafico">Tráfego no Site</option>
                            <option value="mensagens">Conversão em Mensagens</option>
                            <option value="compras">Conversões de Compras</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Público */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Definição do Público</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Público Alvo</label>
                          <select
                            value={currentStrategy.audience?.gender || 'ambos'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              audience: { ...prev.audience!, gender: e.target.value as 'homem' | 'mulher' | 'ambos' }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="ambos">Ambos</option>
                            <option value="homem">Homem</option>
                            <option value="mulher">Mulher</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Faixa Etária</label>
                          <select
                            value={currentStrategy.audience?.ageRange || '25-45'}
                            onChange={(e) => setCurrentStrategy(prev => ({
                              ...prev,
                              audience: { ...prev.audience!, ageRange: e.target.value }
                            }))}
                            className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="18-25">18-25 anos</option>
                            <option value="25-35">25-35 anos</option>
                            <option value="35-45">35-45 anos</option>
                            <option value="45-65">45-65 anos</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <label className="block text-sm font-medium text-slate-300 mb-2">Localização</label>
                        <div className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={locationInput}
                            onChange={(e) => setLocationInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                            className="flex-1 bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                            placeholder="Digite uma localização e pressione Enter"
                          />
                          <button
                            onClick={handleAddLocation}
                            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            Adicionar
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {currentStrategy.audience?.locations.map((location, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-600/30 text-blue-200"
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              {location}
                              <button
                                onClick={() => handleRemoveLocation(location)}
                                className="ml-2 text-blue-300 hover:text-white transition-colors"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Orçamento */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Orçamento</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Valor Pretendido</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={formatBRLFromDigits(currentStrategy.budget?.planned.toString() || '0')}
                              onChange={(e) => {
                                const digits = extractDigits(e.target.value);
                                setCurrentStrategy(prev => ({
                                  ...prev,
                                  budget: { ...prev.budget!, planned: parseInt(digits) / 100 }
                                }));
                              }}
                              className="w-full bg-slate-700/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder="R$ 0,00"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Valor Atual</label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                              type="text"
                              value={formatBRLFromDigits(currentStrategy.budget?.current.toString() || '0')}
                              onChange={(e) => {
                                if (!currentStrategy.isSynchronized) {
                                  const digits = extractDigits(e.target.value);
                                  setCurrentStrategy(prev => ({
                                    ...prev,
                                    budget: { ...prev.budget!, current: parseInt(digits) / 100 }
                                  }));
                                }
                              }}
                              readOnly={currentStrategy.isSynchronized}
                              className={`w-full bg-slate-700/60 border border-slate-600/50 rounded-lg pl-10 pr-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${currentStrategy.isSynchronized ? 'opacity-50 cursor-not-allowed' : ''}`}
                              placeholder="R$ 0,00"
                            />
                            {!currentStrategy.isSynchronized && (
                              <button
                                onClick={fetchMetaAdsValues}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Nomes Gerados */}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-200 mb-4">Nomes Gerados</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nomenclatura do Produto</label>
                          <div className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-blue-400 font-medium">{currentStrategy.generatedNames?.product || 'Preencha os dados do produto'}</p>
                              <button
                                onClick={() => copyToClipboard(currentStrategy.generatedNames?.product || '', 'modal-product')}
                                className="text-blue-400 hover:text-blue-300 transition-colors"
                              >
                                <motion.div
                                  animate={copiedStates.has('modal-product') ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Copy className="w-4 h-4" />
                                </motion.div>
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Nomenclatura do Público</label>
                          <div className="bg-slate-700/60 border border-slate-600/50 rounded-lg px-4 py-3">
                            <div className="flex items-center justify-between">
                              <p className="text-yellow-400 font-medium">{currentStrategy.generatedNames?.audience || 'Preencha os dados do público'}</p>
                              <button
                                onClick={() => copyToClipboard(currentStrategy.generatedNames?.audience || '', 'modal-audience')}
                                className="text-yellow-400 hover:text-yellow-300 transition-colors"
                              >
                                <motion.div
                                  animate={copiedStates.has('modal-audience') ? { scale: [1, 1.2, 1] } : {}}
                                  transition={{ duration: 0.2 }}
                                >
                                  <Copy className="w-4 h-4" />
                                </motion.div>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-slate-700/50 flex-shrink-0">
                  <button
                    onClick={handleCloseModal}
                    className="px-6 py-3 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveStrategy}
                    className="group relative inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-8 py-3 font-semibold transition-all duration-300 shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>{editingStrategy ? 'Atualizar' : 'Criar'} Estratégia</span>
                    </div>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdStrategySection;
