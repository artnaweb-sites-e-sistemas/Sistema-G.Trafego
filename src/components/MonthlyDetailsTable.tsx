import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Minus, Edit3, Check, X, Info, Download, RefreshCw } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';



interface MonthlyDetailsTableProps {
  metrics: MetricData[];
  selectedProduct?: string;
  selectedClient?: string;
  selectedMonth?: string;
  onValuesChange?: (values: { agendamentos: number; vendas: number }) => void;

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
  metrics = [], 
  selectedProduct = '',
  selectedClient = '',
  selectedMonth = 'Janeiro 2025',
  onValuesChange,

}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});

  // Controle para campos benchmark editáveis (automático vs manual)
  const [benchmarkAuto, setBenchmarkAuto] = useState({
    investimento: true,
    cpm: true,
    cpc: true,
    txMensagens: true,
    txAgendamento: true,
    txConversaoVendas: true
  });



  // Função para salvar valores de benchmark no Firebase
  const saveBenchmarkValues = async (data: any[]) => {
    // 🎯 PROTEÇÃO: Não salvar durante carregamento
    if (!benchmarkLoadCompleted) {
      
      return;
    }
    
    if (selectedProduct && selectedMonth && selectedClient) {
      // 🎯 DEBOUNCE: Cancelar salvamento anterior se ainda estiver em andamento
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      
      // Rate limit removido - salvar imediatamente
      (async () => {
        if (isSaving) {
          
          return;
        }
        
        setIsSaving(true);
        
        
        const benchmarkValues: { [key: string]: string } = {};
        
        data.forEach(row => {
          // 🎯 CORREÇÃO: Salvar todos os valores válidos, incluindo '0'
          if (row.benchmark && 
              row.benchmark !== '--' && 
              row.benchmark !== 'R$ 0,00' &&
              !row.benchmark.toString().includes('NaN') &&
              row.benchmark.toString().trim() !== '') {
            benchmarkValues[row.metric] = row.benchmark;
            
          }
        });
        
        // 🎯 INCLUIR TICKET MÉDIO nos benchmarks salvos
        if (ticketMedio && ticketMedio !== 250) {
          benchmarkValues['Ticket Médio (Bench)'] = formatCurrency(ticketMedio);
          
        }
        
        // 🎯 PROTEÇÃO: Não salvar se não há dados válidos
        if (Object.keys(benchmarkValues).length === 0) {
          
          return;
        }
        
        
        
        try {
          await metricsService.saveBenchmarkValues({
            month: selectedMonth,
            product: selectedProduct,
            client: selectedClient,
            benchmarks: benchmarkValues
          });
          
          
          
          // Manter backup no localStorage para casos de falha de rede
          const storageKey = `benchmark_${selectedClient}_${selectedProduct}_${selectedMonth}`;
          localStorage.setItem(storageKey, JSON.stringify(benchmarkValues));
          
          
        } catch (error) {
          console.error('❌ Erro ao salvar benchmarks no Firebase, mantendo apenas localStorage:', error);
          // Fallback para localStorage se Firebase falhar
          const storageKey = `benchmark_${selectedClient}_${selectedProduct}_${selectedMonth}`;
          localStorage.setItem(storageKey, JSON.stringify(benchmarkValues));
          
        } finally {
          setIsSaving(false);
        }
      })();
      
      setSaveTimeout(null);
    }
  };

  // Função para carregar valores de benchmark salvos (Firebase + localStorage fallback)
  const loadBenchmarkValues = async () => {
    if (selectedProduct && selectedMonth && selectedClient) {
      
      
      try {
        // Tentar carregar do Firebase primeiro
        const benchmarkValues = await metricsService.getBenchmarkValues(
          selectedMonth,
          selectedProduct,
          selectedClient
        );
        
        
        
        // Se tiver dados no Firebase, usar eles
        if (Object.keys(benchmarkValues).length > 0) {
          
          
          // 🎯 CARREGAR TICKET MÉDIO dos benchmarks salvos (LÓGICA QUE FUNCIONA)
          const ticketMedioBenchmark = benchmarkValues['Ticket Médio (Bench)'];
          if (ticketMedioBenchmark) {
            const ticketValue = parseCurrency(ticketMedioBenchmark);
            if (ticketValue > 0 && ticketValue !== 250) {
              
              setTicketMedio(ticketValue);
              setTicketMedioEditedByUser(true); // Marcar como editado para não sobrescrever
            }
          }
          
          setTableData(prevData => {
            
            
            const updatedData = prevData.map(row => {
              const benchmarkValue = benchmarkValues[row.metric];
              
              // 🎯 CORREÇÃO: Carregar todos os valores válidos, incluindo '0'
              if (benchmarkValue && 
                  benchmarkValue !== 'R$0,00' &&
                  !benchmarkValue.toString().includes('NaN') &&
                  benchmarkValue.toString().trim() !== '') {
                
                
                // 🎯 MARCAR COMO EDITADO PELO USUÁRIO (igual ao Ticket Médio)
                setBenchmarkFieldsEditedByUser(prev => ({
                  ...prev,
                  [row.metric]: true
                }));
                
                return { ...row, benchmark: benchmarkValue };
              }
              return row;
            });
            
            
            
            // 🎯 MARCAR QUE O CARREGAMENTO TERMINOU
            setBenchmarkLoadCompleted(true);
            
            
            // 🎯 CORREÇÃO: Não recalcular automaticamente após carregar valores salvos
            // Preservar valores da coluna Benchmark/Projeção que foram carregados
            return updatedData;
          });
        } else {
          // Fallback para localStorage se não há dados no Firebase
          const storageKey = `benchmark_${selectedClient}_${selectedProduct}_${selectedMonth}`;
          const savedBenchmarks = localStorage.getItem(storageKey);
          
          if (savedBenchmarks) {
            try {
              const localBenchmarkValues = JSON.parse(savedBenchmarks);
              
              // 🎯 CARREGAR TICKET MÉDIO do localStorage
              const ticketMedioBenchmark = localBenchmarkValues['Ticket Médio (Bench)'];
              if (ticketMedioBenchmark) {
                const ticketValue = parseCurrency(ticketMedioBenchmark);
                if (ticketValue > 0 && ticketValue !== 250) {
                  setTicketMedio(ticketValue);
                  setTicketMedioEditedByUser(true); // Marcar como editado para não sobrescrever
                }
              }
              
              setTableData(prevData => {
                const updatedData = prevData.map(row => {
                  const benchmarkValue = localBenchmarkValues[row.metric];

                  if (benchmarkValue && 
                      benchmarkValue !== 'R$0,00' &&
                      !benchmarkValue.toString().includes('NaN') &&
                      benchmarkValue.toString().trim() !== '') {
                    
                    
                    // 🎯 MARCAR COMO EDITADO PELO USUÁRIO (igual ao Ticket Médio)
                    setBenchmarkFieldsEditedByUser(prev => ({
                      ...prev,
                      [row.metric]: true
                    }));
                    
                    return { ...row, benchmark: benchmarkValue };
                  }
                  return row;
                });
                
                // 🎯 CORREÇÃO: Não recalcular automaticamente após carregar valores salvos
                return updatedData;
              });
            } catch (error) {
              console.error('Erro ao carregar benchmarks do localStorage:', error);
            }
          }
        }
        
      } catch (error) {
        console.error('Erro ao carregar benchmarks do Firebase:', error);
        // Fallback completo para localStorage
        const storageKey = `benchmark_${selectedClient}_${selectedProduct}_${selectedMonth}`;
        const savedBenchmarks = localStorage.getItem(storageKey);
        
        if (savedBenchmarks) {
          try {
            const localBenchmarkValues = JSON.parse(savedBenchmarks);
            
            // 🎯 CARREGAR TICKET MÉDIO do localStorage (fallback completo)
            const ticketMedioBenchmark = localBenchmarkValues['Ticket Médio (Bench)'];
            if (ticketMedioBenchmark) {
              const ticketValue = parseCurrency(ticketMedioBenchmark);
              if (ticketValue > 0 && ticketValue !== 250) {
                setTicketMedio(ticketValue);
                setTicketMedioEditedByUser(true); // Marcar como editado para não sobrescrever
              }
            }
            
            setTableData(prevData => {
              const updatedData = prevData.map(row => {
                const benchmarkValue = localBenchmarkValues[row.metric];

                if (benchmarkValue && 
                    benchmarkValue !== '0' && 
                    benchmarkValue !== 'R$0,00' &&
                    !benchmarkValue.toString().includes('NaN') &&
                    benchmarkValue.toString().trim() !== '') {
                  
                  
                  // 🎯 MARCAR COMO EDITADO PELO USUÁRIO (igual ao Ticket Médio)
                  setBenchmarkFieldsEditedByUser(prev => ({
                    ...prev,
                    [row.metric]: true
                  }));
                  
                  return { ...row, benchmark: benchmarkValue };
                }
                return row;
              });
              
              // 🎯 MARCAR QUE O CARREGAMENTO TERMINOU
              setBenchmarkLoadCompleted(true);
              
              
              // 🎯 CORREÇÃO: Não recalcular automaticamente após carregar valores salvos
              return updatedData;
            });
          } catch (error) {
            console.error('Erro ao carregar benchmarks do localStorage:', error);
          }
        }
      }

      // Carregar estados automáticos dos campos benchmark (mantém localStorage)
      const autoStatesKey = `benchmark_auto_${selectedClient}_${selectedProduct}_${selectedMonth}`;
      const savedAutoStates = localStorage.getItem(autoStatesKey);
      
      if (savedAutoStates) {
        try {
          const autoStates = JSON.parse(savedAutoStates);
          setBenchmarkAuto(autoStates);
        } catch (error) {
          console.error('Erro ao carregar estados automáticos de benchmark:', error);
        }
      }
    }
  };

  // Carregar valores salvos quando parâmetros mudarem
  useEffect(() => {
    
    
    // 🎯 RESETAR FLAGS QUANDO PARÂMETROS MUDAREM
    setBenchmarkLoadCompleted(false);
    setBenchmarkFieldsEditedByUser({});
    
    if (selectedProduct && selectedMonth && selectedClient) {
      
      
      // Aguardar um pouco para garantir que a tabela foi inicializada
      // Rate limit removido - executar imediatamente
    (async () => {
        
        await loadBenchmarkValues();
      })();
    } else {
      
    }
  }, [selectedProduct, selectedMonth, selectedClient]);

  // 🎯 CLEANUP: Limpar timeout quando componente for desmontado
  useEffect(() => {
    return () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
    };
  }, []);

  // 🎯 NOVO USE_EFFECT: Forçar sincronização do Meta Ads quando carregamento terminar
  useEffect(() => {
    if (benchmarkLoadCompleted && selectedProduct && selectedMonth && selectedClient) {
      
      
      // Rate limit removido - executar imediatamente
      // A sincronização será executada automaticamente pelo useEffect que depende de metrics
    }
  }, [selectedProduct, selectedMonth, selectedClient]);

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

  const formatNumber = (value: number) => {
    // Garantir que o valor é um número válido
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return '0';
    }
    
    // 🎯 CORREÇÃO: Garantir que números grandes sejam formatados corretamente
    // Para números grandes (como impressões), usar formatação brasileira com separadores
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      useGrouping: true
    }).format(numValue);
  };

  const parseCurrency = (value: string): number => {
    if (!value || typeof value !== 'string') return 0;
    
    // 🎯 CORREÇÃO: Usar a mesma lógica do parseNumber para formato brasileiro
    let cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // 🎯 LÓGICA BRASILEIRA: 
    // No Brasil, ponto é SEMPRE separador de milhares, vírgula é separador decimal
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      // Ex: "R$ 2.246,50" -> 2246.50 (ponto é milhares, vírgula é decimal)
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
      // Ex: "R$ 2.246" -> 2246 (ponto é separador de milhares)
      cleanValue = cleanValue.replace(/\./g, '');
    } else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      // Ex: "R$ 2,5" -> 2.5 (vírgula é separador decimal)
      cleanValue = cleanValue.replace(',', '.');
    }
    
    const result = parseFloat(cleanValue);
    return isNaN(result) ? 0 : result;
  };

  const parseNumber = (value: string): number => {
    if (!value || typeof value !== 'string') return 0;
    
    // 🎯 CORREÇÃO ESPECÍFICA: Lidar com formato brasileiro
    // Remover símbolos de moeda, espaços e outros caracteres
    let cleanValue = value.replace(/[^\d,.-]/g, '');
    
    // 🎯 LÓGICA BRASILEIRA: 
    // No Brasil, ponto é SEMPRE separador de milhares, vírgula é separador decimal
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      // Ex: "2.246,50" -> 2246.50 (ponto é milhares, vírgula é decimal)
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
      // Ex: "2.246" -> 2246 (ponto é separador de milhares)
      // Ex: "1.500" -> 1500 (ponto é separador de milhares)
      cleanValue = cleanValue.replace(/\./g, '');
    } else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      // Ex: "2,5" -> 2.5 (vírgula é separador decimal)
      cleanValue = cleanValue.replace(',', '.');
    }
    
    const result = parseFloat(cleanValue);
    return isNaN(result) ? 0 : result;
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

  // Função específica para parsear porcentagens (CTR, Tx. Mensagens, etc.)
  const parsePercentage = (value: string): number => {
    if (!value || typeof value !== 'string') return 0;
    
    // Remover o símbolo % e espaços
    let cleanValue = value.replace(/%/g, '').trim();
    
    // Se tem vírgula, substituir por ponto (formato brasileiro)
    if (cleanValue.includes(',')) {
      cleanValue = cleanValue.replace(',', '.');
    }
    
    const result = parseFloat(cleanValue);
    return isNaN(result) ? 0 : result;
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
  const [ticketMedioEditedByUser, setTicketMedioEditedByUser] = useState(false);
  
  // 🎯 NOVA LÓGICA: Flag para controlar quando o carregamento terminou
  const [benchmarkLoadCompleted, setBenchmarkLoadCompleted] = useState(false);
  
  // 🎯 NOVA LÓGICA: Sistema de flags para marcar campos editados pelo usuário (igual ao Ticket Médio)
  const [benchmarkFieldsEditedByUser, setBenchmarkFieldsEditedByUser] = useState<{ [key: string]: boolean }>({}); // Flag para detectar edição manual
  
  // 🎯 NOVA LÓGICA: Debounce para evitar múltiplas execuções
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
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
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Visitantes na página (LPV)',
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Leads / Msgs',
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Tx. Mensagens (Leads/Cliques)',
      benchmark: '40,00%', // Taxa padrão: 40% dos cliques convertem em leads
      realValue: '0,00%',
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
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
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
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
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

  // 🎯 NOVO: Estado para controlar se a linha de Agendamentos está ativa
  const [agendamentosEnabled, setAgendamentosEnabled] = useState(() => {
    // 🎯 NOVO: Carregar estado do localStorage ou usar true como padrão
    const saved = localStorage.getItem('agendamentosEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

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
  const [lastNotifiedValues, setLastNotifiedValues] = useState({ agendamentos: 0, vendas: 0 });
  
  // Estado para armazenar dados editáveis salvos
  const [savedDetails, setSavedDetails] = useState({ agendamentos: 0, vendas: 0, ticketMedio: 0, cpv: 0, roi: '0% (0.0x)' });

  // Estado para armazenar dados calculados dos públicos
  const [audienceCalculatedValues, setAudienceCalculatedValues] = useState({ agendamentos: 0, vendas: 0 });

  // 🎯 NOVO: Estado para controle de atualização dos valores reais
  const [isRefreshingRealValues, setIsRefreshingRealValues] = useState(false);

  // Carregar dados dos públicos para o produto selecionado  
  const loadAudienceData = useCallback(async (forceRefresh: boolean = false) => {
    if (selectedProduct && selectedProduct !== 'Todos os Produtos' && selectedMonth) {
      try {
        if (forceRefresh) {
          setIsRefreshingRealValues(true);
        }
        
        // 🎯 CORREÇÃO: Buscar dados diretamente sem filtrar por valores zero
        const audienceDetails = await metricsService.getAllAudienceDetailsForProduct(
          selectedMonth,
          selectedProduct,
          forceRefresh // 🎯 NOVO: Passar parâmetro forceRefresh
        );
        
        
        
        // 🎯 CORREÇÃO: Calcular totais considerando TODOS os registros, incluindo zeros
        let totalAgendamentos = 0;
        let totalVendas = 0;
        
        audienceDetails.forEach((detail: any) => {
          const agendamentos = Number(detail.agendamentos) || 0;
          const vendas = Number(detail.vendas) || 0;
          
          
          
          totalAgendamentos += agendamentos;
          totalVendas += vendas;
        });
        
        
        
        
        
        setAudienceCalculatedValues({
          agendamentos: totalAgendamentos,
          vendas: totalVendas
        });
      } catch (error) {
        console.error('🔍 DEBUG - MonthlyDetailsTable - Erro ao carregar dados dos públicos:', error);
        setAudienceCalculatedValues({ agendamentos: 0, vendas: 0 });
      } finally {
        if (forceRefresh) {
          setIsRefreshingRealValues(false);
        }
      }
    } else {
      
      setAudienceCalculatedValues({ agendamentos: 0, vendas: 0 });
    }
  }, [selectedProduct, selectedMonth]);

  // 🎯 NOVA FUNÇÃO: Atualizar valores reais manualmente
  const handleRefreshRealValues = async () => {
    await loadAudienceData(true);
  };

  // Listener direto para mudanças nos detalhes dos públicos (comunicação mais rápida)
  useEffect(() => {
    const handleAudienceDetailsSaved = (event: CustomEvent) => {
      
      
      if (event.detail && 
          event.detail.month === selectedMonth && 
          event.detail.product === selectedProduct) {
        
        
        // Recarregar todos os valores dos públicos para o mês/produto atual
        // (garante que todos os públicos sejam considerados, não apenas o editado)
        loadAudienceData(false);
      } else {
        
      }
    };

    window.addEventListener('audienceDetailsSaved', handleAudienceDetailsSaved as EventListener);
    
    return () => {
      window.removeEventListener('audienceDetailsSaved', handleAudienceDetailsSaved as EventListener);
    };
  }, [selectedMonth, selectedProduct, loadAudienceData]);

  // Carregar dados salvos do Firebase quando produto ou mês mudar
  useEffect(() => {
    const loadSavedDetails = async () => {
      // Reset do estado inicial ao mudar seleção
      setHasInitialLoad(false);
      
      if (selectedProduct && selectedMonth) {
        try {
          
          const details = await metricsService.getMonthlyDetails(
            selectedMonth,
            selectedProduct,
            selectedClient
          );
          
          // CORREÇÃO: Garantir que sempre tenham valores válidos
          setSavedDetails({
            agendamentos: details.agendamentos || 0,
            vendas: details.vendas || 0,
            ticketMedio: details.ticketMedio || 250,
            cpv: (details as any).cpv || 0,
            roi: (details as any).roi || '0% (0.0x)'
          });
          
          
          
          // CORREÇÃO: Aplicar valores salvos de CPV e ROI ao tableData
          if ((details as any).cpv !== undefined || (details as any).roi !== undefined) {
            setTableData(prevData => {
              const newData = prevData.map(row => {
                const newRow = { ...row };
                
                // Aplicar CPV salvo se existir
                if ((row.metric === 'CPV' || row.metric === 'CPV (Custo por Venda)') && (details as any).cpv !== undefined) {
                  
                  newRow.realValue = formatCurrency((details as any).cpv);
                }
                
                // Aplicar ROI salvo se existir
                if ((row.metric === 'ROI' || row.metric === 'ROI/ROAS' || row.metric === 'ROI / ROAS') && (details as any).roi !== undefined) {
                  
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
          
          
          // Log específico para encontrar campos CPV e ROI
          const cpvFields = tableData.filter(row => row.metric.toLowerCase().includes('cpv'));
          const roiFields = tableData.filter(row => row.metric.toLowerCase().includes('roi') || row.metric.toLowerCase().includes('roas'));
          
          
          
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

  // 🎯 CORREÇÃO: Carregar públicos APÓS savedDetails estar carregado
  useEffect(() => {
    // Só carregar públicos se savedDetails já foi carregado (incluindo primeira vez)
    if (selectedProduct && selectedMonth) {
      
      
                      loadAudienceData(false);
      
              // Rate limit removido - sem cleanup
    }
  }, [selectedProduct, selectedMonth, savedDetails.ticketMedio]); // Depender de savedDetails.ticketMedio como indicador de carregamento

  // 🎯 CORREÇÃO: Recarregamento inteligente no visibilitychange - só se necessário
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && selectedProduct && selectedMonth) {
        
        
        // Verificar se os dados estão vazios/incorretos antes de recarregar
        const needsReload = audienceCalculatedValues.agendamentos === 0 && 
                           audienceCalculatedValues.vendas === 0 &&
                           selectedProduct !== 'Todos os Produtos';
        
        if (needsReload) {
          
          loadAudienceData(false);
        } else {
          
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [selectedMonth, selectedProduct, audienceCalculatedValues, loadAudienceData]);



  // Atualizar valores na tabela quando dados calculados dos públicos mudarem (reativo)
  useEffect(() => {
    
    
    // 🎯 CORREÇÃO: Só aguardar carregamento na primeira vez, não quando usuário edita
    const isInitialLoad = !ticketMedioEditedByUser && 
                         ticketMedio === 250 && 
                         savedDetails.ticketMedio > 0 && 
                         savedDetails.ticketMedio !== 250;
    
    if (isInitialLoad) {
      
      return; // Só bloquear na primeira carga, não quando usuário edita
    }
    
    
    
    setTableData(prevData => {
      const newData = prevData.map(row => {
        const newRow = { ...row };
        
        if (row.metric === 'Agendamentos') {
          const newValue = formatNumber(audienceCalculatedValues.agendamentos);
          
          newRow.realValue = newValue;
        }
        
        if (row.metric === 'Vendas') {
          const newValue = formatNumber(audienceCalculatedValues.vendas);
          
          newRow.realValue = newValue;
        }
        
        // CORREÇÃO: Preservar valores salvos de CPV e ROI, não recalcular
        // Os valores de CPV e ROI devem vir dos dados salvos, não ser recalculados
        
        return newRow;
      });
      
      // 🎯 CORREÇÃO: Não recalcular automaticamente para preservar valores salvos
      const calculatedData = newData;
      
      // CORREÇÃO: Restaurar valores salvos de CPV e ROI após cálculo
      const finalData = calculatedData.map(row => {
        const newRow = { ...row };
        
        // Buscar valores salvos do Firebase
        const savedCPV = (savedDetails as any).cpv;
        const savedROI = (savedDetails as any).roi;
        
        // Restaurar CPV salvo se existir
        if ((row.metric === 'CPV' || row.metric === 'CPV (Custo por Venda)') && savedCPV !== undefined) {
          
          newRow.realValue = formatCurrency(savedCPV);
        }
        
        // Restaurar ROI salvo se existir
        if ((row.metric === 'ROI' || row.metric === 'ROI/ROAS' || row.metric === 'ROI / ROAS') && savedROI !== undefined) {
          
          newRow.realValue = savedROI;
        }
        
        return newRow;
      });
      
      // Notificar mudanças
      if (onValuesChange) {
        const agendamentos = audienceCalculatedValues.agendamentos;
        const vendas = audienceCalculatedValues.vendas;
        
        
        
        // Salvar no Firebase quando os valores dos públicos mudam
        if (selectedProduct && selectedMonth) {
          // Calcular CPV e ROI para salvar
          const cpvRow = finalData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
          const roiRow = finalData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');
          
          const cpv = parseNumber(cpvRow?.realValue || '0');
          const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');
          
          
          
          // Log adicional para verificar se os valores estão sendo calculados corretamente
          
          
          
          
          // CORREÇÃO: Usar o cliente passado via props
          
          // Importante: não enviar ticketMedio aqui para não sobrescrever o valor configurado no Bench
          // Calcular investimento total
          const investmentRow = finalData.find(r => r.metric === 'Investimento pretendido (Mês)');
          const totalInvestment = parseCurrency(investmentRow?.realValue || '0');
          
                      metricsService.saveMonthlyDetails({
              month: selectedMonth,
              product: selectedProduct,
              client: selectedClient, // Cliente via props
              agendamentos: agendamentos,
              vendas: vendas,
              cpv: cpv,
              roi: roiValue
            }).catch(error => {
              console.error('Erro ao salvar valores dos públicos:', error);
            });
        }
        
        // 🎯 CORREÇÃO: Removido onValuesChange daqui para evitar warning
        // Será chamado em um useEffect separado
      }
      
      return finalData;
    });
  }, [audienceCalculatedValues, ticketMedio, savedDetails.ticketMedio, ticketMedioEditedByUser]);

  // 🎯 CORREÇÃO: useEffect separado para chamar onValuesChange
  useEffect(() => {
    if (tableData.length > 0) {
      // Calcular totais dos dados da tabela
      let agendamentos = 0;
      let vendas = 0;
      
      tableData.forEach(row => {
        if (row.metric === 'Agendamentos' || row.metric === 'Agendamentos (Mês)') {
          agendamentos += parseInt(row.realValue.replace(/[^\d]/g, '') || '0');
        }
        if (row.metric === 'Vendas' || row.metric === 'Vendas (Mês)') {
          vendas += parseInt(row.realValue.replace(/[^\d]/g, '') || '0');
        }
      });
      
      if (onValuesChange) {
        onValuesChange({ agendamentos, vendas });
      }
    }
  }, [tableData, onValuesChange]);

  // Carregar ticketMedio dos dados salvos APENAS na primeira vez
  useEffect(() => {
    // 🎯 CORREÇÃO: Só carregar do Firebase se não foi editado pelo usuário e há valor salvo diferente
    const shouldLoadFromFirebase = !ticketMedioEditedByUser && 
                                   ticketMedio === 250 && 
                                   savedDetails.ticketMedio > 0 && 
                                   savedDetails.ticketMedio !== 250;
    
    if (shouldLoadFromFirebase) {
      
      setTicketMedio(savedDetails.ticketMedio);
    } else {
      
    }
  }, [savedDetails.ticketMedio, ticketMedioEditedByUser]);

  // 🎯 NOVO: Carregar ticketMedio do Firebase quando mudar produto/mês/cliente
  useEffect(() => {
    if (selectedProduct && selectedMonth && selectedClient) {
      
      
      // Resetar flag de edição para permitir carregamento do Firebase
      setTicketMedioEditedByUser(false);
      
      // Carregar dados do Firebase
      const loadTicketMedioFromFirebase = async () => {
        try {
          const details = await metricsService.getMonthlyDetails(
            selectedMonth,
            selectedProduct,
            selectedClient
          );
          
          
          
          // Aplicar valor salvo se for diferente do padrão
          if (details.ticketMedio && details.ticketMedio > 0 && details.ticketMedio !== 250) {
            
            setTicketMedio(details.ticketMedio);
          } else {
            
            setTicketMedio(250);
          }
        } catch (error) {
          console.error('❌ DEBUG - MonthlyDetailsTable - Erro ao carregar ticketMedio do Firebase:', error);
          setTicketMedio(250); // Usar valor padrão em caso de erro
        }
      };
      
      loadTicketMedioFromFirebase();
    }
  }, [selectedProduct, selectedMonth, selectedClient]);

  // 🎯 FUNÇÕES DE DEBUG PARA TICKET MÉDIO
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Debug do estado atual do ticket médio
      (window as any).debugTicketMedio = () => {
        
      };

      // Debug do Firebase para ticket médio
      (window as any).debugTicketMedioFirebase = async () => {
        if (!selectedProduct || !selectedMonth || !selectedClient) {
          
          return;
        }

        try {
          

          const details = await metricsService.getMonthlyDetails(
            selectedMonth,
            selectedProduct,
            selectedClient
          );

          

          return details;
        } catch (error) {
          console.error('❌ DEBUG - Ticket Médio - Erro ao buscar no Firebase:', error);
          return { error };
        }
      };

      // Debug para forçar carregamento do Firebase
      (window as any).forceLoadTicketMedio = async () => {
        if (!selectedProduct || !selectedMonth || !selectedClient) {
          
          return;
        }

        try {
          
          
          // Resetar flag para permitir carregamento
          setTicketMedioEditedByUser(false);
          
          const details = await metricsService.getMonthlyDetails(
            selectedMonth,
            selectedProduct,
            selectedClient
          );

          if (details.ticketMedio && details.ticketMedio > 0 && details.ticketMedio !== 250) {
            
            setTicketMedio(details.ticketMedio);
          } else {
            
            setTicketMedio(250);
          }

          return details;
        } catch (error) {
          console.error('❌ DEBUG - Ticket Médio - Erro ao forçar carregamento:', error);
          return { error };
        }
      };

      
      
      
      
    }
  }, [ticketMedio, ticketMedioEditedByUser, savedDetails, selectedProduct, selectedMonth, selectedClient]);

  // Resetar flag de edição quando mudar produto/cliente/mês
  useEffect(() => {
    
    setTicketMedioEditedByUser(false);
    // 🎯 CORREÇÃO: NÃO resetar ticketMedio para 250 aqui, deixar o novo useEffect carregar do Firebase
  }, [selectedProduct, selectedClient, selectedMonth]);

  // Atualizar métricas quando houver mudança no produto selecionado ou nas métricas
  useEffect(() => {
    if (!metrics || metrics.length === 0) {
      
      
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
              newRow.realValue = formatNumber(0);
              newRow.realValueEditable = false;
              break;
            case 'CPC':
              newRow.realValue = formatCurrency(0);
              newRow.realValueEditable = false;
              break;
            case 'Cliques':
              newRow.realValue = formatNumber(0);
              newRow.realValueEditable = false;
              break;
            case 'Visitantes na página (LPV)':
              newRow.realValue = formatNumber(0);
              newRow.realValueEditable = false;
              break;
            case 'CTR':
              newRow.realValue = '0.00%';
              newRow.realValueEditable = false;
              break;
            case 'Leads / Msgs':
              newRow.realValue = formatNumber(0);
              newRow.realValueEditable = false;
              break;
            case 'CPL (Custo por Lead)':
              newRow.realValue = formatCurrency(0);
              newRow.realValueEditable = false;
              break;
            case 'Agendamentos':
              newRow.realValue = formatNumber(audienceCalculatedValues.agendamentos);
              newRow.realValueEditable = false; // CORREÇÃO: Sempre não editável
              break;
            case 'Vendas':
              newRow.realValue = formatNumber(audienceCalculatedValues.vendas);
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

    
    

        // Usar agregador com fallback à API de campanha para clicks/impressões/custos (alinha com os cards)
    (async () => {
      
      
      // 🎯 CORREÇÃO: Não aguardar benchmarkLoadCompleted para valores reais
      // Os valores reais devem ser carregados independentemente dos benchmarks
      
      const aggregated = await metricsService.calculateAggregatedMetricsWithMetaFallback(
        metrics,
        selectedMonth,
        selectedProduct,
        selectedClient
      );
      
      
      
      setTableData(prevData => {
        
        
        
        const updated = prevData.map(row => {
          const newRow: TableRow = { ...row };
          
          // 🎯 PRESERVAR CAMPOS EDITADOS PELO USUÁRIO (igual ao Ticket Médio)
          if (isFieldEditedByUser(row.metric)) {
            
            return newRow; // Manter valor original
          }

        // CORREÇÃO: Verificar se há dados reais antes de sincronizar
        const hasRealData = aggregated.totalInvestment > 0 || aggregated.totalLeads > 0 || aggregated.totalClicks > 0 || aggregated.totalLPV > 0;
        

        

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
              newRow.realValue = formatNumber(aggregated.totalImpressions);
            } else {
              newRow.realValue = formatNumber(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'CPC':
            // 🎯 CORREÇÃO: CPC baseado em link_clicks (igual ao Histórico de Público)
            if (hasRealData && aggregated.totalClicks > 0) {
              const avgCPC = aggregated.totalInvestment / aggregated.totalClicks;
              newRow.realValue = formatCurrency(avgCPC);
            } else {
              newRow.realValue = formatCurrency(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'Cliques':
            // 🎯 CORREÇÃO: Cliques deve refletir link_clicks (igual ao Histórico de Público)
            if (hasRealData) {
              newRow.realValue = formatNumber(aggregated.totalClicks);
            } else {
              newRow.realValue = formatNumber(0);
            }
            newRow.realValueEditable = false;
            break;
          case 'Visitantes na página (LPV)':
            // 🎯 CORREÇÃO: Sincronizar com landing_page_views do Meta Ads (igual aos outros campos)
            if (hasRealData) {
              newRow.realValue = formatNumber(aggregated.totalLPV || 0);
            } else {
              newRow.realValue = formatNumber(0);
            }
            newRow.realValueEditable = false;
            break;

          case 'Leads / Msgs':
            // CORREÇÃO: Só sincronizar se há dados reais
            if (hasRealData) {
              
              newRow.realValue = formatNumber(aggregated.totalLeads);
            } else {
              
              newRow.realValue = formatNumber(0);
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
            
            newRow.realValue = formatNumber(audienceCalculatedValues.agendamentos);
            newRow.realValueEditable = false; // CORREÇÃO: Sempre não editável
            break;
          case 'Vendas':
            // 🎯 CORREÇÃO: Sempre usar os valores calculados dos públicos
            
            newRow.realValue = formatNumber(audienceCalculatedValues.vendas);
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

      
      
      // 🎯 VERIFICAÇÃO: Verificar se campos editados foram preservados
      updated.forEach(row => {
        if (isFieldEditedByUser(row.metric)) {
          
        }
      });
      
      // 🎯 CORREÇÃO: Não recalcular automaticamente após sincronização
      // Preservar valores da coluna Benchmark/Projeção que foram carregados
      if (!hasInitialLoad) {
        setHasInitialLoad(true);
      }
      return updated;
      });
    })();
  }, [metrics, selectedProduct, savedDetails, audienceCalculatedValues]);

  // 🎯 CORREÇÃO: useEffect separado para notificar mudanças de valores
  useEffect(() => {
    if (onValuesChange) {
      const agendamentos = audienceCalculatedValues.agendamentos;
      const vendas = audienceCalculatedValues.vendas;
      
      // Evitar loop infinito: só notificar se os valores mudaram
      if (agendamentos !== lastNotifiedValues.agendamentos || vendas !== lastNotifiedValues.vendas) {
        setLastNotifiedValues({ agendamentos, vendas });
        onValuesChange({ agendamentos, vendas });
      }
    }
  }, [audienceCalculatedValues, onValuesChange, lastNotifiedValues]);

  // 🎯 NOVA FUNÇÃO: Verificar se um campo foi editado pelo usuário (igual ao Ticket Médio)
  const isFieldEditedByUser = (metricName: string): boolean => {
    return benchmarkFieldsEditedByUser[metricName] === true;
  };

  // Função para calcular valores automaticamente
  const calculateValues = (data: TableRow[], editedMetric?: string): TableRow[] => {
    // 🎯 CORREÇÃO: Preservar valores da coluna Benchmark/Projeção que foram carregados
    let currentData = [...data];
    let previousData: TableRow[] = [];
    let iterations = 0;
    const maxIterations = 5; // Limite para evitar loop infinito
    
    // 🎯 CORREÇÃO: Sempre calcular valores automáticos da coluna "Valores Reais"
    // Independentemente de ter editedMetric ou não
    
    // Continuar recalculando até que não haja mais mudanças ou até o limite de iterações
    while (iterations < maxIterations) {
      previousData = JSON.parse(JSON.stringify(currentData)); // Deep copy
      
      currentData = currentData.map(row => {
        const newRow = { ...row };

        // Obter valores editáveis da coluna VALORES REAIS
        const investment = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.realValue || '0');
        const cpm = parseCurrency(currentData.find(r => r.metric === 'CPM')?.realValue || '0');
        const cliques = parseNumber(currentData.find(r => r.metric === 'Cliques')?.realValue || '0');
        const lpv = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.realValue || '0');
        const leads = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.realValue || '0');
        const agendamentos = parseNumber(currentData.find(r => r.metric === 'Agendamentos')?.realValue || '0');
        const vendas = parseNumber(currentData.find(r => r.metric === 'Vendas')?.realValue || '0');

        // Obter valores editáveis da coluna BENCHMARK/PROJEÇÃO
        const txMensagens = parsePercentage(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0%');
        const txAgendamento = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
        const txConversaoVendas = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');

        // Calcular valores automáticos da coluna VALORES REAIS
        switch (row.metric) {
          case 'Impressões':
            if (cpm > 0) {
              const impressionsValue = Math.round(investment * 1000 / cpm);
              newRow.realValue = formatNumber(impressionsValue);
            }
            break;
          case 'CPC':
            if (cliques > 0) {
              newRow.realValue = formatCurrency(investment / cliques);
            }
            break;
          case 'Visitantes na página (LPV)':
            // 🎯 CORREÇÃO: LPV da coluna valores reais deve SEMPRE vir do Meta Ads
            // NÃO deve ser calculado baseado no benchmark
            // O valor real é definido na função de sincronização com Meta Ads
            break;

          case 'Tx. Mensagens (Leads/Cliques)':
            // 🎯 NOVA LÓGICA: Tx. Mensagens com prioridade para LPV quando disponível
            const lpv = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.realValue || '0');
            
            // 🎯 PRIORIDADE: Se LPV > 0, usar LPV como base; senão, usar Cliques
            const baseForTx = lpv > 0 ? lpv : cliques;
            
            if (baseForTx > 0) {
              newRow.realValue = formatPercentage((leads / baseForTx) * 100);
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
              // 🎯 NOVA LÓGICA: Base no toggle agendamentosEnabled
              if (agendamentosEnabled) {
                // 🎯 LÓGICA ATUAL: Tx. Conversão Vendas = (Vendas ÷ Agendamentos) × 100%
                if (agendamentos > 0) {
                  newRow.realValue = formatPercentage((vendas / agendamentos) * 100);
                } else {
                  newRow.realValue = formatPercentage(0);
                }
              } else {
                // 🎯 NOVA LÓGICA: Tx. Conversão Vendas = (Vendas ÷ Leads) × 100%
                if (leads > 0) {
                  newRow.realValue = formatPercentage((vendas / leads) * 100);
                } else {
                  newRow.realValue = formatPercentage(0);
                }
              }
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
              // 🎯 CORREÇÃO: ROI Multiplier deve ser (lucro / investment) + 1, não (receita / investment)
              const roiMultiplier = (lucro / investment) + 1;
              try {
                
              } catch {}
              newRow.realValue = `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`;
            }
            break;
        }

        // 🎯 CORREÇÃO: Calcular dependências específicas baseadas no campo editado
        // Só calcular dependências da coluna "Benchmark/Projeção" se há editedMetric
        if (editedMetric) {
          const updateMetric = (metricName: string, value: string) => {
            const metricRow = currentData.find(r => r.metric === metricName);
            if (metricRow) {
              metricRow.benchmark = value;
            }
          };

          // 🎯 CALCULAR VALORES DEPENDENTES baseado no campo editado
          switch (editedMetric) {
            case 'Investimento pretendido (Mês)':
              // 🎯 INVESTIMENTO AFETA: Impressões, Cliques, Leads/Msgs, Agendamentos, Vendas, CPV, Lucro, ROI
              const investmentValue = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
              
              // Impressões = (Investimento × 1000) ÷ CPM
              const cpmValue = parseCurrency(currentData.find(r => r.metric === 'CPM')?.benchmark || '0');
              if (cpmValue > 0) {
                const impressoesValue = Math.round((investmentValue * 1000) / cpmValue);
                updateMetric('Impressões', formatNumber(impressoesValue));
              }
              
              // Cliques = Investimento ÷ CPC
              const cpcValue = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
              if (cpcValue > 0) {
                const cliquesValue = Math.round(investmentValue / cpcValue);
                updateMetric('Cliques', formatNumber(cliquesValue));
              }
              
              // 🎯 NOVA LÓGICA: Leads/Msgs com prioridade para LPV quando disponível
              const lpvBenchForLeads = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
              const cliquesForLeads = cpcValue > 0 ? Math.round(investmentValue / cpcValue) : 0;
              const baseForLeads = lpvBenchForLeads > 0 ? lpvBenchForLeads : cliquesForLeads;
              
              if (txMensagens > 0 && baseForLeads > 0) {
                const leadsValue = Math.round(baseForLeads * txMensagens / 100);
                updateMetric('Leads / Msgs', formatNumber(leadsValue));
              }
              
              // Agendamentos = Leads × Tx. Agendamento%
              const txAgendamentoValue = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
              const leadsForAgend = txMensagens > 0 && baseForLeads > 0 ? Math.round(baseForLeads * txMensagens / 100) : 0;
              if (txAgendamentoValue > 0 && leadsForAgend > 0) {
                const agendamentosValue = Math.floor(leadsForAgend * txAgendamentoValue / 100);
                updateMetric('Agendamentos', formatNumber(agendamentosValue));
              }
              
              // Vendas = Agendamentos × Tx. Conversão Vendas% (ou Leads/msgm quando desabilitado)
              const txVendasValue = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
              
              if (agendamentosEnabled) {
                // 🎯 LÓGICA ATUAL: Vendas = Agendamentos × Tx. Conversão Vendas%
                const agendForVendas = txAgendamentoValue > 0 && leadsForAgend > 0 ? Math.floor(leadsForAgend * txAgendamentoValue / 100) : 0;
                if (txVendasValue > 0 && agendForVendas > 0) {
                  const vendasValue = Math.floor(agendForVendas * txVendasValue / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const leadsMsgmForVendas = txMensagens > 0 && baseForLeads > 0 ? Math.round(baseForLeads * txMensagens / 100) : 0;
                if (txVendasValue > 0 && leadsMsgmForVendas > 0) {
                  const vendasValue = Math.floor(leadsMsgmForVendas * txVendasValue / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }
              
              // CPV = Investimento ÷ Vendas
              let vendasForCPV = 0;
              if (agendamentosEnabled) {
                const agendForVendas = txAgendamentoValue > 0 && leadsForAgend > 0 ? Math.floor(leadsForAgend * txAgendamentoValue / 100) : 0;
                vendasForCPV = txVendasValue > 0 && agendForVendas > 0 ? Math.floor(agendForVendas * txVendasValue / 100) : 0;
              } else {
                const leadsMsgmForVendas = txMensagens > 0 && baseForLeads > 0 ? Math.round(baseForLeads * txMensagens / 100) : 0;
                vendasForCPV = txVendasValue > 0 && leadsMsgmForVendas > 0 ? Math.floor(leadsMsgmForVendas * txVendasValue / 100) : 0;
              }
              if (vendasForCPV > 0) {
                const cpvValue = investmentValue / vendasForCPV;
                updateMetric('CPV', formatCurrency(cpvValue));
              }
              
              // Lucro = (Vendas × Valor Venda) - Investimento
              const valorVenda = parseCurrency(currentData.find(r => r.metric === 'Valor Venda')?.benchmark || '0');
              let vendasForLucro = 0;
              if (agendamentosEnabled) {
                const agendForVendas = txAgendamentoValue > 0 && leadsForAgend > 0 ? Math.floor(leadsForAgend * txAgendamentoValue / 100) : 0;
                vendasForLucro = txVendasValue > 0 && agendForVendas > 0 ? Math.floor(agendForVendas * txVendasValue / 100) : 0;
              } else {
                const leadsMsgmForVendas = txMensagens > 0 && baseForLeads > 0 ? Math.round(baseForLeads * txMensagens / 100) : 0;
                vendasForLucro = txVendasValue > 0 && leadsMsgmForVendas > 0 ? Math.floor(leadsMsgmForVendas * txVendasValue / 100) : 0;
              }
              if (valorVenda > 0 && vendasForLucro > 0) {
                const lucroValue = (vendasForLucro * valorVenda) - investmentValue;
                updateMetric('Lucro', formatCurrency(lucroValue));
              }
              
              // ROI = (Lucro ÷ Investimento) × 100
              const lucroForROI = valorVenda > 0 && vendasForLucro > 0 ? (vendasForLucro * valorVenda) - investmentValue : 0;
              if (investmentValue > 0 && lucroForROI !== 0) {
                const roiPercent = (lucroForROI / investmentValue) * 100;
                const roiMultiplier = (lucroForROI / investmentValue) + 1;
                updateMetric('ROI', `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`);
              }
              break;
              
            case 'CPM':
              // 🎯 CPM AFETA: Impressões, Cliques, Leads/Msgs, CPL, Agendamentos, Vendas, CPV, Lucro, ROI
              const cpmValue2 = parseCurrency(currentData.find(r => r.metric === 'CPM')?.benchmark || '0');
              const investmentValue2 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
              
              // Impressões = (Investimento × 1000) ÷ CPM
              if (cpmValue2 > 0 && investmentValue2 > 0) {
                const impressoesValue = Math.round((investmentValue2 * 1000) / cpmValue2);
                updateMetric('Impressões', formatNumber(impressoesValue));
              }
              
              // Cliques = Investimento ÷ CPC
              const cpcValue2 = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
              if (cpcValue2 > 0 && investmentValue2 > 0) {
                const cliquesValue = Math.round(investmentValue2 / cpcValue2);
                updateMetric('Cliques', formatNumber(cliquesValue));
              }
              
              // 🎯 NOVA LÓGICA: Leads/Msgs com prioridade para LPV quando disponível
              const lpvBenchForLeads2 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
              const cliquesForLeads2 = cpcValue2 > 0 && investmentValue2 > 0 ? Math.round(investmentValue2 / cpcValue2) : 0;
              const baseForLeads2 = lpvBenchForLeads2 > 0 ? lpvBenchForLeads2 : cliquesForLeads2;
              
              if (txMensagens > 0 && baseForLeads2 > 0) {
                const leadsValue = Math.round(baseForLeads2 * txMensagens / 100);
                updateMetric('Leads / Msgs', formatNumber(leadsValue));
              }
              
              // CPL = Investimento ÷ Leads
              const leadsForCPL2 = txMensagens > 0 && baseForLeads2 > 0 ? Math.round(baseForLeads2 * txMensagens / 100) : 0;
              if (leadsForCPL2 > 0 && investmentValue2 > 0) {
                const cplValue = investmentValue2 / leadsForCPL2;
                updateMetric('CPL', formatCurrency(cplValue));
              }
              
              // Agendamentos = Leads × Tx. Agendamento%
              const txAgendamentoValue2 = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
              if (txAgendamentoValue2 > 0 && leadsForCPL2 > 0) {
                const agendamentosValue = Math.floor(leadsForCPL2 * txAgendamentoValue2 / 100);
                updateMetric('Agendamentos', formatNumber(agendamentosValue));
              }
              
              // Vendas = Agendamentos × Tx. Conversão Vendas% (ou Leads/msgm quando desabilitado)
              const txVendasValue2 = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
              
              if (agendamentosEnabled) {
                // 🎯 LÓGICA ATUAL: Vendas = Agendamentos × Tx. Conversão Vendas%
                const agendForVendas2 = txAgendamentoValue2 > 0 && leadsForCPL2 > 0 ? Math.floor(leadsForCPL2 * txAgendamentoValue2 / 100) : 0;
                if (txVendasValue2 > 0 && agendForVendas2 > 0) {
                  const vendasValue = Math.floor(agendForVendas2 * txVendasValue2 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const leadsMsgmForVendas2 = txMensagens > 0 && baseForLeads2 > 0 ? Math.round(baseForLeads2 * txMensagens / 100) : 0;
                if (txVendasValue2 > 0 && leadsMsgmForVendas2 > 0) {
                  const vendasValue = Math.floor(leadsMsgmForVendas2 * txVendasValue2 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }
              
              // CPV = Investimento ÷ Vendas
              let vendasForCPV2 = 0;
              if (agendamentosEnabled) {
                const agendForVendas2 = txAgendamentoValue2 > 0 && leadsForCPL2 > 0 ? Math.floor(leadsForCPL2 * txAgendamentoValue2 / 100) : 0;
                vendasForCPV2 = txVendasValue2 > 0 && agendForVendas2 > 0 ? Math.floor(agendForVendas2 * txVendasValue2 / 100) : 0;
              } else {
                const leadsMsgmForVendas2 = txMensagens > 0 && baseForLeads2 > 0 ? Math.round(baseForLeads2 * txMensagens / 100) : 0;
                vendasForCPV2 = txVendasValue2 > 0 && leadsMsgmForVendas2 > 0 ? Math.floor(leadsMsgmForVendas2 * txVendasValue2 / 100) : 0;
              }
              if (vendasForCPV2 > 0 && investmentValue2 > 0) {
                const cpvValue = investmentValue2 / vendasForCPV2;
                updateMetric('CPV', formatCurrency(cpvValue));
              }
              
              // Lucro = (Vendas × Valor Venda) - Investimento
              const valorVenda2 = parseCurrency(currentData.find(r => r.metric === 'Valor Venda')?.benchmark || '0');
              let vendasForLucro2 = 0;
              if (agendamentosEnabled) {
                const agendForVendas2 = txAgendamentoValue2 > 0 && leadsForCPL2 > 0 ? Math.floor(leadsForCPL2 * txAgendamentoValue2 / 100) : 0;
                vendasForLucro2 = txVendasValue2 > 0 && agendForVendas2 > 0 ? Math.floor(agendForVendas2 * txVendasValue2 / 100) : 0;
              } else {
                const leadsMsgmForVendas2 = txMensagens > 0 && baseForLeads2 > 0 ? Math.round(baseForLeads2 * txMensagens / 100) : 0;
                vendasForLucro2 = txVendasValue2 > 0 && leadsMsgmForVendas2 > 0 ? Math.floor(leadsMsgmForVendas2 * txVendasValue2 / 100) : 0;
              }
              if (valorVenda2 > 0 && vendasForLucro2 > 0) {
                const lucroValue = (vendasForLucro2 * valorVenda2) - investmentValue2;
                updateMetric('Lucro', formatCurrency(lucroValue));
              }
              
              // ROI = (Lucro ÷ Investimento) × 100
              const lucroForROI2 = valorVenda2 > 0 && vendasForLucro2 > 0 ? (vendasForLucro2 * valorVenda2) - investmentValue2 : 0;
              if (investmentValue2 > 0 && lucroForROI2 !== 0) {
                const roiPercent = (lucroForROI2 / investmentValue2) * 100;
                const roiMultiplier = (lucroForROI2 / investmentValue2) + 1;
                updateMetric('ROI', `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`);
              }
              break;
              
            case 'CPC':
              // 🎯 CPC AFETA: Cliques, Leads/Msgs, CPL, Agendamentos, Vendas, CPV, Lucro, ROI
              const cpcValue3 = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
              const investmentValue3 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
              
              // Cliques = Investimento ÷ CPC
              if (cpcValue3 > 0 && investmentValue3 > 0) {
                const cliquesValue = Math.round(investmentValue3 / cpcValue3);
                updateMetric('Cliques', formatNumber(cliquesValue));
              }
              
              // 🎯 NOVA LÓGICA: Leads/Msgs com prioridade para LPV quando disponível
              const lpvBenchForLeads3 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
              const cliquesForLeads3 = cpcValue3 > 0 && investmentValue3 > 0 ? Math.round(investmentValue3 / cpcValue3) : 0;
              const baseForLeads3 = lpvBenchForLeads3 > 0 ? lpvBenchForLeads3 : cliquesForLeads3;
              
              if (txMensagens > 0 && baseForLeads3 > 0) {
                const leadsValue = Math.round(baseForLeads3 * txMensagens / 100);
                updateMetric('Leads / Msgs', formatNumber(leadsValue));
              }
              
              // CPL = Investimento ÷ Leads
              const leadsForCPL3 = txMensagens > 0 && baseForLeads3 > 0 ? Math.round(baseForLeads3 * txMensagens / 100) : 0;
              if (leadsForCPL3 > 0 && investmentValue3 > 0) {
                const cplValue = investmentValue3 / leadsForCPL3;
                updateMetric('CPL', formatCurrency(cplValue));
              }
              
              // Agendamentos = Leads × Tx. Agendamento%
              const txAgendamentoValue3 = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
              if (txAgendamentoValue3 > 0 && leadsForCPL3 > 0) {
                const agendamentosValue = Math.floor(leadsForCPL3 * txAgendamentoValue3 / 100);
                updateMetric('Agendamentos', formatNumber(agendamentosValue));
              }
              
              // Vendas = Agendamentos × Tx. Conversão Vendas% (ou Leads/msgm quando desabilitado)
              const txVendasValue3 = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
              
              if (agendamentosEnabled) {
                // 🎯 LÓGICA ATUAL: Vendas = Agendamentos × Tx. Conversão Vendas%
                const agendForVendas3 = txAgendamentoValue3 > 0 && leadsForCPL3 > 0 ? Math.floor(leadsForCPL3 * txAgendamentoValue3 / 100) : 0;
                if (txVendasValue3 > 0 && agendForVendas3 > 0) {
                  const vendasValue = Math.floor(agendForVendas3 * txVendasValue3 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const leadsMsgmForVendas3 = txMensagens > 0 && baseForLeads3 > 0 ? Math.round(baseForLeads3 * txMensagens / 100) : 0;
                if (txVendasValue3 > 0 && leadsMsgmForVendas3 > 0) {
                  const vendasValue = Math.floor(leadsMsgmForVendas3 * txVendasValue3 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }
              
              // CPV = Investimento ÷ Vendas
              let vendasForCPV3 = 0;
              if (agendamentosEnabled) {
                const agendForVendas3 = txAgendamentoValue3 > 0 && leadsForCPL3 > 0 ? Math.floor(leadsForCPL3 * txAgendamentoValue3 / 100) : 0;
                vendasForCPV3 = txVendasValue3 > 0 && agendForVendas3 > 0 ? Math.floor(agendForVendas3 * txVendasValue3 / 100) : 0;
              } else {
                const leadsMsgmForVendas3 = txMensagens > 0 && baseForLeads3 > 0 ? Math.round(baseForLeads3 * txMensagens / 100) : 0;
                vendasForCPV3 = txVendasValue3 > 0 && leadsMsgmForVendas3 > 0 ? Math.floor(leadsMsgmForVendas3 * txVendasValue3 / 100) : 0;
              }
              if (vendasForCPV3 > 0 && investmentValue3 > 0) {
                const cpvValue = investmentValue3 / vendasForCPV3;
                updateMetric('CPV', formatCurrency(cpvValue));
              }
              
              // Lucro = (Vendas × Valor Venda) - Investimento
              const valorVenda3 = parseCurrency(currentData.find(r => r.metric === 'Valor Venda')?.benchmark || '0');
              let vendasForLucro3 = 0;
              if (agendamentosEnabled) {
                const agendForVendas3 = txAgendamentoValue3 > 0 && leadsForCPL3 > 0 ? Math.floor(leadsForCPL3 * txAgendamentoValue3 / 100) : 0;
                vendasForLucro3 = txVendasValue3 > 0 && agendForVendas3 > 0 ? Math.floor(agendForVendas3 * txVendasValue3 / 100) : 0;
              } else {
                const leadsMsgmForVendas3 = txMensagens > 0 && baseForLeads3 > 0 ? Math.round(baseForLeads3 * txMensagens / 100) : 0;
                vendasForLucro3 = txVendasValue3 > 0 && leadsMsgmForVendas3 > 0 ? Math.floor(leadsMsgmForVendas3 * txVendasValue3 / 100) : 0;
              }
              if (valorVenda3 > 0 && vendasForLucro3 > 0) {
                const lucroValue = (vendasForLucro3 * valorVenda3) - investmentValue3;
                updateMetric('Lucro', formatCurrency(lucroValue));
              }
              
              // ROI = (Lucro ÷ Investimento) × 100
              const lucroForROI3 = valorVenda3 > 0 && vendasForLucro3 > 0 ? (vendasForLucro3 * valorVenda3) - investmentValue3 : 0;
              if (investmentValue3 > 0 && lucroForROI3 !== 0) {
                const roiPercent = (lucroForROI3 / investmentValue3) * 100;
                const roiMultiplier = (lucroForROI3 / investmentValue3) + 1;
                updateMetric('ROI', `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`);
              }
              break;
              
            case 'Visitantes na página (LPV)':
              // 🎯 CORREÇÃO: LPV da coluna valores reais NÃO deve ser afetado pelo benchmark
              // O campo valores reais deve sempre puxar dados do Meta Ads
              // Nenhuma ação necessária aqui
              break;
              
            case 'Tx. Mensagens (Leads/Cliques)':
              // 🎯 TX MENSAGENS agora é calculada automaticamente baseada no CTR
              // Não afeta outros campos diretamente, pois é calculada a partir do CTR
              break;
              
            case 'Tx. Agendamento (Agend./Leads)':
              // 🎯 TX AGENDAMENTO AFETA: Agendamentos, Vendas, CPV, Lucro, ROI
                              const txAgendamentoValue5 = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
              const investmentValue5 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
              const cpcValue5 = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
              const txMensagensValue5 = parsePercentage(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0%');
              
              // 🎯 NOVA LÓGICA: Leads com prioridade para LPV quando disponível
              const lpvBenchForLeads5 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
              const cliquesForLeads5 = cpcValue5 > 0 && investmentValue5 > 0 ? Math.round(investmentValue5 / cpcValue5) : 0;
              const baseForLeads5 = lpvBenchForLeads5 > 0 ? lpvBenchForLeads5 : cliquesForLeads5;
              
              // Leads = Base (LPV ou Cliques) × Tx. Mensagens%
              const leadsForAgend5 = txMensagensValue5 > 0 && baseForLeads5 > 0 ? Math.round(baseForLeads5 * txMensagensValue5 / 100) : 0;
              
              // Agendamentos = Leads × Tx. Agendamento%
              if (txAgendamentoValue5 > 0 && leadsForAgend5 > 0) {
                const agendamentosValue = Math.floor(leadsForAgend5 * txAgendamentoValue5 / 100);
                updateMetric('Agendamentos', formatNumber(agendamentosValue));
              }
              
              // Vendas = Agendamentos × Tx. Conversão Vendas% (ou Leads/msgm quando desabilitado)
              const txVendasValue5 = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
              
              if (agendamentosEnabled) {
                // 🎯 LÓGICA ATUAL: Vendas = Agendamentos × Tx. Conversão Vendas%
                const agendForVendas5 = txAgendamentoValue5 > 0 && leadsForAgend5 > 0 ? Math.floor(leadsForAgend5 * txAgendamentoValue5 / 100) : 0;
                if (txVendasValue5 > 0 && agendForVendas5 > 0) {
                  const vendasValue = Math.floor(agendForVendas5 * txVendasValue5 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const leadsMsgmForVendas5 = txMensagensValue5 > 0 && baseForLeads5 > 0 ? Math.round(baseForLeads5 * txMensagensValue5 / 100) : 0;
                if (txVendasValue5 > 0 && leadsMsgmForVendas5 > 0) {
                  const vendasValue = Math.floor(leadsMsgmForVendas5 * txVendasValue5 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }
              
              // CPV = Investimento ÷ Vendas
              let vendasForCPV5 = 0;
              if (agendamentosEnabled) {
                const agendForVendas5 = txAgendamentoValue5 > 0 && leadsForAgend5 > 0 ? Math.floor(leadsForAgend5 * txAgendamentoValue5 / 100) : 0;
                vendasForCPV5 = txVendasValue5 > 0 && agendForVendas5 > 0 ? Math.floor(agendForVendas5 * txVendasValue5 / 100) : 0;
              } else {
                const leadsMsgmForVendas5 = txMensagensValue5 > 0 && baseForLeads5 > 0 ? Math.round(baseForLeads5 * txMensagensValue5 / 100) : 0;
                vendasForCPV5 = txVendasValue5 > 0 && leadsMsgmForVendas5 > 0 ? Math.floor(leadsMsgmForVendas5 * txVendasValue5 / 100) : 0;
              }
              if (vendasForCPV5 > 0 && investmentValue5 > 0) {
                const cpvValue = investmentValue5 / vendasForCPV5;
                updateMetric('CPV', formatCurrency(cpvValue));
              }
              
              // Lucro = (Vendas × Valor Venda) - Investimento
              const valorVenda5 = parseCurrency(currentData.find(r => r.metric === 'Valor Venda')?.benchmark || '0');
              let vendasForLucro5 = 0;
              if (agendamentosEnabled) {
                const agendForVendas5 = txAgendamentoValue5 > 0 && leadsForAgend5 > 0 ? Math.floor(leadsForAgend5 * txAgendamentoValue5 / 100) : 0;
                vendasForLucro5 = txVendasValue5 > 0 && agendForVendas5 > 0 ? Math.floor(agendForVendas5 * txVendasValue5 / 100) : 0;
              } else {
                const leadsMsgmForVendas5 = txMensagensValue5 > 0 && baseForLeads5 > 0 ? Math.round(baseForLeads5 * txMensagensValue5 / 100) : 0;
                vendasForLucro5 = txVendasValue5 > 0 && leadsMsgmForVendas5 > 0 ? Math.floor(leadsMsgmForVendas5 * txVendasValue5 / 100) : 0;
              }
              if (valorVenda5 > 0 && vendasForLucro5 > 0) {
                const lucroValue = (vendasForLucro5 * valorVenda5) - investmentValue5;
                updateMetric('Lucro', formatCurrency(lucroValue));
              }
              
              // ROI = (Lucro ÷ Investimento) × 100
              const lucroForROI5 = valorVenda5 > 0 && vendasForLucro5 > 0 ? (vendasForLucro5 * valorVenda5) - investmentValue5 : 0;
              if (investmentValue5 > 0 && lucroForROI5 !== 0) {
                const roiPercent = (lucroForROI5 / investmentValue5) * 100;
                const roiMultiplier = (lucroForROI5 / investmentValue5) + 1;
                updateMetric('ROI', `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`);
              }
              break;
              
            case 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)':
              // 🎯 TX VENDAS AFETA: Vendas, CPV, Lucro, ROI
              const txVendasValue6 = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
              const investmentValue6 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
              const cpcValue6 = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
              const txMensagensValue6 = parsePercentage(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0%');
              const txAgendamentoValue6 = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
              
              // 🎯 NOVA LÓGICA: Leads com prioridade para LPV quando disponível
              const lpvBenchForLeads6 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
              const cliquesForLeads6 = cpcValue6 > 0 && investmentValue6 > 0 ? Math.round(investmentValue6 / cpcValue6) : 0;
              const baseForLeads6 = lpvBenchForLeads6 > 0 ? lpvBenchForLeads6 : cliquesForLeads6;
              
              // Leads = Base (LPV ou Cliques) × Tx. Mensagens%
              const leadsForAgend6 = txMensagensValue6 > 0 && baseForLeads6 > 0 ? Math.round(baseForLeads6 * txMensagensValue6 / 100) : 0;
              
              // Agendamentos = Leads × Tx. Agendamento%
                              const agendForVendas6 = txAgendamentoValue6 > 0 && leadsForAgend6 > 0 ? Math.floor(leadsForAgend6 * txAgendamentoValue6 / 100) : 0;
              
              // Vendas = Agendamentos × Tx. Conversão Vendas% (ou Leads/msgm quando desabilitado)
              if (agendamentosEnabled) {
                // 🎯 LÓGICA ATUAL: Vendas = Agendamentos × Tx. Conversão Vendas%
                if (txVendasValue6 > 0 && agendForVendas6 > 0) {
                  const vendasValue = Math.floor(agendForVendas6 * txVendasValue6 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              } else {
                // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
                const leadsMsgmForVendas6 = txMensagensValue6 > 0 && baseForLeads6 > 0 ? Math.round(baseForLeads6 * txMensagensValue6 / 100) : 0;
                if (txVendasValue6 > 0 && leadsMsgmForVendas6 > 0) {
                  const vendasValue = Math.floor(leadsMsgmForVendas6 * txVendasValue6 / 100);
                  updateMetric('Vendas', formatNumber(vendasValue));
                } else {
                  // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                  updateMetric('Vendas', formatNumber(0));
                }
              }
              
              // CPV = Investimento ÷ Vendas
                              const vendasForCPV6 = txVendasValue6 > 0 && agendForVendas6 > 0 ? Math.floor(agendForVendas6 * txVendasValue6 / 100) : 0;
              if (vendasForCPV6 > 0 && investmentValue6 > 0) {
                const cpvValue = investmentValue6 / vendasForCPV6;
                updateMetric('CPV', formatCurrency(cpvValue));
              }
              
              // Lucro = (Vendas × Valor Venda) - Investimento
              const valorVenda6 = parseCurrency(currentData.find(r => r.metric === 'Valor Venda')?.benchmark || '0');
                              const vendasForLucro6 = txVendasValue6 > 0 && agendForVendas6 > 0 ? Math.floor(agendForVendas6 * txVendasValue6 / 100) : 0;
              if (valorVenda6 > 0 && vendasForLucro6 > 0) {
                const lucroValue = (vendasForLucro6 * valorVenda6) - investmentValue6;
                updateMetric('Lucro', formatCurrency(lucroValue));
              }
              
              // ROI = (Lucro ÷ Investimento) × 100
              const lucroForROI6 = valorVenda6 > 0 && vendasForLucro6 > 0 ? (vendasForLucro6 * valorVenda6) - investmentValue6 : 0;
              if (investmentValue6 > 0 && lucroForROI6 !== 0) {
                const roiPercent = (lucroForROI6 / investmentValue6) * 100;
                const roiMultiplier = (lucroForROI6 / investmentValue6) + 1;
                updateMetric('ROI', `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`);
              }
              break;
              
            case 'Tx. Mensagens (Leads/Cliques)':
              // 🎯 TX MENSAGENS AFETA: Leads/Msgs, Agendamentos, Vendas, CPV, Lucro, ROI
              const txMensagensValue7 = parsePercentage(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0%');
              const investmentValue7 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
              const cpcValue7 = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
              
              // 🎯 NOVA LÓGICA: Leads com prioridade para LPV quando disponível
              const lpvBenchForLeads7 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
              const cliquesForLeads7 = cpcValue7 > 0 && investmentValue7 > 0 ? Math.round(investmentValue7 / cpcValue7) : 0;
              const baseForLeads7 = lpvBenchForLeads7 > 0 ? lpvBenchForLeads7 : cliquesForLeads7;
              
              // Leads/Msgs = Base (LPV ou Cliques) × Tx. Mensagens%
              if (txMensagensValue7 > 0 && baseForLeads7 > 0) {
                const leadsValue = Math.round(baseForLeads7 * txMensagensValue7 / 100);
                updateMetric('Leads / Msgs', formatNumber(leadsValue));
              }
              
              // Agendamentos = Leads × Tx. Agendamento%
              const txAgendamentoValue7 = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
              const leadsForAgend7 = txMensagensValue7 > 0 && baseForLeads7 > 0 ? Math.round(baseForLeads7 * txMensagensValue7 / 100) : 0;
              if (txAgendamentoValue7 > 0 && leadsForAgend7 > 0) {
                const agendamentosValue = Math.floor(leadsForAgend7 * txAgendamentoValue7 / 100);
                updateMetric('Agendamentos', formatNumber(agendamentosValue));
              }
              
              // Vendas = Agendamentos × Tx. Conversão Vendas%
              const txVendasValue7 = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
              const agendForVendas7 = txAgendamentoValue7 > 0 && leadsForAgend7 > 0 ? Math.floor(leadsForAgend7 * txAgendamentoValue7 / 100) : 0;
              if (txVendasValue7 > 0 && agendForVendas7 > 0) {
                const vendasValue = Math.floor(agendForVendas7 * txVendasValue7 / 100);
                updateMetric('Vendas', formatNumber(vendasValue));
              } else {
                // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                updateMetric('Vendas', formatNumber(0));
              }
              
              // CPV = Investimento ÷ Vendas
              const vendasForCPV7 = txVendasValue7 > 0 && agendForVendas7 > 0 ? Math.floor(agendForVendas7 * txVendasValue7 / 100) : 0;
              if (vendasForCPV7 > 0 && investmentValue7 > 0) {
                const cpvValue = investmentValue7 / vendasForCPV7;
                updateMetric('CPV', formatCurrency(cpvValue));
              }
              
              // Lucro = (Vendas × Valor Venda) - Investimento
              const valorVenda7 = parseCurrency(currentData.find(r => r.metric === 'Valor Venda')?.benchmark || '0');
              const vendasForLucro7 = txVendasValue7 > 0 && agendForVendas7 > 0 ? Math.floor(agendForVendas7 * txVendasValue7 / 100) : 0;
              if (valorVenda7 > 0 && vendasForLucro7 > 0) {
                const lucroValue = (vendasForLucro7 * valorVenda7) - investmentValue7;
                updateMetric('Lucro', formatCurrency(lucroValue));
              }
              
              // ROI = (Lucro ÷ Investimento) × 100
              const lucroForROI7 = valorVenda7 > 0 && vendasForLucro7 > 0 ? (vendasForLucro7 * valorVenda7) - investmentValue7 : 0;
              if (investmentValue7 > 0 && lucroForROI7 !== 0) {
                const roiPercent = (lucroForROI7 / investmentValue7) * 100;
                const roiMultiplier = (lucroForROI7 / investmentValue7) + 1;
                updateMetric('ROI', `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`);
              }
              break;
          }
        }

        // Calcular valores automáticos da coluna BENCHMARK/PROJEÇÃO
        switch (row.metric) {
          case 'Impressões':
            const investmentBenchRaw = currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0';
            const cpmBenchRaw = currentData.find(r => r.metric === 'CPM')?.benchmark || '0';
            const investmentBench = parseCurrency(investmentBenchRaw);
            const cpmBench = parseCurrency(cpmBenchRaw);
            

            if (cpmBench > 0) {
              const impressionsBenchValue = Math.round(investmentBench * 1000 / cpmBench);

              newRow.benchmark = formatNumber(impressionsBenchValue);
            }
            break;

          case 'Cliques':
            const investmentBench2 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cpcBench = parseCurrency(currentData.find(r => r.metric === 'CPC')?.benchmark || '0');
            
            // 🎯 CORREÇÃO: Calcular Cliques baseado no CPC editado
            if (cpcBench > 0) {
              // Se CPC foi editado, calcular Cliques baseado no CPC
              const cliquesValue = Math.round(investmentBench2 / cpcBench);
              newRow.benchmark = formatNumber(cliquesValue);
            }
            // 🎯 REMOVIDO: Não calcular Cliques baseado em CTR para evitar dependência circular
            break;
          case 'Leads / Msgs':
            // 🎯 NOVA LÓGICA: Leads/Msgs calculado com prioridade para LPV quando disponível
            const lpvBench = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            const cliquesBench2 = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
            const txMensagensBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0%');
            
            // 🎯 PRIORIDADE: Se LPV > 0, usar LPV como base; senão, usar Cliques
            const baseValue = lpvBench > 0 ? lpvBench : cliquesBench2;
            
            if (txMensagensBench > 0 && baseValue > 0) {
              const leadsValue = Math.round(baseValue * txMensagensBench / 100);
              newRow.benchmark = formatNumber(leadsValue);
            }
            break;

          case 'Agendamentos':
            // 🎯 NOVA LÓGICA: Agendamentos = Leads/Msgs × Tx. Agendamento%
            const leadsBench = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const txAgendamentoBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
            if (txAgendamentoBench > 0 && leadsBench > 0) {
              const agendamentosValue = Math.floor(leadsBench * txAgendamentoBench / 100);
              newRow.benchmark = formatNumber(agendamentosValue);
            }
            break;
          case 'Vendas':
            // 🎯 NOVA LÓGICA: Vendas com base em Agendamentos ou Leads/msgm
            const txConversaoVendasBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
            
            if (agendamentosEnabled) {
              // 🎯 LÓGICA ATUAL: Vendas = Agendamentos × Tx. Conversão Vendas%
              const agendamentosBench = parseNumber(currentData.find(r => r.metric === 'Agendamentos')?.benchmark || '0');
              if (txConversaoVendasBench > 0 && agendamentosBench > 0) {
                const vendasValue = Math.floor(agendamentosBench * txConversaoVendasBench / 100);
                newRow.benchmark = formatNumber(vendasValue);
              } else {
                // 🎯 CORREÇÃO: Se agendamentos = 0, vendas = 0
                newRow.benchmark = formatNumber(0);
              }
            } else {
              // 🎯 NOVA LÓGICA: Vendas = Leads/msgm × Tx. Conversão Vendas%
              const leadsMsgmBench = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
              if (txConversaoVendasBench > 0 && leadsMsgmBench > 0) {
                const vendasValue = Math.floor(leadsMsgmBench * txConversaoVendasBench / 100);
                newRow.benchmark = formatNumber(vendasValue);
              } else {
                // 🎯 CORREÇÃO: Se leads/msgm = 0, vendas = 0
                newRow.benchmark = formatNumber(0);
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
              newRow.benchmark = `${roiPercentBench.toFixed(0).replace('.', ',')}% (${roiMultiplierBench.toFixed(1).replace('.', ',')}x)`;
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

  // 🎯 NOVO: Recalcular automaticamente quando toggle muda
  useEffect(() => {
    if (hasInitialLoad) {
      // Recalcular valores quando toggle muda
      const calculatedData = calculateValues(tableData);
      setTableData(calculatedData);
    }
  }, [agendamentosEnabled, hasInitialLoad]);

  // 🎯 NOVO: Salvar estado do toggle no localStorage
  useEffect(() => {
    localStorage.setItem('agendamentosEnabled', JSON.stringify(agendamentosEnabled));
    
    // 🎯 NOVO: Disparar evento customizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('agendamentosEnabledChanged', {
      detail: { agendamentosEnabled }
    }));
  }, [agendamentosEnabled]);

  // Recalcular valores quando ticket médio mudar
  useEffect(() => {
    const calculatedData = calculateValues(tableData);
    setTableData(calculatedData);
    
    // 🎯 NOVO: Disparar evento imediato quando ticket médio muda (antes mesmo de salvar)
    if (ticketMedio !== 250 && selectedProduct && selectedMonth && selectedClient && ticketMedioEditedByUser) {
      
      window.dispatchEvent(new CustomEvent('ticketMedioChangedImmediate', {
        detail: {
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient,
          ticketMedio: ticketMedio,
          timestamp: new Date().toISOString()
        }
      }));
    }
  }, [ticketMedio, selectedProduct, selectedMonth, selectedClient, ticketMedioEditedByUser]);

  // Salvar ticketMedio automaticamente quando alterado
  useEffect(() => {
    // Só salvar se não for o valor padrão inicial e se há produto/mês/cliente selecionado
    if (ticketMedio !== 250 && selectedProduct && selectedMonth && selectedClient) {
      
      // 🎯 CORREÇÃO: Marcar que foi editado pelo usuário
      if (!ticketMedioEditedByUser) {
        setTicketMedioEditedByUser(true);
      }
      
              // Rate limit removido - executar imediatamente
        // Calcular CPV e ROI para salvar
        const cpvRow = tableData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
        const roiRow = tableData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');
        
        const cpv = parseNumber(cpvRow?.realValue || '0');
        const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');
        
        // Calcular investimento total
        const investmentRow = tableData.find(r => r.metric === 'Investimento pretendido (Mês)');
        const totalInvestment = parseCurrency(investmentRow?.realValue || '0');
        
        
        
        metricsService.saveMonthlyDetails({
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient,
          agendamentos: savedDetails.agendamentos,
          vendas: savedDetails.vendas,
          ticketMedio: ticketMedio,
          cpv: cpv,
          roi: roiValue
        }).then(() => {
          // 🎯 NOVO: Salvar também nos benchmarks para persistir ao trocar período
          saveBenchmarkValues(tableData);
          
          // 🎯 NOVO: Disparar evento para atualizar histórico em tempo real
          window.dispatchEvent(new CustomEvent('ticketMedioChanged', {
            detail: {
              month: selectedMonth,
              product: selectedProduct,
              client: selectedClient,
              ticketMedio: ticketMedio,
              timestamp: new Date().toISOString()
            }
          }));
        }).catch(error => {
          console.error('Erro ao salvar ticket médio:', error);
        });
      // Rate limit removido - sem debounce
    }
  }, [ticketMedio, selectedProduct, selectedMonth, selectedClient, savedDetails.agendamentos, savedDetails.vendas]);

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
      
      // 🎯 CORREÇÃO: Marcar que foi editado pelo usuário ANTES de atualizar o estado
      setTicketMedioEditedByUser(true);
      
      // Atualizar o estado do ticket médio
      setTicketMedio(newValue);
      
              // 🎯 NOVO: Salvar imediatamente no Firebase
        if (selectedProduct && selectedMonth && selectedClient) {
          
          // Calcular CPV e ROI para salvar
          const cpvRow = tableData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
          const roiRow = tableData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');
          
          const cpv = parseNumber(cpvRow?.realValue || '0');
          const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');
          
          // Calcular investimento total
          const investmentRow = tableData.find(r => r.metric === 'Investimento pretendido (Mês)');
          const totalInvestment = parseCurrency(investmentRow?.realValue || '0');
        
        metricsService.saveMonthlyDetails({
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient,
          agendamentos: savedDetails.agendamentos,
          vendas: savedDetails.vendas,
          ticketMedio: newValue, // Usar o novo valor
          cpv: cpv,
          roi: roiValue
                  }).then(() => {
            // 🎯 NOVO: Salvar também nos benchmarks para persistir ao trocar período
            saveBenchmarkValues(tableData);
          
          // 🎯 NOVO: Disparar evento para atualizar histórico em tempo real
          window.dispatchEvent(new CustomEvent('ticketMedioChanged', {
            detail: {
              month: selectedMonth,
              product: selectedProduct,
              client: selectedClient,
              ticketMedio: newValue,
              timestamp: new Date().toISOString()
            }
          }));
        }).catch(error => {
          console.error('❌ DEBUG - MonthlyDetailsTable - handleTicketSave - Erro ao salvar ticket médio:', error);
        });
      }
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
      
      // 🎯 CORREÇÃO: Garantir que campos vazios sejam convertidos para '0'
      if (!editValue || editValue.trim() === '') {
        if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') || 
            row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro')) {
          finalValue = 'R$ 0,00';
        } else if (row.metric.includes('CTR') || row.metric.includes('Tx.')) {
          finalValue = '0,00%';
        } else {
          finalValue = '0';
        }
      } else if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') || 
          row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro')) {
        finalValue = formatBRLFromDigits(editRawValue);
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.')) {
        finalValue = formatPercentFromDigits(editRawPercent);
      }
      
      newData[editingCell.rowIndex][editingCell.field] = finalValue;
      
      // CORREÇÃO: Recalcular valores dependentes e status
      const recalculatedData = calculateValues(newData, row.metric);
      setTableData(recalculatedData);
      
      // Salvar benchmarks se foi editado na coluna benchmark
      if (editingCell.field === 'benchmark') {
        
        
        
        // 🎯 MARCAR COMO EDITADO PELO USUÁRIO (igual ao Ticket Médio)
        setBenchmarkFieldsEditedByUser(prev => ({
          ...prev,
          [row.metric]: true
        }));
        
        // 🎯 SALVAR APENAS SE FOI EDITADO PELO USUÁRIO
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
        
        // Calcular investimento total
        const investmentRow = recalculatedData.find(r => r.metric === 'Investimento pretendido (Mês)');
        const totalInvestment = parseCurrency(investmentRow?.realValue || '0');
        
        
        
        // Salvar no Firebase
        if (selectedProduct && selectedMonth) {
          // CORREÇÃO: Incluir o cliente selecionado ao salvar
          const clientForSave = selectedClient || localStorage.getItem('selectedClient') || 'Cliente Padrão';
          
          
          
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
      'Visitantes na página (LPV)': 'Número de pessoas que visitaram sua página de destino após clicar no anúncio',
      'Leads / Msgs': 'Número de pessoas que enviaram mensagem ou se interessaram pelo seu produto',
      'Tx. Mensagens (Leads/Cliques)': 'Porcentagem de pessoas que visitaram a página (LPV) ou clicaram e depois enviaram mensagem',
      'CPL (Custo por Lead)': 'Quanto você gasta para conseguir cada pessoa interessada',
      'Agendamentos': 'Número de consultas ou reuniões agendadas com clientes',
      'Tx. Agendamento (Agend./Leads)': 'Porcentagem de leads que viraram agendamentos',
      'Vendas': 'Número total de vendas realizadas através dos anúncios',
              'Tx. Conversão Vendas (Vendas/Leads ou Agend.)': agendamentosEnabled 
          ? 'Porcentagem de agendamentos que viraram vendas'
          : 'Porcentagem de leads/mensagens que viraram vendas',
      'CPV (Custo por Venda)': 'Quanto você gasta para conseguir cada venda',
      'Lucro': 'Receita total menos o investimento em anúncios',
      'ROI / ROAS': 'Retorno sobre investimento / Return on Ad Spend. Quanto você ganha de volta para cada real investido'
    };
    return tooltips[metric] || 'Informação sobre esta métrica';
  };

  // Utilitário local: obter início/fim do mês a partir do label (ex.: "Agosto 2025")
  const getMonthDateRange = (monthLabel: string): { startDate: string; endDate: string } => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [name, yearStr] = (monthLabel || '').split(' ');
    const year = parseInt(yearStr || '', 10) || new Date().getFullYear();
    const monthIndex = Math.max(0, months.indexOf(name));
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
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
    // CORREÇÃO: Tratamento especial para CPV quando valor real é zero ou R$ 0,00
    if (metric === 'CPV (Custo por Venda)' && (realValue === 'R$ 0,00' || realValue === '0' || parseCurrency(realValue) === 0)) {
      return { status: '', statusColor: 'neutral' };
    }

    // Campos que não devem ter status (mantêm "-")
    const noStatusFields = [
      'Investimento pretendido (Mês)',
      'Impressões',
      'Cliques',
      'Visitantes na página (LPV)',
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

    // CORREÇÃO: Se o valor real é zero, não deve ter status (exceto para alguns campos específicos)
    if (realNum === 0) {
      // Campos que podem ter status mesmo com valor zero
      const canHaveStatusWhenZero = ['CTR', 'Tx. Mensagens', 'Tx. Agendamento', 'Tx. Conversão Vendas'];
      const canHaveStatus = canHaveStatusWhenZero.some(field => metric.includes(field));
      
      if (!canHaveStatus) {
        return { status: '', statusColor: 'neutral' };
      }
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
    <div className="bg-slate-900 rounded-xl border border-slate-600 shadow-xl overflow-hidden">
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
                  {(() => {
                    // Contar quantos ad sets tiveram gasto > 0 no período selecionado
                    const { startDate, endDate } = getMonthDateRange(selectedMonth);
                    const periodSpendByAd: Record<string, number> = {};
                    (metrics || []).forEach((m: any) => {
                      const d = new Date(m.date);
                      const inPeriod = d >= new Date(startDate) && d <= new Date(endDate);
                      if (!inPeriod) return;
                      const key = m.adSetId || m.adset_id || m.adSet || m.audience || 'unknown';
                      const spend = Number(m.investment || m.spend || 0) || 0;
                      periodSpendByAd[key] = (periodSpendByAd[key] || 0) + spend;
                    });
                    const activeCount = Object.values(periodSpendByAd).filter(v => (v || 0) > 0).length;
                    return `✓ ${activeCount} conjunto${activeCount !== 1 ? 's' : ''} de anúncio sincronizado${activeCount !== 1 ? 's' : ''}`;
                  })()}
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
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-750">
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-2/5 border-r border-slate-600/50">Métrica</th>
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-1/5 border-r border-slate-600/50">Benchmark/Projeção</th>
              <th className="text-left p-5 text-slate-200 font-semibold text-sm uppercase tracking-wide w-1/5 border-r border-slate-600/50">
                <div className="flex items-center justify-between">
                  <span>Valores Reais</span>
                  <button
                    onClick={handleRefreshRealValues}
                    disabled={isRefreshingRealValues}
                    className={`flex items-center justify-center p-1.5 rounded transition-all duration-200 ${
                      isRefreshingRealValues
                        ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                        : 'bg-slate-700/80 text-slate-200 border border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500/50'
                    }`}
                    title="Atualizar valores reais da API"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingRealValues ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </th>
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
                      {category === 'Funil de Agendamento' && (
                        <div className="flex items-center space-x-2 ml-3">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgendamentosEnabled(!agendamentosEnabled);
                            }}
                            className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                              agendamentosEnabled
                                ? 'bg-green-900/40 text-green-400 border border-green-500/30 hover:bg-green-800/50'
                                : 'bg-red-900/40 text-red-400 border border-red-500/30 hover:bg-red-800/50'
                            }`}
                            title={agendamentosEnabled ? 'Desabilitar Funil de Agendamento' : 'Habilitar Funil de Agendamento'}
                          >
                            {agendamentosEnabled ? 'USANDO' : 'SEM USO'}
                          </button>
                        </div>
                      )}
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
                          (row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                            ? 'bg-slate-900/60 opacity-50 cursor-not-allowed'
                            : row.benchmarkEditable 
                              ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'benchmark'
                                ? 'bg-indigo-900/40 cursor-pointer transition-all duration-200 shadow-sm'
                                : getBenchmarkAutoState(row.metric)
                                  ? 'bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-all duration-200'
                                  : 'bg-slate-700/60 cursor-pointer hover:bg-slate-700/80 transition-all duration-200'
                              : 'bg-slate-800/40'
                        }`}
                        onClick={(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? undefined : () => handleCellClick(globalIndex, 'benchmark', row.benchmark)}
                        onMouseEnter={() => row.benchmarkEditable && row.metric !== 'Agendamentos' && row.metric !== 'Tx. Agendamento (Agend./Leads)' && setIsHovered({rowIndex: globalIndex, field: 'benchmark'})}
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
                            <span className={`text-base font-semibold ${(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? 'text-slate-500' : 'text-slate-100'}`}>
                              {(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? 'Desabilitado' : row.benchmark}
                            </span>
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
                          (row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                            ? 'bg-slate-900/60 opacity-50 cursor-not-allowed border-l-4 border-gray-500/30'
                            : row.realValueEditable 
                              ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'realValue'
                                ? 'bg-emerald-900/40 cursor-pointer transition-all duration-200 border-l-4 border-emerald-400 shadow-sm'
                                : 'bg-slate-700/60 cursor-pointer hover:bg-emerald-900/30 transition-all duration-200 border-l-4 border-transparent hover:border-emerald-400/60'
                              : 'bg-slate-800/40 border-l-4 border-blue-500/30'
                        }`}
                        onClick={(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? undefined : (row.realValueEditable ? () => handleCellClick(globalIndex, 'realValue', row.realValue) : undefined)}
                        onMouseEnter={(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? undefined : (row.realValueEditable ? () => setIsHovered({rowIndex: globalIndex, field: 'realValue'}) : undefined)}
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
                            <span className={`text-base font-semibold ${(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? 'text-slate-500' : 'text-slate-100'}`}>
                              {(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? 'Desabilitado' : row.realValue}
                            </span>
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
                      <td className={`p-5 w-1/5 text-left ${
                        (row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                          ? 'opacity-50'
                          : ''
                      }`}>
                        <div className="flex items-center space-x-3">
                          <span className={`text-sm font-medium ${
                            (row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                              ? 'text-slate-500'
                              : 'text-slate-300'
                          }`}>
                            {(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? '-' : row.status}
                          </span>
                          <div className="flex items-center">
                            {(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? null : getStatusIcon(row.statusColor)}
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