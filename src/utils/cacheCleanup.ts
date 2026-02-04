/**
 * Utilitário para limpeza completa de todos os caches e dados inconsistentes
 * que podem estar causando discrepâncias nas métricas
 */

import { metricsService } from '../services/metricsService';
import { metaAdsService } from '../services/metaAdsService';

export class CacheCleanup {
  /**
   * Limpa completamente todos os caches e dados armazenados
   */
  static async clearAllCachesAndData(): Promise<void> {
    
    
    try {
      // 1. Limpar caches de memória dos serviços
      
      await metricsService.clearAllCacheAndStorage();
      await metaAdsService.clearAllCache();
      
      // 2. Limpar localStorage específico
      
      this.clearLocalStorage();
      
      // 3. Limpar sessionStorage
      
      this.clearSessionStorage();
      
      // 4. Forçar refresh dos dados
      
      await this.forceDataRefresh();
      
      
      
      // Recarregar a página para garantir estado limpo
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Erro durante limpeza de caches:', error);
      throw error;
    }
  }
  
  /**
   * Limpa todos os itens relevantes do localStorage
   */
  private static clearLocalStorage(): void {
    const keysToRemove = [
      // Seleções de cliente/produto/audiência
      'currentSelectedClient',
      'currentSelectedProduct', 
      'currentSelectedAudience',
      'selectedCampaignId',
      'selectedAdSetId',
      'campaignId',
      'productId',
      'audienceId',
      
      // Dados de Meta Ads
      'metaAds_adsets',
      'metaAds_campaigns',
      'metaAds_insights',
      'metaAds_accounts',
      
      // Dados de métricas e benchmarks
      'metrics_cache',
      'benchmark_data',
      'monthly_details',
      'audience_details',
      
      // Dados de análise e planejamento
      'analysis_data',
      'planner_data',
      'ad_strategies',
      
      // Configurações e preferências
      'user_preferences',
      'dashboard_settings',
      'report_settings',
      
      // Dados temporários
      'temp_data',
      'cached_results',
      'last_sync',
      'sync_timestamp'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        
      } catch (error) {
        console.warn(`⚠️ Erro ao remover ${key}:`, error);
      }
    });
    
    // Limpar todas as chaves que começam com prefixos específicos
    const prefixesToClear = ['metaAds_', 'metrics_', 'cache_', 'temp_', 'audience_', 'campaign_'];
    
    Object.keys(localStorage).forEach(key => {
      if (prefixesToClear.some(prefix => key.startsWith(prefix))) {
        try {
          localStorage.removeItem(key);
          
        } catch (error) {
          console.warn(`⚠️ Erro ao remover ${key}:`, error);
        }
      }
    });
  }
  
  /**
   * Limpa sessionStorage
   */
  private static clearSessionStorage(): void {
    try {
      sessionStorage.clear();
      
    } catch (error) {
      console.warn('⚠️ Erro ao limpar sessionStorage:', error);
    }
  }
  
  /**
   * Força refresh de todos os dados dos serviços
   */
  private static async forceDataRefresh(): Promise<void> {
    try {
      // Forçar refresh no metricsService
      await metricsService.forceRefresh();
      
      // Limpar caches específicos por tipo
      await metaAdsService.clearCacheByType('adsets');
      await metaAdsService.clearCacheByType('campaigns');
      await metaAdsService.clearCacheByType('insights');
      await metaAdsService.clearMetricsCache();
      
      
    } catch (error) {
      console.warn('⚠️ Erro durante refresh forçado:', error);
    }
  }
  
  /**
   * Limpa caches específicos de um cliente
   */
  static async clearClientSpecificCache(clientId: string): Promise<void> {
    
    
    try {
      // Limpar cache por cliente no metricsService
      await metricsService.clearCacheByClient(clientId);
      
      // Limpar dados específicos do localStorage
      const clientKeys = Object.keys(localStorage).filter(key => 
        key.includes(clientId) || key.includes(`client_${clientId}`)
      );
      
      clientKeys.forEach(key => {
        localStorage.removeItem(key);
        
      });
      
      
    } catch (error) {
      console.error(`❌ Erro ao limpar cache do cliente ${clientId}:`, error);
    }
  }
  
  /**
   * Limpa caches de um período específico
   */
  static async clearPeriodSpecificCache(period: string): Promise<void> {
    
    
    try {
      await metricsService.clearCacheByPeriod(period);
      
    } catch (error) {
      console.error(`❌ Erro ao limpar cache do período ${period}:`, error);
    }
  }
  
  /**
   * Verifica se existem dados inconsistentes nos caches
   */
  static async checkCacheConsistency(): Promise<{
    hasInconsistencies: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    
    try {
      // Verificar localStorage
      const selectedClient = localStorage.getItem('currentSelectedClient');
      const selectedProduct = localStorage.getItem('currentSelectedProduct');
      const selectedCampaign = localStorage.getItem('selectedCampaignId');
      const selectedAdSet = localStorage.getItem('selectedAdSetId');
      
      if (selectedClient && !selectedProduct) {
        issues.push('Cliente selecionado mas produto não definido');
      }
      
      if (selectedProduct && !selectedClient) {
        issues.push('Produto selecionado mas cliente não definido');
      }
      
      if (selectedCampaign && !selectedProduct) {
        issues.push('Campanha selecionada mas produto não definido');
      }
      
      if (selectedAdSet && !selectedCampaign) {
        issues.push('Conjunto de anúncios selecionado mas campanha não definida');
      }
      
      // Verificar dados órfãos no localStorage
      const orphanKeys = Object.keys(localStorage).filter(key => 
        key.startsWith('metaAds_') || key.startsWith('metrics_') || key.startsWith('cache_')
      );
      
      if (orphanKeys.length > 10) {
        issues.push(`Muitos dados órfãos no localStorage: ${orphanKeys.length} chaves`);
      }
      
      
      
      return {
        hasInconsistencies: issues.length > 0,
        issues
      };
      
    } catch (error) {
      console.error('❌ Erro durante verificação de consistência:', error);
      return {
        hasInconsistencies: true,
        issues: ['Erro durante verificação de consistência']
      };
    }
  }
  
  /**
   * Executa diagnóstico completo dos caches
   */
  static async runDiagnostics(): Promise<void> {
    
    
    // Verificar consistência
    const consistency = await this.checkCacheConsistency();
    
    if (consistency.hasInconsistencies) {
      console.warn('⚠️ Inconsistências encontradas:', consistency.issues);
    } else {
      
    }
    
    // Verificar tamanho dos caches
    const localStorageSize = JSON.stringify(localStorage).length;
    const sessionStorageSize = JSON.stringify(sessionStorage).length;
    
    
    
    
    if (localStorageSize > 5 * 1024 * 1024) { // 5MB
      console.warn('⚠️ localStorage muito grande, considere limpeza');
    }
  }
}

// Função de conveniência para uso global
export const clearAllCaches = () => CacheCleanup.clearAllCachesAndData();
export const runCacheDiagnostics = () => CacheCleanup.runDiagnostics();

// Adicionar ao objeto window para uso no console do navegador
if (typeof window !== 'undefined') {
  (window as any).clearAllCaches = clearAllCaches;
  (window as any).runCacheDiagnostics = runCacheDiagnostics;
  (window as any).CacheCleanup = CacheCleanup;
}