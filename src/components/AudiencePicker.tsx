import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Search, Plus, Trash2, Facebook, X, RefreshCw } from 'lucide-react';
import { metaAdsService } from '../services/metaAdsService';
import { useDropdownPortal } from '../hooks/useDropdownPortal.tsx';

interface Audience {
  id: string;
  name: string;
  description?: string;
  ageRange?: string;
  interests?: string[];
  location?: string;
  size?: number;
  productId: string; // Vinculado ao produto
  clientId: string; // Vinculado ao cliente
  source?: 'manual' | 'facebook';
  adSet?: any; // Dados do Ad Set do Meta Ads
  campaignStatus?: string; // 🎯 NOVO: Status da campanha
}

interface AudiencePickerProps {
  selectedAudience: string;
  setSelectedAudience: (audience: string) => void;
  selectedProduct: string; // Produto selecionado
  selectedClient: string; // Cliente selecionado
  dataSource?: 'manual' | 'facebook' | null;
  selectedMonth?: string; // Mês selecionado para filtrar Ad Sets
  isFacebookConnected?: boolean;
}

const AudiencePicker: React.FC<AudiencePickerProps> = ({ 
  selectedAudience, 
  setSelectedAudience, 
  selectedProduct,
  selectedClient,
  dataSource,
  selectedMonth,
  isFacebookConnected = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [audiences, setAudiences] = useState<Audience[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showReconnectionModal, setShowReconnectionModal] = useState(false);
  const [reconnectionError, setReconnectionError] = useState<string>('');
  const pickerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { renderDropdown } = useDropdownPortal({ isOpen, triggerRef });

  // Função para obter o ID do cliente baseado no nome
  const getClientIdFromName = (clientName: string): string => {
    const clientMap: { [key: string]: string } = {
      'João Silva': '2',
      'Maria Santos': '3',
      'Pedro Costa': '4',
      'Ana Oliveira': '5',
      'Carlos Ferreira': '6',
      'Lucia Mendes': '7',
      'Roberto Lima': '8'
    };
    return clientMap[clientName] || 'all';
  };

  // Função para obter o ID do produto baseado no nome
  const getProductIdFromName = (productName: string): string => {
    const productMap: { [key: string]: string } = {
      'Pacote Básico': '2',
      'Pacote Premium': '3',
      'Consultoria Mensal': '4',
      'Gestão de Redes Sociais': '5',
      'Campanha Google Ads': '6',
      'Website Institucional': '7',
      'E-commerce Completo': '8',
      'SEO Básico': '9',
      'SEO Avançado': '10'
    };
    return productMap[productName] || 'all';
  };

  // 🎯 NOVA FUNÇÃO: Determinar status combinado (campanha + adset)
  const getCombinedStatus = (campaignStatus?: string, adSetStatus?: string): 'active' | 'inactive' => {
    // 🎯 LÓGICA: "Ativo" APENAS se AMBOS estiverem ativos
    if (campaignStatus === 'ACTIVE' && adSetStatus === 'ACTIVE') {
      return 'active';
    }
    // 🎯 "Pausado" em qualquer outro caso
    return 'inactive';
  };

  // Função para reconectar ao Meta Ads
  const handleMetaAdsReconnection = async () => {
    try {
      // Limpar cache e rate limits
      if (typeof (window as any).metaAdsService?.resetApiRateLimit === 'function') {
        (window as any).metaAdsService.resetApiRateLimit();
      }
      
      // Tentar executar função de correção se disponível
      if (typeof (window as any).fixAudienceIssues?.fixAllIssues === 'function') {
        await (window as any).fixAudienceIssues.fixAllIssues();
      }
      
      // Recarregar Ad Sets
      await loadMetaAdsAdSets();
      
      
    } catch (error) {
      console.error('❌ Erro durante reconexão:', error);
      throw error;
    }
  };

  // Função para processar Ad Sets encontrados
  const processAdSets = async (filteredAdSets: any[]) => {
    try {
      
      
      // Log detalhado dos Ad Sets encontrados
      filteredAdSets.forEach((adSet, index) => {
//         
      });
      
      

      // Converter Ad Sets para formato de públicos, buscando targeting atualizado por adset quando possível
      const facebookAudiences: Audience[] = await Promise.all(filteredAdSets.map(async (adSet) => {
        // Buscar detalhes do ad set (inclui targeting atualizado)
        let targeting: any = adSet?.targeting || {};
        try {
          const det = await metaAdsService.getAdSetDetails(adSet.id);
          
          if (det?.targeting) targeting = det.targeting;
          
        } catch (e) {
          console.warn('DEBUG AudiencePicker - falha ao buscar detalhes do adset', adSet.id, e);
        }

        // Idade: priorizar targeting.age_range [min,max]; fallback para age_min/age_max
        const arrRange = Array.isArray(targeting?.age_range) && targeting.age_range.length === 2
          ? { min: Number(targeting.age_range[0]), max: Number(targeting.age_range[1]) }
          : null;
        const ageMin = (arrRange?.min ?? (typeof targeting?.age_min === 'number' ? targeting.age_min : undefined));
        const ageMax = (arrRange?.max ?? (typeof targeting?.age_max === 'number' ? targeting.age_max : undefined));
        const ageRange = (typeof ageMin === 'number' || typeof ageMax === 'number')
          ? `${ageMin ?? 18}-${ageMax ?? 65}`
          : undefined;

        // Localização básica
        let location: string | undefined = undefined;
        const geo = targeting?.geo_locations || {};
        const countries: string[] = Array.isArray(geo.countries) ? geo.countries : [];
        if (countries.length === 1) {
          location = countries[0] === 'BR' ? 'Brasil' : countries[0];
        } else if (countries.length > 1) {
          location = 'Múltiplos países';
        } else if (geo.location_types && geo.location_types.length > 0) {
          location = 'Localização personalizada';
        }

        return {
          id: `fb-adset-${adSet.id}`,
          name: adSet.name,
          description: `Conjunto de anúncios ${getCombinedStatus(adSet.campaign?.status, adSet.status) === 'active' ? 'Ativo' : 'Pausado'}`,
          ageRange,
          location,
          productId: selectedProduct,
          clientId: selectedClient,
          source: 'facebook' as const,
          adSet: adSet,
          campaignStatus: adSet.campaign?.status || 'UNKNOWN' // 🎯 NOVO: Status da campanha
        } as Audience;
      }));

      
      

      // Se não há Ad Sets, mostrar lista vazia
      if (facebookAudiences.length === 0) {
        
        setAudiences([]);
      } else {
        
        setAudiences(facebookAudiences);
      }
      
    } catch (error) {
      console.error('🚨 CRÍTICO - Erro ao processar Ad Sets:', error);
      setAudiences([]);
    }
  };

  // Carregar Ad Sets do Meta Ads
  const loadMetaAdsAdSets = async () => {
//     
    
    // Verificar todas as condições necessárias
    if (dataSource !== 'facebook') {
      
      return;
    }
    
    if (!selectedProduct || selectedProduct === 'Todos os Produtos' || selectedProduct === '') {
      
      return;
    }
    
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
      
      return;
    }
    
    if (!isFacebookConnected) {
      
      return;
    }
    
    
    
    if (dataSource === 'facebook' && selectedProduct && selectedProduct !== 'Todos os Produtos') {
      try {
        // Verificar se está logado no Meta Ads
        if (!metaAdsService.isLoggedIn()) {
          
          setAudiences([]);
          return;
        }
        
        
        if (!metaAdsService.hasSelectedAccount()) {
          
          setAudiences([]);
          return;
        }
        
        setIsLoading(true);
                
        // 🎯 CORREÇÃO: Obter ID da campanha com múltiplas tentativas
        let campaignId = localStorage.getItem('selectedCampaignId');
        
        
        // Se não encontrou, aguardar um pouco e tentar novamente
        if (!campaignId) {
          
          
          // Aguardar um pouco para o localStorage ser atualizado
          // Rate limit removido - sem pausa
          campaignId = localStorage.getItem('selectedCampaignId');
          
        }
        
        if (!campaignId) {
          
          
          // 🎯 MELHORIA: Tentar obter campaign ID do produto selecionado no localStorage
          const currentSelectedProduct = localStorage.getItem('currentSelectedProduct');
          if (currentSelectedProduct) {
            
            // Se há produto selecionado, continuar sem falhar (será um fallback)
          } else {
            setAudiences([]);
            return;
          }
        }
        
        
        
        // Obter datas do mês selecionado (não usado atualmente, mas mantido para compatibilidade)
        const getPeriodDates = (monthString: string) => {
          const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          
          // Se não há mês selecionado, usar o mês atual
          if (!monthString || monthString.trim() === '') {
            const now = new Date();
            return {
              startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
              endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
            };
          }
          
          const [monthName, yearStr] = monthString.split(' ');
          const year = parseInt(yearStr);
          const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
          
          if (monthIndex === -1) {
            const now = new Date();
            return {
              startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
              endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
            };
          }
          
          const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
          const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];
          
          return { startDate, endDate };
        };

        // Nota: startDate e endDate não são usados atualmente na API getAdSets
        // const { startDate, endDate } = getPeriodDates(selectedMonth || '');
        
                
        
//         
        
        // 🎯 DEBUG DETALHADO: Verificar estado completo antes da chamada
//         
        
        // 🎯 CORREÇÃO: Não enviar parâmetros de data para getAdSets, a API do Meta não aceita
        
        let adSetsData;
        try {
          
          
          // 🎯 NOVA LÓGICA: Tentar múltiplas abordagens para encontrar Ad Sets
          // 1. Primeiro: tentar buscar por ID da campanha específica
          if (campaignId) {
            adSetsData = await metaAdsService.getAdSets(campaignId);
            
          }
          
          // 2. Se não encontrou nada, buscar TODOS os Ad Sets da conta
          if (!adSetsData || adSetsData.length === 0) {
            
            adSetsData = await metaAdsService.getAdSets();
            
            
            // Filtrar apenas os Ad Sets desta campanha
            if (campaignId && adSetsData && adSetsData.length > 0) {
              const filtered = adSetsData.filter(adSet => adSet.campaign_id === campaignId);
              
              adSetsData = filtered;
            }
          }
          
        } catch (apiError: any) {
          console.error('❌ DEBUG - Erro na chamada para getAdSets:', apiError);
          console.error('❌ DEBUG - Detalhes do erro:', {
            message: apiError.message,
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data
          });
          throw apiError; // Re-throw para ser capturado pelo catch externo
        }
        
//         
        
                
        if (!adSetsData || adSetsData.length === 0) {
          console.error('🚨 CRÍTICO - NENHUM AD SET ENCONTRADO!');
          console.error('📋 DEBUG INFO:', {
            campaignId,
            selectedProduct,
            selectedClient,
            selectedMonth,
            isFacebookConnected: metaAdsService.isLoggedIn(),
            hasSelectedAccount: metaAdsService.hasSelectedAccount()
          });
          
          console.error('💡 POSSÍVEIS SOLUÇÕES:');
          console.error('1. Verificar se a campanha selecionada realmente existe');
          console.error('2. Verificar se a campanha tem Ad Sets ativos');
          console.error('3. Tentar selecionar uma campanha diferente');
          console.error('4. Verificar permissões da conta do Meta Ads');
          
          // Limpar e mostrar lista vazia
          setAudiences([]);
          return;
        }
                
        // 🎯 CORREÇÃO COMPLETA: Para análise de períodos históricos, SEMPRE incluir TODOS os Ad Sets
        // O usuário quer ver os dados que existiam no período selecionado, independente do status atual
        
        
        
        
        // SEMPRE incluir TODOS os Ad Sets para permitir análise histórica
        const filteredAdSets = adSetsData;
        
        
        // Processar Ad Sets encontrados
        await processAdSets(filteredAdSets);

         

        
              } catch (error: any) {
          console.error('Erro ao carregar Ad Sets:', error);
          console.error('Detalhes do erro:', error.message);
          
          // 🎯 TRATAMENTO ESPECÍFICO PARA RATE LIMIT E PROBLEMAS DE AUTENTICAÇÃO
          if (error.message && (
            error.message.includes('User request limit reached') ||
            error.message.includes('rate limit') ||
            error.message.includes('Session has expired') ||
            error.message.includes('access token') ||
            error.message.includes('token expired') ||
            error.message.includes('authentication') ||
            error.message.includes('permission') ||
            error.message.includes('400') ||
            error.response?.status === 400
          )) {
            console.error('🚨 RATE LIMIT DETECTADO!');
            console.error('💡 SOLUÇÃO: Execute window.fixAudienceIssues.fixAllIssues() no console');
            
            // Mostrar modal de reconexão
            setReconnectionError(error.message || 'Limite de requisições atingido');
            setShowReconnectionModal(true);
            
            // Tentar reset automático se a função estiver disponível
            if (typeof (window as any).fixAudienceIssues?.fixAllIssues === 'function') {
              
              try {
                (window as any).fixAudienceIssues.fixAllIssues();
              } catch (resetError) {
                console.error('❌ Falha na correção automática:', resetError);
              }
            } else if (typeof (window as any).resetApiRateLimit === 'function') {
              
              try {
                (window as any).resetApiRateLimit();
              } catch (resetError) {
                console.error('❌ Falha no reset automático:', resetError);
              }
            }
          }
          
          // Log do erro
          
          
          setAudiences([]);
        } finally {
          setIsLoading(false);
        }
    } else {
      // Não carregar públicos para outros dataSources
      setAudiences([]);
    }
  };

  // Carregar público salvo do localStorage ao inicializar
  useEffect(() => {
    const savedAudience = localStorage.getItem('currentSelectedAudience');
    const savedProduct = localStorage.getItem('currentSelectedProduct');
    
    // Só restaurar público se há produto selecionado
    if (savedAudience && savedAudience !== '' && savedProduct && savedProduct !== '') {
      setSelectedAudience(savedAudience);
    }
  }, [setSelectedAudience]);

  // Escutar eventos de rate limit do Meta Ads
  useEffect(() => {
    const handleRateLimit = (event: CustomEvent) => {
      
      setReconnectionError(event.detail.message || 'Limite de requisições atingido');
      setShowReconnectionModal(true);
    };

    window.addEventListener('metaAdsRateLimit', handleRateLimit as EventListener);
    
    return () => {
      window.removeEventListener('metaAdsRateLimit', handleRateLimit as EventListener);
    };
  }, []);

  // Carregar públicos quando dataSource, selectedProduct, selectedClient ou selectedMonth mudar
  useEffect(() => {
//     
                    
    // Só carregar se há produto selecionado e Meta Ads conectado
    if (selectedProduct && 
        selectedProduct !== 'Todos os Produtos' && 
        selectedProduct !== '' && 
        selectedClient && 
        selectedClient !== 'Selecione um cliente' && 
        selectedClient !== 'Todos os Clientes' &&
        dataSource === 'facebook' &&
        isFacebookConnected) {
      
      
      
      // Limpar públicos atuais IMEDIATAMENTE
      setAudiences([]);
      setSelectedAudience('');
            
      // 🎯 CARREGAMENTO IMEDIATO E SUPER AGRESSIVO - SEM DELAYS!
      const loadImmediate = async () => {
        try {
          
          
          // Limpar cache completamente
          metaAdsService.clearCacheByType('adsets');
          
          // Carregar IMEDIATAMENTE
          await loadMetaAdsAdSets();
          
        } catch (error) {
          console.error('❌ CARREGAMENTO IMEDIATO - FALHA:', error);
          
          // Retry IMEDIATO se falhar - apenas 1 retry com delay mínimo
          setTimeout(async () => {
            try {
              
              metaAdsService.clearCacheByType('adsets');
              await loadMetaAdsAdSets();
              
            } catch (retryError) {
              console.error('❌ RETRY IMEDIATO - FALHA FINAL:', retryError);
            }
          }, 50); // Apenas 50ms de delay
        }
      };
      
      // EXECUÇÃO IMEDIATA - SEM QUALQUER DELAY!
      loadImmediate();
      

    } else {
//       
      
      // Resetar públicos quando condições não são atendidas
      setAudiences([{ id: '1', name: 'Todos os Públicos', productId: 'all', clientId: 'all' }]);
      setSelectedAudience('Todos os Públicos');
    }
  }, [dataSource, selectedProduct, selectedClient, selectedMonth, isFacebookConnected]);

     // Listener para evento de campanha selecionada
   useEffect(() => {
     const handleCampaignSelected = (event: Event) => {
       const customEvent = event as CustomEvent;
       const { campaignId, productName } = customEvent.detail;
       
       
       
       // 🎯 CORREÇÃO: Garantir que o campaignId seja salvo no localStorage
       if (campaignId) {
         localStorage.setItem('selectedCampaignId', campaignId);
         
       }
       
       // Verificar se todas as condições estão atendidas antes de carregar
       if (dataSource === 'facebook' && 
           isFacebookConnected && 
           selectedClient && 
           selectedClient !== 'Selecione um cliente' && 
           selectedClient !== 'Todos os Clientes') {
         
         
         
         // Limpar públicos atuais
         setAudiences([]);
         setSelectedAudience('');
         
         // 🎯 CORREÇÃO: Aguardar mais tempo para garantir que tudo esteja sincronizado
         setTimeout(() => {
           
           loadMetaAdsAdSets();
         }, 1000);
       } else {
//          
       }
     };

    window.addEventListener('campaignSelected', handleCampaignSelected);

    return () => {
      window.removeEventListener('campaignSelected', handleCampaignSelected);
    };
  }, [dataSource, isFacebookConnected, selectedClient]);

  // 🎯 NOVO: Listener para carregamento imediato de públicos
  useEffect(() => {
    const handleLoadAudiencesForProduct = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { productName, campaignId, immediate } = customEvent.detail;
      
      
      
      if (campaignId && dataSource === 'facebook' && isFacebookConnected) {
        // Limpar públicos atuais
        setAudiences([]);
        setSelectedAudience('');
        
        // Salvar campaign ID imediatamente
        localStorage.setItem('selectedCampaignId', campaignId);
        
        // Carregamento com retry forçado
        const loadWithForceRetry = async (attempt = 1) => {
          try {
            
            
            // Limpar cache antes de cada tentativa
            metaAdsService.clearCacheByType('adsets');
            
            await loadMetaAdsAdSets();
            
          } catch (error) {
            
            
            // Tentar novamente até 3 vezes
            if (attempt < 3) {
              setTimeout(() => {
                loadWithForceRetry(attempt + 1);
              }, 500 * attempt);
            } else {
              
            }
          }
        };
        
        if (immediate) {
          // Carregamento imediato
          
          loadWithForceRetry();
        } else {
          // Carregamento com delay mínimo
          setTimeout(() => {
            loadWithForceRetry();
          }, 200);
        }
      } else {
//         
      }
    };

    window.addEventListener('loadAudiencesForProduct', handleLoadAudiencesForProduct);

    return () => {
      window.removeEventListener('loadAudiencesForProduct', handleLoadAudiencesForProduct);
    };
  }, [dataSource, isFacebookConnected]);

  // Listener para evento de produto selecionado
  // Listener para força carregamento de Ad Sets
  useEffect(() => {
    const handleForceLoadAdSets = () => {
      
      if (selectedProduct && selectedClient && dataSource === 'facebook') {
        
        loadMetaAdsAdSets();
      } else {
//         
      }
    };

    const handleReloadAudiences = (event: Event) => {
      const customEvent = event as CustomEvent;
      
      if (customEvent.detail?.force) {
        loadMetaAdsAdSets();
      }
    };

    window.addEventListener('forceLoadAdSets', handleForceLoadAdSets);
    window.addEventListener('reloadAudiences', handleReloadAudiences);

    return () => {
      window.removeEventListener('forceLoadAdSets', handleForceLoadAdSets);
      window.removeEventListener('reloadAudiences', handleReloadAudiences);
    };
  }, [selectedProduct, selectedClient, dataSource]);

  useEffect(() => {
    const handleProductSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { productName, source, campaign } = customEvent.detail;
      
      
      
      // 🎯 CORREÇÃO: Salvar campaignId se disponível no evento
      if (campaign && campaign.id) {
        localStorage.setItem('selectedCampaignId', campaign.id);
        
      }
      
      // 🎯 CORREÇÃO: Condições mais permissivas - sempre carregar se for Meta Ads
      if (source === 'facebook' && 
          dataSource === 'facebook' && 
          isFacebookConnected && 
          selectedClient && 
          selectedClient !== 'Selecione um cliente' && 
          selectedClient !== 'Todos os Clientes') {
        
        
        
        // Limpar públicos atuais
        setAudiences([]);
        setSelectedAudience('');
        
        // 🎯 CARREGAMENTO IMEDIATO E FORÇADO
        
        
        // Carregamento com retry automático mais agressivo
        const loadWithForceRetry = async (attempt = 1) => {
          try {
            
            
            // Limpar cache antes de cada tentativa
            metaAdsService.clearCacheByType('adsets');
            
            await loadMetaAdsAdSets();
            
          } catch (error) {
            
            
            // Tentar novamente até 5 vezes com delay menor
            if (attempt < 5) {
              setTimeout(() => {
                loadWithForceRetry(attempt + 1);
              }, 500 * attempt); // Delay progressivo: 500ms, 1s, 1.5s, 2s, 2.5s
            } else {
              
            }
          }
        };
        
        // Carregamento imediato sem delay
        loadWithForceRetry();
      } else {
//         
      }
    };

    window.addEventListener('productSelected', handleProductSelected);

    return () => {
      window.removeEventListener('productSelected', handleProductSelected);
    };
  }, [dataSource, isFacebookConnected, selectedClient]);

  // Listener para evento de recarregar produtos (botão refresh no header)
  useEffect(() => {
    const handleReloadProducts = () => {
      
      
      // Se há produto selecionado e condições atendidas, recarregar públicos também
      if (selectedProduct && 
          selectedProduct !== 'Todos os Produtos' && 
          selectedProduct !== '' &&
          dataSource === 'facebook' && 
          isFacebookConnected && 
          selectedClient && 
          selectedClient !== 'Selecione um cliente' && 
          selectedClient !== 'Todos os Clientes') {
        
        
        
        // Limpar cache e recarregar
        const campaignId = localStorage.getItem('selectedCampaignId');
        if (campaignId) {
          localStorage.removeItem(`adsets_campaign_${campaignId}`);
          localStorage.removeItem(`adsets_campaign_${campaignId}_timestamp`);
        }
        localStorage.removeItem('metaAds_adsets');
        localStorage.removeItem('metaAds_adsets_timestamp');
        
        // Limpar públicos atuais
        setAudiences([]);
        setSelectedAudience('');
        
        // Recarregar após delay
        setTimeout(() => {
          loadMetaAdsAdSets();
        }, 1200);
      }
    };

    window.addEventListener('reloadProducts', handleReloadProducts);

    return () => {
      window.removeEventListener('reloadProducts', handleReloadProducts);
    };
  }, [selectedProduct, dataSource, isFacebookConnected, selectedClient]);

  // Filtrar públicos baseado no termo de busca, produto e cliente selecionados
  const filteredAudiences = audiences.filter(audience => {
    const matchesSearch = audience.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audience.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audience.interests?.some(interest => interest.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         audience.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Para públicos do Facebook, verificar se pertencem ao cliente e produto selecionados
    if (dataSource === 'facebook' && audience.source === 'facebook') {
      const matchesClient = selectedClient === 'Todos os Clientes' || 
                           audience.clientId === selectedClient;
      const matchesProduct = selectedProduct === 'Todos os Produtos' || 
                            audience.productId === selectedProduct;
      return matchesSearch && matchesClient && matchesProduct;
    }
    
    // Para públicos manuais, usar a lógica de mapeamento
    const matchesClient = selectedClient === 'Todos os Clientes' || 
                         audience.clientId === 'all' || 
                         audience.clientId === getClientIdFromName(selectedClient);
    
    const matchesProduct = selectedProduct === 'Todos os Produtos' || 
                          audience.productId === 'all' || 
                          audience.productId === getProductIdFromName(selectedProduct);
    
    return matchesSearch && matchesClient && matchesProduct;
  });

  // Ordenar públicos: Ativos primeiro, depois Pausados, depois outros; desempate por nome
  const getAdSetStatusRank = (audience: Audience): number => {
    const combinedStatus = getCombinedStatus(audience.campaignStatus, audience.adSet?.status);
    if (combinedStatus === 'active') return 0;
    if (combinedStatus === 'inactive') return 1;
    return 2;
  };

  const sortedAudiences = [...filteredAudiences].sort((a, b) => {
    const rankDiff = getAdSetStatusRank(a) - getAdSetStatusRank(b);
    if (rankDiff !== 0) return rankDiff;
    return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
  });

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedInsidePortal = target?.closest?.('.dropdown-portal');
      if (pickerRef.current && !pickerRef.current.contains(target) && !clickedInsidePortal) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected audience when client or product changes (only if no saved audience)
  useEffect(() => {
    const savedAudience = localStorage.getItem('currentSelectedAudience');
    if (!savedAudience || savedAudience === '') {
      setSelectedAudience('');
    }
  }, [selectedClient, selectedProduct, setSelectedAudience]);

  const handleAudienceSelect = (audience: Audience) => {

    // Atualizar estado imediatamente
    setSelectedAudience(audience.name);
    setIsOpen(false);
    setSearchTerm('');
    
    // Salvar público selecionado no localStorage
    localStorage.setItem('currentSelectedAudience', audience.name);
    localStorage.setItem('currentSelectedProduct', selectedProduct); // Salvar produto selecionado
    
    // Disparar evento customizado se for um Ad Set do Facebook
    if (audience.source === 'facebook' && audience.adSet) {

      // Salvar ID do Ad Set no localStorage
      localStorage.setItem('selectedAdSetId', audience.adSet.id);
      
      const event = new CustomEvent('adSetSelected', {
        detail: {
          adSet: audience.adSet,
          audienceName: audience.name,
          adSetId: audience.adSet.id
        }
      });
      window.dispatchEvent(event);

    } else {
      // Para públicos manuais, disparar evento também
      const event = new CustomEvent('audienceSelected', {
        detail: {
          audienceName: audience.name,
          source: audience.source
        }
      });
      window.dispatchEvent(event);

    }
    
      };

  const handleClear = () => {
    setSelectedAudience('');
    setSearchTerm('');
    localStorage.removeItem('currentSelectedAudience');
    localStorage.removeItem('currentSelectedProduct'); // Remover produto selecionado

    // Emitir evento para notificar outros componentes
    window.dispatchEvent(new CustomEvent('audienceCleared'));
  };



  const handleDeleteAudience = (audienceId: string, audienceName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Não permitir deletar públicos do Facebook
    const audience = audiences.find(a => a.id === audienceId);
    if (audience?.source === 'facebook') {
      alert('Não é possível excluir conjuntos de anúncios do Meta Ads. Use o Facebook Ads Manager para gerenciar seus anúncios.');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o público "${audienceName}"?`)) {
      setAudiences(prevAudiences => prevAudiences.filter(audience => audience.id !== audienceId));
      
      if (audienceName === selectedAudience) {
        setSelectedAudience('');
      }
      
      setSearchTerm('');
    }
  };

  const getDisplayText = () => {
    if (!selectedAudience) {
      return 'Selecionar Público';
    }
    const audience = audiences.find(a => a.name === selectedAudience);
    return audience ? audience.name : 'Selecionar Público';
  };

  const formatSize = (size?: number) => {
    if (!size) return '';
    if (size >= 1000000) {
      return `${(size / 1000000).toFixed(1)}M`;
    } else if (size >= 1000) {
      return `${(size / 1000).toFixed(1)}K`;
    }
    return size.toString();
  };

  const getAudienceIcon = (audience: Audience) => {
    if (audience.source === 'facebook') {
      return <Facebook className="w-4 h-4 text-blue-600" />;
    }
    return <Users className="w-4 h-4 text-gray-400" />;
  };

  // Verificar se o picker deve estar ativo - só ativo se Meta estiver conectado e produto/cliente selecionados
  const isPickerActive = dataSource === 'facebook' && isFacebookConnected && selectedProduct && selectedProduct !== 'Todos os Produtos' && selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes';
  
//   

  return (
    <div className="relative dropdown-container" ref={pickerRef}>
      {/* Input field */}
      <div 
        className={`relative ${isPickerActive ? 'cursor-pointer dropdown-trigger' : 'cursor-not-allowed'}`}
        onClick={() => isPickerActive && setIsOpen(!isOpen)}
      >
        <Users className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        <div ref={triggerRef} className={`pl-10 pr-8 py-2 rounded-lg border w-full ${
          isPickerActive 
            ? 'bg-gray-700 text-white border-gray-600 focus:border-purple-500 focus:outline-none' 
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          <span className="truncate block">
            {isPickerActive ? getDisplayText() : 
              !isFacebookConnected ? 'Conecte-se ao Meta primeiro' :
              selectedClient === 'Selecione um cliente' ? 'Selecione um cliente primeiro' : 
              'Selecione um produto primeiro'}
          </span>
        </div>
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 dropdown-indicator ${
          isPickerActive && selectedAudience && selectedAudience !== '' && selectedAudience !== undefined && selectedAudience !== null && selectedAudience !== 'Selecione um público' && selectedAudience !== 'Todos os Públicos'
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : 'bg-gray-500'
        }`}></div>
      </div>

      {/* Dropdown */}
      {(isOpen && isPickerActive) && renderDropdown(
          <div className="dropdown-menu dropdown-menu-wide z-dropdown-high bg-slate-900 border border-slate-700 rounded-xl shadow-2xl" style={{ zIndex: 2147483647 }}>
          {/* Action buttons - Fixed at top */}
          <div className="border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-700">
            <div className="flex items-center justify-between p-3">
              <button
                onClick={handleClear}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-all duration-200 ease-in-out"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </button>
              
              <button
                onClick={async () => {
                  
                  
                  // Mostrar loading sem fechar dropdown
                  setIsRefreshing(true);
                  
                  try {
                    // Limpar cache específico de audiences
                    const campaignId = localStorage.getItem('selectedCampaignId');
                    if (campaignId) {
                      localStorage.removeItem(`adsets_campaign_${campaignId}`);
                      localStorage.removeItem(`adsets_campaign_${campaignId}_timestamp`);
                    }
                    
                    // Limpar cache geral de Ad Sets
                    localStorage.removeItem('metaAdsData_adsets');
                    localStorage.removeItem('metaAdsData_adsets_timestamp');
                    localStorage.removeItem('adsets_cache');
                    localStorage.removeItem('adsets_cache_timestamp');
                    localStorage.removeItem('metaAds_adsets');
                    localStorage.removeItem('metaAds_adsets_timestamp');
                    
                    // Limpar rate limits específicos
                    localStorage.removeItem('metaAdsRateLimit');
                    localStorage.removeItem('metaAdsRateLimitTimestamp');
                    
                    // Limpar cache no serviço se disponível
                    if ((window as any).metaAdsService) {
                      try {
                        if ((window as any).metaAdsService.clearCacheByType) {
                          (window as any).metaAdsService.clearCacheByType('adsets');
                        }
                        if ((window as any).metaAdsService.resetApiRateLimit) {
                          (window as any).metaAdsService.resetApiRateLimit();
                        }
                      } catch (e) {
                        console.error('Erro ao limpar cache do serviço:', e);
                      }
                    }
                    
                    // Limpar públicos atuais
                    setAudiences([]);
                    setSelectedAudience('');
                    
                    // Aguardar um pouco e recarregar SEM fechar dropdown
                    // Rate limit removido - sem pausa
                    
                    
                    await loadMetaAdsAdSets();
                    
                  } catch (error) {
                    console.error('❌ Erro durante atualização:', error);
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-purple-400 hover:text-purple-200 bg-purple-900/30 hover:bg-purple-800/50 rounded-md transition-all duration-200 ease-in-out border border-purple-500/30 shadow-md disabled:opacity-50"
                title="🔄 Atualizar - Limpa cache e recarrega públicos"
              >
                {isRefreshing ? (
                  <>
                    <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-purple-400 border-t-transparent"></div>
                    Atualizando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Atualizar
                  </>
                )}
              </button>

              {/* BOTÃO REMOVIDO - Sincronização é automática */}
              {/* Remover botão de adicionar público - só deve ser feito via Meta */}
              {/* <button
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Público
              </button> */}
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar público..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-slate-200 bg-slate-800 placeholder-slate-400"
                autoFocus
              />
            </div>
          </div>

          {/* Audience list */}
          <div className="dropdown-scroll">
            {(isLoading || isRefreshing) ? (
              <div className="p-4 text-center text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                {isRefreshing ? 'Atualizando públicos...' : 'Carregando conjuntos de anúncios...'}
              </div>
            ) : sortedAudiences.length > 0 ? (
              sortedAudiences.map((audience) => (
                <div
                  key={audience.id}
                  onClick={() => handleAudienceSelect(audience)}
                  className={`p-3 hover:bg-slate-800 cursor-pointer transition-colors group ${
                    audience.name === selectedAudience ? 'bg-slate-800/80 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-slate-200">{audience.name}</div>
                      </div>
                      {audience.description && (
                        <div className="text-sm text-slate-400">{audience.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {audience.ageRange && (
                          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                            {audience.ageRange} anos
                          </span>
                        )}
                        {audience.location && (
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                            {audience.location}
                          </span>
                        )}
                        {audience.size && (
                          <span className="text-xs font-medium text-purple-400">
                            {formatSize(audience.size)} pessoas
                          </span>
                        )}
                        {audience.source === 'facebook' && audience.adSet && (
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            getCombinedStatus(audience.campaignStatus, audience.adSet.status) === 'active'
                              ? 'bg-green-900/30 text-green-400 border-green-500/30' 
                              : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {getCombinedStatus(audience.campaignStatus, audience.adSet.status) === 'active' ? 'Ativo' : 'Pausado'}
                          </span>
                        )}
                      </div>
                      {audience.interests && audience.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {audience.interests.map((interest, index) => (
                            <span key={index} className="text-xs bg-slate-800 text-slate-400 px-1 py-0.5 rounded border border-slate-600">
                              {interest}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {audience.name === selectedAudience && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}
                      {audience.source !== 'facebook' && (
                        <button
                          onClick={(e) => handleDeleteAudience(audience.id, audience.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-all duration-200 ease-in-out"
                          title="Excluir público"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
                             <div className="p-4 text-center text-slate-400">
                 {dataSource === 'facebook' && metaAdsService.isLoggedIn()
                   ? (
                     <div>
                       <div className="mb-3">
                         {`Nenhum conjunto de anúncios encontrado para esta campanha (${selectedProduct})`}
                       </div>

                       <div className="text-xs text-yellow-400 mt-3">
                         💡 Verifique se a campanha existe no Meta Ads e tem conjuntos de anúncios
                       </div>
                     </div>
                   )
                   : selectedClient === 'Selecione um cliente' 
                     ? 'Selecione um cliente para ver os públicos'
                     : selectedProduct === 'Selecione um produto'
                     ? 'Selecione um produto para ver os públicos'
                     : 'Nenhum público encontrado'
                 }
               </div>
            )}
          </div>
          </div>
        )}
        

      </div>
    );
  };
  
  export default AudiencePicker; 