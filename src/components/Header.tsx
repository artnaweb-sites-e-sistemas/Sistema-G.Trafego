import React, { useState, useEffect } from 'react';
import { Settings, User, Search, LogOut, Facebook, Database } from 'lucide-react';
import MetaAdsConfig from './MetaAdsConfig';
import ShareReport from './ShareReport';
import MonthYearPicker from './MonthYearPicker';
import ClientPicker from './ClientPicker';
import ProductPicker from './ProductPicker';
import AudiencePicker from './AudiencePicker';
import { shareService } from '../services/shareService';

import NotificationButton from './NotificationButton';

export interface UserType {
  uid: string;
  email: string;
  name: string;
  role: string;
  photoURL?: string;
  createdAt: Date;
}

interface HeaderProps {
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedClient: string;
  setSelectedClient: (client: string) => void;
  selectedProduct: string;
  setSelectedProduct: (product: string) => void;
  selectedAudience: string;
  setSelectedAudience: (audience: string) => void;
  onMetaAdsSync: () => void;
  currentUser: UserType | null;
  onLogout: () => void;
  dataSource?: 'manual' | 'facebook' | null;
  isFacebookConnected?: boolean;
  onDataSourceChange?: (source: 'manual' | 'facebook' | null, connected: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  selectedMonth, 
  setSelectedMonth,
  selectedClient,
  setSelectedClient,
  selectedProduct,
  setSelectedProduct,
  selectedAudience,
  setSelectedAudience,
  onMetaAdsSync,
  currentUser, 
  onLogout,
  dataSource,
  isFacebookConnected,
  onDataSourceChange
}) => {
  const [hasGeneratedLinks, setHasGeneratedLinks] = useState(false);

  // Verificar se há links gerados ao carregar o componente
  useEffect(() => {
    try {
      const links = shareService.getAllShareLinks();
      setHasGeneratedLinks(links.length > 0);
    } catch (error) {
      console.error('Erro ao carregar links gerados:', error);
      setHasGeneratedLinks(false);
    }
  }, []);

  // Listener para quando um link for gerado
  useEffect(() => {
    const handleLinkGenerated = () => {
      setHasGeneratedLinks(true);
    };

    const handleNoLinksRemaining = () => {
      setHasGeneratedLinks(false);
    };

    window.addEventListener('linkGenerated', handleLinkGenerated);
    window.addEventListener('noLinksRemaining', handleNoLinksRemaining);

    return () => {
      window.removeEventListener('linkGenerated', handleLinkGenerated);
      window.removeEventListener('noLinksRemaining', handleNoLinksRemaining);
    };
  }, []);


  return (
    <header className="bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700/50 shadow-lg">
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
                <div className="w-6 h-6 bg-white rounded-lg shadow-sm"></div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-gray-400 -mt-1 font-medium">G. Tráfego Analytics</p>
            </div>
          </div>
          
          {/* User Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md">
                <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
              <NotificationButton 
                selectedClient={selectedClient}
                selectedProduct={selectedProduct}
                selectedAudience={selectedAudience}
              />
              <button className="p-3 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md">
                <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="h-8 w-px bg-gradient-to-b from-gray-600 to-transparent"></div>
            
            <div className="flex items-center space-x-4 bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-gray-700/30 shadow-lg">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.name} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-600"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-white">{currentUser?.name || 'Usuário'}</p>
                <p className="text-xs text-gray-400 font-medium">{currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300 hover:scale-105"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center space-x-3 w-full max-w-7xl">
            {/* Filtros com largura fixa */}
            <div className="flex flex-col items-center space-y-1 w-1/4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Período</label>
              <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full">
                <MonthYearPicker 
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-1/4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Cliente</label>
              <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full">
                <ClientPicker 
                  selectedClient={selectedClient}
                  setSelectedClient={setSelectedClient}
                  dataSource={dataSource}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-1/4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Produto</label>
              <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full">
                <ProductPicker 
                  selectedProduct={selectedProduct}
                  setSelectedProduct={setSelectedProduct}
                  selectedClient={selectedClient}
                  dataSource={dataSource}
                  selectedMonth={selectedMonth}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-1/4">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Público</label>
              <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full">
                <AudiencePicker 
                  selectedAudience={selectedAudience}
                  setSelectedAudience={setSelectedAudience}
                  selectedProduct={selectedProduct}
                  selectedClient={selectedClient}
                  dataSource={dataSource}
                  selectedMonth={selectedMonth}
                />
              </div>
            </div>

            {/* Separador sutil */}
            <div className="flex items-center justify-center w-8 h-full">
              <div className="w-px h-12 bg-gray-600/30 mt-4"></div>
            </div>

            {/* Ações - alinhadas com as abas de filtros */}
            <div className="flex flex-col items-center space-y-1 w-16">
              <div className="h-4"></div> {/* Espaçador invisível para alinhar com as labels */}
              <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 p-2 shadow-sm hover:shadow-md transition-all duration-200">
                <MetaAdsConfig 
                  onConfigSaved={onMetaAdsSync} 
                  onDataSourceChange={onDataSourceChange}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-16">
              <div className="h-4"></div> {/* Espaçador invisível para alinhar com as labels */}
              <div className="bg-gray-800/40 rounded-lg border border-gray-700/30 p-2 shadow-sm hover:shadow-md transition-all duration-200">
                <ShareReport 
                  selectedAudience={selectedAudience}
                  selectedProduct={selectedProduct}
                  selectedClient={selectedClient}
                  selectedMonth={selectedMonth}
                  hasGeneratedLinks={hasGeneratedLinks}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;