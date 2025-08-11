import React, { useState, useRef, useEffect } from 'react';
import { Package, ChevronDown, Search, Plus, Trash2, Facebook, X } from 'lucide-react';
import { metaAdsService } from '../services/metaAdsService';
import { useDropdownPortal } from '../hooks/useDropdownPortal.tsx';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  clientId: string; // Vinculado ao cliente
  source?: 'manual' | 'facebook';
  campaign?: any; // Dados da campanha do Meta Ads
}

interface ProductPickerProps {
  selectedProduct: string;
  setSelectedProduct: (product: string) => void;
  selectedClient: string; // Cliente selecionado
  dataSource?: 'manual' | 'facebook' | null;
  selectedMonth?: string; // Mês selecionado para filtrar campanhas
  isFacebookConnected?: boolean;
}

const ProductPicker: React.FC<ProductPickerProps> = ({ 
  selectedProduct, 
  setSelectedProduct, 
  selectedClient,
  dataSource,
  selectedMonth,
  isFacebookConnected = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
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

  // Carregar campanhas do Meta Ads (método original que usa estado local)
  const loadMetaAdsCampaigns = async () => {
    if (dataSource === 'facebook' && selectedClient && selectedClient !== 'Todos os Clientes') {
      try {
        setIsLoading(true);
        
        const selectedAccount = metaAdsService.getSelectedAccount();
        
        if (!selectedAccount) {
          setIsLoading(false);
          return;
        }
        
        if (!metaAdsService.isLoggedIn()) {
          setIsLoading(false);
          return;
        }
        
        // Obter datas do mês selecionado
        const getPeriodDates = (monthString: string) => {
          const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          
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
        
        const campaignsData = await metaAdsService.getCampaigns(startDate, endDate);
        
        const activeCampaigns = campaignsData.filter(campaign => 
          campaign.status === 'ACTIVE' || campaign.status === 'PAUSED'
        );
        
        const facebookProducts: Product[] = activeCampaigns.map((campaign, index) => ({
          id: `fb-campaign-${campaign.id}`,
          name: campaign.name,
          description: `Campanha ${campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'} - ${getCampaignObjective(campaign.objective)}`,
          category: 'Meta Ads',
          clientId: selectedClient,
          source: 'facebook' as const,
          campaign: campaign
        }));
        
        // Se não há campanhas, mostrar lista vazia
        if (facebookProducts.length === 0) {
          setProducts([]);
          // Disparar evento quando não há campanhas
          window.dispatchEvent(new CustomEvent('noProductsFound', {
            detail: { clientName: selectedClient }
          }));
        } else {
          setProducts(facebookProducts);
        }
        
      } catch (error: any) {
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    } else if (dataSource === 'manual') {
      // Não carregar produtos manuais - só devem vir do Meta
      setProducts([]);
    } else {
      setProducts([]);
    }
  };

  // Listener para quando cliente for alterado
  useEffect(() => {
    const handleClientChanged = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { clientName, source, adAccount } = customEvent.detail;
      
      // Limpar seleção atual
      setSelectedProduct('');
      
      // Carregar produtos baseado no novo cliente
      if (source === 'facebook') {
        await loadMetaAdsCampaignsForClient(clientName, source, adAccount);
        
        // Carregar métricas de todas as campanhas do cliente
        try {
          const { metricsService } = await import('../services/metricsService');
          metricsService.clearCache();
          
          // Disparar evento para carregar métricas de todas as campanhas
          window.dispatchEvent(new CustomEvent('loadAllCampaignsMetrics', {
            detail: { 
              clientName,
              source,
              adAccount
            }
          }));
        } catch (error) {
          }
      } else if (source === 'manual') {
        await loadMetaAdsCampaignsForClient(clientName, source, null);
      }
    };

    window.addEventListener('clientChanged', handleClientChanged);
    return () => window.removeEventListener('clientChanged', handleClientChanged);
  }, [dataSource, selectedMonth]);

  // Carregar produtos quando componente montar ou quando cliente/dataSource mudar
  useEffect(() => {
    if (selectedClient && selectedClient !== 'Todos os Clientes') {
      loadMetaAdsCampaigns();
    } else {
      // Se não há cliente selecionado, zerar produtos e disparar evento
      setProducts([]);
      if (selectedClient === 'Todos os Clientes') {
        window.dispatchEvent(new CustomEvent('noProductsFound', {
          detail: { clientName: selectedClient }
        }));
      }
    }
  }, [selectedClient, dataSource, selectedMonth]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const clickedInsidePortal = target?.closest?.('.dropdown-portal');
      if (pickerRef.current && !pickerRef.current.contains(target) && !clickedInsidePortal) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleProductSelect = async (product: Product) => {
    setSelectedProduct(product.name);
    setIsOpen(false);
    setSearchTerm('');
    
    // Se for uma campanha do Facebook, salvar no Firestore
    if (product.source === 'facebook' && product.campaign) {
      try {
        const { firestoreCampaignSyncService } = await import('../services/firestoreCampaignSyncService');
        
        // Salvar seleção no Firestore
        await firestoreCampaignSyncService.saveUserSelection({
          selectedCampaignId: product.campaign.id,
          selectedProductName: product.name,
          selectedClient: selectedClient !== 'Selecione um cliente' ? selectedClient : undefined
        });
        
        console.log('✅ Seleção salva no Firestore:', {
          campaignId: product.campaign.id,
          productName: product.name
        });
      } catch (error) {
        console.error('Erro ao salvar seleção no Firestore:', error);
      }
    }
    
    // Manter localStorage como fallback/cache local
    localStorage.setItem('currentSelectedProduct', product.name);
    if (product.source === 'facebook' && product.campaign) {
      localStorage.setItem('selectedCampaignId', product.campaign.id);
    }
    
    // Emitir evento para notificar outros componentes
    window.dispatchEvent(new CustomEvent('productSelected', {
      detail: { 
        productName: product.name,
        productId: product.id,
        source: product.source,
        campaign: product.campaign
      }
    }));
    
    // Se for uma campanha do Facebook, disparar evento específico para carregar métricas
    if (product.source === 'facebook' && product.campaign) {
      window.dispatchEvent(new CustomEvent('campaignSelected', {
        detail: {
          campaign: product.campaign,
          productName: product.name,
          campaignId: product.campaign.id
        }
      }));
    }
  };

  const handleClear = () => {
    setSelectedProduct('');
    setSearchTerm('');
    localStorage.removeItem('currentSelectedProduct');
    
    // Emitir evento para notificar outros componentes
    window.dispatchEvent(new CustomEvent('productCleared'));
  };

  const loadMetaAdsCampaignsForClient = async (clientName: string, source: string, adAccount: any) => {
    if (source === 'facebook' && adAccount) {
      try {
        setIsLoading(true);
        
        // Obter datas do mês selecionado
        const getPeriodDates = (monthString: string) => {
          const months = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ];
          
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
        
        const campaignsData = await metaAdsService.getCampaigns(startDate, endDate);
        
        const activeCampaigns = campaignsData.filter(campaign => 
          campaign.status === 'ACTIVE' || campaign.status === 'PAUSED'
        );
        
        // Sincronizar campanhas com Firestore
        try {
          const { firestoreCampaignSyncService } = await import('../services/firestoreCampaignSyncService');
          const selectedAccount = metaAdsService.getSelectedAccount();
          
          if (selectedAccount && activeCampaigns.length > 0) {
            // Sincronizar campanhas no Firestore
            await firestoreCampaignSyncService.syncCampaignsFromMetaAds(
              activeCampaigns,
              clientName,
              selectedAccount.business_id || 'unknown',
              selectedAccount.id
            );
            console.log('✅ Campanhas sincronizadas com Firestore');
          }
        } catch (error) {
          console.error('Erro ao sincronizar campanhas com Firestore:', error);
        }

        const facebookProducts: Product[] = activeCampaigns.map((campaign, index) => ({
          id: `fb-campaign-${campaign.id}`,
          name: campaign.name,
          description: `Campanha ${campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'} - ${getCampaignObjective(campaign.objective)}`,
          category: 'Meta Ads',
          clientId: clientName,
          source: 'facebook' as const,
          campaign: campaign
        }));
        
        setProducts(facebookProducts);
        
        // Se não há produtos encontrados, disparar evento
        if (facebookProducts.length === 0) {
          window.dispatchEvent(new CustomEvent('noProductsFound', {
            detail: { clientName }
          }));
        }
        
      } catch (error: any) {
        if (error.message.includes('Nenhuma conta de anúncios selecionada') || 
            error.message.includes('Conta de anúncios não configurada')) {
          setTimeout(async () => {
            try {
              await loadMetaAdsCampaignsForClient(clientName, source, adAccount);
            } catch (retryError: any) {
              setProducts([]);
              // Disparar evento quando não há produtos após retry
              window.dispatchEvent(new CustomEvent('noProductsFound', {
                detail: { clientName }
              }));
            }
          }, 3000);
        } else {
          setProducts([]);
          // Disparar evento quando há erro e não há produtos
          window.dispatchEvent(new CustomEvent('noProductsFound', {
            detail: { clientName }
          }));
        }
      } finally {
        setIsLoading(false);
      }
    } else if (source === 'manual') {
      // Não carregar produtos manuais - só devem vir do Meta
      setProducts([]);
      // Disparar evento para clientes manuais sem produtos
      window.dispatchEvent(new CustomEvent('noProductsFound', {
        detail: { clientName }
      }));
    } else {
      setProducts([]);
      // Disparar evento quando não há dataSource válido
      window.dispatchEvent(new CustomEvent('noProductsFound', {
        detail: { clientName }
      }));
    }
  };

  const handleDeleteProduct = (productId: string, productName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Não permitir deletar produtos do Facebook
    const product = products.find(p => p.id === productId);
    if (product?.source === 'facebook') {
      alert('Não é possível excluir campanhas do Meta Ads. Use o Facebook Ads Manager para gerenciar suas campanhas.');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o produto "${productName}"?`)) {
      setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
      
      if (productName === selectedProduct) {
        setSelectedProduct('');
      }
      
      setSearchTerm('');
    }
  };

  const getDisplayText = () => {
    if (!selectedProduct) {
      return 'Selecionar Produto';
    }
    const product = products.find(p => p.name === selectedProduct);
    return product ? product.name : 'Selecionar Produto';
  };

  const formatPrice = (price?: number) => {
    if (!price) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getProductIcon = (product: Product) => {
    if (product.source === 'facebook') {
      return <Facebook className="w-4 h-4 text-blue-600" />;
    }
    return <Package className="w-4 h-4 text-gray-400" />;
  };

  // Função para traduzir objetivos das campanhas
  const getCampaignObjective = (objective: string | undefined): string => {
    if (!objective) return 'Sem objetivo definido';
    
    const objectives: { [key: string]: string } = {
      'OUTCOME_ENGAGEMENT': 'Engajamento',
      'OUTCOME_AWARENESS': 'Reconhecimento',
      'OUTCOME_TRAFFIC': 'Tráfego',
      'OUTCOME_LEADS': 'Leads',
      'OUTCOME_SALES': 'Vendas',
      'OUTCOME_APP_PROMOTION': 'Promoção de App',
      'OUTCOME_BRAND_AWARENESS': 'Reconhecimento da Marca',
      'OUTCOME_REACH': 'Alcance',
      'OUTCOME_VIDEO_VIEWS': 'Visualizações de Vídeo',
      'OUTCOME_CONVERSIONS': 'Conversões',
      'OUTCOME_ACTION': 'Ações',
      'OUTCOME_APP_INSTALLS': 'Instalações de App',
      'OUTCOME_CATALOG_SALES': 'Vendas do Catálogo',
      'OUTCOME_MESSAGES': 'Mensagens',
      'OUTCOME_STORE_VISITS': 'Visitas à Loja',
      'OUTCOME_WEBSITE_CONVERSIONS': 'Conversões do Site'
    };
    
    return objectives[objective] || objective;
  };

  // Verificar se o picker deve estar ativo - só ativo se Meta estiver conectado e cliente selecionado
  const isPickerActive = dataSource === 'facebook' && isFacebookConnected && selectedClient && selectedClient !== 'Todos os Clientes' && selectedClient !== 'Selecione um cliente';

  // Filtrar produtos baseado no termo de busca
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="relative dropdown-container" ref={pickerRef}>
      {/* Input field */}
      <div 
        className={`relative ${isPickerActive ? 'cursor-pointer dropdown-trigger' : 'cursor-not-allowed'}`}
        onClick={() => isPickerActive && setIsOpen(!isOpen)}
      >
        <Package className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        <div ref={triggerRef} className={`pl-10 pr-8 py-2 rounded-lg border w-full ${
          isPickerActive 
            ? 'bg-gray-700 text-white border-gray-600 focus:border-purple-500 focus:outline-none' 
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
                  <span className="truncate block">
          {isPickerActive ? getDisplayText() : 
            !isFacebookConnected ? 'Conecte-se ao Meta primeiro' : 
            'Selecione um cliente primeiro'}
        </span>
        </div>
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 dropdown-indicator ${
          isPickerActive && selectedProduct && selectedProduct !== '' && selectedProduct !== undefined && selectedProduct !== null && selectedProduct !== 'Todos os Produtos'
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

              {/* Remover botão de adicionar produto - só deve ser feito via Meta */}
              {/* <button
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Produto
              </button> */}
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-slate-200 bg-slate-800 placeholder-slate-400"
                autoFocus
              />
            </div>
          </div>

          {/* Product list */}
          <div className="dropdown-scroll">
            {isLoading ? (
              <div className="p-4 text-center text-slate-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                Carregando campanhas...
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className={`p-3 hover:bg-slate-800 cursor-pointer transition-colors group ${
                    product.name === selectedProduct ? 'bg-slate-800/80 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-slate-200">{product.name}</div>
                      </div>
                      {product.description && (
                        <div className="text-sm text-slate-400">{product.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        {product.category && (
                          <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-1 rounded-full border border-blue-500/30">
                            {product.category}
                          </span>
                        )}
                        {product.price && (
                          <span className="text-xs font-medium text-green-400">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        {product.source === 'facebook' && product.campaign && (
                          <span className={`text-xs px-2 py-1 rounded-full border ${
                            product.campaign.status === 'ACTIVE' 
                              ? 'bg-green-900/30 text-green-400 border-green-500/30' 
                              : 'bg-yellow-900/30 text-yellow-400 border-yellow-500/30'
                          }`}>
                            {product.campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {product.name === selectedProduct && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}
                      {product.source !== 'facebook' && (
                        <button
                          onClick={(e) => handleDeleteProduct(product.id, product.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-all duration-200 ease-in-out"
                          title="Excluir produto"
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
                  ? 'Nenhuma campanha ativa encontrada para este período'
                  : selectedClient === 'Todos os Clientes' 
                    ? 'Selecione um cliente para ver os produtos'
                    : 'Nenhum produto encontrado'
                }
              </div>
            )}
          </div>
          </div>
        )}
    </div>
  );
};

export default ProductPicker;