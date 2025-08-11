import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Search, Plus, Trash2, Facebook, X } from 'lucide-react';
import { metaAdsService, BusinessManager } from '../services/metaAdsService';

interface Client {
  id: string;
  name: string;
  email?: string;
  company?: string;
  source?: 'manual' | 'facebook';
  businessManager?: BusinessManager;
}

interface ClientPickerProps {
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  dataSource?: 'manual' | 'facebook' | null;
  isFacebookConnected?: boolean;
}

const ClientPicker: React.FC<ClientPickerProps> = ({ 
  selectedClient, 
  setSelectedClient,
  dataSource,
  isFacebookConnected = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  
  // Carregar cliente salvo do localStorage ao inicializar
  useEffect(() => {
    const savedClient = localStorage.getItem('currentSelectedClient');
    
    // Só carregar cliente salvo se já estiver conectado ao Meta Ads
    // E se já tiver Business Manager e conta de anúncios selecionadas
    // E se o cliente atual for "Selecione um cliente" (não foi selecionado ainda)
    if (savedClient && savedClient !== 'Todos os Clientes' && isFacebookConnected) {
      const selectedBusinessManager = localStorage.getItem('selectedBusinessManager');
      const selectedAdAccount = localStorage.getItem('selectedAdAccount');
      
      // Só carregar cliente se já tiver Business Manager e conta selecionadas
      // E se o cliente atual for "Selecione um cliente"
      if (selectedBusinessManager && selectedAdAccount && selectedClient === 'Selecione um cliente') {
        setSelectedClient(savedClient);
      }
    }
  }, [setSelectedClient, isFacebookConnected, selectedClient]);

  // Listener para reagir quando cliente for limpo pelo Dashboard
  useEffect(() => {
    const handleClientCleared = () => {
  
    };

    window.addEventListener('clientCleared', handleClientCleared);
    return () => window.removeEventListener('clientCleared', handleClientCleared);
  }, []);

  // Carregar Business Managers do Meta Ads quando conectado
  useEffect(() => {
    const loadBusinessManagers = async () => {

      if (dataSource === 'facebook') {
        try {
          setIsLoading(true);

          const businessManagers = await metaAdsService.getBusinessManagers();

          // Converter Business Managers para formato de clientes
          const facebookClients: Client[] = businessManagers.map((bm, index) => ({
            id: `fb-${bm.id}`,
            name: bm.name,
            company: 'Business Manager',
            source: 'facebook' as const,
            businessManager: bm
          }));

          // Definir Business Managers como clientes (sem "Todos os Clientes")
          setClients(facebookClients);
          
        } catch (error: any) {
          // Se não conseguiu carregar e não há dados salvos, mostrar mensagem
          if (!metaAdsService.hasStoredData('business_managers')) {
      
          }
        } finally {
          setIsLoading(false);
        }
      } else if (dataSource === 'manual') {
        // Não carregar clientes manuais - só devem vir do Meta
        setClients([]);
      } else {
    
      }
    };

    loadBusinessManagers();
  }, [dataSource]);

  // Filtrar clientes baseado no termo de busca
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClientSelect = async (client: Client) => {
    console.log('🔍 DEBUG - ClientPicker - Cliente selecionado:', client.name);
    
    // Capturar cliente anterior ANTES de trocar
    const previousClient = localStorage.getItem('currentSelectedClient');
    console.log('🔍 DEBUG - ClientPicker - Cliente anterior:', previousClient);
    
    // Limpar cache do cliente anterior especificamente
    if (previousClient && previousClient !== client.name) {
      console.log('🔍 DEBUG - ClientPicker - Limpando cache do cliente anterior:', previousClient);
      
      // Limpar TODAS as chaves de cache do metricsService
      const { metricsService } = await import('../services/metricsService');
      metricsService.clearCache();
      metricsService.clearCacheByClient(previousClient);
      
      // Limpar cache do metaAdsService também
      const { metaAdsService } = await import('../services/metaAdsService');
      metaAdsService.clearMetricsCache();
      
      // Limpar localStorage de métricas
      const keysToRemove = [
        'metaAds_metrics',
        'metaAds_insights',
        'metaAdsDataRefreshed'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🔍 DEBUG - ClientPicker - Cache limpo completamente');
    }
    
    setSelectedClient(client.name);
    setIsOpen(false);
    setSearchTerm('');
    
    localStorage.removeItem('selectedCampaignId');
    localStorage.removeItem('selectedAdSetId');
    localStorage.removeItem('selectedProduct');
    localStorage.removeItem('selectedAudience');
    
    localStorage.setItem('currentSelectedClient', client.name);

    if (client.source === 'facebook') {
      // Limpar todo o cache do Meta Ads
      metaAdsService.clearAllCache();
      
      const keysToRemove = [
        'metaAds_campaigns',
        'metaAds_adsets',
        'metaAds_business_managers',
        'metaAds_ad_accounts_by_business',
        'metaAds_metrics',
        'metaAds_insights'
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Limpar cache do metricsService completamente
      const { metricsService } = await import('../services/metricsService');
      metricsService.clearCache();
    }
    
    if (client.source === 'facebook' && client.businessManager) {
      try {
        const adAccounts = await metaAdsService.getAdAccountsByBusiness(client.businessManager.id);
        
        if (adAccounts.length > 0) {
          const activeAccount = adAccounts.find(account => account.account_status === 1) || adAccounts[0];
          metaAdsService.selectAdAccount(activeAccount);
          
          const event = new CustomEvent('clientChanged', {
            detail: {
              clientName: client.name,
              businessManager: client.businessManager,
              adAccount: activeAccount,
              source: 'facebook'
            }
          });
          window.dispatchEvent(event);
          
          // Disparar evento para carregar métricas de todas as campanhas
          const loadAllMetricsEvent = new CustomEvent('loadAllCampaignsMetrics', {
            detail: {
              clientName: client.name,
              source: 'facebook',
              adAccount: activeAccount
            }
          });
          window.dispatchEvent(loadAllMetricsEvent);
        } else {
          // Limpar a conta selecionada quando não há contas para este cliente
          metaAdsService.clearSelectedAccount();
          
          const event = new CustomEvent('clientChanged', {
            detail: {
              clientName: client.name,
              businessManager: client.businessManager,
              adAccount: null,
              source: 'facebook'
            }
          });
          window.dispatchEvent(event);
        }
      } catch (error) {
        const event = new CustomEvent('clientChanged', {
          detail: {
            clientName: client.name,
            businessManager: client.businessManager,
            adAccount: null,
            source: 'facebook'
          }
        });
        window.dispatchEvent(event);
      }
    } else {
      const event = new CustomEvent('clientChanged', {
        detail: {
          clientName: client.name,
          source: 'manual'
        }
      });
      window.dispatchEvent(event);
    }

  };

  const handleClear = async () => {
    // Capturar cliente anterior ANTES de limpar localStorage
    const previousClient = localStorage.getItem('currentSelectedClient');
    
    // Limpar dados relacionados do localStorage
    localStorage.removeItem('currentSelectedClient');
    localStorage.removeItem('selectedProduct');
    localStorage.removeItem('selectedAudience');
    localStorage.removeItem('selectedCampaignId');
    localStorage.removeItem('selectedAdSetId');
    
    // Limpar cache do Meta Ads para o cliente anterior
    if (previousClient) {
      metaAdsService.clearCacheByClient(previousClient);
    }
    
    // Limpar todo o cache de campanhas, Ad Sets e métricas
    metaAdsService.clearCacheByType('campaigns');
    metaAdsService.clearCacheByType('adsets');
    metaAdsService.clearMetricsCache(); // Método específico para limpar cache de métricas
    
    // Limpar também cache do metricsService
    const { metricsService } = await import('../services/metricsService');
    metricsService.clearCache();
    
    // Disparar evento para zerar métricas e atualizar estado no Dashboard
    const event = new CustomEvent('clientCleared', {
      detail: { clientName: 'Selecione um cliente' }
    });
    window.dispatchEvent(event);
    
    setIsOpen(false);
    setSearchTerm('');

  };

  const handleDeleteClient = (clientId: string, clientName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Previne que o clique propague para selecionar o cliente
    
    // Não permitir excluir clientes do Facebook
    const client = clients.find(c => c.id === clientId);
    if (client?.source === 'facebook') {
      alert('Não é possível excluir Business Managers do Facebook. Elas são gerenciadas pelo Meta Ads.');
      return;
    }
    
    // Confirmação antes da exclusão
    if (window.confirm(`Tem certeza que deseja excluir o cliente "${clientName}"?`)) {
      // Remove o cliente da lista
      setClients(prevClients => prevClients.filter(client => client.id !== clientId));
      
      // Se o cliente sendo excluído é o selecionado, volta para "Todos os Clientes"
      if (clientName === selectedClient) {
        setSelectedClient('Todos os Clientes');
      }
      
      // Limpa o termo de busca se estiver filtrando
      setSearchTerm('');

      // Em uma implementação real, aqui você faria a chamada para a API
      // await api.deleteClient(clientId);
    }
  };

  const getDisplayText = () => {
    if (selectedClient === 'Todos os Clientes' || selectedClient === 'Selecione um cliente') {
      return 'Selecione um cliente';
    }
    const client = clients.find(c => c.name === selectedClient);
    return client ? client.name : 'Selecione um cliente';
  };

  const getSelectedClientInfo = () => {
    return clients.find(c => c.name === selectedClient);
  };

  const getClientIcon = (client: Client) => {
    if (client.source === 'facebook') {
      return <Facebook className="w-4 h-4 text-blue-500" />;
    }
    return <Users className="w-4 h-4 text-gray-400" />;
  };

  // Verificar se o picker deve estar ativo - só ativo se Meta estiver conectado
  const isPickerActive = dataSource === 'facebook' && isFacebookConnected;
  const isClientSelected = selectedClient && selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes' && selectedClient !== '' && selectedClient !== undefined && selectedClient !== null;

  // Debug: verificar status do picker
  console.log('🔍 DEBUG - ClientPicker - Status:', {
    dataSource,
    isFacebookConnected,
    isPickerActive,
    clientsCount: clients.length,
    isLoading
  });

  return (
    <div className="relative dropdown-container" ref={pickerRef}>
      {/* Input field */}
      <div 
        className={`relative ${isPickerActive ? 'cursor-pointer dropdown-trigger' : 'cursor-not-allowed'}`}
        onClick={() => isPickerActive && setIsOpen(!isOpen)}
      >
        <Users className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        <div className={`pl-10 pr-8 py-2 rounded-lg border w-full ${
          isPickerActive 
            ? 'bg-gray-700 text-white border-gray-600 focus:border-purple-500 focus:outline-none' 
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          <span className="truncate block">
            {isPickerActive ? getDisplayText() : 'Conecte-se ao Meta primeiro'}
          </span>
        </div>
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isClientSelected ? 'text-gray-400' : 'text-gray-600'}`} />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 dropdown-indicator ${
          isPickerActive && isClientSelected
            ? 'bg-green-500 shadow-lg shadow-green-500/50' 
            : 'bg-gray-500'
        }`}></div>
      </div>

      {/* Dropdown */}
      {isOpen && isPickerActive && (
        <div className="dropdown-menu dropdown-menu-large z-dropdown-high bg-slate-900 border border-slate-700 rounded-xl shadow-2xl" style={{ zIndex: 2147483647 }}>
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
              {/* Remover botão de adicionar cliente - só deve ser feito via Meta */}
              {/* <button
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Cliente
              </button> */}
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-600 rounded-lg focus:outline-none focus:border-purple-500 text-slate-200 bg-slate-800 placeholder-slate-400"
                autoFocus
              />
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="p-4 text-center text-slate-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
              Carregando Business Managers...
            </div>
          )}

          {/* Client list */}
          <div className="dropdown-scroll">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`p-3 hover:bg-slate-800 cursor-pointer transition-colors group ${
                    client.name === selectedClient ? 'bg-slate-800/80 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getClientIcon(client)}
                        <div className="font-medium text-slate-200">{client.name}</div>
                      </div>
                      {client.company && (
                        <div className="text-sm text-slate-400">{client.company}</div>
                      )}
                      {client.source === 'facebook' && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                            Sincronizado
                          </span>
                        </div>
                      )}
                      {client.email && (
                        <div className="text-xs text-slate-500">{client.email}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {client.name === selectedClient && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}
                      {client.source === 'manual' && (
                        <button
                          onClick={(e) => handleDeleteClient(client.id, client.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all duration-200"
                          title="Excluir cliente"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente disponível'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPicker; 