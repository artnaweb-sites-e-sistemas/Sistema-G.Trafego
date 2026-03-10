import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, AlertCircle, Info, RefreshCw, RefreshCcw, Activity, Edit2, TrendingUp, TrendingDown, Minus, ArrowRight, Play, Edit3, MessageCircle } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';



interface MonthlyDetailsTableProps {
  metrics: MetricData[];
  selectedProduct?: string;
  selectedClient?: string;
  selectedMonth?: string;
  onValuesChange?: (values: { agendamentos: number; vendas: number; seguidoresNovos: number; cpaTarget?: number; monthlyBudget?: number; funnelType?: string; agendamentosEnabled?: boolean }) => void;
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

// Cliente efetivo para save/load no Firebase (evita "" ou valores inválidos)
const getEffectiveClient = (client?: string): string => {
  const c = (client || '').trim();
  if (!c || c === 'Selecione um cliente' || c === 'Todos os Clientes') return 'Cliente Padrão';
  return c;
};

const MonthlyDetailsTable: React.FC<MonthlyDetailsTableProps> = ({
  metrics = [],
  selectedProduct = '',
  selectedClient = '',
  selectedMonth = 'Janeiro 2025',
  onValuesChange,

}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const effectiveClient = getEffectiveClient(selectedClient);
  const [tooltipStates, setTooltipStates] = useState<{ [key: string]: boolean }>({});

  // 🎯 NOVO: Controle para campos de valores reais editáveis (automático vs manual)
  const [realValueAuto, setRealValueAuto] = useState(() => {
    const saved = localStorage.getItem('realValueAuto');
    return saved ? JSON.parse(saved) : { Vendas: true, Agendamentos: true };
  });

  const getRealValueAutoState = (metric: string) => {
    if (metric === 'Vendas') return realValueAuto.Vendas !== false;
    if (metric === 'Agendamentos') return false; // Agendamentos sempre manual
    if (metric === 'Seguidores Novos') return false; // Seguidores Novos sempre manual
    return true; // Default auto
  };

  const toggleRealValueAuto = (metric: string) => {
    setRealValueAuto((prev: any) => {
      const newState = { ...prev };
      if (metric === 'Vendas') newState.Vendas = !prev.Vendas;
      localStorage.setItem('realValueAuto', JSON.stringify(newState));
      return newState;
    });
  };  // Função para salvar valores de benchmark no Firebase
  const saveBenchmarkValues = async (data: any[], overrideTicketMedio?: number) => {
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
        const ticketToSave = overrideTicketMedio !== undefined ? overrideTicketMedio : ticketMedio;
        if (ticketToSave && ticketToSave !== 250) {
          benchmarkValues['Ticket Médio (Bench)'] = formatCurrency(ticketToSave);
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

                // 🎯 MARCAR QUE O CARREGAMENTO TERMINOU
                setBenchmarkLoadCompleted(true);

                // 🎯 CORREÇÃO: Não recalcular automaticamente após carregar valores salvos
                return updatedData;
              });
            } catch (error) {
              console.error('Erro ao carregar benchmarks do localStorage:', error);
              setBenchmarkLoadCompleted(true);
            }
          } else {
            // NENHUM DADO, MAS CARREGAMENTO TERMINOU
            setBenchmarkLoadCompleted(true);
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
            setBenchmarkLoadCompleted(true);
          }
        } else {
          setBenchmarkLoadCompleted(true);
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

  // 🎯 NOVO LISENTER: Escutar evento para recarregar benchmarks de fontes externas
  useEffect(() => {
    const handleReload = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        const { month, client, product } = customEvent.detail;
        if (month === selectedMonth && client === selectedClient && product === selectedProduct) {
          // Recarregar os valores sem alterar os que o usuário já editou ativamente
          await loadBenchmarkValues();
        }
      }
    };

    window.addEventListener('recarregarBenchmarks', handleReload);
    return () => window.removeEventListener('recarregarBenchmarks', handleReload);
  }, [selectedMonth, selectedClient, selectedProduct]);

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
    // Remover símbolos de moeda e letras
    let cleanValue = value.replace(/[^\d,.-]/g, '');

    // 🎯 LÓGICA BRASILEIRA: 
    // No Brasil, ponto é SEMPRE separador de milhares, vírgula é separador decimal
    if (cleanValue.includes('.') && cleanValue.includes(',')) {
      // Ex: "2.246,50" -> 2246.50
      cleanValue = cleanValue.replace(/\./g, '').replace(',', '.');
    } else if (cleanValue.includes('.') && !cleanValue.includes(',')) {
      // Ex: "1.500" -> 1500
      cleanValue = cleanValue.replace(/\./g, '');
    } else if (cleanValue.includes(',') && !cleanValue.includes('.')) {
      // Ex: "2,5" -> 2.5
      cleanValue = cleanValue.replace(',', '.');
    }

    const result = parseFloat(cleanValue);
    return isNaN(result) ? 0 : result;
  };

  // Função específica para extrair ROI de formato "232% (3.3x)"
  const parsePercentage = (val: string): number => {
    if (!val || val === '-' || val.includes('Muito abaixo')) return 0;
    return parseFloat(val.replace('%', '').replace(',', '.'));
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
      benchmarkEditable: false,
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
      benchmarkEditable: false,
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
      metric: '% VIS. PÁG. (LPV/Cliques)',
      benchmark: '80,00%',
      realValue: '0,00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Custo por Visita (Custo/LPV)',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Tx. Mensagens (Leads/Cliques)',
      benchmark: '40,00%', // Taxa padrão: 40% dos cliques convertem em leads
      realValue: '0,00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPL (Custo por Lead)',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
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
      realValueEditable: true
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
      realValueEditable: true
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
    },

    // Resultados de Audiência
    {
      category: 'Resultados de Audiência',
      metric: 'Custo por Seguidor',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Resultados de Audiência',
      metric: 'Custo por Alcance (CPM)',
      benchmark: formatCurrency(0),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Resultados de Audiência',
      metric: 'Alcance',
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Resultados de Audiência',
      metric: 'Seguidores Novos',
      benchmark: formatNumber(0),
      realValue: formatNumber(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: true
    },
    {
      category: 'Resultados de Audiência',
      metric: 'Tx. Conversão Audiência (Seg./Alcance)',
      benchmark: '10,00%',
      realValue: '0,00%',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: false
    }
  ];

  // 🎯 NOVO: Estado para controlar se a linha de Agendamentos está ativa
  const [agendamentosEnabled, setAgendamentosEnabled] = useState(() => {
    // 🎯 NOVO: Carregar estado do localStorage ou usar true como padrão
    const saved = localStorage.getItem('agendamentosEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  type FunnelType = 'WHATSAPP' | 'LEADS' | 'DIRETA' | 'AUDIENCIA';

  // 🎯 NOVO: Estado para controlar o tipo de Funil de Conversão
  const [funnelType, setFunnelType] = useState<FunnelType>(() => {
    const saved = localStorage.getItem('funnelType');
    return saved ? JSON.parse(saved) as FunnelType : 'LEADS';
  });

  // Estado para controlar os dados editáveis
  const [tableData, setTableData] = useState<TableRow[]>(getInitialTableData());

  // Estado para controlar qual célula está sendo editada
  const [editingCell, setEditingCell] = useState<{ rowIndex: number, field: 'benchmark' | 'realValue' } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isHovered, setIsHovered] = useState<{ rowIndex: number, field: 'benchmark' | 'realValue' } | null>(null);

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
  const [lastNotifiedValues, setLastNotifiedValues] = useState({ agendamentos: 0, vendas: 0, seguidoresNovos: 0, cpaTarget: 0, monthlyBudget: 0, funnelType: '', agendamentosEnabled: true });

  // Estado para armazenar dados editáveis salvos
  const [savedDetails, setSavedDetails] = useState<{
    agendamentos: number;
    vendas: number;
    seguidoresNovos: number;
    ticketMedio: number;
    cpv: number;
    roi: string;
    monthlyBudget?: number;
  }>({
    agendamentos: 0,
    vendas: 0,
    seguidoresNovos: 0,
    ticketMedio: 250,
    cpv: 0,
    roi: '0% (0.0x)',
    monthlyBudget: 0
  });
  // 🎯 FIX: Dirty-state para rastrear campos editados manualmente (evita race condition com audience sync)
  const dirtyFieldsRef = useRef<Set<string>>(new Set());

  // 🎯 FIX: Flag para pular a próxima execução do audience sync após load do Firebase
  const skipAudienceSyncRef = useRef(false);

  // Estado para armazenar dados calculados dos públicos
  const [audienceCalculatedValues, setAudienceCalculatedValues] = useState({ agendamentos: 0, vendas: 0 });

  // 🎯 NOVO: Estado para controle de atualização dos valores reais
  const [isRefreshingRealValues, setIsRefreshingRealValues] = useState(false);

  // Carregar dados dos públicos para a campanha selecionado  
  const loadAudienceData = useCallback(async (forceRefresh: boolean = false) => {
    if (selectedProduct && selectedProduct !== 'Todas as Campanhas' && selectedMonth) {
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

  // Carregar dados salvos do Firebase quanda campanha ou mês mudar
  useEffect(() => {
    const loadSavedDetails = async () => {
      // Reset do estado inicial ao mudar seleção
      setHasInitialLoad(false);
      // 🎯 FIX: Limpar dirty fields ao trocar mês/produto (nova seleção = dados novos do Firebase)
      dirtyFieldsRef.current.clear();

      if (selectedProduct && selectedMonth) {
        try {
          const details = await metricsService.getMonthlyDetails(
            selectedMonth,
            selectedProduct,
            effectiveClient
          );
          console.log('🔍 DEBUG - loadSavedDetails - Dados recebidos do Firebase:', details);

          // CORREÇÃO: Garantir que sempre tenham valores válidos
          const newSavedDetails = {
            agendamentos: details.agendamentos || 0,
            vendas: details.vendas || 0,
            seguidoresNovos: (details as any).seguidoresNovos || 0,
            ticketMedio: details.ticketMedio || 250,
            cpv: (details as any).cpv || 0,
            roi: (details as any).roi || '0% (0.0x)',
            monthlyBudget: (details as any).monthlyBudget || 0
          };
          setSavedDetails(newSavedDetails);

          // Restaurar funnelType salvo no Firestore (sobrepõe localStorage se existir)
          if ((details as any).funnelType) {
            setFunnelType((details as any).funnelType as FunnelType);
          }
          console.log('🔍 DEBUG - loadSavedDetails - savedDetails atualizado:', newSavedDetails);

          // CORREÇÃO: Aplicar valores salvos ao tableData (Agendamentos, Vendas, Seguidores Novos, CPV, ROI)
          // 🎯 FIX: Sinalizar para o audience sync NÃO sobrescrever esses valores
          skipAudienceSyncRef.current = true;

          setTableData(prevData => {
            console.log('🔍 DEBUG - loadSavedDetails - atualizando tableData. prevData length:', prevData.length);
            const newData = prevData.map(row => {
              const newRow = { ...row };

              // 🎯 FIX: SEMPRE aplicar valores do Firebase, independente do modo auto/manual
              if (row.metric === 'Agendamentos') {
                newRow.realValue = formatNumber(newSavedDetails.agendamentos);
                console.log('🔍 DEBUG - loadSavedDetails - Aplicou Agendamentos:', newRow.realValue);
              }

              if (row.metric === 'Vendas') {
                newRow.realValue = formatNumber(newSavedDetails.vendas);
                console.log('🔍 DEBUG - loadSavedDetails - Aplicou Vendas:', newRow.realValue);
              }

              if (row.metric === 'Seguidores Novos') {
                newRow.realValue = formatNumber(newSavedDetails.seguidoresNovos);
                console.log('🔍 DEBUG - loadSavedDetails - Aplicou Seguidores Novos:', newRow.realValue);
              }

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
            const finalData = calculateValues(newData);
            console.log('🔍 DEBUG - loadSavedDetails - tableData final atualizado');
            return finalData;
          });

          // Carregar também os valores de benchmark salvos
          loadBenchmarkValues();
        } catch (error) {
          console.error('Erro ao carregar detalhes salvos:', error);
          // CORREÇÃO: Garantir valores padrão em caso de erro
          setSavedDetails({ agendamentos: 0, vendas: 0, seguidoresNovos: 0, ticketMedio: 250, cpv: 0, roi: '0% (0.0x)', monthlyBudget: 0 });
        }
      } else {
        // Limpar dados salvos se não há produto selecionado
        // CORREÇÃO: Garantir valores padrão quando não há seleção
        setSavedDetails({ agendamentos: 0, vendas: 0, seguidoresNovos: 0, ticketMedio: 250, cpv: 0, roi: '0% (0.0x)', monthlyBudget: 0 });
      }
    };

    loadSavedDetails();
  }, [selectedMonth, selectedProduct, effectiveClient]);

  // 🎯 FIX: Reaplicar valores do Firebase após um tick (garante que prevaleçam sobre outros useEffects)
  useEffect(() => {
    if (!selectedProduct || !selectedMonth || (editingCell?.field === 'realValue')) return;
    const timer = setTimeout(() => {
      setTableData(prev => {
        let changed = false;
        const updated = prev.map(row => {
          if (row.metric === 'Agendamentos') {
            const v = formatNumber(savedDetails.agendamentos);
            if (row.realValue !== v) { changed = true; return { ...row, realValue: v }; }
          }
          if (row.metric === 'Vendas') {
            const v = formatNumber(savedDetails.vendas);
            if (row.realValue !== v) { changed = true; return { ...row, realValue: v }; }
          }
          if (row.metric === 'Seguidores Novos') {
            const v = formatNumber(savedDetails.seguidoresNovos);
            if (row.realValue !== v) { changed = true; return { ...row, realValue: v }; }
          }
          return row;
        });
        return changed ? calculateValues(updated) : prev;
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [savedDetails.agendamentos, savedDetails.vendas, savedDetails.seguidoresNovos, selectedProduct, selectedMonth, editingCell?.field]);

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
          selectedProduct !== 'Todas as Campanhas';

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
    // 🎯 FIX: Pular esta execução se acabamos de carregar do Firebase
    // Isso evita que audienceCalculatedValues (que pode ser 0) sobrescreva os valores reais
    if (skipAudienceSyncRef.current) {
      skipAudienceSyncRef.current = false;
      console.log('🔍 DEBUG - useEffect[audienceSync] - PULADO (dados recém-carregados do Firebase)');
      return;
    }

    // 🎯 CORREÇÃO: Só aguardar carregamento na primeira vez, não quando usuário edita
    const isInitialLoad = !ticketMedioEditedByUser &&
      ticketMedio === 250 &&
      savedDetails.ticketMedio > 0 &&
      savedDetails.ticketMedio !== 250;

    if (isInitialLoad) {

      return; // Só bloquear na primeira carga, não quando usuário edita
    }



    console.log('🔍 DEBUG - useEffect[audienceCalculatedValues] - Iniciando sincronização. AutoStates:', {
      Agendamentos: getRealValueAutoState('Agendamentos'),
      Vendas: getRealValueAutoState('Vendas')
    });
    setTableData(prevData => {
      const newData = prevData.map(row => {
        const newRow = { ...row };

        if (row.metric === 'Agendamentos') {
          // 🎯 FIX: Se o campo foi editado pelo usuário (dirty), preservar o valor atual do tableData
          if (dirtyFieldsRef.current.has('Agendamentos')) {
            // Manter valor atual — já foi atualizado pelo handleSave
          } else if (getRealValueAutoState('Agendamentos')) {
            newRow.realValue = formatNumber(audienceCalculatedValues.agendamentos);
          } else {
            // Se manual e não dirty, usar valor do savedDetails
            newRow.realValue = formatNumber(savedDetails.agendamentos || 0);
          }
        }

        if (row.metric === 'Vendas') {
          // 🎯 FIX: Se o campo foi editado pelo usuário (dirty), preservar o valor atual do tableData
          if (dirtyFieldsRef.current.has('Vendas')) {
            // Manter valor atual — já foi atualizado pelo handleSave
          } else if (getRealValueAutoState('Vendas')) {
            newRow.realValue = formatNumber(audienceCalculatedValues.vendas);
          } else {
            // Se manual e não dirty, usar valor do savedDetails
            newRow.realValue = formatNumber(savedDetails.vendas || 0);
          }
        }

        if (row.metric === 'Seguidores Novos') {
          // 🎯 FIX: Se o campo foi editado pelo usuário (dirty), preservar o valor atual do tableData
          if (dirtyFieldsRef.current.has('Seguidores Novos')) {
            // Manter valor atual — já foi atualizado pelo handleSave
          } else {
            newRow.realValue = formatNumber(savedDetails.seguidoresNovos || 0);
          }
        }

        // CORREÇÃO: Preservar valores salvos de CPV e ROI, não recalcular
        // Os valores de CPV e ROI devem vir dos dados salvos, não ser recalculados

        return newRow;
      });

      // 🎯 CORREÇÃO: Não recalcular automaticamente após sincronização
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
        // 🎯 FIX: Para campos manuais, usar savedDetails (valor do usuário); para auto, usar audience
        const agendamentosToSave = getRealValueAutoState('Agendamentos')
          ? audienceCalculatedValues.agendamentos
          : savedDetails.agendamentos;
        const vendasToSave = getRealValueAutoState('Vendas')
          ? audienceCalculatedValues.vendas
          : savedDetails.vendas;

        // Salvar no Firebase quando os valores dos públicos mudam
        if (selectedProduct && selectedMonth) {
          // Calcular CPV e ROI para salvar
          const cpvRow = finalData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
          const roiRow = finalData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');

          const cpv = parseNumber(cpvRow?.realValue || '0');
          const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');

          // 🎯 FIX: SÓ SALVAR SE VALORES AUTO MUDARAM (não sobrescrever campos manuais com 0)
          const autoAgendamentosChanged = getRealValueAutoState('Agendamentos') &&
            audienceCalculatedValues.agendamentos !== savedDetails.agendamentos;
          const autoVendasChanged = getRealValueAutoState('Vendas') &&
            audienceCalculatedValues.vendas !== savedDetails.vendas;

          if (autoAgendamentosChanged || autoVendasChanged) {
            const audienceBudget = parseCurrency(finalData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            metricsService.saveMonthlyDetails({
              month: selectedMonth,
              product: selectedProduct,
              client: effectiveClient,
              agendamentos: agendamentosToSave,
              vendas: vendasToSave,
              seguidoresNovos: savedDetails.seguidoresNovos,
              cpv: cpv,
              roi: roiValue,
              funnelType,
              monthlyBudget: audienceBudget,
              agendamentosEnabled
            }).catch(error => {
              console.error('Erro ao salvar valores dos públicos:', error);
            });
          }
        }

        // 🎯 CORREÇÃO: Removido onValuesChange daqui para evitar warning
        // Será chamado em um useEffect separado
      }

      return finalData;
    });
  }, [audienceCalculatedValues, ticketMedio, savedDetails, ticketMedioEditedByUser, selectedProduct, selectedMonth, effectiveClient]);



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

  // Atualizar métricas quando houver mudança na campanha selecionado ou nas métricas
  useEffect(() => {
    console.log('🔍 DEBUG - useEffect[metrics] - Iniciando. metrics length:', metrics?.length);
    if (!metrics || metrics.length === 0) {
      console.log('🔍 DEBUG - useEffect[metrics] - Sem métricas, usando fallback...');


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
            case 'Custo por Visita (Custo/LPV)':
              newRow.realValue = formatCurrency(0);
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
              // 🎯 FIX: Preservar valor existente do tableData (loadSavedDetails já aplicou)
              // NÃO sobrescrever com audienceCalculatedValues — pode ser 0 durante load
              newRow.realValueEditable = true;
              break;
            case 'Vendas':
              // 🎯 FIX: Preservar valor existente do tableData (loadSavedDetails já aplicou)
              newRow.realValueEditable = true;
              break;
            case 'Seguidores Novos':
              // 🎯 FIX: Preservar valor existente do tableData (loadSavedDetails já aplicou)
              newRow.realValueEditable = true;
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
          const hasRealData = aggregated.totalInvestment > 0 || aggregated.totalLeads > 0 || aggregated.totalClicks > 0 || aggregated.totalLPV > 0 || aggregated.totalFollowers > 0;




          // Definir quais campos são sincronizados automaticamente com Meta Ads
          switch (row.metric) {
            case 'Investimento pretendido (Mês)':
              // 🎯 CORREÇÃO: Priorizar dados do Meta Ads se existirem, senão usar o que estiver no banco
              if (hasRealData && aggregated.totalInvestment > 0) {
                newRow.realValue = formatCurrency(aggregated.totalInvestment);
              } else if (savedDetails.monthlyBudget && savedDetails.monthlyBudget > 0) {
                // Se houver investimento salvo mas não tiver no Meta Ads no momento
                newRow.realValue = formatCurrency(savedDetails.monthlyBudget);
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
            case 'Custo por Visita (Custo/LPV)':
              // 🎯 CORREÇÃO: Sincronizar com Custo / LPV
              if (hasRealData && aggregated.totalLPV > 0) {
                newRow.realValue = formatCurrency(aggregated.totalInvestment / aggregated.totalLPV);
              } else {
                newRow.realValue = formatCurrency(0);
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
              // 🎯 FIX: Preservar valor existente no tableData (já aplicado por loadSavedDetails)
              // Não ler savedDetails aqui — stale closure causa sobrescrita com 0
              newRow.realValueEditable = true;
              break;
            case 'Vendas':
              // 🎯 FIX: Preservar valor existente no tableData
              newRow.realValueEditable = true;
              break;
            case 'Seguidores Novos':
              // 🎯 FIX: Preservar valor existente no tableData (sempre manual)
              newRow.realValueEditable = true;
              break;
            case 'Custo por Seguidor':
              // 🎯 CORREÇÃO: Removido o cálculo fixo aqui. O cálculo será feito pelo `calculateValues`
              newRow.realValueEditable = false;
              break;
            default:
              break;
          }

          // CORREÇÃO: Calcular status dinamicamente baseado nos valores reais vs benchmark
          const statusResult = calculateStatus(row.metric, newRow.realValue, newRow.realValue);
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

  // 🎯 CORREÇÃO: useEffect separado para notificar mudanças de valores e mesclar reais manuais
  useEffect(() => {
    if (onValuesChange) {
      // 🎯 FIX: Sempre usar valores do tableData (source of truth) — eles já refletem
      // o Firebase load, a edição manual, ou o cálculo automático (o que vier por último)
      const manualAgendamentosStr = tableData.find(r => r.metric === 'Agendamentos')?.realValue || '0';
      const manualVendasStr = tableData.find(r => r.metric === 'Vendas')?.realValue || '0';

      const agendamentos = parseNumber(manualAgendamentosStr);
      const vendas = parseNumber(manualVendasStr);

      // Extract proper CPA target based on current funnel logic
      let currentCpaTargetStr = '0';
      const safeFind = (searchText: string) => {
        return tableData.find(r => r.metric.includes(searchText))?.benchmark || '0';
      };

      if (funnelType === 'AUDIENCIA') {
        currentCpaTargetStr = safeFind('Custo por Seguidor');
      } else if (funnelType === 'DIRETA') {
        currentCpaTargetStr = safeFind('CPV');
      } else {
        currentCpaTargetStr = safeFind('CPL'); // Matches CPL (Custo por Lead)
      }
      const currentCpaTarget = parseCurrency(currentCpaTargetStr);

      // Extract monthly budget from the benchmark/projection column
      const monthlyBudgetStr = safeFind('Investimento pretendido');
      const currentMonthlyBudget = parseCurrency(monthlyBudgetStr);

      const manualSeguidoresNovosStr = tableData.find(r => r.metric === 'Seguidores Novos')?.realValue || '0';
      const seguidoresNovos = parseNumber(manualSeguidoresNovosStr);

      // Evitar loop infinito: só notificar se os valores mudaram
      if (
        agendamentos !== (lastNotifiedValues as any).agendamentos ||
        vendas !== (lastNotifiedValues as any).vendas ||
        seguidoresNovos !== (lastNotifiedValues as any).seguidoresNovos ||
        currentCpaTarget !== (lastNotifiedValues as any).cpaTarget ||
        currentMonthlyBudget !== (lastNotifiedValues as any).monthlyBudget ||
        funnelType !== (lastNotifiedValues as any).funnelType ||
        agendamentosEnabled !== (lastNotifiedValues as any).agendamentosEnabled
      ) {
        const notifyPayload = {
          agendamentos,
          vendas,
          seguidoresNovos,
          cpaTarget: currentCpaTarget,
          monthlyBudget: currentMonthlyBudget,
          funnelType,
          agendamentosEnabled
        };
        setLastNotifiedValues(notifyPayload as any);
        onValuesChange(notifyPayload);
      }
    }
  }, [onValuesChange, lastNotifiedValues, tableData, funnelType, agendamentosEnabled]);

  // 🎯 NOVA FUNÇÃO: Verificar se um campo foi editado pelo usuário (igual ao Ticket Médio)
  const isFieldEditedByUser = (metricName: string): boolean => {
    return benchmarkFieldsEditedByUser[metricName] === true;
  };

  // Função para calcular valores automaticamente
  const calculateValues = (data: TableRow[]): TableRow[] => {
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
        const seguidoresNovos = parseNumber(currentData.find(r => r.metric === 'Seguidores Novos')?.realValue || '0');

        // Obter valores editáveis da coluna BENCHMARK/PROJEÇÃO
        // txMensagens usado para calcular Tx Mensagens Real (Não é lido mais localmente, exceto para benchmark)

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

          case '% VIS. PÁG. (LPV/Cliques)':
            if (cliques > 0) {
              newRow.realValue = formatPercentage((lpv / cliques) * 100);
            }
            break;

          case 'Custo por Visita (Custo/LPV)':
            // 🎯 LÓGICA: Custo/LPV = Investimento / LPV
            if (lpv > 0) {
              newRow.realValue = formatCurrency(investment / lpv);
            }
            break;

          case 'Tx. Mensagens (Leads/Cliques)':
            // 🎯 NOVA LÓGICA: Tx. Mensagens com prioridade para LPV quando disponível
            const lpvForTx = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.realValue || '0');

            // 🎯 PRIORIDADE: Se LPV > 0, usar LPV como base; senão, usar Cliques
            const baseForTx = lpvForTx > 0 ? lpvForTx : cliques;

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
              // 🎯 NOVA LÓGICA: Priorizar DIRETA para usar LPV, senão usar agendamentos/leads conforme toggle
              if (funnelType === 'DIRETA') {
                // 🎯 NOVA LÓGICA: Tx. Conversão Vendas = (Vendas ÷ LPV) × 100%
                if (lpv > 0) {
                  newRow.realValue = formatPercentage((vendas / lpv) * 100);
                } else {
                  newRow.realValue = formatPercentage(0);
                }
              } else if (agendamentosEnabled) {
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

              } catch { }
              newRow.realValue = `${roiPercent.toFixed(0).replace('.', ',')}% (${roiMultiplier.toFixed(1).replace('.', ',')}x)`;
            }
            break;
          case 'Custo por Seguidor':
            // 🎯 NOVO CÁLCULO: Custo por Seguidor = Investimento / Seguidores Novos
            if (seguidoresNovos > 0) {
              newRow.realValue = formatCurrency(investment / seguidoresNovos);
            } else {
              newRow.realValue = formatCurrency(0);
            }
            break;
        }

        // Calcular valores automáticos da coluna BENCHMARK/PROJEÇÃO
        switch (row.metric) {
          case 'Impressões':
            const investmentBenchRaw = currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0';
            const cpmBenchRaw = currentData.find(r => r.metric === 'CPM')?.benchmark || '0';
            const investmentBench = parseCurrency(investmentBenchRaw);
            const cpmBench = parseCurrency(cpmBenchRaw);
            if (cpmBench > 0) newRow.benchmark = formatNumber(Math.round(investmentBench * 1000 / cpmBench));
            break;

          case 'CPC':
            const investmentForCpc = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cliquesForCpc = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
            if (cliquesForCpc > 0) {
              newRow.benchmark = formatCurrency(investmentForCpc / cliquesForCpc);
            } else {
              newRow.benchmark = formatCurrency(0);
            }
            break;

          case 'Cliques':
            const lpvForCliques = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            const visPagForCliques = parsePercentage(currentData.find(r => r.metric === '% VIS. PÁG. (LPV/Cliques)')?.benchmark || '0%');
            if (visPagForCliques > 0) {
              newRow.benchmark = formatNumber(Math.round(lpvForCliques * 100 / visPagForCliques));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'Visitantes na página (LPV)':
            const invBenchLPV = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const custoLpvBench = parseCurrency(currentData.find(r => r.metric === 'Custo por Visita (Custo/LPV)')?.benchmark || '0');
            if (custoLpvBench > 0) {
              newRow.benchmark = formatNumber(Math.round(invBenchLPV / custoLpvBench));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case '% VIS. PÁG. (LPV/Cliques)':
            break;

          case 'Leads / Msgs':
            const invBenchLeads = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const cplBenchInput = parseCurrency(currentData.find(r => r.metric === 'CPL (Custo por Lead)')?.benchmark || '0');
            if (cplBenchInput > 0) {
              newRow.benchmark = formatNumber(Math.round(invBenchLeads / cplBenchInput));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'Tx. Mensagens (Leads/Cliques)':
            const leadsVal = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const lpvVal2 = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            const cliquesVal2 = parseNumber(currentData.find(r => r.metric === 'Cliques')?.benchmark || '0');
            const baseVol = lpvVal2 > 0 ? lpvVal2 : cliquesVal2;
            if (baseVol > 0) {
              newRow.benchmark = formatPercentage((leadsVal / baseVol) * 100);
            } else {
              newRow.benchmark = '0,00%';
            }
            break;

          case 'Agendamentos':
            const leadsBench = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            const txAgendamentoBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0%');
            if (txAgendamentoBench > 0 && leadsBench > 0) {
              newRow.benchmark = formatNumber(Math.floor(leadsBench * txAgendamentoBench / 100));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'Vendas':
            const txConversaoVendasBench = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Leads ou Agend.)')?.benchmark || '0%');
            let baseVendas = 0;
            if (funnelType === 'DIRETA') {
              baseVendas = parseNumber(currentData.find(r => r.metric === 'Visitantes na página (LPV)')?.benchmark || '0');
            } else if (agendamentosEnabled) {
              baseVendas = parseNumber(currentData.find(r => r.metric === 'Agendamentos')?.benchmark || '0');
            } else {
              baseVendas = parseNumber(currentData.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
            }
            if (txConversaoVendasBench > 0 && baseVendas > 0) {
              newRow.benchmark = formatNumber(Math.floor(baseVendas * txConversaoVendasBench / 100));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'CPV (Custo por Venda)':
            const investmentBench4 = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const vendasBench2 = parseNumber(currentData.find(r => r.metric === 'Vendas')?.benchmark || '0');
            if (vendasBench2 > 0) {
              newRow.benchmark = formatCurrency(investmentBench4 / vendasBench2);
            } else {
              newRow.benchmark = formatCurrency(0);
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
            } else {
              newRow.benchmark = '0% (0.0x)';
            }
            break;

          case 'Custo por Seguidor':
            const investmentForFollowers = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const seguidoresBench = parseNumber(currentData.find(r => r.metric === 'Seguidores Novos')?.benchmark || '0');
            if (seguidoresBench > 0) {
              newRow.benchmark = formatCurrency(investmentForFollowers / seguidoresBench);
            } else {
              newRow.benchmark = formatCurrency(0);
            }
            break;

          case 'Alcance':
            const seguidoresForAlcance = parseNumber(currentData.find(r => r.metric === 'Seguidores Novos')?.benchmark || '0');
            const txConvAudiencia = parsePercentage(currentData.find(r => r.metric === 'Tx. Conversão Audiência (Seg./Alcance)')?.benchmark || '0%');
            if (txConvAudiencia > 0 && seguidoresForAlcance > 0) {
              newRow.benchmark = formatNumber(Math.round(seguidoresForAlcance * 100 / txConvAudiencia));
            } else {
              newRow.benchmark = formatNumber(0);
            }
            break;

          case 'Custo por Alcance (CPM)':
            const investmentForCpm = parseCurrency(currentData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
            const alcanceForCpm = parseNumber(currentData.find(r => r.metric === 'Alcance')?.benchmark || '0');
            if (alcanceForCpm > 0) {
              newRow.benchmark = formatCurrency(investmentForCpm * 1000 / alcanceForCpm);
            } else {
              newRow.benchmark = formatCurrency(0);
            }
            break;

          // Tx. Conversão Audiência is editable by the user — no auto-calc needed
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

  // 🎯 NOVO: Salvar estado dos toggles no localStorage e funnelType no Firestore
  useEffect(() => {
    localStorage.setItem('agendamentosEnabled', JSON.stringify(agendamentosEnabled));
    localStorage.setItem('funnelType', JSON.stringify(funnelType));

    // Persistir funnelType no Firestore para sobreviver troca de navegador
    if (selectedProduct && selectedMonth && selectedClient && selectedClient !== 'Todos os Clientes') {
      const currentBudget = parseCurrency(tableData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
      metricsService.saveMonthlyDetails({
        month: selectedMonth,
        product: selectedProduct,
        client: selectedClient,
        funnelType,
        monthlyBudget: currentBudget,
        agendamentosEnabled
      }).catch(() => {});
    }

    // 🎯 NOVO: Disparar evento customizado para notificar outros componentes
    window.dispatchEvent(new CustomEvent('agendamentosEnabledChanged', {
      detail: { agendamentosEnabled }
    }));
  }, [agendamentosEnabled, funnelType]);

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

      // Calcular investimento total (não lido, removido)



      const ticketSaveBudget = parseCurrency(tableData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
      metricsService.saveMonthlyDetails({
        month: selectedMonth,
        product: selectedProduct,
        client: selectedClient,
        ticketMedio: ticketMedio,
        cpv: cpv,
        roi: roiValue,
        funnelType,
        monthlyBudget: ticketSaveBudget,
        agendamentosEnabled
      }).then(() => {
        // 🎯 NOVO: Salvar também nos benchmarks para persistir ao trocar período
        saveBenchmarkValues(tableData, ticketMedio);

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

        // Calcular investimento total (não lido, removido)

        const handleTicketBudget = parseCurrency(tableData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
        metricsService.saveMonthlyDetails({
          month: selectedMonth,
          product: selectedProduct,
          client: selectedClient,
          ticketMedio: newValue, // Usar o novo valor
          cpv: cpv,
          roi: roiValue,
          funnelType,
          monthlyBudget: handleTicketBudget,
          agendamentosEnabled
        }).then(() => {
          // 🎯 NOVO: Salvar também nos benchmarks para persistir ao trocar período
          saveBenchmarkValues(tableData, newValue);

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
      if (row && (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') ||
        row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro') || row.metric.includes('Custo por Visita'))) {
        // Formatar como moeda ao editarígitos do valor atual (moeda)
        const digits = value.replace(/\D/g, '');
        setEditRawValue(digits);
        setEditValue(formatBRLFromDigits(digits));
        setEditRawPercent('');
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.') || row.metric.includes('% VIS. PÁG.')) {
        // Extrair apenas dígitos do valor atual (percentual)
        const digits = value.replace(/\D/g, '');
        setEditRawPercent(digits);
        setEditValue(formatPercentFromDigits(digits));
        setEditRawValue('');
      } else if (row.metric === 'Seguidores Novos' || row.metric === 'Agendamentos' || row.metric === 'Vendas' || row.metric === 'Alcance') {
        // Formatar como número inteiro com separador de milhar
        const digits = value.replace(/\D/g, '');
        setEditRawValue(digits);
        // Utilizando formatNumber existente no arquivo, ou lógica similar localeString
        setEditValue(digits ? parseInt(digits, 10).toLocaleString('pt-BR') : '0');
        setEditRawPercent('');
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
      row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro') || row.metric.includes('Custo por Visita'))) {
      // Moeda
      const digits = e.target.value.replace(/\D/g, '');
      setEditRawValue(digits);
      setEditValue(formatBRLFromDigits(digits));
    } else if (row && (row.metric.includes('CTR') || row.metric.includes('Tx.') || row.metric.includes('% VIS. PÁG.'))) {
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
    } else if (row && (row.metric === 'Seguidores Novos' || row.metric === 'Agendamentos' || row.metric === 'Vendas' || row.metric === 'Alcance')) {
      // Número inteiro formatado (1.500)
      const digits = e.target.value.replace(/\D/g, '');
      setEditRawValue(digits);
      setEditValue(digits ? parseInt(digits, 10).toLocaleString('pt-BR') : '0');
    } else {
      setEditValue(e.target.value);
    }

    // CORREÇÃO: Atualizar status em tempo real durante a digitação
    if (row) {
      const newData = [...tableData];
      let tempValue = e.target.value;

      // Formatar valor temporário para cálculo
      if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') ||
        row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro') || row.metric.includes('Custo por Visita')) {
        const digits = e.target.value.replace(/\D/g, '');
        tempValue = formatBRLFromDigits(digits);
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.') || row.metric.includes('% VIS. PÁG.')) {
        const digits = e.target.value.replace(/\D/g, '');
        tempValue = formatPercentFromDigits(digits);
      } else if (row.metric === 'Seguidores Novos' || row.metric === 'Agendamentos' || row.metric === 'Vendas' || row.metric === 'Alcance') {
        const digits = e.target.value.replace(/\D/g, '');
        tempValue = digits ? parseInt(digits, 10).toLocaleString('pt-BR') : '0';
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
          row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro') || row.metric.includes('Custo por Visita')) {
          finalValue = 'R$ 0,00';
        } else if (row.metric.includes('CTR') || row.metric.includes('Tx.') || row.metric.includes('% VIS. PÁG.')) {
          finalValue = '0,00%';
        } else {
          finalValue = '0';
        }
      } else if (row.metric.includes('CPM') || row.metric.includes('CPC') || row.metric.includes('CPL') ||
        row.metric.includes('CPV') || row.metric.includes('Investimento') || row.metric.includes('Lucro') || row.metric.includes('Custo por Visita')) {
        finalValue = formatBRLFromDigits(editRawValue);
      } else if (row.metric.includes('CTR') || row.metric.includes('Tx.') || row.metric.includes('% VIS. PÁG.')) {
        finalValue = formatPercentFromDigits(editRawPercent);
      } else if (row.metric === 'Seguidores Novos' || row.metric === 'Agendamentos' || row.metric === 'Vendas' || row.metric === 'Alcance') {
        finalValue = editRawValue ? parseInt(editRawValue, 10).toLocaleString('pt-BR') : '0';
      }

      newData[editingCell.rowIndex][editingCell.field] = finalValue;

      // CORREÇÃO: Recalcular valores dependentes e status
      const recalculatedData = calculateValues(newData);
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

      // 🎯 CORREÇÃO: Se editou o VALOR REAL, desligar o modo automático
      if (editingCell.field === 'realValue') {
        if (row.metric === 'Vendas' || row.metric === 'Agendamentos') {
          const newAutoState = { ...realValueAuto, [row.metric]: false };
          setRealValueAuto(newAutoState);
          localStorage.setItem('realValueAuto', JSON.stringify(newAutoState));
        }
      }

      // Notificar todas as métricas importantes após recalcular
      const agendamentosVal = parseNumber(recalculatedData.find(r => r.metric === 'Agendamentos')?.realValue || '0');
      const vendasVal = parseNumber(recalculatedData.find(r => r.metric === 'Vendas')?.realValue || '0');
      const seguidoresNovosVal = parseNumber(recalculatedData.find(r => r.metric === 'Seguidores Novos')?.realValue || '0');

      // Calcular CPV e ROI para salvar
      const cpvRow = recalculatedData.find(r => r.metric === 'CPV' || r.metric === 'CPV (Custo por Venda)');
      const roiRow = recalculatedData.find(r => r.metric === 'ROI' || r.metric === 'ROI/ROAS' || r.metric === 'ROI / ROAS');

      const cpv = parseNumber(cpvRow?.realValue || '0');
      const roiValue = saveROIValue(roiRow?.realValue || '0% (0.0x)');

      // 🎯 FIX: Atualizar savedDetails IMEDIATAMENTE (otimista) para evitar race condition
      // O useEffect de audiência lê savedDetails — se for async, ele pega o valor antigo (0)
      if (editingCell.field === 'realValue') {
        dirtyFieldsRef.current.add(row.metric);
      }
      setSavedDetails(prev => ({
        ...prev,
        seguidoresNovos: seguidoresNovosVal,
        agendamentos: agendamentosVal,
        vendas: vendasVal,
        cpv: cpv,
        roi: roiValue,
        ticketMedio: ticketMedio
      }));

      // Salvar no Firebase (sempre que houver produto e mês; client normalizado)
      if (selectedProduct && selectedMonth) {
        const currentMonthlyBudgetVal = parseCurrency(recalculatedData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
        const payload = {
          month: selectedMonth,
          product: selectedProduct,
          client: effectiveClient,
          agendamentos: agendamentosVal,
          vendas: vendasVal,
          seguidoresNovos: seguidoresNovosVal,
          ticketMedio: ticketMedio,
          cpv: cpv,
          roi: roiValue,
          funnelType,
          monthlyBudget: currentMonthlyBudgetVal,
          agendamentosEnabled
        };
        metricsService.saveMonthlyDetails(payload).then(() => {
          // 🎯 FIX: Limpar dirty flags após confirmação do Firebase
          dirtyFieldsRef.current.delete('Agendamentos');
          dirtyFieldsRef.current.delete('Vendas');
          dirtyFieldsRef.current.delete('Seguidores Novos');
        }).catch(error => {
          console.error('Erro ao salvar detalhes mensais:', error);
        });
      }

      // Descobrir qual o CPA ativo com base no Funnel
      let cpaTargetVal = 0;
      if (funnelType === 'WHATSAPP' || funnelType === 'LEADS') {
        cpaTargetVal = parseCurrency(recalculatedData.find(r => r.metric === 'CPL (Custo por Lead)')?.benchmark || '0');
      } else if (funnelType === 'DIRETA') {
        cpaTargetVal = parseCurrency(recalculatedData.find(r => r.metric === 'Custo por Visita (Custo/LPV)')?.benchmark || '0');
      } else if (funnelType === 'AUDIENCIA') {
        cpaTargetVal = parseCurrency(recalculatedData.find(r => r.metric === 'Custo por Seguidor')?.benchmark || '0');
      }

      if (onValuesChange) {
        const currentMonthlyBudget = parseCurrency(recalculatedData.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
        onValuesChange({
          agendamentos: agendamentosVal,
          vendas: vendasVal,
          seguidoresNovos: seguidoresNovosVal,
          cpaTarget: cpaTargetVal,
          monthlyBudget: currentMonthlyBudget,
          funnelType,
          agendamentosEnabled
        });
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
      inputRef.current?.blur();
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

  // Função para obter o nome exibido da métrica (sem mudar a chave interna)
  const getMetricDisplayName = (metric: string): string => {
    if (metric === 'Agendamentos') {
      return 'Agendamento e Comparecimento';
    }
    if (metric === 'Tx. Agendamento (Agend./Leads)') {
      return 'Tx. Agendamento e Comparecimento';
    }
    return metric;
  };

  const getCategoryDisplayName = (category: string): string => {
    if (category === 'Funil de Agendamento') {
      return 'Funil de Agendamento e Comparecimento';
    }
    return category;
  };

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
      'Agendamentos': 'Número de consultas ou reuniões agendadas com clientes que efetivamente compareceram',
      'Tx. Agendamento (Agend./Leads)': 'Porcentagem de leads que viraram agendamentos',
      'Vendas': 'Número total de vendas realizadas através dos anúncios',
      '% VIS. PÁG. (LPV/Cliques)': 'Porcentagem de cliques que resultaram em acesso completo à página',
      'Custo por Visita (Custo/LPV)': 'Quanto você gasta para conseguir cada visita completa na página de destino',
      'Tx. Conversão Vendas (Vendas/Leads ou Agend.)': agendamentosEnabled
        ? 'Porcentagem de agendamentos que viraram vendas'
        : funnelType === 'DIRETA'
          ? 'Porcentagem de visitantes na página que viraram vendas'
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
    // 🎯 NOVA LÓGICA: Whitelist restrita de campos que devem ter status (conforme pedido do usuário)
    const allowedStatusFields = [
      'CPL',
      'Tx. Agendamento',
      'Tx. Conversão Vendas',
      'Custo por Visita',
      'Custo por Seguidor'
    ];

    // Verifica se a métrica atual está na whitelist (usando includes para ser robusto)
    const matchedField = allowedStatusFields.find(field =>
      metric.toLowerCase().includes(field.toLowerCase())
    );

    if (!matchedField) {
      return { status: '', statusColor: 'neutral' };
    }

    // Extrair valores numéricos baseado no tipo de campo
    let realNum = 0;
    let benchmarkNum = 0;

    // Para valores monetários (CPM, CPC, CPL, CPV, Custo por Visita)
    if (metric.includes('CPM') || metric.includes('CPC') || metric.includes('CPL') || metric.includes('CPV') || metric.includes('Custo por Visita')) {
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

    // Se não conseguiu extrair valores válidos (benchmark deve ser > 0 para comparação)
    if (isNaN(realNum) || isNaN(benchmarkNum) || benchmarkNum === 0) {
      return { status: '', statusColor: 'neutral' };
    }

    // CORREÇÃO: Se o valor real é zero, não deve ter status (exceto para os campos permitidos)
    if (realNum === 0) {
      // Permitir status zero para métricas de conversão e opcionalmente para custos whitelisted
      const canHaveStatusWhenZero = ['CTR', 'Tx.', 'CPL', 'Custo por Visita', 'Custo por Seguidor'];
      const canHaveStatus = canHaveStatusWhenZero.some(field => metric.toLowerCase().includes(field.toLowerCase()));

      if (!canHaveStatus) {
        return { status: '', statusColor: 'neutral' };
      }
    }

    // Calcular diferença percentual
    const difference = ((realNum - benchmarkNum) / benchmarkNum) * 100;

    // CORREÇÃO: Para custos (CPM, CPC, CPL, CPV, Custo por Visita), quanto mais baixo, melhor
    const isCostMetric = metric.includes('CPM') || metric.includes('CPC') || metric.includes('CPL') || metric.includes('CPV') || metric.includes('Custo por Visita');

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
    <div className="bg-slate-900/70 rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
      <div className="p-6 border-b border-slate-800/60">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Detalhes Mensais</h2>
            <p className="text-slate-400 text-sm">{selectedMonth}</p>
            {selectedProduct && (
              <div className="flex items-center mt-2 space-x-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <p className="text-sm text-slate-300 font-medium">
                  Campanha: {selectedProduct}
                </p>
              </div>
            )}
            {metrics.length > 0 && (
              <div className="flex items-center mt-1 space-x-2">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <p className="text-sm text-slate-400 font-medium">
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
          <div className={`relative rounded-xl p-4 border backdrop-blur-sm transition-all duration-300 ${isEditingTicket
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

      <div className="px-6 py-4 bg-slate-800/20 border-b border-slate-800/60">
        <div className="flex items-center">
          <div className="flex items-center space-x-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/50">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFunnelType('WHATSAPP');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${funnelType === 'WHATSAPP'
                ? 'bg-green-600 text-white shadow-lg shadow-green-900/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
              WHATSAPP
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFunnelType('LEADS');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${funnelType === 'LEADS'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
              CAPTURA LEADS
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFunnelType('DIRETA');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${funnelType === 'DIRETA'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
              VENDA DIRETA
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFunnelType('AUDIENCIA');
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all duration-200 ${funnelType === 'AUDIENCIA'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-900/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
            >
              AUDIÊNCIA
            </button>
          </div>
          <div className="ml-4 flex-1 h-px bg-slate-700/40"></div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-slate-800/40">
              <th className="text-left p-4 text-slate-400 font-bold text-[11px] uppercase tracking-[0.1em] w-2/5 border-b border-r border-slate-700/50">Métrica</th>
              <th className="text-left p-4 text-slate-400 font-bold text-[11px] uppercase tracking-[0.1em] w-1/5 border-b border-r border-slate-700/50">Benchmark/Projeção</th>
              <th className="text-left p-4 text-slate-400 font-bold text-[11px] uppercase tracking-[0.1em] w-1/5 border-b border-r border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span>Valores Reais</span>
                  <button
                    onClick={handleRefreshRealValues}
                    disabled={isRefreshingRealValues}
                    className={`flex items-center justify-center p-1.5 rounded transition-all duration-200 ${isRefreshingRealValues
                      ? 'bg-gray-700/50 text-gray-400 cursor-not-allowed'
                      : 'bg-slate-700/80 text-slate-200 border border-slate-600/50 hover:bg-slate-600/80 hover:border-slate-500/50'
                      }`}
                    title="Atualizar valores reais da API"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingRealValues ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </th>
              <th className="text-left p-4 text-slate-400 font-bold text-[11px] uppercase tracking-[0.1em] w-1/5 border-b border-slate-700/50">Status vs Benchmark</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedData).map(([category, items]) => {
              if (category === 'Funil de Agendamento' && funnelType === 'DIRETA') {
                return null;
              }
              if ((category === 'Funil de Agendamento' || category === 'Resultados Finais da Venda') && funnelType === 'AUDIENCIA') {
                return null;
              }
              if (category === 'Resultados de Audiência' && funnelType !== 'AUDIENCIA') {
                return null;
              }
              if (category === 'Desempenho do Anúncio e Custo por Lead' && funnelType === 'AUDIENCIA') {
                return null;
              }
              return (
                <React.Fragment key={category}>
                  {category !== 'Geral e Drivers Primários' && (
                    <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-800/40 via-slate-700/30 to-slate-800/40">
                      <td className="p-3 text-slate-400 font-medium text-sm" colSpan={4}>
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-slate-500 rounded-full mr-3"></div>
                          <span className="text-slate-400 font-medium tracking-wide uppercase text-xs">
                            {getCategoryDisplayName(category)}
                          </span>
                          {category === 'Funil de Agendamento' && (
                            <div className="flex items-center space-x-2 ml-3">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAgendamentosEnabled(!agendamentosEnabled);
                                }}
                                className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all duration-200 ${agendamentosEnabled
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
                  )}
                  {/* Itens da categoria */}
                  {items.filter(row => {
                    const hiddenMetrics = ['CPM', 'Impressões', 'CPC', 'Cliques', '% VIS. PÁG. (LPV/Cliques)', 'Tx. Mensagens (Leads/Cliques)', 'Tx. Conversão Audiência (Seg./Alcance)', 'Custo por Alcance (CPM)', 'Alcance'];
                    if (hiddenMetrics.includes(row.metric)) {
                      return false;
                    }
                    if (category === 'Desempenho do Anúncio e Custo por Lead') {
                      if (funnelType === 'AUDIENCIA') {
                        // Para audiência, ocultar todos da seção de anúncio
                        return false;
                      } else if (funnelType === 'WHATSAPP') {
                        return !['Visitantes na página (LPV)', 'Custo por Visita (Custo/LPV)'].includes(row.metric);
                      } else if (funnelType === 'LEADS') {
                        return !['Visitantes na página (LPV)', 'Custo por Visita (Custo/LPV)'].includes(row.metric);
                      } else if (funnelType === 'DIRETA') {
                        return !['Leads / Msgs', 'CPL (Custo por Lead)'].includes(row.metric);
                      }
                    }
                    return true;
                  }).map((row, index, filteredItems) => {
                    const globalIndex = tableData.findIndex(item =>
                      item.category === category && item.metric === row.metric
                    );

                    const isLastItem = index === filteredItems.length - 1;
                    const isLastCategory = Object.keys(groupedData).indexOf(category) === Object.keys(groupedData).length - 1;

                    return (
                      <tr key={`${category}-${index}`} className={`hover:bg-slate-800/40 transition-all duration-200 ${isLastItem && isLastCategory ? '' : 'border-b border-slate-700/30'
                        }`}>
                        <td className="p-5 text-slate-200 font-medium w-2/5 border-r border-slate-600/50">
                          <div className="flex items-center space-x-2">
                            <span>{getMetricDisplayName(row.metric)}</span>
                            {/* 🎯 DESTACAR CPA TARGET ATUAL DE ACORDO DE FUNIL */}
                            {(
                              (funnelType === 'WHATSAPP' && row.metric === 'CPL (Custo por Lead)') ||
                              (funnelType === 'LEADS' && row.metric === 'CPL (Custo por Lead)') ||
                              (funnelType === 'DIRETA' && row.metric === 'Custo por Visita (Custo/LPV)') ||
                              (funnelType === 'AUDIENCIA' && row.metric === 'Custo por Seguidor')
                            ) && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 ml-2 uppercase tracking-wide">
                                  Meta CPA
                                </span>
                              )}
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
                          className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 border-l-4 border-slate-800/60 ${(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                            ? 'bg-slate-900/60 opacity-50 cursor-not-allowed'
                            : row.benchmarkEditable
                              ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'benchmark'
                                ? 'bg-indigo-900/40 cursor-pointer transition-all duration-200 shadow-sm'
                                : 'bg-slate-800/40 cursor-pointer hover:bg-slate-800/60 transition-all duration-200'
                              : 'bg-slate-800/40'
                            }`}
                          onClick={(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? undefined : () => handleCellClick(globalIndex, 'benchmark', row.benchmark)}
                          onMouseEnter={() => row.benchmarkEditable && row.metric !== 'Agendamentos' && row.metric !== 'Tx. Agendamento (Agend./Leads)' && setIsHovered({ rowIndex: globalIndex, field: 'benchmark' })}
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
                                      className="inline-flex items-center justify-center p-1.5 rounded-full bg-purple-900/40 hover:bg-purple-800/50 border border-purple-500/30 transition-all duration-200"
                                      title="Editar projeção"
                                    >
                                      <Edit3 className="w-4 h-4" style={{ color: '#c084fc' }} />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        </td>

                        {/* Célula Valores Reais editável */}
                        <td
                          className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 ${(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                            ? 'bg-slate-900/60 opacity-50 cursor-not-allowed border-l-4 border-slate-800/60'
                            : row.realValueEditable
                              ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'realValue'
                                ? 'bg-emerald-900/40 cursor-pointer transition-all duration-200 border-l-4 border-slate-800/60 shadow-sm'
                                : (getRealValueAutoState(row.metric)
                                  ? 'bg-slate-800/40 border-l-4 border-slate-800/60'
                                  : 'bg-slate-700/60 cursor-pointer hover:bg-emerald-900/30 transition-all duration-200 border-l-4 border-slate-800/60 hover:border-emerald-400/60')
                              : 'bg-slate-800/40 border-l-4 border-slate-800/60'
                            }`}
                          onClick={(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? undefined : (row.realValueEditable && !getRealValueAutoState(row.metric) ? () => handleCellClick(globalIndex, 'realValue', row.realValue) : undefined)}
                          onMouseEnter={(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled ? undefined : (row.realValueEditable && !getRealValueAutoState(row.metric) ? () => setIsHovered({ rowIndex: globalIndex, field: 'realValue' }) : undefined)}
                          onMouseLeave={row.realValueEditable && !getRealValueAutoState(row.metric) ? () => setIsHovered(null) : undefined}
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
                                {row.realValueEditable && row.metric !== 'Agendamentos' && row.metric !== 'Seguidores Novos' && (
                                  <div className="flex items-center space-x-2">
                                    {getRealValueAutoState(row.metric) && (
                                      <div className="flex items-center space-x-1 mr-1">
                                        <span className="text-xs text-blue-400 font-medium">Sincronizado</span>
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRealValueAuto(row.metric);
                                      }}
                                      className={`inline-flex items-center justify-center rounded-full transition-all duration-200 ${getRealValueAutoState(row.metric)
                                        ? 'bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/30 p-1.5'
                                        : 'bg-blue-900/40 hover:bg-blue-800/50 border border-blue-500/30 p-1.5'
                                        }`}
                                      title={getRealValueAutoState(row.metric) ? 'Sincronizado (clique para ir a edição manual)' : 'Manual (clique para voltar ao Sincronizado)'}
                                    >
                                      {getRealValueAutoState(row.metric) ? (
                                        <Edit3 className="w-4 h-4 text-emerald-400" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4 text-blue-400" />
                                      )}
                                    </button>
                                  </div>
                                )}
                                {row.realValueEditable && (row.metric === 'Agendamentos' || row.metric === 'Seguidores Novos') && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-emerald-400 font-medium">Manual</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCellClick(globalIndex, 'realValue', row.realValue);
                                      }}
                                      className="inline-flex items-center justify-center p-1.5 rounded-full bg-emerald-900/40 hover:bg-emerald-800/50 border border-emerald-500/30 transition-all duration-200"
                                      title="Editar valor manual"
                                    >
                                      <Edit3 className="w-4 h-4 text-emerald-400" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        </td>

                        {/* Célula Status */}
                        <td className={`p-5 w-1/5 text-left ${(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
                          ? 'opacity-50'
                          : ''
                          }`}>
                          <div className="flex items-center space-x-3">
                            <span className={`text-sm font-medium ${(row.metric === 'Agendamentos' || row.metric === 'Tx. Agendamento (Agend./Leads)') && !agendamentosEnabled
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
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};



export default MonthlyDetailsTable;