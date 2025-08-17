import React, { useState, useEffect } from 'react';
import { User, LogOut, Facebook, Database, RefreshCw, CheckSquare, Wrench } from 'lucide-react';
import { createPortal } from 'react-dom';
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
  const [isAutoFixing, setIsAutoFixing] = useState(false);
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

  // Monitorar mudanças no estado do modal

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

  // Função para correção automática inteligente
  const handleAutoFix = async () => {
    console.log('🔧 DEBUG - handleAutoFix - INICIANDO CORREÇÃO AUTOMÁTICA');
    setIsAutoFixing(true);
    
    try {
      
      // 1. Limpar rate limit
      console.log('🔧 DEBUG - handleAutoFix - 1. Limpando rate limits...');
      const rateLimitKeys = [
        'metaAdsRateLimit', 
        'metaAdsRateLimitTimestamp', 
        'globalRateLimit', 
        'globalRateLimitTimestamp',
        'metaAdsGlobalRateLimit',
        'metaAdsGlobalRateLimitTimestamp'
      ];
      
      // Limpar todas as chaves de rate limit
      rateLimitKeys.forEach(key => {
        const hadValue = localStorage.getItem(key);
        localStorage.removeItem(key);
        console.log(`🔧 DEBUG - handleAutoFix - Removido: ${key} (tinha valor: ${!!hadValue})`);
      });
      
      // Limpar rate limits globais por usuário (com hash)
      const allKeys = Object.keys(localStorage);
      const globalRateLimitKeys = allKeys.filter(key => key.includes('metaAdsGlobalRateLimit_'));
      globalRateLimitKeys.forEach(key => {
        const hadValue = localStorage.getItem(key);
        localStorage.removeItem(key);
        console.log(`🔧 DEBUG - handleAutoFix - Removido rate limit global: ${key} (tinha valor: ${!!hadValue})`);
      });
      
      // 2. Verificar e corrigir campaign ID
      console.log('🔧 DEBUG - handleAutoFix - 2. Verificando campaign ID...');
      let campaignId = localStorage.getItem('selectedCampaignId');
      console.log(`🔧 DEBUG - handleAutoFix - Campaign ID atual: ${campaignId || 'NENHUM'}`);
      
      if (!campaignId) {
        console.log('🔧 DEBUG - handleAutoFix - Campaign ID não encontrado, buscando campanhas...');
        const campaigns = localStorage.getItem('metaAdsData_campaigns');
        if (campaigns) {
          try {
            const parsedCampaigns = JSON.parse(campaigns);
            console.log(`🔧 DEBUG - handleAutoFix - Encontradas ${parsedCampaigns.length} campanhas`);
            
            if (parsedCampaigns.length > 0) {
              const activeCampaign = parsedCampaigns.find((c: any) => c.status === 'ACTIVE') || parsedCampaigns[0];
              localStorage.setItem('selectedCampaignId', activeCampaign.id);
              campaignId = activeCampaign.id;
              console.log(`🔧 DEBUG - handleAutoFix - Campaign ID definido: ${campaignId} (status: ${activeCampaign.status})`);
            }
          } catch (e) {
            console.error('🔧 DEBUG - handleAutoFix - Erro ao processar campanhas:', e);
          }
        } else {
          console.log('🔧 DEBUG - handleAutoFix - Nenhuma campanha encontrada no localStorage');
        }
      }
      
      // 3. Limpar cache de Ad Sets
      console.log('🔧 DEBUG - handleAutoFix - 3. Limpando cache de Ad Sets...');
      const cacheKeys = ['metaAdsData_adsets', 'metaAdsData_adsets_timestamp', 'adsets_cache', 'adsets_cache_timestamp'];
      cacheKeys.forEach(key => {
        const hadValue = localStorage.getItem(key);
        localStorage.removeItem(key);
        console.log(`🔧 DEBUG - handleAutoFix - Removido: ${key} (tinha valor: ${!!hadValue})`);
      });
      
      if (campaignId) {
        const campaignCacheKey = `adsets_campaign_${campaignId}`;
        const hadValue = localStorage.getItem(campaignCacheKey);
        localStorage.removeItem(campaignCacheKey);
        localStorage.removeItem(`${campaignCacheKey}_timestamp`);
        console.log(`🔧 DEBUG - handleAutoFix - Removido cache da campanha: ${campaignCacheKey} (tinha valor: ${!!hadValue})`);
      }
      
      // 4. Limpar cache e rate limits do serviço
      console.log('🔧 DEBUG - handleAutoFix - 4. Limpando cache e rate limits do serviço...');
      if ((window as any).metaAdsService) {
        try {
          // Limpar cache de Ad Sets
          if ((window as any).metaAdsService.clearCacheByType) {
            (window as any).metaAdsService.clearCacheByType('adsets');
            console.log('🔧 DEBUG - handleAutoFix - Cache do serviço limpo com sucesso');
          }
          
          // Resetar rate limits da API
          if ((window as any).metaAdsService.resetApiRateLimit) {
            (window as any).metaAdsService.resetApiRateLimit();
            console.log('🔧 DEBUG - handleAutoFix - Rate limits da API resetados com sucesso');
          }
          
          // Resetar rate limits do OAuth
          if ((window as any).metaAdsService.resetOAuthRateLimit) {
            (window as any).metaAdsService.resetOAuthRateLimit();
            console.log('🔧 DEBUG - handleAutoFix - Rate limits do OAuth resetados com sucesso');
          }
          
          // 🎯 NOVO: Resetar rate limits para todos os usuários (para multi-usuário)
          if ((window as any).metaAdsService.resetAllUsersRateLimit) {
            (window as any).metaAdsService.resetAllUsersRateLimit();
            console.log('🔧 DEBUG - handleAutoFix - Rate limits para todos os usuários resetados com sucesso');
          }
          
        } catch (e) {
          console.error('🔧 DEBUG - handleAutoFix - Erro ao limpar cache/rate limits do serviço:', e);
        }
      } else {
        console.log('🔧 DEBUG - handleAutoFix - MetaAdsService não disponível no window');
      }
      
      // 5. Aguardar um pouco para o rate limit ser resetado
      console.log('🔧 DEBUG - handleAutoFix - 5. Aguardando 1 segundo...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 6. Disparar evento para recarregar produtos
      console.log('🔧 DEBUG - handleAutoFix - 6. Disparando evento reloadProducts...');
      window.dispatchEvent(new CustomEvent('reloadProducts'));
      
      // 7. Disparar evento para recarregar públicos
      console.log('🔧 DEBUG - handleAutoFix - 7. Disparando evento reloadAudiences...');
      window.dispatchEvent(new CustomEvent('reloadAudiences', { detail: { force: true } }));
      
      console.log('🔧 DEBUG - handleAutoFix - CORREÇÃO AUTOMÁTICA CONCLUÍDA COM SUCESSO!');
      
    } catch (error) {
      console.error('❌ Erro na correção automática:', error);
    } finally {
      setIsAutoFixing(false);
      console.log('🔧 DEBUG - handleAutoFix - Estado de correção resetado');
    }
  };

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

  // Expor setTooltip para outros componentes
  useEffect(() => {
    (window as any).setHeaderTooltip = setTooltip;
    
    return () => {
      delete (window as any).setHeaderTooltip;
    };
  }, []);

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
                                               {/* Botão de Correção Automática */}
                <div className="relative group">
                  <button 
                    onClick={handleAutoFix}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const tooltipWidth = 300;
                      const tooltipHeight = 80;
                      const margin = 10;
                      
                      let x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                      let y = rect.bottom + margin;
                      
                      // Ajustar horizontalmente se sair da tela
                      if (x < margin) {
                        x = margin;
                      } else if (x + tooltipWidth > window.innerWidth - margin) {
                        x = window.innerWidth - tooltipWidth - margin;
                      }
                      
                      // Ajustar verticalmente se sair da tela
                      if (y + tooltipHeight > window.innerHeight - margin) {
                        y = rect.top - tooltipHeight - margin;
                      }
                      
                      setTooltip({
                        visible: true,
                        x: Math.max(margin, x),
                        y: Math.max(margin, y),
                        title: 'Correção Automática',
                        content: isFacebookConnected 
                          ? "Resolve automaticamente problemas de rate limit, campaign ID nulo e cache desatualizado"
                          : "Conecte-se ao Meta Ads para usar correção automática",
                        color: 'green'
                      });
                    }}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                    disabled={isAutoFixing || !isFacebookConnected}
                    className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md ${
                      isFacebookConnected 
                        ? 'text-slate-400 hover:text-green-300 hover:bg-slate-700/50 cursor-pointer' 
                        : 'text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                  >
                    {isAutoFixing ? (
                      <div className="w-5 h-5 animate-spin rounded-full border-2 border-green-400 border-t-transparent"></div>
                    ) : (
                      <Wrench className={`w-5 h-5 transition-transform ${
                        isFacebookConnected ? 'group-hover:scale-110' : ''
                      }`} />
                    )}
                  </button>
                </div>
               
                                               {/* Botão de Tarefas */}
                <div className="relative group">
                  <button 
                    onClick={() => {
                      if (isFacebookConnected) {
                        setIsTaskManagerOpen(true);
                      }
                    }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const tooltipWidth = 300;
                      const tooltipHeight = 80;
                      const margin = 10;
                      
                      let x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                      let y = rect.bottom + margin;
                      
                      // Ajustar horizontalmente se sair da tela
                      if (x < margin) {
                        x = margin;
                      } else if (x + tooltipWidth > window.innerWidth - margin) {
                        x = window.innerWidth - tooltipWidth - margin;
                      }
                      
                      // Ajustar verticalmente se sair da tela
                      if (y + tooltipHeight > window.innerHeight - margin) {
                        y = rect.top - tooltipHeight - margin;
                      }
                      
                      setTooltip({
                        visible: true,
                        x: Math.max(margin, x),
                        y: Math.max(margin, y),
                        title: 'Gerenciador de Tarefas',
                        content: isFacebookConnected 
                          ? "Gerencie tarefas, lembretes e acompanhe o progresso das campanhas do Meta Ads"
                          : "Conecte-se ao Meta Ads para usar o gerenciador de tarefas",
                        color: 'blue'
                      });
                    }}
                    onMouseLeave={() => setTooltip(prev => ({ ...prev, visible: false }))}
                    className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md ${
                      isFacebookConnected 
                        ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 cursor-pointer' 
                        : 'text-slate-600 cursor-not-allowed opacity-50'
                    }`}
                    disabled={!isFacebookConnected}
                  >
                    <CheckSquare className={`w-5 h-5 transition-transform ${
                      isFacebookConnected ? 'group-hover:scale-110' : ''
                    }`} />
                  </button>
                </div>
               
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
                <div className="absolute top-1 right-1">
                  <button
                    type="button"
                    onClick={() => {
                      const ev = new CustomEvent('reloadProducts');
                      window.dispatchEvent(ev);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-yellow-300 hover:bg-slate-700/60 transition-colors"
                    title="Recarregar campanhas"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
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

       {/* Tooltip Portal global para ficar acima de tudo */}
       {tooltip.visible && createPortal(
         <div
           className="suggestion-tooltip"
           style={{ 
             position: 'fixed', 
             left: tooltip.x, 
             top: tooltip.y, 
             zIndex: 2147483647,
             transform: 'translate3d(0, 0, 0)',
             isolation: 'isolate',
             contain: 'layout',
             backfaceVisibility: 'hidden',
             perspective: '1000px',
             willChange: 'transform',
             pointerEvents: 'none'
           }}
         >
           <div className={`min-w-[240px] max-w-[320px] text-xs rounded-lg shadow-xl border ${
             tooltip.color==='green' ? 'border-green-500/40' : tooltip.color==='blue' ? 'border-blue-500/40' : tooltip.color==='purple' ? 'border-purple-500/40' : 'border-slate-600/40'
           }`}>
             <div className="p-3 bg-slate-900 rounded-lg border-slate-600/40">
               <div className={`font-semibold mb-1 ${
                 tooltip.color==='green' ? 'text-green-400' : tooltip.color==='blue' ? 'text-blue-400' : tooltip.color==='purple' ? 'text-purple-400' : 'text-slate-200'
               }`}>{tooltip.title}</div>
               <div className="text-slate-300 leading-relaxed whitespace-pre-line">{tooltip.content}</div>
             </div>
           </div>
         </div>,
         document.body
       )}
     </header>
   );
 };

export default Header;