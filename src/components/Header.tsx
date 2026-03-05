import React, { useState, useEffect } from 'react';
import { User, LogOut, RefreshCw, CheckSquare } from 'lucide-react';
import { createPortal } from 'react-dom';
import MetaAdsConfig from './MetaAdsConfig';
import ShareReport from './ShareReport';
import MonthYearPicker from './MonthYearPicker';
import ClientPicker from './ClientPicker';
import ProductPicker from './ProductPicker';
import TaskManager from './TaskManager';
import NotificationButton from './NotificationButton';
import MetaAdsReconnectionModal from './MetaAdsReconnectionModal';
import { shareService } from '../services/shareService';
import { MetricData } from '../services/metricsService';

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
  const [showReconnectionModal, setShowReconnectionModal] = useState(false);
  const [reconnectionError, setReconnectionError] = useState<string>('');
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
    title: string;
    color: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    title: '',
    color: 'slate'
  });

  const getMetaAdsUserId = (): string => {
    return currentUser?.uid || '';
  };

  useEffect(() => {
    try {
      const links = shareService.getAllShareLinks();
      setHasGeneratedLinks(links.length > 0);
    } catch (error) {
      setHasGeneratedLinks(false);
    }
  }, []);

  useEffect(() => {
    const handleRateLimit = (event: CustomEvent) => {
      setReconnectionError(event.detail.message || 'Limite de requisições atingido');
      setShowReconnectionModal(true);
    };
    window.addEventListener('metaAdsRateLimit', handleRateLimit as EventListener);
    return () => {
      window.removeEventListener('metaAdsRateLimit', handleRateLimit as EventListener);
    };
  }, []);

  const handleMetaAdsReconnection = async () => {
    try {
      if ((window as any).metaAdsService?.resetApiRateLimit) {
        (window as any).metaAdsService.resetApiRateLimit();
      }
      if (typeof (window as any).fixAudienceIssues?.fixAllIssues === 'function') {
        await (window as any).fixAudienceIssues.fixAllIssues();
      }
      onMetaAdsSync();
    } catch (error) {
      console.error('❌ Erro durante reconexão:', error);
      throw error;
    }
  };

  useEffect(() => {
    const handleLinkGenerated = () => setHasGeneratedLinks(true);
    const handleNoLinksRemaining = () => setHasGeneratedLinks(false);
    window.addEventListener('linkGenerated', handleLinkGenerated);
    window.addEventListener('noLinksRemaining', handleNoLinksRemaining);
    return () => {
      window.removeEventListener('linkGenerated', handleLinkGenerated);
      window.removeEventListener('noLinksRemaining', handleNoLinksRemaining);
    };
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === 'facebookUser' || e.key === 'selectedAdAccount') && isTaskManagerOpen) {
        setIsTaskManagerOpen(false);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isTaskManagerOpen]);

  useEffect(() => {
    (window as any).setHeaderTooltip = setTooltip;
    return () => { delete (window as any).setHeaderTooltip; };
  }, []);

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700/50 shadow-xl">
      <div className="max-w-7xl mx-auto px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <div className="w-6 h-6 bg-white rounded-lg shadow-sm"></div>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-100 via-slate-200 to-slate-300 bg-clip-text text-transparent tracking-tight">Dashboard</h1>
              <p className="text-sm text-slate-400 -mt-1 font-medium">G. Tráfego Analytics</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="relative group">
                <button
                  onClick={() => setIsTaskManagerOpen(true)}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const tx = rect.left + (rect.width / 2) - 150;
                    setTooltip({
                      visible: true,
                      x: Math.max(10, tx),
                      y: rect.bottom + 10,
                      title: 'Gerenciador de Tarefas',
                      content: isFacebookConnected
                        ? "Gerencie tarefas e acompanhe o progresso das campanhas."
                        : "Conecte-se ao Meta Ads para sincronizar tarefas. Uso manual disponível.",
                      color: 'blue'
                    });
                  }}
                  onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                  className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md ${isFacebookConnected ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/30'
                    }`}
                >
                  <CheckSquare className="w-5 h-5 transition-transform group-hover:scale-110" />
                </button>
              </div>

              <NotificationButton
                selectedClient={selectedClient}
                isFacebookConnected={isFacebookConnected}
                metaAdsUserId={getMetaAdsUserId()}
              />
            </div>

            <div className="h-8 w-px bg-gradient-to-b from-slate-600 to-transparent"></div>

            <div className="flex items-center space-x-4 bg-slate-800/60 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-600/40 shadow-lg">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt={currentUser.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-600" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center shadow-sm">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <div className="hidden sm:block">
                <p className="text-sm font-semibold text-slate-100">{currentUser?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-400 font-medium">{currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
              </div>
              <button onClick={onLogout} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all duration-300 hover:scale-105" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center w-full">
          <div className="flex items-center space-x-3 w-full max-w-7xl">
            <div className="flex flex-col items-center space-y-1 w-1/3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Período</label>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 w-full backdrop-blur-sm">
                <MonthYearPicker selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1 w-1/3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Cliente</label>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 w-full backdrop-blur-sm">
                <ClientPicker selectedClient={selectedClient} setSelectedClient={setSelectedClient} dataSource={dataSource} isFacebookConnected={isFacebookConnected} />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1 w-1/3">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Campanha</label>
              <div className="relative bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 w-full backdrop-blur-sm">
                <div className="absolute top-1 right-1">
                  <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('reloadProducts'))} className="p-1 text-slate-400 hover:text-yellow-300 transition-colors" title="Recarregar">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <ProductPicker selectedProduct={selectedProduct} setSelectedProduct={setSelectedProduct} selectedClient={selectedClient} dataSource={dataSource} selectedMonth={selectedMonth} isFacebookConnected={isFacebookConnected} />
              </div>
            </div>
            <div className="flex items-center justify-center w-8 h-full"><div className="w-px h-12 bg-slate-600/40 mt-4"></div></div>
            <div className="flex flex-col items-center space-y-1 w-16">
              <div className="h-4"></div>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 backdrop-blur-sm">
                <MetaAdsConfig onConfigSaved={onMetaAdsSync} onDataSourceChange={onDataSourceChange} />
              </div>
            </div>
            <div className="flex flex-col items-center space-y-1 w-16">
              <div className="h-4"></div>
              <div className="bg-slate-800/60 rounded-lg border border-slate-600/40 p-2 backdrop-blur-sm">
                <ShareReport selectedAudience={selectedAudience} selectedProduct={selectedProduct} selectedClient={selectedClient} selectedMonth={selectedMonth} hasGeneratedLinks={hasGeneratedLinks} metrics={metrics} monthlyDetailsValues={monthlyDetailsValues} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <TaskManager isOpen={isTaskManagerOpen} onClose={() => setIsTaskManagerOpen(false)} userId={getMetaAdsUserId()} isFacebookConnected={isFacebookConnected} />

      {tooltip.visible && createPortal(
        <div style={{ position: 'fixed', left: tooltip.x, top: tooltip.y, zIndex: 9999, pointerEvents: 'none' }}>
          <div className={`min-w-[240px] max-w-[320px] text-xs rounded-lg shadow-xl border bg-slate-900 p-3 ${tooltip.color === 'green' ? 'border-green-500/40' : tooltip.color === 'blue' ? 'border-blue-500/40' : tooltip.color === 'purple' ? 'border-purple-500/40' : tooltip.color === 'red' ? 'border-red-500/40' : 'border-slate-600/40'
            }`}>
            <div className="font-semibold mb-1" style={{ color: tooltip.color }}>{tooltip.title}</div>
            <div className="text-slate-300 leading-relaxed whitespace-pre-line">{tooltip.content}</div>
          </div>
        </div>,
        document.body
      )}

      <MetaAdsReconnectionModal isOpen={showReconnectionModal} onClose={() => setShowReconnectionModal(false)} onReconnect={handleMetaAdsReconnection} errorMessage={reconnectionError} />
    </header>
  );
};

export default Header;