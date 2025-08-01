import React, { useState, useRef, useEffect } from 'react';
import { Package, ChevronDown, Search, Plus, Trash2, Facebook, X } from 'lucide-react';
import { metaAdsService } from '../services/metaAdsService';

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
}

const ProductPicker: React.FC<ProductPickerProps> = ({ 
  selectedProduct, 
  setSelectedProduct, 
  selectedClient,
  dataSource,
  selectedMonth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Todos os Produtos', clientId: 'all' },
    { id: '2', name: 'Pacote Básico', description: 'Serviços essenciais', price: 500, category: 'Marketing', clientId: '2', source: 'manual' },
    { id: '3', name: 'Pacote Premium', description: 'Serviços completos', price: 1200, category: 'Marketing', clientId: '2', source: 'manual' },
    { id: '4', name: 'Consultoria Mensal', description: 'Acompanhamento especializado', price: 800, category: 'Consultoria', clientId: '3', source: 'manual' },
    { id: '5', name: 'Gestão de Redes Sociais', description: 'Criação e gestão de conteúdo', price: 600, category: 'Social Media', clientId: '3', source: 'manual' },
    { id: '6', name: 'Campanha Google Ads', description: 'Gestão de campanhas', price: 900, category: 'Publicidade', clientId: '4', source: 'manual' },
    { id: '7', name: 'Website Institucional', description: 'Desenvolvimento de site', price: 2500, category: 'Desenvolvimento', clientId: '5', source: 'manual' },
    { id: '8', name: 'E-commerce Completo', description: 'Loja virtual completa', price: 3500, category: 'Desenvolvimento', clientId: '6', source: 'manual' },
    { id: '9', name: 'SEO Básico', description: 'Otimização para buscadores', price: 400, category: 'SEO', clientId: '7', source: 'manual' },
    { id: '10', name: 'SEO Avançado', description: 'SEO completo e monitoramento', price: 800, category: 'SEO', clientId: '8', source: 'manual' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

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

  // Carregar campanhas do Meta Ads
  const loadMetaAdsCampaigns = async () => {
    console.log('ProductPicker: loadMetaAdsCampaigns chamado');
    console.log('ProductPicker: dataSource =', dataSource);
    console.log('ProductPicker: isLoggedIn =', metaAdsService.isLoggedIn());
    console.log('ProductPicker: selectedClient =', selectedClient);
    
    if (dataSource === 'facebook' && selectedClient && selectedClient !== 'Todos os Clientes') {
      try {
        setIsLoading(true);
        console.log('ProductPicker: Carregando campanhas do Meta Ads para BM:', selectedClient);
        console.log('ProductPicker: Ad Account selecionada:', metaAdsService.getSelectedAccount()?.name);
        
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
        console.log('ProductPicker: Período selecionado:', { startDate, endDate });
        
        const campaignsData = await metaAdsService.getCampaigns(startDate, endDate);
        console.log('ProductPicker: Campanhas encontradas:', campaignsData);
        
        // Filtrar apenas campanhas ativas
        const activeCampaigns = campaignsData.filter(campaign => 
          campaign.status === 'ACTIVE' || campaign.status === 'PAUSED'
        );
        
        console.log('ProductPicker: Campanhas ativas:', activeCampaigns);
        
        // Converter campanhas para formato de produtos
        const facebookProducts: Product[] = activeCampaigns.map((campaign, index) => ({
          id: `fb-campaign-${campaign.id}`,
          name: campaign.name,
          description: `Campanha ${campaign.status === 'ACTIVE' ? 'Ativa' : 'Pausada'} - ${campaign.objective || 'Sem objetivo definido'}`,
          category: 'Meta Ads',
          clientId: selectedClient,
          source: 'facebook' as const,
          campaign: campaign
        }));
        
        console.log('ProductPicker: Produtos do Facebook criados:', facebookProducts);
        
        // Se não há campanhas, mostrar apenas "Todos os Produtos"
        if (facebookProducts.length === 0) {
          console.log('ProductPicker: Nenhuma campanha encontrada para este cliente');
          
          // Forçar reset completo
          setProducts([
            { id: '1', name: 'Todos os Produtos', clientId: 'all' }
          ]);
          setSelectedProduct('Todos os Produtos');
          
          // Limpar localStorage relacionado
          localStorage.removeItem('selectedProduct');
          localStorage.removeItem('selectedAudience');
          localStorage.removeItem('selectedCampaignId');
          localStorage.removeItem('selectedAdSetId');
          
          // Disparar evento para zerar métricas
          const event = new CustomEvent('noProductsFound', {
            detail: { clientName: selectedClient }
          });
          window.dispatchEvent(event);
          
          console.log('ProductPicker: Reset completo realizado - nenhuma campanha encontrada');
        } else {
          // Se há campanhas, adicionar "Todos os Produtos" + campanhas
          const allProducts = [
            { id: '1', name: 'Todos os Produtos', clientId: 'all' },
            ...facebookProducts
          ];
          
          setProducts(allProducts);
          
          // Se não há produto selecionado, selecionar "Todos os Produtos"
          if (selectedProduct === 'Todos os Produtos' || !selectedProduct) {
            setSelectedProduct('Todos os Produtos');
          }
        }
        
      } catch (error: any) {
        console.error('Erro ao carregar campanhas do Meta Ads:', error.message);
        // Em caso de erro, mostrar apenas "Todos os Produtos"
        setProducts([
          { id: '1', name: 'Todos os Produtos', clientId: 'all' }
        ]);
      } finally {
        setIsLoading(false);
      }
    } else if (dataSource === 'manual') {
      console.log('ProductPicker: Carregando produtos manuais...');
      setProducts([
        { id: '1', name: 'Todos os Produtos', clientId: 'all' },
        { id: '2', name: 'Pacote Básico', description: 'Serviços essenciais', price: 500, category: 'Marketing', clientId: '2', source: 'manual' },
        { id: '3', name: 'Pacote Premium', description: 'Serviços completos', price: 1200, category: 'Marketing', clientId: '2', source: 'manual' },
        { id: '4', name: 'Consultoria Mensal', description: 'Acompanhamento especializado', price: 800, category: 'Consultoria', clientId: '3', source: 'manual' },
        { id: '5', name: 'Gestão de Redes Sociais', description: 'Criação e gestão de conteúdo', price: 600, category: 'Social Media', clientId: '3', source: 'manual' },
        { id: '6', name: 'Campanha Google Ads', description: 'Gestão de campanhas', price: 900, category: 'Publicidade', clientId: '4', source: 'manual' },
        { id: '7', name: 'Website Institucional', description: 'Desenvolvimento de site', price: 2500, category: 'Desenvolvimento', clientId: '5', source: 'manual' },
        { id: '8', name: 'E-commerce Completo', description: 'Loja virtual completa', price: 3500, category: 'Desenvolvimento', clientId: '6', source: 'manual' },
        { id: '9', name: 'SEO Básico', description: 'Otimização para buscadores', price: 400, category: 'SEO', clientId: '7', source: 'manual' },
        { id: '10', name: 'SEO Avançado', description: 'SEO completo e monitoramento', price: 800, category: 'SEO', clientId: '8', source: 'manual' },
      ]);
    } else {
      console.log('ProductPicker: DataSource não é facebook ou usuário não está logado');
      // Mostrar apenas "Todos os Produtos" quando não há fonte de dados
      setProducts([
        { id: '1', name: 'Todos os Produtos', clientId: 'all' }
      ]);
    }
  };

  // Carregar produto salvo do localStorage ao inicializar
  useEffect(() => {
    const savedProduct = localStorage.getItem('selectedProduct');
    const savedClient = localStorage.getItem('currentSelectedClient');
    
    // Só restaurar produto se há cliente selecionado
    if (savedProduct && savedProduct !== 'Todos os Produtos' && savedClient && savedClient !== 'Todos os Clientes') {
      setSelectedProduct(savedProduct);
      console.log('ProductPicker: Produto restaurado do localStorage:', savedProduct);
    }
  }, []);

  // Carregar produtos quando dataSource, selectedClient ou selectedMonth mudar
  useEffect(() => {
    console.log('ProductPicker: Cliente mudou para:', selectedClient);
    
    // Só carregar se há cliente selecionado
    if (selectedClient && selectedClient !== 'Todos os Clientes') {
      // Pequeno delay para garantir que o cache seja limpo
      const timer = setTimeout(() => {
        loadMetaAdsCampaigns();
      }, 100);
      
      return () => clearTimeout(timer);
    } else {
      // Resetar produtos quando não há cliente selecionado
      setProducts([{ id: '1', name: 'Todos os Produtos', clientId: 'all' }]);
      setSelectedProduct('Todos os Produtos');
    }
  }, [dataSource, selectedClient, selectedMonth]);

  // Filtrar produtos baseado no termo de busca e cliente selecionado
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Para produtos do Facebook, verificar se pertencem ao cliente selecionado
    if (dataSource === 'facebook' && product.source === 'facebook') {
      const matchesClient = selectedClient === 'Todos os Clientes' || 
                           product.clientId === selectedClient;
      return matchesSearch && matchesClient;
    }
    
    // Para produtos manuais, usar a lógica de mapeamento
    const matchesClient = selectedClient === 'Todos os Clientes' || 
                         product.clientId === 'all' || 
                         product.clientId === getClientIdFromName(selectedClient);
    
    return matchesSearch && matchesClient;
  });

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

  // Reset selected product when client changes (only if no saved product)
  useEffect(() => {
    const savedProduct = localStorage.getItem('selectedProduct');
    if (!savedProduct || savedProduct === 'Todos os Produtos') {
      setSelectedProduct('Todos os Produtos');
    }
  }, [selectedClient, setSelectedProduct]);

  const handleProductSelect = (product: Product) => {
    console.log('Produto selecionado:', product);
    setSelectedProduct(product.name);
    setIsOpen(false);
    setSearchTerm('');
    
    // Salvar produto selecionado no localStorage
    localStorage.setItem('selectedProduct', product.name);
    
    // Disparar evento customizado se for uma campanha do Facebook
    if (product.source === 'facebook' && product.campaign) {
      console.log(`Campanha selecionada: ${product.campaign.name} (${product.campaign.id})`);
      
      const event = new CustomEvent('campaignSelected', {
        detail: {
          campaign: product.campaign,
          productName: product.name,
          campaignId: product.campaign.id
        }
      });
      window.dispatchEvent(event);
    }
  };

  const handleClear = () => {
    // Limpar a seleção e voltar para "Todos os Produtos"
    setSelectedProduct('Todos os Produtos');
    
    // Limpar dados relacionados do localStorage
    localStorage.removeItem('selectedProduct');
    localStorage.removeItem('selectedAudience');
    localStorage.removeItem('selectedAdSetId');
    
    // Invalidar cache de ad sets
    metaAdsService.invalidateCache('adsets');
    
    setIsOpen(false);
    setSearchTerm('');
    
    console.log('ProductPicker: Seleção de produto limpa');
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
        setSelectedProduct('Todos os Produtos');
      }
      
      setSearchTerm('');
      console.log(`Produto ${productName} (ID: ${productId}) foi excluído com sucesso!`);
    }
  };

  const getDisplayText = () => {
    if (selectedProduct === 'Todos os Produtos') {
      return 'Todos os Produtos';
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

  // Verificar se o picker deve estar ativo
  const isPickerActive = selectedClient && selectedClient !== 'Todos os Clientes' && selectedClient !== 'Selecione um cliente';

  return (
    <div className="relative" ref={pickerRef}>
      {/* Input field */}
      <div 
        className={`relative ${isPickerActive ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        onClick={() => isPickerActive && setIsOpen(!isOpen)}
      >
        <Package className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        <div className={`pl-10 pr-8 py-2 rounded-lg border w-[220px] ${
          isPickerActive 
            ? 'bg-gray-700 text-white border-gray-600 focus:border-purple-500 focus:outline-none' 
            : 'bg-gray-800 text-gray-500 border-gray-700'
        }`}>
          <span className="truncate block">
            {isPickerActive ? getDisplayText() : 'Selecione um cliente primeiro'}
          </span>
        </div>
        <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isPickerActive ? 'text-gray-400' : 'text-gray-600'}`} />
        
        {/* Indicador de Status */}
        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-900 transition-all duration-200 ${
          selectedProduct === 'Todos os Produtos' 
            ? 'bg-gray-500' 
            : 'bg-green-500 shadow-lg shadow-green-500/50'
        }`}></div>
      </div>

      {/* Dropdown */}
      {isOpen && isPickerActive && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[350px] max-h-[400px] overflow-hidden">
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
                Novo Produto
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900"
                autoFocus
              />
            </div>
          </div>

          {/* Product list */}
          <div className="max-h-[250px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                Carregando campanhas...
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleProductSelect(product)}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors group ${
                    product.name === selectedProduct ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getProductIcon(product)}
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.source === 'facebook' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Meta Ads
                          </span>
                        )}
                      </div>
                      {product.description && (
                        <div className="text-sm text-gray-500 ml-6">{product.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1 ml-6">
                        {product.category && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {product.category}
                          </span>
                        )}
                        {product.price && (
                          <span className="text-xs font-medium text-green-600">
                            {formatPrice(product.price)}
                          </span>
                        )}
                        {product.source === 'facebook' && product.campaign && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            product.campaign.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
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
                      {product.name !== 'Todos os Produtos' && product.source !== 'facebook' && (
                        <button
                          onClick={(e) => handleDeleteProduct(product.id, product.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
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
              <div className="p-4 text-center text-gray-500">
                {dataSource === 'facebook' && metaAdsService.isLoggedIn()
                  ? 'Nenhuma campanha ativa encontrada para este período'
                  : selectedClient === 'Todos os Clientes' 
                    ? 'Selecione um cliente para ver os produtos'
                    : 'Nenhum produto encontrado'
                }
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between p-4">
              <button
                onClick={handleClear}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-md transition-all duration-200 ease-in-out"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Limpar Seleção
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-px h-6 bg-gray-300"></div>
                <button
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Produto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPicker; 