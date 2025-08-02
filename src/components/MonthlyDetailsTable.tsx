import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, TrendingUp, TrendingDown, Minus, Edit3, Check, X } from 'lucide-react';
import { MetricData, metricsService } from '../services/metricsService';

interface MonthlyDetailsTableProps {
  metrics: MetricData[];
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

const MonthlyDetailsTable: React.FC<MonthlyDetailsTableProps> = ({ metrics }) => {
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Estado para o Ticket Médio editável
  const [ticketMedio, setTicketMedio] = useState(250);
  const [isEditingTicket, setIsEditingTicket] = useState(false);
  const [ticketEditValue, setTicketEditValue] = useState('');
  const [ticketEditRawValue, setTicketEditRawValue] = useState('');

  // Estado para controlar os dados editáveis
  const [tableData, setTableData] = useState<TableRow[]>([
    // Geral e Drivers Primários
    {
      category: 'Geral e Drivers Primários',
      metric: 'Investimento pretendido (Mês)',
      benchmark: formatCurrency(300),
      realValue: formatCurrency(16),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: true,
      realValueEditable: true
    },
    
    // Desempenho do Anúncio e Custo por Lead
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPM',
      benchmark: formatCurrency(56.47),
      realValue: formatCurrency(56.47),
      status: 'Dentro da meta',
      statusColor: 'up',
      benchmarkEditable: true,
      realValueEditable: true
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Impressões',
      benchmark: '5.313',
      realValue: '283',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPC',
      benchmark: formatCurrency(2.67),
      realValue: formatCurrency(2.67),
      status: 'Bom (Baixo)',
      statusColor: 'up',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Cliques',
      benchmark: '112',
      realValue: '6',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: true
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CTR',
      benchmark: '2.11%',
      realValue: '2.12%',
      status: 'Bom',
      statusColor: 'up',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Leads / Msgs',
      benchmark: '6',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: true
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'Tx. Mensagens (Leads/Cliques)',
      benchmark: '5.00%',
      realValue: '0.00%',
      status: 'Levemente abaixo da meta',
      statusColor: 'down',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Desempenho do Anúncio e Custo por Lead',
      metric: 'CPL (Custo por Lead)',
      benchmark: formatCurrency(53.53),
      realValue: formatCurrency(0),
      status: 'Ótimo (Baixo)',
      statusColor: 'up',
      benchmarkEditable: false,
      realValueEditable: false
    },

    // Funil de Agendamento
    {
      category: 'Funil de Agendamento',
      metric: 'Agendamentos',
      benchmark: '1',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: true
    },
    {
      category: 'Funil de Agendamento',
      metric: 'Tx. Agendamento (Agend./Leads)',
      benchmark: '10.00%',
      realValue: '0.00%',
      status: 'Muito abaixo da meta',
      statusColor: 'down',
      benchmarkEditable: true,
      realValueEditable: false
    },

    // Funil de Comparecimento
    {
      category: 'Funil de Comparecimento',
      metric: 'Comparecimento',
      benchmark: '0',
      realValue: '0',
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: true
    },
    {
      category: 'Funil de Comparecimento',
      metric: 'Tx. Comparecimento (Comp./Agend.)',
      benchmark: '50.00%',
      realValue: '0.00%',
      status: 'Muito abaixo da meta',
      statusColor: 'down',
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
      realValueEditable: true
    },
    {
      category: 'Resultados Finais da Venda',
      metric: 'Tx. Conversão Vendas (Vendas/Comp.)',
      benchmark: '10.00%',
      realValue: '0.00%',
      status: 'Levemente abaixo da meta',
      statusColor: 'down',
      benchmarkEditable: true,
      realValueEditable: false
    },
    {
      category: 'Resultados Finais da Venda',
      metric: 'CPV (Custo por Venda)',
      benchmark: formatCurrency(10705.21),
      realValue: formatCurrency(0),
      status: '',
      statusColor: 'neutral',
      benchmarkEditable: false,
      realValueEditable: false
    },

    // Financeiro
    {
      category: 'Financeiro',
      metric: 'Lucro',
      benchmark: formatCurrency(-292.99),
      realValue: formatCurrency(-16),
      status: 'Ótimo',
      statusColor: 'up',
      benchmarkEditable: false,
      realValueEditable: false
    },
    {
      category: 'Financeiro',
      metric: 'ROI',
      benchmark: '-98% (0.0x)',
      realValue: '-100% (0.0x)',
      status: 'Levemente abaixo da meta',
      statusColor: 'down',
      benchmarkEditable: false,
      realValueEditable: false
    }
  ]);

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

  // Função para calcular valores automaticamente
  const calculateValues = (data: TableRow[]): TableRow[] => {
    return data.map(row => {
      const newRow = { ...row };

      // Obter valores editáveis da coluna VALORES REAIS
      const investment = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.realValue || '0');
      const cpm = parseCurrency(data.find(r => r.metric === 'CPM')?.realValue || '0');
      const cliques = parseNumber(data.find(r => r.metric === 'Cliques')?.realValue || '0');
      const leads = parseNumber(data.find(r => r.metric === 'Leads / Msgs')?.realValue || '0');
      const agendamentos = parseNumber(data.find(r => r.metric === 'Agendamentos')?.realValue || '0');
      const comparecimento = parseNumber(data.find(r => r.metric === 'Comparecimento')?.realValue || '0');
      const vendas = parseNumber(data.find(r => r.metric === 'Vendas')?.realValue || '0');

      // Obter valores editáveis da coluna BENCHMARK/PROJEÇÃO
      const ctr = parseNumber(data.find(r => r.metric === 'CTR')?.benchmark || '0');
      const txMensagens = parseNumber(data.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0');
      const txAgendamento = parseNumber(data.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0');
      const txComparecimento = parseNumber(data.find(r => r.metric === 'Tx. Comparecimento (Comp./Agend.)')?.benchmark || '0');
      const txConversaoVendas = parseNumber(data.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Comp.)')?.benchmark || '0');

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
          const impressoes = parseNumber(data.find(r => r.metric === 'Impressões')?.realValue || '0');
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
        case 'Tx. Comparecimento (Comp./Agend.)':
          if (agendamentos > 0) {
            newRow.realValue = formatPercentage((comparecimento / agendamentos) * 100);
          }
          break;
        case 'Tx. Conversão Vendas (Vendas/Comp.)':
          if (comparecimento > 0) {
            newRow.realValue = formatPercentage((vendas / comparecimento) * 100);
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
        case 'ROI':
          const lucro = parseCurrency(data.find(r => r.metric === 'Lucro')?.realValue || '0');
          if (investment > 0) {
            const receita = vendas * ticketMedio;
            const roiPercent = (lucro / investment) * 100;
            const roiMultiplier = (receita / investment);
            newRow.realValue = `${roiPercent.toFixed(0)}% (${roiMultiplier.toFixed(1)}x)`;
          }
          break;
      }

      // Calcular valores automáticos da coluna BENCHMARK/PROJEÇÃO
      switch (row.metric) {
        case 'Impressões':
          const investmentBench = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
          const cpmBench = parseCurrency(data.find(r => r.metric === 'CPM')?.benchmark || '0');
          if (cpmBench > 0) {
            newRow.benchmark = Math.round(investmentBench * 1000 / cpmBench).toString();
          }
          break;
        // CPC é editável, não calculado automaticamente
        // case 'CPC':
        //   const investmentBench2 = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
        //   const cliquesBench = parseNumber(data.find(r => r.metric === 'Cliques')?.benchmark || '0');
        //   if (cliquesBench > 0) {
        //     newRow.benchmark = formatCurrency(investmentBench2 / cliquesBench);
        //   }
        //   break;
        case 'Cliques':
          const impressoesBench = parseNumber(data.find(r => r.metric === 'Impressões')?.benchmark || '0');
          const ctrBench = parseNumber(data.find(r => r.metric === 'CTR')?.benchmark || '0');
          if (ctrBench > 0) {
            newRow.benchmark = Math.round(impressoesBench * ctrBench / 100).toString();
          }
          break;
        case 'Leads / Msgs':
          const cliquesBench2 = parseNumber(data.find(r => r.metric === 'Cliques')?.benchmark || '0');
          const txMensagensBench = parseNumber(data.find(r => r.metric === 'Tx. Mensagens (Leads/Cliques)')?.benchmark || '0');
          if (txMensagensBench > 0) {
            newRow.benchmark = Math.round(cliquesBench2 * txMensagensBench / 100).toString();
          }
          break;
        case 'Agendamentos':
          const leadsBench = parseNumber(data.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
          const txAgendamentoBench = parseNumber(data.find(r => r.metric === 'Tx. Agendamento (Agend./Leads)')?.benchmark || '0');
          if (txAgendamentoBench > 0) {
            newRow.benchmark = Math.round(leadsBench * txAgendamentoBench / 100).toString();
          }
          break;
        case 'Comparecimento':
          const agendamentosBench = parseNumber(data.find(r => r.metric === 'Agendamentos')?.benchmark || '0');
          const txComparecimentoBench = parseNumber(data.find(r => r.metric === 'Tx. Comparecimento (Comp./Agend.)')?.benchmark || '0');
          if (txComparecimentoBench > 0) {
            newRow.benchmark = Math.round(agendamentosBench * txComparecimentoBench / 100).toString();
          }
          break;
        case 'Vendas':
          const comparecimentoBench = parseNumber(data.find(r => r.metric === 'Comparecimento')?.benchmark || '0');
          const txConversaoVendasBench = parseNumber(data.find(r => r.metric === 'Tx. Conversão Vendas (Vendas/Comp.)')?.benchmark || '0');
          if (txConversaoVendasBench > 0) {
            newRow.benchmark = Math.round(comparecimentoBench * txConversaoVendasBench / 100).toString();
          }
          break;
        case 'CPL (Custo por Lead)':
          const investmentBench3 = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
          const leadsBench2 = parseNumber(data.find(r => r.metric === 'Leads / Msgs')?.benchmark || '0');
          if (leadsBench2 > 0) {
            newRow.benchmark = formatCurrency(investmentBench3 / leadsBench2);
          }
          break;
        case 'CPV (Custo por Venda)':
          const investmentBench4 = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
          const vendasBench = parseNumber(data.find(r => r.metric === 'Vendas')?.benchmark || '0');
          if (vendasBench > 0) {
            newRow.benchmark = formatCurrency(investmentBench4 / vendasBench);
          }
          break;
        case 'Lucro':
          const vendasBench2 = parseNumber(data.find(r => r.metric === 'Vendas')?.benchmark || '0');
          const investmentBench5 = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
          const receitaBench = vendasBench2 * ticketMedio;
          newRow.benchmark = formatCurrency(receitaBench - investmentBench5);
          break;
        case 'ROI':
          const lucroBench = parseCurrency(data.find(r => r.metric === 'Lucro')?.benchmark || '0');
          const investmentBench6 = parseCurrency(data.find(r => r.metric === 'Investimento pretendido (Mês)')?.benchmark || '0');
          if (investmentBench6 > 0) {
            const vendasBench3 = parseNumber(data.find(r => r.metric === 'Vendas')?.benchmark || '0');
            const receitaBench2 = vendasBench3 * ticketMedio;
            const roiPercentBench = (lucroBench / investmentBench6) * 100;
            const roiMultiplierBench = (receitaBench2 / investmentBench6);
            newRow.benchmark = `${roiPercentBench.toFixed(0)}% (${roiMultiplierBench.toFixed(1)}x)`;
          }
          break;
      }

      return newRow;
    });
  };

  // Recalcular valores quando dados mudarem
  useEffect(() => {
    const calculatedData = calculateValues(tableData);
    setTableData(calculatedData);
  }, [tableData.map(row => `${row.benchmark}-${row.realValue}`).join(''), ticketMedio]);

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
      setTableData(newData);
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
      case 'up': return 'text-green-400';
      case 'down': return 'text-red-400';
      case 'neutral': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up': return <TrendingUp className="w-4 h-4" />;
      case 'down': return <TrendingDown className="w-4 h-4" />;
      case 'neutral': return <Minus className="w-4 h-4" />;
      default: return null;
    }
  };

  // Agrupar dados por categoria
  const groupedData = tableData.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, TableRow[]>);

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-600 shadow-xl overflow-hidden">
      <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Detalhes Mensais</h2>
            <p className="text-slate-400 text-sm">Julho/2025</p>
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
              <div className="group cursor-pointer relative" onClick={handleTicketClick}>
                <span className="text-slate-100 font-bold text-xl group-hover:text-indigo-300 transition-all duration-200">
                  {formatCurrency(ticketMedio)}
                </span>
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                </div>
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
                <tr className="border-b border-slate-700 bg-gradient-to-r from-slate-700/80 to-slate-600/80">
                  <td className="p-4 text-slate-100 font-bold text-base" colSpan={4}>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full mr-3 shadow-sm"></div>
                      {category}
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
                      <td className="p-5 text-slate-200 font-medium w-2/5 border-r border-slate-600/50">{row.metric}</td>
                      
                      {/* Célula Benchmark editável */}
                      <td 
                        className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 ${
                          row.benchmarkEditable 
                            ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'benchmark'
                              ? 'bg-indigo-900/40 cursor-pointer transition-all duration-200 border-l-4 border-indigo-400 shadow-sm'
                              : 'bg-slate-700/60 cursor-pointer hover:bg-indigo-900/30 transition-all duration-200 border-l-4 border-transparent hover:border-indigo-400/60'
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
                          <span className="text-base font-semibold text-slate-100">{row.benchmark}</span>
                        )}
                        {row.benchmarkEditable && isHovered?.rowIndex === globalIndex && isHovered?.field === 'benchmark' && !editingCell && (
                          <Edit3 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-indigo-400 opacity-70" />
                        )}
                      </td>
                      
                      {/* Célula Valores Reais editável */}
                      <td 
                        className={`p-5 relative group w-1/5 text-left border-r border-slate-600/50 ${
                          row.realValueEditable 
                            ? editingCell?.rowIndex === globalIndex && editingCell?.field === 'realValue'
                              ? 'bg-emerald-900/40 cursor-pointer transition-all duration-200 border-l-4 border-emerald-400 shadow-sm'
                              : 'bg-slate-700/60 cursor-pointer hover:bg-emerald-900/30 transition-all duration-200 border-l-4 border-transparent hover:border-emerald-400/60'
                            : 'bg-slate-800/40'
                        }`}
                        onClick={() => handleCellClick(globalIndex, 'realValue', row.realValue)}
                        onMouseEnter={() => row.realValueEditable && setIsHovered({rowIndex: globalIndex, field: 'realValue'})}
                        onMouseLeave={() => setIsHovered(null)}
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
                          <span className="text-base font-semibold text-slate-100">{row.realValue}</span>
                        )}
                        {row.realValueEditable && isHovered?.rowIndex === globalIndex && isHovered?.field === 'realValue' && !editingCell && (
                          <Edit3 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-400 opacity-70" />
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