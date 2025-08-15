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

  // Carregar Ad Sets do Meta Ads
  const loadMetaAdsAdSets = async () => {
    console.log('🔍 AudiencePicker - loadMetaAdsAdSets chamado com:', {
      dataSource,
      selectedProduct,
      selectedClient,
      selectedMonth,
      isFacebookConnected
    });
    
    // Verificar todas as condições necessárias
    if (dataSource !== 'facebook') {
      console.log('❌ AudiencePicker - DataSource não é facebook:', dataSource);
      return;
    }
    
    if (!selectedProduct || selectedProduct === 'Todos os Produtos' || selectedProduct === '') {
      console.log('❌ AudiencePicker - Produto não selecionado ou inválido:', selectedProduct);
      return;
    }
    
    if (!selectedClient || selectedClient === 'Selecione um cliente' || selectedClient === 'Todos os Clientes') {
      console.log('❌ AudiencePicker - Cliente não selecionado ou inválido:', selectedClient);
      return;
    }
    
    if (!isFacebookConnected) {
      console.log('❌ AudiencePicker - Meta Ads não conectado');
      return;
    }
    
    console.log('✅ AudiencePicker - Todas as condições atendidas, iniciando carregamento...');
    
    if (dataSource === 'facebook' && selectedProduct && selectedProduct !== 'Todos os Produtos') {
      try {
        // Verificar se está logado no Meta Ads
        if (!metaAdsService.isLoggedIn()) {
          console.log('Meta Ads não está logado');
          setAudiences([]);
          return;
        }
        
        console.log('Meta Ads está logado, verificando conta selecionada...');
        if (!metaAdsService.hasSelectedAccount()) {
          console.log('Nenhuma conta selecionada no Meta Ads');
          setAudiences([]);
          return;
        }
        
        setIsLoading(true);
                
        // 🎯 CORREÇÃO: Obter ID da campanha com múltiplas tentativas
        let campaignId = localStorage.getItem('selectedCampaignId');
        console.log('🔍 DEBUG - AudiencePicker - Campaign ID do localStorage (primeira tentativa):', campaignId);
        
        // Se não encontrou, aguardar um pouco e tentar novamente
        if (!campaignId) {
          console.log('⏳ DEBUG - AudiencePicker - Campaign ID não encontrado, aguardando e tentando novamente...');
          
          // Aguardar um pouco para o localStorage ser atualizado
          await new Promise(resolve => setTimeout(resolve, 500));
          campaignId = localStorage.getItem('selectedCampaignId');
          console.log('🔍 DEBUG - AudiencePicker - Campaign ID do localStorage (segunda tentativa):', campaignId);
        }
        
        if (!campaignId) {
          console.log('❌ DEBUG - AudiencePicker - Nenhum campaign ID encontrado após múltiplas tentativas');
          
          // 🎯 MELHORIA: Tentar obter campaign ID do produto selecionado no localStorage
          const currentSelectedProduct = localStorage.getItem('currentSelectedProduct');
          if (currentSelectedProduct) {
            console.log('🔍 DEBUG - AudiencePicker - Tentando buscar campaign ID alternativo do produto:', currentSelectedProduct);
            // Se há produto selecionado, continuar sem falhar (será um fallback)
          } else {
            setAudiences([]);
            return;
          }
        }
        
        console.log('✅ DEBUG - AudiencePicker - Campaign ID encontrado:', campaignId);
        
        // Obter datas do mês selecionado
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

        const { startDate, endDate } = getPeriodDates(selectedMonth || '');
        console.log('Período calculado para Ad Sets:', { startDate, endDate });
                
        console.log('Chamando metaAdsService.getAdSets com:', { campaignId, startDate, endDate });
        const adSetsData = await metaAdsService.getAdSets(campaignId, startDate, endDate);
        console.log('Ad Sets retornados da API:', adSetsData.length);
        console.log('Primeiro Ad Set:', adSetsData[0]);
                
        // Filtrar apenas Ad Sets ativos
        const activeAdSets = adSetsData.filter(adSet => 
          adSet.status === 'ACTIVE' || adSet.status === 'PAUSED'
        );
        console.log('Ad Sets ativos/pausados:', activeAdSets.length);

        // Converter Ad Sets para formato de públicos, buscando targeting atualizado por adset quando possível
        const facebookAudiences: Audience[] = await Promise.all(activeAdSets.map(async (adSet) => {
          // Buscar detalhes do ad set (inclui targeting atualizado)
          let targeting: any = adSet?.targeting || {};
          try {
            const det = await metaAdsService.getAdSetDetails(adSet.id);
            console.log('DEBUG AudiencePicker - detalhes do adset', adSet.id, det);
            if (det?.targeting) targeting = det.targeting;
            console.log('DEBUG AudiencePicker - targeting resolvido', adSet.id, targeting);
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
            description: `Conjunto de anúncios ${adSet.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}`,
            ageRange,
            location,
            productId: selectedProduct,
            clientId: selectedClient,
            source: 'facebook' as const,
            adSet: adSet
          } as Audience;
        }));

        console.log('Públicos convertidos:', facebookAudiences.length);
        console.log('Primeiro público:', facebookAudiences[0]);

                 // Se não há Ad Sets, mostrar lista vazia
         if (facebookAudiences.length === 0) {
           console.log('Nenhum público encontrado, definindo lista vazia');
           setAudiences([]);
         } else {
           console.log('Definindo públicos encontrados:', facebookAudiences.length);
           setAudiences(facebookAudiences);
         }
         

        
              } catch (error: any) {
          console.error('Erro ao carregar Ad Sets:', error);
          console.error('Detalhes do erro:', error.message);
          
          // 🎯 TRATAMENTO ESPECÍFICO PARA RATE LIMIT
          if (error.message && (
            error.message.includes('User request limit reached') ||
            error.message.includes('rate limit') ||
            error.message.includes('400') ||
            error.response?.status === 400
          )) {
            console.error('🚨 RATE LIMIT DETECTADO! Sugerindo reset...');
            console.error('💡 SOLUÇÃO: Execute resetApiRateLimit() no console e recarregue a página');
            
            // Tentar reset automático se a função estiver disponível
            if (typeof (window as any).resetApiRateLimit === 'function') {
              console.log('🔄 Tentando reset automático do rate limit...');
              try {
                (window as any).resetApiRateLimit();
                console.log('✅ Reset automático executado! Recarregue a página em alguns segundos.');
              } catch (resetError) {
                console.error('❌ Falha no reset automático:', resetError);
              }
            }
          }
          
          // Log do erro
          console.log('Erro ao carregar Ad Sets:', error.message);
          
          setAudiences([]);
        } finally {
          setIsLoading(false);
        }
    } else if (dataSource === 'manual') {
      // Não carregar públicos manuais - só devem vir do Meta
      setAudiences([]);
    } else {
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

  // Carregar públicos quando dataSource, selectedProduct, selectedClient ou selectedMonth mudar
  useEffect(() => {
    console.log('AudiencePicker useEffect - Parâmetros:', {
      dataSource,
      selectedProduct,
      selectedClient,
      selectedMonth,
      isFacebookConnected
    });
                    
    // Só carregar se há produto selecionado e Meta Ads conectado
    if (selectedProduct && 
        selectedProduct !== 'Todos os Produtos' && 
        selectedProduct !== '' && 
        selectedClient && 
        selectedClient !== 'Selecione um cliente' && 
        selectedClient !== 'Todos os Clientes' &&
        dataSource === 'facebook' &&
        isFacebookConnected) {
      
      console.log('✅ Condições atendidas, carregando Ad Sets automaticamente...');
      
      // Limpar públicos atuais primeiro
      setAudiences([]);
      setSelectedAudience('');
            
      // 🎯 CORREÇÃO: Reduzir delay drásticamente e adicionar retry automático
      const loadWithRetry = async (attempt = 1) => {
        try {
          console.log(`🔄 Tentativa ${attempt} de carregamento automático...`);
          await loadMetaAdsAdSets();
          console.log('✅ Carregamento automático bem-sucedido!');
        } catch (error) {
          console.log(`❌ Tentativa ${attempt} falhou:`, error);
          
          // Se falhar, tentar novamente até 3 vezes
          if (attempt < 3) {
            setTimeout(() => {
              loadWithRetry(attempt + 1);
            }, 1000 * attempt); // Delay progressivo: 1s, 2s, 3s
          } else {
            console.log('❌ Todas as tentativas falharam - botões disponíveis para fallback');
          }
        }
      };
      
      // Delay mínimo apenas para evitar race conditions
      const timer = setTimeout(() => {
        loadWithRetry();
      }, 200); // Reduzido de 500ms para 200ms
      
      return () => clearTimeout(timer);
    } else {
      console.log('Condições não atendidas, resetando públicos. Motivos:', {
        hasProduct: selectedProduct && selectedProduct !== 'Todos os Produtos' && selectedProduct !== '',
        hasClient: selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes',
        isMetaAds: dataSource === 'facebook',
        isConnected: isFacebookConnected
      });
      
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
       
       console.log('🔍 AudiencePicker - Campanha selecionada:', { campaignId, productName });
       
       // 🎯 CORREÇÃO: Garantir que o campaignId seja salvo no localStorage
       if (campaignId) {
         localStorage.setItem('selectedCampaignId', campaignId);
         console.log('✅ AudiencePicker - selectedCampaignId salvo via evento:', campaignId);
       }
       
       // Verificar se todas as condições estão atendidas antes de carregar
       if (dataSource === 'facebook' && 
           isFacebookConnected && 
           selectedClient && 
           selectedClient !== 'Selecione um cliente' && 
           selectedClient !== 'Todos os Clientes') {
         
         console.log('✅ AudiencePicker - Condições atendidas, recarregando Ad Sets...');
         
         // Limpar públicos atuais
         setAudiences([]);
         setSelectedAudience('');
         
         // 🎯 CORREÇÃO: Aguardar mais tempo para garantir que tudo esteja sincronizado
         setTimeout(() => {
           console.log('🔍 AudiencePicker - Executando loadMetaAdsAdSets via campaignSelected...');
           loadMetaAdsAdSets();
         }, 1000);
       } else {
         console.log('❌ AudiencePicker - Condições não atendidas para recarregar Ad Sets:', {
           dataSource,
           isFacebookConnected,
           selectedClient
         });
       }
     };

    window.addEventListener('campaignSelected', handleCampaignSelected);

    return () => {
      window.removeEventListener('campaignSelected', handleCampaignSelected);
    };
  }, [dataSource, isFacebookConnected, selectedClient]);

  // 🎯 NOVO: Listener para carregamento imediato de públicos
  useEffect(() => {
    const handleLoadAudiencesForProduct = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { productName, campaignId, immediate } = customEvent.detail;
      
      console.log('🚀 AudiencePicker - Carregamento imediato solicitado:', { productName, campaignId, immediate });
      
      if (immediate && campaignId) {
        // Salvar campaign ID imediatamente
        localStorage.setItem('selectedCampaignId', campaignId);
        
        // Carregar públicos imediatamente sem delay
        console.log('⚡ AudiencePicker - Carregando públicos imediatamente...');
        loadMetaAdsAdSets();
      }
    };

    window.addEventListener('loadAudiencesForProduct', handleLoadAudiencesForProduct);

    return () => {
      window.removeEventListener('loadAudiencesForProduct', handleLoadAudiencesForProduct);
    };
  }, []);

  // Listener para evento de produto selecionado
  useEffect(() => {
    const handleProductSelected = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { productName, source, campaign } = customEvent.detail;
      
      console.log('🔍 AudiencePicker - Produto selecionado:', { productName, source, campaign });
      
      // 🎯 CORREÇÃO: Salvar campaignId se disponível no evento
      if (campaign && campaign.id) {
        localStorage.setItem('selectedCampaignId', campaign.id);
        console.log('✅ AudiencePicker - selectedCampaignId salvo via productSelected:', campaign.id);
      }
      
      // 🎯 CORREÇÃO: Verificar condições mais permissivas
      if (source === 'facebook' && 
          dataSource === 'facebook' && 
          isFacebookConnected && 
          selectedClient && 
          selectedClient !== 'Selecione um cliente' && 
          selectedClient !== 'Todos os Clientes') {
        
        console.log('✅ AudiencePicker - Produto Meta Ads selecionado, recarregando públicos...');
        
        // Limpar públicos atuais
        setAudiences([]);
        setSelectedAudience('');
        
        // 🎯 CORREÇÃO: Carregamento rápido após seleção de produto
        setTimeout(() => {
          console.log('🔍 AudiencePicker - Carregando Ad Sets após seleção de produto...');
          loadMetaAdsAdSets();
        }, 300); // Reduzido drasticamente de 1.5s para 300ms
      } else {
        console.log('❌ AudiencePicker - Condições não atendidas para carregar públicos:', {
          source,
          dataSource,
          isFacebookConnected,
          selectedClient
        });
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
      console.log('AudiencePicker - Evento reloadProducts recebido');
      
      // Se há produto selecionado e condições atendidas, recarregar públicos também
      if (selectedProduct && 
          selectedProduct !== 'Todos os Produtos' && 
          selectedProduct !== '' &&
          dataSource === 'facebook' && 
          isFacebookConnected && 
          selectedClient && 
          selectedClient !== 'Selecione um cliente' && 
          selectedClient !== 'Todos os Clientes') {
        
        console.log('AudiencePicker - Recarregando públicos após reload de produtos...');
        
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
    const status = audience.adSet?.status;
    if (status === 'ACTIVE') return 0;
    if (status === 'PAUSED') return 1;
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

  const handleRetry = () => {
    console.log('Tentando novamente...');
    // Limpar cache do Meta Ads
    metaAdsService.clearCacheByType('adsets');
    // Tentar carregar novamente
    loadMetaAdsAdSets();
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
  
  console.log('AudiencePicker - Condições de ativação:', {
    dataSource,
    isFacebookConnected,
    selectedProduct,
    selectedClient,
    isPickerActive,
    audiencesCount: audiences.length
  });

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
                onClick={() => {
                  // Limpar cache do Meta Ads
                  const campaignId = localStorage.getItem('selectedCampaignId');
                  if (campaignId) {
                    localStorage.removeItem(`adsets_campaign_${campaignId}`);
                    localStorage.removeItem(`adsets_campaign_${campaignId}_timestamp`);
                  }
                  // Limpar cache geral
                  localStorage.removeItem('metaAds_adsets');
                  localStorage.removeItem('metaAds_adsets_timestamp');
                  
                  // Recarregar dados
                  loadMetaAdsAdSets();
                  setIsOpen(false);
                }}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-yellow-400 hover:text-yellow-200 hover:bg-slate-800 rounded-md transition-all duration-200 ease-in-out"
                title="Limpar cache e recarregar dados do Meta Ads"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Recarregar
              </button>
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
            {isLoading ? (
              <div className="p-4 text-center text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                Carregando conjuntos de anúncios...
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
                            audience.adSet.status === 'ACTIVE' 
                              ? 'bg-green-900/30 text-green-400 border-green-500/30' 
                              : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {audience.adSet.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
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
                         {`Nenhum conjunto de anúncios ativo encontrado para esta campanha (${selectedProduct})`}
                       </div>
                       <button
                         onClick={() => {
                           metaAdsService.clearCacheByType('adsets');
                           loadMetaAdsAdSets();
                         }}
                         className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
                       >
                         Tentar Novamente
                       </button>
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