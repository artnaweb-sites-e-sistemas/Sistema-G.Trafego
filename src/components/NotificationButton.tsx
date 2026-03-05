import React, { useState, useEffect, useRef } from 'react';
import { Bell, AlertTriangle, X, CheckCircle, ExternalLink } from 'lucide-react';
import { notificationService, NotificationData } from '../services/notificationService';
import { metaAdsNotificationService, MetaAdsNotification } from '../services/metaAdsNotificationService';
import { createPortal } from 'react-dom';

interface NotificationButtonProps {
  selectedClient: string;
  isFacebookConnected?: boolean;
  metaAdsUserId?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  selectedClient,
  isFacebookConnected = false,
  metaAdsUserId = ''
}) => {
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
    // Se não tivermos um userId válido (Firebase UID), não carregamos nada
    if (!metaAdsUserId) {
      setNotificationData({ pendingAnalyses: [], totalPending: 0, hasUrgent: false });
      setMetaAdsNotifications([]);
      return;
    }

    setIsLoading(true);
    try {
      // Carregar notificações fechadas primeiro
      notificationService.loadClosedNotifications();

      // Carregar notificações de análises pendentes (sempre disponível se tiver UID)
      const analysisData = await notificationService.getPendingAnalyses(metaAdsUserId, selectedClient);
      setNotificationData(analysisData);

      // Carregar notificações do Meta Ads apenas se conectado
      if (isFacebookConnected) {
        const metaAdsData = await metaAdsNotificationService.getMetaAdsNotifications(selectedClient);
        setMetaAdsNotifications(metaAdsData.notifications);
      } else {
        setMetaAdsNotifications([]);
      }
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
      notificationService.loadClosedNotifications();
      const analysisData = await notificationService.getPendingAnalyses(metaAdsUserId, selectedClient);
      setNotificationData(analysisData);

      if (isFacebookConnected) {
        const metaAdsData = await metaAdsNotificationService.getMetaAdsNotifications(selectedClient, true);
        setMetaAdsNotifications(metaAdsData.notifications);
      }
    } catch (error) {
      console.error('🔔 [NOTIFICATION] Erro ao forçar atualização:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseNotification = (notificationId: string) => {
    notificationService.closeNotification(notificationId);
    loadNotifications();
  };

  useEffect(() => {
    loadNotifications();
  }, [isFacebookConnected, metaAdsUserId, selectedClient]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) loadNotifications();
  };

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

  const getBellIcon = () => {
    if (totalNotifications === 0) return <Bell className="w-5 h-5 transition-transform" />;
    if (hasUrgentNotifications) return <Bell className="w-5 h-5 transition-transform text-red-400 animate-pulse" />;
    return <Bell className="w-5 h-5 transition-transform text-amber-400" />;
  };

  return (
    <div className="relative group notification-button-wrapper" ref={dropdownRef}>
      <button
        onClick={handleClick}
        onMouseEnter={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const tooltipWidth = 300;
          let x = rect.left + (rect.width / 2) - (tooltipWidth / 2);
          let y = rect.bottom + 10;
          if (x < 10) x = 10;
          else if (x + tooltipWidth > window.innerWidth - 10) x = window.innerWidth - tooltipWidth - 10;

          if (typeof window !== 'undefined' && (window as any).setHeaderTooltip) {
            (window as any).setHeaderTooltip({
              visible: true,
              x: Math.max(10, x),
              y: Math.max(10, y),
              title: 'Central de Notificações',
              content: isFacebookConnected
                ? (totalNotifications > 0 ? `Você tem ${totalNotifications} notificação(ões) pendente(s)` : "Sem notificações pendentes")
                : "Conecte-se ao Meta Ads para alertas detalhados. Análises pendentes são mostradas sempre.",
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
        className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md relative ${isFacebookConnected ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-700/30'
          }`}
      >
        {getBellIcon()}
        {totalNotifications > 0 && (
          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold ${hasUrgentNotifications ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
            }`}>
            {totalNotifications > 9 ? '9+' : totalNotifications}
          </div>
        )}
      </button>

      {isOpen && createPortal(
        <div
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left, width: menuPos.width, zIndex: 9999 }}
          className="bg-slate-800 border border-slate-600/40 rounded-xl shadow-2xl overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 bg-slate-700/50 border-b border-slate-600/40">
            <h3 className="font-semibold text-slate-100 flex items-center gap-2">
              <Bell className="w-4 h-4" /> Notificações
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-400 border-t-transparent rounded-full mx-auto" /></div>
            ) : (
              <>
                {notificationData.pendingAnalyses.map(a => (
                  <div key={a.id} className="p-4 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className={`w-3.5 h-3.5 ${a.daysPastDue > 3 ? 'text-red-400' : 'text-amber-400'}`} />
                        <span className="text-sm font-medium text-slate-200">{a.client}</span>
                      </div>
                      <p className="text-xs text-slate-400">{a.product}</p>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{a.daysPastDue} dia(s) de atraso</p>
                    </div>
                    <button onClick={() => handleCloseNotification(a.id)} className="text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {isFacebookConnected && metaAdsNotifications.map(n => (
                  <div key={n.id} className="p-4 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${n.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium text-slate-200">{n.title}</span>
                    </div>
                    <p className="text-xs text-slate-400">{n.message}</p>
                    {n.actionUrl && (
                      <a href={n.actionUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-indigo-400 hover:text-indigo-300 mt-2 flex items-center gap-1">
                        <ExternalLink className="w-2.5 h-2.5" /> VER NO META ADS
                      </a>
                    )}
                  </div>
                ))}
                {totalNotifications === 0 && (
                  <div className="p-8 text-center">
                    <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Nenhuma notificação</p>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="p-3 bg-slate-700/30 border-t border-slate-600/40 text-center">
            <button onClick={handleForceRefresh} className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Atualizar Agora</button>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationButton;