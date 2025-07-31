import React, { useState, useRef, useEffect } from 'react';
import { Package, ChevronDown, Search, Plus, Trash2 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  clientId: string; // Vinculado ao cliente
}

interface ProductPickerProps {
  selectedProduct: string;
  setSelectedProduct: (product: string) => void;
  selectedClient: string; // Cliente selecionado
}

const ProductPicker: React.FC<ProductPickerProps> = ({ 
  selectedProduct, 
  setSelectedProduct, 
  selectedClient 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState<Product[]>([
    { id: '1', name: 'Todos os Produtos', clientId: 'all' },
    { id: '2', name: 'Pacote Básico', description: 'Serviços essenciais', price: 500, category: 'Marketing', clientId: '2' },
    { id: '3', name: 'Pacote Premium', description: 'Serviços completos', price: 1200, category: 'Marketing', clientId: '2' },
    { id: '4', name: 'Consultoria Mensal', description: 'Acompanhamento especializado', price: 800, category: 'Consultoria', clientId: '3' },
    { id: '5', name: 'Gestão de Redes Sociais', description: 'Criação e gestão de conteúdo', price: 600, category: 'Social Media', clientId: '3' },
    { id: '6', name: 'Campanha Google Ads', description: 'Gestão de campanhas', price: 900, category: 'Publicidade', clientId: '4' },
    { id: '7', name: 'Website Institucional', description: 'Desenvolvimento de site', price: 2500, category: 'Desenvolvimento', clientId: '5' },
    { id: '8', name: 'E-commerce Completo', description: 'Loja virtual completa', price: 3500, category: 'Desenvolvimento', clientId: '6' },
    { id: '9', name: 'SEO Básico', description: 'Otimização para buscadores', price: 400, category: 'SEO', clientId: '7' },
    { id: '10', name: 'SEO Avançado', description: 'SEO completo e monitoramento', price: 800, category: 'SEO', clientId: '8' },
  ]);
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

  // Filtrar produtos baseado no termo de busca e cliente selecionado
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.category?.toLowerCase().includes(searchTerm.toLowerCase());
    
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

  // Reset selected product when client changes
  useEffect(() => {
    setSelectedProduct('Todos os Produtos');
  }, [selectedClient, setSelectedProduct]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product.name);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedProduct('Todos os Produtos');
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleDeleteProduct = (productId: string, productName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
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

  return (
    <div className="relative" ref={pickerRef}>
      {/* Input field */}
      <div 
        className="relative cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <div className="bg-gray-700 text-white pl-10 pr-8 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none min-w-[220px]">
          <span className="truncate block">{getDisplayText()}</span>
        </div>
        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[350px] max-h-[400px] overflow-hidden">
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
          <div className="max-h-[300px] overflow-y-auto">
            {filteredProducts.length > 0 ? (
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
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {product.description && (
                        <div className="text-sm text-gray-500">{product.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
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
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {product.name === selectedProduct && (
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      )}
                      {product.name !== 'Todos os Produtos' && (
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
                {selectedClient === 'Todos os Clientes' 
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