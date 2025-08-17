import React, { useState, useEffect, useRef } from 'react';
import InsightsSection from './InsightsSection';
import { Edit3 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { metricsService } from '../services/metricsService';
import SectionHeader from './ui/SectionHeader';
import Chip from './ui/Chip';

interface AudienceDetailsTableProps {
  selectedAudience: string;
  selectedProduct: string;
  selectedClient: string;
  selectedMonth: string;
  metrics: any[];
}

interface AudienceDetails {
  agendamentos: number;
  vendas: number;
}

const AudienceDetailsTable: React.FC<AudienceDetailsTableProps> = ({
  selectedAudience,
  selectedProduct,
  selectedClient,
  selectedMonth,
  metrics
}) => {
  const [details, setDetails] = useState<AudienceDetails>({
    agendamentos: 0,
    vendas: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingField, setEditingField] = useState<'agendamentos' | 'vendas' | null>(null);
  const [editValue, setEditValue] = useState('');
  // Mantido anteriormente para máscara em valores monetários; removido por não uso atual
  const [vendasAuto, setVendasAuto] = useState(true);
  const [manualVendasValue, setManualVendasValue] = useState(0); // Novo estado para preservar valor manual
  const inputRef = useRef<HTMLInputElement>(null);

  // Calcular vendas do Meta Ads para este público específico (mesma lógica do MonthlyDetailsTable)
  const metaAdsVendas = React.useMemo(() => {
    

    // Filtrar métricas apenas para este público específico
    const relevantMetrics = metrics.filter(metric => 
      metric.month === selectedMonth && 
      metric.product === selectedProduct &&
      metric.audience === selectedAudience
    );

    // Se não encontrou métricas exatas, tentar filtro mais flexível
    let flexMetrics = relevantMetrics;
    if (relevantMetrics.length === 0) {
      
      
      // Tentar apenas com mês e produto
      flexMetrics = metrics.filter(metric => 
        metric.month === selectedMonth && 
        metric.product === selectedProduct
      );
      
      
    }

    // Somar todas as vendas do Meta Ads para este público (mesma lógica do calculateAggregatedMetrics)
    const total = flexMetrics.reduce((total, metric) => {
      return total + (metric.sales || 0);
    }, 0);

    

    return total;
  }, [metrics, selectedMonth, selectedProduct, selectedAudience]);

  // Carregar detalhes salvos quando o componente montar
  useEffect(() => {
    const loadSavedDetails = async () => {
      if (!selectedAudience || selectedAudience === 'Todos os Públicos') return;
      
      try {
        setIsLoading(true);
        const savedDetails = await metricsService.getAudienceDetails(selectedMonth, selectedProduct, selectedAudience);
        
        if (savedDetails) {
          
          
          // Carregar o modo salvo (se existir)
          if (savedDetails.vendasAuto !== undefined) {
            
            setVendasAuto(savedDetails.vendasAuto);
            
            // Se há valor manual salvo, carregá-lo
            if (savedDetails.manualVendasValue !== undefined) {
              
              setManualVendasValue(savedDetails.manualVendasValue);
            }
            
            // Definir os valores baseado no modo
            if (savedDetails.vendasAuto) {
              // Modo automático: usar valor do Meta Ads
              setDetails({
                agendamentos: savedDetails.agendamentos || 0,
                vendas: metaAdsVendas || 0
              });
              
            } else {
              // Modo manual: usar valor salvo
              setDetails({
                agendamentos: savedDetails.agendamentos || 0,
                vendas: savedDetails.vendas || 0
              });
              
            }
          } else {
            // Se não há modo salvo, verificar se foi inserido manualmente
            if (savedDetails.vendas && savedDetails.vendas > 0) {
              setManualVendasValue(savedDetails.vendas);
              
              // Se o valor salvo é diferente do Meta Ads, significa que foi editado manualmente
              const metaAdsValue = metaAdsVendas || 0;
              if (savedDetails.vendas !== metaAdsValue) {
                
                setVendasAuto(false); // Mudar para modo manual
                setDetails({
                  agendamentos: savedDetails.agendamentos || 0,
                  vendas: savedDetails.vendas || 0
                });
              } else {
                
                setVendasAuto(true); // Manter modo automático
                setDetails({
                  agendamentos: savedDetails.agendamentos || 0,
                  vendas: metaAdsVendas || 0
                });
              }
            } else {
              // Se não há valor salvo, manter modo automático
              setVendasAuto(true);
              setDetails({
                agendamentos: savedDetails.agendamentos || 0,
                vendas: metaAdsVendas || 0
              });
            }
          }
        } else {
          // Se não há dados salvos, manter modo automático
          setVendasAuto(true);
        }
      } catch (error) {
        
        // Se não há dados salvos, manter modo automático
        setVendasAuto(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadSavedDetails();
  }, [selectedMonth, selectedProduct, selectedAudience, metaAdsVendas]);

  // Sincronizar vendas com Meta Ads quando vendasAuto estiver ativo
  useEffect(() => {
    
    
    if (vendasAuto) {
      
      setDetails(prev => ({
        ...prev,
        vendas: metaAdsVendas
      }));
    }
  }, [vendasAuto, metaAdsVendas]);

  const handleCellClick = (field: 'agendamentos' | 'vendas') => {
    // Se vendas está em modo automático, não permitir edição manual
    if (field === 'vendas' && vendasAuto) {
      toast('Desative a sincronização automática para editar manualmente');
      return;
    }

    setEditingField(field);
    
    if (field === 'vendas') {
      // Para vendas, usar número simples (quantidade de vendas)
      setEditValue(details.vendas.toString());
    } else {
      // Para agendamentos, usar número simples
      setEditValue(details[field].toString());
    }
    
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 100);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingField === 'vendas') {
      // Para vendas, usar número simples (quantidade de vendas)
      setEditValue(e.target.value);
    } else {
      // Para agendamentos, usar número simples
      setEditValue(e.target.value);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  };

  const handleSave = async () => {
    if (!editingField || !selectedAudience || selectedAudience === 'Todos os Públicos') return;

    let newValue: number;
    let newManualVendasValue = manualVendasValue;
    
    
    
    if (editingField === 'vendas') {
      // Para vendas, usar número simples (quantidade de vendas)
      newValue = parseInt(editValue) || 0;
      // Se estiver em modo manual, salvar como valor manual
      if (!vendasAuto) {
        
        newManualVendasValue = newValue;
        setManualVendasValue(newValue);
      }
    } else {
      // Para agendamentos, usar número direto
      newValue = parseInt(editValue) || 0;
    }
    
    try {
      setIsSaving(true);
      const updatedDetails = {
        ...details,
        [editingField]: newValue
      };

      

      await metricsService.saveAudienceDetails({
        month: selectedMonth,
        product: selectedProduct,
        audience: selectedAudience,
        agendamentos: updatedDetails.agendamentos,
        vendas: updatedDetails.vendas,
        vendasAuto: vendasAuto, // Passar o modo atual
        manualVendasValue: newManualVendasValue, // Sempre salvar o valor manual atualizado
        ticketMedio: 250 // valor padrão
      });

      setDetails(updatedDetails);
      setEditingField(null);
      setEditValue('');
      toast.success('Valor atualizado com sucesso!');
      
      // Disparar evento para notificar outros componentes
      
      
      window.dispatchEvent(new CustomEvent('audienceDetailsSaved', {
        detail: { 
          month: selectedMonth,
          product: selectedProduct,
          audience: selectedAudience,
          client: selectedClient,
          details: updatedDetails
        }
      }));
      
      
    } catch (error) {
      console.error('Erro ao salvar detalhes do público:', error);
      toast.error('Erro ao salvar valor');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleVendasAuto = () => {
    

    const newVendasAuto = !vendasAuto;
    setVendasAuto(newVendasAuto);
    
    if (vendasAuto) {
      // Mudando de automático para manual
      
      toast.success('Modo manual ativado - você pode editar o valor');
      
      // Restaurar o valor manual se existir
      if (manualVendasValue > 0) {
        
        setDetails(prev => ({
          ...prev,
          vendas: manualVendasValue
        }));
      }
    } else {
      // Mudando de manual para automático
      
      toast.success('Sincronização automática ativada');
      
      // Salvar o valor atual como valor manual ANTES de mudar para automático
      
      setManualVendasValue(details.vendas);
      
      // Atualizar imediatamente com o valor do Meta Ads (mesmo que seja 0)
      
      setDetails(prev => {
        const newDetails = {
          ...prev,
          vendas: metaAdsVendas
        };
        
        return newDetails;
      });
    }

    // Salvar o modo no Firebase
    if (selectedAudience && selectedAudience !== 'Todos os Públicos') {
      const finalVendas = newVendasAuto ? metaAdsVendas : details.vendas;
      
      
      metricsService.saveAudienceDetails({
        month: selectedMonth,
        product: selectedProduct,
        audience: selectedAudience,
        agendamentos: details.agendamentos,
        vendas: finalVendas,
        vendasAuto: newVendasAuto,
        manualVendasValue: manualVendasValue, // Salvar o valor manual
        ticketMedio: 250
      }).then(() => {
        
        
        // Disparar evento após salvar
        window.dispatchEvent(new CustomEvent('audienceDetailsSaved', {
          detail: { 
            month: selectedMonth,
            product: selectedProduct,
            audience: selectedAudience,
            client: selectedClient,
            details: {
              agendamentos: details.agendamentos,
              vendas: finalVendas
            }
          }
        }));
      }).catch(error => {
        console.error('Erro ao salvar modo:', error);
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-slate-900 rounded-xl border border-slate-600 shadow-xl">
        <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-600 border-t-blue-500"></div>
            <span className="ml-3 text-slate-300">Carregando detalhes do público...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 shadow-xl overflow-hidden">
      {/* Insights & Sugestões focados no Público (Ad Set) */}
      {selectedAudience && selectedAudience !== 'Todos os Públicos' && (
        <div className="p-6 border-b border-slate-700/60">
          <InsightsSection
            selectedProduct={selectedProduct}
            selectedClient={selectedClient}
            selectedMonth={selectedMonth}
            selectedAudience={selectedAudience}
          />
        </div>
      )}
      {/* Header */}
      <div className="p-6 border-b border-slate-700/60 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <SectionHeader title="Detalhes do Público" subtitle={selectedMonth} />
        {isSaving && (
          <div className="mt-2 inline-flex items-center space-x-2 text-blue-300 bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-500/30">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
            <span className="text-sm font-medium">Salvando...</span>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campo Agendamentos */}
          <div 
            className={`p-5 relative group cursor-pointer transition-all duration-200 ${
              editingField === 'agendamentos'
                ? 'bg-emerald-900/40 border-l-4 border-emerald-400 shadow-sm'
                : 'bg-slate-700/60 hover:bg-emerald-900/30 border-l-4 border-transparent hover:border-emerald-400/60'
            }`}
            onClick={() => handleCellClick('agendamentos')}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-200">Agendamentos Realizados</h3>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            </div>
            
            {editingField === 'agendamentos' ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onBlur={handleSave}
                className="w-full bg-transparent text-2xl font-bold text-slate-100 border-none outline-none"
                placeholder="0"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-100">
                  {details.agendamentos.toLocaleString('pt-BR')}
                </div>
                <Chip color="emerald" size="xs">Edição Manual</Chip>
              </div>
            )}
          </div>

          {/* Campo Vendas */}
          <div 
            className={`p-5 relative group transition-all duration-200 ${
              editingField === 'vendas'
                ? 'bg-blue-900/40 border-l-4 border-blue-400 shadow-sm'
                : vendasAuto 
                  ? 'bg-slate-700/60 hover:bg-blue-900/30 border-l-4 border-transparent hover:border-blue-400/60'
                  : 'bg-slate-700/60 hover:bg-emerald-900/30 border-l-4 border-transparent hover:border-emerald-400/60 cursor-pointer'
            }`}
            onClick={() => !vendasAuto && handleCellClick('vendas')}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-slate-200">Vendas Realizadas</h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVendasAuto();
                  }}
                  className={`inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200 ${
                    vendasAuto 
                      ? 'bg-blue-900/40 hover:bg-blue-800/50 border border-blue-500/30' 
                      : 'bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/30'
                  }`}
                  title={vendasAuto ? 'Sincronizando automaticamente (clique para editar manualmente)' : 'Editando manualmente (clique para sincronizar automaticamente)'}
                >
                  {vendasAuto ? <Edit3 className="w-4 h-4 text-blue-400" /> : <Edit3 className="w-4 h-4 text-emerald-400" />}
                </button>
              </div>
            </div>
            
            {editingField === 'vendas' ? (
              <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyPress}
                onBlur={handleSave}
                className="w-full bg-transparent text-2xl font-bold text-slate-100 border-none outline-none"
                placeholder="0"
                autoFocus
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-slate-100">
                  {details.vendas.toLocaleString('pt-BR')}
                </div>
                {vendasAuto ? (
                  <Chip color="blue" size="xs">Sincronizando</Chip>
                ) : (
                  <Chip color="emerald" size="xs">Edição Manual</Chip>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudienceDetailsTable; 