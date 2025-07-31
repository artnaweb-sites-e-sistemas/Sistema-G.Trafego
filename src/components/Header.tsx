import React from 'react';
import { Settings, User, Bell, Search } from 'lucide-react';
import MetaAdsConfig from './MetaAdsConfig';
import ShareReport from './ShareReport';
import MonthYearPicker from './MonthYearPicker';
import ClientPicker from './ClientPicker';
import ProductPicker from './ProductPicker';
import AudiencePicker from './AudiencePicker';

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
  onMetaAdsSync
}) => {
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
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 group relative">
                <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all duration-200 group">
                <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="h-6 w-px bg-gray-600"></div>

            <div className="flex items-center space-x-3 bg-gray-800/50 rounded-lg px-3 py-2 border border-gray-700/50">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">Administrador</p>
                <p className="text-xs text-gray-400">Principal</p>
              </div>
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
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <ProductPicker 
                selectedProduct={selectedProduct}
                setSelectedProduct={setSelectedProduct}
                selectedClient={selectedClient}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <AudiencePicker 
                selectedAudience={selectedAudience}
                setSelectedAudience={setSelectedAudience}
                selectedProduct={selectedProduct}
                selectedClient={selectedClient}
              />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <MetaAdsConfig onConfigSaved={onMetaAdsSync} />
            </div>

            <div className="bg-gray-800/50 rounded-lg border border-gray-700/50 p-1">
              <ShareReport 
                selectedAudience={selectedAudience}
                selectedProduct={selectedProduct}
                selectedClient={selectedClient}
                selectedMonth={selectedMonth}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;