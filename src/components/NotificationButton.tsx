import React, { useState, useEffect, useRef } from 'react';
import { Bell, Clock, AlertTriangle, Calendar, X, CheckCircle, TrendingUp } from 'lucide-react';
import { notificationService, NotificationData, PendingAnalysis } from '../services/notificationService';
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
  const [notificationData, setNotificationData] = useState<NotificationData>({
    pendingAnalyses: [],
    totalPending: 0,
    hasUrgent: false
  });
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
      return;
    }

    setIsLoading(true);
    try {
      const data = await notificationService.getPendingAnalyses(metaAdsUserId);
      setNotificationData(data);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Recarregar a cada 5 minutos, mas apenas se conectado
    const interval = isFacebookConnected ? setInterval(loadNotifications, 5 * 60 * 1000) : null;
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isFacebookConnected, metaAdsUserId]);

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
    if (!isOpen) {
      loadNotifications(); // Recarregar ao abrir
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
    // Fechar dropdown
    setIsOpen(false);
    
    // Implementar navegação para a seção de insights
    // Por enquanto, apenas scroll para insights ou alert
    const insightsSection = document.querySelector('[data-section="insights"]');
    if (insightsSection) {
      insightsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getBellIcon = () => {
    if (notificationData.hasUrgent) {
      return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform text-red-400" />;
    }
    if (notificationData.totalPending > 0) {
      return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-400" />;
    }
    return <Bell className="w-5 h-5 group-hover:scale-110 transition-transform" />;
  };

    return (
    <div className="relative group" ref={dropdownRef}>
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
        className={`p-3 rounded-xl transition-all duration-300 group shadow-sm hover:shadow-md relative ${
          isFacebookConnected 
            ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 cursor-pointer' 
            : 'text-slate-600 cursor-not-allowed opacity-50'
        }`}
        disabled={!isFacebookConnected}
      >
        {getBellIcon()}
        
        {/* Indicador de notificações */}
        {notificationData.totalPending > 0 && (
          <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold transition-all duration-200 ${
            notificationData.hasUrgent 
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 animate-pulse' 
              : 'bg-amber-500 text-white shadow-lg shadow-amber-500/50'
          }`}>
            {notificationData.totalPending > 9 ? '9+' : notificationData.totalPending}
          </div>
        )}
      </button>

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
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Conteúdo */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mx-auto mb-3"></div>
                <p className="text-slate-400">Carregando notificações...</p>
              </div>
            ) : notificationData.pendingAnalyses.length === 0 ? (
              <div className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3 opacity-50" />
                <p className="text-slate-300 font-medium">Tudo em dia!</p>
                <p className="text-slate-400 text-sm mt-1">Não há análises pendentes</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-600/30">
                {notificationData.pendingAnalyses.map((analysis) => (
                  <NotificationItem
                    key={analysis.id}
                    analysis={analysis}
                    onNavigate={() => navigateToInsights(analysis)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificationData.pendingAnalyses.length > 0 && (
            <div className="p-4 bg-slate-700/30 border-t border-slate-600/40">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">
                  {notificationData.totalPending} análise(s) pendente(s)
                </span>
                <button
                  onClick={loadNotifications}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </div>
          )}
        </div>, document.body)
      }
    </div>
  );
};

interface NotificationItemProps {
  analysis: PendingAnalysis;
  onNavigate: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ analysis, onNavigate }) => {
  const urgencyLevel = notificationService.getUrgencyLevel(analysis.daysPastDue);
  const urgencyColor = notificationService.getUrgencyColor(urgencyLevel);
  const urgencyBg = notificationService.getUrgencyBg(urgencyLevel);

  const getUrgencyIcon = () => {
    if (urgencyLevel === 'critical') return <AlertTriangle className="w-4 h-4" />;
    return <Clock className="w-4 h-4" />;
  };

  const getUrgencyText = () => {
    if (analysis.daysPastDue === 1) return '1 dia de atraso';
    return `${analysis.daysPastDue} dias de atraso`;
  };

  return (
    <div
      onClick={onNavigate}
      className="p-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-lg ${urgencyBg} ${urgencyColor}`}>
          {getUrgencyIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-slate-100 truncate">
              {analysis.product}
            </h4>
            <span className={`px-2 py-1 text-xs rounded-full font-medium ${urgencyBg} ${urgencyColor}`}>
              {getUrgencyText()}
            </span>
          </div>
          
          <p className="text-sm text-slate-300 mb-2">
            Cliente: {analysis.client}
            {analysis.audience && analysis.audience !== 'sem-publico' && (
              <> • Público: {analysis.audience}</>
            )}
          </p>
          
          <div className="flex items-center gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Última: {notificationService.formatDateBR(analysis.lastAnalysisDate)}</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              <span>Intervalo: {analysis.intervalDays} dias</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationButton; 