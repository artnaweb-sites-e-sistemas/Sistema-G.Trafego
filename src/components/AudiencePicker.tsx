import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Search, Plus, Trash2, Facebook, X } from 'lucide-react';
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

  // Função para processar Ad Sets encontrados
  const processAdSets = async (filteredAdSets: any[]) => {
    try {
      console.log('🔄 CRÍTICO - processAdSets - Processando Ad Sets:', filteredAdSets.length);
      
      // Log detalhado dos Ad Sets encontrados
      filteredAdSets.forEach((adSet, index) => {
        console.log(`🔍 DEBUG - Ad Set ${index + 1}:`, {
          id: adSet.id,
          name: adSet.name,
          status: adSet.status,
          campaign_id: adSet.campaign_id
        });
      });
      
      console.log('Ad Sets selecionados para exibição:', filteredAdSets.length);

      // Converter Ad Sets para formato de públicos, buscando targeting atualizado por adset quando possível
      const facebookAudiences: Audience[] = await Promise.all(filteredAdSets.map(async (adSet) => {
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
        console.log('✅ CRÍTICO - Definindo públicos encontrados:', facebookAudiences.length);
        setAudiences(facebookAudiences);
      }
      
    } catch (error) {
      console.error('🚨 CRÍTICO - Erro ao processar Ad Sets:', error);
      setAudiences([]);
    }
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
                
        console.log('🚀 CRÍTICO - AudiencePicker - Chamando metaAdsService.getAdSets com campaign ID:', campaignId);
        console.log('🚀 CRÍTICO - AudiencePicker - Meta Ads Service Status:', {
          isLoggedIn: metaAdsService.isLoggedIn(),
          hasAccount: metaAdsService.hasSelectedAccount(),
          selectedAccount: metaAdsService.getSelectedAccount()
        });
        
        // 🎯 CORREÇÃO: Não enviar parâmetros de data para getAdSets, a API do Meta não aceita
        const adSetsData = await metaAdsService.getAdSets(campaignId);
        console.log('🚀 CRÍTICO - Ad Sets retornados da API:', {
          length: adSetsData.length,
          campaignId: campaignId,
          adSetsData: adSetsData
        });
        
        if (adSetsData.length > 0) {
          console.log('🚀 CRÍTICO - Primeiro Ad Set encontrado:', adSetsData[0]);
          console.log('🚀 CRÍTICO - Todos os Ad Sets:', adSetsData.map(ad => ({ 
            id: ad.id, 
            name: ad.name, 
            status: ad.status, 
            campaign_id: ad.campaign_id 
          })));
        } else {
          console.error('🚨 CRÍTICO - NENHUM AD SET ENCONTRADO! Investigando...');
          
          // Tentar buscar todos os Ad Sets da conta para debug
          try {
            console.log('🔍 CRÍTICO - Tentando buscar TODOS os Ad Sets da conta...');
            const allAdSets = await metaAdsService.getAdSets();
            console.log('🔍 CRÍTICO - Todos os Ad Sets da conta:', {
              total: allAdSets.length,
              adSets: allAdSets.map(ad => ({ 
                id: ad.id, 
                name: ad.name, 
                status: ad.status, 
                campaign_id: ad.campaign_id 
              }))
            });
            
            // Verificar se algum Ad Set pertence à campanha selecionada
            const matchingAdSets = allAdSets.filter(ad => ad.campaign_id === campaignId);
            console.log('🔍 CRÍTICO - Ad Sets que pertencem à campanha selecionada:', {
              campaignId,
              matching: matchingAdSets.length,
              adSets: matchingAdSets.map(ad => ({ 
                id: ad.id, 
                name: ad.name, 
                status: ad.status 
              }))
            });
            
            // 🎯 CORREÇÃO CRÍTICA: Se encontrou Ad Sets da campanha, usar eles
            if (matchingAdSets.length > 0) {
              console.log('✅ CRÍTICO - USANDO Ad Sets encontrados via fallback!');
              // Substituir adSetsData vazio pelos Ad Sets encontrados
              const correctedAdSetsData = matchingAdSets;
              
              // Continuar o processamento com os Ad Sets corretos
              const filteredAdSets = correctedAdSetsData;
              console.log('📊 CRÍTICO - INCLUINDO Ad Sets via fallback:', filteredAdSets.length);
              
              // Converter e processar os Ad Sets encontrados
              await processAdSets(filteredAdSets);
              return; // Sair da função após processar
            }
            
          } catch (debugError) {
            console.error('🚨 CRÍTICO - Erro ao buscar todos os Ad Sets para debug:', debugError);
          }
        }
                
        // 🎯 CORREÇÃO COMPLETA: Para análise de períodos históricos, SEMPRE incluir TODOS os Ad Sets
        // O usuário quer ver os dados que existiam no período selecionado, independente do status atual
        console.log('🔍 DEBUG - AudiencePicker - Período selecionado:', selectedMonth);
        console.log('🔍 DEBUG - AudiencePicker - Data de início do período:', startDate);
        console.log('🔍 DEBUG - AudiencePicker - Total de Ad Sets retornados da API:', adSetsData.length);
        
        // SEMPRE incluir TODOS os Ad Sets para permitir análise histórica
        const filteredAdSets = adSetsData;
        console.log('📊 INCLUINDO TODOS OS AD SETS para análise histórica:', filteredAdSets.length);
        
        // Processar Ad Sets encontrados
        await processAdSets(filteredAdSets);

         

        
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
      
      console.log('🚀 CARREGAMENTO AUTOMÁTICO SUPER AGRESSIVO ATIVADO!');
      
      // Limpar públicos atuais IMEDIATAMENTE
      setAudiences([]);
      setSelectedAudience('');
            
      // 🎯 CARREGAMENTO IMEDIATO E SUPER AGRESSIVO - SEM DELAYS!
      const loadImmediate = async () => {
        try {
          console.log('⚡ CARREGAMENTO IMEDIATO - Iniciando AGORA!');
          
          // Limpar cache completamente
          metaAdsService.clearCacheByType('adsets');
          
          // Carregar IMEDIATAMENTE
          await loadMetaAdsAdSets();
          console.log('✅ CARREGAMENTO IMEDIATO - SUCESSO!');
        } catch (error) {
          console.error('❌ CARREGAMENTO IMEDIATO - FALHA:', error);
          
          // Retry IMEDIATO se falhar - apenas 1 retry com delay mínimo
          setTimeout(async () => {
            try {
              console.log('🔄 RETRY IMEDIATO...');
              metaAdsService.clearCacheByType('adsets');
              await loadMetaAdsAdSets();
              console.log('✅ RETRY IMEDIATO - SUCESSO!');
            } catch (retryError) {
              console.error('❌ RETRY IMEDIATO - FALHA FINAL:', retryError);
            }
          }, 50); // Apenas 50ms de delay
        }
      };
      
      // EXECUÇÃO IMEDIATA - SEM QUALQUER DELAY!
      loadImmediate();
      

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
    const handleLoadAudiencesForProduct = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { productName, campaignId, immediate } = customEvent.detail;
      
      console.log('🚀 AudiencePicker - Carregamento imediato solicitado:', { productName, campaignId, immediate });
      
      if (campaignId && dataSource === 'facebook' && isFacebookConnected) {
        // Limpar públicos atuais
        setAudiences([]);
        setSelectedAudience('');
        
        // Salvar campaign ID imediatamente
        localStorage.setItem('selectedCampaignId', campaignId);
        
        // Carregamento com retry forçado
        const loadWithForceRetry = async (attempt = 1) => {
          try {
            console.log(`🔄 AudiencePicker loadAudiencesForProduct - Tentativa ${attempt}...`);
            
            // Limpar cache antes de cada tentativa
            metaAdsService.clearCacheByType('adsets');
            
            await loadMetaAdsAdSets();
            console.log('✅ AudiencePicker loadAudiencesForProduct - Carregamento bem-sucedido!');
          } catch (error) {
            console.log(`❌ AudiencePicker loadAudiencesForProduct - Tentativa ${attempt} falhou:`, error);
            
            // Tentar novamente até 3 vezes
            if (attempt < 3) {
              setTimeout(() => {
                loadWithForceRetry(attempt + 1);
              }, 500 * attempt);
            } else {
              console.log('❌ AudiencePicker loadAudiencesForProduct - Todas as tentativas falharam');
            }
          }
        };
        
        if (immediate) {
          // Carregamento imediato
          console.log('⚡ AudiencePicker - Carregando públicos IMEDIATAMENTE...');
          loadWithForceRetry();
        } else {
          // Carregamento com delay mínimo
          setTimeout(() => {
            loadWithForceRetry();
          }, 200);
        }
      } else {
        console.log('❌ AudiencePicker loadAudiencesForProduct - Condições não atendidas:', {
          campaignId,
          dataSource,
          isFacebookConnected
        });
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
      console.log('🚀 CRÍTICO - AudiencePicker - Recebido evento para forçar carregamento de Ad Sets');
      if (selectedProduct && selectedClient && dataSource === 'facebook') {
        console.log('🚀 CRÍTICO - Condições atendidas, forçando loadMetaAdsAdSets...');
        loadMetaAdsAdSets();
      } else {
        console.log('🚀 CRÍTICO - Condições não atendidas:', {
          selectedProduct,
          selectedClient,
          dataSource
        });
      }
    };

    const handleReloadAudiences = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🚀 CRÍTICO - AudiencePicker - Recebido evento para recarregar audiências:', customEvent.detail);
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
      
      console.log('🔍 AudiencePicker - Produto selecionado:', { productName, source, campaign });
      
      // 🎯 CORREÇÃO: Salvar campaignId se disponível no evento
      if (campaign && campaign.id) {
        localStorage.setItem('selectedCampaignId', campaign.id);
        console.log('✅ AudiencePicker - selectedCampaignId salvo via productSelected:', campaign.id);
      }
      
      // 🎯 CORREÇÃO: Condições mais permissivas - sempre carregar se for Meta Ads
      if (source === 'facebook' && 
          dataSource === 'facebook' && 
          isFacebookConnected && 
          selectedClient && 
          selectedClient !== 'Selecione um cliente' && 
          selectedClient !== 'Todos os Clientes') {
        
        console.log('✅ AudiencePicker - Produto Meta Ads selecionado, carregando públicos automaticamente...');
        
        // Limpar públicos atuais
        setAudiences([]);
        setSelectedAudience('');
        
        // 🎯 CARREGAMENTO IMEDIATO E FORÇADO
        console.log('🚀 AudiencePicker - Carregando Ad Sets IMEDIATAMENTE após seleção de produto...');
        
        // Carregamento com retry automático mais agressivo
        const loadWithForceRetry = async (attempt = 1) => {
          try {
            console.log(`🔄 AudiencePicker - Tentativa ${attempt} de carregamento FORÇADO...`);
            
            // Limpar cache antes de cada tentativa
            metaAdsService.clearCacheByType('adsets');
            
            await loadMetaAdsAdSets();
            console.log('✅ AudiencePicker - Carregamento FORÇADO bem-sucedido!');
          } catch (error) {
            console.log(`❌ AudiencePicker - Tentativa ${attempt} falhou:`, error);
            
            // Tentar novamente até 5 vezes com delay menor
            if (attempt < 5) {
              setTimeout(() => {
                loadWithForceRetry(attempt + 1);
              }, 500 * attempt); // Delay progressivo: 500ms, 1s, 1.5s, 2s, 2.5s
            } else {
              console.log('❌ AudiencePicker - Todas as tentativas FORÇADAS falharam');
            }
          }
        };
        
        // Carregamento imediato sem delay
        loadWithForceRetry();
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
              
              {/* Botão Carregar Públicos - Lado direito */}
              <button
                onClick={() => {
                  console.log('🚀 CRÍTICO - Botão Carregar clicado - Forçando carregamento de Ad Sets...');
                  setIsLoading(true);
                  loadMetaAdsAdSets().finally(() => setIsLoading(false));
                }}
                disabled={isLoading}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-blue-400 hover:text-blue-200 hover:bg-slate-800 rounded-md transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                title="Forçar carregamento dos conjuntos de anúncios"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 mr-1 animate-spin rounded-full border-2 border-blue-400 border-t-transparent"></div>
                    Carregando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Carregar
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
                         {`Nenhum conjunto de anúncios encontrado para esta campanha (${selectedProduct})`}
                       </div>
                       <div className="text-xs text-slate-500 mt-2">
                         Os conjuntos são sincronizados automaticamente do Meta Ads
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