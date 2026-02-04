import { analysisPlannerService, AnalysisPlannerRecord } from './analysisPlannerService';
import { authService } from './authService';
import { firestoreNotificationService } from './firestoreNotificationService';

export interface PendingAnalysis {
  id: string;
  client: string;
  product: string;
  audience?: string;
  lastAnalysisDate: string;
  daysPastDue: number;
  plannedNextDate: string;
  intervalDays: number;
  isClosed?: boolean; // Nova propriedade para notificações fechadas
}

export interface NotificationData {
  pendingAnalyses: PendingAnalysis[];
  totalPending: number;
  hasUrgent: boolean; // mais de 3 dias de atraso
}

class NotificationService {
  
  // Cache local para notificações fechadas
  private closedNotifications = new Set<string>();

  // Marcar notificação como fechada
  closeNotification(notificationId: string): void {
    this.closedNotifications.add(notificationId);
    // Persistir no localStorage para manter entre sessões
    const closedArray = Array.from(this.closedNotifications);
    localStorage.setItem('closedNotifications', JSON.stringify(closedArray));
  }

  // Verificar se notificação está fechada
  isNotificationClosed(notificationId: string): boolean {
    return this.closedNotifications.has(notificationId);
  }

  // Carregar notificações fechadas do localStorage
  loadClosedNotifications(): void {
    
    try {
      const closed = localStorage.getItem('closedNotifications');
      
      if (closed) {
        this.closedNotifications = new Set(JSON.parse(closed));
        
      } else {
        
      }
    } catch (error) {
      console.warn('Erro ao carregar notificações fechadas:', error);
    }
  }

  // Limpar todas as notificações fechadas
  clearClosedNotifications(): void {
    this.closedNotifications.clear();
    localStorage.removeItem('closedNotifications');
  }

  async getPendingAnalyses(metaAdsUserId?: string, selectedClient?: string): Promise<NotificationData> {
    try {
      const user = authService.getCurrentUser();
      if (!user?.uid) {
        return { pendingAnalyses: [], totalPending: 0, hasUrgent: false };
      }

      // Se não há cliente selecionado, não mostrar notificações
      if (!selectedClient || selectedClient === 'Selecione um cliente') {
        return { pendingAnalyses: [], totalPending: 0, hasUrgent: false };
      }

      // Se metaAdsUserId for fornecido, usar esse ID para buscar as análises vinculadas ao Meta Ads
      // Caso contrário, usar o ID do usuário Firebase
      const userId = metaAdsUserId || user.uid;

      // Buscar todas as análises planejadas do usuário
      const allPlanners = await analysisPlannerService.listAllPlanners(userId);
      
      
      
      
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD
      
      const pendingAnalyses: PendingAnalysis[] = [];

      for (const planner of allPlanners) {
        // Filtrar apenas análises do cliente selecionado
        if (planner.client !== selectedClient) {
          continue;
        }

        if (!planner.lastAnalysisDate || !planner.intervalDays) {
          continue; // Pular registros sem data de análise ou intervalo
        }

        // Calcular a próxima data planejada
        const lastDate = new Date(planner.lastAnalysisDate);
        const nextDate = new Date(lastDate);
        nextDate.setDate(lastDate.getDate() + planner.intervalDays);
        
        const nextDateStr = nextDate.toISOString().slice(0, 10);
        
        // Verificar se a análise está em atraso
        if (nextDateStr < todayStr) {
          const daysPastDue = Math.floor((today.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));
          
          pendingAnalyses.push({
            id: `${planner.client}_${planner.product}_${planner.audience || 'default'}`,
            client: planner.client,
            product: planner.product,
            audience: planner.audience,
            lastAnalysisDate: planner.lastAnalysisDate,
            daysPastDue,
            plannedNextDate: nextDateStr,
            intervalDays: planner.intervalDays
          });
        }
      }

      
      
      // Filtrar notificações fechadas
      const filteredAnalyses = pendingAnalyses.filter(p => !this.isNotificationClosed(p.id));

      
      
      

      

      // Ordenar por dias de atraso (mais urgentes primeiro)
      filteredAnalyses.sort((a, b) => b.daysPastDue - a.daysPastDue);

      const hasUrgent = filteredAnalyses.some(p => p.daysPastDue > 3);

      // Sincronizar notificações no Firestore para cross-browser sync
      if (metaAdsUserId && pendingAnalyses.length > 0) {
        try {
          await firestoreNotificationService.syncPendingAnalysisNotifications(
            userId,
            pendingAnalyses.map(p => ({
              id: p.id,
              client: p.client,
              product: p.product,
              audience: p.audience,
              daysPastDue: p.daysPastDue
            }))
          );
        } catch (syncError) {
          console.warn('Erro ao sincronizar notificações:', syncError);
        }
      }

      const result = {
        pendingAnalyses: filteredAnalyses,
        totalPending: filteredAnalyses.length,
        hasUrgent
      };

      

      return result;

    } catch (error) {
      console.error('Erro ao buscar análises pendentes:', error);
      return { pendingAnalyses: [], totalPending: 0, hasUrgent: false };
    }
  }

  formatDateBR(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  }

  getUrgencyLevel(daysPastDue: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysPastDue <= 1) return 'low';
    if (daysPastDue <= 3) return 'medium';
    if (daysPastDue <= 7) return 'high';
    return 'critical';
  }

  getUrgencyColor(level: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: 'text-yellow-400',
      medium: 'text-orange-400',
      high: 'text-red-400',
      critical: 'text-red-500'
    };
    return colors[level];
  }

  getUrgencyBg(level: 'low' | 'medium' | 'high' | 'critical'): string {
    const colors = {
      low: 'bg-yellow-500/20 border-yellow-500/30',
      medium: 'bg-orange-500/20 border-orange-500/30',
      high: 'bg-red-500/20 border-red-500/30',
      critical: 'bg-red-600/30 border-red-600/50'
    };
    return colors[level];
  }
}

export const notificationService = new NotificationService();

