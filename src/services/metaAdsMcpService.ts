// Serviço para integração com Meta Ads via API direta (como a planilha Controle Diário)
import { metaAdsService } from './metaAdsService';

export interface MetaAdsAccountData {
  id: string;
  name: string;
}

export interface MetaAdsInsightData {
  account_id: string;
  campaign_id: string;
  campaign_name?: string;
  adset_id: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  date_start: string;
  date_stop: string;
  impressions: string;
  clicks?: string;
  spend: string;
  cpc?: string;
  cpm?: string;
  ctr?: string;
  reach?: string;
  actions?: Array<{
    action_type: string;
    value: string;
  }>;
  cost_per_action_type?: Array<{
    action_type: string;
    value: string;
  }>;
  conversions?: string;
}

export interface ProcessedMetricData {
  month: string;
  adSet: string;
  campaign: string;
  cpm: number;
  cpc: number;
  lpv: number; // 🎯 NOVA: Landing Page Views
  ctr: number;
  txMensagens: number;
  txAgendamento: number;
  txConversaoVendas: number;
  cpr: number;
  roiCombined: string;
  impressions: number;
  clicks: number;
  spend: number;
  reach: number;
  leads: number;
  appointments: number;
  sales: number;
  status: 'active' | 'inactive'; // 🎯 Status do adset (ativo/pausado)
  campaignStatus?: 'active' | 'inactive'; // 🎯 NOVO: Status da campanha
  adSetStatus?: 'active' | 'inactive'; // 🎯 NOVO: Status do conjunto de anúncios
}

class MetaAdsMcpService {
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos

  /**
   * Buscar insights REAIS por produto usando API direta do Facebook Graph (como a planilha Controle Diário)
   */
  private async fetchRealInsightsByProduct(actId: string, product: string, datePreset: string): Promise<MetaAdsInsightData[]> {
    try {
      
      
      
      // 🎯 LIMPAR CACHE ANTES DE BUSCAR DADOS REAIS
      this.clearCache();
      
      // Verificar se o metaAdsService está logado e tem conta selecionada
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        console.error('❌ Meta Ads Service não está logado ou não tem conta selecionada');
        throw new Error('Meta Ads Service não está logado ou não tem conta selecionada');
      }
      
      
      
      // Converter datePreset para datas específicas
      const { startDate, endDate } = this.convertDatePresetToDates(datePreset);
      
      
      // 🎯 NOVA ABORDAGEM: Buscar todos os adsets e depois filtrar por campanha
      
      const adsets = await metaAdsService.getAdSets();
      
      
      // Log dos primeiros adsets para debug
      if (adsets.length > 0) {
        
        adsets.slice(0, 5).forEach((adset, index) => {
          
        });
      }
      
      // 🎯 NOVA ESTRATÉGIA: Buscar campanhas primeiro para entender a estrutura
      
      const campaigns = await metaAdsService.getCampaigns();
      
      
      if (campaigns.length > 0) {
        
        campaigns.slice(0, 3).forEach((campaign, index) => {
          
        });
      }
      
      // 🎯 ESTRATÉGIA 1: Tentar filtrar por nome do produto nos adsets (como antes)
      
      let productAdsets = adsets.filter(adset => 
        adset.name.toLowerCase().includes(product.toLowerCase())
      );
      
      
      
      // 🎯 ESTRATÉGIA 2: Se não encontrou, buscar por campanhas que contenham o produto
      if (productAdsets.length === 0) {
        
        const productCampaigns = campaigns.filter(campaign => 
          campaign.name.toLowerCase().includes(product.toLowerCase())
        );
        
        
        
        if (productCampaigns.length > 0) {
          
          productCampaigns.forEach((campaign, index) => {
            
          });
          
          // Buscar adsets dessas campanhas
          productAdsets = adsets.filter(adset => 
            productCampaigns.some(campaign => campaign.id === adset.campaign_id)
          );
          
          
        }
      }
      
      // 🎯 ESTRATÉGIA 3: Se ainda não encontrou, usar busca flexível por palavras-chave
      if (productAdsets.length === 0) {
        
        
        // Extrair palavras-chave do produto (remover colchetes e palavras comuns)
        const productWords = product.toLowerCase()
          .replace(/\[/g, ' ')
          .replace(/\]/g, ' ')
          .split(' ')
          .filter(word => 
            word.length > 2 && 
            !['de', 'da', 'do', 'com', 'para', 'pacote', 'premium', 'básico', 'serviço', 'jurídico', 'presencial', 'direito', 'consumidor', 'mensagens'].includes(word)
          );
        
        
        
        if (productWords.length > 0) {
          const flexibleAdsets = adsets.filter(adset => 
            productWords.some(word => adset.name.toLowerCase().includes(word))
          );
          
          
          
          if (flexibleAdsets.length > 0) {
            
            flexibleAdsets.forEach((adset, index) => {
              
            });
            
            productAdsets = flexibleAdsets;
          }
        }
      }
      
      // 🎯 ESTRATÉGIA 4: Se ainda não encontrou, usar TODOS os adsets (último recurso)
      if (productAdsets.length === 0) {
        
        
        
        productAdsets = adsets;
        
      }
      
      if (productAdsets.length === 0) {
        console.warn(`⚠️ Nenhum adset encontrado mesmo com todas as estratégias para o produto "${product}"`);
        return [];
      }
      
      // Buscar insights específicos para cada adset encontrado
      const allInsights: MetaAdsInsightData[] = [];
      
      for (const adset of productAdsets) {
        try {
          
          
          
          // 🎯 MUDANÇA: Buscar dados consolidados por mês diretamente da API
          const adsetInsights = await metaAdsService.getAdSetInsightsMonthly(adset.id, startDate, endDate);
          
          
          
          // Log detalhado de cada insight retornado
          adsetInsights.forEach((insight: any, index: number) => {
            
          });
          
          // Converter para o formato esperado e adicionar informações do adset
          const formattedInsights = adsetInsights.map((insight: any) => ({
            account_id: actId,
            campaign_id: adset.campaign_id || '',
            adset_id: adset.id,
            adset_name: adset.name,
            date_start: insight.date_start,
            date_stop: insight.date_stop,
            impressions: insight.impressions || '0',
            clicks: insight.clicks || '0',
            spend: insight.spend || '0',
            cpm: insight.cpm || '0',
            cpc: insight.cpp || '0',
            reach: insight.reach || '0',
            frequency: insight.frequency || '0',
            actions: insight.actions || [],
            cost_per_action_type: insight.cost_per_action_type || []
          }));
          
          allInsights.push(...formattedInsights);
          
        } catch (error) {
          console.error(`❌ Erro ao buscar insights para adset ${adset.name}:`, error);
          // Continuar com outros adsets mesmo se um falhar
        }
      }
      
      // 🎯 DADOS JÁ VÊM CONSOLIDADOS POR MÊS DA API
      
      
      // Converter diretamente para o formato esperado pelo componente
      const processedData: MetaAdsInsightData[] = allInsights.map(insight => {
        const month = this.formatDateToBrazilianMonth(insight.date_start || '');
        
        // Calcular CPC baseado nos dados consolidados
        const clicks = parseInt(insight.clicks || '0') || 0;
        const spend = parseFloat(insight.spend || '0') || 0;
        
        // 🎯 CPC CORRETO: Usar link_clicks (igual à planilha Controle Diário)
        const actions = Array.isArray(insight.actions) ? insight.actions : [];
        let linkClicks = 0;
        if (actions.length > 0) {
          const linkClick = actions.find((a: any) => a?.action_type === 'link_click' || a?.action_type === 'link_clicks');
          if (linkClick) {
            linkClicks = parseInt(linkClick.value || '0') || 0;
          }
        }
        // Usar link_clicks se > 0, senão fallback para clicks normais
        const chosenClicks = linkClicks > 0 ? linkClicks : clicks;
        const cpc = chosenClicks > 0 ? spend / chosenClicks : 0;
        
        return {
          account_id: insight.account_id,
          campaign_id: insight.campaign_id,
          adset_id: insight.adset_id,
          adset_name: insight.adset_name || 'Adset sem nome',
          date_start: insight.date_start,
          date_stop: insight.date_stop,
          impressions: insight.impressions || '0',
          clicks: insight.clicks || '0',
          spend: insight.spend || '0',
          cpm: insight.cpm || '0',
          cpc: cpc.toString(),
          ctr: insight.ctr || '0',
          reach: insight.reach || '0',
          actions: insight.actions || [],
          cost_per_action_type: insight.cost_per_action_type || []
        };
      });
      
      
      processedData.forEach((item, index) => {
        
      });
      
      return processedData;
      
    } catch (error) {
      console.error('❌ Erro ao buscar insights reais via API direta:', error);
      throw new Error(`Falha ao buscar dados reais do Meta Ads via API direta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Processar dados com separação correta por período (cada adset x período = 1 linha)
   */
  private async processInsightDataByPeriod(
    rawData: MetaAdsInsightData[], 
    campaigns: Map<string, any>, 
    adsets: Map<string, any>,
    client: string,
    product: string
  ): Promise<ProcessedMetricData[]> {
    const processedData: ProcessedMetricData[] = [];
    
    
    
    for (const insight of rawData) {
      const campaign = campaigns.get(insight.campaign_id);
      const adset = adsets.get(insight.adset_id);
      
      // 🎯 CALCULAR MÉTRICAS BÁSICAS
      const impressions = parseInt(insight.impressions || '0') || 0;
      const clicks = parseInt(insight.clicks || '0') || 0;
      const spend = parseFloat(insight.spend || '0') || 0;
      const reach = parseInt(insight.reach || '0') || 0;
      
      // 🎯 CPC CORRETO: Usar link_clicks (igual à planilha Controle Diário)
      const actions = Array.isArray(insight.actions) ? insight.actions : [];
      let linkClicks = 0;
      if (actions.length > 0) {
        const linkClick = actions.find((a: any) => a?.action_type === 'link_click' || a?.action_type === 'link_clicks');
        if (linkClick) {
          linkClicks = parseInt(linkClick.value || '0') || 0;
        }
      }
      // Usar link_clicks se > 0, senão fallback para clicks normais
      const chosenClicks = linkClicks > 0 ? linkClicks : clicks;
      const cpc = chosenClicks > 0 ? spend / chosenClicks : 0;
      const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;
      const ctr = impressions > 0 ? (chosenClicks / impressions) * 100 : 0;
      
             // 🎯 BUSCAR DADOS REAIS DA PLANILHA
       const month = this.formatDateToBrazilianMonth(insight.date_start || '');
       const realData = await this.getRealPerformanceData(client, product, month, adset?.name || '', campaign?.name);
       
       // 🎯 CALCULAR MÉTRICAS REAIS COM DADOS DA PLANILHA (igual à planilha Detalhes Mensais)
       
       // 🎯 CORREÇÃO: Buscar leads do Meta Ads (como CPM, CPC, etc.)
       const realLeads = this.extractLeadsFromMetaAds(insight); // Buscar leads do Meta Ads
       
       // 🎯 NOVA LÓGICA: % Mensagens com prioridade para LPV quando disponível
       const lpvData = this.extractActions(insight.actions);
       const lpvValue = lpvData.lpv || 0;
       
       // 🎯 PRIORIDADE: Se LPV > 0, usar LPV como base; senão, usar Cliques
       const baseForTx = lpvValue > 0 ? lpvValue : chosenClicks;
       const txMensagens = baseForTx > 0 ? (realLeads / baseForTx) * 100 : 0;
       
       
       // 🎯 ATUALIZAR realData.leads com os leads reais do Meta Ads
       realData.leads = realLeads;
       
       // % Agendamento: (Agendamentos / Leads) × 100
       const txAgendamento = realLeads > 0 ? (realData.appointments / realLeads) * 100 : 0;
       
       // % Vendas: (Vendas / Denominador) × 100
       // Denominador: Se há agendamentos, usa agendamentos; senão usa leads direto
       const denominadorVendas = realData.appointments > 0 ? realData.appointments : realLeads;
       const txConversaoVendas = denominadorVendas > 0 ? (realData.sales / denominadorVendas) * 100 : 0;
       
       // 🎯 CPR CORRETO: Usar cost_per_action_type do Meta Ads (custo por resultado real)
       const costPerActionType = Array.isArray(insight.cost_per_action_type) ? insight.cost_per_action_type : [];
       let cpr = 0;
       
       if (costPerActionType.length > 0) {
         // Buscar o primeiro resultado disponível (pode ser lead, conversão, etc.)
         const firstResult = costPerActionType[0];
         if (firstResult && firstResult.value) {
           cpr = parseFloat(firstResult.value) || 0;
           
         }
       }
       
       // Fallback: calcular baseado em leads se não houver cost_per_action_type
       if (cpr === 0 && realLeads > 0) {
         cpr = spend / realLeads;
         
       }
       
       // 🎯 CALCULAR ROI/ROAS SEGUINDO A PLANILHA DETALHES MENSAIS
       // Receita: Vendas × Ticket Médio
       const receita = realData.sales * realData.ticketMedio;
       // Lucro: Receita - Investimento
       const lucro = receita - spend;
       // ROI %: ((Receita - Investimento) / Investimento) × 100
       const roiPercent = spend > 0 ? (lucro / spend) * 100 : 0;
       // ROAS (Multiplicador): Receita / Investimento
       const roasMultiplier = spend > 0 ? receita / spend : 0;
       
       // Formatar ROI/ROAS como na planilha: "ROI% / ROASx"
       const roiCombined = `${roiPercent.toFixed(1)}% / ${roasMultiplier.toFixed(1)}x`;
      
      const adsetName = adset?.name || `Conjunto ${insight.adset_id}`;
      
             
      
      processedData.push({
        month,
        adSet: adsetName,
        campaign: campaign?.name || `Campanha ${insight.campaign_id}`,
        cpm: Math.round(cpm * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        lpv: realData.lpv || 0, // 🎯 NOVA: Landing Page Views
        ctr: Math.round(ctr * 100) / 100,
        txMensagens: Math.round(txMensagens * 100) / 100,
        txAgendamento: Math.round(txAgendamento * 100) / 100,
        txConversaoVendas: Math.round(txConversaoVendas * 100) / 100,
        cpr: Math.round(cpr * 100) / 100,
        roiCombined,
        impressions,
        clicks,
        spend: Math.round(spend * 100) / 100,
        reach,
        leads: realData.leads,
        appointments: realData.appointments,
        sales: realData.sales,
        status: realData.status,
        campaignStatus: realData.campaignStatus, // 🎯 NOVO: Status da campanha
        adSetStatus: realData.adSetStatus // 🎯 NOVO: Status do conjunto de anúncios
      });
    }
    
    // Ordenar por mês (mais recente primeiro) e depois por adset
    processedData.sort((a, b) => {
      const monthOrder = { 'Agosto': 8, 'Julho': 7, 'Junho': 6 };
      const monthA = monthOrder[a.month.split(' ')[0] as keyof typeof monthOrder] || 0;
      const monthB = monthOrder[b.month.split(' ')[0] as keyof typeof monthOrder] || 0;
      
      if (monthA !== monthB) {
        return monthB - monthA; // Mais recente primeiro
      }
      
      return a.adSet.localeCompare(b.adSet);
    });
    
    return processedData;
  }

       /**
   * 🚨 MÉTODO REMOVIDO - Agora usa API direta do Facebook Graph
   * Todos os dados vêm do metaAdsService (como a planilha Controle Diário)
   */
  private async callMetaAdsMCP(tool: string, params: any): Promise<never> {
    throw new Error(`MCP REMOVIDO - Use apenas dados reais do Meta Ads via API direta (metaAdsService) para ${tool}`);
  }

       /**
   * Converter datePreset para datas específicas
   */
  private convertDatePresetToDates(datePreset: string): { startDate: string; endDate: string } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (datePreset) {
      case 'last_30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_14d':
        startDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
      case 'last_90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        endDate = now;
        break;
                case 'last_365d':
            // 🎯 NOVO: Buscar dados dos últimos 365 dias (12 meses)
            startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            endDate = now;
            break;
          case 'maximum':
            // 🎯 NOVO: Buscar dados desde o início (2 anos atrás para pegar histórico completo)
            startDate = new Date(now.getFullYear() - 2, 0, 1); // 1º de janeiro de 2 anos atrás
            endDate = now;
            break;
      default:
        // Padrão: último mês
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  /**
   * 🚨 MÉTODO REMOVIDO - NUNCA USAR DADOS SIMULADOS
   * Todos os dados devem vir da API direta do Meta Ads
   */
  private getRealSimulatedData(tool: string, params: any): never {
    throw new Error(`DADOS SIMULADOS PROIBIDOS - Use apenas dados reais do Meta Ads via API direta para ${tool}`);
  }

   /**
    * Mapear ID da conta para cliente do dashboard
    */
  private getClientFromAccountId(actId: string): string {
    const accountMapping: { [key: string]: string } = {
      'act_1930124291173650': 'Fábio Soares',
      'act_1344524763401767': 'Artnaweb',
      'act_1472338787463490': 'Carla Carrion',
      'act_1584629539048714': 'Bira Oliveira',
      'act_2228794600805285': 'Ubirata Oliveira'
    };
    
    return accountMapping[actId] || 'Cliente Desconhecido';
  }

  /**
   * Obter ID da conta do cliente (suporta nomes completos com sufixos)
   */
  private getAccountIdFromClient(client: string): string {
    const clientMapping: { [key: string]: string } = {
      'Fábio Soares': 'act_1930124291173650',
      'Fábio Soares - BM 1': 'act_1930124291173650', // 🔧 CORREÇÃO: Suporte ao nome completo
      'Artnaweb': 'act_1344524763401767',
      'Carla Carrion': 'act_1472338787463490',
      'Bira Oliveira': 'act_1584629539048714',
      'Ubirata Oliveira': 'act_2228794600805285'
    };
    
    // Primeiro tenta busca exata
    if (clientMapping[client]) {
      return clientMapping[client];
    }
    
    // Se não encontrar, tenta busca parcial (remove sufixos como " - BM 1")
    const baseName = client.split(' - ')[0];
    if (clientMapping[baseName]) {
      
      return clientMapping[baseName];
    }
    
    console.warn(`❌ Conta não encontrada para cliente: ${client}`);
    return '';
  }

  /**
   * Formatar data para o padrão brasileiro (mês/ano)
   */
  private formatDateToBrazilianMonth(dateStr: string): string {
    if (!dateStr) {
      return '';
    }
    
    // Usar UTC para evitar problemas de timezone
    const date = new Date(dateStr + 'T00:00:00.000Z');
    
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
  }

  /**
   * Calcular CPR (Custo por Resultado)
   */
  private calculateCPR(spend: number, results: number): number {
    return results > 0 ? spend / results : 0;
  }

  /**
   * Calcular ROI combinado
   */
  private calculateROICombined(revenue: number, spend: number): string {
    if (spend === 0) return '0% (0x)';
    
    const roi = ((revenue - spend) / spend) * 100;
    const roas = revenue / spend;
    
    return `${roi.toFixed(2)}% (${roas.toFixed(2)}x)`;
  }

  /**
   * Extrair ações específicas dos dados do Meta Ads
   */
  private extractActions(actions?: Array<{ action_type: string; value: string }>): {
    leads: number;
    appointments: number;
    sales: number;
    lpv: number; // 🎯 NOVA: Landing Page Views
  } {
    if (!actions) {
      return { leads: 0, appointments: 0, sales: 0, lpv: 0 };
    }

    let leads = 0;
    let appointments = 0;
    let sales = 0;
    let lpv = 0; // 🎯 NOVA: Landing Page Views

    actions.forEach(action => {
      const value = parseInt(action.value) || 0;
      
      switch (action.action_type) {
        case 'lead':
        case 'lead_grouped':
        case 'onsite_conversion.lead_grouped':
          leads += value;
          break;
        case 'schedule':
        case 'appointment':
        case 'onsite_conversion.schedule':
          appointments += value;
          break;
        case 'purchase':
        case 'onsite_conversion.purchase':
        case 'offsite_conversion.fb_pixel_purchase':
          sales += value;
          break;
        case 'landing_page_view':
        case 'landing_page_views':
          lpv += value; // 🎯 NOVA: Landing Page Views
          break;
      }
    });

    return { leads, appointments, sales, lpv };
  }

  /**
   * Processar dados brutos do Meta Ads para o formato do dashboard
   */
  private processInsightData(
    rawData: MetaAdsInsightData[], 
    campaigns: Map<string, any>, 
    adsets: Map<string, any>
  ): ProcessedMetricData[] {
    const processedData: ProcessedMetricData[] = [];
    
    for (const insight of rawData) {
      const campaign = campaigns.get(insight.campaign_id);
      const adset = adsets.get(insight.adset_id);
      
      const impressions = parseInt(insight.impressions) || 0;
      const clicks = parseInt(insight.clicks || '0') || 0;
      const spend = parseFloat(insight.spend) || 0;
      const reach = parseInt(insight.reach || '0') || 0;
      
      // Usar CPM e CPC reais se disponíveis, senão calcular
      let cpm = parseFloat(insight.cpm || '0');
      let cpc = parseFloat(insight.cpc || '0');
      
      if (cpm === 0 && impressions > 0) {
        cpm = (spend / impressions) * 1000;
      }
      
      if (cpc === 0 && clicks > 0) {
        cpc = spend / clicks;
      }
      
      // Usar CTR real se disponível, senão calcular
      let ctr = parseFloat(insight.ctr || '0');
      if (ctr === 0 && impressions > 0) {
        ctr = (clicks / impressions) * 100;
      }
      
      const actions = this.extractActions(insight.actions);
      
      // 🎯 NOVA LÓGICA: % Mensagens com prioridade para LPV quando disponível
      // 🎯 PRIORIDADE: Se LPV > 0, usar LPV como base; senão, usar Cliques
      const baseForTx = actions.lpv > 0 ? actions.lpv : clicks;
      const txMensagens = baseForTx > 0 ? (actions.leads / baseForTx) * 100 : 0;
      
      // % Agendamento: (Agendamentos / Leads) × 100
      // Para taxa de agendamento, vamos usar uma estimativa baseada no histórico
      // Normalmente 60-70% dos leads viram agendamento em campanhas jurídicas
      const estimatedAppointments = Math.round(actions.leads * 0.65);
      const txAgendamento = actions.leads > 0 ? (estimatedAppointments / actions.leads) * 100 : 0;
      
      // % Vendas: (Vendas / Denominador) × 100
      // Denominador: Se há agendamentos, usa agendamentos; senão usa leads direto
      const denominadorVendas = estimatedAppointments > 0 ? estimatedAppointments : actions.leads;
      const estimatedSales = Math.round(denominadorVendas * 0.45); // Taxa de conversão de agendamento para venda (aprox. 40-50% em jurídico)
      const txConversaoVendas = denominadorVendas > 0 ? (estimatedSales / denominadorVendas) * 100 : 0;
      
      // 🎯 CPR CORRETO: Usar cost_per_action_type do Meta Ads (custo por resultado real)
      const costPerActionType = Array.isArray(insight.cost_per_action_type) ? insight.cost_per_action_type : [];
      let cpr = 0;
      
      if (costPerActionType.length > 0) {
        // Buscar o primeiro resultado disponível (pode ser lead, conversão, etc.)
        const firstResult = costPerActionType[0];
        if (firstResult && firstResult.value) {
          cpr = parseFloat(firstResult.value) || 0;
          
        }
      }
      
      // Fallback: calcular baseado em leads se não houver cost_per_action_type
      if (cpr === 0 && actions.leads > 0) {
        cpr = spend / actions.leads;
        
      }
      
      // 🎯 CALCULAR ROI/ROAS SEGUINDO A PLANILHA DETALHES MENSAIS
      // Ticket médio estimado para serviços jurídicos: R$ 2.500
      const ticketMedio = 2500;
      // Receita: Vendas × Ticket Médio
      const receita = estimatedSales * ticketMedio;
      // Lucro: Receita - Investimento
      const lucro = receita - spend;
      // ROI %: ((Receita - Investimento) / Investimento) × 100
      const roiPercent = spend > 0 ? (lucro / spend) * 100 : 0;
      // ROAS (Multiplicador): Receita / Investimento
      const roasMultiplier = spend > 0 ? receita / spend : 0;
      
      // Formatar ROI/ROAS como na planilha: "ROI% / ROASx"
      const roiCombined = `${roiPercent.toFixed(1)}% / ${roasMultiplier.toFixed(1)}x`;
      
      processedData.push({
        month: this.formatDateToBrazilianMonth(insight.date_start),
        adSet: adset?.name || `Conjunto ${insight.adset_id}`,
        campaign: campaign?.name || `Campanha ${insight.campaign_id}`,
        cpm: Math.round(cpm * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        lpv: actions.lpv || 0, // 🎯 NOVA: Landing Page Views do Meta Ads
        ctr: Math.round(ctr * 100) / 100,
        txMensagens: Math.round(txMensagens * 100) / 100,
        txAgendamento: Math.round(txAgendamento * 100) / 100,
        txConversaoVendas: Math.round(txConversaoVendas * 100) / 100,
        cpr: Math.round(cpr * 100) / 100,
        roiCombined,
        impressions,
        clicks,
        spend: Math.round(spend * 100) / 100,
        reach,
        leads: actions.leads,
        appointments: estimatedAppointments,
        sales: estimatedSales,
        status: 'active' // Status padrão para dados simulados
      });
    }
    
    return processedData;
  }

  /**
   * Buscar dados de histórico de público de um cliente específico por produto
   */
  async getAudienceHistoryByProduct(client: string, product: string, datePreset: string = 'last_90d'): Promise<ProcessedMetricData[]> {
    const cacheKey = `audience_history_${client}_${product}_${datePreset}`;
    
    // 🎯 LIMPAR CACHE PARA FORÇAR NOVA BUSCA
    
    this.clearCache();
    
    // Verificar cache (agora sempre vazio devido ao clearCache acima)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        
        return cached.data;
      }
    }

    try {
      
      const actId = this.getAccountIdFromClient(client);
      if (!actId) {
        console.warn(`❌ Conta não encontrada para cliente: "${client}"`);
        
        return [];
      }

      
      

      // PASSO 1: Buscar insights por adset com time_increment monthly para separar por período
      const insights = await this.fetchRealInsightsByProduct(actId, product, datePreset);
      
      // PASSO 2: Buscar detalhes das campanhas e conjuntos de anúncios
      const campaigns = await this.fetchCampaignsFromMCP(actId);
      const adsets = await this.fetchAdsetsFromMCP(actId);
      
      // PASSO 3: Processar dados com separação por período
      const processedData = await this.processInsightDataByPeriod(insights, campaigns, adsets, client, product);
      
      // Salvar no cache
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now()
      });
      
      
      
      
      return processedData;
      
    } catch (error) {
      console.error(`❌ Erro ao buscar dados do Meta Ads para ${client} - ${product}:`, error);
      
      // 🎯 CORREÇÃO: Verificar se é erro de rate limit e propagar
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      if (errorMessage.includes('User request limit reached') || errorMessage.includes('rate limit')) {
        
        throw new Error('User request limit reached');
      }
      
      // Para outros erros, retornar array vazio
      return [];
    }
  }

  /**
   * Método de compatibilidade (usar getAudienceHistoryByProduct)
   */
  async getAudienceHistory(client: string, datePreset: string = 'last_30d'): Promise<ProcessedMetricData[]> {
    return this.getAudienceHistoryByProduct(client, 'Todos os Produtos', datePreset);
  }

  /**
   * Buscar insights reais do Meta Ads via MCP
   */
  private async fetchInsightsFromMCP(actId: string, datePreset: string): Promise<MetaAdsInsightData[]> {
    try {
      
      
      // IMPLEMENTAÇÃO REAL: Usar diretamente as ferramentas MCP do Meta Ads
      // Este código seria executado no contexto onde as ferramentas MCP estão disponíveis
      
      // Buscar insights via MCP
      const insights = await this.callMetaAdsMCP('get_adaccount_insights', {
        act_id: actId,
        date_preset: datePreset,
        level: 'adset'
      });
      
      return insights;
      
    } catch (error) {
      console.error('❌ Erro ao buscar insights via API direta:', error);
      throw new Error('Falha ao buscar insights via API direta do Meta Ads');
    }
  }

  private async fetchCampaignsFromMCP(actId: string): Promise<Map<string, any>> {
    try {
      
      
      const campaigns = new Map();
      
      // Verificar se o metaAdsService está logado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        throw new Error('Meta Ads Service não está logado ou não tem conta selecionada');
      }
      
      // Buscar campanhas usando a API direta
      const campaignsData = await metaAdsService.getCampaigns();
      
      campaignsData.forEach((campaign: any) => {
        campaigns.set(campaign.id, campaign);
      });
      
      return campaigns;
      
    } catch (error) {
      console.error('❌ Erro ao buscar campanhas via API direta:', error);
      throw new Error('Falha ao buscar campanhas via API direta do Meta Ads');
    }
  }

  private async fetchAdsetsFromMCP(actId: string): Promise<Map<string, any>> {
    try {
      
      
      const adsets = new Map();
      
      // Verificar se o metaAdsService está logado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        throw new Error('Meta Ads Service não está logado ou não tem conta selecionada');
      }
      
      // Buscar adsets usando a API direta
      const adsetsData = await metaAdsService.getAdSets();
      
      adsetsData.forEach((adset: any) => {
        adsets.set(adset.id, adset);
      });
      
      return adsets;
      
    } catch (error) {
      console.error('❌ Erro ao buscar adsets via API direta:', error);
      throw new Error('Falha ao buscar adsets via API direta do Meta Ads');
    }
  }

     /**
    * Buscar dados completos de performance (leads, agendamentos, vendas, ticket médio)
    */
   private async getRealPerformanceData(client: string, product: string, month: string, adsetName: string, campaignName?: string): Promise<{
     leads: number;
     appointments: number;
     sales: number;
     ticketMedio: number;
     lpv: number; // 🎯 NOVA: Landing Page Views
     status: 'active' | 'inactive';
     campaignStatus: 'active' | 'inactive';
     adSetStatus: 'active' | 'inactive';
   }> {
     try {
       
       
       // Importar o metricsService para buscar dados reais
       const { metricsService } = await import('./metricsService');
       
       // Buscar detalhes mensais reais
       const monthlyDetails = await metricsService.getMonthlyDetails(month, product, client);
       
       
       // Buscar dados específicos do público/adset
       const audienceDetails = await metricsService.getAudienceDetails(month, product, adsetName);
       
       
       // 🎯 DEBUG: Ver todos os campos disponíveis
       if (audienceDetails) {
         
         
       }
       // 🎯 DADOS REAIS DOS CAMPOS DA PLANILHA
       // ⚠️ PROBLEMA: Não existe campo 'leads' na planilha!
       // Campos disponíveis: ['product', 'vendas', 'ticketMedio', 'createdAt', 'month', 'updatedAt', 'agendamentos', 'manualVendasValue', 'vendasAuto', 'audience']
       
       // 🎯 CORREÇÃO: Buscar leads do Meta Ads (como CPM, CPC, etc.)
       // Os leads devem vir do Meta Ads, não da planilha!
       // const realLeads = this.extractLeadsFromMetaAds(insight); // Buscar leads do Meta Ads - REMOVIDO (não disponível neste contexto)
       const realLeads = 0; // TEMPORÁRIO: será corrigido no processInsightDataByPeriod (não disponível neste contexto)
       
       // 🎯 CORREÇÃO: Usar APENAS dados específicos do conjunto de anúncio
       // NÃO usar fallback para monthlyDetails (que contém totais de todos os conjuntos)
       const realAppointments = audienceDetails?.agendamentos || 0;
       const realSales = audienceDetails?.vendas || 0;
       const realTicketMedio = monthlyDetails?.ticketMedio || 2500; // Fallback apenas para ticket médio
       
       
       
       
       
       
       // 🎯 NOVO: Buscar status real da campanha e do adset da API do Meta Ads
       let campaignStatus: 'active' | 'inactive' = 'inactive';
       let adSetStatus: 'active' | 'inactive' = 'inactive';
       let status: 'active' | 'inactive' = 'inactive';
       
       try {
         // Buscar o status real do adset da API do Meta Ads
         adSetStatus = await this.getAdsetRealStatus(adsetName);
         
         // Buscar o status real da campanha da API do Meta Ads (se o nome da campanha foi fornecido)
         if (campaignName) {
           try {
             campaignStatus = await this.getCampaignRealStatus(campaignName);
           } catch (campaignStatusError) {
             console.warn(`⚠️ Não foi possível buscar status real da campanha "${campaignName}", usando fallback:`, campaignStatusError);
             campaignStatus = 'inactive';
           }
         }
         
         // 🎯 LÓGICA COMBINADA: Status ativo apenas se AMBOS estiverem ativos
         status = (campaignStatus === 'active' && adSetStatus === 'active') ? 'active' : 'inactive';
         
       } catch (statusError) {
         console.warn(`⚠️ Não foi possível buscar status real do adset "${adsetName}", usando fallback baseado em atividade:`, statusError);
         // Fallback: usar atividade recente como antes
         const hasActivity = realSales > 0 || realAppointments > 0;
         status = hasActivity ? 'active' : 'inactive';
         adSetStatus = hasActivity ? 'active' : 'inactive';
         campaignStatus = hasActivity ? 'active' : 'inactive';
       }
       
       
       
       return {
         leads: realLeads, // Será sobrescrito no processInsightDataByPeriod com os leads reais do Meta Ads
         appointments: realAppointments,
         sales: realSales,
         ticketMedio: realTicketMedio,
         lpv: 0, // 🎯 TEMPORÁRIO: será obtido do Meta Ads no processInsightDataByPeriod
         status,
         campaignStatus,
         adSetStatus
       };
       
     } catch (error) {
       console.error('❌ Erro ao buscar dados de performance:', error);
       throw new Error('DADOS REAIS OBRIGATÓRIOS - Falha ao buscar dados de performance do Firebase');
     }
   }

  /**
   * Buscar status real de uma campanha específica da API do Meta Ads
   */
  private async getCampaignRealStatus(campaignName: string): Promise<'active' | 'inactive'> {
    try {
      // Verificar se o metaAdsService está logado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        throw new Error('Meta Ads Service não está logado ou não tem conta selecionada');
      }
      
      // Buscar todas as campanhas da conta
      const campaigns = await metaAdsService.getCampaigns();
      
      // Encontrar a campanha pelo nome
      const targetCampaign = campaigns.find((campaign: any) => 
        campaign.name === campaignName || 
        campaign.name.toLowerCase().includes(campaignName.toLowerCase()) ||
        campaignName.toLowerCase().includes(campaign.name.toLowerCase())
      );
      
      if (!targetCampaign) {
        console.warn(`⚠️ Campanha "${campaignName}" não encontrada na API do Meta Ads`);
        throw new Error(`Campanha "${campaignName}" não encontrada`);
      }
      
      // Verificar o status da campanha
      // Status possíveis: ACTIVE, PAUSED, DELETED, ARCHIVED
      const campaignStatus = targetCampaign.status?.toLowerCase();
      const isActive = campaignStatus === 'active';
      
      return isActive ? 'active' : 'inactive';
      
    } catch (error) {
      console.error(`❌ Erro ao buscar status real da campanha "${campaignName}":`, error);
      throw error;
    }
  }

  /**
   * Buscar status real de um adset específico da API do Meta Ads
   */
  private async getAdsetRealStatus(adsetName: string): Promise<'active' | 'inactive'> {
    try {
      // Verificar se o metaAdsService está logado
      if (!metaAdsService.isLoggedIn() || !metaAdsService.hasSelectedAccount()) {
        throw new Error('Meta Ads Service não está logado ou não tem conta selecionada');
      }
      
      // Buscar todos os adsets da conta
      const adsets = await metaAdsService.getAdSets();
      
      // Encontrar o adset pelo nome
      const targetAdset = adsets.find((adset: any) => 
        adset.name === adsetName || 
        adset.name.toLowerCase().includes(adsetName.toLowerCase()) ||
        adsetName.toLowerCase().includes(adset.name.toLowerCase())
      );
      
      if (!targetAdset) {
        console.warn(`⚠️ Adset "${adsetName}" não encontrado na API do Meta Ads`);
        throw new Error(`Adset "${adsetName}" não encontrado`);
      }
      
      // Verificar o status do adset
      // Status possíveis: ACTIVE, PAUSED, DELETED, ARCHIVED
      const adsetStatus = targetAdset.status?.toLowerCase();
      const isActive = adsetStatus === 'active';
      
      
      
      return isActive ? 'active' : 'inactive';
      
    } catch (error) {
      console.error(`❌ Erro ao buscar status real do adset "${adsetName}":`, error);
      throw error;
    }
  }

  /**
   * Limpar cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Obter lista de contas disponíveis
   */
  getAvailableAccounts(): MetaAdsAccountData[] {
    return [
      { id: 'act_1930124291173650', name: 'Fábio Soares' },
      { id: 'act_1344524763401767', name: 'Artnaweb' },
      { id: 'act_1472338787463490', name: 'Carla Carrion' },
      { id: 'act_1584629539048714', name: 'Bira Oliveira' },
      { id: 'act_2228794600805285', name: 'Ubirata Oliveira' }
    ];
  }

  /**
   * Extrair leads do Meta Ads baseado no tipo de ação
   */
  private extractLeadsFromMetaAds(insight: MetaAdsInsightData): number {
    const actions = Array.isArray(insight.actions) ? insight.actions : [];
    
    // 🎯 Buscar leads baseado no tipo de ação
    // Para campanhas de mensagens, procurar por ações de mensagem
    let leads = 0;
    
    if (actions.length > 0) {
      // Buscar ações de mensagem (leads)
      const messagingActions = actions.filter((a: any) => 
        a?.action_type === 'onsite_conversion.messaging_first_reply' ||
        a?.action_type === 'onsite_conversion.total_messaging_connection' ||
        a?.action_type === 'messaging_first_reply' ||
        a?.action_type === 'messaging_conversation_started_7d' ||
        a?.action_type === 'lead'
      );
      
      if (messagingActions.length > 0) {
        // Usar a primeira ação de mensagem encontrada
        leads = parseInt(messagingActions[0].value || '0') || 0;
        
      }
    }
    
    // Fallback: se não encontrar ações específicas, usar conversões gerais
    if (leads === 0 && insight.conversions) {
      leads = parseInt(insight.conversions) || 0;
      
    }
    
    return leads;
  }
}

export const metaAdsMcpService = new MetaAdsMcpService();