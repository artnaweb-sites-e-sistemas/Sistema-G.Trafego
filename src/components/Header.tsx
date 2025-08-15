import React, { useState, useEffect } from 'react';
import { User, LogOut, Facebook, Database, RefreshCw, CheckSquare } from 'lucide-react';
import MetaAdsConfig from './MetaAdsConfig';
import ShareReport from './ShareReport';
import MonthYearPicker from './MonthYearPicker';
import ClientPicker from './ClientPicker';
import ProductPicker from './ProductPicker';
import AudiencePicker from './AudiencePicker';
import TaskManager from './TaskManager';
import { shareService } from '../services/shareService';
import { MetricData } from '../services/metricsService';

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
  monthlyDetailsValues?: { agendamentos: number; vendas: number };
  metrics?: MetricData[];

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
  onDataSourceChange,
  monthlyDetailsValues = { agendamentos: 0, vendas: 0 },
  metrics = [],

}) => {
  const [hasGeneratedLinks, setHasGeneratedLinks] = useState(false);
  const [isTaskManagerOpen, setIsTaskManagerOpen] = useState(false);

  // Debug: monitorar mudanças no estado do modal
  useEffect(() => {
    console.log('🔍 TaskManager Modal State:', isTaskManagerOpen);
  }, [isTaskManagerOpen]);

  // Função para obter o ID do usuário do Meta Ads
  const getMetaAdsUserId = (): string => {
    try {
      const savedUser = localStorage.getItem('facebookUser');
      const selectedAdAccount = localStorage.getItem('selectedAdAccount');
      
      if (savedUser && selectedAdAccount) {
        const user = JSON.parse(savedUser);
        const adAccount = JSON.parse(selectedAdAccount);
        // Usar combinação do ID do usuário Facebook + ID da conta de anúncios
        return `${user.id}_${adAccount.id}`;
      }
      
      return currentUser?.uid || '';
    } catch (error) {
      console.error('Erro ao obter ID do usuário Meta Ads:', error);
      return currentUser?.uid || '';
    }
  };

  // Verificar se há links gerados ao carregar o componente
  useEffect(() => {
    try {
      const links = shareService.getAllShareLinks();
      setHasGeneratedLinks(links.length > 0);
    } catch (error) {
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

  // Monitorar mudanças na conexão do Meta Ads
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'facebookUser' || e.key === 'selectedAdAccount') {
        // Fechar modal de tarefas se estiver aberto quando houver mudança de conta
        if (isTaskManagerOpen) {
          setIsTaskManagerOpen(false);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isTaskManagerOpen]);

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 shadow-xl">
      <div className="max-w-7xl mx-auto px-8 py-6">
        {/* Logo Section */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <div className="w-6 h-6 bg-white rounded-lg shadow-sm"></div>
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 bg-clip-text text-transparent tracking-tight">
                Dashboard
              </h1>
              <p className="text-sm text-slate-400 -mt-1 font-medium">G. Tráfego Analytics</p>
            </div>
          </div>
          
          {/* User Section */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => {
                  console.log('🔍 CLICK - Botão de tarefas clicado!', { isFacebookConnected, isTaskManagerOpen });
                  if (isFacebookConnected) {
                    setIsTaskManagerOpen(true);
                  }
                }}
                className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md ${
                  isFacebookConnected 
                    ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 cursor-pointer' 
                    : 'text-slate-600 cursor-not-allowed opacity-50'
                }`}
                title={isFacebookConnected ? "Tarefas" : "Conecte-se ao Meta Ads para usar tarefas"}
                disabled={!isFacebookConnected}
              >
                <CheckSquare className={`w-5 h-5 transition-transform ${
                  isFacebookConnected ? 'group-hover:scale-110' : ''
                }`} />
              </button>
              <NotificationButton 
                selectedClient={selectedClient}
                selectedProduct={selectedProduct}
                selectedAudience={selectedAudience}
                selectedMonth={selectedMonth}
                isFacebookConnected={isFacebookConnected}
                metaAdsUserId={getMetaAdsUserId()}
              />
            </div>

            <div className="h-8 w-px bg-gradient-to-b from-slate-600 to-transparent"></div>
            
            <div className="flex items-center space-x-4 bg-slate-800/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-600/40 shadow-lg">
              {currentUser?.photoURL ? (
                <img 
                  src={currentUser.photoURL} 
                  alt={currentUser.name} 
                  className="w-10 h-10 rounded-full object-cover border-2 border-slate-600"
                />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-100">{currentUser?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-400 font-medium">{currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-300 hover:scale-105"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex items-center justify-center w-full header-filters">
          <div className="flex items-center space-x-3 w-full max-w-7xl">
            {/* Filtros com largura fixa */}
            <div className="flex flex-col items-center space-y-1 w-1/4 header-filter-item">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Período</label>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full backdrop-blur-sm dropdown-container">
                <MonthYearPicker 
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-1/4 header-filter-item">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Cliente</label>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full backdrop-blur-sm dropdown-container">
                <ClientPicker 
                  selectedClient={selectedClient}
                  setSelectedClient={setSelectedClient}
                  dataSource={dataSource}
                  isFacebookConnected={isFacebookConnected}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-1/4 header-filter-item">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Produto</label>
              <div className="relative bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full backdrop-blur-sm dropdown-container">
                <button
                  type="button"
                  onClick={() => {
                    const ev = new CustomEvent('reloadProducts');
                    window.dispatchEvent(ev);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-md text-slate-400 hover:text-yellow-300 hover:bg-slate-700/60 transition-colors"
                  title="Recarregar campanhas"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <ProductPicker 
                  selectedProduct={selectedProduct}
                  setSelectedProduct={setSelectedProduct}
                  selectedClient={selectedClient}
                  dataSource={dataSource}
                  selectedMonth={selectedMonth}
                  isFacebookConnected={isFacebookConnected}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-1/4 header-filter-item">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Público</label>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 shadow-sm hover:shadow-md transition-all duration-200 w-full backdrop-blur-sm dropdown-container">
                <AudiencePicker 
                  selectedAudience={selectedAudience}
                  setSelectedAudience={setSelectedAudience}
                  selectedProduct={selectedProduct}
                  selectedClient={selectedClient}
                  dataSource={dataSource}
                  selectedMonth={selectedMonth}
                  isFacebookConnected={isFacebookConnected}
                />
              </div>
            </div>

            {/* Separador sutil */}
            <div className="flex items-center justify-center w-8 h-full">
              <div className="w-px h-12 bg-slate-600/40 mt-4"></div>
            </div>

            {/* Ações - alinhadas com as abas de filtros */}
            <div className="flex flex-col items-center space-y-1 w-16 header-filter-item">
              <div className="h-4"></div> {/* Espaçador invisível para alinhar com as labels */}
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm dropdown-container">
                <MetaAdsConfig 
                  onConfigSaved={onMetaAdsSync} 
                  onDataSourceChange={onDataSourceChange}
                />
              </div>
            </div>

            <div className="flex flex-col items-center space-y-1 w-16 header-filter-item">
              <div className="h-4"></div> {/* Espaçador invisível para alinhar com as labels */}
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 shadow-sm hover:shadow-md transition-all duration-200 backdrop-blur-sm dropdown-container">
                <ShareReport 
                  selectedAudience={selectedAudience}
                  selectedProduct={selectedProduct}
                  selectedClient={selectedClient}
                  selectedMonth={selectedMonth}
                  hasGeneratedLinks={hasGeneratedLinks}
                  metrics={metrics}
                  monthlyDetailsValues={monthlyDetailsValues}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Manager Modal */}
      {isFacebookConnected && (
        <TaskManager
          isOpen={isTaskManagerOpen}
          onClose={() => setIsTaskManagerOpen(false)}
          userId={getMetaAdsUserId()}
          onMetaAdsDisconnect={() => setIsTaskManagerOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;