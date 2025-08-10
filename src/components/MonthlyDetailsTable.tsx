import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Minus, Edit3, Check, X, Info, Download } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';

import { BenchmarkResults } from '../services/aiBenchmarkService';

interface MonthlyDetailsTableProps {
  metrics: MetricData[];
  selectedProduct?: string;
  selectedMonth?: string;
  onValuesChange?: (values: { agendamentos: number; vendas: number }) => void;
  aiBenchmarkResults?: BenchmarkResults | null;
}

interface TableRow {
  category: string;
  metric: string;
  benchmark: string;
  realValue: string;
  status: string;
  statusColor: string;
  benchmarkEditable: boolean;
  realValueEditable: boolean;
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

const MonthlyDetailsTable: React.FC<MonthlyDetailsTableProps> = ({ 
  metrics, 
  selectedProduct = '',
  selectedMonth = 'Janeiro 2025',
  onValuesChange,
  aiBenchmarkResults
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});

  // Controle para campos benchmark editáveis (automático vs manual)
  const [benchmarkAuto, setBenchmarkAuto] = useState({
    investimento: true,
    cpm: true,
    cpc: true,
    ctr: true,
    txMensagens: true,
    txAgendamento: true,
    txConversaoVendas: true
  });

  // UseEffect para aplicar valores de benchmark da IA
  useEffect(() => {
    if (aiBenchmarkResults) {
      setTableData(prevData => {
        const updatedData = prevData.map(row => {
          let newBenchmark = row.benchmark;
          
          // Só aplicar valores da IA se o campo estiver em modo automático
          const isAuto = (() => {
            switch (row.metric) {
              case 'Investimento pretendido (Mês)':
                return benchmarkAuto.investimento;
              case 'CPM':
                return benchmarkAuto.cpm;
              case 'CPC':
                return benchmarkAuto.cpc;
              case 'CTR':
                return benchmarkAuto.ctr;
              case 'Tx. Mensagens (Leads/Cliques)':
                return benchmarkAuto.txMensagens;
              case 'Tx. Agendamento (Agend./Leads)':
                return benchmarkAuto.txAgendamento;
              case 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)':
                return benchmarkAuto.txConversaoVendas;
              default:
                return true;
            }
          })();
          
          if (isAuto) {
            // Mapear os resultados da IA para os campos correspondentes
            switch (row.metric) {
              case 'CPM':
                newBenchmark = formatCurrency(aiBenchmarkResults.cpm);
                break;
              case 'CPC':
                newBenchmark = formatCurrency(aiBenchmarkResults.cpc);
                break;
              case 'CTR':
                newBenchmark = formatPercentage(aiBenchmarkResults.ctr);
                break;
              case 'Tx. Mensagens (Leads/Cliques)':
                newBenchmark = formatPercentage(aiBenchmarkResults.txMensagens);
                break;
              case 'Tx. Agendamento (Agend./Leads)':
                newBenchmark = formatPercentage(aiBenchmarkResults.txAgendamento);
                break;
              case 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)':
                newBenchmark = formatPercentage(aiBenchmarkResults.txConversaoVendas);
                break;
              default:
                return row;
            }
          }
          
          return { ...row, benchmark: newBenchmark };
        });

        // 🎯 CORREÇÃO: Recalcular valores dependentes após aplicar valores da IA
        const calculatedData = calculateValues(updatedData);
        
        // Salvar os valores de benchmark no localStorage para persistência
        saveBenchmarkValues(calculatedData);
        
        return calculatedData;
      });
    }
  }, [aiBenchmarkResults, benchmarkAuto]);

  // Função para salvar valores de benchmark
    const saveBenchmarkValues = (data: any[]) => {
    if (selectedProduct && selectedMonth) {
      const benchmarkValues: { [key: string]: string } = {};
      
      data.forEach(row => {
        if (row.benchmark && row.benchmark !== '--') {
          benchmarkValues[row.metric] = row.benchmark;
        }
      });
      
          // CORREÇÃO: Incluir cliente na chave para vincular ao período específico
      const selectedClient = localStorage.getItem('selectedClient') || 'Cliente Padrão';
      // Persistir no Firestore (primário). Mantemos localStorage apenas como cache.
      try {
        const { authService } = require('../services/authService');
        const { db } = require('../config/firebase');
        const { doc, setDoc } = require('firebase/firestore');
        const user = authService.getCurrentUser?.();
        if (user) {
          const key = `${(selectedClient||'').toLowerCase().replace(/[^a-z0-9_\-]/g,'_')}|${(selectedProduct||'').toLowerCase().replace(/[^a-z0-9_\-]/g,'_')}|${(selectedMonth||'').toLowerCase().replace(/[^a-z0-9_\-]/g,'_')}`;
          const ref = doc(db, 'users', user.uid, 'monthlyBenchmarks', key);
          setDoc(ref, { benchmarks: benchmarkValues }, { merge: true });
          // Atualiza cache local para futuras leituras offline
          const storageKey = `benchmark_${selectedClient}_${selectedProduct}_${selectedMonth}`;
          localStorage.setItem(storageKey, JSON.stringify(benchmarkValues));
        }
      } catch {}
    }
  };

  // Função para carregar valores de benchmark salvos
  const loadBenchmarkValues = () => {
    if (selectedProduct && selectedMonth) {
      // CORREÇÃO: Incluir cliente na chave para vincular ao período específico
      const clientForBenchmarks = localStorage.getItem('selectedClient') || 'Cliente Padrão';
      const storageKey = `benchmark_${clientForBenchmarks}_${selectedProduct}_${selectedMonth}`;
      const savedBenchmarks = localStorage.getItem(storageKey);
      
      console.log('🔍 DEBUG - MonthlyDetailsTable - Tentando carregar benchmarks:', {
        storageKey,
        clientForBenchmarks,
        selectedProduct,
        selectedMonth,
        hasSavedData: !!savedBenchmarks
      });
      
      if (savedBenchmarks) {
        try {
          const benchmarkValues = JSON.parse(savedBenchmarks);
          console.log('🔍 DEBUG - MonthlyDetailsTable - Benchmarks carregados:', benchmarkValues);
          
          setTableData(prevData => {
            const updatedData = prevData.map(row => {
              if (benchmarkValues[row.metric]) {
                return { ...row, benchmark: benchmarkValues[row.metric] };
              }
              return row;
            });
            
            // 🎯 CORREÇÃO: Recalcular valores dependentes após carregar valores salvos
            const calculatedData = calculateValues(updatedData);
            return calculatedData;
          });
        } catch (error) {
          console.error('Erro ao carregar benchmarks salvos:', error);
          // CORREÇÃO: Em caso de erro, manter valores zerados
          setTableData(getInitialTableData());
        }
      } else {
        // CORREÇÃO: Se não há dados salvos, manter valores zerados
        console.log('🔍 DEBUG - MonthlyDetailsTable - Nenhum benchmark salvo encontrado, mantendo valores zerados');
        setTableData(getInitialTableData());
      }

      // Carregar estados automáticos dos campos benchmark
      // CORREÇÃO: Incluir cliente na chave para vincular ao período específico
      const clientForAutoStates = localStorage.getItem('selectedClient') || 'Cliente Padrão';
      const autoStatesKey = `benchmark_auto_${clientForAutoStates}_${selectedProduct}_${selectedMonth}`;
      const savedAutoStates = localStorage.getItem(autoStatesKey);
      
      if (savedAutoStates) {
        try {
          const autoStates = JSON.parse(savedAutoStates);
          setBenchmarkAuto(autoStates);
          console.log('Estados automáticos de benchmark carregados:', autoStates);
        } catch (error) {
          console.error('Erro ao carregar estados automáticos de benchmark:', error);
        }
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  const parseCurrency = (value: string): number => {
    return parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  };

  const parseNumber = (value: string): number => {
    return parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
  };

  // Função específica para extrair ROI de formato "232% (3.3x)"
  const parseROI = (value: string): number => {
    // Extrair apenas o valor da porcentagem (antes do %)
    const match = value.match(/(\d+(?:,\d+)?)%/);
    if (match) {
      return parseFloat(match[1].replace(',', '.')) || 0;
    }
    // Fallback para parseNumber normal
    return parseNumber(value);
  };

  // Função para salvar o valor completo do ROI
  const saveROIValue = (value: string): string => {
    // Salvar o valor completo como string
    return value || '0% (0.0x)';
  };

  // Estado para o Ticket Médio editável
  const [ticketMedio, setTicketMedio] = useState(250);
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [ticketEditValue, setTicketEditValue] = useState('');
  const [ticketEditRawValue, setTicketEditRawValue] = useState('');

  // Função para gerar dados iniciais zerados
  const getInitialTableData = (): TableRow[] => [
    // Geral e Drivers Primários
    {
      category: 'Geral e Drivers Primários',
      metric: 'Investimento pretendido (Mês)',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    
    // Desempenho do Anúncio e Custo por Lead
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPM',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Impressões',
      benchmark: '0',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPC',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Cliques',
      benchmark: '0',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CTR',
      benchmark: '0.00%',
      realValue: '0.00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Leads / Msgs',
      benchmark: '0',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Tx. Mensagens (Leads/Cliques)',
      benchmark: '40.00%', // Taxa padrão: 40% dos cliques convertem em leads
      realValue: '0.00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPL (Custo por Lead)',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },

    // Funil de Agendamento
    {
      category: 'Funil de Agendamento',
      metric: 'Agendamentos',
      benchmark: '0',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Funil de Agendamento',
      metric: 'Tx. Agendamento (Agend./Leads)',
      benchmark: '30.00%', // Taxa padrão: 30% dos leads agendam
      realValue: '0.00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },

    // Resultados Finais da Venda
    {
      category: 'Resultados Finais da Venda',
      metric: 'Vendas',
      benchmark: '0',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Resultados Finais da Venda',
      metric: 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)',
      benchmark: '20.00%', // Taxa padrão: 20% dos agendamentos convertem em vendas
      realValue: '0.00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Resultados Finais da Venda',
      metric: 'CPV (Custo por Venda)',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Resultados Finais da Venda',
      metric: 'Lucro',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Resultados Finais da Venda',
      metric: 'ROI / ROAS',
      benchmark: '0% (0.0x)',
      realValue: '0% (0.0x)',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    }
  ];

  // Estado para controlar os dados editáveis
  const [tableData, setTableData] = useState<TableRow[]>(getInitialTableData());

  // Estado para controlar qual célula está sendo editada
  const [editingCell, setEditingCell] = useState<{rowIndex: number, field: 'benchmark' | 'realValue'} | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isHovered, setIsHovered] = useState<{rowIndex: number, field: 'benchmark' | 'realValue'} | null>(null);

  // Posicionar cursor quando começar a editar
  useEffect(() => {
    if (editingCell && inputRef.current) {
      // Focar no input
      inputRef.current.focus();
      
      const row = tableData[editingCell.rowIndex];
      
      if (row.metric.includes('CTR') || row.metric.includes('Tx.')) {
        // Para percentuais, posicionar antes do símbolo %
        const percentIndex = editValue.indexOf('%');
        const position = percentIndex > 0 ? percentIndex : editValue.length;
        inputRef.current.setSelectionRange(position, position);
      } else {
        // Para outros valores, posicionar no final
        const length = editValue.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, [editingCell, editValue]);

  // Estado para controlar se devemos sobrescrever valores editados manualmente
  const [hasInitialLoad, setHasInitialLoad] = useState(false);
  
  // Estado para armazenar dados editáveis salvos
  const [savedDetails, setSavedDetails] = useState({ agendamentos: 0, vendas: 0, ticketMedio: 0, cpv: 0, roi: '0% (0.0x)' });

  // Estado para armazenar dados calculados dos públicos
  const [audienceCalculatedValues, setAudienceCalculatedValues] = useState({ agendamentos: 0, vendas: 0 });

  // Carregar dados salvos do Firebase quando produto ou mês mudar
  useEffect(() => {
    const loadSavedDetails = async () => {
      // Reset do estado inicial ao mudar seleção
      setHasInitialLoad(false);
      
      if (selectedProduct && selectedMonth) {
        try {
          const details = await metricsService.getMonthlyDetails(
            selectedMonth,
            selectedProduct
          );
          // CORREÇÃO: Garantir que sempre tenham valores válidos
          setSavedDetails({
            agendamentos: details.agendamentos || 0,
            vendas: details.vendas || 0,
            ticketMedio: details.ticketMedio || 250,
            cpv: (details as any).cpv || 0,
            roi: (details as any).roi || '0% (0.0x)'
          });
          console.log('Dados carregados do Firebase para produto:', selectedProduct, details);
          console.log('🔍 DEBUG - MonthlyDetailsTable - Dados salvos incluem CPV/ROI:', {
            hasCPV: 'cpv' in details,
            hasROI: 'roi' in details,
            cpvValue: (details as any).cpv,
            roiValue: (details as any).roi
          });
          
          // CORREÇÃO: Aplicar valores salvos de CPV e ROI ao tableData
          if ((details as any).cpv !== undefined || (details as any).roi !== undefined) {
            setTableData(prevData => {
              const newData = prevData.map(row => {
                const newRow = { ...row };
                
                // Aplicar CPV salvo se existir
                if ((row.metric === 'CPV' || row.metric === 'CPV (Custo por Venda)') && (details as any).cpv !== undefined) {
                  console.log(`🔍 DEBUG - MonthlyDetailsTable - Aplicando CPV salvo: ${row.realValue} → ${formatCurrency((details as any).cpv)}`);
                  newRow.realValue = formatCurrency((details as any).cpv);
                }
                
                // Aplicar ROI salvo se existir
                if ((row.metric === 'ROI' || row.metric === 'ROI/ROAS' || row.metric === 'ROI / ROAS') && (details as any).roi !== undefined) {
                  console.log(`🔍 DEBUG - MonthlyDetailsTable - Aplicando ROI salvo: ${row.realValue} → ${(details as any).roi}`);
                  newRow.realValue = (details as any).roi;
                }
                
                return newRow;
              });
              
              // Recalcular status após aplicar valores salvos
              const calculatedData = calculateValues(newData);
              return calculatedData;
            });
          }
          
          // Log adicional para verificar todos os campos da planilha
          console.log('🔍 DEBUG - MonthlyDetailsTable - Todos os campos da planilha:', tableData.map(row => ({
            metric: row.metric,
            realValue: row.realValue
          })));
          
          // Log específico para encontrar campos CPV e ROI
          const cpvFields = tableData.filter(row => row.metric.toLowerCase().includes('cpv'));
          const roiFields = tableData.filter(row => row.metric.toLowerCase().includes('roi') || row.metric.toLowerCase().includes('roas'));
          console.log('🔍 DEBUG - MonthlyDetailsTable - Campos CPV encontrados:', cpvFields);
          console.log('🔍 DEBUG - MonthlyDetailsTable - Campos ROI/ROAS encontrados:', roiFields);
          
          // Carregar também os valores de benchmark salvos
          loadBenchmarkValues();
        } catch (error) {
          console.error('Erro ao carregar detalhes salvos:', error);
          // CORREÇÃO: Garantir valores padrão em caso de erro
          setSavedDetails({ agendamentos: 0, vendas: 0, ticketMedio: 250, cpv: 0, roi: '0% (0.0x)' });
        }
      } else {
        // Limpar dados salvos se não há produto selecionado
        // CORREÇÃO: Garantir valores padrão quando não há seleção
        setSavedDetails({ agendamentos: 0, vendas: 0, ticketMedio: 250, cpv: 0, roi: '0% (0.0x)' });
      }
    };

    loadSavedDetails();
  }, [selectedMonth, selectedProduct]);

  // Carregar dados dos públicos para o produto selecionado
  const loadAudienceData = useCallback(async () => {
    if (selectedProduct && selectedProduct !== 'Todos os Produtos' && selectedMonth) {
      try {
        const audienceDetails = await metricsService.getAllAudienceDetailsForProduct(
          selectedMonth,
          selectedProduct
        );
        
        // Calcular totais dos públicos
        const totalAgendamentos = audienceDetails.reduce((sum: number, detail: any) => sum + (detail.agendamentos || 0), 0);
        const totalVendas = audienceDetails.reduce((sum: number, detail: any) => sum + (detail.vendas || 0), 0);
        
        setAudienceCalculatedValues({
          agendamentos: totalAgendamentos,
          vendas: totalVendas
        });
      } catch (error) {
        setAudienceCalculatedValues({ agendamentos: 0, vendas: 0 });
      }
    }
  }, [selectedProduct, selectedMonth]);

  // Recarregar dados quando o componente for montado ou quando houver mudança de foco
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedProduct && selectedMonth) {
        console.log('🔍 DEBUG - MonthlyDetailsTable - Página voltou ao foco, recarregando dados...');
        const loadAudienceData = async () => {
          try {
            const allAudienceDetails = await metricsService.getAllAudienceDetailsForProduct(selectedMonth, selectedProduct);
            const totalAgendamentos = allAudienceDetails.reduce((sum, detail) => sum + (detail.agendamentos || 0), 0);
            const totalVendas = allAudienceDetails.reduce((sum, detail) => sum + (detail.vendas || 0), 0);
            
            setAudienceCalculatedValues({
              agendamentos: totalAgendamentos,
              vendas: totalVendas
            });
            
            console.log('🔍 DEBUG - MonthlyDetailsTable - Dados recarregados após foco:', {
              totalAgendamentos,
              totalVendas
            });
          } catch (error) {
            console.error('Erro ao recarregar dados após foco:', error);
          }
        };
        
        loadAudienceData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedMonth, selectedProduct]);

  // Atualização imediata ao salvar detalhes de público
  useEffect(() => {
    const onAudienceDetailsSaved = async (event: Event) => {
      console.time('MonthlyDetailsTable.onAudienceDetailsSaved');
      const { detail } = event as CustomEvent<{ month: string; product: string }>; 
      if (!detail) return;
      // Garantir que é do mesmo mês/produto
      if (detail.month === selectedMonth && detail.product === selectedProduct) {
        try {
          console.log('🔍 DEBUG - MonthlyDetailsTable - audienceDetailsSaved DETECTADO para mês/produto atuais', detail);
          console.time('metricsService.getAllAudienceDetailsForProduct');
          const allAudienceDetails = await metricsService.getAllAudienceDetailsForProduct(selectedMonth, selectedProduct);
          console.timeEnd('metricsService.getAllAudienceDetailsForProduct');
          const totalAgendamentos = allAudienceDetails.reduce((sum, d) => sum + (d.agendamentos || 0), 0);
          const totalVendas = allAudienceDetails.reduce((sum, d) => sum + (d.vendas || 0), 0);
          setAudienceCalculatedValues({ agendamentos: totalAgendamentos, vendas: totalVendas });
          console.log('🔍 DEBUG - MonthlyDetailsTable - Valores agregados após audienceDetailsSaved:', { totalAgendamentos, totalVendas });
        } catch {}
      }
      console.timeEnd('MonthlyDetailsTable.onAudienceDetailsSaved');
    };
    window.addEventListener('audienceDetailsSaved', onAudienceDetailsSaved);
    return () => window.removeEventListener('audienceDetailsSaved', onAudienceDetailsSaved);
  }, [selectedMonth, selectedProduct]);



  // Atualizar valores na tabela quando dados calculados dos públicos mudarem
  useEffect(() => {
    console.log('🔍 DEBUG - MonthlyDetailsTable - Atualizando tabela com valores dos públicos:', audienceCalculatedValues);
    
    setTableData(prevData => {
      const newData = prevData.map(row => {
        const newRow = { ...row };
        
        if (row.metric === 'Agendamentos') {
          const newValue = audienceCalculatedValues.agendamentos.toLocaleString('pt-BR');
          console.log(`🔍 DEBUG - MonthlyDetailsTable - Atualizando Agendamentos: ${row.realValue} → ${newValue}`);
          newRow.realValue = newValue;
        }
        
        if (row.metric === 'Vendas') {
          const newValue = audienceCalculatedValues.vendas.toLocaleString('pt-BR');
          console.log(`🔍 DEBUG - MonthlyDetailsTable - Atualizando Vendas: ${row.realValue} → ${newValue}`);
          newRow.realValue = newValue;
        }
        
        // CORREÇÃO: Preservar valores salvos de CPV e ROI, não recalcular
        // Os valores de CPV e ROI devem vir dos dados salvos, não ser recalculados
        
        return newRow;
      });
      
      // Recalcular valores dependentes, mas preservar CPV e ROI salvos
      const calculatedData = calculateValues(newData);
      
      // CORREÇÃO: Restaurar valores salvos de CPV e ROI após cálculo
      const finalData = calculatedData.map(row => {
        const newRow = { ...row };
        
        // Buscar valores salvos do Firebase
        const savedCPV = (savedDetails as any).cpv;
        const savedROI = (savedDetails as any).roi;
        
        // Restaurar CPV salvo se existir
        if ((row.metric === 'CPV' || row.metric === 'CPV (Custo por Venda)') && savedCPV !== undefined) {
          console.log(`🔍 DEBUG - MonthlyDetailsTable - Restaurando CPV salvo: ${row.realValue} → ${formatCurrency(savedCPV)}`);
          newRow.realValue = formatCurrency(savedCPV);
        }
        
        // Restaurar ROI salvo se existir
        if ((row.metric === 'ROI' || row.metric === 'ROI/ROAS' || row.metric === 'ROI / ROAS') && savedROI !== undefined) {
          console.log(`🔍 DEBUG - MonthlyDetailsTable - Restaurando ROI salvo: ${row.realValue} → ${savedROI}`);
          newRow.realValue = savedROI;
        }
        
        return newRow;
      });
      
      // Notificar mudanças
      if (onValuesChange) {
        const agendamentos = audienceCalculatedValues.agendamentos;
        const vendas = audienceCalculatedValues.vendas;
        
        console.log(`🔍 DEBUG - MonthlyDetailsTable - Notificando mudanças finais: agendamentos=${agendamentos}, vendas=${vendas}`);
        
        // Salvar no Firebase quando os valores dos públicos mudam
        if (selectedProduct && selectedMonth) {
          // Calcular CPV e ROI para salvar
          const cpvRow = finalData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
          const roiRow = finalData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');
          
          const cpv = parseNumber(cpvRow?.realValue || '0');
          const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');
          
          console.log('🔍 DEBUG - MonthlyDetailsTable - Buscando CPV/ROI na planilha:', {
            cpvRow: cpvRow?.metric,
            cpvValue: cpvRow?.realValue,
            roiRow: roiRow?.metric,
            roiValue: roiRow?.realValue,
            allMetrics: finalData.map(r => r.metric)
          });
          
          // Log adicional para verificar se os valores estão sendo calculados corretamente
          console.log('🔍 DEBUG - MonthlyDetailsTable - Valores calculados para salvar:', {
            cpv: cpv,
            roi: roiValue,
            cpvParsed: parseNumber(cpvRow?.realValue || '0'),
            roiParsed: parseROI(roiRow?.realValue || '0')
          });
          
          console.log('🔍 DEBUG - MonthlyDetailsTable - Salvando dados dos públicos com CPV/ROI:', {
            agendamentos,
            vendas,
            cpv,
            roi: roiValue,
            ticketMedio
          });
          
          // CORREÇÃO: Incluir o cliente selecionado ao salvar
          const selectedClient = localStorage.getItem('selectedClient') || 'Cliente Padrão';
          
          metricsService.saveMonthlyDetails({
            month: selectedMonth,
            product: selectedProduct,
            client: selectedClient, // Adicionar cliente
            agendamentos: agendamentos,
            vendas: vendas,
            ticketMedio: ticketMedio,
            cpv: cpv,
            roi: roiValue
          }).catch(error => {
            console.error('Erro ao salvar valores dos públicos:', error);
          });
        }
        
        onValuesChange({ agendamentos, vendas });
      }
      
      return finalData;
    });
  }, [audienceCalculatedValues, onValuesChange]);

  // Carregar ticketMedio dos dados salvos
  useEffect(() => {
    if (savedDetails.ticketMedio > 0) {
      setTicketMedio(savedDetails.ticketMedio);
    }
  }, [savedDetails.ticketMedio]);

  // Atualizar métricas quando houver mudança no produto selecionado ou nas métricas
  useEffect(() => {
    if (!metrics || metrics.length === 0) {
      console.log('🔴 MonthlyDetailsTable: Nenhuma métrica disponível - zerando valores');
      
      // CORREÇÃO: Quando não há métricas, zerar todos os valores sincronizados
      setTableData(prevData => {
        const updated = prevData.map(row => {
          const newRow: TableRow = { ...row };

          // Zerar valores que são sincronizados com Meta Ads
          switch (row.metric) {
            case 'Investimento pretendido (Mês)':
              newRow.realValue = formatCurrency(0);
              newRow.realValueEditable = false;
              break;
            case 'CPM':
              newRow.realValue = formatCurrency(0);
              newRow.realValueEditable = false;
              break;
            case 'Impressões':
              newRow.realValue = '0';
              newRow.realValueEditable = false;
              break;
            case 'CPC':
              newRow.realValue = formatCurrency(0);
              newRow.realValueEditable = false;
              break;
            case 'Cliques':
              newRow.realValue = '0';
              newRow.realValueEditable = false;
              break;
            case 'CTR':
              newRow.realValue = '0.00%';
              newRow.realValueEditable = false;
              break;
            case 'Leads / Msgs':
              newRow.realValue = '0';
              newRow.realValueEditable = false;
              break;
            case 'CPL (Custo por Lead)':
              newRow.realValue = formatCurrency(0);
              newRow.realValueEditable = false;
              break;
            case 'Agendamentos':
              newRow.realValue = audienceCalculatedValues.agendamentos.toLocaleString('pt-BR');
              newRow.realValueEditable = false; // CORREÇÃO: Sempre não editável
              break;
            case 'Vendas':
              newRow.realValue = audienceCalculatedValues.vendas.toLocaleString('pt-BR');
              newRow.realValueEditable = false; // CORREÇÃO: Sempre não editável
              break;
            default:
              break;
          }

          // CORREÇÃO: Calcular status dinamicamente baseado nos valores reais vs benchmark
          const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.benchmark);
          newRow.status = statusResult.status;
          newRow.statusColor = statusResult.statusColor;

          return newRow;
        });

        // Recalcular campos dependentes
        const calculatedData = calculateValues(updated);
        return calculatedData;
      });
      
      return;
    }

    console.log(`🟡 MonthlyDetailsTable: Processando ${metrics.length} métricas`);
    console.log('🟡 MonthlyDetailsTable: Primeira métrica:', metrics[0]);

    const aggregated = metricsService.calculateAggregatedMetrics(metrics);

    console.log(`🟢 MonthlyDetailsTable: Métricas agregadas - totalLeads: ${aggregated.totalLeads}`);
    console.log(`🔍 DEBUG - MonthlyDetailsTable: audienceCalculatedValues:`, audienceCalculatedValues);
    

    setTableData(prevData => {
      const updated = prevData.map(row => {
        const newRow: TableRow = { ...row };

        // CORREÇÃO: Verificar se há dados reais antes de sincronizar
        const hasRealData = aggregated.totalInvestment > 0 || aggregated.totalLeads > 0 || aggregated.totalClicks > 0;

        // Definir quais campos são sincronizados automaticamente com Meta Ads
        switch (row.metric) {
          case 'Investimento pretendido (Mês)':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              newRow.realValue = formatCurrency(aggregated.totalInvestment);
            } else {
              newRow.realValue = formatCurrency(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'CPM':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              newRow.realValue = formatCurrency(aggregated.avgCPM);
            } else {
              newRow.realValue = formatCurrency(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'Impressões':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              newRow.realValue = aggregated.totalImpressions.toLocaleString('pt-BR');
            } else {
              newRow.realValue = '0';
            }
            newRow.realValueEditable = false;
            break;
          case 'CPC':
            // CPC calculado automaticamente: Investimento / Cliques
            if (hasRealData && aggregated.totalClicks > 0) {
              const avgCPC = aggregated.totalInvestment / aggregated.totalClicks;
              newRow.realValue = formatCurrency(avgCPC);
            } else {
              newRow.realValue = formatCurrency(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'Cliques':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              newRow.realValue = aggregated.totalClicks.toLocaleString('pt-BR');
            } else {
              newRow.realValue = '0';
            }
            newRow.realValueEditable = false;
            break;
          case 'CTR':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              newRow.realValue = `${aggregated.avgCTR.toFixed(2)}%`;
            } else {
              newRow.realValue = '0.00%';
            }
            newRow.realValueEditable = false;
            break;
          case 'Leads / Msgs':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              console.log(`🟢 MonthlyDetailsTable: Definindo Leads / Msgs como: ${aggregated.totalLeads.toLocaleString('pt-BR')}`);
              newRow.realValue = aggregated.totalLeads.toLocaleString('pt-BR');
            } else {
              console.log(`🟢 MonthlyDetailsTable: Definindo Leads / Msgs como: 0 (sem dados reais)`);
              newRow.realValue = '0';
            }
            newRow.realValueEditable = false;
            break;
          case 'CPL (Custo por Lead)':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              newRow.realValue = formatCurrency(aggregated.avgCPL);
            } else {
              newRow.realValue = formatCurrency(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'Agendamentos':
            // 🎯 CORREÇÃO: Sempre usar os valores calculados dos públicos
            console.log(`🔍 DEBUG - MonthlyDetailsTable: Atualizando Agendamentos com valor dos públicos: ${audienceCalculatedValues.agendamentos}`);
            newRow.realValue = audienceCalculatedValues.agendamentos.toLocaleString('pt-BR');
            newRow.realValueEditable = false; // CORREÇÃO: Sempre não editável
            break;
          case 'Vendas':
            // 🎯 CORREÇÃO: Sempre usar os valores calculados dos públicos
            console.log(`🔍 DEBUG - MonthlyDetailsTable: Atualizando Vendas com valor dos públicos: ${audienceCalculatedValues.vendas}`);
            newRow.realValue = audienceCalculatedValues.vendas.toLocaleString('pt-BR');
            newRow.realValueEditable = false; // CORREÇÃO: Sempre não editável
            break;
          default:
            break;
        }

        // CORREÇÃO: Calcular status dinamicamente baseado nos valores reais vs benchmark
        const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.benchmark);
        newRow.status = statusResult.status;
        newRow.statusColor = statusResult.statusColor;

        return newRow;
      });

      // Recalcular campos dependentes após a sincronização
      const calculatedData = calculateValues(updated);
      
      // 🎯 CORREÇÃO: Sempre notificar mudanças dos valores de públicos
      if (onValuesChange) {
        const agendamentos = audienceCalculatedValues.agendamentos;
        const vendas = audienceCalculatedValues.vendas;
        
        console.log(`🔍 DEBUG - MonthlyDetailsTable: Notificando mudanças - agendamentos: ${agendamentos}, vendas: ${vendas}`);
        onValuesChange({ agendamentos, vendas });
      }
      
      if (!hasInitialLoad) {
        setHasInitialLoad(true);
      }
      return calculatedData;
    });
  }, [metrics, selectedProduct, savedDetails, audienceCalculatedValues]);

  // Função para calcular valores automaticamente
  const calculateValues = (data: TableRow[]): TableRow[] => {
    // 🎯 CORREÇÃO: Implementar cálculo iterativo para resolver dependências circulares
    let currentData = [...data];
    let previousData: TableRow[] = [];
    let iterations = 0;
    const maxIterations = 5; // Limite para evitar loop infinito
    
    // Continuar recalculando até que não haja mais mudanças ou até o limite de iterações
    while (iterations < maxIterations) {
      previousData = JSON.parse(JSON.stringify(currentData)); // Deep copy
      
      currentData = currentData.map(row => {
        const newRow = { ...row };

        // Obter valores editáveis da coluna VALORES REAIS
        const investment = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.realValue || '0');
        const cpm = parseCurrency(currentData.find(r => r.metric === 'CPM')?.realValue || '0');
        const cliques = parseNumber(currentData.find(r => r.metric === 'Cliques')?.realValue || '0');
        const leads = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.realValue || '0');
        const agendamentos = parseNumber(currentData.find(r => r.metric === 'Agendamentos')?.realValue || '0');
        const vendas = parseNumber(currentData.find(r => r.metric === 'Vendas')?.realValue || '0');

        // Obter valores editáveis da coluna BENCHMARK/PROJEÇÃO
        const ctr = parseNumber(currentData.find(r => r.metric === 'CTR')?.benchmark || '0');
        const txMensagens = parseNumber(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0');
        const txAgendamento = parseNumber(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0');
        const txConversaoVendas = parseNumber(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0');

        // Calcular valores automáticos da coluna VALORES REAIS
        switch (row.metric) {
          case 'Impressões':
            if (cpm > 0) {
              newRow.realValue = Math.round(investment * 1000 / cpm).toString();
            }
            break;
          case 'CPC':
            if (cliques > 0) {
              newRow.realValue = formatCurrency(investment / cliques);
            }
            break;
          case 'CTR':
            const impressoes = parseNumber(currentData.find(r => r.metric === 'Impressões')?.realValue || '0');
            if (impressoes > 0) {
              newRow.realValue = formatPercentage((cliques / impressoes) * 100);
            }
            break;
          case 'Tx. Mensagens (Leads/Cliques)':
            if (cliques > 0) {
              newRow.realValue = formatPercentage((leads / cliques) * 100);
            }
            break;
          case 'CPL (Custo por Lead)':
            if (leads > 0) {
              newRow.realValue = formatCurrency(investment / leads);
            }
            break;
          case 'Tx. Agendamento (Agend./Leads)':
            if (leads > 0) {
              newRow.realValue = formatPercentage((agendamentos / leads) * 100);
            }
            break;
          case 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)':
            if (vendas > 0) {
              // 🎯 CORRIGIDO: Fluxo baseado na existência de agendamentos
              const denominador = agendamentos > 0 ? agendamentos : leads; // Se há agendamentos, usa agendamentos; senão usa leads direto
              newRow.realValue = formatPercentage((vendas / denominador) * 100);
            }
            break;
          case 'CPV (Custo por Venda)':
            if (vendas > 0) {
              newRow.realValue = formatCurrency(investment / vendas);
            }
            break;
          case 'Lucro':
            const receita = vendas * ticketMedio;
            newRow.realValue = formatCurrency(receita - investment);
            break;
          case 'ROI / ROAS':
            if (investment > 0) {
              const receita = vendas * ticketMedio;
              const lucro = receita - investment;
              const roiPercent = (lucro / investment) * 100;
              const roiMultiplier = (receita / investment);
              newRow.realValue = `${roiPercent.toFixed(0)}% (${roiMultiplier.toFixed(1)}x)`;
            }
            break;
        }

        // Calcular valores automáticos da coluna BENCHMARK/PROJEÇÃO
        switch (row.metric) {
          case 'Impressões':
            const investmentBench = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cpmBench = parseCurrency(currentData.find(r => r.metric === 'CPM')?.benchmark || '0');
            if (cpmBench > 0) {
              newRow.benchmark = Math.round(investmentBench * 1000 / cpmBench).toString();
            }
            break;
          // CPC é editável, não calculado automaticamente
          // case 'CPC':
          //   const investmentBench2 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
          //   const cliquesBench = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
          //   if (cliquesBench > 0) {
          //     newRow.benchmark = formatCurrency(investmentBench2 / cliquesBench);
          //   }
          //   break;
          case 'Cliques':
            const investmentBench2 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cpcBench = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
            
            // 🎯 CORREÇÃO: Calcular Cliques baseado no CPC editado
            if (cpcBench > 0) {
              // Se CPC foi editado, calcular Cliques baseado no CPC
              newRow.benchmark = Math.round(investmentBench2 / cpcBench).toString();
            } else {
              // Se CPC não foi editado, calcular baseado em Impressões e CTR (fluxo original)
              const impressoesBench = parseNumber(currentData.find(r => r.metric === 'Impressões')?.benchmark || '0');
              const ctrBench = parseNumber(currentData.find(r => r.metric === 'CTR')?.benchmark || '0');
              if (ctrBench > 0) {
                newRow.benchmark = Math.round(impressoesBench * ctrBench / 100).toString();
              }
            }
            break;

          case 'Leads / Msgs':
            const cliquesBench2 = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
            const txMensagensBench = parseNumber(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0');
            if (txMensagensBench > 0) {
              newRow.benchmark = Math.round(cliquesBench2 * txMensagensBench / 100).toString();
            }
            break;
          case 'Agendamentos':
            const leadsBench = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const txAgendamentoBench = parseNumber(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0');
            if (txAgendamentoBench > 0) {
              newRow.benchmark = Math.round(leadsBench * txAgendamentoBench / 100).toString();
            }
            break;
          case 'Vendas':
            const txConversaoVendasBench = parseNumber(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0');
            const txAgendamentoBenchVendas = parseNumber(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0');
            const leadsBenchVendas = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const agendamentosBench = parseNumber(currentData.find(r => r.metric === 'Agendamentos')?.benchmark || '0');
            
            if (txConversaoVendasBench > 0) {
              // 🎯 CORRIGIDO: Fluxo baseado na existência de taxa de agendamento
              if (txAgendamentoBenchVendas > 0 && agendamentosBench > 0) {
                // Fluxo COM agendamento: Leads → Agendamentos → Vendas
                newRow.benchmark = Math.round(agendamentosBench * txConversaoVendasBench / 100).toString();
              } else {
                // Fluxo SEM agendamento: Leads → Vendas (direto)
                newRow.benchmark = Math.round(leadsBenchVendas * txConversaoVendasBench / 100).toString();
              }
            }
            break;
          case 'CPL (Custo por Lead)':
            const investmentBench3 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const leadsBench2 = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            if (leadsBench2 > 0) {
              newRow.benchmark = formatCurrency(investmentBench3 / leadsBench2);
            }
            break;
          case 'CPV (Custo por Venda)':
            const investmentBench4 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const vendasBench2 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
            if (vendasBench2 > 0) {
              newRow.benchmark = formatCurrency(investmentBench4 / vendasBench2);
            }
            break;
          case 'Lucro':
            const vendasBench3 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
            const investmentBench5 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const receitaBench = vendasBench3 * ticketMedio;
            newRow.benchmark = formatCurrency(receitaBench - investmentBench5);
            break;
          case 'ROI / ROAS':
            const investmentBench6 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            if (investmentBench6 > 0) {
              const vendasBench4 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
              const receitaBench2 = vendasBench4 * ticketMedio;
              const lucroBench = receitaBench2 - investmentBench6;
              const roiPercentBench = (lucroBench / investmentBench6) * 100;
              const roiMultiplierBench = (receitaBench2 / investmentBench6);
              newRow.benchmark = `${roiPercentBench.toFixed(0)}% (${roiMultiplierBench.toFixed(1)}x)`;
            }
            break;
        }

        // CORREÇÃO: Calcular status dinamicamente após recalcular valores
        const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.benchmark);
        newRow.status = statusResult.status;
        newRow.statusColor = statusResult.statusColor;

        return newRow;
      });
      
      // Verificar se houve mudanças significativas
      const hasChanges = currentData.some((row, index) => {
        const prevRow = previousData[index];
        return row.benchmark !== prevRow.benchmark || row.realValue !== prevRow.realValue;
      });
      
      if (!hasChanges) {
        break; // Parar se não houve mudanças
      }
      
      iterations++;
    }
    
    if (iterations >= maxIterations) {
      console.warn('Cálculo de valores atingiu o limite máximo de iterações');
    }
    
    return currentData;
  };

  // Recalcular valores quando ticket médio mudar
  useEffect(() => {
    const calculatedData = calculateValues(tableData);
    setTableData(calculatedData);
  }, [ticketMedio]);

  // Salvar ticketMedio automaticamente quando alterado
  useEffect(() => {
    // Só salvar se não for o valor padrão inicial e se há produto/mês selecionado
    if (ticketMedio !== 250 && selectedProduct && selectedMonth) {
      const timeoutId = setTimeout(() => {
        // Calcular CPV e ROI para salvar
        const cpvRow = tableData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
        const roiRow = tableData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');
        
        const cpv = parseNumber(cpvRow?.realValue || '0');
        const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');
        
        // CORREÇÃO: Incluir o cliente selecionado ao salvar
        const selectedClient = localStorage.getItem('selectedClient') || 'Cliente Padrão';
        
        console.log('🔍 DEBUG - MonthlyDetailsTable - Salvando ticket médio com CPV/ROI:', {
          agendamentos: savedDetails.agendamentos,
          vendas: savedDetails.vendas,
          ticketMedio: ticketMedio,
          cpv,
          roi: roiValue,
          client: selectedClient
        });
        
        metricsService.saveMonthlyDetails({
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient, // Adicionar cliente
          agendamentos: savedDetails.agendamentos,
          vendas: savedDetails.vendas,
          ticketMedio: ticketMedio,
          cpv: cpv,
          roi: roiValue
        }).catch(error => {
          console.error('Erro ao salvar ticket médio:', error);
        });
      }, 500); // Debounce de 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [ticketMedio, selectedProduct, selectedMonth, savedDetails.agendamentos, savedDetails.vendas]);

  // Funções para editar o Ticket Médio
  const handleTicketClick = () => {
    setIsEditingTicket(true);
    // Converter o valor para centavos (multiplicar por 100)
    const cents = Math.round(ticketMedio * 100);
    setTicketEditRawValue(cents.toString());
    setTicketEditValue(formatBRLFromDigits(cents.toString()));
  };

  const handleTicketSave = () => {
    const newValue = parseFloat(ticketEditRawValue) / 100;
    if (!isNaN(newValue) && newValue > 0) {
      setTicketMedio(newValue);
    }
    setIsEditingTicket(false);
    setTicketEditValue('');
    setTicketEditRawValue('');
  };

  const handleTicketCancel = () => {
    setIsEditingTicket(false);
    setTicketEditValue('');
    setTicketEditRawValue('');
  };

  const handleTicketKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTicketSave();
    } else if (e.key === 'Escape') {
      handleTicketCancel();
    }
  };

  const handleTicketInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setTicketEditRawValue(digits);
    setTicketEditValue(formatBRLFromDigits(digits));
  };

  // Função para obter o placeholder baseado no tipo de valor
  const getPlaceholder = (metric: string, field: 'benchmark' | 'realValue'): string => {
    const value = field === 'benchmark' ? 
      tableData.find(r => r.metric === metric)?.benchmark : 
      tableData.find(r => r.metric === metric)?.realValue;
    
    if (value?.includes('R$')) return 'R$ 0,00';
    if (value?.includes('%')) return '0,00%';
    return '0';
  };

  // Função para formatar string de dígitos como moeda brasileira
  function formatBRLFromDigits(digits: string): string {
    if (!digits) return 'R$ 0,00';
    let number = parseInt(digits, 10);
    if (isNaN(number)) number = 0;
    return (number / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  // Função para formatar string de dígitos como porcentagem brasileira
  function formatPercentFromDigits(digits: string): string {
    if (!digits) return '0,00%';
    let number = parseInt(digits, 10);
    if (isNaN(number)) number = 0;
    // Divide por 100 para obter centésimos
    const percent = (number / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return percent + '%';
  }

  // Estado para controlar valor puro (apenas dígitos) durante edição monetária
  const [editRawValue, setEditRawValue] = useState('');

  // Estado para controlar valor puro (apenas dígitos) durante edição percentual
  const [editRawPercent, setEditRawPercent] = useState('');

  // Ajustar handleCellClick para iniciar edição com valor puro
  const handleCellClick = (rowIndex: number, field: 'benchmark' | 'realValue', value: string) => {
    const row = tableData[rowIndex];
    const isEditable = field === 'benchmark' ? row.benchmarkEditable : row.realValueEditable;
    if (isEditable) {
      setEditingCell({ rowIndex, field });
      if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') || 
          row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro')) {
        // Extrair apenas dígitos do valor atual (moeda)
        const digits = value.replace(/\D/g, '');
        setEditRawValue(digits);
        setEditValue(formatBRLFromDigits(digits));
        setEditRawPercent('');
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.')) {
        // Extrair apenas dígitos do valor atual (percentual)
        const digits = value.replace(/\D/g, '');
        setEditRawPercent(digits);
        setEditValue(formatPercentFromDigits(digits));
        setEditRawValue('');
      } else {
        setEditValue(value);
        setEditRawValue('');
        setEditRawPercent('');
      }
    }
  };

  // Ajustar handleInputChange para porcentagem
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const row = editingCell ? tableData[editingCell.rowIndex] : null;
    if (row && (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') || 
                row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro'))) {
      // Moeda
      const digits = e.target.value.replace(/\D/g, '');
      setEditRawValue(digits);
      setEditValue(formatBRLFromDigits(digits));
    } else if (row && (row.metric.includes('CTR') || row.metric.includes('Tx.'))) {
      // Percentual
      const digits = e.target.value.replace(/\D/g, '');
      setEditRawPercent(digits);
      const formattedValue = formatPercentFromDigits(digits);
      setEditValue(formattedValue);
      
      // Reposicionar cursor antes do símbolo % após a renderização
      setTimeout(() => {
        if (inputRef.current) {
          const percentIndex = formattedValue.indexOf('%');
          const position = percentIndex > 0 ? percentIndex : formattedValue.length;
          inputRef.current.setSelectionRange(position, position);
        }
      }, 0);
    } else {
      setEditValue(e.target.value);
    }
    
    // CORREÇÃO: Atualizar status em tempo real durante a digitação
    if (row) {
      const newData = [...tableData];
      let tempValue = e.target.value;
      
      // Formatar valor temporário para cálculo
      if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') || 
          row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro')) {
        const digits = e.target.value.replace(/\D/g, '');
        tempValue = formatBRLFromDigits(digits);
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.')) {
        const digits = e.target.value.replace(/\D/g, '');
        tempValue = formatPercentFromDigits(digits);
      }
      
      // Atualizar valor temporário na linha
      newData[editingCell!.rowIndex][editingCell!.field] = tempValue;
      
      // Recalcular status em tempo real
      const recalculatedData = calculateValues(newData);
      setTableData(recalculatedData);
    }
  };

  // Ajustar handleSave para moeda
  const handleSave = () => {
    if (editingCell) {
      const newData = [...tableData];
      const row = newData[editingCell.rowIndex];
      let finalValue = editValue;
      if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') || 
          row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro')) {
        finalValue = formatBRLFromDigits(editRawValue);
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.')) {
        finalValue = formatPercentFromDigits(editRawPercent);
      }
      
      newData[editingCell.rowIndex][editingCell.field] = finalValue;
      
      // CORREÇÃO: Recalcular valores dependentes e status
      const recalculatedData = calculateValues(newData);
      setTableData(recalculatedData);
      
      console.log('🔍 DEBUG - MonthlyDetailsTable - Status recalculado após edição:', {
        metric: row.metric,
        field: editingCell.field,
        newValue: finalValue,
        status: recalculatedData[editingCell.rowIndex].status,
        statusColor: recalculatedData[editingCell.rowIndex].statusColor
      });
      
      // Salvar benchmarks se foi editado na coluna benchmark
      if (editingCell.field === 'benchmark') {
        saveBenchmarkValues(recalculatedData);
      }
      
      // Notificar mudanças se for agendamentos ou vendas (agora calculados automaticamente)
      if (row.metric === 'Agendamentos' || row.metric === 'Vendas') {
        const agendamentos = parseNumber(recalculatedData.find(r => r.metric === 'Agendamentos')?.realValue || '0');
        const vendas = parseNumber(recalculatedData.find(r => r.metric === 'Vendas')?.realValue || '0');
        
        // Calcular CPV e ROI para salvar
        const cpvRow = recalculatedData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
        const roiRow = recalculatedData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');
        
        const cpv = parseNumber(cpvRow?.realValue || '0');
        const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');
        
        console.log('🔍 DEBUG - MonthlyDetailsTable - Salvando dados com CPV/ROI:', {
          agendamentos,
          vendas,
          cpv,
          roi: roiValue,
          ticketMedio
        });
        
        // Salvar no Firebase
        if (selectedProduct && selectedMonth) {
          // CORREÇÃO: Incluir o cliente selecionado ao salvar
          const selectedClient = localStorage.getItem('selectedClient') || 'Cliente Padrão';
          
          console.log('🔍 DEBUG - MonthlyDetailsTable - Salvando dados FINAIS:', {
            month: selectedMonth,
            product: selectedProduct,
            client: selectedClient,
            agendamentos: agendamentos,
            vendas: vendas,
            ticketMedio: ticketMedio,
            cpv: cpv,
            roi: roiValue
          });
          
          metricsService.saveMonthlyDetails({
            month: selectedMonth,
            product: selectedProduct,
            client: selectedClient, // Adicionar cliente
            agendamentos: agendamentos,
            vendas: vendas,
            ticketMedio: ticketMedio,
            cpv: cpv,
            roi: roiValue
          }).catch(error => {
            console.error('Erro ao salvar valores de agendamentos/vendas:', error);
          });
        }
        
        // Notificar componente pai (valores agora vêm dos públicos)
        if (onValuesChange) {
          onValuesChange({ agendamentos, vendas });
        }
      }
      
      setEditingCell(null);
      setEditValue('');
      setEditRawValue('');
      setEditRawPercent('');
    }
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
    setEditRawValue('');
    setEditRawPercent('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-500';
      case 'down': return 'text-red-500';
      case 'neutral': return 'text-yellow-500';
      case 'yellow': return 'text-yellow-500';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <TrendingUp className={`w-4 h-4 ${getStatusColor(status)}`} />;
      case 'down': return <TrendingDown className={`w-4 h-4 ${getStatusColor(status)}`} />;
      case 'neutral': return <Minus className={`w-4 h-4 ${getStatusColor(status)}`} />;
      case 'yellow': return <Minus className={`w-4 h-4 ${getStatusColor(status)}`} />;
      default: return null;
    }
  };

  // Função para obter o estado automático de um campo benchmark
  const getBenchmarkAutoState = (metric: string): boolean => {
    switch (metric) {
      case 'Investimento pretendido (Mês)':
        return benchmarkAuto.investimento;
      case 'CPM':
        return benchmarkAuto.cpm;
      case 'CPC':
        return benchmarkAuto.cpc;
      case 'CTR':
        return benchmarkAuto.ctr;
      case 'Tx. Mensagens (Leads/Cliques)':
        return benchmarkAuto.txMensagens;
      case 'Tx. Agendamento (Agend./Leads)':
        return benchmarkAuto.txAgendamento;
      case 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)':
        return benchmarkAuto.txConversaoVendas;
      default:
        return true;
    }
  };

  // Função para alternar o estado automático de um campo benchmark
  const toggleBenchmarkAuto = (metric: string) => {
    setBenchmarkAuto(prev => {
      const newState = { ...prev };
      switch (metric) {
        case 'Investimento pretendido (Mês)':
          newState.investimento = !prev.investimento;
          break;
        case 'CPM':
          newState.cpm = !prev.cpm;
          break;
        case 'CPC':
          newState.cpc = !prev.cpc;
          break;
        case 'CTR':
          newState.ctr = !prev.ctr;
          break;
        case 'Tx. Mensagens (Leads/Cliques)':
          newState.txMensagens = !prev.txMensagens;
          break;
        case 'Tx. Agendamento (Agend./Leads)':
          newState.txAgendamento = !prev.txAgendamento;
          break;
        case 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)':
          newState.txConversaoVendas = !prev.txConversaoVendas;
          break;
      }
      return newState;
    });
  };

  // Salvar estados automáticos dos campos benchmark quando mudarem
  useEffect(() => {
    if (selectedProduct && selectedMonth) {
      // CORREÇÃO: Incluir cliente na chave para vincular ao período específico
    const clientForToggle = localStorage.getItem('selectedClient') || 'Cliente Padrão';
    const autoStatesKey = `benchmark_auto_${clientForToggle}_${selectedProduct}_${selectedMonth}`;
      localStorage.setItem(autoStatesKey, JSON.stringify(benchmarkAuto));
      console.log('Estados automáticos de benchmark salvos:', benchmarkAuto);

      // Persistir também no Firestore (best-effort) sem alterar a lógica da UI
      try {
        const { authService } = require('../services/authService');
        const { db } = require('../config/firebase');
        const { doc, setDoc } = require('firebase/firestore');
        const user = authService.getCurrentUser?.();
        if (user) {
          const key = `${(clientForToggle||'').toLowerCase().replace(/[^a-z0-9_\-]/g,'_')}|${(selectedProduct||'').toLowerCase().replace(/[^a-z0-9_\-]/g,'_')}|${(selectedMonth||'').toLowerCase().replace(/[^a-z0-9_\-]/g,'_')}`;
          const ref = doc(db, 'users', user.uid, 'monthlyBenchmarks', key);
          setDoc(ref, { autoStates: benchmarkAuto }, { merge: true });
        }
      } catch {}
    }
  }, [benchmarkAuto, selectedProduct, selectedMonth]);

  // Função para obter tooltip de cada métrica
  const getMetricTooltip = (metric: string): string => {
    const tooltips: { [key: string]: string } = {
      'Investimento pretendido (Mês)': 'Valor que você planeja investir no mês em anúncios',
      'CPM': 'Custo por mil impressões. Quanto você paga para mostrar seu anúncio 1000 vezes',
      'Impressões': 'Número total de vezes que seu anúncio foi exibido para pessoas',
      'CPC': 'Custo por clique. Quanto você paga cada vez que alguém clica no seu anúncio',
      'Cliques': 'Número de vezes que pessoas clicaram no seu anúncio',
      'CTR': 'Taxa de cliques. Porcentagem de pessoas que clicaram no seu anúncio',
      'Leads / Msgs': 'Número de pessoas que enviaram mensagem ou se interessaram pelo seu produto',
      'Tx. Mensagens (Leads/Cliques)': 'Porcentagem de pessoas que clicaram e depois enviaram mensagem',
      'CPL (Custo por Lead)': 'Quanto você gasta para conseguir cada pessoa interessada',
      'Agendamentos': 'Número de consultas ou reuniões agendadas com clientes',
      'Tx. Agendamento (Agend./Leads)': 'Porcentagem de leads que viraram agendamentos',
      'Vendas': 'Número total de vendas realizadas através dos anúncios',
      'Tx. Conversão Vendas (Vendas/Leads ou Agend.)': 'Porcentagem de leads (venda direta) ou agendamentos (consultoria/demo) que viraram vendas',
      'CPV (Custo por Venda)': 'Quanto você gasta para conseguir cada venda',
      'Lucro': 'Receita total menos o investimento em anúncios',
      'ROI / ROAS': 'Retorno sobre investimento / Return on Ad Spend. Quanto você ganha de volta para cada real investido'
    };
    return tooltips[metric] || 'Informação sobre esta métrica';
  };

  // Agrupar dados por categoria
  const groupedData = tableData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, TableRow[]>);

  // Função para calcular o status baseado na comparação entre valores reais e benchmarks
  const calculateStatus = (metric: string, realValue: string, benchmark: string): { status: string; statusColor: string } => {
    // CORREÇÃO: Tratamento especial para CPV quando valor real é EXATAMENTE R$ 0,00
    if (metric === 'CPV (Custo por Venda)' && realValue === 'R$ 0,00') {
      return { status: '-', statusColor: 'yellow' };
    }

    // Campos que não devem ter status (mantêm "-")
    const noStatusFields = [
      'Investimento pretendido (Mês)',
      'Impressões',
      'Cliques',
      'Leads / Msgs',
      'Agendamentos',
      'Vendas'
    ];

    if (noStatusFields.includes(metric)) {
      return { status: '', statusColor: 'neutral' };
    }

    // Extrair valores numéricos baseado no tipo de campo
    let realNum = 0;
    let benchmarkNum = 0;

    // Para valores monetários (CPM, CPC, CPL, CPV)
    if (metric.includes('CPM') || metric.includes('CPC') || metric.includes('CPL') || metric.includes('CPV')) {
      realNum = parseCurrency(realValue);
      benchmarkNum = parseCurrency(benchmark);
    }
    // Para porcentagens (CTR, Tx. Mensagens, Tx. Agendamento, Tx. Conversão Vendas, ROI)
    else if (metric.includes('CTR') || metric.includes('Tx.') || metric.includes('ROI')) {
      realNum = parseNumber(realValue.replace('%', '').replace('(', '').replace(')', '').replace('x', ''));
      benchmarkNum = parseNumber(benchmark.replace('%', '').replace('(', '').replace(')', '').replace('x', ''));
    }
    // Para outros valores numéricos
    else {
      realNum = parseNumber(realValue);
      benchmarkNum = parseNumber(benchmark);
    }

    // Se não conseguiu extrair valores válidos
    if (isNaN(realNum) || isNaN(benchmarkNum) || benchmarkNum === 0) {
      return { status: '', statusColor: 'neutral' };
    }

    // Calcular diferença percentual
    const difference = ((realNum - benchmarkNum) / benchmarkNum) * 100;

    // CORREÇÃO: Para custos (CPM, CPC, CPL, CPV), quanto mais baixo, melhor
    const isCostMetric = metric.includes('CPM') || metric.includes('CPC') || metric.includes('CPL') || metric.includes('CPV');
    
    // Se é métrica de custo, inverter a lógica (diferença negativa = bom)
    const effectiveDifference = isCostMetric ? -difference : difference;

    // Definir status baseado na diferença efetiva
    if (effectiveDifference >= 20) {
      return { status: 'Excelente (acima da meta)', statusColor: 'up' };
    } else if (effectiveDifference >= 10) {
      return { status: 'Bom (acima da meta)', statusColor: 'up' };
    } else if (effectiveDifference >= 5) {
      return { status: 'Levemente acima da meta', statusColor: 'up' };
    } else if (effectiveDifference >= -5) {
      return { status: 'Dentro da meta', statusColor: 'neutral' };
    } else if (effectiveDifference >= -10) {
      return { status: 'Levemente abaixo da meta', statusColor: 'down' };
    } else if (effectiveDifference >= -20) {
      return { status: 'Abaixo da meta', statusColor: 'down' };
    } else {
      return { status: 'Muito abaixo da meta', statusColor: 'down' };
    }
  };

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-600 shadow-xl">
      <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Detalhes Mensais</h2>
            <p className="text-slate-400 text-sm">{selectedMonth}</p>
            {selectedProduct && (
              <div className="flex items-center mt-2 space-x-2">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <p className="text-sm text-emerald-400 font-medium">
                  Produto: {selectedProduct}
                </p>
              </div>
            )}
            {metrics.length > 0 && (
              <div className="flex items-center mt-1 space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <p className="text-sm text-blue-400 font-medium">
                  ✓ {metrics.length} registros sincronizados do Meta Ads
                </p>
              </div>
            )}
          </div>
          <div className={`relative rounded-xl p-4 border backdrop-blur-sm transition-all duration-300 ${
            isEditingTicket 
              ? 'bg-indigo-900/40 border-indigo-400/60 shadow-lg shadow-indigo-500/10' 
              : 'bg-slate-800/80 border-slate-600/50 hover:bg-slate-800/90 hover:border-slate-500/60'
          }`}>
              <div className="text-sm text-slate-400 font-medium mb-2">Ticket Médio (Bench)</div>
              
              {isEditingTicket ? (
                <input
                  type="text"
                  value={ticketEditValue}
                  onChange={handleTicketInputChange}
                  onKeyDown={handleTicketKeyPress}
                  onBlur={handleTicketSave}
                  className="w-full bg-transparent text-slate-100 border-none outline-none text-lg font-semibold"
                  placeholder="R$ 0,00"
                  autoFocus
                />
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-100 font-bold text-xl">
                    {formatCurrency(ticketMedio)}
                  </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTicketClick();
                  }}
                  className="inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200 bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-500/30"
                  title="Editar ticket médio"
                >
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-2/5 border-r border-slate-600/50">Métrica</th>
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-1/5 border-r border-slate-600/50">Benchmark/Projeção</th>
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-1/5 border-r border-slate-600/50">Valores Reais</th>
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-1/5">Status vs Benchmark</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedData).map(([category, items]) => (
              <React.Fragment key={category}>
                {/* Linha de categoria */}
                <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-800/40 via-slate-700/30 to-slate-800/40">
                  <td className="p-3 text-slate-400 font-medium text-sm" colSpan={4}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-slate-500 rounded-full mr-3"></div>
                      <span className="text-slate-400 font-medium tracking-wide uppercase text-xs">
                        {category}
                      </span>
                      <div className="ml-3 flex-1 h-px bg-slate-600/30"></div>
                    </div>
                  </td>
                </tr>
                {/* Itens da categoria */}
                {items.map((row, index) => {
                  const globalIndex = tableData.findIndex(item => 
                    item.category === category && item.metric === row.metric
                  );
                  
                  const isLastItem = index === items.length - 1;
                  const isLastCategory = Object.keys(groupedData).indexOf(category) === Object.keys(groupedData).length - 1;
                  
                  return (
                    <tr key={`${category}-${index}`} className={`hover:bg-slate-800/40 transition-all duration-200 ${
                      isLastItem && isLastCategory ? '' : 'border-b border-slate-700/30'
                    }`}>
                      <td className="p-5 text-slate-200 font-medium w-2/5 border-r border-slate-600/50">
                        <div className="flex items-center space-x-2">
                          <span>{row.metric}</span>
                          <Tooltip content={getMetricTooltip(row.metric)} isVisible={tooltipStates[`${category}-${index}`] || false} position="right">
                            <div
                              className="cursor-default group/tooltip"
                              onMouseEnter={() => setTooltipStates(prev => ({ ...prev, [`${category}-${index}`]: true }))}
                              onMouseLeave={() => setTooltipStates(prev => ({ ...prev, [`${category}-${index}`]: false }))}
                            >
                              <Info className="w-3 h-3 text-slate-400 group-hover/tooltip:text-red-400 transition-all duration-200 group-hover/tooltip:scale-110" />
                            </div>
                          </Tooltip>
                        </div>
                      </td>
                      
                      {/* Célula Benchmark editável */}
                      <td 
                        className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 border-l-4 border-purple-400 ${
                          row.benchmarkEditable 
                            ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'benchmark'
                              ? 'bg-indigo-900/40 cursor-pointer transition-all duration-200 shadow-sm'
                              : getBenchmarkAutoState(row.metric)
                                ? 'bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-all duration-200'
                                : 'bg-slate-700/60 cursor-pointer hover:bg-slate-700/80 transition-all duration-200'
                            : 'bg-slate-800/40'
                        }`}
                        onClick={() => handleCellClick(globalIndex, 'benchmark', row.benchmark)}
                        onMouseEnter={() => row.benchmarkEditable && setIsHovered({rowIndex: globalIndex, field: 'benchmark'})}
                        onMouseLeave={() => setIsHovered(null)}
                      >
                        {editingCell?.rowIndex === globalIndex && editingCell?.field === 'benchmark' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            onBlur={handleSave}
                            className="w-full bg-transparent text-slate-100 border-none outline-none text-base font-semibold text-left"
                            autoFocus
                            placeholder={getPlaceholder(row.metric, 'benchmark')}
                            ref={inputRef}
                          />
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-base font-semibold text-slate-100">{row.benchmark}</span>
                            <div className="flex items-center space-x-2">
                              {!row.benchmarkEditable && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-purple-400 font-medium">Projeção</span>
                                </div>
                              )}
                              {row.benchmarkEditable && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCellClick(globalIndex, 'benchmark', row.benchmark);
                                    }}
                                    className={`inline-flex items-center justify-center rounded-full p-1.5 transition-all duration-200 ${
                                      getBenchmarkAutoState(row.metric)
                                        ? 'bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30' 
                                        : 'bg-indigo-900/40 hover:bg-indigo-800/50 border border-indigo-500/30'
                                    }`}
                                    title={getBenchmarkAutoState(row.metric) ? 'Usando valores da IA (clique para editar manualmente)' : 'Editando manualmente (clique para usar valores da IA)'}
                                  >
                                    {getBenchmarkAutoState(row.metric) ? <Edit3 className="w-4 h-4 text-purple-400" /> : <TrendingUp className="w-4 h-4 text-indigo-400" />}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </td>
                      
                      {/* Célula Valores Reais editável */}
                      <td 
                        className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 ${
                          row.realValueEditable 
                            ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'realValue'
                              ? 'bg-emerald-900/40 cursor-pointer transition-all duration-200 border-l-4 border-emerald-400 shadow-sm'
                              : 'bg-slate-700/60 cursor-pointer hover:bg-emerald-900/30 transition-all duration-200 border-l-4 border-transparent hover:border-emerald-400/60'
                            : 'bg-slate-800/40 border-l-4 border-blue-500/30'
                        }`}
                        onClick={row.realValueEditable ? () => handleCellClick(globalIndex, 'realValue', row.realValue) : undefined}
                        onMouseEnter={row.realValueEditable ? () => setIsHovered({rowIndex: globalIndex, field: 'realValue'}) : undefined}
                        onMouseLeave={row.realValueEditable ? () => setIsHovered(null) : undefined}
                      >
                        {editingCell?.rowIndex === globalIndex && editingCell?.field === 'realValue' ? (
                          <input
                            type="text"
                            value={editValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyPress}
                            onBlur={handleSave}
                            className="w-full bg-transparent text-slate-100 border-none outline-none text-base font-semibold text-left"
                            autoFocus
                            placeholder={getPlaceholder(row.metric, 'realValue')}
                            ref={inputRef}
                          />
                        ) : (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-base font-semibold text-slate-100">{row.realValue}</span>
                            <div className="flex items-center space-x-2">
                              {!row.realValueEditable && (
                                <div className="flex items-center space-x-1">
                                  <span className="text-xs text-blue-400 font-medium">Sincronizado</span>
                                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      </td>
                      
                      {/* Célula Status */}
                      <td className="p-5 w-1/5 text-left">
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-slate-300 font-medium">{row.status}</span>
                          <div className="flex items-center">
                            {getStatusIcon(row.statusColor)}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MonthlyDetailsTable;