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
      <div className="max-w-7xl mx-auto px-6 py-4">
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <div className="w-5 h-5 bg-white rounded-md shadow-sm"></div>
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-xs text-gray-400 -mt-1">G. Tráfego Analytics</p>
            </div>
          </div>
          
          {/* User Section */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 group">
                <Search className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
              <NotificationButton 
                selectedClient={selectedClient}
                selectedProduct={selectedProduct}
                selectedAudience={selectedAudience}
              />
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 group">
                <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-600"></div>
            
            <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.name} 
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{currentUser?.name || 'Usuário'}</p>
                <p className="text-xs text-gray-400">{currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-all duration-200"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-center justify-center">
          <div className="flex items-center space-x-3">
            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <MonthYearPicker 
                selectedMonth={selectedMonth}
                setSelectedMonth={setSelectedMonth}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <ClientPicker 
                selectedClient={selectedClient}
                setSelectedClient={setSelectedClient}
                dataSource={dataSource}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <ProductPicker 
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
                selectedClient={selectedClient}
                dataSource={dataSource}
                selectedMonth={selectedMonth}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <AudiencePicker 
                selectedAudience={selectedAudience}
                setSelectedAudience={setSelectedAudience}
                selectedProduct={selectedProduct}
                selectedClient={selectedClient}
                dataSource={dataSource}
                selectedMonth={selectedMonth}
              />
            </div>



            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <MetaAdsConfig 
                onConfigSaved={onMetaAdsSync} 
                onDataSourceChange={onDataSourceChange}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
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
    </header>
  );
};

export default Header;