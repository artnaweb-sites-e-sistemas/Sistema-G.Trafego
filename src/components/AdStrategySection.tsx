import React, { useState, useEffect, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Plus, Target, MapPin, DollarSign, Edit, Copy, CheckCircle, Package, Globe, MessageSquare, ShoppingCart, Users, Calendar, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { adStrategyService } from '../services/adStrategyService';
import { AdStrategy } from '../types/ad-strategy';
import { metaAdsService } from '../services/metaAdsService';
import { buildStrategyReport, convertStrategyToReport } from '../services/strategyReportService';

import { toast } from 'react-hot-toast';
import CustomDropdown from './CustomDropdown';
import StrategyReportModal from './modals/StrategyReportModal';

interface AdStrategySectionProps {
  selectedClient: string;
  selectedMonth: string;
  onStrategyCreated: (strategy: AdStrategy) => void;
}

const AdStrategySection: React.FC<AdStrategySectionProps> = ({
  selectedClient,
  selectedMonth,
  onStrategyCreated
}): JSX.Element => {
  const [strategies, setStrategies] = useState<AdStrategy[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentStrategy, setCurrentStrategy] = useState<Partial<AdStrategy>>({
    product: {
      name: '',
      campaignType: 'recorrente' as const,
      type: 'curso online' as const,
      objective: 'trafico' as const,
      ticket: 0
    },
    audience: {
      gender: 'ambos' as const,
      ageRange: '25-45',
      locations: [],
      interests: [],
      remarketing: [],
      scaleType: null
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
  const [interestInput, setInterestInput] = useState('');
  const [remarketingInput, setRemarketingInput] = useState('');
  const [collapsedProducts, setCollapsedProducts] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<Set<string>>(new Set());
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AdStrategy | null>(null);
  const [plannedInput, setPlannedInput] = useState<string>('R$ 0,00');
  const [ticketInput, setTicketInput] = useState<string>('R$ 0,00');
  const [isRemarketingModalOpen, setIsRemarketingModalOpen] = useState(false);
  const [remarketing2Input, setRemarketing2Input] = useState('');
  const [selectedStrategyForRemarketing, setSelectedStrategyForRemarketing] = useState<AdStrategy | null>(null);

  // 🎯 NOVO: Estados para o orçamento de serviços
  const [selectedStrategyForBudget, setSelectedStrategyForBudget] = useState<AdStrategy | null>(null);
  const [budgetItems, setBudgetItems] = useState<Array<{ service: string; value: string }>>([
    { service: '', value: 'R$ 0,00' }
  ]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalBudgetItems, setOriginalBudgetItems] = useState<Array<{ service: string; value: string }>>([]);

  // 🎯 NOVO: Estado para estratégia selecionada no relatório
  const [selectedStrategyType, setSelectedStrategyType] = useState<'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto'>(() => {
    // Tentar carregar do localStorage
    const saved = localStorage.getItem('selectedStrategyType');
    return (saved as 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto') || 'lp_whatsapp';
  });
  const [showAgeRangeModal, setShowAgeRangeModal] = useState(false);
  const [customAgeFrom, setCustomAgeFrom] = useState('');
  const [customAgeTo, setCustomAgeTo] = useState('');
  const [recommendations, setRecommendations] = useState<Record<string, { type: 'vertical' | 'horizontal' | 'wait'; tooltip: string; stats: { spend: number; ctr: number; cpl: number; cpr: number; clicks: number; impressions: number; leads: number; sales: number; frequency?: number; roas?: number; lpvRate?: number; objective: 'trafico' | 'mensagens' | 'compras' | 'captura_leads'; adSetsCount: number; periodStart: string; periodEnd: string } }>>({});

  // Refs para controlar execução
  const hasEvaluatedRef = useRef<Set<string>>(new Set());
  const hasSyncedRef = useRef<Set<string>>(new Set());

  // 🎯 NOVO: Estado para armazenar status dos conjuntos de anúncios
  const [adSetStatusMap, setAdSetStatusMap] = useState<Record<string, 'ACTIVE' | 'PAUSED' | 'UNKNOWN'>>({});

  // Carregar estratégia do localStorage quando componente montar
  useEffect(() => {
    const saved = localStorage.getItem('selectedStrategyType');
    if (saved && ['lp_whatsapp', 'whatsapp_direto', 'lp_direto'].includes(saved)) {
      setSelectedStrategyType(saved as 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto');
    }
  }, []);

  // Salvar estratégia selecionada no localStorage
  useEffect(() => {
    localStorage.setItem('selectedStrategyType', selectedStrategyType);
    console.log('🔍 [STRATEGY] selectedStrategyType mudou para:', selectedStrategyType);
  }, [selectedStrategyType]);

  // Bloquear scroll quando modal estiver aberto
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isModalOpen]);

  // 🎯 NOVO: Função para o ícone amarelo - Abrir modal de remarketing
  const handleNewYellowIcon = (strategy: AdStrategy) => {
    setSelectedStrategyForRemarketing(strategy);
    setRemarketing2Input('');
    setIsRemarketingModalOpen(true);
  };

  // 🎯 NOVO: Função para calcular dias no período atual para remarketing
  const getCurrentMonthDays = () => {
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };



  // 🎯 NOVO: Função para contar quantos conjuntos de remarketing existem
  const getRemarketingCount = (strategy: AdStrategy): number => {
    let count = 0;
    if (strategy.remarketing1) count++;
    if (strategy.remarketing2) count++;
    if (strategy.remarketing3) count++;

    console.log('🔍 [REMARKETING COUNT] Contando remarketing:', {
      strategyId: strategy.id,
      remarketing1: !!strategy.remarketing1,
      remarketing2: !!strategy.remarketing2,
      remarketing3: !!strategy.remarketing3,
      totalCount: count
    });

    return count;
  };

  // 🎯 NOVO: Função para verificar se pode criar mais remarketing (máximo 3)
  const canCreateMoreRemarketing = (strategy: AdStrategy): boolean => {
    return getRemarketingCount(strategy) < 3;
  };

  // 🎯 NOVO: Função para calcular o próximo número de remarketing
  const getNextRemarketingNumber = (strategy: AdStrategy): number => {
    return getRemarketingCount(strategy) + 1; // remarketing1, remarketing2, remarketing3
  };

  // 🎯 NOVO: Função para salvar estratégia selecionada no Firestore
  const saveSelectedStrategy = async (strategyType: 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto') => {
    if (!selectedReport) return;

    try {
      // Regenerar relatório com nova estratégia
      const newReport = buildStrategyReport({
        ...selectedReport.strategyReport.inputs,
        strategyType: strategyType
      });

      const updatedStrategy = {
        ...selectedReport,
        strategyReport: newReport
      };

      // Atualizar estado local
      setSelectedReport(updatedStrategy);
      setSelectedStrategyType(strategyType);

      // Atualizar também a estratégia na lista principal
      setStrategies(prevStrategies =>
        prevStrategies.map(s =>
          s.id === selectedReport.id ? updatedStrategy : s
        )
      );

      // Salvar no Firestore
      await adStrategyService.saveStrategy(updatedStrategy);

      console.log('🔍 [STRATEGY] Estratégia salva no Firestore:', strategyType);

    } catch (error) {
      console.error('🔍 [STRATEGY] Erro ao salvar estratégia:', error);
    }
  };

  // 🎯 NOVO: Função para carregar orçamento quando modal abre
  const handleOpenReportModal = (strategy: AdStrategy) => {
    setSelectedReport(strategy);
    setSelectedStrategyForBudget(strategy);

    // Definir estratégia inicial baseada na estratégia recomendada do relatório
    const recommendedStrategy = strategy.strategyReport?.metrics?.strategyType || 'lp_whatsapp';
    setSelectedStrategyType(recommendedStrategy);

    // Carregar orçamento existente se houver
    if (strategy.budgetItems && strategy.budgetItems.length > 0) {
      // Formatar valores para exibição
      const formattedItems = strategy.budgetItems.map(item => ({
        ...item,
        value: item.value.startsWith('R$') ? item.value : formatBRLFromDigits(extractDigits(item.value))
      }));
      setBudgetItems(formattedItems);
      setOriginalBudgetItems(formattedItems);
    } else {
      setBudgetItems([{ service: '', value: 'R$ 0,00' }]);
      setOriginalBudgetItems([{ service: '', value: 'R$ 0,00' }]);
    }
    setHasUnsavedChanges(false);
    setIsReportModalOpen(true);
  };

  // 🎯 NOVO: Função para verificar se há mudanças não salvas
  const checkForChanges = (currentItems: Array<{ service: string; value: string }>) => {
    if (currentItems.length !== originalBudgetItems.length) {
      return true;
    }

    for (let i = 0; i < currentItems.length; i++) {
      if (currentItems[i].service !== originalBudgetItems[i].service ||
        currentItems[i].value !== originalBudgetItems[i].value) {
        return true;
      }
    }

    return false;
  };

  // 🎯 NOVO: Função para adicionar novo item de orçamento
  const handleAddBudgetItem = () => {
    const newItems = [...budgetItems, { service: '', value: 'R$ 0,00' }];
    setBudgetItems(newItems);
    setHasUnsavedChanges(checkForChanges(newItems));
  };

  // 🎯 NOVO: Função para remover item de orçamento
  const handleRemoveBudgetItem = (index: number) => {
    if (budgetItems.length > 1) {
      const newItems = budgetItems.filter((_, i) => i !== index);
      setBudgetItems(newItems);
      setHasUnsavedChanges(checkForChanges(newItems));
    }
  };

  // 🎯 NOVO: Função para atualizar item de orçamento
  const handleUpdateBudgetItem = (index: number, field: 'service' | 'value', value: string) => {
    const newItems = [...budgetItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setBudgetItems(newItems);
    setHasUnsavedChanges(checkForChanges(newItems));
  };

  // 🎯 NOVO: Função para salvar orçamento
  const handleSaveBudget = async () => {
    if (!selectedStrategyForBudget) return;

    try {
      // Filtrar itens válidos (com serviço preenchido)
      const validItems = budgetItems.filter(item => item.service.trim() !== '');

      if (validItems.length === 0) {
        toast.error('Adicione pelo menos um serviço ao orçamento');
        return;
      }

      // Atualizar estratégia com os itens de orçamento
      const updatedStrategy = {
        ...selectedStrategyForBudget,
        budgetItems: validItems
      };

      // Salvar no banco de dados
      await adStrategyService.updateStrategy(updatedStrategy);

      // Atualizar estratégia local
      setStrategies(prevStrategies =>
        prevStrategies.map(s =>
          s.id === selectedStrategyForBudget.id ? updatedStrategy : s
        )
      );

      // Atualizar estratégia selecionada
      setSelectedReport(updatedStrategy);
      setSelectedStrategyForBudget(updatedStrategy);

      // Resetar estado de mudanças
      setOriginalBudgetItems(validItems);
      setHasUnsavedChanges(false);

      toast.success('Orçamento salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      toast.error('Erro ao salvar orçamento');
    }
  };

  // 🎯 NOVO: Função para obter o orçamento original da estratégia
  const getOriginalBudget = (strategy: AdStrategy): number => {
    // Se não tem remarketing, o orçamento atual é o original
    if (!strategy.remarketing1 && !strategy.remarketing2 && !strategy.remarketing3) {
      return strategy.budget.planned;
    }

    // Se tem remarketing, calcular o orçamento original
    // Orçamento atual + total dos remarketing = orçamento original
    const totalRemarketingBudget = (strategy.remarketing1?.budget.planned || 0) +
      (strategy.remarketing2?.budget.planned || 0) +
      (strategy.remarketing3?.budget.planned || 0);

    const originalBudget = strategy.budget.planned + totalRemarketingBudget;

    console.log('🔍 [ORIGINAL BUDGET] Calculando orçamento original:', {
      strategyId: strategy.id,
      currentBudget: strategy.budget.planned,
      totalRemarketingBudget,
      calculatedOriginalBudget: originalBudget
    });

    return originalBudget;
  };
  const getCurrentPeriodRemarketingBudget = (strategy: AdStrategy, remarketingKey: 'remarketing1' | 'remarketing2' | 'remarketing3'): number => {
    const remarketing = strategy[remarketingKey];
    if (!remarketing) return 0;

    // 🎯 CORREÇÃO: Usar o valor atual salvo, mas verificar se está sincronizado
    // A sincronização real será feita via useEffect ou função assíncrona separada
    return remarketing.budget.current;
  };

  // 🎯 NOVO: Função para verificar se qualquer remarketing está sincronizado
  const getCurrentPeriodRemarketingSyncStatus = (strategy: AdStrategy, remarketingKey: 'remarketing1' | 'remarketing2' | 'remarketing3'): boolean => {
    const remarketing = strategy[remarketingKey];
    if (!remarketing) return false;

    // 🎯 CORREÇÃO: Usar o status salvo, mas será atualizado via useEffect
    return remarketing.isSynchronized;
  };

  // 🎯 NOVO: Função para verificar se qualquer remarketing está pausado
  const isRemarketingStrategyPaused = (strategy: AdStrategy, remarketingKey: 'remarketing1' | 'remarketing2' | 'remarketing3'): boolean => {
    const remarketing = strategy[remarketingKey];
    if (!remarketing) return false;

    // Por enquanto, retornar false (mesma lógica do principal)
    return false;
  };

  // 🎯 NOVO: Função para deletar conjunto de remarketing específico
  const handleDeleteRemarketing = async (strategy: AdStrategy, remarketingKey: 'remarketing1' | 'remarketing2' | 'remarketing3') => {
    try {
      const updatedStrategy = { ...strategy };

      // Remover o remarketing específico
      delete updatedStrategy[remarketingKey];

      // Recalcular orçamentos dos remarketing restantes
      const remainingRemarketing = [updatedStrategy.remarketing1, updatedStrategy.remarketing2, updatedStrategy.remarketing3].filter(Boolean);

      console.log('🔍 [REMARKETING DELETE] Dados iniciais:', {
        deletedRemarketingKey: remarketingKey,
        deletedBudget: strategy[remarketingKey]?.budget.planned,
        remainingRemarketingCount: remainingRemarketing.length,
        currentMainBudget: strategy.budget.planned,
        currentRemarketing1: strategy.remarketing1?.budget.planned,
        currentRemarketing2: strategy.remarketing2?.budget.planned,
        currentRemarketing3: strategy.remarketing3?.budget.planned
      });

      if (remainingRemarketing.length > 0) {
        const originalBudget = getOriginalBudget(strategy);
        const totalRemarketingBudget = Math.round(originalBudget * 0.2);
        const newRemarketingBudget = Math.round(totalRemarketingBudget / remainingRemarketing.length);

        console.log('🔍 [REMARKETING DELETE] Cálculos:', {
          originalBudget,
          totalRemarketingBudget,
          newRemarketingBudget,
          remainingRemarketingCount: remainingRemarketing.length
        });

        // Reindexar os remarketing restantes para manter sequência correta
        const reindexedStrategy = { ...updatedStrategy };

        // Limpar todos os remarketing
        delete reindexedStrategy.remarketing1;
        delete reindexedStrategy.remarketing2;
        delete reindexedStrategy.remarketing3;

        // Reindexar os remarketing restantes
        remainingRemarketing.forEach((remarketing, index) => {
          if (remarketing) {
            const newKey = `remarketing${index + 1}` as 'remarketing1' | 'remarketing2' | 'remarketing3';
            reindexedStrategy[newKey] = {
              audienceName: remarketing.audienceName,
              budget: {
                planned: newRemarketingBudget,
                current: remarketing.budget.current
              },
              keywords: remarketing.keywords,
              isSynchronized: remarketing.isSynchronized
            };
            console.log('🔍 [REMARKETING DELETE] Reindexando:', {
              oldIndex: index,
              newKey,
              budget: newRemarketingBudget
            });
          }
        });

        // 🎯 CORREÇÃO: Recalcular orçamentos entre remarketing restantes
        const remainingRemarketingBudget = Math.round(originalBudget * 0.2); // 20% total
        const redistributedRemarketingBudget = remainingRemarketing.length > 0
          ? Math.round(remainingRemarketingBudget / remainingRemarketing.length)
          : 0;

        console.log('🔍 [REMARKETING DELETE] Redistribuição:', {
          remainingRemarketingBudget,
          redistributedRemarketingBudget
        });

        // Atualizar orçamentos dos remarketing restantes
        remainingRemarketing.forEach((remarketing, index) => {
          if (remarketing) {
            const remarketingKey = `remarketing${index + 1}` as 'remarketing1' | 'remarketing2' | 'remarketing3';
            reindexedStrategy[remarketingKey] = {
              audienceName: remarketing.audienceName,
              budget: {
                planned: redistributedRemarketingBudget,
                current: remarketing.budget.current
              },
              keywords: remarketing.keywords,
              isSynchronized: remarketing.isSynchronized
            };
          }
        });

        // 🎯 CORREÇÃO: Manter orçamento principal em 80% (NÃO alterar)
        const newMainBudget = Math.round(originalBudget * 0.8);
        console.log('🔍 [REMARKETING DELETE] Orçamento principal:', {
          antes: reindexedStrategy.budget.planned,
          depois: newMainBudget,
          originalBudget
        });
        reindexedStrategy.budget.planned = newMainBudget;

        // Salvar no serviço
        await adStrategyService.saveStrategy(reindexedStrategy);

        // Atualizar estado local
        setStrategies(prev => prev.map(s =>
          s.id === strategy.id ? reindexedStrategy : s
        ));
      } else {
        // Se não sobrou nenhum remarketing, restaurar orçamento original
        const originalBudget = getOriginalBudget(strategy);
        updatedStrategy.budget.planned = originalBudget;

        // Salvar no serviço
        await adStrategyService.saveStrategy(updatedStrategy);

        // Atualizar estado local
        setStrategies(prev => prev.map(s =>
          s.id === strategy.id ? updatedStrategy : s
        ));
      }

      toast.success(`Conjunto de remarketing deletado com sucesso!`);
    } catch (error) {
      console.error('Erro ao deletar conjunto de remarketing:', error);
      toast.error('Erro ao deletar conjunto de remarketing');
    }
  };

  // 🎯 NOVO: Função para salvar remarketing e criar nova nomenclatura
  const handleSaveRemarketing = async () => {
    if (!selectedStrategyForRemarketing || !remarketing2Input.trim()) {
      toast.error('Por favor, insira as palavras de remarketing');
      return;
    }

    try {
      // Gerar nova nomenclatura com sufixo [Rmkt - palavras]
      const originalAudienceName = selectedStrategyForRemarketing.generatedNames.audience;
      const newAudienceName = `${originalAudienceName} [Rmkt - ${remarketing2Input.trim()}]`;

      // Calcular orçamentos para múltiplos remarketing
      const originalBudget = getOriginalBudget(selectedStrategyForRemarketing);
      const remarketingCount = getRemarketingCount(selectedStrategyForRemarketing);
      const nextRemarketingNumber = getNextRemarketingNumber(selectedStrategyForRemarketing);
      const remarketingKey = `remarketing${nextRemarketingNumber}` as 'remarketing1' | 'remarketing2' | 'remarketing3';

      // 🎯 LOGS DETALHADOS PARA DEBUG
      console.log('🔍 [REMARKETING CREATE] Dados iniciais:', {
        originalBudget,
        remarketingCount,
        nextRemarketingNumber,
        remarketingKey,
        currentRemarketing1: selectedStrategyForRemarketing.remarketing1?.budget.planned,
        currentRemarketing2: selectedStrategyForRemarketing.remarketing2?.budget.planned,
        currentRemarketing3: selectedStrategyForRemarketing.remarketing3?.budget.planned
      });

      // Calcular orçamento dividido igualmente entre todos os remarketing
      const totalRemarketingBudget = Math.round(originalBudget * 0.2); // 20% total
      const newRemarketingBudget = Math.round(totalRemarketingBudget / (remarketingCount + 1)); // Dividir igualmente

      console.log('🔍 [REMARKETING CREATE] Cálculos:', {
        totalRemarketingBudget,
        newRemarketingBudget,
        remarketingCount: remarketingCount + 1
      });

      // Recalcular orçamentos existentes
      const updatedStrategy = { ...selectedStrategyForRemarketing };

      // Atualizar orçamentos existentes
      if (updatedStrategy.remarketing1) {
        console.log('🔍 [REMARKETING CREATE] Atualizando remarketing1:', {
          antes: updatedStrategy.remarketing1.budget.planned,
          depois: newRemarketingBudget
        });
        updatedStrategy.remarketing1.budget.planned = newRemarketingBudget;
      }
      if (updatedStrategy.remarketing2) {
        console.log('🔍 [REMARKETING CREATE] Atualizando remarketing2:', {
          antes: updatedStrategy.remarketing2.budget.planned,
          depois: newRemarketingBudget
        });
        updatedStrategy.remarketing2.budget.planned = newRemarketingBudget;
      }
      if (updatedStrategy.remarketing3) {
        console.log('🔍 [REMARKETING CREATE] Atualizando remarketing3:', {
          antes: updatedStrategy.remarketing3.budget.planned,
          depois: newRemarketingBudget
        });
        updatedStrategy.remarketing3.budget.planned = newRemarketingBudget;
      }

      // Adicionar novo remarketing
      updatedStrategy[remarketingKey] = {
        audienceName: newAudienceName,
        budget: {
          planned: newRemarketingBudget,
          current: 0
        },
        keywords: remarketing2Input.trim(),
        isSynchronized: false
      };

      console.log('🔍 [REMARKETING CREATE] Novo remarketing criado:', {
        key: remarketingKey,
        budget: newRemarketingBudget
      });

      // 🎯 CORREÇÃO: Manter orçamento principal em 80% (NÃO alterar)
      // O orçamento principal deve permanecer fixo em 80% do original
      const newMainBudget = Math.round(originalBudget * 0.8);
      console.log('🔍 [REMARKETING CREATE] Orçamento principal:', {
        antes: updatedStrategy.budget.planned,
        depois: newMainBudget,
        originalBudget
      });
      updatedStrategy.budget.planned = newMainBudget;

      // Salvar no serviço
      try {
        // Usar saveStrategy que funciona tanto para criar quanto atualizar
        await adStrategyService.saveStrategy(updatedStrategy);
      } catch (error) {
        console.error('Erro ao salvar estratégia:', error);
        toast.error('Erro ao salvar conjunto de remarketing');
        return;
      }

      // Atualizar estado local
      setStrategies(prev => prev.map(s =>
        s.id === selectedStrategyForRemarketing.id ? updatedStrategy : s
      ));

      // Fechar modal e limpar estados
      setIsRemarketingModalOpen(false);
      setSelectedStrategyForRemarketing(null);
      setRemarketing2Input('');

      toast.success(`Conjunto de remarketing ${nextRemarketingNumber} criado com sucesso!`);
    } catch (error) {
      console.error('Erro ao criar conjunto de remarketing:', error);
      toast.error('Erro ao criar conjunto de remarketing');
    }
  };

  // 🎯 NOVO: Função para carregar status dos conjuntos de anúncios
  const loadAdSetStatuses = async () => {
    try {
      const isConfigured = metaAdsService.isConfigured?.() ?? false;
      const isLogged = metaAdsService.isLoggedIn?.() ?? false;
      const hasAccount = !!metaAdsService.getSelectedAccount?.();

      if (!isConfigured || !isLogged || !hasAccount) {

        return;
      }


      const adSets = await metaAdsService.getAdSets();

      if (adSets && adSets.length > 0) {
        const statusMap: Record<string, 'ACTIVE' | 'PAUSED' | 'UNKNOWN'> = {};

        // 🎯 DEBUG DETALHADO: Log de cada ad set individualmente

        adSets.forEach((adSet: any, index: number) => {
          const normalizedName = normalizeName(adSet.name);
          const status = adSet.status === 'PAUSED' ? 'PAUSED' :
            adSet.status === 'ACTIVE' ? 'ACTIVE' : 'UNKNOWN';
          statusMap[normalizedName] = status;



          // 🎯 ESPECIAL: Verificar se é o ad set "Salvador"
          if (adSet.name.includes('Salvador') || normalizedName.includes('salvador')) {

          }

          // 🎯 ESPECIAL: Verificar se é o ad set "Brasil" (que pode estar causando o problema)
          if (adSet.name.includes('Brasil') || normalizedName.includes('brasil')) {

          }
        });



        setAdSetStatusMap(statusMap);
      } else {

      }
    } catch (error) {
      console.error('❌ DEBUG - Erro ao carregar status dos conjuntos:', error);
    }
  };

  // Carregar estratégias existentes (todas do cliente)
  useEffect(() => {
    const loadStrategies = async () => {
      if (selectedClient && selectedMonth) {
        console.log('🔍 [COMPONENT] loadStrategies chamado:', { selectedClient, selectedMonth });

        try {
          // 🎯 CORREÇÃO: Carregar apenas estratégias do cliente E mês específico
          const existingStrategies = await adStrategyService.getStrategiesByClientAndMonth(selectedClient, selectedMonth);
          console.log('🔍 [COMPONENT] Estratégias carregadas:', existingStrategies.length);
          console.log('🔍 [COMPONENT] IDs das estratégias:', existingStrategies.map(s => ({
            id: s.id,
            hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3)
          })));

          setStrategies(existingStrategies);
          // Resetar refs quando mudar cliente/mês
          hasEvaluatedRef.current.clear();
          hasSyncedRef.current.clear();

          // 🎯 NOVO: Carregar status dos conjuntos de anúncios
          await loadAdSetStatuses();
        } catch (error) {
          console.error('🔍 [COMPONENT] Erro ao carregar estratégias:', error);
          // Fallback para método síncrono se houver erro
          const fallbackStrategies = adStrategyService.getAllStrategiesSync().filter(s => s.client === selectedClient && s.month === selectedMonth);
          console.log('🔍 [COMPONENT] Fallback para localStorage:', fallbackStrategies.length, 'estratégias');
          setStrategies(fallbackStrategies);
        }
      }
    };

    loadStrategies();
  }, [selectedClient, selectedMonth]); // 🎯 CORREÇÃO: Remover refreshTrigger

  // Auto-avaliar todas as estratégias e sincronizar as que ainda não estão sincronizadas
  useEffect(() => {
    const run = async () => {
      // Evitar chamadas ao Meta Ads quando não conectado/configurado
      try {
        const isConfigured = metaAdsService.isConfigured?.() ?? false;
        const isLogged = metaAdsService.isLoggedIn?.() ?? false;
        const hasAccount = !!metaAdsService.getSelectedAccount?.();
        if (!isConfigured || !isLogged || !hasAccount) {
          return;
        }
      } catch { }

      if (!strategies || strategies.length === 0) return;



      // Avaliar sequencialmente para reduzir rate limit
      for (const s of strategies) {
        const evaluationKey = `${s.id}-${selectedMonth}`;
        if (!hasEvaluatedRef.current.has(evaluationKey)) {
          try {

            await evaluateStrategyPerformance(s);
            hasEvaluatedRef.current.add(evaluationKey);

            // Rate limit removido - sem pausa
          } catch (e) {
            console.warn(`❌ DEBUG - Erro ao avaliar estratégia ${s.id}:`, e);
            // segue para próxima
          }
        } else {

        }
      }

      // Sincronizar orçamento de todas as estratégias para o período atual

      for (const s of strategies) {
        const syncKey = `${s.id}-${selectedMonth}`;
        if (!hasSyncedRef.current.has(syncKey)) {
          try {

            await syncStrategyBudgetFromMeta(s);
            hasSyncedRef.current.add(syncKey);
            // Rate limit removido - sem pausa
          } catch (e) {
            console.warn(`❌ DEBUG - Erro ao sincronizar estratégia ${s.id}:`, e);
          }
        } else {

        }
      }

      // 🎯 NOVO: Sincronizar orçamento de remarketing de todas as estratégias
      for (const s of strategies) {
        const remarketingSyncKey = `${s.id}-remarketing-${selectedMonth}`;
        if (!hasSyncedRef.current.has(remarketingSyncKey)) {
          try {
            await syncRemarketingBudgetFromMeta(s);
            hasSyncedRef.current.add(remarketingSyncKey);
          } catch (e) {
            console.warn(`❌ DEBUG - Erro ao sincronizar remarketing da estratégia ${s.id}:`, e);
          }
        }
      }


    };
    run();
  }, [strategies, selectedClient, selectedMonth]);

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

  const formatCurrencyNumber = (num: number | undefined): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0);
  };

  // Função para extrair dígitos
  const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // 🎯 NOVO: Função para verificar se estratégia tem conjunto pausado
  const isStrategyPaused = (strategy: AdStrategy): boolean => {
    const strategyAudienceName = strategy.generatedNames.audience;
    if (!strategyAudienceName) return false;

    const normalizedStrategyName = normalizeName(strategyAudienceName);
    const adSetStatus = adSetStatusMap[normalizedStrategyName];

    // 🎯 DEBUG ESPECIAL: Log detalhado para estratégia "Salvador"
    const isSalvadorStrategy = strategyAudienceName.includes('Salvador') || normalizedStrategyName.includes('salvador');
    if (isSalvadorStrategy) {

    }



    return adSetStatus === 'PAUSED';
  };

  // Função para abrir modal
  const handleOpenModal = (strategy?: AdStrategy, productName?: string, productCampaignType?: string) => {
    if (strategy) {
      setCurrentStrategy(strategy);
      setEditingStrategy(strategy.id);
      setPlannedInput(formatCurrencyNumber(strategy.budget?.planned));
      setTicketInput(formatCurrencyNumber(strategy.product?.ticket));

      // 🎯 CORREÇÃO: Definir estratégia baseada na estratégia recomendada do relatório
      const recommendedStrategy = strategy.strategyReport?.metrics?.strategyType || 'lp_whatsapp';
      setSelectedStrategyType(recommendedStrategy);
    } else {
      setCurrentStrategy({
        product: {
          name: productName || '',
          campaignType: (productCampaignType as 'sazonal' | 'recorrente') || 'recorrente',
          type: 'curso online' as const,
          objective: 'trafico' as const,
          ticket: 0
        },
        audience: {
          gender: 'ambos' as const,
          ageRange: '25-45',
          locations: [],
          interests: [],
          remarketing: [],
          scaleType: null
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
      setPlannedInput('R$ 0,00');
      setTicketInput('R$ 0,00');
      setLocationInput('');
      setInterestInput('');
      setRemarketingInput('');

      // 🎯 CORREÇÃO: Para nova estratégia, manter a estratégia do localStorage ou usar padrão
      const saved = localStorage.getItem('selectedStrategyType');
      if (saved && ['lp_whatsapp', 'whatsapp_direto', 'lp_direto'].includes(saved)) {
        setSelectedStrategyType(saved as 'lp_whatsapp' | 'whatsapp_direto' | 'lp_direto');
      } else {
        setSelectedStrategyType('lp_whatsapp'); // Padrão
      }
    }
    setIsModalOpen(true);
  };

  // Função para fechar modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentStrategy({
      product: {
        name: '',
        campaignType: 'recorrente' as const,
        type: 'curso online' as const,
        objective: 'trafico' as const,
        ticket: 0
      },
      audience: {
        gender: 'ambos' as const,
        ageRange: '25-45',
        locations: [],
        interests: [],
        remarketing: [],
        scaleType: null
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
    setPlannedInput('R$ 0,00');
    setLocationInput('');
    setInterestInput('');
    setRemarketingInput('');
  };

  // Função para formatar markdown para PDF
  // Função para formatar markdown para PDF com layout clean e controle de quebra de página
  const formatMarkdownForPDF = (markdown: string): string => {
    if (!markdown) return '';

    // Filtrar qualquer seção que contenha "Dados da Campanha"
    let filtered = markdown
      .split(/(?=^##)/gm)
      .filter(section => !section.includes('Dados da Campanha'))
      .filter(section => !section.includes('# Dados da Campanha'))
      .join('\n');

    let formatted = filtered;

    // Títulos principais (#) - Cabeçalho principal (evita quebra de página)
    formatted = formatted.replace(/^# (.+)$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #1e293b; font-size: 20px; font-weight: bold; margin: 20px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0;">$1</div>'
    );

    // Subtítulos (##) - Seções principais com cores diferentes e bordas à esquerda - ALINHADOS À ESQUERDA, COM PADDING-BOTTOM: 20PX
    formatted = formatted.replace(/^## Opções de Estratégia$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #1e40af; font-size: 16px; font-weight: 600; margin: 12px 0 12px 0; padding: 8px 16px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Opções de Estratégia</div>'
    );

    formatted = formatted.replace(/^## Estratégia Recomendada$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #059669; font-size: 16px; font-weight: 600; margin: 16px 0 12px 0; padding: 8px 16px; background: #ecfdf5; border-radius: 6px; border-left: 4px solid #10b981; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Estratégia Recomendada</div>'
    );

    formatted = formatted.replace(/^## Resultados Esperados$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #d97706; font-size: 16px; font-weight: 600; margin: 16px 0 12px 0; padding: 8px 16px; background: #fffbeb; border-radius: 6px; border-left: 4px solid #f59e0b; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Resultados Esperados</div>'
    );

    formatted = formatted.replace(/^## Retorno Estimado$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #7c3aed; font-size: 16px; font-weight: 600; margin: 16px 0 12px 0; padding: 8px 16px; background: #f3f4f6; border-radius: 6px; border-left: 4px solid #8b5cf6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Retorno Estimado</div>'
    );

    formatted = formatted.replace(/^## Nível de Risco \/ Observações$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #dc2626; font-size: 16px; font-weight: 600; margin: 16px 0 12px 0; padding: 8px 16px; background: #fef2f2; border-radius: 6px; border-left: 4px solid #ef4444; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Nível de Risco / Observações</div>'
    );

    formatted = formatted.replace(/^## Próximos Passos$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #0891b2; font-size: 16px; font-weight: 600; margin: 16px 0 12px 0; padding: 8px 16px; background: #ecfeff; border-radius: 6px; border-left: 4px solid #06b6d4; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Próximos Passos</div>'
    );

    // Outros subtítulos (##) - Seções genéricas (evita quebra de página) - ALINHADOS À ESQUERDA, COM PADDING-BOTTOM: 20PX
    formatted = formatted.replace(/^## (.+)$/gm,
      '<div style="page-break-before: auto; page-break-after: avoid; page-break-inside: avoid; color: #374151; font-size: 16px; font-weight: 600; margin: 16px 0 12px 0; padding: 8px 16px; background: #f8fafc; border-radius: 6px; border-left: 4px solid #6b7280; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">$1</div>'
    );

    // Formatação especial para a seção "Nível de Risco / Observações" - BOLD APENAS NA PARTE INICIAL
    formatted = formatted.replace(/- \*\*(Médio a Alto|Baixo a Médio|Médio)\*\*/g,
      '<strong style="color: #1e293b; font-weight: 600;">$1</strong>'
    );

    // Texto em negrito (**texto**) - Destaque sutil
    formatted = formatted.replace(/\*\*(.+?)\*\*/g,
      '<strong style="color: #1e293b; font-weight: 600;">$1</strong>'
    );

    // FORMATAÇÃO DO FUNIL PRIMEIRO - ANTES DE PROCESSAR LISTAS GERAIS
    // LIMPEZA INTELIGENTE - Remove apenas caracteres problemáticos específicos
    // Remove hífens e traços que aparecem antes do funil, mas preserva formatação
    formatted = formatted.replace(/^[\s]*[-–—][\s]*/gm, ''); // Remove hífens no início das linhas
    formatted = formatted.replace(/\n[\s]*[-–—][\s]*\n/g, '\n'); // Remove hífens entre quebras
    formatted = formatted.replace(/\n[\s]*[-–—][\s]*/g, '\n'); // Remove hífens no final das linhas

    // Formatação especial para o funil de conversão com layout perfeito - SEM BULLETS, COM PADDING-BOTTOM: 20PX
    formatted = formatted.replace(/Topo → (.+)/g,
      '<div style="display: flex; align-items: center; margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px; border-left: 3px solid #3b82f6; padding-bottom: 20px;"><span style="line-height: 1.5; color: #374151;"><strong style="color: #1f2937;">Topo</strong> → $1</span></div>'
    );
    formatted = formatted.replace(/Meio → (.+)/g,
      '<div style="display: flex; align-items: center; margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px; border-left: 3px solid #10b981; padding-bottom: 20px;"><span style="line-height: 1.5; color: #374151;"><strong style="color: #1f2937;">Meio</strong> → $1</span></div>'
    );
    formatted = formatted.replace(/Fundo → (.+)/g,
      '<div style="display: flex; align-items: center; margin: 4px 0; padding: 4px 8px; background: #f8fafc; border-radius: 4px; border-left: 3px solid #f59e0b; padding-bottom: 20px;"><span style="line-height: 1.5; color: #374151;"><strong style="color: #1f2937;">Fundo</strong> → $1</span></div>'
    );

    // Formatação especial para "(recomendado)" e "Por que recomendamos" no PDF - MESMO TOM DE AZUL
    formatted = formatted.replace(/\(recomendado\)/g, '<span style="color: #1e40af; font-weight: 600;">(recomendado)</span>');
    formatted = formatted.replace(/Por que recomendamos:/g, '<span style="color: #1e40af; font-weight: 600;">Por que recomendamos:</span>');

    // Formatação especial para a seção "Próximos Passos" - BULLETS E CORES
    // Adiciona bullets (-) e aplica cor da seção para "Prospecção" e "Remarketing"
    formatted = formatted.replace(/Verba diária \(já descontado remarketing\):/g, 'Verba diária (já descontado remarketing):');
    formatted = formatted.replace(/Prospecção:/g, '<span style="color: #0891b2; font-weight: 600;">Prospecção</span>:');
    formatted = formatted.replace(/Remarketing:/g, '<span style="color: #0891b2; font-weight: 600;">Remarketing</span>:');
    formatted = formatted.replace(/Alocar em 1 conjunto/g, '- Alocar em 1 conjunto');
    formatted = formatted.replace(/Garantir atendimento rápido/g, 'Garantir atendimento rápido');

    // CONTROLE INTELIGENTE DE QUEBRA DE PÁGINA - Evita cortes de texto
    // Força quebra de página antes de seções importantes para evitar cortes
    formatted = formatted.replace(/^## Opções de Estratégia$/gm,
      '<div style="page-break-before: always; page-break-after: avoid; page-break-inside: avoid; color: #1e40af; font-size: 16px; font-weight: 600; margin: 12px 0 12px 0; padding: 8px 16px; background: #eff6ff; border-radius: 6px; border-left: 4px solid #3b82f6; box-shadow: 0 1px 3px rgba(0,0,0,0.1); min-height: 32px; text-align: left; vertical-align: middle; line-height: 32px; padding-bottom:20px">Opções de Estratégia</div>'
    );

    // CORREÇÃO DAS QUEBRAS DE LINHA - Aplicar em todas as seções
    // Substituir quebras de linha simples por <br> para o PDF
    formatted = formatted.replace(/\n\n/g, '<br><br>'); // Duplas quebras viram <br><br>
    formatted = formatted.replace(/\n/g, '<br>'); // Quebras simples viram <br>

    // Ajustar espaçamento entre seções para melhor legibilidade
    formatted = formatted.replace(/<br><br>/g, '<div style="margin-bottom: 16px;"></div>');
    formatted = formatted.replace(/<br>/g, '<div style="margin-bottom: 8px;"></div>');

    // Listas com traços (-) - Itens organizados (DEPOIS do funil para não interferir)
    formatted = formatted.replace(/^- (.+)$/gm,
      '<div style="page-break-inside: avoid; margin: 2px 0; padding: 2px 0; padding-left: 16px; position: relative;"><span style="color: #3b82f6; position: absolute; left: 0; top: 2px;">•</span><span style="line-height: 1.4;">$1</span></div>'
    );

    // Quebras de linha inteligentes (evita quebra de página)
    formatted = formatted.replace(/\n\n/g, '<div style="height: 6px; page-break-inside: avoid;"></div>');
    formatted = formatted.replace(/\n/g, ' ');

    return formatted;
  };

  // Função para exportar relatório em PDF
  const handleExportPDF = (strategy: AdStrategy) => {
    if (!strategy?.strategyReport?.metrics) {
      console.error('Dados do relatório estratégico não encontrados');
      return;
    }

    const metrics = strategy.strategyReport.metrics;

    // Criar um elemento temporário para o PDF
    const pdfContent = document.createElement('div');
    pdfContent.innerHTML = `
      <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1f2937; margin-bottom: 5px;">Relatório Estratégico</h1>
          <h2 style="color: #6b7280; font-size: 18px; font-weight: normal;">${strategy.product?.name || 'Estratégia'}</h2>
        </div>
        
        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Dados da Campanha</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); text-align: center;">
              <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Tipo de Campanha</div>
              <div style="font-size: 16px; font-weight: bold;">${strategy.product?.campaignType === 'sazonal' ? 'Sazonal' : 'Recorrente'}</div>
            </div>
            
            ${strategy.product?.type !== 'sem_produto' ? `
            <div style="background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); text-align: center;">
               <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Campanha</div>
               <div style="font-size: 16px; font-weight: bold;">${(strategy.product?.type || 'N/A').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
             </div>
            ` : ''}
            
            <div style="background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); text-align: center;">
              <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Investimento (mês)</div>
              <div style="font-size: 16px; font-weight: bold;">R$ ${strategy.budget?.planned || '0'}</div>
            </div>
            
            ${strategy.product?.type !== 'sem_produto' ? `
            <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border-radius: 8px; padding: 16px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); text-align: center;">
              <div style="font-size: 12px; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.9;">Ticket do Produto</div>
              <div style="font-size: 16px; font-weight: bold;">R$ ${strategy.product?.ticket || '0'}</div>
            </div>
            ` : ''}
          </div>
        </div>

        <div style="margin-bottom: 30px;">
          <h3 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Análise Estratégica - Projeção de Resultados</h3>
          ${metrics.strategyType === 'impulsionar_post' ? `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Custo por Seguidor</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">R$ ${((metrics.cpcMin + metrics.cpcMax) / 2).toFixed(2)}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Seguidores Estimados</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">${((metrics.clicksMin + metrics.clicksMax) / 2).toLocaleString()}</p>
            </div>
          </div>
          ` : `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #3b82f6;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">CPC Médio</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">R$ ${((metrics.cpcMin + metrics.cpcMax) / 2).toFixed(2)}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Acessos Estimados</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">${((metrics.accessesMin + metrics.accessesMax) / 2).toLocaleString()}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Leads Estimados</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">${((metrics.leadsMin + metrics.leadsMax) / 2).toFixed(0)}</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Vendas Estimadas</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">${((metrics.salesMin + metrics.salesMax) / 2).toFixed(0)}</p>
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">ROI Estimado</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">${((metrics.roiMin + metrics.roiMax) / 2).toFixed(1)}x</p>
            </div>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;">
              <h4 style="color: #1f2937; margin: 0 0 10px 0;">Receita Potencial</h4>
              <p style="color: #059669; font-size: 24px; font-weight: bold; margin: 0;">R$ ${((metrics.revenueMin + metrics.revenueMax) / 2).toLocaleString()}</p>
            </div>
          </div>
          `}
        </div>
        
        <div style="page-break-inside: avoid; margin-bottom: 20px; padding: 16px 0; border-top: 1px solid #e2e8f0;">
          <h3 style="color: #1e293b; font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #374151;">Análise Completa</h3>
          <div style="color: #475569; line-height: 1.6; font-size: 13px;">
${formatMarkdownForPDF(strategy.strategyReport.markdown) || 'Análise não disponível'}
          </div>
        </div>
        
        ${strategy.budgetItems && strategy.budgetItems.length > 0 && strategy.budgetItems.some(item => item.service.trim() !== '') ? `
        <div style="page-break-inside: avoid; margin-bottom: 30px;">
          <h3 style="color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Orçamento de Serviços</h3>
          <div style="margin-top: 20px;">
            <table style="width: 100%; border-collapse: collapse; background: #f8fafc; border-radius: 8px; overflow: hidden;">
              <thead>
                <tr style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Serviço</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${strategy.budgetItems.map(item => `
                  <tr style="border-bottom: 1px solid #e2e8f0;">
                    <td style="padding: 12px; color: #374151; font-weight: 500;">${item.service}</td>
                    <td style="padding: 12px; text-align: right; color: #3b82f6; font-weight: bold;">${item.value}</td>
                  </tr>
                `).join('')}
                <tr style="background: #f1f5f9;">
                  <td style="padding: 12px; color: #374151; font-weight: 600;">Total</td>
                  <td style="padding: 12px; text-align: right; color: #059669; font-weight: bold; font-size: 16px;">
                    R$ ${strategy.budgetItems.reduce((total, item) => {
      const value = parseFloat(item.value.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      return total + value;
    }, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px;">
          Relatório gerado automaticamente com base nos dados da estratégia
        </div>
      </div>
    `;

    // Configurações do PDF
    const opt = {
      margin: [10, 10] as [number, number],
      filename: `Relatório Estratégico ${strategy.product?.name || 'Estratégia'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Gerar e baixar o PDF
    html2pdf().set(opt).from(pdfContent).save();
  };

  // Função para salvar estratégia
  const handleSaveStrategy = async () => {
    if (!currentStrategy.product?.name || !currentStrategy.product?.campaignType) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (currentStrategy.audience?.locations.length === 0) {
      toast.error('Por favor, adicione pelo menos uma localização');
      return;
    }

    if (!currentStrategy.budget || (currentStrategy.budget.planned ?? 0) <= 0) {
      toast.error('Por favor, informe um investimento disponível válido');
      return;
    }

    try {
      // 🎯 CORREÇÃO: Gerar relatório estratégico com estratégia recomendada baseada nos dados
      const reportInput = convertStrategyToReport({
        product: currentStrategy.product!,
        budget: currentStrategy.budget!
      });

      console.log('🔍 [STRATEGY] Dados inseridos:', {
        product: currentStrategy.product,
        budget: currentStrategy.budget,
        reportInput
      });

      const strategyReport = buildStrategyReport(reportInput);

      console.log('🔍 [STRATEGY] Relatório gerado:', {
        recommendedStrategy: strategyReport.metrics.strategyType,
        selectedStrategyType: selectedStrategyType
      });

      // Usar a estratégia recomendada do relatório gerado
      const recommendedStrategyType = strategyReport.metrics.strategyType;

      console.log('🔍 [STRATEGY] Estratégia recomendada:', recommendedStrategyType);

      // Atualizar o selectedStrategyType para refletir a recomendação
      setSelectedStrategyType(recommendedStrategyType);

      console.log('🔍 [STRATEGY] selectedStrategyType atualizado:', recommendedStrategyType);

      // Aguardar um momento para garantir que o estado foi atualizado
      await new Promise(resolve => setTimeout(resolve, 100));

      // 🎯 CORREÇÃO: Incluir budgetItems na estratégia salva
      const validBudgetItems = budgetItems.filter(item => item.service.trim() !== '');

      const strategyToSave: AdStrategy = {
        id: editingStrategy || Date.now().toString(),
        product: currentStrategy.product!,
        audience: currentStrategy.audience!,
        budget: currentStrategy.budget!,
        generatedNames: currentStrategy.generatedNames!,
        client: selectedClient,
        month: selectedMonth,
        createdAt: editingStrategy ? strategies.find(s => s.id === editingStrategy)?.createdAt || new Date() : new Date(),
        isSynchronized: currentStrategy.isSynchronized || false,
        strategyReport: strategyReport,
        budgetItems: validBudgetItems.length > 0 ? validBudgetItems : []
      };

      if (editingStrategy) {
        await adStrategyService.updateStrategy(strategyToSave);
        setStrategies(prev => prev.map(s => s.id === editingStrategy ? strategyToSave : s));
        toast.success('Estratégia atualizada com sucesso!');
      } else {
        await adStrategyService.saveStrategy(strategyToSave);
        setStrategies(prev => [...prev, strategyToSave]);
        onStrategyCreated(strategyToSave);
        toast.success('Estratégia criada com sucesso!');
      }

      // 🎯 CORREÇÃO: Aguardar um momento para garantir que o selectedStrategyType foi atualizado
      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('🔍 [STRATEGY] Fechando modal com selectedStrategyType:', selectedStrategyType);

      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar estratégia:', error);
      toast.error('Erro ao salvar estratégia');
    }
  };

  // removido duplicado (mantemos a versão abaixo)

  // Função para deletar estratégia
  const handleDeleteStrategy = async (strategyId: string) => {
    try {
      await adStrategyService.removeStrategy(strategyId);
      setStrategies(prev => prev.filter(s => s.id !== strategyId));
      toast.success('Estratégia removida com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover estratégia');
    }
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

  // Função para adicionar interesse
  const handleAddInterest = () => {
    if (interestInput.trim() && !currentStrategy.audience?.interests.includes(interestInput.trim())) {
      setCurrentStrategy(prev => ({
        ...prev,
        audience: {
          ...prev.audience!,
          interests: [...(prev.audience?.interests || []), interestInput.trim()]
        }
      }));
      setInterestInput('');
    }
  };

  // Função para remover interesse
  const handleRemoveInterest = (interest: string) => {
    setCurrentStrategy(prev => ({
      ...prev,
      audience: {
        ...prev.audience!,
        interests: prev.audience?.interests.filter(i => i !== interest) || []
      }
    }));
  };

  // Função para adicionar remarketing
  const handleAddRemarketing = () => {
    if (remarketingInput.trim() && !currentStrategy.audience?.remarketing.includes(remarketingInput.trim())) {
      setCurrentStrategy(prev => ({
        ...prev,
        audience: {
          ...prev.audience!,
          remarketing: [...(prev.audience?.remarketing || []), remarketingInput.trim()]
        }
      }));
      setRemarketingInput('');
    }
  };

  // Função para remover remarketing
  const handleRemoveRemarketing = (remarketing: string) => {
    setCurrentStrategy(prev => ({
      ...prev,
      audience: {
        ...prev.audience!,
        remarketing: prev.audience?.remarketing.filter(r => r !== remarketing) || []
      }
    }));
  };

  // Função para gerar nomes
  const generateNames = () => {
    if (!currentStrategy.product?.name || !currentStrategy.product?.campaignType || !currentStrategy.product?.objective) return;

    const productName = `[${currentStrategy.product.name} ${currentStrategy.product.type}] [${currentStrategy.product.campaignType === 'sazonal' ? 'sazonal' : 'recorrente'}] [${currentStrategy.product.objective === 'trafico' ? 'tráfego' : currentStrategy.product.objective === 'mensagens' ? 'mensagens' : currentStrategy.product.objective === 'captura_leads' ? 'captura de leads' : 'compras'}]`;

    // Construir a nomenclatura do público
    const gender = currentStrategy.audience?.gender === 'homem' ? 'homens' : currentStrategy.audience?.gender === 'mulher' ? 'mulheres' : 'ambos os sexos';
    const ageRange = currentStrategy.audience?.ageRange || '';
    const locations = currentStrategy.audience?.locations || [];
    const interests = currentStrategy.audience?.interests || [];
    const remarketing = currentStrategy.audience?.remarketing || [];
    const scaleType = currentStrategy.audience?.scaleType;

    // Construir a nomenclatura do público
    let audienceName = `[${gender}] [${ageRange}]`;

    // Adicionar localização se houver
    if (locations.length > 0) {
      audienceName += ` [localização - ${locations.join(', ')}]`;
    }

    // Adicionar interesses se houver
    if (interests.length > 0) {
      audienceName += ` [interesses - ${interests.join(', ')}]`;
    } else {
      audienceName += ` [aberto]`;
    }

    // Adicionar remarketing se houver
    if (remarketing.length > 0) {
      audienceName += ` [rmkt - ${remarketing.join(', ')}]`;
    }

    // Adicionar escala se selecionada
    if (scaleType) {
      const scaleLabel = scaleType === 'vertical' ? 'Escala Vertical' : 'Escala Horizontal';
      audienceName += ` [${scaleLabel}]`;
    }

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
  }, [currentStrategy.product, currentStrategy.audience?.gender, currentStrategy.audience?.ageRange, currentStrategy.audience?.locations, currentStrategy.audience?.interests, currentStrategy.audience?.remarketing, currentStrategy.audience?.scaleType]);

  // Utilidades
  const getMonthDateRange = (monthLabel: string): { startDate: string; endDate: string } => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const [name, yearStr] = monthLabel.split(' ');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const monthIndex = Math.max(0, months.indexOf(name));
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
  };

  // Função para calcular o número de dias do período
  const getDaysInPeriod = (monthLabel: string): number => {
    const { startDate, endDate } = getMonthDateRange(monthLabel);
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o último dia
    return diffDays;
  };

  // Função para formatar valor monetário com separadores de milhares
  const formatCurrencyWithSeparators = (value: number): string => {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
    // Remove o "R$ " prefix pois estamos adicionando manualmente
    return formatted.replace('R$', '').trim();
  };

  // Função para formatar o valor por dia
  const formatValuePerDay = (value: number, days: number): string => {
    if (days <= 0) return 'R$0,00';
    const valuePerDay = value / days;
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valuePerDay);
  };

  const normalizeName = (value: string): string =>
    (value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      // Keep brackets and parentheses but normalize them
      .replace(/[\[\]\(\)]/g, ' ')
      // Remove other special characters but keep letters, numbers, and spaces
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const namesExactlyMatch = (adSetName: string, strategyAudienceName: string): boolean => {
    // First try exact match with current normalization
    const adSetNorm = normalizeName(adSetName);
    const strategyNorm = normalizeName(strategyAudienceName);


    if (adSetNorm === strategyNorm) {

      return true;
    }

    // 🎯 CORREÇÃO CRÍTICA: Verificar se há diferenças de localização antes de tentar matching flexível
    const extractLocation = (name: string): string => {
      const locationMatch = name.match(/localização\s*-\s*([^\]]+)/i);
      return locationMatch ? locationMatch[1].trim().toLowerCase() : '';
    };

    const adSetLocation = extractLocation(adSetName);
    const strategyLocation = extractLocation(strategyAudienceName);

    // Se ambas têm localização e são diferentes, NÃO fazer match
    if (adSetLocation && strategyLocation && adSetLocation !== strategyLocation) {

      return false;
    }

    // If exact match fails, try more flexible matching


    return namesFlexiblyMatch(adSetName, strategyAudienceName);
  };

  // More flexible name matching that handles bracket notation and variations
  const namesFlexiblyMatch = (adSetName: string, strategyAudienceName: string): boolean => {
    const adSetNormalized = normalizeName(adSetName);
    const strategyNormalized = normalizeName(strategyAudienceName);

    // If either is empty, no match
    if (!adSetNormalized || !strategyNormalized) return false;

    // 🎯 CORREÇÃO CRÍTICA: Verificar se há diferenças de localização
    // Extrair localizações dos nomes
    const extractLocation = (name: string): string => {
      const locationMatch = name.match(/localização\s*-\s*([^\]]+)/i);
      return locationMatch ? locationMatch[1].trim().toLowerCase() : '';
    };

    const adSetLocation = extractLocation(adSetName);
    const strategyLocation = extractLocation(strategyAudienceName);

    // Se ambas têm localização e são diferentes, NÃO fazer match
    if (adSetLocation && strategyLocation && adSetLocation !== strategyLocation) {

      return false;
    }

    // Split into words and filter out very short words
    const adSetWords = adSetNormalized.split(/\s+/).filter(word => word.length >= 3);
    const strategyWords = strategyNormalized.split(/\s+/).filter(word => word.length >= 3);

    // If either has no meaningful words, no match
    if (adSetWords.length === 0 || strategyWords.length === 0) return false;

    // Count how many words match between the two names
    let matchingWords = 0;
    let totalWords = Math.max(adSetWords.length, strategyWords.length);

    for (const adSetWord of adSetWords) {
      if (strategyWords.some(strategyWord =>
        strategyWord.includes(adSetWord) || adSetWord.includes(strategyWord)
      )) {
        matchingWords++;
      }
    }

    // Consider it a match if at least 60% of words match
    const matchThreshold = 0.6;
    const isMatch = (matchingWords / totalWords) >= matchThreshold;

    // Debug logging for name matching


    return isMatch;
  };

  // Sincronizar orçamento de UMA estratégia pela correspondência exata do nome do Ad Set
  const syncStrategyBudgetFromMeta = async (strategy: AdStrategy) => {
    if (!strategy?.generatedNames?.audience) return;
    try {
      // Guardas de conexão com Meta Ads
      const isConfigured = metaAdsService.isConfigured?.() ?? false;
      const isLogged = metaAdsService.isLoggedIn?.() ?? false;
      const hasAccount = !!metaAdsService.getSelectedAccount?.();
      if (!isConfigured || !isLogged || !hasAccount) {

        return;
      }

      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      // 🎯 DEBUG DETALHADO: Log inicial da estratégia


      // Buscar Ad Sets da conta no período

      const adSets = await metaAdsService.getAdSets();

      // 🎯 DEBUG DETALHADO: Log de todos os Ad Sets encontrados


      // 🎯 DEBUG ESPECIAL: Log detalhado do status de cada Ad Set
      adSets?.forEach((ad: any, index: number) => {

      });

      const wanted = strategy.generatedNames.audience;
      // 🎯 CORREÇÃO: Filtrar conjuntos ATIVOS ou PAUSADOS (não rascunhos)
      const matching = (adSets || []).filter((ad: any) =>
        namesExactlyMatch(ad.name, wanted) && (ad.status === 'ACTIVE' || ad.status === 'PAUSED')
      );

      // 🎯 DEBUG DETALHADO: Log do matching


      let totalSpend = 0;
      if (matching.length > 0) {

        // 🎯 DEBUG DETALHADO: Log antes de buscar insights


        const allInsights = await Promise.all(
          matching.map(async (ad: any) => {
            try {
              const insights = await metaAdsService.getAdSetInsights(ad.id, startDate, endDate, { fallbackToLast30Days: false });

              // 🎯 DEBUG DETALHADO: Log dos insights de cada Ad Set


              return insights;
            } catch (error) {
              console.error(`❌ DEBUG - Erro ao buscar insights para "${ad.name}":`, error);
              return [];
            }
          })
        );

        totalSpend = allInsights.flat().reduce((sum: number, insight: any) => sum + parseFloat(insight.spend || '0'), 0);

        // 🎯 DEBUG DETALHADO: Log do total gasto


      } else {

        // 🎯 DEBUG DETALHADO: Log quando não encontra matching

      }

      // Atualizar apenas para o período atual, não persistir no strategy
      const updated: AdStrategy = {
        ...strategy,
        budget: { ...strategy.budget, current: totalSpend },
        isSynchronized: matching.length > 0
      };

      // Atualizar apenas na UI, não persistir
      setStrategies(prev => prev.map(s => (s.id === strategy.id ? updated : s)));

      // Se a estratégia aberta no modal for a mesma, refletir também
      if (editingStrategy === strategy.id) {
        setCurrentStrategy(prev => ({
          ...prev,
          budget: { ...(prev.budget as any), current: totalSpend },
          isSynchronized: matching.length > 0
        }));
      }


    } catch (error) {
      console.warn('Erro ao sincronizar orçamento da estratégia:', error);
    }
  };

  // 🎯 NOVO: Sincronizar orçamento de remarketing de UMA estratégia
  const syncRemarketingBudgetFromMeta = async (strategy: AdStrategy) => {
    try {
      // Guardas de conexão com Meta Ads
      const isConfigured = metaAdsService.isConfigured?.() ?? false;
      const isLogged = metaAdsService.isLoggedIn?.() ?? false;
      const hasAccount = !!metaAdsService.getSelectedAccount?.();
      if (!isConfigured || !isLogged || !hasAccount) {
        return;
      }

      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      // Buscar Ad Sets da conta no período
      const adSets = await metaAdsService.getAdSets();

      // Sincronizar cada remarketing
      const remarketingKeys: ('remarketing1' | 'remarketing2' | 'remarketing3')[] = ['remarketing1', 'remarketing2', 'remarketing3'];

      for (const remarketingKey of remarketingKeys) {
        const remarketing = strategy[remarketingKey];
        if (!remarketing?.audienceName) continue;

        const wanted = remarketing.audienceName;

        // 🎯 CORREÇÃO: Para remarketing, usar match ESTRITO em vez de flexível
        const matching = (adSets || []).filter((ad: any) => {
          const adSetNorm = normalizeName(ad.name);
          const strategyNorm = normalizeName(wanted);
          const exactMatch = adSetNorm === strategyNorm;
          const isActiveOrPaused = (ad.status === 'ACTIVE' || ad.status === 'PAUSED');

          console.log('🔍 [REMARKETING MATCH] Verificando:', {
            remarketingKey,
            adSetName: ad.name,
            remarketingName: wanted,
            adSetNorm,
            strategyNorm,
            exactMatch,
            isActiveOrPaused,
            finalMatch: exactMatch && isActiveOrPaused
          });

          return exactMatch && isActiveOrPaused;
        });

        let totalSpend = 0;
        if (matching.length > 0) {
          console.log('🔍 [REMARKETING MATCH] Encontrou match:', {
            remarketingKey,
            remarketingName: wanted,
            matchingCount: matching.length,
            matchingNames: matching.map((ad: any) => ad.name)
          });

          const allInsights = await Promise.all(
            matching.map(async (ad: any) => {
              try {
                const insights = await metaAdsService.getAdSetInsights(ad.id, startDate, endDate, { fallbackToLast30Days: false });
                return insights;
              } catch (error) {
                console.error(`❌ DEBUG - Erro ao buscar insights para remarketing "${ad.name}":`, error);
                return [];
              }
            })
          );

          totalSpend = allInsights.flat().reduce((sum: number, insight: any) => sum + parseFloat(insight.spend || '0'), 0);
        } else {
          console.log('🔍 [REMARKETING MATCH] NÃO encontrou match:', {
            remarketingKey,
            remarketingName: wanted,
            availableAdSets: adSets.map((ad: any) => ad.name)
          });
        }

        // Atualizar apenas na UI, não persistir
        setStrategies(prev => prev.map(s => {
          if (s.id === strategy.id && s[remarketingKey]) {
            return {
              ...s,
              [remarketingKey]: {
                ...s[remarketingKey],
                budget: { ...s[remarketingKey].budget, current: totalSpend },
                isSynchronized: matching.length > 0
              }
            };
          }
          return s;
        }));

        // Se a estratégia aberta no modal for a mesma, refletir também
        if (editingStrategy === strategy.id) {
          setCurrentStrategy(prev => ({
            ...prev,
            [remarketingKey]: {
              ...prev[remarketingKey],
              budget: { ...prev[remarketingKey]?.budget, current: totalSpend },
              isSynchronized: matching.length > 0
            }
          }));
        }
      }

    } catch (error) {
      console.warn('Erro ao sincronizar orçamento de remarketing da estratégia:', error);
    }
  };

  // Avaliar performance de uma estratégia e recomendar escala
  const evaluateStrategyPerformance = async (strategy: AdStrategy) => {
    try {
      // Guardas de conexão com Meta Ads
      const isConfigured = metaAdsService.isConfigured?.() ?? false;
      const isLogged = metaAdsService.isLoggedIn?.() ?? false;
      const hasAccount = !!metaAdsService.getSelectedAccount?.();
      if (!isConfigured || !isLogged || !hasAccount) {
        return;
      }

      const { startDate, endDate } = getMonthDateRange(selectedMonth);

      // 🎯 DEBUG: Log inicial da avaliação de performance

      // 🎯 DEBUG ESPECIAL: Verificar se é a estratégia "Salvador"
      const isSalvadorStrategy = strategy.generatedNames.audience.includes('Salvador') || normalizeName(strategy.generatedNames.audience).includes('salvador');
      if (isSalvadorStrategy) {

      }

      const adSets = await metaAdsService.getAdSets();


      const wanted = strategy.generatedNames.audience;
      // 🎯 CORREÇÃO: Filtrar conjuntos ATIVOS ou PAUSADOS (não rascunhos)
      const matching = (adSets || []).filter((ad: any) =>
        namesExactlyMatch(ad.name, wanted) && (ad.status === 'ACTIVE' || ad.status === 'PAUSED')
      );



      // 🎯 DEBUG ESPECIAL: Verificar se é a estratégia "Salvador" (usando a variável já declarada)
      if (isSalvadorStrategy) {


        adSets?.forEach((ad: any, index: number) => {
          const isMatch = namesExactlyMatch(ad.name, wanted);


          // 🎯 DEBUG DETALHADO: Mostrar localizações extraídas
          const extractLocation = (name: string): string => {
            const locationMatch = name.match(/localização\s*-\s*([^\]]+)/i);
            return locationMatch ? locationMatch[1].trim().toLowerCase() : '';
          };
          const adLocation = extractLocation(ad.name);
          const strategyLocation = extractLocation(wanted);

        });
      }



      // 🚀 CRÍTICO - Debug detalhado do matching
      if (matching.length === 0 && adSets && adSets.length > 0) {



        adSets.forEach((ad: any, index: number) => {
          const isMatch = namesExactlyMatch(ad.name, wanted);


        });

        // Tentar matching mais flexível - MAS COM CRITÉRIOS MAIS RIGOROSOS

        const flexibleMatches = adSets.filter((ad: any) => {
          const adNorm = normalizeName(ad.name).toLowerCase();
          const stratNorm = normalizeName(wanted).toLowerCase();

          // 🎯 CORREÇÃO CRÍTICA: Extrair localização de ambos
          const extractLocation = (name: string): string => {
            const locationMatch = name.match(/localização\s*-\s*([^\]]+)/i);
            return locationMatch ? locationMatch[1].trim().toLowerCase() : '';
          };

          const adLocation = extractLocation(ad.name);
          const strategyLocation = extractLocation(wanted);

          // 🎯 CORREÇÃO: LOCALIZAÇÃO DEVE SER EXATA OU MUITO SIMILAR
          const locationMatches = adLocation === strategyLocation ||
            adLocation.includes(strategyLocation) ||
            strategyLocation.includes(adLocation);

          // Se as localizações não batem, NÃO fazer match
          if (!locationMatches) {
            return false;
          }

          // Verificar se contém palavras-chave da estratégia (mas ser mais rigoroso)
          const stratWords = stratNorm.split(' ').filter(w => w.length >= 3);
          const matchingWords = stratWords.filter(word => adNorm.includes(word));

          // 🎯 CORREÇÃO: Exigir pelo menos 70% das palavras-chave importantes
          const requiredWords = Math.max(3, Math.floor(stratWords.length * 0.7));

          return matchingWords.length >= requiredWords;
        });

        // 🎯 DEBUG DETALHADO: Log dos flexible matches


        // 🎯 DEBUG DETALHADO: Log do processo de matching flexível
        adSets.forEach((ad: any) => {
          const adNorm = normalizeName(ad.name).toLowerCase();
          const stratNorm = normalizeName(wanted).toLowerCase();

          const extractLocation = (name: string): string => {
            const locationMatch = name.match(/localização\s*-\s*([^\]]+)/i);
            return locationMatch ? locationMatch[1].trim().toLowerCase() : '';
          };

          const adLocation = extractLocation(ad.name);
          const strategyLocation = extractLocation(wanted);

          const locationMatches = adLocation === strategyLocation ||
            adLocation.includes(strategyLocation) ||
            strategyLocation.includes(adLocation);

          const stratWords = stratNorm.split(' ').filter(w => w.length >= 3);
          const matchingWords = stratWords.filter(word => adNorm.includes(word));
          const requiredWords = Math.max(3, Math.floor(stratWords.length * 0.7));


        });

        // 🎯 CORREÇÃO CRÍTICA: Usar matches flexíveis se encontrados, MAS APENAS OS ATIVOS OU PAUSADOS
        const activeFlexibleMatches = flexibleMatches.filter((ad: any) => ad.status === 'ACTIVE' || ad.status === 'PAUSED');



        if (activeFlexibleMatches.length > 0) {

          matching.push(...activeFlexibleMatches);
        }
      }

      // 🎯 CORREÇÃO: Buscar dados específicos dos conjuntos de anúncios
      let totals = {
        spend: 0,
        leads: 0,
        sales: 0,
        clicks: 0,
        impressions: 0,
        reach: 0,
        lpv: 0,
        linkClicks: 0,
        revenue: 0,
        cprSamples: [] as number[],
        cplSamples: [] as number[]
      };

      let insightsFlat: any[] = [];

      if (matching.length > 0) {

        // 🎯 DEBUG DETALHADO: Log antes de buscar insights


        // 🎯 CORREÇÃO: Buscar insights específicos de cada conjunto
        const allInsights = await Promise.all(
          matching.map(async (ad: any) => {
            try {
              const insights = await metaAdsService.getAdSetInsights(ad.id, startDate, endDate, { fallbackToLast30Days: false });

              // 🎯 DEBUG DETALHADO: Log dos insights de cada Ad Set


              // 🎯 DEBUG ESPECIAL: Log detalhado para ad sets "Salvador"
              const isSalvadorAdSet = ad.name.includes('Salvador') || normalizeName(ad.name).includes('salvador');
              if (isSalvadorAdSet) {

              }


              return insights;
            } catch (error) {
              console.error(`❌ DEBUG - Erro ao buscar insights para "${ad.name}":`, error);
              return [];
            }
          })
        );



        // 🎯 DEBUG DETALHADO: Log antes de filtrar insights


        // 🎯 CORREÇÃO: Filtrar apenas insights com gasto real no período
        insightsFlat = allInsights.flat().filter((i: any) => {
          const insightDate = new Date(i.date_start);
          const start = new Date(startDate);
          const end = new Date(endDate);
          const isInPeriod = insightDate >= start && insightDate <= end;
          const hasSpend = parseFloat(i.spend || '0') > 0;

          // 🎯 DEBUG ESPECIAL: Log detalhado para insights com spend > 0
          if (hasSpend && isSalvadorStrategy) {

          }



          return isInPeriod && hasSpend;
        });

        // 🎯 DEBUG DETALHADO: Log após filtrar insights




        // 🎯 DEBUG ESPECIAL: Log detalhado para estratégia "Salvador"
        if (isSalvadorStrategy) {

          if (insightsFlat.length > 0) {

          }
        }

        // 🎯 CORREÇÃO: Calcular totais diretamente dos insights filtrados
        if (insightsFlat.length > 0) {
          // 🎯 DEBUG ESPECIAL: Log detalhado para estratégia "Salvador" antes do cálculo
          if (isSalvadorStrategy) {

          }

          totals = insightsFlat.reduce(
            (acc: any, i: any) => {
              const spend = parseFloat(i.spend || '0');
              acc.spend += spend;
              acc.leads += parseInt(i.actions?.find((a: any) => a.action_type === 'lead')?.value || '0');
              acc.sales += parseInt(i.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0');
              acc.clicks += parseInt(i.clicks || '0');
              acc.impressions += parseInt(i.impressions || '0');
              acc.reach += parseInt(i.reach || '0');
              acc.lpv += parseInt(i.landing_page_views || '0');
              acc.linkClicks += parseInt(i.link_clicks || '0');
              acc.revenue += parseFloat(i.actions?.find((a: any) => a.action_type === 'purchase')?.value || '0');

              // 🎯 DEBUG ESPECIAL: Log para cada insight da estratégia "Salvador"
              if (isSalvadorStrategy) {

              }

              return acc;
            },
            {
              spend: 0,
              leads: 0,
              sales: 0,
              clicks: 0,
              impressions: 0,
              reach: 0,
              lpv: 0,
              linkClicks: 0,
              revenue: 0,
              cprSamples: [] as number[],
              cplSamples: [] as number[]
            }
          );

          // 🎯 DEBUG DETALHADO: Log dos totais calculados




          // 🎯 DEBUG ESPECIAL: Log detalhado para estratégia "Salvador"
          if (isSalvadorStrategy) {


          }
        } else {


          // 🎯 DEBUG ESPECIAL: Log para estratégia "Salvador" sem insights
          if (isSalvadorStrategy) {

          }
        }
      } else {


        // 🎯 DEBUG ESPECIAL: Log para estratégia "Salvador" sem ad sets
        if (isSalvadorStrategy) {


        }
      }

      // Calcular métricas principais
      const ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0;
      const cpr = totals.sales > 0 ? totals.spend / totals.sales : 0;     // Compras
      const cplStrict = totals.leads > 0 ? totals.spend / totals.leads : 0; // Mensagens/Leads
      const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;     // Tráfego
      const frequency = calculateFrequency(totals.impressions, totals.reach);
      const roas = calculateROAS(totals.revenue, totals.spend);
      const lpvRate = calculateLPVRate(totals.lpv, totals.linkClicks);

      let rec: { type: 'vertical' | 'horizontal' | 'wait'; tooltip: string } = { type: 'wait', tooltip: 'Aguardando mais dados' };

      const objective = strategy.product.objective; // trafico | mensagens | compras

      // REGRA 1: Validar tamanho mínimo da amostra ANTES de qualquer decisão
      const hasMinimumData = hasMinimumSampleSize(totals, objective);

      if (!hasMinimumData) {
        rec = {
          type: 'wait',
          tooltip: `Dados insuficientes: ${totals.impressions} impressões, ${totals.clicks} cliques. Mínimo: 3.000 impressões e 100 cliques ou gasto ≥ 2× CPA/CPL alvo.`
        };
      } else {
        // REGRA 2: Validar estabilidade (média móvel de 3-7 dias)
        const hasStableData = hasStability(insightsFlat);

        // REGRA 3: Validar frequência
        const frequencyOk = isFrequencyAcceptable(frequency, objective);

        if (objective === 'mensagens' || objective === 'trafico') {
          const perfValue = objective === 'mensagens' ? cplStrict : cpc;
          const goodCPL = perfValue > 0 && perfValue <= (objective === 'mensagens' ? 15 : 1.2);
          const okCPL = perfValue > 0 && perfValue <= (objective === 'mensagens' ? 25 : 2.5);

          // REGRAS ESPECÍFICAS PARA MENSAGENS
          if (objective === 'mensagens') {
            const hasEnoughLeads = totals.leads >= 10; // Mínimo 10 leads

            if (goodCPL && ctr >= 1.5 && frequencyOk && hasEnoughLeads && hasStableData) {
              rec = {
                type: 'vertical',
                tooltip: `Desempenho forte para Mensagens: CTR ${ctr.toFixed(2)}%, CPL ${formatCurrencyNumber(perfValue)}, ${totals.leads} leads, freq ${frequency.toFixed(1)}. Aumente orçamento gradualmente.`
              };
            } else if (okCPL && ctr >= 1.0 && frequency <= 2.5) {
              rec = {
                type: 'horizontal',
                tooltip: `Bom desempenho: CTR ${ctr.toFixed(2)}%, CPL ${formatCurrencyNumber(perfValue)}, freq ${frequency.toFixed(1)}. Teste novos criativos/públicos (escala horizontal).`
              };
            } else {
              rec = {
                type: 'wait',
                tooltip: `Aguardando otimização: CTR ${ctr.toFixed(2)}%, CPL ${formatCurrencyNumber(perfValue)}, ${totals.leads} leads, freq ${frequency.toFixed(1)}.`
              };
            }
          }
          // REGRAS ESPECÍFICAS PARA TRÁFEGO
          else if (objective === 'trafico') {
            const lpvRateOk = isLPVRateAcceptable(lpvRate);

            if (goodCPL && ctr >= 1.5 && frequencyOk && lpvRateOk && hasStableData) {
              rec = {
                type: 'vertical',
                tooltip: `Desempenho forte para Tráfego: CTR ${ctr.toFixed(2)}%, CPC ${formatCurrencyNumber(perfValue)}, LPV rate ${lpvRate.toFixed(1)}%, freq ${frequency.toFixed(1)}. Aumente orçamento gradualmente.`
              };
            } else if (okCPL && ctr >= 1.0 && frequency <= 3.0) {
              rec = {
                type: 'horizontal',
                tooltip: `Bom desempenho: CTR ${ctr.toFixed(2)}%, CPC ${formatCurrencyNumber(perfValue)}, freq ${frequency.toFixed(1)}. Teste novos criativos/públicos (escala horizontal).`
              };
            } else {
              rec = {
                type: 'wait',
                tooltip: `Aguardando otimização: CTR ${ctr.toFixed(2)}%, CPC ${formatCurrencyNumber(perfValue)}, LPV rate ${lpvRate.toFixed(1)}%, freq ${frequency.toFixed(1)}.`
              };
            }
          }
        } else if (objective === 'compras') {
          const salesEnough = totals.sales >= 3;
          const targetROAS = 1.5; // ROAS alvo (ajustável conforme margem)
          const targetCPA = 30; // CPA alvo (ajustável)

          // REGRAS ESPECÍFICAS PARA COMPRAS
          if (salesEnough && cpr > 0 && cpr <= targetCPA && roas >= targetROAS && frequencyOk && hasStableData) {
            rec = {
              type: 'vertical',
              tooltip: `Compras consistentes: CPR ${formatCurrencyNumber(cpr)}, ROAS ${roas.toFixed(2)}x, ${totals.sales} vendas, freq ${frequency.toFixed(1)}. Escale orçamento (vertical).`
            };
          } else if (cpr > 0 && cpr <= targetCPA * 1.3 && roas >= targetROAS * 0.8 && frequency <= 3.0) {
            rec = {
              type: 'horizontal',
              tooltip: `Algumas compras: CPR ${formatCurrencyNumber(cpr)}, ROAS ${roas.toFixed(2)}x. Expandir públicos/criativos (horizontal).`
            };
          } else {
            rec = {
              type: 'wait',
              tooltip: `Pouca sinalização de compras ou métricas fora do alvo: CPR ${formatCurrencyNumber(cpr)}, ROAS ${roas.toFixed(2)}x, ${totals.sales} vendas, freq ${frequency.toFixed(1)}.`
            };
          }
        } else if (objective === 'captura_leads') {
          const leadsEnough = totals.leads >= 10;
          const targetCPL = 15; // CPL alvo para captura de leads

          // REGRAS ESPECÍFICAS PARA CAPTURA DE LEADS
          if (leadsEnough && cplStrict > 0 && cplStrict <= targetCPL && ctr >= 1.5 && frequencyOk && hasStableData) {
            rec = {
              type: 'vertical',
              tooltip: `Captura de leads eficiente: CPL ${formatCurrencyNumber(cplStrict)}, ${totals.leads} leads, CTR ${ctr.toFixed(2)}%, freq ${frequency.toFixed(1)}. Escale orçamento (vertical).`
            };
          } else if (cplStrict > 0 && cplStrict <= targetCPL * 1.3 && ctr >= 1.0 && frequency <= 3.0) {
            rec = {
              type: 'horizontal',
              tooltip: `Boa captura de leads: CPL ${formatCurrencyNumber(cplStrict)}, ${totals.leads} leads, CTR ${ctr.toFixed(2)}%. Teste novos criativos/públicos (horizontal).`
            };
          } else {
            rec = {
              type: 'wait',
              tooltip: `Aguardando otimização para captura de leads: CPL ${formatCurrencyNumber(cplStrict)}, ${totals.leads} leads, CTR ${ctr.toFixed(2)}%, freq ${frequency.toFixed(1)}.`
            };
          }
        }
      }




      setRecommendations(prev => ({
        ...prev,
        [strategy.id]: {
          ...rec,
          stats: {
            spend: totals.spend,
            ctr,
            cpl: objective === 'mensagens' ? cplStrict : cpc,
            cpr,
            clicks: totals.clicks,
            impressions: totals.impressions,
            leads: totals.leads,
            sales: totals.sales,
            frequency,
            roas,
            lpvRate,
            objective,
            adSetsCount: matching.length,
            periodStart: startDate,
            periodEnd: endDate
          }
        }
      }));

      // Atualizar o budget.current apenas para o período atual (não persistir)
      if (matching.length > 0) {
        setStrategies(prev => prev.map(s =>
          s.id === strategy.id
            ? { ...s, budget: { ...s.budget, current: totals.spend }, isSynchronized: true }
            : s
        ));
      }
    } catch (error) {
      console.warn('Erro ao avaliar performance da estratégia:', error);
      // Não sobreescrever tooltip com erro; manter último sucesso ou estado "aguardando dados"
    }
  };

  // Agrupar estratégias por produto, exibindo apenas se tiver gasto no período OU se foi criada no período
  const strategiesByProduct = ((): Record<string, { name: string; campaignType: string; strategies: AdStrategy[] }> => {
    // Filtrar por visibilidade inteligente - só aparece se tiver gasto OU se foi criada no período
    const filtered = strategies.filter((s) => {
      const rec = recommendations[s.id];
      const createdInPeriod = s.month === selectedMonth;
      const hasSpendInPeriod = (rec?.stats?.spend || 0) > 0;

      // 🎯 CORREÇÃO: LÓGICA DE VISIBILIDADE POR PERÍODO

      // 1. Se foi criada no período atual/futuro, sempre mostrar
      if (createdInPeriod) {

        return true;
      }

      // 2. Se tem gasto no período atual, mostrar
      if (hasSpendInPeriod) {

        return true;
      }

      // 3. Verificar se é período passado sem gasto - NÃO mostrar
      const currentMonth = new Date();
      const strategyMonth = new Date(s.month + ' 1, 2025'); // Assumindo 2025

      if (strategyMonth < currentMonth && !hasSpendInPeriod) {

        return false;
      }

      // 4. Se é período futuro, mostrar
      if (strategyMonth > currentMonth) {

        return true;
      }

      // 5. Fallback: não mostrar se não atender nenhum critério

      return false;
    });



    const result = filtered.reduce((acc, strategy) => {
      const productKey = `${strategy.product.name}-${strategy.product.campaignType}`;
      if (!acc[productKey]) {
        acc[productKey] = {
          name: strategy.product.name,
          campaignType: strategy.product.campaignType,
          strategies: []
        };
      }
      acc[productKey].strategies.push(strategy);
      return acc;
    }, {} as Record<string, { name: string; campaignType: string; strategies: AdStrategy[] }>);

    // 🎯 CORREÇÃO: Ordenar estratégias por data de criação (mais recente primeiro)
    Object.keys(result).forEach(productKey => {
      result[productKey].strategies.sort((a: AdStrategy, b: AdStrategy) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA; // Mais recente primeiro
      });
    });

    return result;
  })();

  // Função para obter o budget atual do período específico
  const getCurrentPeriodBudget = (strategy: AdStrategy): number => {
    const rec = recommendations[strategy.id];
    return rec?.stats?.spend || 0;
  };

  // Função para obter se está sincronizado no período atual
  const getCurrentPeriodSyncStatus = (strategy: AdStrategy): boolean => {
    const rec = recommendations[strategy.id];
    const hasAdSets = rec?.stats?.adSetsCount > 0;
    const hasSpend = (rec?.stats?.spend || 0) > 0;

    // Debug logging for sync status


    // Consider synchronized if we have ad sets OR if we have spend data
    return hasAdSets || hasSpend;
  };

  // Função para calcular frequência (impressões / reach único)
  const calculateFrequency = (impressions: number, reach: number): number => {
    return reach > 0 ? impressions / reach : 0;
  };

  // Função para validar tamanho mínimo da amostra
  const hasMinimumSampleSize = (totals: any, objective: string): boolean => {
    const { impressions, clicks, spend } = totals;

    // Critério base: Impressões ≥ 3.000 e cliques ≥ 100
    const baseCriteria = impressions >= 3000 && clicks >= 100;

    // Critério alternativo: gasto ≥ 2× o CPA/CPL alvo
    let targetCriteria = false;

    if (objective === 'mensagens') {
      const targetCPL = 15; // CPL alvo
      targetCriteria = spend >= (targetCPL * 2);
    } else if (objective === 'trafico') {
      const targetCPC = 1.2; // CPC alvo
      targetCriteria = spend >= (targetCPC * clicks * 2);
    } else if (objective === 'compras') {
      const targetCPA = 30; // CPA alvo (exemplo)
      targetCriteria = spend >= (targetCPA * 2);
    } else if (objective === 'captura_leads') {
      const targetCPL = 15; // CPL alvo para captura de leads
      targetCriteria = spend >= (targetCPL * 2);
    }

    return baseCriteria || targetCriteria;
  };

  // Função para calcular ROAS (Return on Ad Spend)
  const calculateROAS = (revenue: number, spend: number): number => {
    return spend > 0 ? revenue / spend : 0;
  };

  // Função para validar estabilidade (média móvel de 3-7 dias)
  const hasStability = (insights: any[]): boolean => {
    if (insights.length < 3) return false;

    // Ordenar por data
    const sortedInsights = insights.sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

    // Verificar se há pelo menos 2 dias consecutivos com performance consistente
    let consecutiveGoodDays = 0;
    for (let i = 1; i < sortedInsights.length; i++) {
      const current = sortedInsights[i];
      const previous = sortedInsights[i - 1];

      const currentSpend = parseFloat(current.spend || '0');
      const previousSpend = parseFloat(previous.spend || '0');

      // Considerar "bom" se gasto > 0 e não houve queda drástica (>50%)
      if (currentSpend > 0 && (previousSpend === 0 || currentSpend >= previousSpend * 0.5)) {
        consecutiveGoodDays++;
      } else {
        consecutiveGoodDays = 0;
      }
    }

    return consecutiveGoodDays >= 2;
  };

  // Função para validar frequência
  const isFrequencyAcceptable = (frequency: number, objective: string): boolean => {
    if (objective === 'compras') {
      return frequency <= 2.5; // Mais restritivo para compras
    } else if (objective === 'captura_leads') {
      return frequency <= 2.5; // Restritivo para captura de leads
    }
    return frequency <= 3.0; // Até 3 para outros objetivos
  };

  // Função para calcular LPV rate (Landing Page View rate)
  const calculateLPVRate = (lpv: number, linkClicks: number): number => {
    return linkClicks > 0 ? (lpv / linkClicks) * 100 : 0;
  };

  // Função para validar LPV rate para tráfego
  const isLPVRateAcceptable = (lpvRate: number): boolean => {
    return lpvRate >= 70; // LPV/Link Click ≥ 70%
  };

  // Debug function to help understand strategy synchronization
  const debugStrategySync = () => {

    strategies.forEach(strategy => {
      const rec = recommendations[strategy.id];








    });
  };

  // Add debug function to window for easy access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugStrategySync = debugStrategySync;
      (window as any).syncStrategyManually = (strategyId: string) => {
        const strategy = strategies.find(s => s.id === strategyId);
        if (strategy) {

          syncStrategyBudgetFromMeta(strategy);
          evaluateStrategyPerformance(strategy);
        } else {

        }
      };
      (window as any).syncAllStrategies = () => {

        strategies.forEach(strategy => {
          syncStrategyBudgetFromMeta(strategy);
          evaluateStrategyPerformance(strategy);
        });
      };
      (window as any).clearSyncCache = () => {

        hasEvaluatedRef.current.clear();
        hasSyncedRef.current.clear();

      };
      (window as any).forceResync = () => {

        hasEvaluatedRef.current.clear();
        hasSyncedRef.current.clear();
        strategies.forEach(strategy => {
          syncStrategyBudgetFromMeta(strategy);
          evaluateStrategyPerformance(strategy);
        });
      };
      (window as any).testNameMatching = (adSetName: string, strategyName: string) => {






      };








      (window as any).debugStrategyMatching = async (strategyName: string) => {


        try {
          const { metaAdsService } = await import('../services/metaAdsService');
          if (!metaAdsService.isLoggedIn()) {

            return;
          }

          const adSets = await metaAdsService.getAdSets();


          if (adSets && adSets.length > 0) {

            adSets.forEach((ad: any, index: number) => {
              const isMatch = namesExactlyMatch(ad.name, strategyName);

            });


            const flexibleMatches = adSets.filter((ad: any) => {
              const adNorm = normalizeName(ad.name).toLowerCase();
              const stratNorm = normalizeName(strategyName).toLowerCase();
              const stratWords = stratNorm.split(' ').filter(w => w.length >= 3);
              const matchingWords = stratWords.filter(word => adNorm.includes(word));
              return matchingWords.length >= Math.min(2, stratWords.length);
            });


          }
        } catch (error) {
          console.error('❌ Erro ao testar matching:', error);
        }
      };


    }
  }, [strategies, recommendations]);



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
            <span>Nova Campanha</span>
          </button>
        </div>

        {/* Modal de Relatório Estratégico */}
        <StrategyReportModal
          isOpen={isReportModalOpen}
          onClose={() => {
            setIsReportModalOpen(false);
            setSelectedReport(null);
          }}
          selectedReport={selectedReport}
          selectedStrategyType={selectedStrategyType}
          saveSelectedStrategy={saveSelectedStrategy}
          budgetItems={budgetItems}
          handleUpdateBudgetItem={handleUpdateBudgetItem}
          handleRemoveBudgetItem={handleRemoveBudgetItem}
          handleAddBudgetItem={handleAddBudgetItem}
          handleSaveBudget={handleSaveBudget}
          hasUnsavedChanges={hasUnsavedChanges}
          extractDigits={extractDigits}
          formatBRLFromDigits={formatBRLFromDigits}
          onExportPDF={handleExportPDF}
        />




        {/* Lista de estratégias agrupadas por produto */}
        <div className="space-y-6">
          {
            Object.entries(strategiesByProduct)
              .filter(([, productData]) => productData.strategies.length > 0)
              .map(([productKey, productData]) => (
                <motion.div
                  key={productKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-2xl shadow-md overflow-hidden"
                >
                  {/* Header da campanha */}
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
                      <div>
                        <h4 className="text-lg font-semibold text-slate-200">{productData.name}</h4>
                        <p className="text-sm text-slate-400">{productData.campaignType}</p>
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

                  {/* Estratégias da campanha */}
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
                          {productData.strategies
                            .map((strategy) => (
                              <motion.div
                                key={strategy.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-600/40 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200 hover:border-slate-500/50 group"
                              >
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex-1 relative">
                                    {/* Botões de ação no canto superior direito */}
                                    <div className="absolute -top-3 -right-3 flex items-center gap-1 bg-slate-900/95 backdrop-blur-md border border-slate-600/40 rounded-xl px-2.5 py-1.5 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:opacity-100 z-50">
                                      <button
                                        onClick={() => handleOpenModal(strategy)}
                                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700/60 rounded-lg transition-all duration-200 hover:scale-110"
                                      >
                                        <Edit className="w-3.5 h-3.5" />
                                      </button>
                                      <div className="w-px h-4 bg-slate-600/40"></div>
                                      <button
                                        onClick={() => handleNewYellowIcon(strategy)}
                                        disabled={!canCreateMoreRemarketing(strategy)}
                                        className={`p-1.5 rounded-lg transition-all duration-200 ${canCreateMoreRemarketing(strategy)
                                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/30 hover:scale-110'
                                          : 'text-slate-500 cursor-not-allowed opacity-50'
                                          }`}
                                      >
                                        🎯
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
                                        <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide block mb-2">Campanha</span>
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
                                              <div className="flex items-center gap-2 flex-1">
                                                <p className="text-sm text-yellow-300 font-medium leading-relaxed">{strategy.generatedNames.audience}</p>
                                              </div>
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
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">ORÇAMENTO</span>
                                          {isStrategyPaused(strategy) && (
                                            <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30 animate-pulse">
                                              PAUSADO
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {(() => {
                                            const currentBudget = getCurrentPeriodBudget(strategy);
                                            const plannedBudget = strategy.budget.planned;
                                            const daysInPeriod = getDaysInPeriod(selectedMonth);
                                            const valuePerDay = formatValuePerDay(plannedBudget, daysInPeriod);
                                            const isSynchronized = getCurrentPeriodSyncStatus(strategy);

                                            return (
                                              <span className="text-xs text-slate-300 font-medium">
                                                <span className={isSynchronized ? "text-blue-400" : "text-slate-300"}>
                                                  R$ {formatCurrencyWithSeparators(currentBudget)}
                                                </span> / <span className="font-normal">R$ {formatCurrencyWithSeparators(plannedBudget)}</span> ({valuePerDay}/dia)
                                              </span>
                                            );
                                          })()}
                                          <div className="flex items-center gap-1 relative group/sync">
                                            <div
                                              className={`w-2 h-2 rounded-full ${getCurrentPeriodSyncStatus(strategy) ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse'} cursor-help`}
                                              onMouseEnter={(e) => {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                const tooltip = e.currentTarget.parentElement?.querySelector('.tooltip-sync') as HTMLElement;
                                                if (tooltip) {
                                                  tooltip.style.left = `${rect.left - 260}px`;
                                                  tooltip.style.top = `${rect.top - 30}px`;
                                                  tooltip.style.display = 'block';
                                                }
                                              }}
                                              onMouseLeave={(e) => {
                                                const tooltip = e.currentTarget.parentElement?.querySelector('.tooltip-sync') as HTMLElement;
                                                if (tooltip) {
                                                  tooltip.style.display = 'none';
                                                }
                                              }}
                                            />
                                            {/* Tooltip elegante */}
                                            <div className="tooltip-sync fixed z-[999999] hidden">
                                              <div className="min-w-[200px] max-w-[250px] text-xs rounded-lg shadow-xl border border-slate-600/40">
                                                <div className="p-3 bg-slate-900 rounded-lg border-slate-600/40">
                                                  <div className="text-slate-200 font-semibold mb-1 flex items-center gap-2">
                                                    {getCurrentPeriodSyncStatus(strategy) ? (
                                                      <>
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                                        <span>Sincronizado</span>
                                                      </>
                                                    ) : (
                                                      <>
                                                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                        <span>Não sincronizado</span>
                                                      </>
                                                    )}
                                                  </div>
                                                  <div className="text-slate-300 leading-relaxed">
                                                    {getCurrentPeriodSyncStatus(strategy)
                                                      ? 'Orçamento atualizado automaticamente com base no gasto real do conjunto de anúncios.'
                                                      : 'Para sincronizar, é necessário que exista um conjunto de anúncios no Meta Ads com o nome exatamente igual à nomenclatura do público.'
                                                    }
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="w-full bg-slate-600/50 rounded-full h-2.5 overflow-hidden">
                                        {(() => {
                                          const isPaused = isStrategyPaused(strategy);
                                          const progressPercentage = isPaused
                                            ? 100
                                            : Math.min((getCurrentPeriodBudget(strategy) / strategy.budget.planned) * 100, 100);

                                          return (
                                            <div
                                              className={`h-2.5 rounded-full transition-all duration-500 shadow-sm ${isPaused
                                                ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 animate-pulse'
                                                : 'bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500'
                                                }`}
                                              style={{ width: `${progressPercentage}%` }}
                                            />
                                          );
                                        })()}
                                      </div>
                                    </div>

                                    {/* Análise Estratégica - Posicionada harmonicamente após o orçamento */}
                                    {/* Análise Estratégica - Design Clean e Elegante */}
                                    {strategy.strategyReport && (
                                      <div className="mt-4 bg-slate-800/20 border border-slate-700/30 rounded-2xl p-5 backdrop-blur-sm">
                                        <div className="space-y-5">
                                          {/* Header Minimalista */}
                                          <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-slate-600/50 flex items-center justify-center">
                                              <Target className="w-3 h-3 text-slate-300" />
                                            </div>
                                            <div>
                                              <h4 className="text-sm font-semibold text-slate-200">
                                                Análise Estratégica
                                              </h4>
                                              <p className="text-xs text-slate-400/80">Métricas e insights da campanha</p>
                                            </div>
                                          </div>

                                          {/* Métricas em Cards - Primeira Linha */}
                                          {strategy.strategyReport.metrics.strategyType === 'impulsionar_post' ? (
                                            <div className="grid grid-cols-2 gap-2">
                                              <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-2.5 text-center hover:bg-slate-700/50 hover:border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
                                                <div className="text-xs text-slate-400 mb-1.5 font-medium">Custo p/ Seguidor</div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                  {((strategy.strategyReport.metrics.cpcMin + strategy.strategyReport.metrics.cpcMax) / 2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">Estimativa de Custo</div>
                                              </div>
                                              <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-2.5 text-center hover:bg-slate-700/50 hover:border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
                                                <div className="text-xs text-slate-400 mb-1.5 font-medium">Seguidores Est.</div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                  {Math.round(((strategy.strategyReport.metrics.clicksMin || 0) + (strategy.strategyReport.metrics.clicksMax || 0)) / 2).toLocaleString('pt-BR')}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">Novos Seguidores</div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="grid grid-cols-4 gap-2">
                                              <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-2.5 text-center hover:bg-slate-700/50 hover:border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
                                                <div className="text-xs text-slate-400 mb-1.5 font-medium">CPC Médio</div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                  {((strategy.strategyReport.metrics.cpcMin + strategy.strategyReport.metrics.cpcMax) / 2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 })}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">Custo por Clique</div>
                                              </div>
                                              <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-2.5 text-center hover:bg-slate-700/50 hover:border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
                                                <div className="text-xs text-slate-400 mb-1.5 font-medium">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto' ? 'Cliques Est.' : 'Acessos Est.'}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto'
                                                    ? Math.round(((strategy.strategyReport.metrics.clicksMin || 0) + (strategy.strategyReport.metrics.clicksMax || 0)) / 2).toLocaleString('pt-BR')
                                                    : Math.round(((strategy.strategyReport.metrics.accessesMin || 0) + (strategy.strategyReport.metrics.accessesMax || 0)) / 2).toLocaleString('pt-BR')
                                                  }
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto' ? 'Cliques → Chats' : 'Acessos → Leads'}
                                                </div>
                                              </div>
                                              <div className={`bg-slate-700/40 border border-slate-600/30 rounded-xl p-2.5 text-center hover:bg-slate-700/50 hover:border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md ${strategy.strategyReport.metrics.strategyType === 'lp_direto' ? 'opacity-40' : ''}`}>
                                                <div className="text-xs text-slate-400 mb-1.5 font-medium">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto' ? 'Chats Est.' :
                                                    strategy.strategyReport.metrics.strategyType === 'lp_direto' ? 'Leads Est.' : 'Leads Est.'}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto'
                                                    ? Math.round(((strategy.strategyReport.metrics.whatsappChatsMin || 0) + (strategy.strategyReport.metrics.whatsappChatsMax || 0)) / 2).toLocaleString('pt-BR')
                                                    : strategy.strategyReport.metrics.strategyType === 'lp_direto'
                                                      ? `0`
                                                      : Math.round(((strategy.strategyReport.metrics.leadsMin || 0) + (strategy.strategyReport.metrics.leadsMax || 0)) / 2).toLocaleString('pt-BR')
                                                  }
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto' ?
                                                    `${(((strategy.strategyReport.metrics.conv.whatsappChatMin + strategy.strategyReport.metrics.conv.whatsappChatMax) / 2) * 100).toFixed(1)}%` :
                                                    strategy.strategyReport.metrics.strategyType === 'lp_direto' ? '0%' :
                                                      `${(((strategy.strategyReport.metrics.conv.lpToLeadMin + strategy.strategyReport.metrics.conv.lpToLeadMax) / 2) * 100).toFixed(1)}%`}
                                                </div>
                                              </div>
                                              <div className="bg-slate-700/40 border border-slate-600/30 rounded-xl p-2.5 text-center hover:bg-slate-700/50 hover:border-slate-500/40 transition-all duration-200 shadow-sm hover:shadow-md">
                                                <div className="text-xs text-slate-400 mb-1.5 font-medium">
                                                  {strategy.strategyReport.metrics.strategyType === 'lp_direto' ? 'Vendas Est.' : 'Vendas Est.'}
                                                </div>
                                                <div className="text-sm font-semibold text-slate-200">
                                                  {Math.round(((strategy.strategyReport.metrics.salesMin || 0) + (strategy.strategyReport.metrics.salesMax || 0)) / 2).toLocaleString('pt-BR')}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1">
                                                  {strategy.strategyReport.metrics.strategyType === 'whatsapp_direto' ?
                                                    `${(((strategy.strategyReport.metrics.conv.whatsappSaleMin + strategy.strategyReport.metrics.conv.whatsappSaleMax) / 2) * 100).toFixed(1)}%` :
                                                    strategy.strategyReport.metrics.strategyType === 'lp_direto' ?
                                                      `${(((strategy.strategyReport.metrics.conv.directSaleMin + strategy.strategyReport.metrics.conv.directSaleMax) / 2) * 100).toFixed(1)}%` :
                                                      `${(((strategy.strategyReport.metrics.conv.leadToSaleMin + strategy.strategyReport.metrics.conv.leadToSaleMax) / 2) * 100).toFixed(1)}%`}
                                                </div>
                                              </div>
                                            </div>
                                          )}



                                          {/* Botão Clean e Elegante */}
                                          <button
                                            onClick={() => handleOpenReportModal(strategy)}
                                            className="w-full bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/40 hover:border-slate-500/50 text-slate-200 text-xs font-medium py-3 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-slate-900/20 relative group"
                                          >
                                            <div className="flex items-center justify-center gap-2">
                                              <Target className="w-3 h-3 group-hover:scale-110 transition-transform duration-200" />
                                              <span>Ver Estratégia Completa</span>
                                            </div>
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Nova Seção: Conjunto de Remarketing */}
                                    {(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3) && (
                                      <div className="mt-4 bg-slate-800/20 border border-amber-500/30 rounded-2xl p-5 backdrop-blur-sm">
                                        <div className="space-y-4">
                                          {/* Header */}
                                          <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-full bg-amber-500/50 flex items-center justify-center">
                                              <span className="text-amber-300 text-xs font-bold">🎯</span>
                                            </div>
                                            <div>
                                              <h4 className="text-sm font-semibold text-amber-200">
                                                Conjunto de Remarketing
                                              </h4>
                                              <p className="text-xs text-amber-400/80">Segundo conjunto com palavras-chave específicas</p>
                                            </div>
                                          </div>

                                          {/* Múltiplos Conjuntos de Remarketing */}
                                          {[strategy.remarketing1, strategy.remarketing2, strategy.remarketing3].map((remarketing, index) => {
                                            if (!remarketing) return null;
                                            const remarketingNumber = index + 1; // remarketing1, remarketing2, remarketing3
                                            const remarketingKey = `remarketing${remarketingNumber}` as 'remarketing1' | 'remarketing2' | 'remarketing3';

                                            return (
                                              <div key={remarketingKey} className="space-y-3">
                                                {/* Nomenclatura de Remarketing */}
                                                <div>
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs text-amber-300 font-semibold uppercase tracking-wide">
                                                      Público Remarketing {remarketingNumber}
                                                    </span>
                                                    <button
                                                      onClick={() => handleDeleteRemarketing(strategy, remarketingKey)}
                                                      className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/30 rounded-lg transition-all duration-200 hover:scale-110"
                                                      title="Deletar conjunto de remarketing"
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                  <div className="relative">
                                                    <div
                                                      onClick={() => copyToClipboard(remarketing.audienceName, `${remarketingKey}-${strategy.id}`)}
                                                      className="bg-gradient-to-r from-amber-700/50 to-yellow-800/50 rounded-lg px-4 py-3 border border-amber-600/30 cursor-pointer hover:border-amber-500/50 hover:bg-gradient-to-r hover:from-amber-700/60 hover:to-yellow-800/60 transition-all duration-200 group"
                                                    >
                                                      <div className="flex items-center justify-between">
                                                        <p className="text-sm text-amber-300 font-medium leading-relaxed flex-1 break-words">{remarketing.audienceName}</p>
                                                        <Copy className="w-3 h-3 text-amber-400 group-hover:text-amber-300 transition-colors ml-2 flex-shrink-0" />
                                                      </div>
                                                    </div>
                                                    <AnimatePresence>
                                                      {copiedStates.has(`${remarketingKey}-${strategy.id}`) && (
                                                        <motion.div
                                                          initial={{ opacity: 0, y: -10, scale: 0.8 }}
                                                          animate={{ opacity: 1, y: 0, scale: 1 }}
                                                          exit={{ opacity: 0, y: -10, scale: 0.8 }}
                                                          className="absolute top-1 right-12 bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400/30 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-2xl z-20 backdrop-blur-sm"
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                                            <span>Copiado</span>
                                                          </div>
                                                        </motion.div>
                                                      )}
                                                    </AnimatePresence>
                                                  </div>
                                                </div>

                                                {/* Orçamento de Remarketing */}
                                                <div className="bg-gradient-to-r from-slate-700/50 to-slate-800/50 rounded-lg px-4 py-3 border border-slate-600/30">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs text-slate-300 font-semibold uppercase tracking-wide">ORÇAMENTO REMARKETING {remarketingNumber}</span>
                                                      {isRemarketingStrategyPaused(strategy, remarketingKey) && (
                                                        <span className="text-xs bg-amber-900/30 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30 animate-pulse">
                                                          PAUSADO
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="text-right">
                                                      <div className="flex items-center gap-2 justify-end">
                                                        <div className="text-xs text-slate-400/70">
                                                          {getCurrentPeriodRemarketingBudget(strategy, remarketingKey).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} / <span className="font-normal">{remarketing.budget.planned.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                                          <span className="text-slate-400/50 ml-2 font-semibold">
                                                            ({Math.round(remarketing.budget.planned / getCurrentMonthDays()).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/dia)
                                                          </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 relative group/sync">
                                                          <div
                                                            className={`w-2 h-2 rounded-full ${getCurrentPeriodRemarketingSyncStatus(strategy, remarketingKey) ? 'bg-blue-500 animate-pulse' : 'bg-red-500 animate-pulse'} cursor-help`}
                                                          />
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                  <div className="w-full bg-slate-600/50 rounded-full h-2.5 overflow-hidden">
                                                    {(() => {
                                                      const isPaused = isRemarketingStrategyPaused(strategy, remarketingKey);
                                                      const progressPercentage = isPaused
                                                        ? 100
                                                        : Math.min((getCurrentPeriodRemarketingBudget(strategy, remarketingKey) / remarketing.budget.planned) * 100, 100);

                                                      return (
                                                        <div
                                                          className={`h-2.5 rounded-full transition-all duration-500 shadow-sm ${isPaused
                                                            ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 animate-pulse'
                                                            : 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600'
                                                            }`}
                                                          style={{ width: `${progressPercentage}%` }}
                                                        />
                                                      );
                                                    })()}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                </div>
                              </motion.div>
                            ))}

                          {/* Botão para adicionar estratégia aa campanha */}
                          <motion.button
                            onClick={() => handleOpenModal(undefined, productData.name, productData.campaignType)}
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
              ))
          }
        </div >



        {/* Modal */}
        <AnimatePresence>
          {
            isModalOpen && (
              <div className="modalzindex fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={handleCloseModal}>
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
                  <div className="flex-1 overflow-y-auto overflow-x-visible p-6">
                    <div className="space-y-6">
                      {/* Container - Definição do Produto */}
                      <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-500/30 rounded-xl p-6 relative z-[9999] overflow-visible">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center">
                            <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-blue-200">Definição do Produto</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible relative">
                          <div className="relative z-10">
                            <label className="block text-sm font-medium text-blue-300 mb-2">Nome da Campanha</label>
                            <input
                              type="text"
                              value={currentStrategy.product?.name || ''}
                              onChange={(e) => setCurrentStrategy(prev => ({
                                ...prev,
                                product: { ...prev.product!, name: e.target.value }
                              }))}
                              className="w-full bg-slate-700/60 border border-blue-500/40 rounded-lg px-4 py-3 text-white placeholder-blue-400/60 focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                              placeholder={currentStrategy.product?.campaignType === 'sazonal' ? 'Ex: Black Friday 2024' : 'Ex: Aulas de Pilates'}
                            />
                          </div>
                          <div className="relative z-40">
                            <CustomDropdown
                              label="Tipo de Campanha"
                              options={[
                                { value: 'sazonal', label: 'Sazonal', icon: <Calendar className="w-4 h-4" /> },
                                { value: 'recorrente', label: 'Recorrente', icon: <Calendar className="w-4 h-4" /> }
                              ]}
                              value={currentStrategy.product?.campaignType || 'recorrente'}
                              onChange={(value) => setCurrentStrategy(prev => ({
                                ...prev,
                                product: { ...prev.product!, campaignType: value as 'sazonal' | 'recorrente' }
                              }))}
                              theme="blue"
                            />
                          </div>
                          <div className="relative z-30">
                            <CustomDropdown
                              label="Produto"
                              options={[
                                { value: 'sem_produto', label: 'Sem Produto', icon: <Package className="w-4 h-4" /> },
                                { value: 'curso online', label: 'Curso Online', icon: <Globe className="w-4 h-4" /> },
                                { value: 'curso presencial', label: 'Curso Presencial', icon: <Package className="w-4 h-4" /> },
                                { value: 'mentoria online', label: 'Mentoria Online', icon: <Globe className="w-4 h-4" /> },
                                { value: 'mentoria presencial', label: 'Mentoria Presencial', icon: <Package className="w-4 h-4" /> },
                                { value: 'retiro imersao congresso', label: 'Retiro/Imersão/Congresso', icon: <Package className="w-4 h-4" /> },
                                { value: 'servico online', label: 'Serviço Online', icon: <Globe className="w-4 h-4" /> },
                                { value: 'servico presencial', label: 'Serviço Presencial', icon: <Package className="w-4 h-4" /> },
                                { value: 'produto digital baixo', label: 'Produto Digital Baixo', icon: <Globe className="w-4 h-4" /> },
                                { value: 'produto digital medio_alto', label: 'Produto Digital Médio/Alto', icon: <Globe className="w-4 h-4" /> },
                                { value: 'assinatura clube', label: 'Assinatura/Clube', icon: <Globe className="w-4 h-4" /> },
                                { value: 'ecommerce baixo medio', label: 'E-commerce Baixo/Médio', icon: <ShoppingCart className="w-4 h-4" /> },
                                { value: 'ecommerce alto', label: 'E-commerce Alto', icon: <ShoppingCart className="w-4 h-4" /> },
                                { value: 'imovel investimento', label: 'Imóvel/Investimento', icon: <Package className="w-4 h-4" /> }
                              ]}
                              value={currentStrategy.product?.type || 'curso online'}
                              onChange={(value) => setCurrentStrategy(prev => ({
                                ...prev,
                                product: { ...prev.product!, type: value as any }
                              }))}
                              theme="blue"
                            />
                          </div>
                          <div className="relative z-30">
                            <CustomDropdown
                              label="Objetivo"
                              options={[
                                { value: 'trafico', label: 'Tráfego no Site', icon: <Globe className="w-4 h-4" /> },
                                { value: 'mensagens', label: 'Conversão em Mensagens', icon: <MessageSquare className="w-4 h-4" /> },
                                { value: 'captura_leads', label: 'Captura de Leads', icon: <Users className="w-4 h-4" /> },
                                { value: 'compras', label: 'Conversões de Compras', icon: <ShoppingCart className="w-4 h-4" /> },
                                { value: 'crescimento_audiencia', label: 'Crescimento de Audiência', icon: <Users className="w-4 h-4" /> }
                              ]}
                              value={currentStrategy.product?.objective || 'trafico'}
                              onChange={(value) => setCurrentStrategy(prev => ({
                                ...prev,
                                product: { ...prev.product!, objective: value as 'trafico' | 'mensagens' | 'captura_leads' | 'compras' | 'crescimento_audiencia' }
                              }))}
                              theme="blue"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Container - Definição do Público */}
                      <div className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border border-yellow-500/30 rounded-xl p-6 relative z-[9998] overflow-visible">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-yellow-600/20 border border-yellow-500/40 flex items-center justify-center">
                            <Target className="w-4 h-4 text-yellow-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-yellow-200">Definição do Público</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-visible relative">
                          <div className="relative z-50">
                            <CustomDropdown
                              label="Público Alvo"
                              options={[
                                { value: 'ambos', label: 'Ambos', icon: <Users className="w-4 h-4" /> },
                                { value: 'homem', label: 'Homem', icon: <Users className="w-4 h-4" /> },
                                { value: 'mulher', label: 'Mulher', icon: <Users className="w-4 h-4" /> }
                              ]}
                              value={currentStrategy.audience?.gender || 'ambos'}
                              onChange={(value) => setCurrentStrategy(prev => ({
                                ...prev,
                                audience: { ...prev.audience!, gender: value as 'homem' | 'mulher' | 'ambos' }
                              }))}
                              theme="yellow"
                            />
                          </div>
                          <div className="relative z-60">
                            <CustomDropdown
                              label="Faixa Etária"
                              options={[
                                { value: '18-25', label: '18-25 anos', icon: <Calendar className="w-4 h-4" /> },
                                { value: '25-35', label: '25-35 anos', icon: <Calendar className="w-4 h-4" /> },
                                { value: '35-45', label: '35-45 anos', icon: <Calendar className="w-4 h-4" /> },
                                { value: '45-65', label: '45-65 anos', icon: <Calendar className="w-4 h-4" /> },
                                { value: '65+', label: '65+', icon: <Calendar className="w-4 h-4" /> },
                                { value: 'custom', label: 'Personalizado...', icon: <Calendar className="w-4 h-4" /> },
                                // Adicionar faixa personalizada se existir e não estiver na lista
                                ...(currentStrategy.audience?.ageRange &&
                                  !['18-25', '25-35', '35-45', '45-65', '65+', 'custom'].includes(currentStrategy.audience.ageRange) ?
                                  [{ value: currentStrategy.audience.ageRange, label: `${currentStrategy.audience.ageRange} anos`, icon: <Calendar className="w-4 h-4" /> }] :
                                  [])
                              ]}
                              value={currentStrategy.audience?.ageRange || '25-45'}
                              onChange={(value) => {
                                if (value === 'custom') {
                                  setShowAgeRangeModal(true);
                                } else {
                                  setCurrentStrategy(prev => ({
                                    ...prev,
                                    audience: { ...prev.audience!, ageRange: value }
                                  }));
                                }
                              }}
                              theme="yellow"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-yellow-300 mb-2">Localização</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={locationInput}
                              onChange={(e) => setLocationInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
                              className="flex-1 bg-slate-700/60 border border-yellow-500/40 rounded-lg px-4 py-3 text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                              placeholder="Digite uma localização e pressione Enter"
                            />
                            <button
                              onClick={handleAddLocation}
                              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentStrategy.audience?.locations.map((location, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-600/30 text-yellow-200 border border-yellow-500/40"
                              >
                                <MapPin className="w-3 h-3 mr-1" />
                                {location}
                                <button
                                  onClick={() => handleRemoveLocation(location)}
                                  className="ml-2 text-yellow-300 hover:text-white transition-colors"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-yellow-300 mb-2">Interesses (Opcional)</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={interestInput}
                              onChange={(e) => setInterestInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
                              className="flex-1 bg-slate-700/60 border border-yellow-500/40 rounded-lg px-4 py-3 text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                              placeholder="Digite um interesse e pressione Enter"
                            />
                            <button
                              onClick={handleAddInterest}
                              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentStrategy.audience?.interests.map((interest, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-600/30 text-yellow-200 border border-yellow-500/40"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {interest}
                                <button
                                  onClick={() => handleRemoveInterest(interest)}
                                  className="ml-2 text-yellow-300 hover:text-white transition-colors"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-yellow-400/70 mt-2">
                            Se nenhum interesse for adicionado, será usado "aberto" na nomenclatura do público.
                          </p>
                        </div>

                        {/* Campo de Remarketing */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-yellow-300 mb-2">Remarketing (Opcional)</label>
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={remarketingInput}
                              onChange={(e) => setRemarketingInput(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleAddRemarketing()}
                              className="flex-1 bg-slate-700/60 border border-yellow-500/40 rounded-lg px-4 py-3 text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                              placeholder="Ex: Visitou página X últimos 7 dias, Interação com post Y, etc."
                            />
                            <button
                              onClick={handleAddRemarketing}
                              className="px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                            >
                              Adicionar
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {currentStrategy.audience?.remarketing.map((remarketing, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-600/30 text-yellow-200 border border-yellow-500/40"
                              >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                {remarketing}
                                <button
                                  onClick={() => handleRemoveRemarketing(remarketing)}
                                  className="ml-2 text-yellow-300 hover:text-white transition-colors"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Campo de Escala */}
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-yellow-300 mb-2">Escalar Campanha (Opcional)</label>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <label className="flex items-center p-3 bg-slate-700/60 border border-yellow-500/40 rounded-lg cursor-pointer hover:bg-slate-700/80 transition-colors">
                              <input
                                type="radio"
                                name="scaleType"
                                value=""
                                checked={!currentStrategy.audience?.scaleType}
                                onChange={() => setCurrentStrategy(prev => ({
                                  ...prev,
                                  audience: { ...prev.audience!, scaleType: null }
                                }))}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${!currentStrategy.audience?.scaleType
                                ? 'border-yellow-400 bg-yellow-400'
                                : 'border-yellow-500/40'
                                }`}>
                                {!currentStrategy.audience?.scaleType && (
                                  <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                )}
                              </div>
                              <div>
                                <div className="text-yellow-200 font-medium">Nenhuma escala</div>
                                <div className="text-yellow-400/70 text-xs">Sem escala</div>
                              </div>
                            </label>

                            <label className="flex items-center p-3 bg-slate-700/60 border border-yellow-500/40 rounded-lg cursor-pointer hover:bg-slate-700/80 transition-colors">
                              <input
                                type="radio"
                                name="scaleType"
                                value="vertical"
                                checked={currentStrategy.audience?.scaleType === 'vertical'}
                                onChange={(e) => setCurrentStrategy(prev => ({
                                  ...prev,
                                  audience: { ...prev.audience!, scaleType: e.target.value as 'vertical' | 'horizontal' | null }
                                }))}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${currentStrategy.audience?.scaleType === 'vertical'
                                ? 'border-yellow-400 bg-yellow-400'
                                : 'border-yellow-500/40'
                                }`}>
                                {currentStrategy.audience?.scaleType === 'vertical' && (
                                  <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                )}
                              </div>
                              <div>
                                <div className="text-yellow-200 font-medium">Aumentar orçamento</div>
                                <div className="text-yellow-400/70 text-xs">Escala Vertical</div>
                              </div>
                            </label>

                            <label className="flex items-center p-3 bg-slate-700/60 border border-yellow-500/40 rounded-lg cursor-pointer hover:bg-slate-700/80 transition-colors">
                              <input
                                type="radio"
                                name="scaleType"
                                value="horizontal"
                                checked={currentStrategy.audience?.scaleType === 'horizontal'}
                                onChange={(e) => setCurrentStrategy(prev => ({
                                  ...prev,
                                  audience: { ...prev.audience!, scaleType: e.target.value as 'vertical' | 'horizontal' | null }
                                }))}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${currentStrategy.audience?.scaleType === 'horizontal'
                                ? 'border-yellow-400 bg-yellow-400'
                                : 'border-yellow-500/40'
                                }`}>
                                {currentStrategy.audience?.scaleType === 'horizontal' && (
                                  <div className="w-2 h-2 rounded-full bg-slate-800"></div>
                                )}
                              </div>
                              <div>
                                <div className="text-yellow-200 font-medium">Duplicar conjunto</div>
                                <div className="text-yellow-400/70 text-xs">Escala Horizontal</div>
                              </div>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Container - Orçamento */}
                      <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 border border-emerald-500/30 rounded-xl p-6 relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-300" />
                          </div>
                          <h3 className="text-lg font-semibold text-emerald-200">Orçamento</h3>
                        </div>
                        <div className={`grid grid-cols-1 ${currentStrategy.product?.type !== 'sem_produto' ? 'md:grid-cols-2' : ''} gap-4`}>
                          <div>
                            <label className="block text-sm font-medium text-emerald-300 mb-2">Investimento disponível (mês)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 font-semibold text-sm">R$</span>
                              <input
                                type="text"
                                value={plannedInput.replace('R$ ', '').replace('R$', '')}
                                onChange={(e) => {
                                  const digits = extractDigits(e.target.value);
                                  setCurrentStrategy(prev => ({
                                    ...prev,
                                    budget: { ...prev.budget!, planned: parseInt(digits) / 100 }
                                  }));
                                  setPlannedInput(formatBRLFromDigits(digits));
                                }}
                                className="w-full bg-slate-700/60 border border-emerald-500/40 rounded-lg pl-8 pr-4 py-3 text-white placeholder-emerald-400/60 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0,00"
                              />
                            </div>
                          </div>
                          {currentStrategy.product?.type !== 'sem_produto' && (
                            <div>
                              <label className="block text-sm font-medium text-emerald-300 mb-2">Ticket do Produto</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-emerald-400 font-semibold text-sm">R$</span>
                                <input
                                  type="text"
                                  value={ticketInput.replace('R$ ', '').replace('R$', '')}
                                  onChange={(e) => {
                                    const digits = extractDigits(e.target.value);
                                    setCurrentStrategy(prev => ({
                                      ...prev,
                                      product: { ...prev.product!, ticket: parseInt(digits) / 100 }
                                    }));
                                    setTicketInput(formatBRLFromDigits(digits));
                                  }}
                                  className="w-full bg-slate-700/60 border border-emerald-500/40 rounded-lg pl-8 pr-4 py-3 text-white placeholder-emerald-400/60 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  placeholder="0,00"
                                />
                              </div>
                            </div>
                          )}
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
                                <p className="text-blue-400 font-medium">{currentStrategy.generatedNames?.product || 'Preencha os dados da campanha'}</p>
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
            )
          }
        </AnimatePresence >

        {/* Modal de Remarketing */}
        <AnimatePresence>
          {
            isRemarketingModalOpen && (
              <div className="modalzindex fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsRemarketingModalOpen(false)}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="relative bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-yellow-500 to-amber-500 rounded-lg flex items-center justify-center">
                        <span className="text-white text-sm font-bold">⭐</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-slate-200">Adicionar Conjunto de Remarketing</h2>
                        <p className="text-sm text-slate-400">Crie um segundo conjunto com novas palavras-chave</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setIsRemarketingModalOpen(false)}
                      className="text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="space-y-4">
                      {/* Estratégia Atual */}
                      <div className="bg-slate-700/30 border border-slate-600/40 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-2">Estratégia Atual</h3>
                        <p className="text-sm text-slate-400 mb-1">Campanha: <span className="text-blue-300">{selectedStrategyForRemarketing?.product?.name}</span></p>
                        <p className="text-sm text-slate-400 mb-1">Público: <span className="text-yellow-300">{selectedStrategyForRemarketing?.generatedNames?.audience}</span></p>
                        <p className="text-sm text-slate-400">Orçamento: <span className="text-emerald-300">{selectedStrategyForRemarketing?.budget?.planned.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>
                      </div>

                      {/* Campo de Remarketing */}
                      <div>
                        <label className="block text-sm font-medium text-yellow-300 mb-2">
                          Palavras-chave para Remarketing
                        </label>
                        <input
                          type="text"
                          value={remarketing2Input}
                          onChange={(e) => setRemarketing2Input(e.target.value)}
                          placeholder="Ex: palavra1, palavra2, palavra3"
                          className="w-full bg-slate-700/60 border border-yellow-500/40 rounded-lg px-4 py-3 text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
                        />
                        <p className="text-xs text-slate-400 mt-2">
                          Essas palavras serão adicionadas como [Rmkt - suas palavras] na nomenclatura
                        </p>
                      </div>

                      {/* Preview */}
                      {remarketing2Input.trim() && (
                        <div className="bg-slate-700/20 border border-slate-600/30 rounded-lg p-4">
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">Preview da Nova Nomenclatura</h4>
                          <p className="text-sm text-yellow-300 break-words">
                            {selectedStrategyForRemarketing?.generatedNames?.audience} [Rmkt - {remarketing2Input.trim()}]
                          </p>
                          <div className="mt-3 text-xs text-slate-400">
                            <p>• Orçamento Principal: <span className="text-emerald-300">{selectedStrategyForRemarketing ? (selectedStrategyForRemarketing.budget.planned * 0.8).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}</span> (80%)</p>
                            <p>• Orçamento Remarketing: <span className="text-yellow-300">{selectedStrategyForRemarketing ? (selectedStrategyForRemarketing.budget.planned * 0.2).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : ''}</span> (20%)</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50">
                    <button
                      onClick={() => setIsRemarketingModalOpen(false)}
                      className="px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveRemarketing}
                      disabled={!remarketing2Input.trim()}
                      className="bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-700 hover:to-amber-700 disabled:from-slate-600 disabled:to-slate-700 text-white px-6 py-2 rounded-lg transition-all duration-200 hover:shadow-lg disabled:cursor-not-allowed"
                    >
                      Salvar Conjunto
                    </button>
                  </div>
                </motion.div>
              </div>
            )
          }
        </AnimatePresence >

        {/* Modal de Faixa Etária Personalizada */}
        {
          showAgeRangeModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
              <div className="bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-2xl shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between p-6 border-b border-slate-600/30">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-yellow-400" />
                    Faixa Etária Personalizada
                  </h3>
                  <button
                    onClick={() => {
                      setShowAgeRangeModal(false);
                      setCustomAgeFrom('');
                      setCustomAgeTo('');
                    }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-yellow-300 mb-2">De</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={customAgeFrom}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 99)) {
                            setCustomAgeFrom(value);
                          }
                        }}
                        className="w-full bg-slate-700/60 border border-yellow-500/40 rounded-lg px-4 py-3 text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Ex: 20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-yellow-300 mb-2">Até</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={customAgeTo}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '');
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 99)) {
                            setCustomAgeTo(value);
                          }
                        }}
                        className="w-full bg-slate-700/60 border border-yellow-500/40 rounded-lg px-4 py-3 text-white placeholder-yellow-400/60 focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="Ex: 50"
                      />
                    </div>
                  </div>

                  <div className="text-xs text-yellow-400/70">
                    <p>• Idade mínima: 13 anos</p>
                    <p>• Idade máxima: 65 anos</p>
                    <p>• Exemplo: 20-50 anos</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setShowAgeRangeModal(false);
                        setCustomAgeFrom('');
                        setCustomAgeTo('');
                      }}
                      className="flex-1 px-4 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        if (customAgeFrom && customAgeTo &&
                          parseInt(customAgeFrom) >= 13 && parseInt(customAgeTo) <= 65 &&
                          parseInt(customAgeFrom) < parseInt(customAgeTo)) {
                          const ageRange = `${customAgeFrom}-${customAgeTo}`;
                          setCurrentStrategy(prev => ({
                            ...prev,
                            audience: { ...prev.audience!, ageRange }
                          }));
                          setShowAgeRangeModal(false);
                          setCustomAgeFrom('');
                          setCustomAgeTo('');
                        }
                      }}
                      disabled={!customAgeFrom || !customAgeTo ||
                        parseInt(customAgeFrom) < 13 || parseInt(customAgeTo) > 65 ||
                        parseInt(customAgeFrom) >= parseInt(customAgeTo)}
                      className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        }
      </div >
    </div >
  );
};

export default AdStrategySection;
