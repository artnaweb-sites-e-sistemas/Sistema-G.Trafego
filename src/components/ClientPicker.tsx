import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Search, Plus, Trash2, Facebook, X } from 'lucide-react';
import { metaAdsService, BusinessManager } from '../services/metaAdsService';
import { clientService } from '../services/clientService';

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
}

const ClientPicker: React.FC<ClientPickerProps> = ({ 
  selectedClient, 
  setSelectedClient,
  dataSource 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [clients, setClients] = useState<Client[]>([
    { id: '1', name: 'Todos os Clientes', company: 'Sistema', source: 'manual' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Carregar cliente salvo do localStorage ao inicializar
  useEffect(() => {
    const savedClient = localStorage.getItem('currentSelectedClient');
    if (savedClient && savedClient !== 'Todos os Clientes') {
      setSelectedClient(savedClient);
      console.log('ClientPicker: Cliente restaurado do localStorage:', savedClient);
    }
  }, [setSelectedClient]);

  // Listener para reagir quando cliente for limpo pelo Dashboard
  useEffect(() => {
    const handleClientCleared = () => {
      console.log('ClientPicker: Recebeu evento clientCleared, mantendo estado limpo');
    };

    window.addEventListener('clientCleared', handleClientCleared);
    return () => window.removeEventListener('clientCleared', handleClientCleared);
  }, []);

  // Carregar Business Managers do Meta Ads quando conectado
  useEffect(() => {
    const loadBusinessManagers = async () => {
      console.log('ClientPicker: dataSource =', dataSource);
      console.log('ClientPicker: metaAdsService.isLoggedIn() =', metaAdsService.isLoggedIn());
      console.log('ClientPicker: metaAdsService.hasStoredData() =', metaAdsService.hasStoredData('business_managers'));
      
      if (dataSource === 'facebook') {
        try {
          setIsLoading(true);
          console.log('Carregando Business Managers...');
          
          const businessManagers = await metaAdsService.getBusinessManagers();
          console.log('Business Managers encontrados:', businessManagers);
          
          // Converter Business Managers para formato de clientes
          const facebookClients: Client[] = businessManagers.map((bm, index) => ({
            id: `fb-${bm.id}`,
            name: bm.name,
            company: `Business Manager (${bm.account_type})`,
            source: 'facebook' as const,
            businessManager: bm
          }));
          
          console.log('Clientes do Facebook criados:', facebookClients);
          
          // Filtrar clientes removidos e definir Business Managers como clientes
          const filteredClients = clientService.filterRemovedClients(facebookClients);
          setClients(filteredClients);
          
        } catch (error: any) {
          console.error('Erro ao carregar Business Managers:', error.message);
          // Se não conseguiu carregar e não há dados salvos, mostrar mensagem
          if (!metaAdsService.hasStoredData('business_managers')) {
            console.log('Nenhum dado do Meta Ads disponível offline');
          }
        } finally {
          setIsLoading(false);
        }
      } else if (dataSource === 'manual') {
        console.log('Carregando clientes manuais...');
        // Carregar clientes manuais (sem "Todos os Clientes")
        setClients([
          { id: '2', name: 'João Silva', email: 'joao@empresa.com', company: 'Empresa ABC', source: 'manual' },
          { id: '3', name: 'Maria Santos', email: 'maria@startup.com', company: 'Startup XYZ', source: 'manual' },
          { id: '4', name: 'Pedro Costa', email: 'pedro@consultoria.com', company: 'Consultoria 123', source: 'manual' },
          { id: '5', name: 'Ana Oliveira', email: 'ana@tech.com', company: 'Tech Solutions', source: 'manual' },
          { id: '6', name: 'Carlos Ferreira', email: 'carlos@digital.com', company: 'Digital Marketing', source: 'manual' },
          { id: '7', name: 'Lucia Mendes', email: 'lucia@ecommerce.com', company: 'E-commerce Plus', source: 'manual' },
          { id: '8', name: 'Roberto Lima', email: 'roberto@agencia.com', company: 'Agência Criativa', source: 'manual' },
        ]);
      } else {
        console.log('DataSource não é facebook ou usuário não está logado');
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

  const handleClientSelect = (client: Client) => {
    console.log('Cliente selecionado:', client);
    setSelectedClient(client.name);
    setIsOpen(false);
    setSearchTerm('');
    
    // Salvar cliente atual no localStorage para cache
    localStorage.setItem('currentSelectedClient', client.name);
    
    // Limpar dados de campanhas e Ad Sets anteriores do localStorage apenas se for cliente diferente
    const previousClient = localStorage.getItem('currentSelectedClient');
    if (previousClient && previousClient !== client.name) {
      localStorage.removeItem('selectedCampaignId');
      localStorage.removeItem('selectedAdSetId');
      localStorage.removeItem('selectedProduct');
      localStorage.removeItem('selectedAudience');
    }
    
    // Invalidar cache do Meta Ads para forçar recarregamento dos dados
    if (client.source === 'facebook') {
      console.log('Invalidando cache do Meta Ads para novo cliente...');
      
      // Limpar cache de clientes anteriores
      const previousClient = localStorage.getItem('currentSelectedClient');
      if (previousClient && previousClient !== client.name) {
        metaAdsService.clearCacheByClient(previousClient);
      }
      
      // Limpar todo o cache de campanhas e Ad Sets para garantir dados frescos
      metaAdsService.clearCacheByType('campaigns');
      metaAdsService.clearCacheByType('adsets');
      
      // Limpar também localStorage relacionado
      localStorage.removeItem('selectedProduct');
      localStorage.removeItem('selectedAudience');
      localStorage.removeItem('selectedCampaignId');
      localStorage.removeItem('selectedAdSetId');
      
      // Invalidar cache de campanhas e Ad Sets para o novo cliente
      metaAdsService.invalidateCache('campaigns');
      metaAdsService.invalidateCache('adsets');
      
      console.log('Cache e localStorage limpos para novo cliente:', client.name);
    }
    
    // Se for uma Business Manager do Facebook, carregar métricas específicas
    if (client.source === 'facebook' && client.businessManager) {
      console.log(`Business Manager selecionada: ${client.businessManager.name} (${client.businessManager.id})`);
      
      // Selecionar automaticamente uma conta de anúncios da Business Manager
      const selectAdAccountForBusiness = async () => {
        try {
          console.log('Selecionando conta de anúncios para Business Manager:', client.businessManager!.id);
          const adAccounts = await metaAdsService.getAdAccountsByBusiness(client.businessManager!.id);
          
          if (adAccounts.length > 0) {
            // Filtrar contas que pertencem especificamente a este Business Manager
            const businessAccounts = adAccounts.filter(account => 
              account.business_id === client.businessManager!.id
            );
            
            // Selecionar a primeira conta ativa da Business Manager específica
            const activeAccount = businessAccounts.find(account => account.account_status === 1) || businessAccounts[0] || adAccounts[0];
            
            metaAdsService.selectAdAccount(activeAccount);
            console.log('Conta de anúncios selecionada para', client.name + ':', activeAccount.name);
            console.log('Business ID da conta:', activeAccount.business_id);
          } else {
            console.warn('Nenhuma conta de anúncios encontrada para esta Business Manager');
          }
        } catch (error) {
          console.error('Erro ao selecionar conta de anúncios:', error);
        }
      };
      
      selectAdAccountForBusiness();
      
      // Disparar evento customizado para notificar outros componentes
      const event = new CustomEvent('businessManagerSelected', {
        detail: {
          businessManager: client.businessManager,
          clientName: client.name
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
    
    console.log('ClientPicker: Seleção de cliente limpa - cliente anterior:', previousClient);
  };

  const handleDeleteClient = async (clientId: string, clientName: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Previne que o clique propague para selecionar o cliente
    
    const client = clients.find(c => c.id === clientId);
    
    // Confirmação antes da exclusão
    const confirmMessage = client?.source === 'facebook' 
      ? `Tem certeza que deseja remover "${clientName}" do dashboard? (Os dados permanecerão no Facebook e serão recriados ao reconectar)`
      : `Tem certeza que deseja excluir o cliente "${clientName}"?`;
    
    if (window.confirm(confirmMessage)) {
      try {
        // Se o cliente sendo excluído é o selecionado, limpar seleção
        if (clientName === selectedClient) {
          // Limpar dados relacionados do localStorage
          localStorage.removeItem('currentSelectedClient');
          localStorage.removeItem('selectedProduct');
          localStorage.removeItem('selectedAudience');
          localStorage.removeItem('selectedCampaignId');
          localStorage.removeItem('selectedAdSetId');
          
          // Limpar cache do Meta Ads para o cliente
          if (client?.source === 'facebook') {
            metaAdsService.clearCacheByClient(clientName);
            metaAdsService.clearCacheByType('campaigns');
            metaAdsService.clearCacheByType('adsets');
            metaAdsService.clearMetricsCache();
            
            // Limpar também cache do metricsService
            const { metricsService } = await import('../services/metricsService');
            metricsService.clearCache();
          }
          
          // Disparar evento para zerar métricas
          const event = new CustomEvent('clientCleared', {
            detail: { clientName: 'Selecione um cliente' }
          });
          window.dispatchEvent(event);
          
          setSelectedClient('Selecione um cliente');
        }
        
        // Registrar cliente como removido no clientService
        if (client && client.source) {
          clientService.removeClient({
            id: client.id,
            name: client.name,
            source: client.source,
            businessManager: client.businessManager
          });
        }
        
        // Remove o cliente da lista
        setClients(prevClients => prevClients.filter(client => client.id !== clientId));
        
        // Limpa o termo de busca se estiver filtrando
        setSearchTerm('');
        
        console.log(`Cliente ${clientName} (ID: ${clientId}) foi removido do dashboard com sucesso!`);
        
        // Em uma implementação real, aqui você faria a chamada para a API
        // await api.deleteClient(clientId);
        
      } catch (error) {
        console.error('Erro ao remover cliente:', error);
        alert('Erro ao remover cliente. Tente novamente.');
      }
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

  return (
    <div className="relative" ref={pickerRef}>
      {/* Input field */}
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <div className="bg-gray-700 text-white pl-10 pr-8 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none w-[220px]">
          <span className="truncate block">{getDisplayText()}</span>
        </div>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        
        {/* Botão de deletar cliente selecionado */}
        {selectedClient !== 'Selecione um cliente' && selectedClient !== 'Todos os Clientes' && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              const selectedClientInfo = getSelectedClientInfo();
              if (selectedClientInfo) {
                handleDeleteClient(selectedClientInfo.id, selectedClientInfo.name, e);
              }
            }}
            className="absolute right-8 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-200"
            title={getSelectedClientInfo()?.source === 'facebook' ? "Remover do dashboard" : "Excluir cliente"}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          selectedClient === 'Todos os Clientes' || selectedClient === 'Selecione um cliente'
            ? 'bg-gray-500' 
            : 'bg-green-500 shadow-lg shadow-green-500/50'
        }`}></div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[300px] max-h-[400px] overflow-hidden">
          {/* Action buttons - Fixed at top */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between p-3">
              <button
                onClick={handleClear}
                className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-all duration-200 ease-in-out"
              >
                <X className="w-4 h-4 mr-1" />
                Limpar
              </button>
              <button
                className="flex items-center px-3 py-1.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-1" />
                Novo Cliente
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900"
                autoFocus
              />
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="p-4 text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
              Carregando Business Managers...
            </div>
          )}

          {/* Client list */}
          <div className="max-h-[250px] overflow-y-auto">
            {filteredClients.length > 0 ? (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors group ${
                    client.name === selectedClient ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getClientIcon(client)}
                        <div className="font-medium text-gray-900">{client.name}</div>
                        {client.source === 'facebook' && (
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                            Facebook
                          </span>
                        )}
                      </div>
                      {client.company && (
                        <div className="text-sm text-gray-500">{client.company}</div>
                      )}
                      {client.email && (
                        <div className="text-xs text-gray-400">{client.email}</div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {client.name === selectedClient && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}
                      {client.name !== 'Todos os Clientes' && (
                        <button
                          onClick={(e) => handleDeleteClient(client.id, client.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                          title={client.source === 'facebook' ? "Remover do dashboard" : "Excluir cliente"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                Nenhum cliente encontrado
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
};

export default ClientPicker; 