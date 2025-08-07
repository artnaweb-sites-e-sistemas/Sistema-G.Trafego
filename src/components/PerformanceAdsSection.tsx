import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink
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
  cpa: number;
  reach?: number;
  frequency?: number;
  cpm?: number;
  // Métricas da semana anterior para cálculo de tendência
  cpaAnterior?: number;
  ctrAnterior?: number;
  conversionsAnterior?: number;
}

interface AdData {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  status: 'active' | 'paused' | 'draft';
  rank: number;
  metrics: AdMetrics;
  trend: 'up' | 'down' | 'stable';
  category: string;
  lastUpdated: string;
  adset_id?: string;
  campaign_id?: string;
  adLink?: string;
  createdTime?: string;
  performanceScore?: number;
  performanceScoreMetrics?: {
    cpa: number;
    cpc: number;
    conversions: number;
    frequency: number;
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
  const buttonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Função para buscar dados reais do Meta Ads
  const fetchRealAdsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Verificar se o Meta Ads está configurado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        console.log('Meta Ads não configurado');
        setAds([]);
        setLastSync('Meta Ads não configurado');
        return;
      }

      // Testar disponibilidade de dados na conta
      try {
        console.log('Testando disponibilidade de dados na conta Meta Ads...');
        const dataAvailability = await metaAdsService.testAccountDataAvailability();
        console.log('Resultado do teste de disponibilidade:', dataAvailability);
      } catch (error) {
        console.error('Erro ao testar disponibilidade de dados:', error);
      }

      // Obter período selecionado do localStorage
      const selectedMonth = localStorage.getItem('selectedMonth') || '';
      const selectedClient = localStorage.getItem('currentSelectedClient') || '';
      const selectedProduct = localStorage.getItem('currentSelectedProduct') || '';
      const selectedAudience = localStorage.getItem('currentSelectedAudience') || '';
      const selectedCampaignId = localStorage.getItem('selectedCampaignId') || '';
      const selectedAdSetId = localStorage.getItem('selectedAdSetId') || '';

      console.log('Parâmetros de busca:', {
        selectedMonth,
        selectedClient,
        selectedProduct,
        selectedAudience,
        selectedCampaignId,
        selectedAdSetId
      });

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
        
        const startDate = new Date(year, monthIndex, 1).toISOString().split('T')[0];
        const endDate = new Date(year, monthIndex + 1, 0).toISOString().split('T')[0];
        
        return { startDate, endDate };
      };

      const getLast7DaysDates = (month: string) => {
        // Calcular os últimos 7 dias do período selecionado
        const { startDate, endDate } = getPeriodDates(month);
        const periodEnd = new Date(endDate);
        
        // Calcular início dos últimos 7 dias
        const last7DaysStart = new Date(periodEnd);
        last7DaysStart.setDate(periodEnd.getDate() - 6); // 7 dias atrás (incluindo hoje)
        
        return {
          startDate: last7DaysStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0]
        };
      };

      const getLast3DaysDates = (month: string) => {
        // Calcular os últimos 3 dias do período selecionado
        const { startDate, endDate } = getPeriodDates(month);
        const periodEnd = new Date(endDate);
        
        // Calcular início dos últimos 3 dias
        const last3DaysStart = new Date(periodEnd);
        last3DaysStart.setDate(periodEnd.getDate() - 2); // 3 dias atrás (incluindo hoje)
        
        return {
          startDate: last3DaysStart.toISOString().split('T')[0],
          endDate: periodEnd.toISOString().split('T')[0]
        };
      };

      const { startDate, endDate } = getPeriodDates(selectedMonth);
      const { startDate: last7DaysStart, endDate: last7DaysEnd } = getLast7DaysDates(selectedMonth);
      const { startDate: last3DaysStart, endDate: last3DaysEnd } = getLast3DaysDates(selectedMonth);
      console.log('Período atual calculado:', { startDate, endDate });
      console.log('Últimos 7 dias calculados:', { last7DaysStart, last7DaysEnd });
      console.log('Últimos 3 dias calculados:', { last3DaysStart, last3DaysEnd });

      // Buscar anúncios do Meta Ads
      console.log('Buscando anúncios do Meta Ads...');
      const metaAds = await metaAdsService.getAds(selectedAdSetId, selectedCampaignId);
      console.log('Anúncios encontrados:', metaAds.length);
      console.log('Primeiro anúncio:', metaAds[0]);
      
      if (metaAds.length === 0) {
        console.log('Nenhum anúncio encontrado no Meta Ads');
        setAds([]);
        setLastSync('Nenhum anúncio encontrado');
        return;
      }

      // Buscar insights para cada anúncio
      const adsWithInsights: AdData[] = [];
      
      for (const ad of metaAds) {
        try {
          console.log(`Processando anúncio ${ad.id}:`, ad.name);
          console.log(`Anúncio completo:`, ad);
          console.log(`effective_object_story_id disponível:`, ad.effective_object_story_id ? 'Sim' : 'Não');
          if (ad.effective_object_story_id) {
            console.log(`effective_object_story_id: ${ad.effective_object_story_id}`);
          } else {
            console.log(`❌ effective_object_story_id não encontrado para anúncio ${ad.id}`);
          }
          
          // Buscar insights separadamente: período selecionado, últimos 7 dias, últimos 3 dias e período total
          let periodInsights: any[] = [];
          let last7DaysInsights: any[] = [];
          let last3DaysInsights: any[] = [];
          let allTimeInsights: any[] = [];
          
          try {
            // Buscar insights de todos os meses ativos do anúncio (desde criação até hoje)
            if (ad.created_time) {
              const createdDate = new Date(ad.created_time);
              const today = new Date();
              const allTimeStartDate = createdDate.toISOString().split('T')[0];
              const allTimeEndDate = today.toISOString().split('T')[0];
              
              console.log(`🔄 Buscando insights de todos os meses ativos para anúncio ${ad.id} (${allTimeStartDate} a ${allTimeEndDate})`);
              allTimeInsights = await metaAdsService.getAdInsights(ad.id, allTimeStartDate, allTimeEndDate, true); // Buscar agregado para todas as métricas
              console.log(`Insights totais encontrados para anúncio ${ad.id}:`, allTimeInsights.length);
              
              // Buscar insights do período selecionado (para exibição das métricas nos cards)
              periodInsights = await metaAdsService.getAdInsights(ad.id, startDate, endDate, false);
              console.log(`Insights do período selecionado para exibição:`, periodInsights.length);
              
              // Buscar insights dos últimos 7 dias (para tendência principal)
              last7DaysInsights = await metaAdsService.getAdInsights(ad.id, last7DaysStart, last7DaysEnd, false);
              console.log(`Insights dos últimos 7 dias para tendência:`, last7DaysInsights.length);
              
              // Buscar insights dos últimos 3 dias (para termômetro imediato)
              last3DaysInsights = await metaAdsService.getAdInsights(ad.id, last3DaysStart, last3DaysEnd, false);
              console.log(`Insights dos últimos 3 dias para termômetro:`, last3DaysInsights.length);
            } else {
              // Fallback: usar os mesmos dados do período selecionado
              console.log(`⚠️ created_time não disponível, usando período selecionado para anúncio ${ad.id}`);
              periodInsights = await metaAdsService.getAdInsights(ad.id, startDate, endDate, false);
              allTimeInsights = periodInsights;
            }
          } catch (error) {
            console.error(`Erro ao buscar insights para anúncio ${ad.id}:`, error);
            // Fallback: tentar do Ad Set
            try {
              periodInsights = await metaAdsService.getAdSetInsights(ad.adset_id, startDate, endDate);
              allTimeInsights = periodInsights;
              console.log(`Insights encontrados via Ad Set (fallback) para anúncio ${ad.id}:`, periodInsights.length);
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
                console.log(`🔄 Usando effective_object_story_id para anúncio ${ad.id}: ${ad.effective_object_story_id}`);
                
                // O effective_object_story_id vem no formato "pageId_postId"
                const storyParts = ad.effective_object_story_id.split('_');
                if (storyParts.length >= 2) {
                  const pageId = storyParts[0];
                  const postId = storyParts[1];
                  
                  console.log(`Page ID extraído do effective_object_story_id: ${pageId}`);
                  console.log(`Post ID extraído do effective_object_story_id: ${postId}`);
                  
                  const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                  console.log(`✅ URL do post gerada via effective_object_story_id para anúncio ${ad.id}:`, postUrl);
                  return postUrl;
                }
              }
              
              // Estratégia 2: Buscar effective_object_story_id via API de adcreatives
              console.log(`🔄 Buscando effective_object_story_id via API de adcreatives para anúncio ${ad.id}`);
              try {
                const adCreatives = await metaAdsService.getAdCreativesWithEffectiveObjectStory();
                console.log(`Adcreatives com effective_object_story_id encontrados: ${adCreatives.length}`);
                
                // Procurar pelo creative_id do anúncio atual
                const adDetails = await metaAdsService.getAdDetails(ad.id);
                const creativeId = adDetails?.creative?.id;
                
                if (creativeId) {
                  console.log(`Creative ID do anúncio ${ad.id}: ${creativeId}`);
                  
                  const matchingCreative = adCreatives.find((creative: any) => creative.id === creativeId);
                  if (matchingCreative && matchingCreative.effective_object_story_id) {
                    console.log(`✅ Creative encontrado com effective_object_story_id: ${matchingCreative.effective_object_story_id}`);
                    
                    const storyParts = matchingCreative.effective_object_story_id.split('_');
                    if (storyParts.length >= 2) {
                      const pageId = storyParts[0];
                      const postId = storyParts[1];
                      
                      const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                      console.log(`✅ URL do post gerada via API de adcreatives para anúncio ${ad.id}:`, postUrl);
                      return postUrl;
                    }
                  } else {
                    console.log(`❌ Creative ${creativeId} não encontrado ou sem effective_object_story_id`);
                  }
                }
              } catch (apiError) {
                console.error(`❌ Erro ao buscar adcreatives:`, apiError);
              }
              
              // Estratégia 3: Buscar detalhes completos do anúncio para obter page_id
              const adDetails = await metaAdsService.getAdDetails(ad.id);
              console.log(`Detalhes completos do anúncio ${ad.id}:`, adDetails);
              
              // Verificar se temos page_id nos detalhes do anúncio
              const pageId = adDetails?.creative?.object_story_spec?.page_id;
              console.log(`Page ID encontrado para anúncio ${ad.id}:`, pageId);
              
              if (pageId) {
                // Tentar extrair post_id do link do anúncio
                const link = adDetails.creative?.object_story_spec?.link_data?.link || 
                            adDetails.creative?.object_story_spec?.video_data?.call_to_action?.value?.link;
                
                console.log(`Link do anúncio ${ad.id}:`, link);
                
                if (link) {
                  // Tentar extrair post_id do link do Facebook - múltiplas estratégias
                  console.log(`Tentando extrair post_id do link: ${link}`);
                  
                  // Estratégia 4: facebook.com/pagina/posts/123456789
                  const postMatch = link.match(/facebook\.com\/[^\/]+\/posts\/(\d+)/);
                  if (postMatch) {
                    const postId = postMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    console.log(`✅ Post ID extraído (estratégia 3): ${postId}`);
                    console.log(`URL do post gerada para anúncio ${ad.id}:`, postUrl);
                    return postUrl;
                  }
                  
                  // Estratégia 5: facebook.com/pagina/123456789
                  const alternativeMatch = link.match(/facebook\.com\/[^\/]+\/(\d+)/);
                  if (alternativeMatch) {
                    const postId = alternativeMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    console.log(`✅ Post ID extraído (estratégia 4): ${postId}`);
                    console.log(`URL do post gerada (formato alternativo) para anúncio ${ad.id}:`, postUrl);
                    return postUrl;
                  }
                  
                  // Estratégia 6: buscar por qualquer número no final da URL
                  const numberMatch = link.match(/(\d+)(?:\?|$)/);
                  if (numberMatch) {
                    const postId = numberMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    console.log(`✅ Post ID extraído (estratégia 5): ${postId}`);
                    console.log(`URL do post gerada (número no final) para anúncio ${ad.id}:`, postUrl);
                    return postUrl;
                  }
                  
                  // Estratégia 7: buscar por qualquer número de 15 dígitos (formato do post_id)
                  const longNumberMatch = link.match(/(\d{15,})/);
                  if (longNumberMatch) {
                    const postId = longNumberMatch[1];
                    const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                    console.log(`✅ Post ID extraído (estratégia 6 - número longo): ${postId}`);
                    console.log(`URL do post gerada (número longo) para anúncio ${ad.id}:`, postUrl);
                    return postUrl;
                  }
                  
                  console.log(`❌ Não foi possível extrair post_id do link: ${link}`);
                } else {
                  console.log(`❌ Nenhum link encontrado no anúncio ${ad.id}`);
                }
                
                // Estratégia 8: Buscar post IDs da página via API (como fallback)
                try {
                  console.log(`🔄 Tentando buscar post IDs da página ${pageId} via API`);
                  const accessToken = metaAdsService.getAccessToken();
                  console.log(`Access Token disponível:`, accessToken ? 'Sim' : 'Não');
                  
                  if (accessToken) {
                    console.log(`Chamando getPostIdsFromPage para página ${pageId}`);
                    const postIds = await metaAdsService.getPostIdsFromPage(pageId, accessToken);
                    console.log(`Post IDs retornados da API:`, postIds);
                    
                    if (postIds && postIds.length > 0) {
                      // Usar o primeiro post ID (mais recente)
                      const postId = postIds[0];
                      const postUrl = `https://www.facebook.com/${pageId}/posts/${postId}`;
                      console.log(`✅ Post ID obtido via API para anúncio ${ad.id}: ${postId}`);
                      console.log(`URL do post gerada (via API) para anúncio ${ad.id}:`, postUrl);
                      return postUrl;
                    } else {
                      console.log(`❌ Nenhum post ID retornado da API para página ${pageId}`);
                    }
                  } else {
                    console.log(`❌ Access Token não disponível para buscar post IDs`);
                  }
                } catch (apiError) {
                  console.error(`❌ Erro ao buscar post IDs via API:`, apiError);
                }
                
                                              // Se chegou até aqui, não há post_id real disponível
                console.log(`❌ Nenhum post_id real encontrado para anúncio ${ad.id}`);
                console.log(`ℹ️ Este anúncio não foi criado a partir de um post existente do Facebook`);
                console.log(`ℹ️ Usando fallback para Meta Ads Manager`);
                
                // Fallback para o link do Meta Ads Manager
                const accountId = ad.campaign_id?.split('_')[0];
                return `https://www.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_id=${ad.id}&tab=ads`;
              }
              
              console.log(`❌ Não foi possível gerar URL do post para anúncio ${ad.id}, usando fallback`);
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
            console.log(`Processando ${insights.length} insights para anúncio ${ad.id} (${ad.name})`);
            
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
              console.log(`Insight ${index + 1} para anúncio ${ad.id}:`, insight);
              console.log(`Frequência do insight ${index + 1}: ${insight.frequency || 'N/A'}`);
              
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
                console.log(`Actions disponíveis para anúncio ${ad.id} no insight ${index + 1}:`, insight.actions);
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
            let last7DaysCpa = 0;
            let last7DaysCtr = 0;
            let last7DaysConversions = 0;
            
            // Calcular métricas dos últimos 3 dias (termômetro imediato)
            let last3DaysCpa = 0;
            let last3DaysCtr = 0;
            let last3DaysConversions = 0;
            
            if (last7DaysInsights.length > 0) {
              let last7DaysTotalSpend = 0;
              let last7DaysTotalConversions = 0;
              let last7DaysTotalImpressions = 0;
              let last7DaysTotalLinkClicks = 0;
              
              last7DaysInsights.forEach((insight: any) => {
                last7DaysTotalSpend += parseFloat(insight.spend || '0');
                last7DaysTotalImpressions += parseInt(insight.impressions || '0');
                
                // Buscar cliques no link dos últimos 7 dias
                const last7DaysLinkClicks = insight.actions?.find((action: any) => 
                  action.action_type === 'link_click' || 
                  action.action_type === 'onsite_conversion.link_click'
                )?.value || '0';
                last7DaysTotalLinkClicks += parseInt(last7DaysLinkClicks);
                
                // Somar conversões dos últimos 7 dias
                const last7DaysMessagingConversations = insight.actions?.find((action: any) => 
                  action.action_type === 'messaging_conversations_started' || 
                  action.action_type === 'onsite_conversion.messaging_conversation_started_7d'
                )?.value || '0';
                
                const last7DaysLeads = insight.actions?.find((action: any) => 
                  action.action_type === 'lead' || action.action_type === 'complete_registration'
                )?.value || '0';
                
                const last7DaysPurchases = insight.actions?.find((action: any) => 
                  action.action_type === 'purchase' || 
                  action.action_type === 'onsite_conversion.purchase'
                )?.value || '0';
                
                last7DaysTotalConversions += parseInt(last7DaysMessagingConversations) + parseInt(last7DaysLeads) + parseInt(last7DaysPurchases);
              });
              
              // Calcular métricas dos últimos 7 dias
              last7DaysCpa = last7DaysTotalConversions > 0 ? last7DaysTotalSpend / last7DaysTotalConversions : 0;
              last7DaysCtr = last7DaysTotalImpressions > 0 ? (last7DaysTotalLinkClicks / last7DaysTotalImpressions) * 100 : 0;
              last7DaysConversions = last7DaysTotalConversions;
              
              console.log(`Métricas dos últimos 7 dias para anúncio ${ad.id}:`, {
                cpa: last7DaysCpa,
                ctr: last7DaysCtr,
                conversions: last7DaysConversions
              });
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
              last3DaysCpa = last3DaysTotalConversions > 0 ? last3DaysTotalSpend / last3DaysTotalConversions : 0;
              last3DaysCtr = last3DaysTotalImpressions > 0 ? (last3DaysTotalLinkClicks / last3DaysTotalImpressions) * 100 : 0;
              last3DaysConversions = last3DaysTotalConversions;
              
              console.log(`Métricas dos últimos 3 dias para anúncio ${ad.id}:`, {
                cpa: last3DaysCpa,
                ctr: last3DaysCtr,
                conversions: last3DaysConversions
              });
            }
            
            // Calcular métricas para Performance Score usando dados de todos os meses ativos
            let performanceScoreCpa = 0;
            let performanceScoreRoas = 0;
            let performanceScoreCpc = 0;
            let performanceScoreConversions = 0;
            let performanceScoreFrequency = 0;
            
            try {
              console.log(`🔄 Calculando métricas para Performance Score usando dados de todos os meses ativos para anúncio ${ad.id}`);
              
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
                
                performanceScoreCpa = allTimeConversions > 0 ? totalAllTimeSpend / allTimeConversions : 0;
                performanceScoreRoas = totalAllTimeSpend > 0 ? allTimeRevenue / totalAllTimeSpend : 0;
                performanceScoreCpc = allTimeLinkClicks > 0 ? totalAllTimeSpend / allTimeLinkClicks : 0;
                performanceScoreConversions = allTimeConversions;
                performanceScoreFrequency = totalAllTimeReach > 0 ? totalAllTimeImpressions / totalAllTimeReach : 0;
                
                console.log(`✅ Métricas para Performance Score calculadas para anúncio ${ad.id}:`, {
                  cpa: performanceScoreCpa.toFixed(2),
                  roas: performanceScoreRoas.toFixed(2),
                  cpc: performanceScoreCpc.toFixed(2),
                  conversions: performanceScoreConversions,
                  frequency: performanceScoreFrequency.toFixed(2)
                });
              } else {
                // Fallback para métricas do período selecionado
                performanceScoreCpa = 0;
                performanceScoreRoas = 0;
                performanceScoreCpc = 0;
                performanceScoreConversions = 0;
                performanceScoreFrequency = 0;
                console.log(`⚠️ Usando métricas zeradas como fallback para Performance Score`);
              }
            } catch (error) {
              console.error(`❌ Erro ao calcular métricas para Performance Score:`, error);
              // Fallback para métricas zeradas
              performanceScoreCpa = 0;
              performanceScoreRoas = 0;
              performanceScoreCpc = 0;
              performanceScoreConversions = 0;
              performanceScoreFrequency = 0;
            }
            
            // Calcular frequência para exibição (usando dados do período selecionado)
            let frequency = 0;
            try {
              console.log(`🔄 Calculando frequência para exibição do anúncio ${ad.id}`);
              
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
                console.log(`✅ Frequência acumulada total calculada para anúncio ${ad.id}: ${frequency.toFixed(2)}`);
                console.log(`   - Total impressões: ${totalAllTimeImpressions}`);
                console.log(`   - Total alcance: ${totalAllTimeReach}`);
                console.log(`   - Fórmula: ${totalAllTimeImpressions} / ${totalAllTimeReach} = ${frequency.toFixed(2)}`);
              } else {
                // Fallback para frequência do período selecionado
                frequency = reach > 0 ? impressions / reach : 0;
                console.log(`⚠️ Usando frequência do período selecionado como fallback: ${frequency.toFixed(2)}`);
              }
            } catch (error) {
              console.error(`❌ Erro ao calcular frequência para anúncio ${ad.id}:`, error);
              // Fallback para frequência do período selecionado
              frequency = reach > 0 ? impressions / reach : 0;
              console.log(`⚠️ Usando frequência do período selecionado como fallback: ${frequency.toFixed(2)}`);
            }
            
            console.log(`Métricas básicas para anúncio ${ad.id}:`, {
              impressions, clicks, linkClicks, spend, ctr, cpm, reach
            });
            
            // Log para indicar se está usando fallback
            if (totalLinkClicks === 0 && totalClicks > 0) {
              console.log(`⚠️ Usando fallback: linkClicks=0, usando clicks normais (${totalClicks}) para anúncio ${ad.id}`);
            }
            
            console.log(`Conversões totais para anúncio ${ad.id}:`, {
              messagingConversations: totalMessagingConversations,
              leads: totalLeads,
              purchases: totalPurchases
            });
            
            const conversions = totalMessagingConversations > 0 ? totalMessagingConversations : totalLeads;
            
            // Calcular métricas derivadas do período selecionado
            const cpc = linkClicks > 0 ? spend / linkClicks : 0; // CPC baseado em cliques no link
            const cpa = conversions > 0 ? spend / conversions : 0;
            const revenue = totalPurchases * 200; // Receita baseada em compras (R$ 200 por compra)
            const roas = spend > 0 ? revenue / spend : 0;
            
            console.log(`Métricas calculadas para anúncio ${ad.id}:`, {
              conversions, cpc, cpa, revenue, roas
            });
            
                      // Determinar status do anúncio baseado na hierarquia: Campanha > Conjunto > Anúncio
          let status: 'active' | 'paused' | 'draft' = 'active';
          
          try {
            console.log(`🔄 Verificando status hierárquico para anúncio ${ad.id}`);
            
            // 1. Verificar status da campanha
            let campaignStatus = 'ACTIVE';
            try {
              const campaignDetails = await metaAdsService.getCampaignDetails(ad.campaign_id);
              campaignStatus = campaignDetails?.status || 'UNKNOWN';
              console.log(`Status da campanha ${ad.campaign_id}: ${campaignStatus}`);
            } catch (error) {
              console.error(`Erro ao buscar status da campanha ${ad.campaign_id}:`, error);
            }
            
            // 2. Verificar status do conjunto de anúncios
            let adSetStatus = 'ACTIVE';
            try {
              const adSetDetails = await metaAdsService.getAdSetDetails(ad.adset_id);
              adSetStatus = adSetDetails?.status || 'UNKNOWN';
              console.log(`Status do conjunto ${ad.adset_id}: ${adSetStatus}`);
            } catch (error) {
              console.error(`Erro ao buscar status do conjunto ${ad.adset_id}:`, error);
            }
            
            // 3. Status do anúncio (já temos)
            const adStatus = ad.status;
            console.log(`Status do anúncio ${ad.id}: ${adStatus}`);
            
            // 4. Aplicar lógica hierárquica: TODOS devem estar ativos
            if (campaignStatus === 'ACTIVE' && adSetStatus === 'ACTIVE' && adStatus === 'ACTIVE') {
              status = 'active';
              console.log(`✅ Anúncio ${ad.id} marcado como ATIVO (todos os níveis ativos)`);
            } else {
              status = 'paused';
              console.log(`⏸️ Anúncio ${ad.id} marcado como PAUSADO:`);
              if (campaignStatus !== 'ACTIVE') console.log(`   - Campanha: ${campaignStatus}`);
              if (adSetStatus !== 'ACTIVE') console.log(`   - Conjunto: ${adSetStatus}`);
              if (adStatus !== 'ACTIVE') console.log(`   - Anúncio: ${adStatus}`);
            }
            
            // 5. Verificar se foi deletado/arquivado
            if (ad.status === 'DELETED' || ad.status === 'ARCHIVED') {
              status = 'draft';
              console.log(`🗑️ Anúncio ${ad.id} marcado como DRAFT (deletado/arquivado)`);
            }
            
          } catch (error) {
            console.error(`Erro ao verificar status hierárquico para anúncio ${ad.id}:`, error);
            // Fallback: usar apenas o status do anúncio
            if (ad.status === 'PAUSED') status = 'paused';
            else if (ad.status === 'DELETED' || ad.status === 'ARCHIVED') status = 'draft';
            else status = 'active';
          }
            
            // Determinar tendência baseada no ROAS
            let trend: 'up' | 'down' | 'stable' = 'stable';
            if (roas > 3.5) trend = 'up';
            else if (roas < 2.0) trend = 'down';
            
            const circulationDays = calculateCirculationDays(ad.created_time);
            const lastUpdatedText = circulationDays > 0 
              ? `Em veiculação por ${circulationDays} dias`
              : 'Em veiculação';

            // Calcular Performance Score usando métricas de todos os meses ativos
            const performanceScore = calcularPerformanceScore({
              cpaAtual: performanceScoreCpa,
              cpcAtual: performanceScoreCpc,
              conversoesAtuais: performanceScoreConversions,
              frequenciaAtual: performanceScoreFrequency
            });

            console.log(`🎯 Performance Score calculado para anúncio ${ad.id}:`, {
              score: performanceScore,
              cpa: performanceScoreCpa,
              roas: performanceScoreRoas,
              cpc: performanceScoreCpc,
              conversions: performanceScoreConversions,
              frequency: performanceScoreFrequency
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
                cpa,
                reach,
                frequency,
                cpm,
                // Métricas dos últimos 7 dias para cálculo de tendência
                cpaAnterior: last7DaysCpa,
                ctrAnterior: last7DaysCtr,
                conversionsAnterior: last7DaysConversions
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
                cpa: performanceScoreCpa,
                cpc: performanceScoreCpc,
                conversions: performanceScoreConversions,
                frequency: performanceScoreFrequency
              }
            };
            
            console.log(`AdData criado para anúncio ${ad.id}:`, adData);
            console.log(`Link do preview do anúncio ${ad.id}:`, adData.adLink);
            adsWithInsights.push(adData);
          } else {
            console.log(`Nenhum insight encontrado para anúncio ${ad.id}, criando anúncio com dados básicos`);
            
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
                cpa: 0,
                reach: 0,
                frequency: 0,
                cpm: 0
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
                cpa: 0,
                cpc: 0,
                conversions: 0,
                frequency: 0
              }
            };
            
            console.log(`AdData criado com dados básicos para anúncio ${ad.id}:`, adData);
            console.log(`Link do preview do anúncio ${ad.id} (dados básicos):`, adData.adLink);
            adsWithInsights.push(adData);
          }
        } catch (error) {
          console.error(`Erro ao buscar insights do anúncio ${ad.id}:`, error);
        }
      }

      console.log(`Total de anúncios processados: ${adsWithInsights.length}`);
      console.log('Anúncios processados:', adsWithInsights);

      // Separar anúncios com insights válidos dos sem insights
      const adsWithValidInsights = adsWithInsights.filter(ad => ad.metrics.spend > 0);
      const adsWithoutInsights = adsWithInsights.filter(ad => ad.metrics.spend === 0);
      
      console.log(`Anúncios com insights válidos: ${adsWithValidInsights.length}`);
      console.log(`Anúncios sem insights: ${adsWithoutInsights.length}`);

      // Filtrar apenas anúncios com gasto maior que R$ 0,00
      const adsWithSpend = adsWithValidInsights.filter(ad => ad.metrics.spend > 0);
      console.log(`Anúncios com gasto > R$ 0,00: ${adsWithSpend.length}`);

      // Usar apenas anúncios que tiveram veiculação (gasto > 0)
      let finalAds = adsWithSpend;
      
      // Se não há anúncios com gasto, mostrar mensagem de que não há anúncios veiculados
      if (adsWithSpend.length === 0) {
        console.log('Nenhum anúncio com gasto encontrado para o período selecionado');
        setAds([]);
        setLastSync('Nenhum anúncio veiculado no período');
        return;
      }

      // Ordenar por CPA (menor primeiro) e atribuir ranks
      // Anúncios com CPA R$ 0,00 vão para o final (não são necessariamente bons)
      const sortedAds = finalAds
        .sort((a, b) => {
          // Se ambos têm CPA 0, manter ordem original
          if (a.metrics.cpa === 0 && b.metrics.cpa === 0) {
            return 0;
          }
          // Se apenas A tem CPA 0, B vem primeiro
          if (a.metrics.cpa === 0) {
            return 1;
          }
          // Se apenas B tem CPA 0, A vem primeiro
          if (b.metrics.cpa === 0) {
            return -1;
          }
          // Se nenhum tem CPA 0, ordenar normalmente (menor primeiro)
          return a.metrics.cpa - b.metrics.cpa;
        })
        .map((ad, index) => ({
          ...ad,
          rank: index + 1
        }));

      console.log(`Anúncios finais ordenados: ${sortedAds.length}`);
      console.log('Anúncios finais ordenados por CPA (CPA 0 vai para o final):', sortedAds.map(ad => ({
        id: ad.id,
        name: ad.title,
        cpa: ad.metrics.cpa,
        rank: ad.rank
      })));

      if (sortedAds.length > 0) {
        setAds(sortedAds);
        setLastSync(new Date().toLocaleString('pt-BR'));
        console.log(`Sincronizados ${sortedAds.length} anúncios veiculados do Meta Ads`);
      } else {
        console.log('Nenhum anúncio veiculado encontrado para o período selecionado');
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
    console.log('Hover iniciado para adId:', adId);
    
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
    
    console.log('Posição calculada:', position);
    
    setTooltipPosition(position);
    setTooltipAdId(adId);
  };

  const handleTooltipLeave = () => {
    console.log('Leave iniciado');
    
    // Limpar timeout se existir
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    
    // Esconder tooltip imediatamente (sem delay para teste)
    setTooltipAdId(null);
    setTooltipPosition(null);
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
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  /**
   * Calcula o ícone de tendência baseado nas métricas atuais vs anteriores
   * 
   * @example
   * const result = calculateTrendIcon({
   *   cpaAtual: 25,
   *   cpaAnterior: 30,
   *   ctrAtual: 2.1,
   *   ctrAnterior: 1.8,
   *   conversoesAtuais: 80,
   *   conversoesAnteriores: 60,
   *   frequenciaAtual: 3.8
   * });
   * console.log(result.trend); // 'up'
   * console.log(result.explanation); // 'Tendência positiva! CPA melhorou 16.7%, CTR aumentou 16.7%, Conversões aumentaram 33.3%, Frequência está ideal (3.8).'
   */
  const calculateTrendIcon = ({
    cpaAtual,
    cpaAnterior,
    ctrAtual,
    ctrAnterior,
    conversoesAtuais,
    conversoesAnteriores,
    frequenciaAtual,
    last3DaysCpa = 0,
    last3DaysCtr = 0,
    last3DaysConversions = 0
  }: {
    cpaAtual: number;
    cpaAnterior: number;
    ctrAtual: number;
    ctrAnterior: number;
    conversoesAtuais: number;
    conversoesAnteriores: number;
    frequenciaAtual: number;
    last3DaysCpa?: number;
    last3DaysCtr?: number;
    last3DaysConversions?: number;
  }): { trend: 'up' | 'down' | 'warning' | 'stable'; explanation: string } => {
    // === TENDÊNCIA PRINCIPAL (Últimos 7 dias) ===
    // Condições para tendência POSITIVA (anúncio dando resultado)
    const cpaMelhorou = cpaAnterior > 0 && cpaAtual < cpaAnterior * 0.9; // Pelo menos 10% melhor
    const conversoesAumentaram = conversoesAnteriores > 0 && conversoesAtuais > conversoesAnteriores * 1.1; // Pelo menos 10% mais
    const ctrMelhorou = ctrAnterior > 0 && ctrAtual > ctrAnterior * 1.05; // Pelo menos 5% melhor
    const frequenciaControlada = frequenciaAtual <= 3.5; // Não saturando
    
    // Condições para tendência NEGATIVA (anúncio parando de dar resultado)
    const cpaPiorou = cpaAnterior > 0 && cpaAtual > cpaAnterior * 1.15; // Pelo menos 15% pior
    const conversoesDiminuíram = conversoesAnteriores > 0 && conversoesAtuais < conversoesAnteriores * 0.9; // Pelo menos 10% menos
    const ctrPiorou = ctrAnterior > 0 && ctrAtual < ctrAnterior * 0.95; // Pelo menos 5% pior
    const frequenciaAlta = frequenciaAtual > 4.5; // Saturando
    
    // Contar quantas condições positivas são verdadeiras
    const condicoesPositivas = [cpaMelhorou, conversoesAumentaram, ctrMelhorou, frequenciaControlada].filter(Boolean).length;
    
    // Contar quantas condições negativas são verdadeiras
    const condicoesNegativas = [cpaPiorou, conversoesDiminuíram, ctrPiorou, frequenciaAlta].filter(Boolean).length;
    
    // === TERMÔMETRO IMEDIATO (Últimos 3 dias) ===
    // Detectar quedas bruscas ou sinais de saturação
    const quedaBruscaCPA = last3DaysCpa > 0 && cpaAtual > last3DaysCpa * 1.3; // 30% pior nos últimos 3 dias
    const quedaBruscaCTR = last3DaysCtr > 0 && ctrAtual < last3DaysCtr * 0.8; // 20% pior nos últimos 3 dias
    const quedaBruscaConversions = last3DaysConversions > 0 && conversoesAtuais < last3DaysConversions * 0.7; // 30% menos nos últimos 3 dias
    const saturaçãoRápida = frequenciaAtual > 5.0; // Frequência muito alta
    
    const alertasImediatos = [quedaBruscaCPA, quedaBruscaCTR, quedaBruscaConversions, saturaçãoRápida].filter(Boolean).length;
    
    // === LÓGICA DE DECISÃO ===
    
    // 1. ALERTA IMEDIATO: Se há alertas dos últimos 3 dias
    if (alertasImediatos >= 2) {
      const reasons = [];
      if (quedaBruscaCPA) {
        const variacao = ((cpaAtual - last3DaysCpa) / last3DaysCpa * 100);
        reasons.push(`CPA piorou ${variacao.toFixed(1)}% nos últimos 3 dias`);
      }
      if (quedaBruscaCTR) {
        const variacao = ((last3DaysCtr - ctrAtual) / last3DaysCtr * 100);
        reasons.push(`CTR caiu ${variacao.toFixed(1)}% nos últimos 3 dias`);
      }
      if (quedaBruscaConversions) {
        const variacao = ((last3DaysConversions - conversoesAtuais) / last3DaysConversions * 100);
        reasons.push(`Conversões caíram ${variacao.toFixed(1)}% nos últimos 3 dias`);
      }
      if (saturaçãoRápida) {
        reasons.push(`Frequência muito alta (${frequenciaAtual.toFixed(1)})`);
      }
      
      return {
        trend: 'warning',
        explanation: `⚠️ Atenção! ${reasons.join(', ')}. Considere pausar ou revisar o anúncio.`
      };
    }
    
    // 2. TENDÊNCIA POSITIVA: pelo menos 2 condições positivas dos últimos 7 dias
    if (condicoesPositivas >= 2) {
      const reasons = [];
      if (cpaMelhorou) {
        const variacao = ((cpaAnterior - cpaAtual) / cpaAnterior * 100);
        reasons.push(`CPA melhorou ${variacao.toFixed(1)}%`);
      }
      if (conversoesAumentaram) {
        const variacao = ((conversoesAtuais - conversoesAnteriores) / conversoesAnteriores * 100);
        reasons.push(`Conversões aumentaram ${variacao.toFixed(1)}%`);
      }
      if (ctrMelhorou) {
        const variacao = ((ctrAtual - ctrAnterior) / ctrAnterior * 100);
        reasons.push(`CTR melhorou ${variacao.toFixed(1)}%`);
      }
      if (frequenciaControlada) {
        reasons.push(`Frequência controlada (${frequenciaAtual.toFixed(1)})`);
      }
      
      return {
        trend: 'up',
        explanation: `🔺 Anúncio dando resultado! ${reasons.join(', ')}.`
      };
    }
    
    // 3. TENDÊNCIA NEGATIVA: pelo menos 2 condições negativas dos últimos 7 dias
    if (condicoesNegativas >= 2) {
      const reasons = [];
      if (cpaPiorou) {
        const variacao = ((cpaAtual - cpaAnterior) / cpaAnterior * 100);
        reasons.push(`CPA piorou ${variacao.toFixed(1)}%`);
      }
      if (conversoesDiminuíram) {
        const variacao = ((conversoesAnteriores - conversoesAtuais) / conversoesAnteriores * 100);
        reasons.push(`Conversões diminuíram ${variacao.toFixed(1)}%`);
      }
      if (ctrPiorou) {
        const variacao = ((ctrAnterior - ctrAtual) / ctrAnterior * 100);
        reasons.push(`CTR piorou ${variacao.toFixed(1)}%`);
      }
      if (frequenciaAlta) {
        reasons.push(`Frequência muito alta (${frequenciaAtual.toFixed(1)})`);
      }
      
      return {
        trend: 'down',
        explanation: `🔻 Anúncio parando de dar resultado! ${reasons.join(', ')}.`
      };
    }
    
    // 4. ESTÁVEL: Se não atende nenhuma condição
    return {
      trend: 'stable',
      explanation: '⚡ Anúncio mantendo performance estável.'
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

  // Função para calcular Performance Score
  const calcularPerformanceScore = ({
    cpaAtual,
    cpcAtual,
    conversoesAtuais,
    frequenciaAtual,
    cpaIdeal = 30,
    cpcIdeal = 2,
    conversoesIdeais = 100,
    frequenciaIdeal = 3
  }: {
    cpaAtual: number;
    cpcAtual: number;
    conversoesAtuais: number;
    frequenciaAtual: number;
    cpaIdeal?: number;
    cpcIdeal?: number;
    conversoesIdeais?: number;
    frequenciaIdeal?: number;
  }): number => {
    // Função auxiliar para limitar valor entre 0 e 100
    const limitarScore = (score: number): number => {
      return Math.max(0, Math.min(100, score));
    };

    // 1. CPA Score (40% do peso) - Quanto menor, melhor
    let cpaScore = 0;
    if (cpaAtual <= cpaIdeal) {
      cpaScore = 100; // CPA ideal ou melhor
    } else if (cpaAtual > 0) {
      cpaScore = limitarScore((cpaIdeal / cpaAtual) * 100);
    }
    const cpaPonderado = cpaScore * 0.40;

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
      cpaPonderado + cpcPonderado + conversoesPonderado + frequenciaPonderado
    );

    // Log detalhado para debug
    console.log(`📊 Performance Score para anúncio:`);
    console.log(`   CPA: ${cpaAtual} (ideal: ${cpaIdeal}) → Score: ${cpaScore.toFixed(1)} → Ponderado: ${cpaPonderado.toFixed(1)}`);
    console.log(`   CPC: ${cpcAtual} (ideal: ${cpcIdeal}) → Score: ${cpcScore.toFixed(1)} → Ponderado: ${cpcPonderado.toFixed(1)}`);
    console.log(`   Conversões: ${conversoesAtuais} (ideal: ${conversoesIdeais}) → Score: ${conversoesScore.toFixed(1)} → Ponderado: ${conversoesPonderado.toFixed(1)}`);
    console.log(`   Frequência: ${frequenciaAtual} (ideal: ${frequenciaIdeal}) → Score: ${frequenciaScore.toFixed(1)} → Ponderado: ${frequenciaPonderado.toFixed(1)}`);
    console.log(`   Score Final: ${scoreFinal}%`);

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
              onMouseLeave={() => setHoveredAd(null)}
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
                          cpaAtual: ad.metrics.cpa,
                          cpaAnterior: ad.metrics.cpaAnterior || 0,
                          ctrAtual: ad.metrics.ctr,
                          ctrAnterior: ad.metrics.ctrAnterior || 0,
                          conversoesAtuais: ad.metrics.conversions,
                          conversoesAnteriores: ad.metrics.conversionsAnterior || 0,
                          frequenciaAtual: ad.metrics.frequency || 0,
                          last3DaysCpa: last3DaysCpa || 0,
                          last3DaysCtr: last3DaysCtr || 0,
                          last3DaysConversions: last3DaysConversions || 0
                        });
                        
                                                 return (
                           <div className="relative group/trend">
                             {getTrendIcon(trendData.trend)}
                             {trendData.explanation && (
                               <div className="absolute top-1/2 right-full transform -translate-y-1/2 mr-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl text-xs text-slate-300 whitespace-nowrap opacity-0 group-hover/trend:opacity-100 transition-opacity duration-200 z-50">
                                 {trendData.explanation}
                                 <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-slate-800"></div>
                               </div>
                             )}
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
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-blue-400" />
                      <span className="text-xs text-slate-400 font-medium">CPA</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                        {formatCurrency(ad.metrics.cpa)}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3 text-green-400" />
                      <span className="text-xs text-slate-400 font-medium">CPC</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {formatCurrency(ad.metrics.cpc)}
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-yellow-400" />
                        <span className="text-xs text-slate-400 font-medium">CTR</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                        {ad.metrics.ctr.toFixed(2)}%
                    </p>
                  </div>
                  <div className="space-y-1 p-3 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3 text-purple-400" />
                        <span className="text-xs text-slate-400 font-medium">Frequência Total</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                        {ad.metrics.frequency ? ad.metrics.frequency.toFixed(1) : (ad.metrics.impressions / ad.metrics.clicks).toFixed(1)}
                    </p>
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
            console.log('Renderizando tooltip para:', tooltipAdId, 'posição:', tooltipPosition);
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
                  
                  if (score >= 90) {
                    return (
                      <div>
                        <p className="mb-2">🎉 <strong>Excelente performance!</strong></p>
                        <p>Este anúncio está <strong>funcionando perfeitamente</strong>! Está gerando muitas conversões, gastando pouco dinheiro por conversão (menos de R$ 30), e as pessoas estão vendo o anúncio na frequência ideal (não muito, não pouco).</p>
                      </div>
                    );
                  } else if (score >= 70) {
                    return (
                      <div>
                        <p className="mb-2">👍 <strong>Boa performance!</strong></p>
                        <p>O anúncio está <strong>funcionando bem</strong>! Está gerando conversões e gastando dinheiro de forma eficiente. Pode melhorar um pouco mais para chegar ao nível excelente, mas já está no caminho certo.</p>
                      </div>
                    );
                  } else if (score >= 50) {
                    return (
                      <div>
                        <p className="mb-2">⚠️ <strong>Performance regular</strong></p>
                        <p>O anúncio está <strong>funcionando, mas pode melhorar</strong>. Pode estar gastando muito por conversão (mais de R$ 30), gerando poucas conversões, ou as pessoas estão vendo o anúncio muito frequentemente. Vale a pena revisar a estratégia.</p>
                      </div>
                    );
                  } else if (score >= 30) {
                    return (
                      <div>
                        <p className="mb-2">😕 <strong>Performance baixa</strong></p>
                        <p>O anúncio <strong>não está funcionando bem</strong>. Está gastando muito dinheiro por conversão, gerando poucas conversões, ou as pessoas estão vendo o anúncio demais. Precisa de ajustes na estratégia ou no público-alvo.</p>
                      </div>
                    );
                  } else {
                    return (
                      <div>
                        <p className="mb-2">❌ <strong>Performance muito baixa</strong></p>
                        <p>Este anúncio <strong>precisa de atenção imediata</strong>. Está gastando muito dinheiro sem gerar resultados, ou as pessoas estão vendo o anúncio excessivamente. Considere pausar temporariamente e revisar completamente a estratégia.</p>
                      </div>
                    );
                  }
                })()}
              </div>
              
              <div className="mt-3 pt-2 border-t border-slate-600">
                <div className="text-xs text-slate-400">
                  <p><strong>Dica:</strong> {(() => {
                    const ad = ads.find(ad => ad.id === tooltipAdId);
                    const score = ad?.performanceScore || 0;
                    
                    if (score >= 90) {
                      return "Mantenha o excelente trabalho! Para continuar no topo:";
                    } else if (score >= 70) {
                      return "Para chegar ao nível excelente, foque em:";
                    } else if (score >= 50) {
                      return "Para melhorar significativamente, priorize:";
                    } else if (score >= 30) {
                      return "Para recuperar a performance, concentre-se em:";
                    } else {
                      return "Para reverter a situação, aja imediatamente em:";
                    }
                  })()}</p>
                  <ul className="mt-1 space-y-1">
                    {(() => {
                      const ad = ads.find(ad => ad.id === tooltipAdId);
                      const score = ad?.performanceScore || 0;
                      const metrics = ad?.performanceScoreMetrics;
                      
                      if (score >= 90) {
                        return (
                          <>
                            <li>• <strong>Monitoramento:</strong> Continue acompanhando as métricas diariamente</li>
                            <li>• <strong>Testes:</strong> Experimente pequenos ajustes para otimizar ainda mais</li>
                            <li>• <strong>Escala:</strong> Considere aumentar o orçamento gradualmente</li>
                            <li>• <strong>Público:</strong> Teste públicos similares para expandir alcance</li>
                          </>
                        );
                      } else if (score >= 70) {
                        return (
                          <>
                            <li>• <strong>CPA:</strong> {metrics?.cpa && metrics.cpa > 30 ? "Reduza o custo por conversão testando públicos mais específicos" : "Mantenha o CPA atual e foque em conversões"}</li>
                            <li>• <strong>Conversões:</strong> {metrics?.conversions && metrics.conversions < 50 ? "Aumente conversões melhorando landing pages" : "Otimize a qualidade das conversões"}</li>
                            <li>• <strong>CPC:</strong> {metrics?.cpc && metrics.cpc > 2 ? "Teste criativos mais relevantes para reduzir CPC" : "Mantenha o CPC baixo e foque em volume"}</li>
                            <li>• <strong>Frequência:</strong> {metrics?.frequency && metrics.frequency > 3 ? "Reduza frequência para evitar saturação" : "Aumente frequência para mais exposição"}</li>
                          </>
                        );
                      } else if (score >= 50) {
                        return (
                          <>
                            <li>• <strong>Público:</strong> Revise completamente o público-alvo - pode estar muito amplo</li>
                            <li>• <strong>Criativos:</strong> Teste novos textos e imagens - os atuais podem estar saturados</li>
                            <li>• <strong>Landing:</strong> Otimize landing pages para aumentar taxa de conversão</li>
                            <li>• <strong>Orçamento:</strong> Reduza temporariamente para focar em qualidade</li>
                          </>
                        );
                      } else if (score >= 30) {
                        return (
                          <>
                            <li>• <strong>Pausa:</strong> Considere pausar temporariamente para reestruturar</li>
                            <li>• <strong>Público:</strong> Defina um público mais específico e qualificado</li>
                            <li>• <strong>Criativos:</strong> Crie novos anúncios do zero - os atuais não funcionam</li>
                            <li>• <strong>Objetivo:</strong> Revise se o objetivo da campanha está correto</li>
                          </>
                        );
                      } else {
                        return (
                          <>
                            <li>• <strong>Pausa Imediata:</strong> Pare o anúncio agora para evitar perdas</li>
                            <li>• <strong>Análise:</strong> Investigue por que o público não está respondendo</li>
                            <li>• <strong>Reestruturação:</strong> Crie uma nova estratégia completamente diferente</li>
                            <li>• <strong>Suporte:</strong> Considere buscar ajuda especializada</li>
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
      </div>
    </div>
  );
};

export default PerformanceAdsSection; 