import React, { useState, useRef, useEffect } from 'react';
import { Users, ChevronDown, Search, Plus, Trash2, Facebook } from 'lucide-react';
import { metaAdsService } from '../services/metaAdsService';

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
}

const AudiencePicker: React.FC<AudiencePickerProps> = ({ 
  selectedAudience, 
  setSelectedAudience, 
  selectedProduct,
  selectedClient,
  dataSource,
  selectedMonth
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [audiences, setAudiences] = useState<Audience[]>([
    { id: '1', name: 'Todos os Públicos', productId: 'all', clientId: 'all' },
    { id: '2', name: 'Executivos 30-50', description: 'Profissionais de alto nível', ageRange: '30-50', interests: ['Negócios', 'Tecnologia'], location: 'São Paulo', size: 15000, productId: '2', clientId: '2', source: 'manual' },
    { id: '3', name: 'Empreendedores', description: 'Donos de pequenas empresas', ageRange: '25-45', interests: ['Empreendedorismo', 'Marketing'], location: 'Brasil', size: 25000, productId: '3', clientId: '2', source: 'manual' },
    { id: '4', name: 'Startups', description: 'Empresas em crescimento', ageRange: '20-40', interests: ['Inovação', 'Tecnologia'], location: 'São Paulo', size: 8000, productId: '4', clientId: '3', source: 'manual' },
    { id: '5', name: 'Consultores', description: 'Profissionais independentes', ageRange: '28-55', interests: ['Consultoria', 'Estratégia'], location: 'Brasil', size: 12000, productId: '5', clientId: '3', source: 'manual' },
    { id: '6', name: 'Agencias de Marketing', description: 'Agencias digitais', ageRange: '25-45', interests: ['Marketing Digital', 'Publicidade'], location: 'São Paulo', size: 5000, productId: '6', clientId: '4', source: 'manual' },
    { id: '7', name: 'E-commerce', description: 'Lojas online', ageRange: '25-50', interests: ['E-commerce', 'Vendas'], location: 'Brasil', size: 18000, productId: '7', clientId: '5', source: 'manual' },
    { id: '8', name: 'Tech Companies', description: 'Empresas de tecnologia', ageRange: '22-45', interests: ['Tecnologia', 'Inovação'], location: 'São Paulo', size: 10000, productId: '8', clientId: '6', source: 'manual' },
    { id: '9', name: 'Profissionais Liberais', description: 'Advogados, médicos, etc.', ageRange: '30-60', interests: ['Profissional', 'Serviços'], location: 'Brasil', size: 30000, productId: '9', clientId: '7', source: 'manual' },
    { id: '10', name: 'Agencias Criativas', description: 'Design e comunicação', ageRange: '23-40', interests: ['Design', 'Criatividade'], location: 'São Paulo', size: 7000, productId: '10', clientId: '8', source: 'manual' },
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
    if (dataSource === 'facebook' && metaAdsService.isLoggedIn() && selectedProduct && selectedProduct !== 'Todos os Produtos') {
      try {
        setIsLoading(true);
        console.log('AudiencePicker: Carregando Ad Sets do Meta Ads para campanha:', selectedProduct);
        
        // Obter ID da campanha do localStorage
        const campaignId = localStorage.getItem('selectedCampaignId');
        if (!campaignId) {
          console.log('AudiencePicker: Nenhuma campanha selecionada');
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
        console.log('AudiencePicker: Período selecionado:', { startDate, endDate });
        
        const adSetsData = await metaAdsService.getAdSets(campaignId, startDate, endDate);
        console.log('AudiencePicker: Ad Sets encontrados:', adSetsData);
        
        // Filtrar apenas Ad Sets ativos
        const activeAdSets = adSetsData.filter(adSet => 
          adSet.status === 'ACTIVE' || adSet.status === 'PAUSED'
        );
        
        console.log('AudiencePicker: Ad Sets ativos:', activeAdSets);
        
        // Converter Ad Sets para formato de públicos
        const facebookAudiences: Audience[] = activeAdSets.map((adSet, index) => ({
          id: `fb-adset-${adSet.id}`,
          name: adSet.name,
          description: `Conjunto de anúncios ${adSet.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}`,
          ageRange: '18-65',
          location: 'Brasil',
          size: 10000, // Tamanho estimado do público
          productId: selectedProduct,
          clientId: selectedClient,
          source: 'facebook' as const,
          adSet: adSet
        }));
        
        console.log('AudiencePicker: Públicos do Facebook criados:', facebookAudiences);
        
        // Manter "Todos os Públicos" e adicionar Ad Sets do Facebook
        const allAudiences = [
          { id: '1', name: 'Todos os Públicos', productId: 'all', clientId: 'all' },
          ...facebookAudiences
        ];
        
        setAudiences(allAudiences);
        
        // Se não há público selecionado, selecionar "Todos os Públicos"
        if (selectedAudience === 'Todos os Públicos' || !selectedAudience) {
          setSelectedAudience('Todos os Públicos');
        }
        
      } catch (error: any) {
        console.error('Erro ao carregar Ad Sets do Meta Ads:', error.message);
        // Em caso de erro, manter públicos manuais
        setAudiences([
          { id: '1', name: 'Todos os Públicos', productId: 'all', clientId: 'all' },
          { id: '2', name: 'Executivos 30-50', description: 'Profissionais de alto nível', ageRange: '30-50', interests: ['Negócios', 'Tecnologia'], location: 'São Paulo', size: 15000, productId: '2', clientId: '2', source: 'manual' },
          { id: '3', name: 'Empreendedores', description: 'Donos de pequenas empresas', ageRange: '25-45', interests: ['Empreendedorismo', 'Marketing'], location: 'Brasil', size: 25000, productId: '3', clientId: '2', source: 'manual' },
          { id: '4', name: 'Startups', description: 'Empresas em crescimento', ageRange: '20-40', interests: ['Inovação', 'Tecnologia'], location: 'São Paulo', size: 8000, productId: '4', clientId: '3', source: 'manual' },
          { id: '5', name: 'Consultores', description: 'Profissionais independentes', ageRange: '28-55', interests: ['Consultoria', 'Estratégia'], location: 'Brasil', size: 12000, productId: '5', clientId: '3', source: 'manual' },
          { id: '6', name: 'Agencias de Marketing', description: 'Agencias digitais', ageRange: '25-45', interests: ['Marketing Digital', 'Publicidade'], location: 'São Paulo', size: 5000, productId: '6', clientId: '4', source: 'manual' },
          { id: '7', name: 'E-commerce', description: 'Lojas online', ageRange: '25-50', interests: ['E-commerce', 'Vendas'], location: 'Brasil', size: 18000, productId: '7', clientId: '5', source: 'manual' },
          { id: '8', name: 'Tech Companies', description: 'Empresas de tecnologia', ageRange: '22-45', interests: ['Tecnologia', 'Inovação'], location: 'São Paulo', size: 10000, productId: '8', clientId: '6', source: 'manual' },
          { id: '9', name: 'Profissionais Liberais', description: 'Advogados, médicos, etc.', ageRange: '30-60', interests: ['Profissional', 'Serviços'], location: 'Brasil', size: 30000, productId: '9', clientId: '7', source: 'manual' },
          { id: '10', name: 'Agencias Criativas', description: 'Design e comunicação', ageRange: '23-40', interests: ['Design', 'Criatividade'], location: 'São Paulo', size: 7000, productId: '10', clientId: '8', source: 'manual' },
        ]);
      } finally {
        setIsLoading(false);
      }
    } else if (dataSource === 'manual') {
      console.log('AudiencePicker: Carregando públicos manuais...');
      setAudiences([
        { id: '1', name: 'Todos os Públicos', productId: 'all', clientId: 'all' },
        { id: '2', name: 'Executivos 30-50', description: 'Profissionais de alto nível', ageRange: '30-50', interests: ['Negócios', 'Tecnologia'], location: 'São Paulo', size: 15000, productId: '2', clientId: '2', source: 'manual' },
        { id: '3', name: 'Empreendedores', description: 'Donos de pequenas empresas', ageRange: '25-45', interests: ['Empreendedorismo', 'Marketing'], location: 'Brasil', size: 25000, productId: '3', clientId: '2', source: 'manual' },
        { id: '4', name: 'Startups', description: 'Empresas em crescimento', ageRange: '20-40', interests: ['Inovação', 'Tecnologia'], location: 'São Paulo', size: 8000, productId: '4', clientId: '3', source: 'manual' },
        { id: '5', name: 'Consultores', description: 'Profissionais independentes', ageRange: '28-55', interests: ['Consultoria', 'Estratégia'], location: 'Brasil', size: 12000, productId: '5', clientId: '3', source: 'manual' },
        { id: '6', name: 'Agencias de Marketing', description: 'Agencias digitais', ageRange: '25-45', interests: ['Marketing Digital', 'Publicidade'], location: 'São Paulo', size: 5000, productId: '6', clientId: '4', source: 'manual' },
        { id: '7', name: 'E-commerce', description: 'Lojas online', ageRange: '25-50', interests: ['E-commerce', 'Vendas'], location: 'Brasil', size: 18000, productId: '7', clientId: '5', source: 'manual' },
        { id: '8', name: 'Tech Companies', description: 'Empresas de tecnologia', ageRange: '22-45', interests: ['Tecnologia', 'Inovação'], location: 'São Paulo', size: 10000, productId: '8', clientId: '6', source: 'manual' },
        { id: '9', name: 'Profissionais Liberais', description: 'Advogados, médicos, etc.', ageRange: '30-60', interests: ['Profissional', 'Serviços'], location: 'Brasil', size: 30000, productId: '9', clientId: '7', source: 'manual' },
        { id: '10', name: 'Agencias Criativas', description: 'Design e comunicação', ageRange: '23-40', interests: ['Design', 'Criatividade'], location: 'São Paulo', size: 7000, productId: '10', clientId: '8', source: 'manual' },
      ]);
    } else {
      console.log('AudiencePicker: DataSource não é facebook ou usuário não está logado');
    }
  };

  // Carregar públicos quando dataSource, selectedProduct ou selectedMonth mudar
  useEffect(() => {
    loadMetaAdsAdSets();
  }, [dataSource, selectedProduct, selectedMonth]);

  // Filtrar públicos baseado no termo de busca, produto e cliente selecionados
  const filteredAudiences = audiences.filter(audience => {
    const matchesSearch = audience.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audience.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         audience.interests?.some(interest => interest.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         audience.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = selectedClient === 'Todos os Clientes' || 
                         audience.clientId === 'all' || 
                         audience.clientId === getClientIdFromName(selectedClient) ||
                         audience.clientId === selectedClient; // Para públicos do Facebook
    
    const matchesProduct = selectedProduct === 'Todos os Produtos' || 
                          audience.productId === 'all' || 
                          audience.productId === getProductIdFromName(selectedProduct) ||
                          audience.productId === selectedProduct; // Para públicos do Facebook
    
    return matchesSearch && matchesClient && matchesProduct;
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

  // Reset selected audience when client or product changes
  useEffect(() => {
    setSelectedAudience('Todos os Públicos');
  }, [selectedClient, selectedProduct, setSelectedAudience]);

  const handleAudienceSelect = (audience: Audience) => {
    console.log('Público selecionado:', audience);
    setSelectedAudience(audience.name);
    setIsOpen(false);
    setSearchTerm('');
    
    // Disparar evento customizado se for um Ad Set do Facebook
    if (audience.source === 'facebook' && audience.adSet) {
      console.log(`Ad Set selecionado: ${audience.adSet.name} (${audience.adSet.id})`);
      
      const event = new CustomEvent('adSetSelected', {
        detail: {
          adSet: audience.adSet,
          audienceName: audience.name,
          adSetId: audience.adSet.id
        }
      });
      window.dispatchEvent(event);
    }
  };

  const handleClear = () => {
    setSelectedAudience('Todos os Públicos');
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleDeleteAudience = (audienceId: string, audienceName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    // Não permitir deletar públicos do Facebook
    const audience = audiences.find(a => a.id === audienceId);
    if (audience?.source === 'facebook') {
      alert('Não é possível excluir conjuntos de anúncios do Meta Ads. Use o Facebook Ads Manager para gerenciar seus conjuntos de anúncios.');
      return;
    }
    
    if (window.confirm(`Tem certeza que deseja excluir o público "${audienceName}"?`)) {
      setAudiences(prevAudiences => prevAudiences.filter(audience => audience.id !== audienceId));
      
      if (audienceName === selectedAudience) {
        setSelectedAudience('Todos os Públicos');
      }
      
      setSearchTerm('');
      console.log(`Público ${audienceName} (ID: ${audienceId}) foi excluído com sucesso!`);
    }
  };

  const getDisplayText = () => {
    if (selectedAudience === 'Todos os Públicos') {
      return 'Todos os Públicos';
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
          selectedAudience === 'Todos os Públicos' 
            ? 'bg-gray-500' 
            : 'bg-green-500 shadow-lg shadow-green-500/50'
        }`}></div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 min-w-[400px] max-h-[400px] overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar público..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 text-gray-900"
                autoFocus
              />
            </div>
          </div>

          {/* Audience list */}
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500 mx-auto mb-2"></div>
                Carregando conjuntos de anúncios...
              </div>
            ) : filteredAudiences.length > 0 ? (
              filteredAudiences.map((audience) => (
                <div
                  key={audience.id}
                  onClick={() => handleAudienceSelect(audience)}
                  className={`p-3 hover:bg-gray-50 cursor-pointer transition-colors group ${
                    audience.name === selectedAudience ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        {getAudienceIcon(audience)}
                        <div className="font-medium text-gray-900">{audience.name}</div>
                        {audience.source === 'facebook' && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            Meta Ads
                          </span>
                        )}
                      </div>
                      {audience.description && (
                        <div className="text-sm text-gray-500 ml-6">{audience.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1 ml-6">
                        {audience.ageRange && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                            {audience.ageRange} anos
                          </span>
                        )}
                        {audience.location && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {audience.location}
                          </span>
                        )}
                        {audience.size && (
                          <span className="text-xs font-medium text-purple-600">
                            {formatSize(audience.size)} pessoas
                          </span>
                        )}
                        {audience.source === 'facebook' && audience.adSet && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            audience.adSet.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {audience.adSet.status === 'ACTIVE' ? 'Ativo' : 'Pausado'}
                          </span>
                        )}
                      </div>
                      {audience.interests && audience.interests.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 ml-6">
                          {audience.interests.map((interest, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">
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
                      {audience.name !== 'Todos os Públicos' && audience.source !== 'facebook' && (
                        <button
                          onClick={(e) => handleDeleteAudience(audience.id, audience.name, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200 ease-in-out"
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
              <div className="p-4 text-center text-gray-500">
                {dataSource === 'facebook' && metaAdsService.isLoggedIn()
                  ? 'Nenhum conjunto de anúncios ativo encontrado para esta campanha'
                  : selectedClient === 'Todos os Clientes' 
                    ? 'Selecione um cliente para ver os públicos'
                    : selectedProduct === 'Todos os Produtos'
                    ? 'Selecione um produto para ver os públicos'
                    : 'Nenhum público encontrado'
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
                  Novo Público
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudiencePicker; 