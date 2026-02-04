import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, AlertTriangle, Calendar, X, CheckCircle, TrendingUp, ExternalLink } from 'lucide-react';
import { notificationService, NotificationData, PendingAnalysis } from '../services/notificationService';
import { metaAdsNotificationService, MetaAdsNotification } from '../services/metaAdsNotificationService';
import { createPortal } from 'react-dom';

interface NotificationButtonProps {
  selectedClient: string;
  selectedProduct: string;
  selectedAudience: string;
  selectedMonth?: string;
  isFacebookConnected?: boolean;
  metaAdsUserId?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  selectedClient,
  selectedProduct,
  selectedAudience,
  selectedMonth,
  isFacebookConnected = false,
  metaAdsUserId = ''
}) => {
  // 🎯 LOGS PARA DEBUG: Monitorar mudanças nas props
  useEffect(() => {
    
  }, [selectedClient, selectedProduct, selectedAudience, selectedMonth, isFacebookConnected, metaAdsUserId]);
  
  const [notificationData, setNotificationData] = useState<NotificationData>({
    pendingAnalyses: [],
    totalPending: 0,
    hasUrgent: false
  });
  const [metaAdsNotifications, setMetaAdsNotifications] = useState<MetaAdsNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 384 });

  // Carregar notificações
  const loadNotifications = async () => {
    
    
    if (!isFacebookConnected) {
      
      setNotificationData({
        pendingAnalyses: [],
        totalPending: 0,
        hasUrgent: false
      });
      setMetaAdsNotifications([]);
      return;
    }

    setIsLoading(true);
    try {
      
      
      // Carregar notificações fechadas primeiro
      notificationService.loadClosedNotifications();
      
      // Carregar notificações de análises pendentes
      const analysisData = await notificationService.getPendingAnalyses(metaAdsUserId, selectedClient);
      
      setNotificationData(analysisData);
      
      // Carregar notificações do Meta Ads
      const metaAdsData = await metaAdsNotificationService.getMetaAdsNotifications(selectedClient);
      
      setMetaAdsNotifications(metaAdsData.notifications);
      
      
      
    } catch (error) {
      console.error('🔔 [NOTIFICATION] Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calcular total de notificações (análises + Meta Ads)
  const totalNotifications = notificationData.totalPending + metaAdsNotifications.length;
  const hasUrgentNotifications = notificationData.hasUrgent || metaAdsNotifications.some(n => n.severity === 'critical');

  // Forçar atualização das notificações
  const handleForceRefresh = async () => {
    setIsLoading(true);
    try {
      // Carregar notificações fechadas primeiro
      notificationService.loadClosedNotifications();
      
      // Carregar notificações de análises pendentes
      const analysisData = await notificationService.getPendingAnalyses(metaAdsUserId, selectedClient);
      setNotificationData(analysisData);
      
      // Carregar notificações do Meta Ads (forçar atualização)
      const metaAdsData = await metaAdsNotificationService.getMetaAdsNotifications(selectedClient, true);
      setMetaAdsNotifications(metaAdsData.notifications);
    } catch (error) {
      console.error('🔔 [NOTIFICATION] Erro ao forçar atualização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fechar notificação individual
  const handleCloseNotification = (notificationId: string) => {
    notificationService.closeNotification(notificationId);
    // Recarregar notificações para atualizar a lista
    loadNotifications();
  };

  // 🎯 CORREÇÃO: Remover timer automático e carregar apenas quando necessário
  useEffect(() => {
    
    loadNotifications();
    // 🚫 REMOVIDO: Timer automático de 5 minutos
    // const interval = isFacebookConnected ? setInterval(loadNotifications, 5 * 60 * 1000) : null;
    // return () => {
    //   if (interval) clearInterval(interval);
    // };
  }, [isFacebookConnected, metaAdsUserId]); // Removido selectedClient, selectedProduct, selectedAudience, selectedMonth das dependências

  // 🎯 NOVO: Carregar notificações quando cliente for selecionado
  useEffect(() => {
    if (isFacebookConnected && selectedClient && selectedClient !== 'Selecione um cliente') {
      
      loadNotifications();
    }
  }, [selectedClient, isFacebookConnected]);

  // Listener para eventos de conexão/desconexão do Meta Ads
  useEffect(() => {
    const handleMetaAdsConnected = () => {
      
      loadNotifications();
    };

    const handleMetaAdsDisconnected = () => {
      
      setNotificationData({
        pendingAnalyses: [],
        totalPending: 0,
        hasUrgent: false
      });
      setIsOpen(false); // Fechar dropdown se estiver aberto
    };

    const handleAnalysisUpdated = () => {
      if (isFacebookConnected) {
        
        loadNotifications();
      }
    };

    window.addEventListener('metaAdsConnected', handleMetaAdsConnected);
    window.addEventListener('metaAdsDisconnected', handleMetaAdsDisconnected);
    window.addEventListener('analysisUpdated', handleAnalysisUpdated);

    return () => {
      window.removeEventListener('metaAdsConnected', handleMetaAdsConnected);
      window.removeEventListener('metaAdsDisconnected', handleMetaAdsDisconnected);
      window.removeEventListener('analysisUpdated', handleAnalysisUpdated);
    };
  }, [isFacebookConnected]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Verificar se clicou em um botão dentro do modal
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (!isFacebookConnected) return; // Não abrir se não conectado
    
    setIsOpen(!isOpen);
    // 🎯 CORREÇÃO: Recarregar apenas ao abrir o dropdown
    if (!isOpen) {
      
      loadNotifications();
    }
  };

  // Calcular posição do dropdown e usar portal para evitar stacking context do header
  useEffect(() => {
    const updatePos = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const width = Math.min(384, window.innerWidth - 16);
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const top = rect.bottom + 8;
      setMenuPos({ top, left, width });
    };
    if (isOpen) {
      updatePos();
      window.addEventListener('resize', updatePos);
      window.addEventListener('scroll', updatePos, true);
      return () => {
        window.removeEventListener('resize', updatePos);
        window.removeEventListener('scroll', updatePos, true);
      };
    }
  }, [isOpen]);

  const navigateToInsights = (analysis: PendingAnalysis) => {
    // 🎯 CORREÇÃO: NÃO fechar o dropdown ao navegar
    // setIsOpen(false); // REMOVIDO - modal deve permanecer aberto
    
    // Implementar navegação para a seção de insights
    // Por enquanto, apenas scroll para insights ou alert
    const insightsSection = document.querySelector('[data-section="insights"]');
    if (insightsSection) {
      insightsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getBellIcon = () => {
    // Só mostrar cores quando o Meta Ads estiver conectado
    if (!isFacebookConnected) {
      return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />;
    }
    
    if (notificationData.hasUrgent) {
      return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform text-red-400" />;
    }
    if (notificationData.totalPending > 0) {
      return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-400" />;
    }
    return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />;
  };

  // 🎯 LOG PARA DEBUG: Monitorar estado do componente
  useEffect(() => {
    
  }, [isOpen, isLoading, totalNotifications, hasUrgentNotifications]);

  // 🎯 LOG PARA DEBUG: Monitorar mudanças no notificationData
  useEffect(() => {
    
  }, [notificationData]);

  // 🎯 LOG PARA DEBUG: Monitorar mudanças no isFacebookConnected
  useEffect(() => {
    
  }, [isFacebookConnected]);

    return (
    <div className="relative group notification-button-wrapper" ref={dropdownRef}>
      {/* 🎯 LOG PARA DEBUG: Verificar se o botão está sendo renderizado */}
      {(() => {
        
        return null;
      })()}
      
      {isFacebookConnected && (
        <button
          onClick={handleClick}
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
            
            // Usar o mesmo sistema de tooltip do Header
            if (typeof window !== 'undefined' && (window as any).setHeaderTooltip) {
              (window as any).setHeaderTooltip({
                visible: true,
                x: Math.max(margin, x),
                y: Math.max(margin, y),
                title: 'Central de Notificações',
                content: isFacebookConnected 
                  ? (notificationData.totalPending > 0 
                      ? `${notificationData.totalPending} análise(s) pendente(s) de processamento`
                      : "Sem notificações pendentes"
                    )
                  : "Conecte-se ao Meta Ads para ver notificações e análises pendentes",
                color: 'purple'
              });
            }
          }}
          onMouseLeave={() => {
            if (typeof window !== 'undefined' && (window as any).setHeaderTooltip) {
              (window as any).setHeaderTooltip((prev: any) => ({ ...prev, visible: false }));
            }
          }}
          ref={triggerRef}
          className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md relative notification-button-trigger ${
            isFacebookConnected 
              ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 cursor-pointer' 
              : 'text-slate-600 cursor-not-allowed opacity-50'
          }`}
          disabled={!isFacebookConnected}
          style={{ display: 'block', visibility: 'visible', opacity: isFacebookConnected ? 1 : 0.5 }}
        >
          {getBellIcon()}
          
          {/* Indicador de notificações - só quando Meta Ads estiver conectado */}
          {isFacebookConnected && totalNotifications > 0 && (
            <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
              hasUrgentNotifications 
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 animate-pulse' 
                : 'bg-amber-500 text-white shadow-lg shadow-amber-500/50'
            }`}>
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </div>
          )}
        </button>
      )}

      {/* Dropdown de notificações - via Portal para escapar do header */}
      {isOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${menuPos.top}px`,
            left: `${menuPos.left}px`,
            width: `${menuPos.width}px`,
            zIndex: 2147483647,
            transform: 'translate3d(0,0,0)',
            isolation: 'isolate',
            contain: 'layout',
            backfaceVisibility: 'hidden',
            perspective: '1000px'
          }}
          className="bg-slate-800 border border-slate-600/40 rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-slate-700/50 border-b border-slate-600/40">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-slate-300" />
              <h3 className="font-semibold text-slate-100">Notificações</h3>
            </div>
          </div>

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-3"></div>
                <p className="text-slate-400">Carregando notificações...</p>
              </div>
            ) : (
              <>
                {/* Notificações de Análises Pendentes */}
                {notificationData.pendingAnalyses.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-600/40">
                      <h3 className="text-sm font-semibold text-slate-200">Análises Pendentes</h3>
                    </div>
                    {notificationData.pendingAnalyses.map((analysis) => (
                      <NotificationItem key={analysis.id} analysis={analysis} onClose={handleCloseNotification} />
                    ))}
                  </div>
                )}

                {/* Notificações do Meta Ads */}
                {metaAdsNotifications.length > 0 && (
                  <div className="mb-4">
                    <div className="px-4 py-2 bg-slate-700/30 border-b border-slate-600/40">
                      <h3 className="text-sm font-semibold text-slate-200">Alertas do Meta Ads</h3>
                    </div>
                    {metaAdsNotifications.map((notification) => (
                      <MetaAdsNotificationItem 
                        key={notification.id} 
                        notification={notification} 
                      />
                    ))}
                  </div>
                )}

                {/* Mensagem quando não há notificações */}
                {notificationData.pendingAnalyses.length === 0 && metaAdsNotifications.length === 0 && (
                  <div className="p-6 text-center">
                    <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium">Tudo em ordem!</p>
                    <p className="text-slate-400 text-sm mt-1">Nenhuma notificação pendente</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-700/30 border-t border-slate-600/40">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">
                {notificationData.pendingAnalyses.length > 0 
                  ? `${notificationData.totalPending} análise(s) pendente(s)`
                  : 'Nenhuma análise pendente'
                }
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleForceRefresh}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </div>, document.body)
      }
    </div>
  );
};

interface NotificationItemProps {
  analysis: PendingAnalysis;
  onClose: (notificationId: string) => void;
}

interface MetaAdsNotificationItemProps {
  notification: MetaAdsNotification;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ analysis, onClose }) => {
  const urgencyLevel = analysis.daysPastDue > 7 ? 'critical' : analysis.daysPastDue > 3 ? 'high' : 'medium';
  const urgencyColor = urgencyLevel === 'critical' ? 'text-red-400' : urgencyLevel === 'high' ? 'text-orange-400' : 'text-yellow-400';
  
  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${urgencyColor}`} />
            <h4 className="text-sm font-medium text-slate-200 truncate">
              Análise Pendente - {analysis.client}
            </h4>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            {analysis.product} • {analysis.audience || 'Sem público'}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {analysis.daysPastDue} dia(s) de atraso
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Próxima: {notificationService.formatDateBR(analysis.plannedNextDate)}
            </span>
          </div>
        </div>
        <button
          onClick={() => onClose(analysis.id)}
          className="ml-2 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-600/50 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const MetaAdsNotificationItem: React.FC<MetaAdsNotificationItemProps> = ({ notification }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400';
      case 'high': return 'text-orange-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-slate-400';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  };

  // Função para abrir link em nova aba
  const handleOpenMetaAds = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="p-4 hover:bg-slate-700/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">{getSeverityIcon(notification.severity)}</span>
            <h4 className={`text-sm font-medium ${getSeverityColor(notification.severity)} truncate`}>
              {notification.title}
            </h4>
            {notification.actionRequired && (
              <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full">
                Ação Necessária
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mb-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2">
            {notification.actionUrl && (
              <button
                onClick={handleOpenMetaAds}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                Ver no Meta Ads
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationButton; 