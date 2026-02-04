import { metaAdsService } from './metaAdsService';

export interface MetaAdsNotification {
  id: string;
  type: 'account_alert' | 'campaign_alert' | 'billing_alert' | 'performance_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  accountId?: string;
  campaignId?: string;
  adSetId?: string;
  adId?: string;
  createdAt: string;
  isResolved: boolean;
  actionRequired: boolean;
  actionUrl?: string;
}

export interface MetaAdsNotificationData {
  notifications: MetaAdsNotification[];
  totalCount: number;
  hasCritical: boolean;
  hasActionRequired: boolean;
}

class MetaAdsNotificationService {
  private cache = new Map<string, { data: MetaAdsNotificationData; timestamp: number }>();
  // 🎯 OTIMIZAÇÃO: Aumentar cache para 15 minutos para reduzir requisições
  private readonly CACHE_TTL = 15 * 60 * 1000; // 15 minutos

  /**
   * Buscar todas as notificações do Meta Ads
   */
  async getMetaAdsNotifications(selectedClient?: string, forceRefresh: boolean = false): Promise<MetaAdsNotificationData> {
    try {
      // Se não há cliente selecionado, não mostrar notificações
      if (!selectedClient || selectedClient === 'Selecione um cliente') {
        
        return {
          notifications: [],
          totalCount: 0,
          hasCritical: false,
          hasActionRequired: false
        };
      }

      // Verificar cache primeiro (ignorar se forceRefresh = true)
      const cacheKey = `metaAds_notifications_${selectedClient}`;
      const cached = this.cache.get(cacheKey);
      if (!forceRefresh && cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
        
        return cached.data;
      }

      

      const notifications: MetaAdsNotification[] = [];

      // 🎯 OTIMIZAÇÃO: Fazer requisições apenas se Meta Ads estiver conectado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        
        const result = {
          notifications: [],
          totalCount: 0,
          hasCritical: false,
          hasActionRequired: false
        };
        
        // Salvar no cache mesmo que vazio
        this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
        return result;
      }

      // 1. Buscar alertas de conta
      const accountAlerts = await this.getAccountAlerts(selectedClient);
      notifications.push(...accountAlerts);

      // 2. Buscar alertas de campanha (filtrados)
      const campaignAlerts = await this.getCampaignAlerts(selectedClient);
      // 🎯 FILTRO: Remover notificações de campanhas pausadas
      const filteredCampaignAlerts = campaignAlerts.filter(alert => 
        !alert.title.includes('Pausada') && !alert.message.includes('pausada')
      );
      
      // Log para debug (remover depois)
      if (campaignAlerts.length > filteredCampaignAlerts.length) {
        console.log(`🔔 [META ADS NOTIFICATIONS] Filtradas ${campaignAlerts.length - filteredCampaignAlerts.length} notificações de campanhas pausadas`);
      }
      
      notifications.push(...filteredCampaignAlerts);

      // 3. Buscar alertas de billing
      const billingAlerts = await this.getBillingAlerts(selectedClient);
      notifications.push(...billingAlerts);

      // 4. Buscar alertas de performance
      const performanceAlerts = await this.getPerformanceAlerts(selectedClient);
      notifications.push(...performanceAlerts);

      const result: MetaAdsNotificationData = {
        notifications: notifications.sort((a, b) => {
          // Ordenar por severidade e data
          const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aSeverity = severityOrder[a.severity] || 1;
          const bSeverity = severityOrder[b.severity] || 1;
          
          if (aSeverity !== bSeverity) {
            return bSeverity - aSeverity;
          }
          
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }),
        totalCount: notifications.length,
        hasCritical: notifications.some(n => n.severity === 'critical'),
        hasActionRequired: notifications.some(n => n.actionRequired)
      };

      // Salvar no cache
      this.cache.set(cacheKey, { data: result, timestamp: Date.now() });
      
      

      return result;
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao buscar notificações do Meta Ads:', error);
      return {
        notifications: [],
        totalCount: 0,
        hasCritical: false,
        hasActionRequired: false
      };
    }
  }

  /**
   * Buscar alertas de conta
   */
  private async getAccountAlerts(selectedClient?: string): Promise<MetaAdsNotification[]> {
    try {
      const selectedAccount = metaAdsService.getSelectedAccount();
      if (!selectedAccount) return [];

      const alerts: MetaAdsNotification[] = [];

      // Verificar status da conta
      if (selectedAccount.account_status !== 1) {
        alerts.push({
          id: `account_status_${selectedAccount.id}`,
          type: 'account_alert',
          severity: 'critical',
          title: 'Conta Suspensa',
          message: `A conta de anúncios "${selectedAccount.name}" está suspensa. Os anúncios não estão sendo veiculados.`,
          accountId: selectedAccount.id,
          createdAt: new Date().toISOString(),
          isResolved: false,
          actionRequired: true,
          actionUrl: `https://business.facebook.com/adsmanager/manage/accounts?act=${selectedAccount.id}`
        });
      }

      // Buscar informações de billing reais via API do Meta Ads
      const billingInfo = await this.getBillingInfo(selectedAccount.id);
      if (billingInfo.hasIssues) {
        alerts.push({
          id: `billing_${selectedAccount.id}`,
          type: 'billing_alert',
          severity: billingInfo.severity,
          title: 'Problema de Pagamento',
          message: billingInfo.message,
          accountId: selectedAccount.id,
          createdAt: new Date().toISOString(),
          isResolved: false,
          actionRequired: true,
          actionUrl: `https://business.facebook.com/adsmanager/manage/accounts?act=${selectedAccount.id}&tab=billing`
        });
      }

      return alerts;
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao buscar alertas de conta:', error);
      return [];
    }
  }

  /**
   * Buscar alertas de campanha
   */
  private async getCampaignAlerts(selectedClient?: string): Promise<MetaAdsNotification[]> {
    try {
      const selectedAccount = metaAdsService.getSelectedAccount();
      if (!selectedAccount) return [];

      const alerts: MetaAdsNotification[] = [];

      // Buscar campanhas com problemas
      const campaigns = await metaAdsService.getCampaigns();
      
      for (const campaign of campaigns) {
        if (campaign.status !== 'ACTIVE') {
          alerts.push({
            id: `campaign_${campaign.id}`,
            type: 'campaign_alert',
            severity: campaign.status === 'PAUSED' ? 'medium' : 'high',
            title: `Campanha ${campaign.status === 'PAUSED' ? 'Pausada' : 'Com Problemas'}`,
            message: `A campanha "${campaign.name}" está ${campaign.status.toLowerCase()}.`,
            accountId: selectedAccount.id,
            campaignId: campaign.id,
            createdAt: new Date().toISOString(),
            isResolved: false,
            actionRequired: true,
            actionUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${selectedAccount.id}&selected_campaign_ids=${campaign.id}`
          });
        }
      }

      return alerts;
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao buscar alertas de campanha:', error);
      return [];
    }
  }

  /**
   * Buscar alertas de billing
   */
  private async getBillingAlerts(selectedClient?: string): Promise<MetaAdsNotification[]> {
    try {
      const selectedAccount = metaAdsService.getSelectedAccount();
      if (!selectedAccount) return [];

      const alerts: MetaAdsNotification[] = [];

      // Verificar informações de billing via API
      const billingInfo = await this.getBillingInfo(selectedAccount.id);
      
      if (billingInfo.hasIssues) {
        alerts.push({
          id: `billing_alert_${selectedAccount.id}`,
          type: 'billing_alert',
          severity: billingInfo.severity,
          title: 'Alerta de Pagamento',
          message: billingInfo.message,
          accountId: selectedAccount.id,
          createdAt: new Date().toISOString(),
          isResolved: false,
          actionRequired: billingInfo.actionRequired,
          actionUrl: billingInfo.actionUrl
        });
      }

      return alerts;
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao buscar alertas de billing:', error);
      return [];
    }
  }

  /**
   * Buscar alertas de performance
   */
  private async getPerformanceAlerts(selectedClient?: string): Promise<MetaAdsNotification[]> {
    try {
      const selectedAccount = metaAdsService.getSelectedAccount();
      if (!selectedAccount) return [];

      const alerts: MetaAdsNotification[] = [];

      // Buscar campanhas ativas e verificar performance
      const campaigns = await metaAdsService.getCampaigns();
      const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE');

      for (const campaign of activeCampaigns) {
        // Buscar insights dos últimos 7 dias
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const insights = await metaAdsService.getCampaignInsights(campaign.id, startDate, endDate);
        
        if (insights && insights.length > 0) {
          const totalSpend = insights.reduce((sum, insight) => sum + (Number(insight.spend) || 0), 0);
          const totalImpressions = insights.reduce((sum, insight) => sum + (Number(insight.impressions) || 0), 0);
          
          // Verificar se há problemas de performance
          if (totalSpend > 0 && totalImpressions === 0) {
            alerts.push({
              id: `performance_${campaign.id}`,
              type: 'performance_alert',
              severity: 'high',
              title: 'Problema de Entrega',
              message: `A campanha "${campaign.name}" não está gerando impressões apesar de ter gasto R$ ${totalSpend.toFixed(2)}.`,
              accountId: selectedAccount.id,
              campaignId: campaign.id,
              createdAt: new Date().toISOString(),
              isResolved: false,
              actionRequired: true,
              actionUrl: `https://business.facebook.com/adsmanager/manage/campaigns?act=${selectedAccount.id}&selected_campaign_ids=${campaign.id}`
            });
          }
        }
      }

      return alerts;
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao buscar alertas de performance:', error);
      return [];
    }
  }

  /**
   * Buscar informações de billing
   */
  private async getBillingInfo(accountId: string): Promise<{
    hasIssues: boolean;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    actionRequired: boolean;
    actionUrl?: string;
  }> {
    try {
      // Usar a conta selecionada diretamente
      const selectedAccount = metaAdsService.getSelectedAccount();
      
      if (!selectedAccount) {
        return {
          hasIssues: false,
          severity: 'low',
          message: '',
          actionRequired: false
        };
      }

      // Verificar problemas de billing baseado no status da conta
      const hasBillingIssues = selectedAccount.account_status !== 1;

      if (hasBillingIssues) {
        let message = '';
        let severity: 'low' | 'medium' | 'high' | 'critical' = 'critical';
        let actionRequired = true;

        if (selectedAccount.account_status === 2) {
          message = 'A conta de anúncios foi desabilitada. Verifique o pagamento e entre em contato com o suporte.';
          severity = 'critical';
        } else if (selectedAccount.account_status === 3) {
          message = 'A conta de anúncios foi excluída.';
          severity = 'critical';
        } else if (selectedAccount.account_status === 7) {
          message = 'A conta de anúncios foi suspensa temporariamente.';
          severity = 'high';
        } else if (selectedAccount.account_status === 8) {
          message = 'A conta de anúncios está em processo de revisão.';
          severity = 'medium';
        } else {
          message = `A conta de anúncios tem problemas de status (${selectedAccount.account_status}). Verifique o pagamento.`;
          severity = 'critical';
        }

        return {
          hasIssues: true,
          severity,
          message,
          actionRequired,
          actionUrl: `https://business.facebook.com/adsmanager/manage/accounts?act=${accountId}&tab=billing`
        };
      }

      return {
        hasIssues: false,
        severity: 'low',
        message: '',
        actionRequired: false
      };
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao buscar informações de billing:', error);
      return {
        hasIssues: false,
        severity: 'low',
        message: '',
        actionRequired: false
      };
    }
  }

  /**
   * Marcar notificação como resolvida
   */
  async markNotificationAsResolved(notificationId: string): Promise<void> {
    try {
      // Aqui você pode implementar a lógica para marcar como resolvida
      // Por exemplo, salvar no localStorage ou no Firestore
      const resolvedNotifications = JSON.parse(localStorage.getItem('metaAds_resolvedNotifications') || '[]');
      resolvedNotifications.push(notificationId);
      localStorage.setItem('metaAds_resolvedNotifications', JSON.stringify(resolvedNotifications));
      
      // Limpar cache para forçar nova busca
      this.cache.clear();
    } catch (error) {
      console.error('🔔 [META ADS NOTIFICATIONS] Erro ao marcar notificação como resolvida:', error);
    }
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    
    this.cache.clear();
  }
}

export const metaAdsNotificationService = new MetaAdsNotificationService();
