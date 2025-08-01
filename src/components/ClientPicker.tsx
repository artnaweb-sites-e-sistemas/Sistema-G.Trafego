import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Search, Plus, Trash2, Facebook } from 'lucide-react';
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

  // Carregar Business Managers do Meta Ads quando conectado
  useEffect(() => {
    const loadBusinessManagers = async () => {
      console.log('ClientPicker: dataSource =', dataSource);
      console.log('ClientPicker: metaAdsService.isLoggedIn() =', metaAdsService.isLoggedIn());
      
      if (dataSource === 'facebook' && metaAdsService.isLoggedIn()) {
        try {
          setIsLoading(true);
          console.log('Carregando Business Managers do Meta Ads...');
          
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
          
          // Definir Business Managers como clientes (sem "Todos os Clientes")
          setClients(facebookClients);
          
          // Se não há cliente selecionado, selecionar o primeiro automaticamente
          if (selectedClient === 'Todos os Clientes' && facebookClients.length > 0) {
            setSelectedClient(facebookClients[0].name);
          }
          
        } catch (error: any) {
          console.error('Erro ao carregar Business Managers:', error.message);
          // Manter clientes manuais em caso de erro
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
  }, [dataSource, selectedClient]);

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
    
    // Se for uma Business Manager do Facebook, carregar métricas específicas
    if (client.source === 'facebook' && client.businessManager) {
      console.log(`Business Manager selecionada: ${client.businessManager.name} (${client.businessManager.id})`);
      
      // Disparar evento customizado para notificar outros componentes
      const event = new CustomEvent('businessManagerSelected', {
        detail: {
          businessManager: client.businessManager,
          clientName: client.name
        }
      });
      window.dispatchEvent(event);
      
      // Aqui você pode adicionar lógica adicional para carregar contas de anúncios
      // e métricas específicas da Business Manager
    }
  };

  const handleClear = () => {
    // Se há clientes disponíveis, selecionar o primeiro
    if (clients.length > 0) {
      setSelectedClient(clients[0].name);
    }
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
      
      console.log(`Cliente ${clientName} (ID: ${clientId}) foi excluído com sucesso!`);
      
      // Em uma implementação real, aqui você faria a chamada para a API
      // await api.deleteClient(clientId);
    }
  };

  const getDisplayText = () => {
    if (selectedClient === 'Todos os Clientes') {
      return 'Todos os Clientes';
    }
    const client = clients.find(c => c.name === selectedClient);
    return client ? client.name : 'Selecionar Cliente';
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
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          selectedClient === 'Todos os Clientes' 
            ? 'bg-gray-500' 
            : 'bg-green-500 shadow-lg shadow-green-500/50'
        }`}></div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[300px] max-h-[400px] overflow-hidden">
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
          <div className="max-h-[300px] overflow-y-auto">
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
                      {client.name !== 'Todos os Clientes' && client.source !== 'facebook' && (
                        <button
                          onClick={(e) => handleDeleteClient(client.id, client.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
                          title="Excluir cliente"
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

          {/* Action buttons */}
          <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-end p-4">
              <button
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientPicker; 