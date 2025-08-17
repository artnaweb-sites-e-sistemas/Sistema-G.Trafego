import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  DollarSign, 
  Target, 
  Play, 
  Pause,
  BarChart3,
  Crown,
  Star,
  Zap,
  Settings,
  Download,
  Share2,
  Users,
  Activity,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Loader2,
  Database
} from 'lucide-react';
import { metaAdsService } from '../services/metaAdsService';

interface AdMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  spend: number;
  revenue: number;
  cpr: number;
  reach?: number;
  frequency?: number;
  cpm?: number;
  // Métricas dos últimos 7 dias para cálculo de tendência
  last7DaysCpr?: number;
  last7DaysCtr?: number;
  last7DaysConversions?: number;
  // Métricas dos últimos 3 dias para termômetro imediato
  last3DaysCpr?: number;
  last3DaysCtr?: number;
  last3DaysConversions?: number;
  // Métricas dos períodos anteriores para comparação
  previous7DaysCpr?: number;
  previous7DaysCtr?: number;
  previous7DaysConversions?: number;
  previous3DaysCpr?: number;
  previous3DaysCtr?: number;
  previous3DaysConversions?: number;
}

interface AdData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'active' | 'paused' | 'draft';
  rank: number;
  metrics: AdMetrics;
  trend: 'up' | 'down' | 'stable' | 'collecting';
  category: string;
  lastUpdated: string;
  adset_id?: string;
  campaign_id?: string;
  adLink?: string;
  createdTime?: string;
  performanceScore?: number;
  performanceScoreMetrics?: {
    cpr: number;
    cpc: number;
    conversions: number;
    frequency: number;
    objetivo?: string;
    tipoConversao?: string;
    cprIdeal?: number;
  };
}

interface PerformanceAdsSectionProps {
  onBack?: () => void;
}




const PerformanceAdsSection: React.FC<PerformanceAdsSectionProps> = ({ onBack }) => {
  const [selectedTab, setSelectedTab] = useState('all');
  const [hoveredAd, setHoveredAd] = useState<string | null>(null);
  const [selectedAd, setSelectedAd] = useState<string | null>(null);
  const [ads, setAds] = useState<AdData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [tooltipAdId, setTooltipAdId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [metricTooltip, setMetricTooltip] = useState<{ adId: string; metric: 'cpr' | 'cpc' | 'ctr' | 'freq'; position: { x: number; y: number } } | null>(null);
  const portalRef = useRef<HTMLElement | null>(null);
  const metricTooltipWrapperRef = useRef<HTMLDivElement | null>(null);
  const handleCardMouseLeave = (adId: string, e: React.MouseEvent) => {
    // Se o mouse está indo para dentro do tooltip portal, não feche
    if (metricTooltipWrapperRef.current) {
      const next = e.relatedTarget as Node | null;
      if (next && metricTooltipWrapperRef.current.contains(next)) {
        return;
      }
    }
    setHoveredAd(null);
    setMetricTooltip(null);
  };

  useEffect(() => {
    let el = document.getElementById('tooltip-portal-root') as HTMLElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = 'tooltip-portal-root';
      el.style.position = 'fixed';
      el.style.left = '0';
      el.style.top = '0';
      el.style.width = '0';
      el.style.height = '0';
      el.style.zIndex = '2147483647';
      document.body.appendChild(el);
    }
    portalRef.current = el;
  }, []);
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar dados reais do Meta Ads
  const fetchRealAdsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar se o Meta Ads está configurado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        
        setAds([]);
        setLastSync('Meta Ads não configurado');
        return;
      }

      // Testar disponibilidade de dados na conta (silencioso)
      try {
        const dataAvailability = await metaAdsService.testAccountDataAvailability();
        
      } catch (error) {
        // Não logar erro no console em produção
      }

      // Obter período selecionado do localStorage
      const selectedMonth = localStorage.getItem('selectedMonth') || '';
      const selectedClient = localStorage.getItem('currentSelectedClient') || '';
      const selectedProduct = localStorage.getItem('currentSelectedProduct') || '';
      const selectedAudience = localStorage.getItem('currentSelectedAudience') || '';
      const selectedCampaignId = localStorage.getItem('selectedCampaignId') || '';
      const selectedAdSetId = localStorage.getItem('selectedAdSetId') || '';
      


      

      // Calcular período - se não há mês selecionado, usar o mês atual
      const getPeriodDates = (month: string) => {
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        if (!month || month.trim() === '') {
          // Se não há mês selecionado, usar o mês atual
          const now = new Date();
          return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
          };
        }
        
        const [monthName, yearStr] = month.split(' ');
        const year = parseInt(yearStr) || new Date().getFullYear();
        const monthIndex = months.findIndex(m => m.toLowerCase() === monthName.toLowerCase());
        
        if (monthIndex === -1) {
          const now = new Date();
          return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
          };
        }
        
        // Validar se o período não é futuro
        const now = new Date();
        const requestedEndDate = new Date(year, monthIndex + 1, 0);
        
        if (requestedEndDate > now) {
          // Período futuro detectado - usar mês atual silenciosamente
          return {
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
          };
        }
        
        const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
        const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];
        
        return { startDate, endDate };
      };

      const getLast7DaysDates = (month: string) => {
        // Calcular os últimos 7 dias do período selecionado
        const { startDate, endDate } = getPeriodDates(month);
        const periodEnd = new Date(endDate);
        const now = new Date();
        
        // Se a data final do período é futura, ajustar para hoje
        const actualEndDate = periodEnd > now ? now : periodEnd;
        
        // Calcular início dos últimos 7 dias
        const last7DaysStart = new Date(actualEndDate);
        last7DaysStart.setDate(actualEndDate.getDate() - 6); // 7 dias atrás (incluindo hoje)
        
        return {
          startDate: last7DaysStart.toISOString().split('T')[0],
          endDate: actualEndDate.toISOString().split('T')[0]
        };
      };

      const getPrevious7DaysDates = (month: string) => {
        // Calcular os 7 dias anteriores aos últimos 7 dias (para comparação de tendência)
        const { startDate, endDate } = getPeriodDates(month);
        const periodEnd = new Date(endDate);
        const now = new Date();
        
        // Se a data final do período é futura, ajustar para hoje
        const actualEndDate = periodEnd > now ? now : periodEnd;
        
        // Calcular fim dos 7 dias anteriores (dia anterior ao início dos últimos 7 dias)
        const previous7DaysEnd = new Date(actualEndDate);
        previous7DaysEnd.setDate(actualEndDate.getDate() - 7);
        
        // Calcular início dos 7 dias anteriores 
        const previous7DaysStart = new Date(previous7DaysEnd);
        previous7DaysStart.setDate(previous7DaysEnd.getDate() - 6);
        
        return {
          startDate: previous7DaysStart.toISOString().split('T')[0],
          endDate: previous7DaysEnd.toISOString().split('T')[0]
        };
      };

      const getLast3DaysDates = (month: string) => {
        // Calcular os últimos 3 dias do período selecionado
        const { startDate, endDate } = getPeriodDates(month);
        const periodEnd = new Date(endDate);
        const now = new Date();
        
        // Se a data final do período é futura, ajustar para hoje
        const actualEndDate = periodEnd > now ? now : periodEnd;
        
        // Calcular início dos últimos 3 dias
        const last3DaysStart = new Date(actualEndDate);
        last3DaysStart.setDate(actualEndDate.getDate() - 2); // 3 dias atrás (incluindo hoje)
        
        return {
          startDate: last3DaysStart.toISOString().split('T')[0],
          endDate: actualEndDate.toISOString().split('T')[0]
        };
      };

      const getPrevious3DaysDates = (month: string) => {
        // Calcular os 3 dias anteriores aos últimos 3 dias (para comparação de alertas)
        const { startDate, endDate } = getPeriodDates(month);
        const periodEnd = new Date(endDate);
        const now = new Date();
        
        // Se a data final do período é futura, ajustar para hoje
        const actualEndDate = periodEnd > now ? now : periodEnd;
        
        // Calcular fim dos 3 dias anteriores (dia anterior ao início dos últimos 3 dias)
        const previous3DaysEnd = new Date(actualEndDate);
        previous3DaysEnd.setDate(actualEndDate.getDate() - 3);
        
        // Calcular início dos 3 dias anteriores 
        const previous3DaysStart = new Date(previous3DaysEnd);
        previous3DaysStart.setDate(previous3DaysEnd.getDate() - 2);
        
        return {
          startDate: previous3DaysStart.toISOString().split('T')[0],
          endDate: previous3DaysEnd.toISOString().split('T')[0]
        };
      };

      const { startDate, endDate } = getPeriodDates(selectedMonth);
      const { startDate: last7DaysStart, endDate: last7DaysEnd } = getLast7DaysDates(selectedMonth);
      const { startDate: last3DaysStart, endDate: last3DaysEnd } = getLast3DaysDates(selectedMonth);
      const { startDate: previous7DaysStart, endDate: previous7DaysEnd } = getPrevious7DaysDates(selectedMonth);
      const { startDate: previous3DaysStart, endDate: previous3DaysEnd } = getPrevious3DaysDates(selectedMonth);
      
      
      
      
      
      
      
      // Buscar anúncios do Meta Ads
      
      const metaAds = await metaAdsService.getAds(selectedAdSetId, selectedCampaignId);
      
      
      
      if (metaAds.length === 0) {
        
        setAds([]);
        setLastSync('Nenhum anúncio encontrado');
        return;
      }

      // Buscar insights para cada anúncio
      const adsWithInsights: AdData[] = [];
      
      for (const ad of metaAds) {
        try {
          
          
          
          if (ad.effective_object_story_id) {
            
            } else {
            
            }
          
          // Buscar insights separadamente: período selecionado, últimos 7 dias, últimos 3 dias, períodos anteriores e período total
          let periodInsights: any[] = [];
          let last7DaysInsights: any[] = [];
          let last3DaysInsights: any[] = [];
          let previous7DaysInsights: any[] = [];
          let previous3DaysInsights: any[] = [];
          let allTimeInsights: any[] = [];
          
          try {
            // Buscar insights de todos os meses ativos do anúncio (desde criação até hoje)
            if (ad.created_time) {
              const createdDate = new Date(ad.created_time);
              const today = new Date();
              const allTimeStartDate = createdDate.toISOString().split('T')[0];
              const allTimeEndDate = today.toISOString().split('T')[0];
              
              
              allTimeInsights = await metaAdsService.getAdInsights(ad.id, allTimeStartDate, allTimeEndDate, true); // Buscar agregado para todas as métricas
              
              
              // Buscar insights do período selecionado (para exibição das métricas nos cards)
              periodInsights = await metaAdsService.getAdInsights(ad.id, startDate, endDate, false);
              
              
              // Buscar insights dos últimos 7 dias (para tendência principal)
              last7DaysInsights = await metaAdsService.getAdInsights(ad.id, last7DaysStart, last7DaysEnd, false);
              
              
              // Buscar insights dos últimos 3 dias (para termômetro imediato)
              last3DaysInsights = await metaAdsService.getAdInsights(ad.id, last3DaysStart, last3DaysEnd, false);
              
              
              // Buscar insights dos 7 dias anteriores (para comparação de tendência)
              previous7DaysInsights = await metaAdsService.getAdInsights(ad.id, previous7DaysStart, previous7DaysEnd, false);
              
              
              // Buscar insights dos 3 dias anteriores (para comparação de alertas)
              previous3DaysInsights = await metaAdsService.getAdInsights(ad.id, previous3DaysStart, previous3DaysEnd, false);
              
              } else {
              // Fallback: usar os mesmos dados do período selecionado
              
              periodInsights = await metaAdsService.getAdInsights(ad.id, startDate, endDate, false);
              allTimeInsights = periodInsights;
            }
          } catch (error) {
            console.error(`Erro ao buscar insights para anúncio ${ad.id}:`, error);
            // Fallback: tentar do Ad Set
            try {
              // Evitar fallback para 30 dias para manter veracidade por período
              periodInsights = await metaAdsService.getAdSetInsights(ad.adset_id, startDate, endDate, { fallbackToLast30Days: false });
              allTimeInsights = periodInsights;
              
            } catch (adSetError) {
              console.error(`Erro ao buscar insights via Ad Set para anúncio ${ad.id}:`, adSetError);
            }
          }
          
          // Usar periodInsights para exibição das métricas nos cards e allTimeInsights para Performance Score
          const insights = periodInsights;
          
          // Calcular dias em veiculação (função auxiliar)
          const calculateCirculationDays = (createdTime?: string) => {
            if (!createdTime) return 0;
            try {
              const created = new Date(createdTime);
              const now = new Date();
              const diffTime = Math.abs(now.getTime() - created.getTime());
              return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } catch (error) {
              console.error('Erro ao calcular dias de veiculação:', error);
              return 0;
            }
          };

          const generateAdPreviewLink = async (ad: any) => {
            try {
              // Estratégia 1: Usar effective_object_story_id do anúncio (mais confiável)
              if (ad.effective_object_story_id) {
                
                
                // O effective_object_story_id vem no formato "pageId_postId"
                const storyParts = ad.effective_object_story_id.split('_');
                if (storyParts.length >= 2) {
                  const pageId = storyParts[0];
                  const postId = storyParts[1];
                  
                  
                  
                  
                  const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                  
                  return postUrl;
                }
              }
              
              // Estratégia 2: Buscar effective_object_story_id via API de adcreatives
              
              try {
                const adCreatives = await metaAdsService.getAdCreativesWithEffectiveObjectStory();
                
                
                // Procurar pelo creative_id do anúncio atual
                const adDetails = await metaAdsService.getAdDetails(ad.id);
                const creativeId = adDetails?.creative?.id;
                
                if (creativeId) {
                  
                  
                  const matchingCreative = adCreatives.find((creative: any) => creative.id === creativeId);
                  if (matchingCreative && matchingCreative.effective_object_story_id) {
                    
                    
                    const storyParts = matchingCreative.effective_object_story_id.split('_');
                    if (storyParts.length >= 2) {
                      const pageId = storyParts[0];
                      const postId = storyParts[1];
                      
                      const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                      
                      return postUrl;
                    }
                  } else {
                    
                    }
                }
              } catch (apiError) {
                console.error(`❌ Erro ao buscar adcreatives:`, apiError);
              }
              
              // Estratégia 3: Buscar detalhes completos do anúncio para obter page_id
              const adDetails = await metaAdsService.getAdDetails(ad.id);
              
              
              // Verificar se temos page_id nos detalhes do anúncio
              const pageId = adDetails?.creative?.object_story_spec?.page_id;
              
              
              if (pageId) {
                // Tentar extrair post_id do link do anúncio
                const link = adDetails.creative?.object_story_spec?.link_data?.link || 
                            adDetails.creative?.object_story_spec?.video_data?.call_to_action?.value?.link;
                
                
                
                if (link) {
                  // Tentar extrair post_id do link do Facebook - múltiplas estratégias
                  
                  
                  // Estratégia 4: facebook.com/pagina/posts/123456789
                  const postMatch = link.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/);
                  if (postMatch) {
                    const postId = postMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    
                    
                    return postUrl;
                  }
                  
                  // Estratégia 5: facebook.com/pagina/123456789
                  const alternativeMatch = link.match(/facebook\.com\/[^\/]+\/(\d+)/);
                  if (alternativeMatch) {
                    const postId = alternativeMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    
                    
                    return postUrl;
                  }
                  
                  // Estratégia 6: buscar por qualquer número no final da URL
                  const numberMatch = link.match(/(\d+)(?:\?|$)/);
                  if (numberMatch) {
                    const postId = numberMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    
                    
                    return postUrl;
                  }
                  
                  // Estratégia 7: buscar por qualquer número de 15 dígitos (formato do post_id)
                  const longNumberMatch = link.match(/(\d{15,})/);
                  if (longNumberMatch) {
                    const postId = longNumberMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    
                    
                    return postUrl;
                  }
                  
                  
                  } else {
                  
                  }
                
                // Estratégia 8: Buscar post IDs da página via API (como fallback)
                try {
                  
                  const accessToken = metaAdsService.getAccessToken();
                  
                  
                  if (accessToken) {
                    
                    const postIds = await metaAdsService.getPostIdsFromPage(pageId, accessToken);
                    
                    
                    if (postIds && postIds.length > 0) {
                      // Usar o primeiro post ID (mais recente)
                      const postId = postIds[0];
                      const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                      
                      
                      return postUrl;
                    } else {
                      
                      }
                  } else {
                    
                    }
                } catch (apiError) {
                  console.error(`❌ Erro ao buscar post IDs via API:`, apiError);
                }
                
                                              // Se chegou até aqui, não há post_id real disponível
                
                
                
                
                // Fallback para o link do Meta Ads Manager
                const accountId = ad.campaign_id?.split('_')[0];
                return `https://www.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_id=${ad.id}&tab=ads`;
              }
              
              
              // Fallback para o link do Meta Ads Manager
              const accountId = ad.campaign_id?.split('_')[0];
              return `https://www.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_id=${ad.id}&tab=ads`;
            } catch (error) {
              console.error(`❌ Erro ao buscar detalhes do anúncio ${ad.id}:`, error);
              // Fallback para o link do Meta Ads Manager
              const accountId = ad.campaign_id?.split('_')[0];
              return `https://www.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_id=${ad.id}&tab=ads`;
            }
          };

          if (insights.length > 0) {
            
            
            // Somar todos os insights do período
            let totalImpressions = 0;
            let totalClicks = 0;
            let totalLinkClicks = 0; // Cliques específicos no link
            let totalSpend = 0;
            let totalReach = 0;
            let totalMessagingConversations = 0;
            let totalLeads = 0;
            let totalPurchases = 0;
            
            insights.forEach((insight, index) => {
              
              
              
              totalImpressions += parseInt(insight.impressions || '0');
              totalClicks += parseInt(insight.clicks || '0');
              totalSpend += parseFloat(insight.spend || '0');
              totalReach += parseInt(insight.reach || '0');
              
              // Buscar cliques no link (link_click) - mesma lógica da planilha de detalhes mensais
              const linkClicks = insight.actions?.find((action: any) => 
                action.action_type === 'link_click' || 
                action.action_type === 'onsite_conversion.link_click'
              )?.value || '0';
              totalLinkClicks += parseInt(linkClicks);
              
              // Log para debug dos actions
              if (insight.actions && insight.actions.length > 0) {
                
                }
              
              // Somar conversões
              const messagingConversations = insight.actions?.find((action: any) => 
                action.action_type === 'messaging_conversations_started' || 
                action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
              )?.value || '0';
              totalMessagingConversations += parseInt(messagingConversations);
              
              const leads = insight.actions?.find((action: any) => 
                action.action_type === 'lead' || action.action_type === 'complete_registration'
              )?.value || '0';
              totalLeads += parseInt(leads);
              
              const purchases = insight.actions?.find((action: any) => 
                action.action_type === 'purchase' || 
                action.action_type === 'onsite_conversion.purchase'
              )?.value || '0';
              totalPurchases += parseInt(purchases);
            });
            
            // Calcular métricas agregadas do período atual
            const impressions = totalImpressions;
            const clicks = totalClicks;
            const linkClicks = totalLinkClicks > 0 ? totalLinkClicks : totalClicks; // Fallback para cliques normais se linkClicks for 0
            const spend = totalSpend;
            const reach = totalReach;
            const ctr = impressions > 0 ? (linkClicks / impressions) * 100 : 0; // CTR baseado em cliques no link (ou cliques normais como fallback)
            const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
            
            // Calcular métricas dos últimos 7 dias (tendência principal)
            let last7DaysCpr = 0;
            let last7DaysCtr = 0;
            let last7DaysConversions = 0;
            let last7DaysDetails: Array<{ date: string; cpr: number; cpc: number; ctr: number; frequency: number }> = [];
            
            // Calcular métricas dos últimos 3 dias (termômetro imediato)
            let last3DaysCpr = 0;
            let last3DaysCtr = 0;
            let last3DaysConversions = 0;
            
            // Calcular métricas dos períodos anteriores (para comparação de tendência)
            let previous7DaysCpr = 0;
            let previous7DaysCtr = 0;
            let previous7DaysConversions = 0;
            let previous3DaysCpr = 0;
            let previous3DaysCtr = 0;
            let previous3DaysConversions = 0;
            
            if (last7DaysInsights.length > 0) {
              let last7DaysTotalSpend = 0;
              let last7DaysTotalConversions = 0;
              let last7DaysTotalImpressions = 0;
              let last7DaysTotalLinkClicks = 0;
              
              last7DaysInsights.forEach((insight: any) => {
                const dayImpressions = parseInt(insight.impressions || '0');
                const daySpend = parseFloat(insight.spend || '0');
                const dayReach = parseInt(insight.reach || '0');

                const linkClicksStr = insight.actions?.find((action: any) => 
                  action.action_type === 'link_click' ||
                  action.action_type === 'onsite_conversion.link_click'
                )?.value || '0';
                const dayLinkClicks = parseInt(linkClicksStr);

                const dayMessaging = parseInt(
                  (insight.actions?.find((action: any) => 
                    action.action_type === 'messaging_conversations_started' || 
                    action.action_type === 'onsite_conversion.messaging_conversation_started_7d')?.value) || '0'
                );
                const dayLeads = parseInt(
                  (insight.actions?.find((action: any) => action.action_type === 'lead' || action.action_type === 'complete_registration')?.value) || '0'
                );
                const dayPurchases = parseInt(
                  (insight.actions?.find((action: any) => action.action_type === 'purchase' || action.action_type === 'onsite_conversion.purchase')?.value) || '0'
                );
                const dayConversions = dayMessaging + dayLeads + dayPurchases;

                const dayCpc = dayLinkClicks > 0 ? daySpend / dayLinkClicks : 0;
                const dayCtr = dayImpressions > 0 ? (dayLinkClicks / dayImpressions) * 100 : 0;
                const dayFrequency = dayReach > 0 ? dayImpressions / dayReach : 0;
                const dayCpr = dayConversions > 0 ? daySpend / dayConversions : 0;

                last7DaysDetails.push({
                  date: insight.date_start,
                  cpr: dayCpr,
                  cpc: dayCpc,
                  ctr: dayCtr,
                  frequency: dayFrequency
                });

                last7DaysTotalSpend += daySpend;
                last7DaysTotalImpressions += dayImpressions;
                last7DaysTotalLinkClicks += dayLinkClicks;
                last7DaysTotalConversions += dayConversions;
              });
              
              // Calcular métricas dos últimos 7 dias
              last7DaysCpr = last7DaysTotalConversions > 0 ? last7DaysTotalSpend / last7DaysTotalConversions : 0;
              last7DaysCtr = last7DaysTotalImpressions > 0 ? (last7DaysTotalLinkClicks / last7DaysTotalImpressions) * 100 : 0;
              last7DaysConversions = last7DaysTotalConversions;
              
              
              }
            
            // Calcular métricas dos últimos 3 dias
            if (last3DaysInsights.length > 0) {
              let last3DaysTotalSpend = 0;
              let last3DaysTotalConversions = 0;
              let last3DaysTotalImpressions = 0;
              let last3DaysTotalLinkClicks = 0;
              
              last3DaysInsights.forEach((insight: any) => {
                last3DaysTotalSpend += parseFloat(insight.spend || '0');
                last3DaysTotalImpressions += parseInt(insight.impressions || '0');
                
                // Buscar cliques no link dos últimos 3 dias
                const last3DaysLinkClicks = insight.actions?.find((action: any) => 
                  action.action_type === 'link_click' || 
                  action.action_type === 'onsite_conversion.link_click'
                )?.value || '0';
                last3DaysTotalLinkClicks += parseInt(last3DaysLinkClicks);
                
                // Somar conversões dos últimos 3 dias
                const last3DaysMessagingConversations = insight.actions?.find((action: any) => 
                  action.action_type === 'messaging_conversations_started' || 
                  action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                )?.value || '0';
                
                const last3DaysLeads = insight.actions?.find((action: any) => 
                  action.action_type === 'lead' || action.action_type === 'complete_registration'
                )?.value || '0';
                
                const last3DaysPurchases = insight.actions?.find((action: any) => 
                  action.action_type === 'purchase' || 
                  action.action_type === 'onsite_conversion.purchase'
                )?.value || '0';
                
                last3DaysTotalConversions += parseInt(last3DaysMessagingConversations) + parseInt(last3DaysLeads) + parseInt(last3DaysPurchases);
              });
              
              // Calcular métricas dos últimos 3 dias
              last3DaysCpr = last3DaysTotalConversions > 0 ? last3DaysTotalSpend / last3DaysTotalConversions : 0;
              last3DaysCtr = last3DaysTotalImpressions > 0 ? (last3DaysTotalLinkClicks / last3DaysTotalImpressions) * 100 : 0;
              last3DaysConversions = last3DaysTotalConversions;
              
              
              }
            
            // Calcular métricas dos 7 dias anteriores (para comparação de tendência)
            if (previous7DaysInsights.length > 0) {
              let previous7DaysTotalSpend = 0;
              let previous7DaysTotalConversions = 0;
              let previous7DaysTotalImpressions = 0;
              let previous7DaysTotalLinkClicks = 0;
              
              previous7DaysInsights.forEach((insight: any) => {
                previous7DaysTotalSpend += parseFloat(insight.spend || '0');
                previous7DaysTotalImpressions += parseInt(insight.impressions || '0');
                
                // Buscar cliques no link dos 7 dias anteriores
                const previous7DaysLinkClicks = insight.actions?.find((action: any) => 
                  action.action_type === 'link_click' || 
                  action.action_type === 'onsite_conversion.link_click'
                )?.value || '0';
                previous7DaysTotalLinkClicks += parseInt(previous7DaysLinkClicks);
                
                // Somar conversões dos 7 dias anteriores
                const previous7DaysMessagingConversations = insight.actions?.find((action: any) => 
                  action.action_type === 'messaging_conversations_started' || 
                  action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                )?.value || '0';
                
                const previous7DaysLeads = insight.actions?.find((action: any) => 
                  action.action_type === 'lead' || action.action_type === 'complete_registration'
                )?.value || '0';
                
                const previous7DaysPurchases = insight.actions?.find((action: any) => 
                  action.action_type === 'purchase' || 
                  action.action_type === 'onsite_conversion.purchase'
                )?.value || '0';
                
                previous7DaysTotalConversions += parseInt(previous7DaysMessagingConversations) + parseInt(previous7DaysLeads) + parseInt(previous7DaysPurchases);
              });
              
              // Calcular métricas dos 7 dias anteriores
              previous7DaysCpr = previous7DaysTotalConversions > 0 ? previous7DaysTotalSpend / previous7DaysTotalConversions : 0;
              previous7DaysCtr = previous7DaysTotalImpressions > 0 ? (previous7DaysTotalLinkClicks / previous7DaysTotalImpressions) * 100 : 0;
              previous7DaysConversions = previous7DaysTotalConversions;
              
              
              }
            
            // Calcular métricas dos 3 dias anteriores (para comparação de alertas)
            if (previous3DaysInsights.length > 0) {
              let previous3DaysTotalSpend = 0;
              let previous3DaysTotalConversions = 0;
              let previous3DaysTotalImpressions = 0;
              let previous3DaysTotalLinkClicks = 0;
              
              previous3DaysInsights.forEach((insight: any) => {
                previous3DaysTotalSpend += parseFloat(insight.spend || '0');
                previous3DaysTotalImpressions += parseInt(insight.impressions || '0');
                
                // Buscar cliques no link dos 3 dias anteriores
                const previous3DaysLinkClicks = insight.actions?.find((action: any) => 
                  action.action_type === 'link_click' || 
                  action.action_type === 'onsite_conversion.link_click'
                )?.value || '0';
                previous3DaysTotalLinkClicks += parseInt(previous3DaysLinkClicks);
                
                // Somar conversões dos 3 dias anteriores
                const previous3DaysMessagingConversations = insight.actions?.find((action: any) => 
                  action.action_type === 'messaging_conversations_started' || 
                  action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                )?.value || '0';
                
                const previous3DaysLeads = insight.actions?.find((action: any) => 
                  action.action_type === 'lead' || action.action_type === 'complete_registration'
                )?.value || '0';
                
                const previous3DaysPurchases = insight.actions?.find((action: any) => 
                  action.action_type === 'purchase' || 
                  action.action_type === 'onsite_conversion.purchase'
                )?.value || '0';
                
                previous3DaysTotalConversions += parseInt(previous3DaysMessagingConversations) + parseInt(previous3DaysLeads) + parseInt(previous3DaysPurchases);
              });
              
              // Calcular métricas dos 3 dias anteriores
              previous3DaysCpr = previous3DaysTotalConversions > 0 ? previous3DaysTotalSpend / previous3DaysTotalConversions : 0;
              previous3DaysCtr = previous3DaysTotalImpressions > 0 ? (previous3DaysTotalLinkClicks / previous3DaysTotalImpressions) * 100 : 0;
              previous3DaysConversions = previous3DaysTotalConversions;
              
              
              }
            
            // Calcular métricas para Performance Score usando dados de todos os meses ativos
            let performanceScoreCpr = 0;
            let performanceScoreRoas = 0;
            let performanceScoreCpc = 0;
            let performanceScoreConversions = 0;
            let performanceScoreFrequency = 0;
            
            try {
              
              
              if (allTimeInsights.length > 0) {
                // Somar todos os insights de todos os meses ativos
                let totalAllTimeImpressions = 0;
                let totalAllTimeClicks = 0;
                let totalAllTimeLinkClicks = 0;
                let totalAllTimeSpend = 0;
                let totalAllTimeReach = 0;
                let totalAllTimeMessagingConversations = 0;
                let totalAllTimeLeads = 0;
                let totalAllTimePurchases = 0;
                
                allTimeInsights.forEach((insight: any) => {
                  totalAllTimeImpressions += parseInt(insight.impressions || '0');
                  totalAllTimeClicks += parseInt(insight.clicks || '0');
                  totalAllTimeSpend += parseFloat(insight.spend || '0');
                  totalAllTimeReach += parseInt(insight.reach || '0');
                  
                  // Buscar cliques no link
                  const linkClicks = insight.actions?.find((action: any) => 
                    action.action_type === 'link_click' || 
                    action.action_type === 'onsite_conversion.link_click'
                  )?.value || '0';
                  totalAllTimeLinkClicks += parseInt(linkClicks);
                  
                  // Somar conversões
                  const messagingConversations = insight.actions?.find((action: any) => 
                    action.action_type === 'messaging_conversations_started' || 
                    action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                  )?.value || '0';
                  totalAllTimeMessagingConversations += parseInt(messagingConversations);
                  
                  const leads = insight.actions?.find((action: any) => 
                    action.action_type === 'lead' || action.action_type === 'complete_registration'
                  )?.value || '0';
                  totalAllTimeLeads += parseInt(leads);
                  
                  const purchases = insight.actions?.find((action: any) => 
                    action.action_type === 'purchase' || 
                    action.action_type === 'onsite_conversion.purchase'
                  )?.value || '0';
                  totalAllTimePurchases += parseInt(purchases);
                });
                
                // Calcular métricas para Performance Score
                const allTimeLinkClicks = totalAllTimeLinkClicks > 0 ? totalAllTimeLinkClicks : totalAllTimeClicks;
                const allTimeConversions = totalAllTimeMessagingConversations > 0 ? totalAllTimeMessagingConversations : totalAllTimeLeads;
                const allTimeRevenue = totalAllTimePurchases * 200; // R$ 200 por compra
                
                performanceScoreCpr = allTimeConversions > 0 ? totalAllTimeSpend / allTimeConversions : 0;
                performanceScoreRoas = totalAllTimeSpend > 0 ? allTimeRevenue / totalAllTimeSpend : 0;
                performanceScoreCpc = allTimeLinkClicks > 0 ? totalAllTimeSpend / allTimeLinkClicks : 0;
                performanceScoreConversions = allTimeConversions;
                performanceScoreFrequency = totalAllTimeReach > 0 ? totalAllTimeImpressions / totalAllTimeReach : 0;
                
                
              } else {
                // Fallback para métricas do período selecionado
                performanceScoreCpr = 0;
                performanceScoreRoas = 0;
                performanceScoreCpc = 0;
                performanceScoreConversions = 0;
                performanceScoreFrequency = 0;
                
                }
            } catch (error) {
              console.error(`❌ Erro ao calcular métricas para Performance Score:`, error);
              // Fallback para métricas zeradas
              performanceScoreCpr = 0;
              performanceScoreRoas = 0;
              performanceScoreCpc = 0;
              performanceScoreConversions = 0;
              performanceScoreFrequency = 0;
            }
            
            // Calcular frequência para exibição (usando dados do período selecionado)
            let frequency = 0;
            try {
              
              
              if (allTimeInsights.length > 0) {
                // Calcular frequência acumulada total (fórmula correta do Meta Ads)
                let totalAllTimeImpressions = 0;
                let totalAllTimeReach = 0;
                
                allTimeInsights.forEach((insight: any) => {
                  totalAllTimeImpressions += parseInt(insight.impressions || '0');
                  totalAllTimeReach += parseInt(insight.reach || '0');
                });
                
                // Fórmula correta: frequência = total de impressões / alcance único
                frequency = totalAllTimeReach > 0 ? totalAllTimeImpressions / totalAllTimeReach : 0;
                
                
                
                
              } else {
                // Fallback para frequência do período selecionado
                frequency = reach > 0 ? impressions / reach : 0;
                
              }
            } catch (error) {
              console.error(`❌ Erro ao calcular frequência para anúncio ${ad.id}:`, error);
              // Fallback para frequência do período selecionado
              frequency = reach > 0 ? impressions / reach : 0;
              
            }
            
            
            
            // Log para indicar se está usando fallback
            if (totalLinkClicks === 0 && totalClicks > 0) {
              
            }
            
            
            
            const conversions = totalMessagingConversations > 0 ? totalMessagingConversations : totalLeads;
            
            // Calcular métricas derivadas do período selecionado
            const cpc = linkClicks > 0 ? spend / linkClicks : 0; // CPC baseado em cliques no link
            const cpr = conversions > 0 ? spend / conversions : 0;
            const revenue = totalPurchases * 200; // Receita baseada em compras (R$ 200 por compra)
            const roas = spend > 0 ? revenue / spend : 0;
            
            
            
            // Determinar status do anúncio baseado na hierarquia: Campanha > Conjunto > Anúncio
          let status: 'active' | 'paused' | 'draft' = 'active';
          
          try {
            
            
            // 1. Verificar status da campanha
            let campaignStatus = 'ACTIVE';
            try {
              const campaignDetails = await metaAdsService.getCampaignDetails(ad.campaign_id);
              campaignStatus = campaignDetails?.status || 'UNKNOWN';
              
              } catch (error) {
              console.error(`Erro ao buscar status da campanha ${ad.campaign_id}:`, error);
            }
            
            // 2. Verificar status do conjunto de anúncios
            let adSetStatus = 'ACTIVE';
            try {
              const adSetDetails = await metaAdsService.getAdSetDetails(ad.adset_id);
              adSetStatus = adSetDetails?.status || 'UNKNOWN';
              
              } catch (error) {
              console.error(`Erro ao buscar status do conjunto ${ad.adset_id}:`, error);
            }
            
            // 3. Status do anúncio (já temos)
            const adStatus = ad.status;
            
            
            // 4. Aplicar lógica hierárquica: TODOS devem estar ativos
            if (campaignStatus === 'ACTIVE' && adSetStatus === 'ACTIVE' && adStatus === 'ACTIVE') {
              status = 'active';
              
            } else {
              status = 'paused';
              
              if (campaignStatus !== 'ACTIVE') {
                // Campaign pausada
              }
              if (adSetStatus !== 'ACTIVE') {
                // AdSet pausado
              }
              if (adStatus !== 'ACTIVE') {
                // Ad pausado
              }
            }
            
            // 5. Verificar se foi deletado/arquivado
            if (ad.status === 'DELETED' || ad.status === 'ARCHIVED') {
              status = 'draft';
              
            }
            
          } catch (error) {
            console.error(`Erro ao verificar status hierárquico para anúncio ${ad.id}:`, error);
            // Fallback: usar apenas o status do anúncio
            if (ad.status === 'PAUSED') status = 'paused';
            else if (ad.status === 'DELETED' || ad.status === 'ARCHIVED') status = 'draft';
            else status = 'active';
          }
            
            // Determinar tendência baseada no ROAS
            let trend: 'up' | 'down' | 'stable' | 'collecting' = 'stable';
            if (roas > 3.5) trend = 'up';
            else if (roas < 2.0) trend = 'down';
            
            const circulationDays = calculateCirculationDays(ad.created_time);
            const lastUpdatedText = circulationDays > 0 
              ? `Em veiculação por ${circulationDays} dias`
              : 'Em veiculação';

            // Criar AdData temporário para determinar CPR ideal
            const tempAdData: AdData = {
              id: ad.id,
              title: ad.name,
              description: '',
              status: 'active',
              rank: 0,
              metrics: {
                impressions,
                clicks: linkClicks,
                ctr,
                cpc,
                conversions,
                roas,
                spend,
                revenue,
                cpr: performanceScoreCpr,
                reach,
                frequency,
                cpm
              },
              trend: 'stable',
              category: '',
              lastUpdated: ''
            };

            // Determinar CPR ideal e objetivo baseado no tipo de conversão
            const { cprIdeal, objetivo, tipoConversao } = determinarCprIdealEObjetivo(tempAdData);
            
            
            
            // Calcular Performance Score usando métricas de todos os meses ativos
            const performanceScore = calcularPerformanceScore({
              cprAtual: performanceScoreCpr,
              cpcAtual: performanceScoreCpc,
              conversoesAtuais: performanceScoreConversions,
              frequenciaAtual: performanceScoreFrequency,
              cprIdeal: cprIdeal
            });

            

            // Gerar link do anúncio de forma assíncrona
            const adLink = await generateAdPreviewLink(ad);
            
            const adData: AdData = {
              id: ad.id,
              title: ad.name,
              description: ad.creative?.body || ad.creative?.title || 'Anúncio do Meta Ads',
              imageUrl: ad.creative?.thumbnail_url || ad.creative?.image_url,
              status,
              rank: 0, // Será definido após ordenação
    metrics: {
                impressions,
                clicks: linkClicks, // Usar cliques no link em vez de todos os cliques
                ctr,
                cpc,
                conversions,
                roas,
                spend,
                revenue,
                cpr,
                reach,
                frequency,
                cpm,
                // Métricas dos últimos 7 dias
                last7DaysCpr,
                last7DaysCtr,
                last7DaysConversions,
                // Detalhes por dia (para tooltips)
                last7DaysDetails,
                // Métricas dos últimos 3 dias para termômetro imediato
                last3DaysCpr,
                last3DaysCtr,
                last3DaysConversions,
                // Métricas dos períodos anteriores para comparação
                previous7DaysCpr,
                previous7DaysCtr,
                previous7DaysConversions,
                previous3DaysCpr,
                previous3DaysCtr,
                previous3DaysConversions
              },
              trend,
              category: selectedProduct || 'Meta Ads',
              lastUpdated: lastUpdatedText,
              adset_id: ad.adset_id,
              campaign_id: ad.campaign_id,
              adLink: adLink,
              createdTime: ad.created_time,
              performanceScore,
              performanceScoreMetrics: {
                cpr: performanceScoreCpr,
                cpc: performanceScoreCpc,
                conversions: performanceScoreConversions,
                frequency: performanceScoreFrequency,
                objetivo: objetivo,
                tipoConversao: tipoConversao,
                cprIdeal: cprIdeal
              }
            };
            
            
            
            adsWithInsights.push(adData);
          } else {
            
            
            // Calcular dias em veiculação para anúncios sem insights
            const circulationDays = calculateCirculationDays(ad.created_time);
            const lastUpdatedText = circulationDays > 0 
              ? `Em veiculação por ${circulationDays} dias`
              : 'Em veiculação';

            // Calcular Performance Score (0 para anúncios sem insights)
            const performanceScore = 0;

            // Gerar link do anúncio de forma assíncrona
            const adLink = await generateAdPreviewLink(ad);
            
            // Criar anúncio com dados básicos mesmo sem insights
            const adData: AdData = {
              id: ad.id,
              title: ad.name,
              description: ad.creative?.body || ad.creative?.title || 'Anúncio do Meta Ads',
              imageUrl: ad.creative?.thumbnail_url || ad.creative?.image_url,
              status: ad.status === 'PAUSED' ? 'paused' : ad.status === 'DELETED' || ad.status === 'ARCHIVED' ? 'draft' : 'active',
              rank: 0,
    metrics: {
                impressions: 0,
                clicks: 0,
                ctr: 0,
                cpc: 0,
                conversions: 0,
                roas: 0,
                spend: 0,
                revenue: 0,
                cpr: 0,
                reach: 0,
                frequency: 0,
                cpm: 0,
                // Métricas dos últimos 7 dias
                last7DaysCpr: 0,
                last7DaysCtr: 0,
                last7DaysConversions: 0,
                // Métricas dos últimos 3 dias para termômetro imediato
                last3DaysCpr: 0,
                last3DaysCtr: 0,
                last3DaysConversions: 0,
                // Métricas dos períodos anteriores para comparação
                previous7DaysCpr: 0,
                previous7DaysCtr: 0,
                previous7DaysConversions: 0,
                previous3DaysCpr: 0,
                previous3DaysCtr: 0,
                previous3DaysConversions: 0
    },
    trend: 'stable',
              category: selectedProduct || 'Meta Ads',
              lastUpdated: lastUpdatedText,
              adset_id: ad.adset_id,
              campaign_id: ad.campaign_id,
              adLink: adLink,
              createdTime: ad.created_time,
              performanceScore,
              performanceScoreMetrics: {
                cpr: 0,
                cpc: 0,
                conversions: 0,
                frequency: 0
              }
            };
            
            
            
            adsWithInsights.push(adData);
          }
        } catch (error) {
          console.error(`Erro ao buscar insights do anúncio ${ad.id}:`, error);
        }
      }

      
      

      // Separar anúncios com insights válidos dos sem insights
      const adsWithValidInsights = adsWithInsights.filter(ad => ad.metrics.spend > 0);
      const adsWithoutInsights = adsWithInsights.filter(ad => ad.metrics.spend === 0);
      
      
      
      
      // Filtrar apenas anúncios com gasto maior que R$ 0,00
      const adsWithSpend = adsWithValidInsights.filter(ad => ad.metrics.spend > 0);
      

      // Usar apenas anúncios que tiveram veiculação (gasto > 0)
      let finalAds = adsWithSpend;
      
      // Se não há anúncios com gasto, mostrar mensagem de que não há anúncios veiculados
      if (adsWithSpend.length === 0) {
        
        setAds([]);
        setLastSync('Nenhum anúncio veiculado no período');
        return;
      }

      // Ordenar por CPR (menor primeiro) e atribuir ranks
      // Anúncios com CPR R$ 0,00 vão para o final (não são necessariamente bons)
      const sortedAds = finalAds
        .sort((a, b) => {
          // Se ambos têm CPR 0, manter ordem original
          if (a.metrics.cpr === 0 && b.metrics.cpr === 0) {
            return 0;
          }
          // Se apenas A tem CPR 0, B vem primeiro
          if (a.metrics.cpr === 0) {
            return 1;
          }
          // Se apenas B tem CPR 0, A vem primeiro
          if (b.metrics.cpr === 0) {
            return -1;
          }
          // Se nenhum tem CPR 0, ordenar normalmente (menor primeiro)
          return a.metrics.cpr - b.metrics.cpr;
        })
        .map((ad, index) => ({
          ...ad,
          rank: index + 1
        }));

      
      

      if (sortedAds.length > 0) {
        setAds(sortedAds);
        setLastSync(new Date().toLocaleString('pt-BR'));
        
        } else {
        
        setAds([]);
        setLastSync('Nenhum anúncio veiculado no período');
      }

    } catch (error: any) {
      console.error('Erro ao buscar dados do Meta Ads:', error);
      setError(`Erro ao sincronizar: ${error.message}`);
      setAds([]);
      setLastSync('Erro na sincronização');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados na montagem do componente
  useEffect(() => {
    fetchRealAdsData();
  }, []);

  // Função para forçar sincronização
  const handleRefresh = () => {
    fetchRealAdsData();
  };

  const handleTooltipHover = (adId: string, event: React.MouseEvent) => {
    
    
    // Limpar timeout anterior se existir
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }

    // Mostrar tooltip imediatamente (sem delay para teste)
    const button = event.currentTarget as HTMLButtonElement;
    const rect = button.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    const position = {
      x: rect.right + scrollX + 10,
      y: rect.top + scrollY - 200
    };
    
    
    
    setTooltipPosition(position);
    setTooltipAdId(adId);
  };

  const handleTooltipLeave = () => {
    
    
    // Limpar timeout se existir
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Esconder tooltip imediatamente (sem delay para teste)
    setTooltipAdId(null);
    setTooltipPosition(null);
  };

  // Tooltips globais para métricas (CPR/CPC/CTR/Frequência)
  const handleMetricTooltipEnter = (
    adId: string,
    metric: 'cpr' | 'cpc' | 'ctr' | 'freq',
    event: React.MouseEvent
  ) => {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const tooltipWidth = 288; // w-72
    const margin = 6;
    const x = Math.max(margin, Math.min(rect.left, window.innerWidth - margin - tooltipWidth));
    const y = rect.bottom + margin;
    setMetricTooltip({ adId, metric, position: { x, y } });
  };

  const handleMetricTooltipLeave = (e?: React.MouseEvent) => {
    // Se o mouse está indo para dentro do tooltip portal, não feche
    if (e && metricTooltipWrapperRef.current) {
      const next = e.relatedTarget as Node | null;
      if (next && metricTooltipWrapperRef.current.contains(next)) {
        return;
      }
    }
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = setTimeout(() => setMetricTooltip(null), 120);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Star className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Star className="w-5 h-5 text-amber-600" />;
      default:
        return <Activity className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTrendIcon = (trend: string | null) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'stable':
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
      case 'collecting':
        return (
          <div className="relative group" title="Dados insuficientes - aguardando mais informações">
            <div className="flex items-center space-x-1">
              <Database className="w-4 h-4 text-slate-400" />
              <div className="flex space-x-0.5">
                <div className="w-1 h-1 bg-amber-400 rounded-full opacity-60"></div>
                <div className="w-1 h-1 bg-amber-400 rounded-full opacity-80"></div>
                <div className="w-1 h-1 bg-amber-400 rounded-full"></div>
              </div>
            </div>
          </div>
        );
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  /**
   * Calcula o ícone de tendência baseado nas métricas atuais vs anteriores
   * 
   * @example
   * const result = calculateTrendIcon({
   *   cprAtual: 25,
   *   cprAnterior: 30,
   *   ctrAtual: 2.1,
   *   ctrAnterior: 1.8,
   *   conversoesAtuais: 80,
   *   conversoesAnteriores: 60,
   *   frequenciaAtual: 3.8
   * });
   *  // 'up'
   *  // 'Tendência positiva! CPR melhorou 16.7%, CTR aumentou 16.7%, Conversões aumentaram 33.3%, Frequência está ideal (3.8).'
   */
  const calculateTrendIcon = ({
    cprAtual,
    cprAnterior,
    ctrAtual,
    ctrAnterior,
    conversoesAtuais,
    conversoesAnteriores,
    frequenciaAtual,
    last3DaysCpr = 0,
    last3DaysCtr = 0,
    last3DaysConversions = 0,
    previous3DaysCpr = 0,
    previous3DaysCtr = 0,
    previous3DaysConversions = 0,
    objetivo = 'Indefinido',
    tipoConversao = 'conversões'
  }: {
    cprAtual: number;
    cprAnterior: number;
    ctrAtual: number;
    ctrAnterior: number;
    conversoesAtuais: number;
    conversoesAnteriores: number;
    frequenciaAtual: number;
    last3DaysCpr?: number;
    last3DaysCtr?: number;
    last3DaysConversions?: number;
    previous3DaysCpr?: number;
    previous3DaysCtr?: number;
    previous3DaysConversions?: number;
    objetivo?: string;
    tipoConversao?: string;
  }): { trend: 'up' | 'down' | 'warning' | 'stable' | 'collecting'; explanation: string } => {
    // === DETECÇÃO DE ANÚNCIOS SEM DADOS SUFICIENTES ===
    // Verificar se o anúncio não está em veiculação nos últimos 7 dias
    // CPR=0 não deve contar como dado suficiente (pode ser ausência de conversão)
    const temDadosUltimos7Dias = conversoesAtuais > 0 || ctrAtual > 0 || (cprAtual > 0);
    const temDadosAnteriores = conversoesAnteriores > 0 || cprAnterior > 0 || ctrAnterior > 0;
    
    // Se não tem dados nos últimos 7 dias OU se não tem dados para comparação
    if (!temDadosUltimos7Dias || !temDadosAnteriores) {
      return {
        trend: 'collecting',
        explanation: `Anúncio ainda coletando dados para ${objetivo.toLowerCase()}.<br>Precisa de mais tempo rodando para mostrar tendência.`
      };
    }
    
    // === TENDÊNCIA PRINCIPAL (Últimos 7 dias) ===
    // Condições para tendência POSITIVA (anúncio dando resultado)
    // Ignorar cprAtual=0 para não apontar melhoria artificial
    const cprMelhorou = cprAnterior > 0 && cprAtual > 0 && cprAtual < cprAnterior * 0.9; // Pelo menos 10% melhor
    const conversoesAumentaram = conversoesAnteriores > 0 && conversoesAtuais > conversoesAnteriores * 1.1; // Pelo menos 10% mais
    const ctrMelhorou = ctrAnterior > 0 && ctrAtual > ctrAnterior * 1.05; // Pelo menos 5% melhor
    const frequenciaControlada = frequenciaAtual <= 3.5; // Não saturando
    
    // Condições para tendência NEGATIVA (anúncio parando de dar resultado)
    const cprPiorou = cprAnterior > 0 && cprAtual > cprAnterior * 1.15; // Pelo menos 15% pior
    const conversoesDiminuíram = conversoesAnteriores > 0 && conversoesAtuais < conversoesAnteriores * 0.9; // Pelo menos 10% menos
    const ctrPiorou = ctrAnterior > 0 && ctrAtual < ctrAnterior * 0.95; // Pelo menos 5% pior
    const frequenciaAlta = frequenciaAtual > 4.5; // Saturando
    
    // Contar quantas condições positivas são verdadeiras
    const condicoesPositivas = [cprMelhorou, conversoesAumentaram, ctrMelhorou, frequenciaControlada].filter(Boolean).length;
    
    // Contar quantas condições negativas são verdadeiras
    const condicoesNegativas = [cprPiorou, conversoesDiminuíram, ctrPiorou, frequenciaAlta].filter(Boolean).length;
    
    // === TERMÔMETRO IMEDIATO (Últimos 3 dias vs 3 dias anteriores) ===
    // Detectar quedas bruscas ou sinais de saturação comparando os últimos 3 dias com os 3 dias anteriores
    const quedaBruscaCPR = previous3DaysCpr > 0 && last3DaysCpr > previous3DaysCpr * 1.3; // CPR dos últimos 3 dias é 30% pior que os 3 dias anteriores
    const quedaBruscaCTR = previous3DaysCtr > 0 && last3DaysCtr < previous3DaysCtr * 0.8; // CTR dos últimos 3 dias é 20% pior que os 3 dias anteriores  
    const quedaBruscaConversions = previous3DaysConversions > 0 && last3DaysConversions < previous3DaysConversions * 0.7; // Conversões dos últimos 3 dias são 30% menores que os 3 dias anteriores
    const saturaçãoRápida = frequenciaAtual > 5.0; // Frequência muito alta
    
    const alertasImediatos = [quedaBruscaCPR, quedaBruscaCTR, quedaBruscaConversions, saturaçãoRápida].filter(Boolean).length;
    
    // === LÓGICA DE DECISÃO ===
    
    // 1. ALERTA IMEDIATO: Se há alertas dos últimos 3 dias
    if (alertasImediatos >= 2) {
      const reasons = [];
      if (quedaBruscaCPR) {
        const variacao = ((last3DaysCpr - previous3DaysCpr) / previous3DaysCpr * 100);
        reasons.push(`${tipoConversao} ficaram ${variacao.toFixed(1)}% mais caras nos últimos 3 dias`);
      }
      if (quedaBruscaCTR) {
        const variacao = ((previous3DaysCtr - last3DaysCtr) / previous3DaysCtr * 100);
        reasons.push(`menos pessoas clicaram (${variacao.toFixed(1)}% menos nos últimos 3 dias)`);
      }
      if (quedaBruscaConversions) {
        const variacao = ((previous3DaysConversions - last3DaysConversions) / previous3DaysConversions * 100);
        reasons.push(`${tipoConversao} caíram ${variacao.toFixed(1)}% nos últimos 3 dias`);
      }
      if (saturaçãoRápida) {
        reasons.push(`público vendo o anúncio demais (${frequenciaAtual.toFixed(1)}x)`);
      }
      
      return {
        trend: 'warning',
        explanation: `Alerta para ${objetivo.toLowerCase()}!<br>${reasons.join('<br>')}.<br>Ação rápida necessária para evitar desperdício.`
      };
    }
    
    // 2. TENDÊNCIA POSITIVA: pelo menos 2 condições positivas dos últimos 7 dias
    // Requisito extra: pelo menos 1 conversão nos últimos 7 dias para marcar positiva
    if (condicoesPositivas >= 2 && conversoesAtuais > 0) {
      const reasons = [];
      if (cprMelhorou) {
        const variacao = ((cprAnterior - cprAtual) / cprAnterior * 100);
        reasons.push(`${tipoConversao} mais baratas (${variacao.toFixed(1)}% melhor)`);
      }
      if (conversoesAumentaram) {
        const variacao = ((conversoesAtuais - conversoesAnteriores) / conversoesAnteriores * 100);
        reasons.push(`mais ${tipoConversao} (${variacao.toFixed(1)}% a mais)`);
      }
      if (ctrMelhorou) {
        const variacao = ((ctrAtual - ctrAnterior) / ctrAnterior * 100);
        reasons.push(`mais pessoas clicando (${variacao.toFixed(1)}% melhor)`);
      }
      if (frequenciaControlada) {
        reasons.push(`público não saturado (${frequenciaAtual.toFixed(1)}x)`);
      }
      
      return {
        trend: 'up',
        explanation: `${objetivo} indo muito bem!<br>${reasons.join('<br>')}.<br>Continue assim!`
      };
    }
    
    // 3. TENDÊNCIA NEGATIVA: pelo menos 2 condições negativas dos últimos 7 dias
    if (condicoesNegativas >= 2) {
      const reasons = [];
      if (cprPiorou) {
        const variacao = ((cprAtual - cprAnterior) / cprAnterior * 100);
        reasons.push(`${tipoConversao} mais caras (${variacao.toFixed(1)}% pior)`);
      }
      if (conversoesDiminuíram) {
        const variacao = ((conversoesAnteriores - conversoesAtuais) / conversoesAnteriores * 100);
        reasons.push(`menos ${tipoConversao} (${variacao.toFixed(1)}% menos)`);
      }
      if (ctrPiorou) {
        const variacao = ((ctrAnterior - ctrAtual) / ctrAnterior * 100);
        reasons.push(`menos cliques (${variacao.toFixed(1)}% pior)`);
      }
      if (frequenciaAlta) {
        reasons.push(`público cansado do anúncio (${frequenciaAtual.toFixed(1)}x)`);
      }
      
      return {
        trend: 'down',
        explanation: `${objetivo} piorando!<br>${reasons.join('<br>')}.<br>Precisa revisar a estratégia.`
      };
    }
    
    // 4. ESTÁVEL: Se não atende nenhuma condição
    return {
      trend: 'stable',
      explanation: `${objetivo} estável.<br>Performance sem grandes mudanças nos últimos dias.`
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'paused':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'draft':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  // Formata a data ISO (YYYY-MM-DD) para "DD/MM (DiaSemana)"
  const formatTooltipDate = (isoDate: string): string => {
    if (!isoDate || typeof isoDate !== 'string') return '';
    const parts = isoDate.split('-').map(Number);
    if (parts.length < 3 || parts.some(isNaN)) return isoDate;
    const [year, month, day] = parts;
    const dateObj = new Date(year, month - 1, day);
    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekDay = dayNames[dateObj.getDay()] || '';
    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    return `${dd}/${mm} (${weekDay})`;
  };

  // Retorna partes formatadas e classe de cor para hoje/ontem/anteontem
  const getTooltipDateParts = (isoDate: string): { dateStr: string; tagText: string; tagClass: string } => {
    if (!isoDate) return { dateStr: '', tagText: '', tagClass: '' };
    const [yearStr, monthStr, dayStr] = isoDate.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    const dateObj = new Date(year, month - 1, day);

    const dd = String(day).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    const dateStr = `${dd}/${mm}`;

    // Normalizar para meia-noite local
    const normalize = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const today = normalize(new Date());
    const target = normalize(dateObj);
    const msPerDay = 24 * 60 * 60 * 1000;
    const diff = Math.round((today.getTime() - target.getTime()) / msPerDay);

    const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const weekDay = dayNames[dateObj.getDay()] || '';

    if (diff === 0) return { dateStr, tagText: 'Hoje', tagClass: 'text-blue-300' };
    if (diff === 1) return { dateStr, tagText: weekDay, tagClass: 'text-amber-300' };
    if (diff === 2) return { dateStr, tagText: weekDay, tagClass: 'text-red-300' };

    return { dateStr, tagText: weekDay, tagClass: 'text-slate-400' };
  };

  // Função para determinar CPR ideal baseado no tipo de conversão da campanha
  const determinarCprIdealEObjetivo = (ad: AdData): { cprIdeal: number; objetivo: string; tipoConversao: string } => {
    const metrics = ad.metrics;
    
    // Se não há conversões, usar valores padrão
    if (metrics.conversions === 0 || metrics.cpr === 0) {
      return {
        cprIdeal: 30,
        objetivo: 'Indefinido',
        tipoConversao: 'Ainda coletando dados'
      };
    }
    
    // Baseado no valor atual do CPR, inferir o tipo de conversão
    if (metrics.cpr >= 25) {
      // CPR alto = provavelmente conversões/vendas
      return {
        cprIdeal: 35,
        objetivo: 'Conversões',
        tipoConversao: 'conversões'
      };
    } else if (metrics.cpr >= 8) {
      // CPR médio = provavelmente leads qualificados
      return {
        cprIdeal: 15,
        objetivo: 'Geração de Leads',
        tipoConversao: 'leads'
      };
    } else if (metrics.cpr >= 2) {
      // CPR baixo = provavelmente mensagens iniciadas
      return {
        cprIdeal: 5,
        objetivo: 'Mensagens/Contatos',
        tipoConversao: 'mensagens'
      };
    } else {
      // CPR muito baixo = provavelmente engajamento/visualizações
      return {
        cprIdeal: 2,
        objetivo: 'Engajamento/Tráfego',
        tipoConversao: 'interações'
      };
    }
  };

  // Função para calcular Performance Score
  const calcularPerformanceScore = ({
    cprAtual,
    cpcAtual,
    conversoesAtuais,
    frequenciaAtual,
    cprIdeal = 30,
    cpcIdeal = 2,
    conversoesIdeais = 100,
    frequenciaIdeal = 3
  }: {
    cprAtual: number;
    cpcAtual: number;
    conversoesAtuais: number;
    frequenciaAtual: number;
    cprIdeal?: number;
    cpcIdeal?: number;
    conversoesIdeais?: number;
    frequenciaIdeal?: number;
  }): number => {
    // Função auxiliar para limitar valor entre 0 e 100
    const limitarScore = (score: number): number => {
      return Math.max(0, Math.min(100, score));
    };

    // 1. CPR Score (40% do peso) - Quanto menor, melhor
    let cprScore = 0;
    if (cprAtual <= cprIdeal) {
      cprScore = 100; // CPR ideal ou melhor
    } else if (cprAtual > 0) {
      cprScore = limitarScore((cprIdeal / cprAtual) * 100);
    }
    const cprPonderado = cprScore * 0.40;

    // 2. CPC Score (25% do peso) - Quanto menor, melhor
    let cpcScore = 0;
    if (cpcAtual <= cpcIdeal) {
      cpcScore = 100; // CPC ideal ou melhor
    } else if (cpcAtual > 0) {
      cpcScore = limitarScore((cpcIdeal / cpcAtual) * 100);
    }
    const cpcPonderado = cpcScore * 0.25;

    // 3. Conversões Score (25% do peso) - Quanto maior, melhor
    let conversoesScore = 0;
    if (conversoesAtuais >= conversoesIdeais) {
      conversoesScore = 100; // Conversões ideais ou melhor
    } else if (conversoesIdeais > 0) {
      conversoesScore = limitarScore((conversoesAtuais / conversoesIdeais) * 100);
    }
    const conversoesPonderado = conversoesScore * 0.25;

    // 4. Frequência Score (10% do peso) - Quanto menor, melhor
    let frequenciaScore = 0;
    if (frequenciaAtual <= frequenciaIdeal) {
      frequenciaScore = 100; // Frequência ideal ou melhor
    } else if (frequenciaAtual > 0) {
      frequenciaScore = limitarScore((frequenciaIdeal / frequenciaAtual) * 100);
    }
    const frequenciaPonderado = frequenciaScore * 0.10;

    // Calcular score final
    const scoreFinal = Math.round(
      cprPonderado + cpcPonderado + conversoesPonderado + frequenciaPonderado
    );

    // Log detalhado para debug
    
    
    
    
    
    

    return scoreFinal;
  };

  const filteredAds = ads.filter(ad => {
    const matchesTab = (() => {
      switch (selectedTab) {
        case 'active':
          return ad.status === 'active';
        case 'paused':
          return ad.status === 'paused';
        case 'top':
          return ad.rank <= 3;
        default:
          return true;
      }
    })();

    return matchesTab;
  });

  const activeAds = ads.filter(ad => ad.status === 'active').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-full border border-purple-500/20 backdrop-blur-sm">
            <Target className="w-5 h-5 text-purple-400" />
            <span className="text-sm font-medium text-purple-300">Performance Analytics</span>
          </div>
          
          {/* Status da sincronização */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                loading
                  ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg shadow-purple-500/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Sincronizando...' : 'Sincronizar Dados'}
            </button>
            
            {lastSync && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Última sincronização:</span>
                <span className="font-medium">{lastSync}</span>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>

        {/* Enhanced Tabs Navigation */}
        <div className="flex flex-wrap gap-3 justify-center">
          {[
            { value: 'all', label: 'Todos', color: 'from-slate-600 to-slate-500', count: ads.length },
            { value: 'active', label: 'Ativos', color: 'from-green-500 to-emerald-500', count: activeAds },
            { value: 'paused', label: 'Pausados', color: 'from-orange-500 to-red-500', count: ads.filter(ad => ad.status === 'paused').length },
            { value: 'top', label: 'Top Performance', color: 'from-yellow-500 to-amber-500', count: ads.filter(ad => ad.rank <= 3).length }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setSelectedTab(tab.value)}
              className={`relative px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                selectedTab === tab.value
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg shadow-purple-500/10`
                  : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300 border border-slate-700/50 backdrop-blur-sm'
              }`}
            >
              <span className="flex items-center gap-2">
                {tab.label}
                <span className={`px-2 py-1 rounded-full text-xs ${
                  selectedTab === tab.value 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-700/50 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-3">Sincronizando dados...</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Buscando anúncios do Meta Ads e calculando métricas de performance.
            </p>
          </div>
        )}

        {/* Clean Ads Grid - No Images */}
        {!loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredAds.map((ad) => (
            <div
              key={ad.id}
              className={`group relative bg-gradient-to-br from-slate-800/90 via-slate-800/80 to-slate-800/70 backdrop-blur-sm border border-slate-700/50 rounded-2xl transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20 ${
                hoveredAd === ad.id ? 'ring-2 ring-purple-500/50' : ''
              }`}
              onMouseEnter={() => setHoveredAd(ad.id)}
              onMouseLeave={(e) => handleCardMouseLeave(ad.id, e)}
            >
              {/* Header with Rank and Status */}
              <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 bg-black/70 backdrop-blur-sm rounded-full border border-white/10">
                      {getRankIcon(ad.rank)}
                      <span className="text-sm font-semibold text-white">#{ad.rank}</span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full border backdrop-blur-sm ${getStatusColor(ad.status)}`}>
                    <div className="flex items-center gap-1">
                      {ad.status === 'active' ? (
                        <Play className="w-3 h-3" />
                      ) : ad.status === 'paused' ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Settings className="w-3 h-3" />
                      )}
                      <span className="text-xs font-medium">
                        {ad.status === 'active' ? 'Ativo' : ad.status === 'paused' ? 'Pausado' : 'Rascunho'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Title and Category */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-purple-300 transition-colors flex-1 truncate" title={ad.title}>
                      {ad.title}
                    </h3>
                      {(() => {
                        const trendData = calculateTrendIcon({
                          cprAtual: ad.metrics.last7DaysCpr || 0,
                          cprAnterior: ad.metrics.previous7DaysCpr || 0,
                          ctrAtual: ad.metrics.last7DaysCtr || 0,
                          ctrAnterior: ad.metrics.previous7DaysCtr || 0,
                          conversoesAtuais: ad.metrics.last7DaysConversions || 0,
                          conversoesAnteriores: ad.metrics.previous7DaysConversions || 0,
                          frequenciaAtual: ad.metrics.frequency || 0,
                          last3DaysCpr: ad.metrics.last3DaysCpr || 0,
                          last3DaysCtr: ad.metrics.last3DaysCtr || 0,
                          last3DaysConversions: ad.metrics.last3DaysConversions || 0,
                          previous3DaysCpr: ad.metrics.previous3DaysCpr || 0,
                          previous3DaysCtr: ad.metrics.previous3DaysCtr || 0,
                          previous3DaysConversions: ad.metrics.previous3DaysConversions || 0,
                          objetivo: ad.performanceScoreMetrics?.objetivo || 'Indefinido',
                          tipoConversao: ad.performanceScoreMetrics?.tipoConversao || 'conversões'
                        });
                        
                                                 return (
                           <div className="relative">
                             <div className="group/trend-icon cursor-help">
                               {getTrendIcon(trendData.trend)}
                               {trendData.explanation && (
                                 <div className="absolute top-1/2 right-full transform -translate-y-1/2 mr-2 px-4 py-3 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-600 rounded-xl shadow-2xl text-sm text-slate-200 opacity-0 group-hover/trend-icon:opacity-100 transition-all duration-300 z-50 pointer-events-none backdrop-blur-sm" style={{ width: '320px', maxWidth: '320px' }}>
                                   <div className="space-y-2">
                                     {/* Título do alerta */}
                                     <div className="flex items-center gap-2 mb-2">
                                       <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                                       <span className="font-semibold text-red-300 text-xs uppercase tracking-wide">
                                         {trendData.trend === 'warning' ? 'Alerta para Conversões!' : 
                                          trendData.trend === 'up' ? 'Tendência Positiva!' :
                                          trendData.trend === 'down' ? 'Tendência Negativa!' : 'Status'}
                                       </span>
                                     </div>
                                     
                                     {/* Conteúdo principal */}
                                     <div className="text-sm leading-relaxed space-y-1">
                                       {trendData.explanation.split('<br>').map((sentence, index) => {
                                         // Função para destacar partes importantes
                                         const highlightText = (text: string) => {
                                           let highlightedText = text;
                                           
                                           // Destacar porcentagens (incluindo decimais)
                                           highlightedText = highlightedText.replace(/(\d+(?:,\d+)?(?:\.\d+)?%?)/g, '<strong class="text-yellow-300 font-semibold">$1</strong>');
                                           
                                           // Destacar valores monetários
                                           highlightedText = highlightedText.replace(/(R\$ \d+(?:,\d+)?(?:\.\d+)?)/g, '<strong class="text-green-300 font-semibold">$1</strong>');
                                           
                                           // Destacar palavras-chave importantes (métricas)
                                           highlightedText = highlightedText.replace(/(conversões|leads|cliques|CPR|CPC|CTR|frequência|público|impressões|alcance)/gi, '<strong class="text-blue-300 font-semibold">$1</strong>');
                                           
                                           // Destacar ações e status
                                           highlightedText = highlightedText.replace(/(melhorou|aumentou|diminuiu|piorou|caíram|necessária|revisar|estável|controlada|saturada|cansado)/gi, '<strong class="text-orange-300 font-semibold">$1</strong>');
                                           
                                           // Destacar alertas e urgência
                                           highlightedText = highlightedText.replace(/(alerta|urgente|crítico|atenção|imediata|rápida)/gi, '<strong class="text-red-300 font-semibold">$1</strong>');
                                           
                                           // Destacar períodos de tempo
                                           highlightedText = highlightedText.replace(/(últimos \d+ dias?|últimas \d+ horas?|semana|mês)/gi, '<strong class="text-purple-300 font-semibold">$1</strong>');
                                           
                                           return highlightedText;
                                         };

                                         const highlightedSentence = highlightText(sentence);
                                         
                                         return (
                                           <p key={index} className="text-slate-300" 
                                              dangerouslySetInnerHTML={{ __html: highlightedSentence }}>
                                           </p>
                                         );
                                       })}
                                     </div>
                                     
                                     {/* Ação recomendada */}
                                     {trendData.trend === 'warning' && (
                                       <div className="mt-2 pt-2 border-t border-slate-600">
                                         <p className="text-xs text-amber-300 font-medium">
                                           ⚡ Ação rápida necessária para evitar desperdício.
                                         </p>
                                       </div>
                                     )}
                                   </div>
                                   
                                   {/* Seta do tooltip */}
                                   <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-slate-800"></div>
                                 </div>
                               )}
                             </div>
                           </div>
                         );
                      })()}
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2 leading-relaxed">
                    {ad.description.length > 120 ? `${ad.description.substring(0, 120)}...` : ad.description}
                  </p>
                  <div className="flex items-center justify-end">
                    <span className="text-xs text-slate-400">
                      {ad.lastUpdated}
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="px-6 pb-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg group/metric-cpr relative z-10"
                       onMouseEnter={(e) => handleMetricTooltipEnter(ad.id, 'cpr', e)}>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-slate-400 font-medium">CPR</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                        {formatCurrency(ad.metrics.cpr)}
                    </p>
                    {/* Tooltip local removido, usamos portal global */}
                  </div>
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg group/metric-cpc relative z-10"
                       onMouseEnter={(e) => handleMetricTooltipEnter(ad.id, 'cpc', e)}>
                    <div className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-slate-400 font-medium">CPC</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(ad.metrics.cpc)}
                    </p>
                    {/* Tooltip local removido, usamos portal global */}
                  </div>
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg group/metric-ctr relative z-10"
                       onMouseEnter={(e) => handleMetricTooltipEnter(ad.id, 'ctr', e)}>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-slate-400 font-medium">CTR</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                        {ad.metrics.ctr.toFixed(2)}%
                    </p>
                    {/* Tooltip local removido, usamos portal global */}
                  </div>
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg group/metric-freq relative z-10"
                       onMouseEnter={(e) => handleMetricTooltipEnter(ad.id, 'freq', e)}>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-slate-400 font-medium">Frequência Total</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                        {ad.metrics.frequency ? ad.metrics.frequency.toFixed(1) : (ad.metrics.impressions / ad.metrics.clicks).toFixed(1)}
                    </p>
                    {/* Tooltip local removido, usamos portal global */}
                  </div>
                </div>
              </div>

              {/* Performance Bar */}
              <div className="px-6 pb-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                      <div className="flex items-center space-x-2">
                    <span className="text-slate-400 font-medium">Performance Score</span>
                        <button
                          ref={(el) => buttonRefs.current[ad.id] = el}
                          onMouseEnter={(e) => handleTooltipHover(ad.id, e)}
                          onMouseLeave={handleTooltipLeave}
                          className="text-slate-400 hover:text-white transition-colors"
                          data-tooltip-button
                        >
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    <span className="text-white font-bold">
                        {ad.performanceScore || 0}%
                    </span>
                  </div>
                    <div className="relative">
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${ad.performanceScore || 0}%` }}
                    />
                      </div>
                      
                      {/* Tooltip será renderizado globalmente */}
                  </div>
                </div>
              </div>

              {/* Revenue & Spend */}
              <div className="px-6 pb-3">
                <div className="flex justify-between items-center pt-2 border-t border-slate-700/50">
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">Gasto</p>
                    <p className="text-sm font-bold text-red-400">
                      {formatCurrency(ad.metrics.spend)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400 font-medium">Receita</p>
                    <p className="text-sm font-bold text-green-400">
                      {formatCurrency(ad.metrics.revenue)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-6 pb-4">
                <div className="flex gap-2">
                    {ad.adLink ? (
                      <a 
                        href={ad.adLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-3 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg shadow-purple-500/10 text-sm text-center flex items-center justify-center gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ver Detalhes
                      </a>
                    ) : (
                      <button 
                        className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white px-3 py-2 rounded-lg font-medium transition-all duration-300 shadow-lg shadow-purple-500/10 text-sm flex items-center justify-center gap-2"
                        title="Link do anúncio não disponível"
                      >
                        <ExternalLink className="w-4 h-4" />
                    Ver Detalhes
                  </button>
                    )}
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" />
            </div>
          ))}
        </div>
        )}

        {/* Enhanced Empty State */}
        {!loading && filteredAds.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-semibold text-slate-300 mb-3">Nenhum anúncio veiculado</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Não há anúncios veiculados em {localStorage.getItem('selectedMonth') || 'este mês'} para esse conjunto de anúncios. Apenas anúncios que tiveram veiculação são exibidos.
            </p>
          </div>
        )}

        {/* Tooltip Global */}
        {tooltipAdId && tooltipPosition && (
          (() => {
            
            return true;
          })(),
          <div 
            className="absolute z-[999999]"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y
            }}
            onMouseEnter={() => {
              // Manter tooltip visível quando mouse entrar nele
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => {
              // Esconder tooltip quando mouse sair dele
              setTimeout(() => {
                setTooltipAdId(null);
                setTooltipPosition(null);
              }, 200);
            }}
          >
            <div className="bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-xl" style={{ width: '400px' }}>
              <div className="text-center mb-3">
                <div className="text-lg font-bold text-white mb-1">
                  {ads.find(ad => ad.id === tooltipAdId)?.performanceScore || 0}%
                </div>
                <div className="text-xs text-slate-400">
                  Performance Score
                </div>
              </div>
              
              <div className="text-sm text-slate-300 leading-relaxed">
                {(() => {
                  const ad = ads.find(ad => ad.id === tooltipAdId);
                  const score = ad?.performanceScore || 0;
                  const metrics = ad?.performanceScoreMetrics;
                   const objetivo = metrics?.objetivo || 'Indefinido';
                   const tipoConversao = metrics?.tipoConversao || 'conversões';
                   const cprIdeal = metrics?.cprIdeal || 30;
                   const cprAtual = metrics?.cpr || 0;

                   if (score >= 90) {
                     return (
                       <div>
                         <p className="mb-2">🎉 <strong>Excelente performance!</strong></p>
                         <p>Este anúncio está <strong>funcionando perfeitamente</strong> para <strong>{objetivo}</strong>! Está gerando {tipoConversao} com custo eficiente (CPR: R$ {cprAtual.toFixed(2)} vs ideal: R$ {cprIdeal.toFixed(2)}), e as pessoas estão vendo o anúncio na frequência ideal.</p>
                       </div>
                     );
                   } else if (score >= 70) {
                     return (
                       <div>
                         <p className="mb-2">👍 <strong>Boa performance!</strong></p>
                         <p>O anúncio está <strong>funcionando bem</strong> para <strong>{objetivo}</strong>! Está gerando {tipoConversao} de forma eficiente (CPR: R$ {cprAtual.toFixed(2)} vs ideal: R$ {cprIdeal.toFixed(2)}). Pode melhorar um pouco mais para chegar ao nível excelente.</p>
                       </div>
                     );
                   } else if (score >= 50) {
                     return (
                       <div>
                         <p className="mb-2">⚠️ <strong>Performance regular</strong></p>
                         <p>O anúncio está <strong>funcionando, mas pode melhorar</strong> para <strong>{objetivo}</strong>. CPR atual (R$ {cprAtual.toFixed(2)}) está {cprAtual > cprIdeal ? 'acima' : 'próximo'} do ideal (R$ {cprIdeal.toFixed(2)}). Vale a pena revisar a estratégia.</p>
                       </div>
                     );
                   } else if (score >= 30) {
                     return (
                       <div>
                         <p className="mb-2">😕 <strong>Performance baixa</strong></p>
                         <p>O anúncio <strong>não está funcionando bem</strong> para <strong>{objetivo}</strong>. CPR atual (R$ {cprAtual.toFixed(2)}) está muito acima do ideal (R$ {cprIdeal.toFixed(2)}). Precisa de ajustes na estratégia ou no público-alvo.</p>
                       </div>
                     );
                   } else {
                     return (
                       <div>
                         <p className="mb-2">❌ <strong>Performance muito baixa</strong></p>
                         <p>Este anúncio <strong>precisa de atenção imediata</strong> para <strong>{objetivo}</strong>. CPR atual (R$ {cprAtual.toFixed(2)}) está muito alto comparado ao ideal (R$ {cprIdeal.toFixed(2)}). Considere pausar e revisar completamente a estratégia.</p>
                       </div>
                     );
                   }
                })()}
              </div>
              
              <div className="mt-3 pt-2 border-t border-slate-600">
                <div className="text-xs text-slate-400">
                                     {(() => {
                     const ad = ads.find(ad => ad.id === tooltipAdId);
                     const metrics = ad?.performanceScoreMetrics;
                     const objetivo = metrics?.objetivo || 'Indefinido';
                     const score = ad?.performanceScore || 0;
                     
                     if (score >= 90) {
                       return <p><strong>Dicas para {objetivo}:</strong> Mantenha o excelente trabalho! Para continuar no topo:</p>;
                     } else if (score >= 70) {
                       return <p><strong>Dicas para {objetivo}:</strong> Para chegar ao nível excelente, foque em:</p>;
                     } else if (score >= 50) {
                       return <p><strong>Dicas para {objetivo}:</strong> Para melhorar significativamente, priorize:</p>;
                     } else if (score >= 30) {
                       return <p><strong>Dicas para {objetivo}:</strong> Para recuperar a performance, concentre-se em:</p>;
                     } else {
                       return <p><strong>Dicas para {objetivo}:</strong> Para reverter a situação, aja imediatamente em:</p>;
                     }
                   })()}
                  <ul className="mt-1 space-y-1">
                                         {(() => {
                       const ad = ads.find(ad => ad.id === tooltipAdId);
                       const score = ad?.performanceScore || 0;
                       const metrics = ad?.performanceScoreMetrics;
                       const objetivo = metrics?.objetivo || 'Indefinido';
                       const tipoConversao = metrics?.tipoConversao || 'conversões';
                       const cprIdeal = metrics?.cprIdeal || 30;
                       
                       if (score >= 90) {
                         return (
                           <>
                             <li>• <strong>Monitoramento:</strong> Continue acompanhando as métricas de {tipoConversao} diariamente</li>
                             <li>• <strong>Testes:</strong> Experimente pequenos ajustes para otimizar ainda mais {tipoConversao}</li>
                             <li>• <strong>Escala:</strong> Considere aumentar o orçamento gradualmente para mais {tipoConversao}</li>
                             <li>• <strong>Público:</strong> Teste públicos similares para expandir alcance de {tipoConversao}</li>
                           </>
                         );
                       } else if (score >= 70) {
                         return (
                           <>
                             <li>• <strong>CPR:</strong> {metrics?.cpr && metrics.cpr > cprIdeal ? `Reduza o custo de ${tipoConversao} (atual: R$ ${metrics.cpr.toFixed(2)} vs ideal: R$ ${cprIdeal.toFixed(2)})` : `Mantenha o CPR atual e foque em mais ${tipoConversao}`}</li>
                             <li>• <strong>Conversões:</strong> {metrics?.conversions && metrics.conversions < 50 ? `Aumente ${tipoConversao} melhorando landing pages` : `Otimize a qualidade das ${tipoConversao}`}</li>
                             <li>• <strong>CPC:</strong> {metrics?.cpc && metrics.cpc > 2 ? "Teste criativos mais relevantes para reduzir CPC" : "Mantenha o CPC baixo e foque em volume"}</li>
                             <li>• <strong>Frequência:</strong> {metrics?.frequency && metrics.frequency > 3 ? "Reduza frequência para evitar saturação" : "Aumente frequência para mais exposição"}</li>
                           </>
                         );
                       } else if (score >= 50) {
                         return (
                           <>
                             <li>• <strong>Público:</strong> Revise o público-alvo para {objetivo.toLowerCase()} - pode estar muito amplo</li>
                             <li>• <strong>Criativos:</strong> Teste novos textos focados em {tipoConversao} - os atuais podem estar saturados</li>
                             <li>• <strong>Landing:</strong> Otimize landing pages para aumentar taxa de {tipoConversao}</li>
                             <li>• <strong>Orçamento:</strong> Reduza temporariamente para focar na qualidade das {tipoConversao}</li>
                           </>
                         );
                       } else if (score >= 30) {
                         return (
                           <>
                             <li>• <strong>Pausa:</strong> Considere pausar temporariamente para reestruturar a estratégia de {tipoConversao}</li>
                             <li>• <strong>Público:</strong> Defina um público mais específico e qualificado para {objetivo.toLowerCase()}</li>
                             <li>• <strong>Criativos:</strong> Crie novos anúncios focados especificamente em {tipoConversao}</li>
                             <li>• <strong>Objetivo:</strong> Revise se o objetivo atual ({objetivo}) está correto</li>
                           </>
                         );
                       } else {
                         return (
                           <>
                             <li>• <strong>Pausa Imediata:</strong> Pare o anúncio para evitar desperdício de orçamento em {tipoConversao} ineficazes</li>
                             <li>• <strong>Análise:</strong> Investigue por que o público não está convertendo em {tipoConversao}</li>
                             <li>• <strong>Reestruturação:</strong> Crie uma nova estratégia completamente diferente para {objetivo.toLowerCase()}</li>
                             <li>• <strong>Suporte:</strong> Considere buscar ajuda especializada em campanhas de {objetivo.toLowerCase()}</li>
                           </>
                         );
                       }
                     })()}
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Seta do tooltip */}
            <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
          </div>
        )}

        {/* Tooltip Global para métricas (CPR/CPC/CTR/Freq) - fora do fluxo para evitar stacking context */}
        {metricTooltip && portalRef.current && createPortal(
          <div
            ref={metricTooltipWrapperRef}
            className="pointer-events-auto"
            style={{ position: 'fixed', left: metricTooltip.position.x, top: metricTooltip.position.y }}
            onMouseEnter={() => {
              if (tooltipTimeoutRef.current) {
                clearTimeout(tooltipTimeoutRef.current);
                tooltipTimeoutRef.current = null;
              }
            }}
            onMouseLeave={() => handleMetricTooltipLeave()}
          >
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 w-72 text-slate-200">
              <p className="text-xs text-slate-300 font-semibold mb-2">
                {metricTooltip.metric === 'cpr' && 'Últimos 7 dias (CPR/dia)'}
                {metricTooltip.metric === 'cpc' && 'Últimos 7 dias (CPC/dia)'}
                {metricTooltip.metric === 'ctr' && 'Últimos 7 dias (CTR/dia)'}
                {metricTooltip.metric === 'freq' && 'Últimos 7 dias (Frequência/dia)'}
              </p>
              <ul className="text-xs text-slate-400 space-y-1">
                {(() => {
                  const ad = ads.find(a => a.id === metricTooltip.adId);
                  const details = ad?.metrics?.last7DaysDetails || [];
                  if (!details.length) {
                    return <li className="text-slate-500">Sem dados nos últimos 7 dias</li>;
                  }
                  // Ordenar com o dia atual no topo e demais em ordem decrescente (sequenciais)
                  const ordered = [...details].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                  return ordered.map((d: any, idx: number) => {
                    const parts = getTooltipDateParts(d.date);
                    return (
                    <li key={idx} className="flex justify-between py-1 border-b border-slate-700/60 last:border-0">
                      <span>
                        {parts.dateStr}
                        {' '}
                        <span className={`font-medium ${parts.tagClass}`}>({parts.tagText})</span>
                      </span>
                      <span>
                        {metricTooltip.metric === 'cpr' && `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.cpr || 0)}`}
                        {metricTooltip.metric === 'cpc' && `${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(d.cpc || 0)}`}
                        {metricTooltip.metric === 'ctr' && `${Number(d.ctr || 0).toFixed(2)}%`}
                        {metricTooltip.metric === 'freq' && `${Number(d.frequency || 0).toFixed(1)}x`}
                      </span>
                    </li>
                  );});
                })()}
              </ul>
            </div>
          </div>,
          portalRef.current
        )}
      </div>
    </div>
  );
};

export default PerformanceAdsSection; 