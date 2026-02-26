import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  getDoc,
  setDoc,
  deleteDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { metaAdsService } from './metaAdsService';
import { analysisPlannerService } from './analysisPlannerService';
import { MetricData } from '../types/metrics';
import { mockData } from './mockData';

export type { MetricData };

export const metricsService = {
  // Cache local para métricas
  cache: new Map<string, { data: any; timestamp: number; ttl: number }>(),
  // Cache para insights do Meta Ads
  metaInsightsCache: new Map<string, { data: any; timestamp: number; ttl: number }>(),
  CACHE_TTL: 5 * 60 * 1000, // 5 minutos

  getCacheKey(month: string, client: string, product: string, audience: string): string {
    return `metrics_${month}_${client}_${product}_${audience}`;
  },

  getFromCache(key: string): MetricData[] | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  },

  setCache(key: string, data: MetricData[]): void {
    //     

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });
  },

  // Cache auxiliar para histórico por produto (todas os períodos)
  getProductHistoryCacheKey(client: string, product: string): string {
    return `product_history_all_periods_${client || 'all'}_${product}`;
  },

  // Método para limpar cache de métricas
  clearCache(): void {
    this.cache.clear();

  },

  // Método para forçar refresh dos dados
  forceRefresh(): void {
    this.cache.clear();

  },

  // NOVA FUNÇÃO: Limpeza completa de cache E localStorage
  clearAllCacheAndStorage(): void {


    // Limpar cache em memória
    this.cache.clear();


    // Limpar localStorage relacionado a métricas
    const keysToRemove = [
      'metaAdsDataRefreshed',
      'selectedAdSetId',
      'selectedCampaignId',
      'audiencePickerState',
      'productPickerState',
      'currentSelectedClient',
      'currentSelectedMonth'
    ];

    let removedCount = 0;
    keysToRemove.forEach(key => {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removedCount++;

        }
      } catch (e) {

      }
    });


  },

  // Método para limpar cache por cliente específico
  clearCacheByClient(_clientName: string): void {


    // CORREÇÃO: Limpar TODAS as chaves de cache quando troca de cliente
    // Isso garante que dados do cliente anterior não sejam usados
    const keysToDelete = Array.from(this.cache.keys());
    keysToDelete.forEach(key => {
      this.cache.delete(key);

    });


  },

  // CORREÇÃO: Método para limpar cache por período específico
  clearCacheByPeriod(month: string, client?: string): void {


    // Limpar todas as chaves de cache que contêm o período
    for (const key of this.cache.keys()) {
      if (key.includes(month)) {
        // Se cliente foi especificado, limpar apenas se a chave contém o cliente
        if (!client || key.includes(client)) {
          this.cache.delete(key);

        }
      }
    }
  },

  // Limpar cache específico para dados públicos
  clearPublicCache(month: string, client: string, product: string): void {
    console.log('🧹 Limpando cache público:', { month, client, product });

    // Limpar cache de métricas
    this.clearCacheByPeriod(month, client);

    // Limpar cache de relatórios públicos se disponível
    try {
      if (typeof window !== 'undefined' && (window as any).PublicReportCache) {
        const cache = (window as any).PublicReportCache.getInstance();
        cache.clearCache();
        console.log('✅ Cache de relatórios públicos limpo');
      }
    } catch (error) {
      console.log('Cache de relatórios públicos não disponível');
    }

    // Limpar localStorage de atualizações
    try {
      localStorage.removeItem('metaAdsDataRefreshed');
      console.log('✅ localStorage de atualizações limpo');
    } catch (error) {
      console.error('Erro ao limpar cache público:', error);
    }
  },

  // Função para sanitizar IDs de documentos (remover caracteres especiais)
  sanitizeDocumentId(str: string): string {
    return str
      .replace(/[\[\]|]/g, '') // Remove [, ], |
      .replace(/\s+/g, '_') // Substitui espaços por _
      .replace(/[^a-zA-Z0-9_-]/g, '') // Remove outros caracteres especiais
      .toLowerCase();
  },

  // Buscar métricas por mês e serviço
  async getMetrics(month: string, client: string = 'Todos os Clientes', product: string = 'Todos os Produtos', audience: string = 'Todos os Públicos', campaignId?: string) {
    // Se não foi passado campaignId, tentar pegar do localStorage
    if (!campaignId && product !== 'Todos os Produtos') {
      const storedCampaignId = localStorage.getItem('selectedCampaignId');
      if (storedCampaignId) {
        campaignId = storedCampaignId;
      }
    }

    // Se não foi passado adSetId, tentar pegar do localStorage
    let adSetId = '';
    if (audience !== 'Todos os Públicos') {
      const storedAdSetId = localStorage.getItem('selectedAdSetId');
      if (storedAdSetId) {
        adSetId = storedAdSetId;
      }
    }

    try {
      // Verificar cache primeiro
      const cacheKey = this.getCacheKey(month, client, product, audience);

      const cached = this.getFromCache(cacheKey);
      if (cached) {
        //         
        return cached;
      }



      // Se cliente específico selecionado, podemos verificar monthlyDetails apenas para logging, mas não bloquear busca no Meta Ads
      if (client !== 'Todos os Clientes') {

        try {
          const detailsRef = collection(db, 'monthlyDetails');
          const qCheck = query(
            detailsRef,
            where('month', '==', month),
            where('client', '==', client)
          );
          await getDocs(qCheck);

        } catch (e) {

        }
      }

      // Verificar se Meta Ads está configurado e tentar sincronizar
      if (metaAdsService.isConfigured()) {
        try {
          // Calcular período do mês
          const monthMap: { [key: string]: number } = {
            'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
            'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
          };

          const [monthName, yearStr] = month.split(' ');
          const monthIndex = monthMap[monthName] || 0;
          const year = parseInt(yearStr) || 2023;

          const firstDayOfMonth = new Date(year, monthIndex, 1);
          const lastDayOfMonth = new Date(year, monthIndex + 1, 0);

          const startDate = firstDayOfMonth.toISOString().split('T')[0];
          const endDate = lastDayOfMonth.toISOString().split('T')[0];





          // Se um cliente específico foi selecionado (Business Manager), buscar dados específicos
          let metaAdsData;
          if (client !== 'Todos os Clientes') {
            // CORREÇÃO: Verificar se há campanhas ativas para o cliente antes de buscar dados


            try {
              const campaigns = await metaAdsService.getCampaigns();
              const activeCampaigns = campaigns?.filter((campaign: any) =>
                campaign.status === 'ACTIVE' || campaign.status === 'PAUSED'
              ) || [];



              // Se não há campanhas ativas, retornar array vazio
              if (activeCampaigns.length === 0) {

                this.setCache(cacheKey, []);
                return [];
              }
            } catch (error) {

              // Se não conseguir verificar campanhas, retornar array vazio
              this.setCache(cacheKey, []);
              return [];
            }

            // Se há um Ad Set específico selecionado, buscar métricas do Ad Set
            if (adSetId) {
              // Evitar fallback para últimos 30 dias quando não há dados no período selecionado
              const adSetInsights = await metaAdsService.getAdSetInsights(adSetId, startDate, endDate, { fallbackToLast30Days: false });
              metaAdsData = metaAdsService.convertToMetricData(adSetInsights, month, client, product, audience);
            } else if (campaignId) {
              // Se há uma campanha específica selecionada, buscar métricas da campanha
              const campaignInsights = await metaAdsService.getCampaignInsights(campaignId, startDate, endDate);
              metaAdsData = metaAdsService.convertToMetricData(campaignInsights, month, client, product, audience);
            } else {
              // Se apenas o cliente foi selecionado, buscar métricas de toda a conta (todas as campanhas)
              const accountInsights = await metaAdsService.getAccountInsights(startDate, endDate);
              metaAdsData = metaAdsService.convertToMetricData(accountInsights, month, client, product, audience);
            }

            // Garantir que os dados tenham o cliente correto
            metaAdsData = metaAdsData.map(data => ({
              ...data,
              client: client,
              businessManager: client
            }));
          } else {
            // Se há um Ad Set específico selecionado, buscar métricas do Ad Set
            if (adSetId) {
              const adSetInsights = await metaAdsService.getAdSetInsights(adSetId, startDate, endDate, { fallbackToLast30Days: false });
              metaAdsData = metaAdsService.convertToMetricData(adSetInsights, month, client, product, audience);
            } else if (campaignId) {
              // Se há uma campanha específica selecionada, buscar métricas da campanha
              const campaignInsights = await metaAdsService.getCampaignInsights(campaignId, startDate, endDate);
              metaAdsData = metaAdsService.convertToMetricData(campaignInsights, month, client, product, audience);
            } else {
              // Se nenhum filtro específico, buscar métricas de toda a conta
              const accountInsights = await metaAdsService.getAccountInsights(startDate, endDate);
              metaAdsData = metaAdsService.convertToMetricData(accountInsights, month, client, product, audience);
            }
          }

          // Salvar no Firebase se possível
          if (metaAdsData.length > 0) {
            try {
              for (const data of metaAdsData) {
                await this.addMetric(data);
              }
            } catch (firebaseError) {
              console.warn('Erro ao salvar no Firebase:', firebaseError);
            }
          }

          // Salvar no cache e retornar
          this.setCache(cacheKey, metaAdsData);
          return metaAdsData;

        } catch (error: any) {


          // Se for erro de token expirado, mostrar mensagem mais clara
          if (error.message.includes('Session has expired') || error.message.includes('access token')) {

          }

          // Retornar dados mockados em caso de erro
          return mockData.filter(data => {
            const monthMatch = data.month === month;
            const clientMatch = client === 'Todos os Clientes' || data.client === client;
            const productMatch = product === 'Todos os Produtos' || data.product === product;
            const audienceMatch = audience === 'Todos os Públicos' || data.audience === audience;

            return monthMatch && clientMatch && productMatch && audienceMatch;
          });
        }
      }

      // Tentar buscar do Firebase primeiro (com tratamento de erro para índices)
      try {
        const metricsRef = collection(db, 'metrics');
        let q = query(
          metricsRef,
          where('month', '==', month),
          orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        const firebaseData = snapshot.docs.map(doc => {
          const data = doc.data();
          // Converter timestamps do Firestore para Date
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          };
        }) as MetricData[];

        // Se há dados no Firebase, filtrar e retornar
        if (firebaseData.length > 0) {
          let filteredData = firebaseData;

          if (client !== 'Todos os Clientes') {
            filteredData = filteredData.filter(item => item.client === client);
          }

          if (product !== 'Todos os Produtos') {
            filteredData = filteredData.filter(item => item.product === product);
          }

          if (audience !== 'Todos os Públicos') {
            filteredData = filteredData.filter(item => item.audience === audience);
          }

          // Salvar no cache
          this.setCache(cacheKey, filteredData);
          return filteredData;
        }
      } catch (error: any) {
        if (error.message.includes('requires an index')) {

          // O link para criar o índice já foi fornecido no erro
        } else {

        }
        return [];
      }

      // Caso contrário, retorna dados mockados
      let filteredData = mockData.filter(item => item.month === month);

      if (client !== 'Todos os Clientes') {
        filteredData = filteredData.filter(item => item.client === client);
      }

      if (product !== 'Todos os Produtos') {
        filteredData = filteredData.filter(item => item.product === product);
      }

      if (audience !== 'Todos os Públicos') {
        filteredData = filteredData.filter(item => item.audience === audience);
      }

      // Garante que todos tenham o campo service
      filteredData = filteredData.map(item => ({
        ...item,
        service: item.service || 'Manual'
      }));

      return filteredData;

    } catch (error: any) {
      console.error('Erro ao buscar métricas:', error.message);
      return [];
    }
  },

  // Histórico por produto em todos os períodos (agregado por mês)
  async getProductHistoryAllPeriods(client: string, product: string, options?: { onlyPrimaryAdSet?: boolean }): Promise<Array<{
    month: string;
    adSet: string;
    cpm: number;
    cpc: number;
    ctr: number;
    cpr: number;
    roiCombined: string; // Ex.: "960.69% (10.61x)"
  }>> {
    try {
      try {



      } catch { }
      const cacheKey = this.getProductHistoryCacheKey(client, product);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        // Converter de MetricData[] em saída agregada caso esteja em cache antigo (garantia)
        // Se o cache for deste método, já retornaremos no formato correto abaixo; aqui ignoramos e seguimos para buscar do Firestore quando não for adequado.
      }

      const metricsRef = collection(db, 'metrics');
      let q = query(metricsRef, where('product', '==', product));
      // Filtrar por cliente quando válido
      if (client && client !== 'Todos os Clientes' && client !== 'Selecione um cliente') {
        q = query(metricsRef, where('product', '==', product), where('client', '==', client));
      }

      const snapshot = await getDocs(q);

      // 🎯 DIAGNÓSTICO: Log completo da consulta inicial
      //       

      const all: MetricData[] = snapshot.docs.map(doc => {
        const d: any = doc.data();
        return {
          id: doc.id,
          date: d.date,
          month: d.month,
          service: d.service,
          client: d.client,
          product: d.product,
          audience: d.audience,
          adSetId: d.adSetId,
          campaignId: d.campaignId,
          resultCount: typeof d.resultCount === 'number' ? d.resultCount : undefined,
          resultType: d.resultType,
          leads: Number(d.leads || 0),
          revenue: Number(d.revenue || 0),
          investment: Number(d.investment || 0),
          impressions: Number(d.impressions || 0),
          reach: Number(d.reach || 0),
          clicks: Number(d.clicks || 0),
          ctr: Number(d.ctr || 0),
          cpm: Number(d.cpm || 0),
          cpl: Number(d.cpl || 0),
          cpr: Number(d.cpr || 0),
          roas: Number(d.roas || 0),
          roi: Number(d.roi || 0),
          appointments: Number(d.appointments || 0),
          sales: Number(d.sales || 0)
        } as MetricData;
      });

      // 🎯 DIAGNÓSTICO: Analisar dados brutos do Firebase
      const rawDataAnalysis = {
        totalDocs: all.length,
        allMonths: Array.from(new Set(all.map(m => m.month).filter(Boolean))).sort(),
        allServices: Array.from(new Set(all.map(m => m.service).filter(Boolean))),
        allClients: Array.from(new Set(all.map(m => m.client).filter(Boolean))),
        monthlyBreakdown: {} as Record<string, number>,
        serviceBreakdown: {} as Record<string, number>,
        investmentByMonth: {} as Record<string, number>
      };

      all.forEach(m => {
        if (m.month) {
          rawDataAnalysis.monthlyBreakdown[m.month] = (rawDataAnalysis.monthlyBreakdown[m.month] || 0) + 1;
          rawDataAnalysis.investmentByMonth[m.month] = (rawDataAnalysis.investmentByMonth[m.month] || 0) + (m.investment || 0);
        }
        if (m.service) {
          rawDataAnalysis.serviceBreakdown[m.service] = (rawDataAnalysis.serviceBreakdown[m.service] || 0) + 1;
        }
      });


      // Deduplicação: alguns dias podem ter sido salvos mais de uma vez. Mantemos o mais recente por (date + adSetId/campaignId/audience)
      const dedupeMap = new Map<string, MetricData>();
      for (const m of all) {
        const key = `${m.date}|${m.campaignId || ''}|${m.adSetId || ''}|${m.audience || ''}`;
        const current = dedupeMap.get(key);
        if (!current) {
          dedupeMap.set(key, m);
        } else {
          // Preferir o que tiver maior investment (ou último), para evitar somas duplicadas de zero
          if ((m as any)?.updatedAt && (current as any)?.updatedAt) {
            const cu = (current as any).updatedAt as Date;
            const nu = (m as any).updatedAt as Date;
            if (nu > cu) dedupeMap.set(key, m);
          } else if (m.investment >= current.investment) {
            dedupeMap.set(key, m);
          }
        }
      }
      const allUnique = Array.from(dedupeMap.values());
      // Logs de diagnóstico para alinhar com Meta Ads
      try {






      } catch { }

      // Escopo: considerar apenas Meta Ads. Aplicar filtros estritos quando houver match.
      const metaAdsOnly = allUnique.filter(m => (m as any)?.service === 'Meta Ads');
      let scoped = metaAdsOnly;

      // 🎯 DIAGNÓSTICO: Análise detalhada dos dados Meta Ads
      //       
      //           }
      //           return acc;
      //         }, {} as Record<string, number>),
      //         sampleMetaAdsData: metaAdsOnly.slice(0, 3).map(m => ({
      //           month: m.month,
      //           adSetId: m.adSetId,
      //           campaignId: m.campaignId,
      //           investment: m.investment,
      //           audience: m.audience
      //         }))
      //       });

      // Pré-carregar planners para possível fallback por adSetId/nome canônico
      let plannersForFallback: Array<{ audience?: string; adSetId?: string }> = [];
      try {
        plannersForFallback = await analysisPlannerService.listPlannersForProduct(client, product);
      } catch { }
      const plannerAdSetIds = new Set<string>((plannersForFallback || []).map(p => (p.adSetId || '').trim()).filter(Boolean));
      const plannerCanonNames = new Set<string>((plannersForFallback || []).map(p => (p.audience || '').trim().toLowerCase()).filter(Boolean));

      // 🎯 CORREÇÃO DEFINITIVA: GARANTIR que TODOS os meses sejam incluídos no histórico
      const allAvailableMonths = Array.from(new Set(metaAdsOnly.map(m => m.month).filter(Boolean))).sort();


      // 🎯 NOVA ESTRATÉGIA: Para cada mês, garantir dados no resultado final
      let finalHistoryData: MetricData[] = [];

      try {
        const selectedAdAccountRaw = localStorage.getItem('selectedAdAccount');
        const selectedCampaignId = localStorage.getItem('selectedCampaignId');

        for (const month of allAvailableMonths) {
          const monthData = metaAdsOnly.filter(m => m.month === month);
          //           

          let monthFiltered = monthData;

          // Aplicar filtros progressivamente para este mês
          if (selectedAdAccountRaw) {
            const parsed = JSON.parse(selectedAdAccountRaw);
            const adAccountId = parsed?.id || parsed?.account_id || null;
            if (adAccountId) {
              const filteredByAccount = monthData.filter(m => (m as any)?.adAccountId === adAccountId);
              if (filteredByAccount.length > 0) {
                monthFiltered = filteredByAccount;

              } else {

              }
            }
          }

          if (selectedCampaignId) {
            const filteredByCampaign = monthFiltered.filter(m => (m as any)?.campaignId === selectedCampaignId);
            if (filteredByCampaign.length > 0) {
              monthFiltered = filteredByCampaign;

            } else {

            }
          }

          // GARANTIR que pelo menos dados básicos deste mês sejam incluídos
          if (monthFiltered.length === 0 && monthData.length > 0) {

            monthFiltered = monthData;
          }

          finalHistoryData = finalHistoryData.concat(monthFiltered);

        }

        scoped = finalHistoryData;
        //         
      } catch {
        // Em caso de erro, usar todos os dados disponíveis
        scoped = metaAdsOnly;

      }

      // Fallback por planners: usar apenas se dados atuais estiverem muito limitados
      if (scoped.length <= 3 && (plannerAdSetIds.size > 0 || plannerCanonNames.size > 0)) {
        const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const byPlanner = metaAdsOnly.filter(m => {
          const idOk = m.adSetId && plannerAdSetIds.has((m.adSetId || '').trim());
          const nameOk = (m.audience && plannerCanonNames.has(normalize(m.audience)));
          return !!(idOk || nameOk);
        });

        //         

        // 🎯 CORREÇÃO: Usar planner apenas se for substancialmente melhor
        if (byPlanner.length > scoped.length) {
          scoped = byPlanner;

        } else {

        }
      }

      // Fallback final: se ainda muito limitado, usar todos os dados do produto
      if (scoped.length === 0) {
        scoped = metaAdsOnly;

      }

      // 🎯 CORREÇÃO: Incluir dados históricos de conjuntos pausados e conjuntos ativos recentes
      // Estratégia: Manter dados com investimento > 0 OU que pertençam a conjuntos que já tiveram gasto OU conjuntos ativos no Meta Ads

      // 1. Identificar todos os adSets/públicos que já tiveram investimento em algum momento
      const adSetsWithHistoricalSpend = new Set<string>();
      const audiencesWithHistoricalSpend = new Set<string>();

      scoped.forEach(m => {
        if ((m.investment || 0) > 0) {
          if (m.adSetId) adSetsWithHistoricalSpend.add(m.adSetId);
          if (m.audience) audiencesWithHistoricalSpend.add(m.audience);
        }
      });

      // 🎯 NOVA CORREÇÃO: Buscar conjuntos ativos no Meta Ads para incluir mesmo sem dados no Firestore
      let activeAdSetsFromMeta = new Set<string>();
      try {
        if (metaAdsService.isConfigured()) {
          const campaigns = await metaAdsService.getCampaigns();
          const activeCampaigns = campaigns?.filter((c: any) => c.status === 'ACTIVE') || [];

          for (const campaign of activeCampaigns) {
            try {
              const adSets = await metaAdsService.getAdSets(campaign.id);
              const activeAdSets = adSets.filter((adSet: any) => adSet.status === 'ACTIVE');
              activeAdSets.forEach((adSet: any) => activeAdSetsFromMeta.add(adSet.id));
            } catch (e) {
              // Falha silenciosa
            }
          }
        }
      } catch (e) {
        // Falha silenciosa
      }

      // 2. Incluir dados com investimento > 0 OU que pertençam a conjuntos com histórico OU conjuntos ativos no Meta Ads
      const valid = scoped.filter(m => {
        const hasInvestment = (m.investment || 0) > 0;
        const hasHistoricalSpend = (m.adSetId && adSetsWithHistoricalSpend.has(m.adSetId)) ||
          (m.audience && audiencesWithHistoricalSpend.has(m.audience));
        const isActiveInMeta = m.adSetId && activeAdSetsFromMeta.has(m.adSetId);

        const shouldInclude = hasInvestment || hasHistoricalSpend || isActiveInMeta;

        if ((hasHistoricalSpend || isActiveInMeta) && !hasInvestment) {
          // Conjunto com histórico ou ativo no Meta Ads mas sem dados recentes no Firestore
        }

        return shouldInclude;
      });

      // 🎯 DIAGNÓSTICO: Análise completa dos dados válidos
      const validDataAnalysis = {
        scopedTotal: scoped.length,
        validTotal: valid.length,
        invalidInvestment: scoped.filter(m => (m.investment || 0) <= 0).length,
        validMonths: Array.from(new Set(valid.map(m => m.month).filter(Boolean))).sort(),
        validInvestmentByMonth: {} as Record<string, number>,
        validCountByMonth: {} as Record<string, number>,
        sampleValidData: valid.slice(0, 5).map(m => ({
          month: m.month,
          investment: m.investment,
          audience: m.audience,
          adSetId: m.adSetId,
          campaignId: m.campaignId
        }))
      };

      valid.forEach(m => {
        if (m.month) {
          validDataAnalysis.validCountByMonth[m.month] = (validDataAnalysis.validCountByMonth[m.month] || 0) + 1;
          validDataAnalysis.validInvestmentByMonth[m.month] = (validDataAnalysis.validInvestmentByMonth[m.month] || 0) + (m.investment || 0);
        }
      });



      // 🎯 DIAGNÓSTICO: Comparar dados perdidos na filtragem
      const scopedMonths = Array.from(new Set(scoped.map(m => m.month).filter(Boolean))).sort();
      const validMonths = validDataAnalysis.validMonths;
      const lostMonths = scopedMonths.filter(m => !validMonths.includes(m));

      if (lostMonths.length > 0) {
        //         
      }

      // Normalização e unificação por Ad Set mesmo com renomeações
      const planners = await analysisPlannerService.listPlannersForProduct(client, product);
      const monthsPt = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const toMonthDate = (m: string): number => {
        const parts = (m || '').split(' ');
        if (parts.length < 2) return 0;
        const idx = monthsPt.findIndex(x => x.toLowerCase() === parts[0].toLowerCase());
        const year = parseInt(parts[1]);
        return (idx >= 0 && !isNaN(year)) ? new Date(year, idx, 1).getTime() : 0;
      };

      const normalizeStr = (s: string) => (s || '')
        .toLowerCase()
        // manter conteúdo dentro de [] e () removendo apenas os caracteres de colchetes/parênteses
        .replace(/[\[\]\(\)]/g, ' ')
        .replace(/\b(brasil|br|aberto|fechado|feed|reels|mensagem|mensagens|localização|localizacao)\b/gi, ' ')
        .replace(/\b\d{1,2}\s*-\s*\d{1,2}\b/g, ' ') // faixas 35-45
        .replace(/r\$\s*\d+[\.,]?\d*/gi, ' ') // preços
        .replace(/\s+/g, ' ')
        .trim();

      // Canonicaliza um nome (ordena tokens) para reduzir variações
      const canonicalizeName = (s: string) => {
        const base = normalizeStr(s);
        const tokens = base.split(/[^a-z0-9áéíóúâêîôûãõç]+/i)
          .map(t => t.trim())
          .filter(t => t.length >= 3);
        return tokens.sort((a, b) => a.localeCompare(b)).join(' ');
      };

      // Index por nome normalizado dos planners -> adSetId
      const plannerNormToAdSetId = new Map<string, string>();
      planners.forEach(p => {
        if (p.audience && p.adSetId) {
          plannerNormToAdSetId.set(canonicalizeName(p.audience), p.adSetId);
        }
      });


      // Mapa adSetId -> nome mais recente visto nas métricas
      const adSetIdToLatestName = new Map<string, { name: string; ts: number }>();

      const resolveAdSetId = (m: MetricData): string | null => {
        if (m.adSetId) return m.adSetId;
        const n = canonicalizeName(m.audience || '');
        return plannerNormToAdSetId.get(n) || null;
      };

      // Atualiza o display name mais recente para um adSetId
      for (const m of all) {
        const id = resolveAdSetId(m);
        if (id) {
          const ts = toMonthDate(m.month || '');
          const candidate = (m.audience || '').trim();
          const curr = adSetIdToLatestName.get(id);
          if (!curr || ts > curr.ts) {
            adSetIdToLatestName.set(id, { name: candidate, ts });
          }
        }
      }


      const latestNameByKey = new Map<string, { name: string; ts: number }>();
      // Pré-varredura para decidir o nome de exibição por chave canônica (ID ou nome canonicalizado)
      for (const m of all) {
        const key = resolveAdSetId(m) || `name:${canonicalizeName(m.audience || '')}`;
        if (!key) continue;
        const ts = toMonthDate(m.month || '');
        const candidate = (m.audience || '').trim();
        const curr = latestNameByKey.get(key);
        if (!curr || ts > curr.ts) {
          latestNameByKey.set(key, { name: candidate, ts });
        }
      }

      const getGroupDisplayName = (m: MetricData): string => {
        const id = resolveAdSetId(m);
        if (id && adSetIdToLatestName.has(id)) {
          return adSetIdToLatestName.get(id)!.name || (m.audience || '');
        }
        const key = `name:${canonicalizeName(m.audience || '')}`;
        const latest = latestNameByKey.get(key)?.name;
        if (latest) return latest;
        // fallback final conservador
        return (m.audience || '').replace(/\s*\[[^\]]*\]\s*/g, ' ').replace(/\s+/g, ' ').trim() || (m.audience || '');
      };

      // Agrupar por mês + chave canônica (ID de ad set quando disponível; caso contrário, nome canonicalizado)
      const canonicalKey = (m: MetricData) => resolveAdSetId(m) || `name:${canonicalizeName(m.audience || '')}`;
      const groupKey = (m: MetricData) => `${m.month || ''}__${canonicalKey(m)}`;
      const groupMap = new Map<string, MetricData[]>();
      for (const m of valid) {
        const audience = (m.audience || '').trim();
        if (!m.month || !audience) continue;
        // Ignorar agregados gerais / placeholders
        if (audience === 'Todos os Públicos' || audience === 'Público Meta Ads') continue;
        const key = groupKey(m);
        const arr = groupMap.get(key) || [];
        arr.push(m);
        groupMap.set(key, arr);
      }


      const result: Array<{ month: string; adSet: string; cpm: number; cpc: number; ctr: number; cpr: number; roiCombined: string; }> = [];

      // Pré-carregar detalhes de públicos (vendas/ticket) por mês para calcular ROI/ROAS por público quando disponível
      const uniqueMonths = Array.from(new Set(valid.map(i => (i.month || '').trim()).filter(m => !!m)));
      const monthToAudienceDetailMap = new Map<string, { byName: Map<string, { vendas: number; agendamentos?: number; ticketMedio?: number }>, byId: Map<string, { vendas: number; agendamentos?: number; ticketMedio?: number }> }>();
      try {
        for (const m of uniqueMonths) {
          const details = await this.getAllAudienceDetailsForProduct(m, product);
          const byName = new Map<string, { vendas: number; agendamentos?: number; ticketMedio?: number }>();
          const byId = new Map<string, { vendas: number; agendamentos?: number; ticketMedio?: number }>();
          (details || []).forEach((d: any) => {
            const canon = canonicalizeName(d.audience || '');
            if (!canon) return;
            const rec = { vendas: Number(d.vendas || 0), agendamentos: Number(d.agendamentos || 0), ticketMedio: Number(d.ticketMedio || 0) };
            byName.set(canon, rec);
            // se conseguirmos resolver adSetId via planners, também indexar por ID
            const adSetIdResolved = plannerNormToAdSetId.get(canon);
            if (adSetIdResolved) {
              byId.set(adSetIdResolved, rec);
            }
          });
          monthToAudienceDetailMap.set(m, { byName, byId });
        }
      } catch { }

      // Preferir focar no público/ad set selecionado quando houver
      let selectedAdSetIdLocal: string | null = null;
      let selectedAudienceLocal: string | null = null;
      try {
        selectedAdSetIdLocal = localStorage.getItem('selectedAdSetId');
      } catch { }
      try {
        selectedAudienceLocal = localStorage.getItem('currentSelectedAudience') || localStorage.getItem('selectedAudience');
      } catch { }

      // Identificar a chave CANÔNICA (do ad set) primária (mais recente) quando solicitado
      let primaryCanonicalKey: string | null = null;
      if (options?.onlyPrimaryAdSet) {
        // 1) Calcular o TIMESTAMP do mês mais recente em que houve gasto
        let latestTs = -1;
        valid.forEach(i => {
          const ts = toMonthDate(i.month || '');
          if ((i.investment || 0) > 0 && ts > latestTs) latestTs = ts;
        });

        // 2) Acumular gasto por chave canônica APENAS no mês mais recente
        const spendAtLatest = new Map<string, number>();
        valid.forEach(i => {
          const ts = toMonthDate(i.month || '');
          if (ts === latestTs) {
            const canon = canonicalKey(i);
            spendAtLatest.set(canon, (spendAtLatest.get(canon) || 0) + (i.investment || 0));
          }
        });

        // 3) Se ninguém tem gasto no mês mais recente, cair para heurística antiga (maxTs + total spend)
        if (spendAtLatest.size === 0) {
          const canonicalToMaxTs = new Map<string, number>();
          const canonicalToSpend = new Map<string, number>();
          groupMap.forEach((items) => {
            const canonical = canonicalKey(items[0]);
            const maxTs = Math.max(...items.map(i => toMonthDate(i.month || '')));
            const spend = items.reduce((s, x) => s + (x.investment || 0), 0);
            canonicalToMaxTs.set(canonical, Math.max(canonicalToMaxTs.get(canonical) || -1, maxTs));
            canonicalToSpend.set(canonical, (canonicalToSpend.get(canonical) || 0) + spend);
          });

          let bestTs = -1;
          let bestKey: string | null = null;
          for (const [canon, ts] of canonicalToMaxTs.entries()) {
            const totalSpend = canonicalToSpend.get(canon) || 0;
            if (totalSpend > 0 && ts > bestTs) {
              bestTs = ts;
              bestKey = canon;
            }
          }
          primaryCanonicalKey = bestKey;
        } else {
          // 4) Escolher a chave com MAIOR gasto no mês mais recente
          let maxSpend = -1;
          let bestKey: string | null = null;
          spendAtLatest.forEach((spend, canon) => {
            if (spend > maxSpend) {
              maxSpend = spend;
              bestKey = canon;
            }
          });
          primaryCanonicalKey = bestKey;
        }

      }

      // Contar quantos grupos com gasto existem por mês (para espelhar ROI mensal quando houver apenas 1)
      const monthToActiveGroups = new Map<string, number>();
      for (const [_, items] of groupMap.entries()) {
        const month = items[0].month || '';
        const spend = items.reduce((s, x) => s + (x.investment || 0), 0);
        if (spend > 0) monthToActiveGroups.set(month, (monthToActiveGroups.get(month) || 0) + 1);
      }

      // 🎯 NOVA CORREÇÃO: Adicionar placeholders para conjuntos ativos sem dados históricos
      const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        .replace(/(\w)/, c => c.toUpperCase()); // Capitalizar primeira letra

      for (const activeAdSetId of activeAdSetsFromMeta) {
        // Verificar se já existe dados para este adSet no mês atual
        const existsInGroupMap = Array.from(groupMap.keys()).some(key => key.includes(activeAdSetId));

        if (!existsInGroupMap) {
          // Criar placeholder para conjunto ativo sem dados históricos
          try {
            const adSets = await metaAdsService.getAdSets(''); // Buscar todos os ad sets
            const targetAdSet = adSets.find((adSet: any) => adSet.id === activeAdSetId);

            if (targetAdSet) {
              const placeholderData: MetricData = {
                id: `placeholder_${activeAdSetId}_${Date.now()}`,
                date: new Date().toISOString().split('T')[0],
                month: currentMonth,
                service: 'Meta Ads',
                client: client,
                product: product,
                audience: targetAdSet.name,
                adSetId: activeAdSetId,
                campaignId: targetAdSet.campaign_id,
                leads: 0,
                revenue: 0,
                investment: 0, // Será atualizado com dados reais se disponíveis
                impressions: 0,
                clicks: 0,
                ctr: 0,
                cpm: 0,
                cpl: 0,
                cpr: 0,
                roas: 0,
                roi: 0,
                appointments: 0,
                sales: 0
              };

              // Adicionar ao groupMap
              const key = `${currentMonth}__${activeAdSetId}`;
              groupMap.set(key, [placeholderData]);
            }
          } catch (e) {
            // Falha silenciosa
          }
        }
      }

      for (const [, items] of groupMap.entries()) {
        if (options?.onlyPrimaryAdSet && primaryCanonicalKey && canonicalKey(items[0]) !== primaryCanonicalKey) continue;

        // Se há um ad set selecionado, restringir ao grupo correspondente
        if (selectedAdSetIdLocal) {
          if (canonicalKey(items[0]) !== selectedAdSetIdLocal) continue;
        } else if (selectedAudienceLocal) {
          // Caso não exista adSetId (legado), tentar casar pelo nome canonizado
          const grpName = getGroupDisplayName(items[0]) || '';
          const selCanon = canonicalizeName(selectedAudienceLocal);
          const grpCanon = canonicalizeName(grpName);
          if (selCanon && grpCanon && selCanon !== grpCanon) continue;
        }
        const month = items[0].month;
        const adSet = getGroupDisplayName(items[0]) || '';

        // Deduplicar por DATA dentro do agrupamento (manter mais recente/maior investimento)
        const byDate = new Map<string, MetricData>();
        for (const it of items) {
          const keyDate = it.date || '';
          const current = byDate.get(keyDate);
          if (!current) {
            byDate.set(keyDate, it);
          } else {
            const currUpdated = (current as any)?.updatedAt ? new Date((current as any).updatedAt).getTime() : 0;
            const newUpdated = (it as any)?.updatedAt ? new Date((it as any).updatedAt).getTime() : 0;
            if (newUpdated > currUpdated || (newUpdated === currUpdated && (it.investment || 0) >= (current.investment || 0))) {
              byDate.set(keyDate, it);
            }
          }
        }
        const uniqItems = Array.from(byDate.values());

        const sumInvestment = uniqItems.reduce((s, x) => s + (x.investment || 0), 0);
        const sumLeads = uniqItems.reduce((s, x) => s + (x.leads || 0), 0);
        const sumSales = uniqItems.reduce((s, x) => s + (x.sales || 0), 0);
        const sumResults = uniqItems.reduce((s, x) => s + (x.resultCount || 0), 0);

        // 🎯 CORREÇÃO: Permitir conjuntos ativos mesmo sem gasto histórico
        const isActiveAdSet = items[0].adSetId && activeAdSetsFromMeta.has(items[0].adSetId);
        if (sumInvestment <= 0 && !isActiveAdSet) continue; // filtra agrupamentos sem gasto, exceto ativos

        try {


        } catch { }

        // Calcular com base na soma dos diários: cpm/cpc/ctr agregados (Meta Ads soma diária)
        // CTR/CPC/CPM como nos cards: usar SEMPRE link_clicks quando o campo existir;
        // somente cair para clicks quando link_clicks estiver ausente (undefined/null),
        // e não quando link_clicks === 0.
        const daily = uniqItems.map(i => {
          const clicksAll = (i as any)?.clicks ?? 0;
          const linkClicksVal = (i as any)?.linkClicks;
          const chosenClicks = (linkClicksVal !== undefined && linkClicksVal !== null)
            ? (Number(linkClicksVal) || 0)
            : (Number(clicksAll) || 0);
          return { inv: i.investment || 0, clicks: chosenClicks, impr: i.impressions || 0 };
        });
        const sumInv = daily.reduce((s, d) => s + d.inv, 0);
        const sumImpr = daily.reduce((s, d) => s + d.impr, 0);
        let sumClk = daily.reduce((s, d) => s + d.clicks, 0);

        // Se NENHUM item possui linkClicks definido (schema legado), tentar buscar
        // link_clicks diretamente do Meta Ads para o ad set e mês, igual ao card de Performance
        try {
          const hasLinkClicksField = uniqItems.some(i => (i as any)?.linkClicks !== undefined && (i as any)?.linkClicks !== null);
          const adSetIdResolved = resolveAdSetId(items[0]);
          if (!hasLinkClicksField && adSetIdResolved) {
            const ts = toMonthDate(month || '');
            const year = new Date(ts).getUTCFullYear();
            const mm = new Date(ts).getUTCMonth();
            const startDate = new Date(Date.UTC(year, mm, 1)).toISOString().slice(0, 10);
            const endDate = new Date(Date.UTC(year, mm + 1, 0)).toISOString().slice(0, 10);
            try {
              const insights = await metaAdsService.getAdSetInsights(adSetIdResolved, startDate, endDate);
              // Preferir campo linkClicks já processado; se não existir, somar de actions
              let linkClicksSum = 0;
              if (Array.isArray(insights) && insights.length > 0) {
                for (const ins of insights as any[]) {
                  if (ins.linkClicks !== undefined) {
                    linkClicksSum += Number(ins.linkClicks) || 0;
                  } else if (Array.isArray(ins.actions)) {
                    const act = ins.actions.find((a: any) => a?.action_type === 'link_click');
                    if (act) linkClicksSum += Number(act.value) || 0;
                  }
                }
              }
              if (linkClicksSum > 0) {
                sumClk = linkClicksSum;
              }
            } catch (e: any) {
              // 🎯 CORREÇÃO: Tratar erros específicos de conjuntos novos sem dados
              if (e?.response?.status === 400 && adSetIdResolved) {
                // Conjunto novo ou sem dados suficientes - isso é normal
                console.info(`ℹ️ AdSet ${adSetIdResolved} ainda não tem dados de insights disponíveis (conjunto novo)`);
              } else {
                console.warn(`⚠️ Erro ao buscar insights para adSet ${adSetIdResolved}:`, e?.message);
              }
              // Falha silenciosa, manter sumClk atual
            }
          }
        } catch { }

        const cpm = sumImpr > 0 ? (sumInv / sumImpr) * 1000 : 0;
        const cpc = sumClk > 0 ? (sumInv / sumClk) : 0;
        const ctr = sumImpr > 0 ? (sumClk / sumImpr) * 100 : 0;

        // Diagnóstico: origem dos cliques (para alinhar com Performance Analytics)


        // CPR alinhado aos cards de Performance: usar conversões (mensagens/leads) como primário
        // Preferência: leads/messages > resultCount (fallback) > sales (último recurso)
        let cpr = 0;
        const sumConversions = sumLeads > 0 ? sumLeads : (sumResults > 0 ? sumResults : (sumSales > 0 ? sumSales : 0));
        if (sumConversions > 0) {
          cpr = sumInvestment / sumConversions;
        } else {
          const cprValues = items.map(x => x.cpr).filter(v => typeof v === 'number' && !isNaN(v as number)) as number[];
          if (cprValues.length > 0) cpr = cprValues.reduce((s, v) => s + v, 0) / cprValues.length;
        }

        // LOG: Sumário do grupo antes do cálculo de ROI
        try {
          //           
        } catch { }

        // ROI/ROAS por conjunto: usar VENDAS do público (Detalhes do Público) e Ticket Médio (Bench)
        let roiCombined = '0% (0.0x)';
        try {
          const md = await this.getMonthlyDetails(month, product, client);
          const monthlyTicket = md?.ticketMedio || 0;
          // const monthlyVendas = md?.vendas || 0;
          // const monthlyCPV = (md as any)?.cpv || 0;
          // const monthlyROIString = md?.roi as string | undefined;

          // Buscar vendas/ticket do público
          const maps = monthToAudienceDetailMap.get(month || '') || { byName: new Map(), byId: new Map() };
          const audienceCanon = canonicalizeName(getGroupDisplayName(items[0]) || '');
          const adSetIdResolved = resolveAdSetId(items[0]);
          let audDet = (adSetIdResolved && maps.byId.get(adSetIdResolved)) || (audienceCanon ? maps.byName.get(audienceCanon) : undefined);

          const vendasPublico = Number(audDet?.vendas || 0);

          try { } catch { }
          try { } catch { }

          // PRIORIDADE: ROI por conjunto usa APENAS vendas do público (se houver)
          let vendasForROI = vendasPublico;

          // Buscar sempre o registro direto do público e, se o valor for MAIOR,
          // priorizar o mais recente/manual (corrige casos onde o pré-carregamento consolidou um valor antigo)
          try {
            const fresh = await this.getAudienceDetails(month || '', product, adSet);
            const v = Number((fresh as any)?.vendas || 0);
            if (v > vendasForROI) {
              vendasForROI = v;

            }
          } catch { }

          // Se há apenas 1 grupo com gasto no mês, alinhar com a planilha:
          // usar as VENDAS do mês (produto) se forem maiores (caso de único ad set ativo)
          const activeGroups = monthToActiveGroups.get(month || '') || 0;
          const monthlyVendas = md?.vendas || 0;
          if (activeGroups === 1 && monthlyVendas > vendasForROI) {

            vendasForROI = monthlyVendas;
          }
          // Se a planilha ainda não refletiu as vendas (0), somar vendas de todos os públicos do mês
          // e usar como override quando há apenas 1 ad set ativo no mês
          if (activeGroups === 1 && (!monthlyVendas || monthlyVendas === 0)) {
            try {
              const mapsAll = monthToAudienceDetailMap.get(month || '') || { byName: new Map(), byId: new Map() };
              let sumVendasAll = 0;
              mapsAll.byName.forEach((rec: any) => { sumVendasAll += Number(rec?.vendas || 0); });
              if (sumVendasAll > vendasForROI) {

                vendasForROI = sumVendasAll;
              }
            } catch { }
          }

          if (vendasForROI > 0) {
            // REPLICAR EXATAMENTE a lógica da planilha "Detalhes Mensais"
            const receita = monthlyTicket > 0 ? vendasForROI * monthlyTicket : 0;
            const investimento = sumInvestment;
            if (investimento > 0) {
              const lucro = receita - investimento;
              const roiPercent = (lucro / investimento) * 100;
              const roiMultiplier = (receita / investimento);
              roiCombined = `${roiPercent.toFixed(0)}% (${roiMultiplier.toFixed(1)}x)`;
              try {
                //                 
              } catch { }
            } else {
              roiCombined = '0% (0.0x)';
            }
            try { } catch { }
          } else {
            // Sem vendas do público → ROI/ROAS por conjunto é 0% (0.0x)
            roiCombined = '0% (0.0x)';
            try { } catch { }
          }





        } catch { }

        try {

        } catch { }
        result.push({ month: month!, adSet, cpm, cpc, ctr, cpr, roiCombined });
      }

      // Ordenar por data (mês/ano) desc por padrão (reutiliza helper declarado acima)
      result.sort((a, b) => {
        const diff = toMonthDate(b.month) - toMonthDate(a.month);
        if (diff !== 0) return diff;
        return a.adSet.localeCompare(b.adSet);
      });

      // Guardar em cache leve (como MetricData[] vazio apenas para marca temporal)
      this.setCache(cacheKey, []);

      // 🎯 HISTORY DEBUG: Log do resultado final
      //       

      return result;
    } catch (error) {
      console.error('Erro ao buscar histórico do produto:', error);
      return [];
    }
  },

  // Buscar métricas públicas (para links compartilhados) - OTIMIZADO
  async getPublicMetrics(month: string, client: string, product: string, audience: string): Promise<MetricData[]> {
    try {
      console.log('🔍 [metricsService] Buscando métricas públicas:', { month, client, product, audience });

      // Tentar buscar do Firebase primeiro com consulta otimizada
      try {
        const metricsRef = collection(db, 'metrics');

        // Construir query otimizada com filtros no Firebase
        const constraints = [where('month', '==', month)];

        if (client && client !== 'Todos os Clientes') {
          constraints.push(where('client', '==', client));
        }

        if (product && product !== '' && product !== 'Todos os Produtos') {
          constraints.push(where('product', '==', product));
        }

        if (audience && audience !== '' && audience !== 'Todos os Públicos') {
          constraints.push(where('audience', '==', audience));
        }

        console.log('🔍 [metricsService] Constraints da query:', constraints);
        const q = query(metricsRef, ...constraints);
        const snapshot = await getDocs(q);
        console.log('📊 [metricsService] Snapshot recebido:', snapshot.docs.length, 'documentos');

        const firebaseData = snapshot.docs.map(doc => {
          const data = doc.data();
          // Converter timestamps do Firestore para Date
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : data.createdAt,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
          };
        }) as MetricData[];

        if (firebaseData.length > 0) {
          console.log(`✅ [metricsService] Encontradas ${firebaseData.length} métricas no Firebase`);
          return firebaseData;
        } else {
          console.log('⚠️ [metricsService] Nenhuma métrica encontrada no Firebase');
        }
      } catch (firebaseError: any) {
        console.error('❌ [metricsService] Erro ao buscar métricas públicas do Firebase:', firebaseError);
      }

      // Fallback para dados mockados se não há dados no Firebase
      console.log('📊 Usando dados mockados como fallback');
      let filteredData = mockData.filter(item => item.month === month);

      if (client && client !== 'Todos os Clientes') {
        filteredData = filteredData.filter(item => item.client === client);
      }

      if (product && product !== '' && product !== 'Todos os Produtos') {
        filteredData = filteredData.filter(item => item.product === product);
      }

      if (audience && audience !== '' && audience !== 'Todos os Públicos') {
        filteredData = filteredData.filter(item => item.audience === audience);
      }

      // Garantir que todos tenham o campo service
      filteredData = filteredData.map(item => ({
        ...item,
        service: item.service || 'Manual'
      }));

      console.log(`📊 Retornando ${filteredData.length} métricas mockadas`);
      return filteredData;
    } catch (error: any) {
      console.error('Erro ao buscar métricas públicas:', error.message);
      return [];
    }
  },

  // Sincronizar dados do Meta Ads
  async syncMetaAdsData(month: string, campaignId?: string, client?: string, product?: string, audience?: string) {
    if (!metaAdsService.isConfigured()) {
      throw new Error('Meta Ads não está configurado. Configure primeiro no painel.');
    }

    try {





      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const startDate = firstDayOfMonth.toISOString().split('T')[0];
      const endDate = lastDayOfMonth.toISOString().split('T')[0];



      const metaAdsData = await metaAdsService.syncMetrics(month, startDate, endDate, campaignId, client, product, audience);



      // Log detalhado dos dados recebidos





      // Salvar no Firebase
      const savedIds = [];
      for (const metric of metaAdsData) {
        try {
          const id = await this.addMetric(metric);
          savedIds.push(id);
        } catch (error) {
          console.error('🔴 MetricsService: syncMetaAdsData - Erro ao salvar métrica:', error);
        }
      }



      return {
        success: true,
        message: `Sincronizados ${savedIds.length} registros do Meta Ads`,
        data: metaAdsData
      };
    } catch (error: any) {
      console.error('🔴 MetricsService: syncMetaAdsData - Erro na sincronização do Meta Ads:', error);
      throw new Error(`Erro na sincronização: ${error.message}`);
    }
  },

  // Adicionar nova métrica
  async addMetric(data: Omit<MetricData, 'id'>) {
    try {
      // Sanitizar campos undefined (Firestore não aceita undefined)
      const sanitized = Object.fromEntries(
        Object.entries(data as Record<string, any>).filter(([, v]) => v !== undefined)
      );
      const docRef = await addDoc(collection(db, 'metrics'), {
        ...sanitized,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } catch (error) {
      console.error('Erro ao adicionar métrica:', error);
      throw new Error('Não foi possível adicionar a métrica. Verifique as permissões do Firebase.');
    }
  },

  // Atualizar métrica existente
  async updateMetric(id: string, data: Partial<MetricData>) {
    try {
      const docRef = doc(db, 'metrics', id);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Erro ao atualizar métrica:', error);
      throw new Error('Não foi possível atualizar a métrica. Verifique as permissões do Firebase.');
    }
  },

  // Salvar detalhes mensais editáveis (Agendamentos, Vendas e Ticket Médio) - vinculado apenas ao produto
  async saveMonthlyDetails(data: {
    month: string;
    product: string;
    client?: string; // Adicionar campo client opcional
    agendamentos: number;
    vendas: number;
    ticketMedio?: number;
    cpv?: number;
    roi?: string; // Changed to string to save full ROI value
  }) {
    try {
      const detailsRef = collection(db, 'monthlyDetails');

      // Buscar documento existente baseado apenas em mês e produto
      const q = query(
        detailsRef,
        where('month', '==', data.month),
        where('product', '==', data.product)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // Criar novo documento
        await addDoc(detailsRef, {
          ...data,
          client: data.client || 'Cliente Padrão', // Garantir que sempre tenha um client
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Atualizar documento existente
        const docRef = doc(db, 'monthlyDetails', snapshot.docs[0].id);
        const updateData: any = {
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          client: data.client || 'Cliente Padrão', // Atualizar o client também
          updatedAt: new Date()
        };

        // Incluir ticketMedio apenas se foi fornecido
        if (data.ticketMedio !== undefined) {
          updateData.ticketMedio = data.ticketMedio;
        }

        // Incluir CPV e ROI se foram fornecidos
        if (data.cpv !== undefined) {
          updateData.cpv = data.cpv;
        }
        if (data.roi !== undefined) {
          updateData.roi = data.roi;
        }

        await updateDoc(docRef, updateData);
      }

      //       

      // Disparar evento para notificar mudanças na planilha detalhes mensais
      window.dispatchEvent(new CustomEvent('monthlyDetailsChanged', {
        detail: {
          month: data.month,
          product: data.product,
          client: data.client,
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          ticketMedio: data.ticketMedio
        }
      }));

      // Disparar evento específico para mudanças nas campanhas
      window.dispatchEvent(new CustomEvent('campaignValuesChanged', {
        detail: {
          month: data.month,
          product: data.product,
          client: data.client,
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          ticketMedio: data.ticketMedio
        }
      }));

    } catch (error) {
      console.error('Erro ao salvar detalhes mensais:', error);
      throw new Error('Não foi possível salvar os detalhes mensais.');
    }
  },

  // Buscar detalhes mensais editáveis - vinculado apenas ao produto
  async getMonthlyDetails(month: string, product: string, client?: string) {
    try {
      const detailsRef = collection(db, 'monthlyDetails');
      let q;

      // CORREÇÃO: Incluir filtro por cliente se fornecido
      if (client) {
        q = query(
          detailsRef,
          where('month', '==', month),
          where('product', '==', product),
          where('client', '==', client)
        );
      } else {
        q = query(
          detailsRef,
          where('month', '==', month),
          where('product', '==', product)
        );
      }

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        return {
          agendamentos: data.agendamentos || 0,
          vendas: data.vendas || 0,
          ticketMedio: data.ticketMedio || 0,
          cpv: data.cpv || 0,
          roi: data.roi
        };
      }

      return { agendamentos: 0, vendas: 0, ticketMedio: 250, cpv: 0, roi: '0% (0.0x)' };
    } catch (error) {
      console.error('Erro ao buscar detalhes mensais:', error);
      return { agendamentos: 0, vendas: 0, ticketMedio: 250, cpv: 0, roi: '0% (0.0x)' };
    }
  },

  // Salvar valores de benchmark/projeção persistentes
  async saveBenchmarkValues(data: {
    month: string;
    product: string;
    client: string;
    benchmarks: { [key: string]: string };
  }) {
    try {



      const benchmarkRef = collection(db, 'benchmarkValues');

      // Buscar documento existente
      const q = query(
        benchmarkRef,
        where('month', '==', data.month),
        where('product', '==', data.product),
        where('client', '==', data.client)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        // 
        // Criar novo documento
        await addDoc(benchmarkRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        // 
      } else {
        // 
        // Atualizar documento existente
        const docRef = doc(db, 'benchmarkValues', snapshot.docs[0].id);
        await updateDoc(docRef, {
          benchmarks: data.benchmarks,
          updatedAt: new Date()
        });
        // 
      }


    } catch (error) {
      console.error('❌ Erro ao salvar valores de benchmark:', error);
      throw error;
    }
  },

  // Buscar valores de benchmark/projeção salvos - SEMPRE usa o valor mais recente editado
  async getBenchmarkValues(_month: string, product: string, client: string) {
    try {


      const benchmarkRef = collection(db, 'benchmarkValues');

      // NOVA LÓGICA: Sempre buscar o valor mais recente (independente do período)
      const allQuery = query(
        benchmarkRef,
        where('product', '==', product),
        where('client', '==', client)
      );

      const allSnapshot = await getDocs(allQuery);

      if (!allSnapshot.empty) {
        // Encontrar o documento mais recente (pela data de atualização)
        let mostRecentDoc: any = null;
        let mostRecentDate: Date | null = null;

        allSnapshot.docs.forEach(doc => {
          const docData = doc.data();
          const updatedAt = docData.updatedAt?.toDate() || docData.createdAt?.toDate();

          if (!mostRecentDate || (updatedAt && updatedAt > mostRecentDate)) {
            mostRecentDate = updatedAt;
            mostRecentDoc = docData;
          }
        });

        if (mostRecentDoc) {

          return mostRecentDoc.benchmarks || {};
        }
      }


      return {};
    } catch (error) {
      console.error('❌ Erro ao buscar valores de benchmark:', error);
      return {};
    }
  },

  // 🎯 NOVO MÉTODO: Alias para getBenchmarkValues que busca os valores mais recentes
  // Este método é usado para a coluna "Benchmark/Projeção" que deve ser FIXA
  async getLatestBenchmarkValues(product: string, client: string) {
    // Usar o método existente, mas sem filtro de período
    return this.getBenchmarkValues('', product, client);
  },

  // Salvar configurações do Modo Áurea
  async saveAureaSettings(data: {
    month: string;
    client: string;
    product?: string;
    cpaTarget?: number;
    monthlyBudget?: number;
    acqRmdSplit?: { acq: number; rmd: number };
  }) {
    try {
      const collectionRef = collection(db, 'aureaSettings');

      // Buscar documento existente
      const constraints = [
        where('month', '==', data.month),
        where('client', '==', data.client)
      ];

      if (data.product) {
        constraints.push(where('product', '==', data.product));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      // Remover campos undefined para não dar erro no Firestore
      const saveData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      if (!snapshot.empty) {
        const docRef = doc(db, 'aureaSettings', snapshot.docs[0].id);
        await updateDoc(docRef, {
          ...saveData,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collectionRef, {
          ...saveData,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Erro ao salvar configurações Áurea:', error);
      throw error;
    }
  },

  // Recuperar configurações do Modo Áurea
  async getAureaSettings(month: string, client: string, product?: string) {
    try {
      const collectionRef = collection(db, 'aureaSettings');
      const constraints = [
        where('month', '==', month),
        where('client', '==', client)
      ];

      if (product) {
        constraints.push(where('product', '==', product));
      }

      const q = query(collectionRef, ...constraints);
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        return {
          cpaTarget: docData.cpaTarget,
          monthlyBudget: docData.monthlyBudget,
          acqRmdSplit: docData.acqRmdSplit
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar configurações Áurea:', error);
      return null;
    }
  },

  // Calcular métricas agregadas
  calculateAggregatedMetrics(metrics: MetricData[]) {


    if (!metrics || metrics.length === 0) {

      return {
        totalLeads: 0,
        totalRevenue: 0,
        totalInvestment: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: 0,
        avgCPM: 0,
        avgCPL: 0,
        totalROAS: 0,
        totalROI: 0,
        totalAppointments: 0,
        totalSales: 0
      };
    }

    // CORREÇÃO: Filtrar métricas por cliente para evitar dados incorretos
    const currentClient = localStorage.getItem('currentSelectedClient');
    const currentMonth = localStorage.getItem('currentSelectedMonth');



    // Filtrar apenas métricas do cliente E mês atuais
    let filteredMetrics = metrics;

    if (currentClient && currentClient !== 'Selecione um cliente') {
      filteredMetrics = filteredMetrics.filter(metric => metric.client === currentClient);

    }

    if (currentMonth && currentMonth !== 'Selecione um mês') {
      filteredMetrics = filteredMetrics.filter(metric => metric.month === currentMonth);

    }



    if (filteredMetrics.length === 0) {

      return {
        totalLeads: 0,
        totalRevenue: 0,
        totalInvestment: 0,
        totalImpressions: 0,
        totalClicks: 0,
        avgCTR: 0,
        avgCPM: 0,
        avgCPL: 0,
        totalROAS: 0,
        totalROI: 0,
        totalAppointments: 0,
        totalSales: 0
      };
    }

    // Log das primeiras métricas para debug
    if (filteredMetrics.length > 0) {


    }

    let sumLinkClicksDebug = 0;
    let sumClicksAllDebug = 0;
    let countWithLinkClicksField = 0;
    const totals = filteredMetrics.reduce((acc, metric) => {
      const anyMetric: any = metric as any;
      const clicksAll = Number(anyMetric?.clicks ?? 0) || 0;
      const linkClicksValNum = Number(anyMetric?.linkClicks ?? 0) || 0;
      // Regra dos cards de Performance: usar link_clicks apenas se > 0; senão, fallback para clicks
      const chosenClicks = linkClicksValNum > 0 ? linkClicksValNum : clicksAll;
      sumClicksAllDebug += clicksAll;
      sumLinkClicksDebug += linkClicksValNum;
      if (anyMetric?.linkClicks !== undefined && anyMetric?.linkClicks !== null) countWithLinkClicksField++;

      acc.totalLeads += metric.leads;
      acc.totalRevenue += metric.revenue;
      acc.totalInvestment += metric.investment;
      acc.totalImpressions += metric.impressions;
      acc.totalClicks += chosenClicks;
      acc.totalAppointments += metric.appointments;
      acc.totalSales += metric.sales;
      return acc;
    }, {
      totalLeads: 0,
      totalRevenue: 0,
      totalInvestment: 0,
      totalImpressions: 0,
      totalClicks: 0,
      totalLPV: 0,
      totalAppointments: 0,
      totalSales: 0
    });



    // Seguir a mesma regra dos cards: usar soma global de linkClicks se > 0; senão, usar cliques normais
    const chosenTotalClicks = sumLinkClicksDebug > 0 ? sumLinkClicksDebug : sumClicksAllDebug;
    // Atualizar totalClicks para refletir a decisão global
    try { totals.totalClicks = chosenTotalClicks; } catch { }

    const avgCTR = totals.totalImpressions > 0
      ? (chosenTotalClicks / totals.totalImpressions) * 100
      : 0;

    const avgCPM = totals.totalImpressions > 0
      ? (totals.totalInvestment / totals.totalImpressions) * 1000
      : 0;

    const avgCPL = totals.totalLeads > 0
      ? totals.totalInvestment / totals.totalLeads
      : 0;

    const avgCPC = chosenTotalClicks > 0
      ? totals.totalInvestment / chosenTotalClicks
      : 0;



    const totalROAS = totals.totalInvestment > 0
      ? totals.totalRevenue / totals.totalInvestment
      : 0;

    const totalROI = totals.totalInvestment > 0
      ? ((totals.totalRevenue - totals.totalInvestment) / totals.totalInvestment) * 100
      : 0;

    try {
      //       
    } catch { }

    return {
      ...totals,
      totalLPV: 0, // 🎯 NOVA: Adicionar totalLPV
      avgCTR: Number(avgCTR.toFixed(2)),
      avgCPM: Number(avgCPM.toFixed(2)),
      avgCPL: Number(avgCPL.toFixed(2)),
      avgCPC: Number(avgCPC.toFixed(2)),
      totalROAS: Number(totalROAS.toFixed(2)),
      totalROI: Number(totalROI.toFixed(2))
    };
  },

  // Versão assíncrona com fallback em tempo real aos insights da campanha (Meta Ads)  
  async calculateAggregatedMetricsWithMetaFallback(
    metrics: MetricData[],
    monthLabel?: string,
    _productLabel?: string,
    _clientLabel?: string
  ) {
    // Primeiro, calcular normalmente (Firestore)
    const base = this.calculateAggregatedMetrics(metrics);

    // 🎯 ESTABILIDADE: Se temos dados consistentes do Firestore, usar preferencialmente


    // Padrão dos cards: usar link_clicks agregados quando disponíveis.
    // Se não houver link_clicks em nenhum doc (sumLinkClicks==0 no cálculo base),
    // e tivermos campanha selecionada, consultar os insights da campanha e somar link_clicks.
    const campaignId = (typeof localStorage !== 'undefined' ? (localStorage.getItem('selectedCampaignId') || '') : '') as string;
    if (!campaignId) {
      try { } catch { }
      return base;
    }

    // 🎯 MUDANÇA: SEMPRE buscar Meta Ads primeiro se temos campaign ID
    // Só usar Firestore como fallback se Meta Ads falhar

    // Derivar período do mês a partir do label (ex.: "Agosto 2025")
    const getMonthDateRange = (label: string | undefined) => {
      if (!label) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
      }
      const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const [name, yearStr] = (label || '').split(' ');
      const year = parseInt(yearStr || '', 10) || new Date().getFullYear();
      const monthIndex = Math.max(0, months.indexOf(name));
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    };

    const { startDate, endDate } = getMonthDateRange(monthLabel);

    // 🎯 CACHE: Criar chave única para este período
    const cacheKey = `${campaignId}_${startDate}_${endDate}_${monthLabel}`;
    const now = Date.now();
    const cacheTTL = 5 * 60 * 1000; // 5 minutos

    // Verificar cache primeiro
    const cached = this.metaInsightsCache.get(cacheKey);
    if (cached && (now - cached.timestamp) < cached.ttl) {
      try {

      } catch { }
      return cached.data;
    }

    try {
      // 🎯 TIMEOUT: Limitar tempo de resposta da API para evitar instabilidade
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout na API Meta Ads')), 8000)
      );

      // Consultar insights da campanha no período do mês com timeout
      const insights = await Promise.race([
        metaAdsService.getCampaignInsights(campaignId, startDate, endDate),
        timeoutPromise
      ]) as any[];
      let sumSpend = 0;
      let sumImpr = 0;
      let sumClicksAll = 0;
      let sumLinkClicks = 0;
      let sumLPV = 0;

      for (const ins of insights as any[]) {
        sumSpend += Number(ins?.spend || 0) || 0;
        sumImpr += Number(ins?.impressions || 0) || 0;
        sumClicksAll += Number(ins?.clicks || 0) || 0;
        const actions = Array.isArray(ins?.actions) ? ins.actions : [];
        if (actions && actions.length > 0) {
          const linkClick = actions.find((a: any) => a?.action_type === 'link_click' || a?.action_type === 'link_clicks');
          if (linkClick) {
            const v = Number(linkClick?.value || 0) || 0;
            sumLinkClicks += v;
          }
          // 🎯 NOVA: Buscar Landing Page Views (LPV)
          const lpv = actions.find((a: any) => a?.action_type === 'landing_page_view' || a?.action_type === 'landing_page_views');
          if (lpv) {
            const v = Number(lpv?.value || 0) || 0;
            sumLPV += v;
          }
        }
      }

      // Decisão dos cards: se soma de link_clicks > 0, usar; senão, cair para clicks normais
      const chosenTotalClicks = sumLinkClicks > 0 ? sumLinkClicks : sumClicksAll;

      // 🎯 ESTABILIDADE: Usar dados mais consistentes (Meta Ads só se tiver valores significativos)
      const metaHasSignificantData = sumSpend > 0 && sumImpr > 0 && chosenTotalClicks > 0;

      const totalClicks = metaHasSignificantData ? chosenTotalClicks : base.totalClicks;
      const totalImpressions = metaHasSignificantData ? sumImpr : base.totalImpressions;
      const totalInvestment = metaHasSignificantData ? sumSpend : base.totalInvestment;

      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCPM = totalImpressions > 0 ? (totalInvestment / totalImpressions) * 1000 : 0;
      const avgCPC = totalClicks > 0 ? (totalInvestment / totalClicks) : 0;

      const result = {
        ...base,
        totalInvestment,
        totalImpressions,
        totalClicks,
        totalLPV: sumLPV,
        avgCTR: Number(avgCTR.toFixed(2)),
        avgCPM: Number(avgCPM.toFixed(2)),
        avgCPC: Number(avgCPC.toFixed(2))
      };

      // 🎯 CACHE: Salvar resultado no cache
      this.metaInsightsCache.set(cacheKey, {
        data: result,
        timestamp: now,
        ttl: cacheTTL
      });

      try {
      } catch { }

      return result;
    } catch (err) {
      try {
        console.warn('⚠️ Meta Ads falhou, usando Firestore como fallback:', {
          erro: (err as any)?.message || err,
          firestoreData: {
            investment: base.totalInvestment,
            clicks: base.totalClicks,
            impressions: base.totalImpressions
          }
        });
      } catch { }
      return base;
    }
  },

  // Salvar detalhes do público (conjunto de anúncio)
  async saveAudienceDetails(data: {
    month: string;
    product: string;
    audience: string;
    agendamentos: number;
    vendas: number;
    ticketMedio?: number;
    vendasAuto?: boolean; // New field to save the mode
    manualVendasValue?: number; // New field to save manual value
  }) {
    try {
      //       

      const docId = this.sanitizeDocumentId(`${data.month}_${data.product}_${data.audience}`);


      const docRef = doc(db, 'audienceDetails', docId);

      const docSnap = await getDoc(docRef);


      if (docSnap.exists()) {

        await updateDoc(docRef, {
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          ticketMedio: data.ticketMedio || 250,
          vendasAuto: data.vendasAuto !== undefined ? data.vendasAuto : true, // Save the mode
          manualVendasValue: data.manualVendasValue !== undefined ? data.manualVendasValue : 0, // Save manual value
          updatedAt: new Date()
        });

      } else {

        await setDoc(docRef, {
          ...data,
          ticketMedio: data.ticketMedio || 250,
          vendasAuto: data.vendasAuto !== undefined ? data.vendasAuto : true, // Save the mode
          manualVendasValue: data.manualVendasValue !== undefined ? data.manualVendasValue : 0, // Save manual value
          createdAt: new Date(),
          updatedAt: new Date()
        });

      }

      // 🎯 NOVO: Limpar cache de audience para este período/produto
      this.clearAudienceCacheByPeriod(data.month, data.product);
      console.log('🗑️ Cache de audience limpo para:', data.month, data.product);

    } catch (error) {
      console.error('🔍 DEBUG - metricsService.saveAudienceDetails - Erro ao salvar detalhes do público:', error);
      throw new Error('Não foi possível salvar os detalhes do público.');
    }
  },

  // Buscar detalhes de um público específico
  async getAudienceDetails(month: string, product: string, audience: string) {
    try {
      //       

      const docId = this.sanitizeDocumentId(`${month}_${product}_${audience}`);


      const docRef = doc(db, 'audienceDetails', docId);
      const docSnap = await getDoc(docRef);



      if (docSnap.exists()) {
        const data = docSnap.data();

        return data;
      } else {

        return null;
      }
    } catch (error) {
      console.error('🔍 DEBUG - metricsService.getAudienceDetails - Erro ao buscar detalhes do público:', error);
      return null;
    }
  },

  // 🎯 NOVO: Cache para dados de audience
  audienceDetailsCache: new Map<string, { data: any[]; timestamp: number; ttl: number }>(),
  AUDIENCE_CACHE_TTL: 5 * 60 * 1000, // 5 minutos

  // 🎯 NOVA FUNÇÃO: Gerar chave de cache para audience
  getAudienceCacheKey(month: string, product: string): string {
    return `audience_${month}_${product}`;
  },

  // 🎯 NOVA FUNÇÃO: Buscar dados de audience do cache
  getAudienceFromCache(key: string): any[] | null {
    const cached = this.audienceDetailsCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.audienceDetailsCache.delete(key);
      return null;
    }

    return cached.data;
  },

  // 🎯 NOVA FUNÇÃO: Salvar dados de audience no cache
  setAudienceCache(key: string, data: any[]): void {
    this.audienceDetailsCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.AUDIENCE_CACHE_TTL
    });
  },

  // 🎯 NOVA FUNÇÃO: Limpar cache de audience
  clearAudienceCache(): void {
    this.audienceDetailsCache.clear();
  },

  // 🎯 NOVA FUNÇÃO: Limpar cache de audience por período/produto
  clearAudienceCacheByPeriod(month: string, product?: string): void {
    for (const key of this.audienceDetailsCache.keys()) {
      if (product) {
        // Limpar cache específico do produto/período
        if (key.includes(`audience_${month}_${product}`)) {
          this.audienceDetailsCache.delete(key);
        }
      } else {
        // Limpar cache de todo o período
        if (key.includes(`audience_${month}`)) {
          this.audienceDetailsCache.delete(key);
        }
      }
    }
  },

  // Buscar todos os dados de públicos de um produto específico (COM CACHE)
  async getAllAudienceDetailsForProduct(month: string, product: string, forceRefresh: boolean = false) {
    try {
      // 🎯 NOVO: Verificar cache primeiro (se não for force refresh)
      if (!forceRefresh) {
        const cacheKey = this.getAudienceCacheKey(month, product);
        const cached = this.getAudienceFromCache(cacheKey);
        if (cached) {
          console.log('🎯 CACHE HIT - Audience details carregados do cache:', cacheKey);
          return cached;
        }
      }

      console.log('🔄 Buscando dados de audience do Firestore...');

      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );

      const querySnapshot = await getDocs(q);
      const audienceMap = new Map(); // Para consolidar duplicatas

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // 🎯 CORREÇÃO: Usar chave única que inclui mês + audience para evitar conflitos
        const audienceKey = `${data.month}_${data.audience}`;

        // 🎯 CORREÇÃO: Garantir que valores sejam números válidos
        const agendamentosValue = Number(data.agendamentos) || 0;
        const vendasValue = Number(data.vendas) || 0;

        console.log(`🔍 DEBUG - Processando: ${audienceKey} - Agendamentos: ${agendamentosValue}, Vendas: ${vendasValue}`);

        // 🎯 CORREÇÃO: Não há mais conflitos porque a chave é única por mês + audience
        audienceMap.set(audienceKey, {
          ...data,
          agendamentos: agendamentosValue,
          vendas: vendasValue
        });
      });

      // Converter Map para array
      const consolidatedDetails = Array.from(audienceMap.values());

      // 🎯 CORREÇÃO: Calcular totais para debug


      //       

      // 🎯 NOVO: Salvar no cache
      const cacheKey = this.getAudienceCacheKey(month, product);
      this.setAudienceCache(cacheKey, consolidatedDetails);
      console.log('💾 Dados de audience salvos no cache:', cacheKey);

      return consolidatedDetails;
    } catch (error) {
      console.error('Erro ao buscar todos os detalhes de públicos:', error);
      return [];
    }
  },

  // 🎯 FUNÇÃO DE DEBUG: Verificar todos os dados de um produto/período específico
  async debugAudienceData(month: string, product: string) {
    try {


      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );

      const querySnapshot = await getDocs(q);
      const allDocuments: any[] = [];



      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const docData = {
          docId: doc.id,
          audience: data.audience,
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          updatedAt: data.updatedAt?.toDate?.() || null,
          createdAt: data.createdAt?.toDate?.() || null,
          rawData: data
        };

        allDocuments.push(docData);


      });

      // Agrupar por público para ver duplicatas
      const groupedByAudience = allDocuments.reduce((groups, doc) => {
        const key = doc.audience;
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
        return groups;
      }, {});



      // Calcular totais como o sistema faz
      const consolidatedDetails = await this.getAllAudienceDetailsForProduct(month, product);
      const totalAgendamentos = consolidatedDetails.reduce((sum: number, detail: any) => sum + (Number(detail.agendamentos) || 0), 0);
      const totalVendas = consolidatedDetails.reduce((sum: number, detail: any) => sum + (Number(detail.vendas) || 0), 0);

      const debugResult = {
        month,
        product,
        totalDocuments: querySnapshot.size,
        consolidatedCount: consolidatedDetails.length,
        totalAgendamentos,
        totalVendas,
        allDocuments,
        groupedByAudience,
        consolidatedDetails
      };



      return debugResult;
    } catch (error) {
      console.error('🔍 DEBUG - debugAudienceData - Erro:', error);
      return { error };
    }
  },

  // 🎯 FUNÇÃO DEFINITIVA: Limpar TODOS os dados de um produto/período e forçar recálculo
  async resetProductData(month: string, product: string) {
    try {


      // 1. Buscar TODOS os documentos para o produto/período
      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );

      const querySnapshot = await getDocs(q);


      // 2. Deletar TODOS os documentos
      const batch = writeBatch(db);
      let deletedCount = 0;

      querySnapshot.forEach((doc) => {
        //         
        batch.delete(doc.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();

      }

      // 3. Limpar cache relacionado
      this.clearCache();

      // 4. Limpar localStorage relacionado
      const keysToRemove = [
        'currentSelectedAudience',
        'currentSelectedProduct',
        'selectedAdSetId',
        'selectedCampaignId'
      ];
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
        } catch (e) { }
      });

      //       

      return {
        success: true,
        deletedCount,
        month,
        product
      };
    } catch (error) {
      console.error('🧹 DEBUG - resetProductData - Erro:', error);
      return { error, success: false };
    }
  },

  // 🎯 NOVA FUNÇÃO: Limpar registros com valores zero para um produto/período específico
  async cleanupZeroValueRecords(month: string, product: string) {
    try {


      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);
      let deletedCount = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const agendamentos = Number(data.agendamentos) || 0;
        const vendas = Number(data.vendas) || 0;

        // Deletar registros com ambos os valores zero
        if (agendamentos === 0 && vendas === 0) {
          //           
          batch.delete(doc.ref);
          deletedCount++;
        }
      });

      if (deletedCount > 0) {
        await batch.commit();
        //         
      } else {

      }

      return deletedCount;
    } catch (error) {
      console.error('🧹 DEBUG - cleanupZeroValueRecords - Erro:', error);
      return 0;
    }
  },

  // Função para limpar dados duplicados (usar com cuidado)
  async cleanupDuplicateAudienceDetails(month: string, product: string) {
    try {


      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );

      const querySnapshot = await getDocs(q);
      const audienceMap = new Map();
      const documentsToDelete: string[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const audienceKey = data.audience;

        if (audienceMap.has(audienceKey)) {
          // Documento duplicado encontrado
          const existing = audienceMap.get(audienceKey);
          const existingDate = existing.updatedAt?.toDate?.() || new Date(0);
          const newDate = data.updatedAt?.toDate?.() || new Date(0);

          if (newDate > existingDate) {
            // Manter o novo, deletar o antigo
            documentsToDelete.push(existing.docId);
            audienceMap.set(audienceKey, { ...data, docId: doc.id });
          } else {
            // Manter o antigo, deletar o novo
            documentsToDelete.push(doc.id);
          }
        } else {
          audienceMap.set(audienceKey, { ...data, docId: doc.id });
        }
      });



      // Deletar documentos duplicados
      for (const docId of documentsToDelete) {
        const docRef = doc(db, 'audienceDetails', docId);
        await deleteDoc(docRef);

      }


      return documentsToDelete.length;
    } catch (error) {
      console.error('Erro ao limpar dados duplicados:', error);
      throw new Error('Não foi possível limpar os dados duplicados.');
    }
  },

  // Buscar valores reais de agendamentos e vendas de todos os produtos de um cliente
  async getRealValuesForClient(month: string, client: string) {
    try {



      // 🔍 DEBUG: Verificar parâmetros de entrada
      //       

      // Primeiro, buscar dados da coleção monthlyDetails (dados reais da planilha)
      // CORREÇÃO: Filtrar por mês E cliente para evitar dados de outros clientes
      const monthlyDetailsQuery = query(
        collection(db, 'monthlyDetails'),
        where('month', '==', month),
        where('client', '==', client) // Adicionar filtro por cliente
      );

      const monthlyDetailsSnapshot = await getDocs(monthlyDetailsQuery);

      //       

      let totalAgendamentos = 0;
      let totalVendas = 0;
      let totalCPV = 0;
      let roiValues: string[] = []; // Array para armazenar valores de ROI como strings
      let productCount = 0;
      const productsWithData: string[] = [];

      // CORREÇÃO: Filtrar dados apenas do cliente específico
      monthlyDetailsSnapshot.forEach((doc) => {
        const data = doc.data();

        // 🔍 DEBUG: Verificar se cada documento está no mês/cliente correto

        //         

        // CORREÇÃO: Verificar se o documento pertence ao cliente correto
        // Agora que temos filtro por client, todos os documentos são do cliente correto
        //         

        // 🎯 CARD DEBUG: Log detalhado do documento
        //         

        // 🔍 VERIFICAÇÃO ADICIONAL: Garantir que o documento é do mês/cliente correto
        if (data.month !== month || data.client !== client) {
          console.error('🚨 ERRO DE FILTRO - getRealValuesForClient - Documento fora do filtro:', {
            filtroMes: month,
            filtroCliente: client,
            documentoMes: data.month,
            documentoCliente: data.client,
            docId: doc.id
          });
          return; // Pular este documento
        }

        // Somar valores de todos os produtos DO MÊS CORRETO
        totalAgendamentos += (data.agendamentos || 0);
        totalVendas += (data.vendas || 0);
        totalCPV += (data.cpv || 0);

        // Coletar valores de ROI como strings
        if (data.roi && typeof data.roi === 'string') {
          roiValues.push(data.roi);
        }

        productCount++;
        productsWithData.push(data.product);

        //         
      });

      // CORREÇÃO: Se não há DOCUMENTOS na monthlyDetails, tentar buscar em audienceDetails
      if (productCount === 0) {

        //         

        try {
          // Buscar dados em audienceDetails como fallback
          const audienceDetailsQuery = query(
            collection(db, 'audienceDetails'),
            where('month', '==', month),
            where('client', '==', client)
          );

          const audienceDetailsSnapshot = await getDocs(audienceDetailsQuery);


          let fallbackAgendamentos = 0;
          let fallbackVendas = 0;

          audienceDetailsSnapshot.forEach((doc) => {
            const data = doc.data();
            //             

            fallbackAgendamentos += (data.agendamentos || 0);
            fallbackVendas += (data.vendas || 0);
          });

          //           

          // Se encontramos dados em audienceDetails, usar eles
          if (fallbackAgendamentos > 0 || fallbackVendas > 0) {

            totalAgendamentos = fallbackAgendamentos;
            totalVendas = fallbackVendas;
            productCount = audienceDetailsSnapshot.size;
          } else {
            // Se não há dados em nenhuma coleção, retornar zero

            return {
              agendamentos: 0,
              vendas: 0,
              cpv: 0,
              roi: '0% (0.0x)'
            };
          }
        } catch (fallbackError) {
          console.error('🔍 DEBUG - getRealValuesForClient - Erro no fallback para audienceDetails:', fallbackError);
          return {
            agendamentos: 0,
            vendas: 0,
            cpv: 0,
            roi: '0% (0.0x)'
          };
        }
      }

      //       

      // 🎯 CORREÇÃO UNIVERSAL: Calcular ROI/ROAS para os cards SEMPRE que há vendas
      if (totalVendas > 0) {


        try {
          // Buscar investimento total das métricas do Meta Ads para este cliente
          const metrics = await this.getMetrics(month, client);
          let investimentoTotal = 0;

          if (metrics && metrics.length > 0) {
            const clientMetrics = metrics.filter(metric => metric.client === client);
            investimentoTotal = clientMetrics.reduce((sum, metric) => sum + (metric.investment || 0), 0);
          }

          // Buscar ticket médio da planilha detalhes mensais
          let ticketMedio = 250; // valor padrão
          if (monthlyDetailsSnapshot.size > 0) {
            const firstDoc = monthlyDetailsSnapshot.docs[0];
            const firstData = firstDoc.data();
            if (firstData.ticketMedio && firstData.ticketMedio > 0) {
              ticketMedio = firstData.ticketMedio;
            }
          }

          // Calcular CPV para os cards
          if (totalVendas > 0 && investimentoTotal > 0) {
            const cpvCalculado = investimentoTotal / totalVendas;
            (this as any).calculatedCPVForCards = cpvCalculado;

          }

          // Calcular ROI/ROAS para os cards
          const receitaTotal = totalVendas * ticketMedio;
          const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
          const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
          const calculatedROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;

          (this as any).calculatedROIForCards = calculatedROI;

          //           

        } catch (roiError) {
          console.error('🎯 CARD DEBUG - getRealValuesForClient - Erro no cálculo universal de ROI/ROAS:', roiError);
        }
      }

      // 🎯 CARD DEBUG: Se monthlyDetails está zerado, verificar audienceDetails
      if (totalAgendamentos === 0 && totalVendas === 0) {


        try {
          // Buscar todos os produtos do cliente no mês atual
          // CORREÇÃO: audienceDetails não tem campo 'client', precisamos buscar por month e filtrar por product
          const audienceDetailsQuery = query(
            collection(db, 'audienceDetails'),
            where('month', '==', month)
          );

          const audienceSnapshot = await getDocs(audienceDetailsQuery);


          // Obter lista de produtos do cliente para filtrar audienceDetails
          const clientProducts = new Set<string>();
          monthlyDetailsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.product) {
              clientProducts.add(data.product);
            }
          });



          let audienceAgendamentos = 0;
          let audienceVendas = 0;

          audienceSnapshot.forEach((doc) => {
            const data = doc.data();

            // CORREÇÃO: Filtrar apenas produtos que pertencem ao cliente
            if (clientProducts.has(data.product)) {
              //               

              audienceAgendamentos += (data.agendamentos || 0);
              audienceVendas += (data.vendas || 0);
            } else {
              //               
            }
          });

          //           

          // Se encontramos dados em audienceDetails, usar eles
          if (audienceAgendamentos > 0 || audienceVendas > 0) {
            totalAgendamentos = audienceAgendamentos;
            totalVendas = audienceVendas;
            //             

            // 🎯 CORREÇÃO ROI/ROAS: Calcular ROI/ROAS diretamente usando dados da planilha

            //             

            try {
              // Buscar investimento total das métricas do Meta Ads para este cliente

              const metrics = await this.getMetrics(month, client);
              let investimentoTotal = 0;

              //               

              if (metrics && metrics.length > 0) {
                const clientMetrics = metrics.filter(metric => metric.client === client);
                investimentoTotal = clientMetrics.reduce((sum, metric) => sum + (metric.investment || 0), 0);

                //                 
              } else {

              }

              // Buscar ticket médio da planilha detalhes mensais
              let ticketMedio = 250; // valor padrão
              //               

              if (monthlyDetailsSnapshot.size > 0) {
                // Usar o ticket médio do primeiro produto encontrado
                const firstDoc = monthlyDetailsSnapshot.docs[0];
                const firstData = firstDoc.data();

                //                 

                if (firstData.ticketMedio && firstData.ticketMedio > 0) {
                  ticketMedio = firstData.ticketMedio;
                }
              }



              // Calcular CPV para os cards
              if (totalVendas > 0 && investimentoTotal > 0) {
                const cpvCalculado = investimentoTotal / totalVendas;

                //                 

                // 🎯 CORREÇÃO: Armazenar o CPV calculado para usar no resultado final
                (this as any).calculatedCPVForCards = cpvCalculado;

              }

              // Calcular ROI/ROAS para os cards
              //               

              if (totalVendas > 0) {


                const receitaTotal = totalVendas * ticketMedio;
                const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
                const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
                const calculatedROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;

                //                 

                // 🎯 CORREÇÃO: Armazenar o ROI calculado para usar no resultado final
                (this as any).calculatedROIForCards = calculatedROI;

              } else {


              }
            } catch (roiError) {
              console.error('🎯 CARD DEBUG - getRealValuesForClient - Erro ao calcular ROI/ROAS:', roiError);
            }

            // CORREÇÃO AUTOMÁTICA: Se audienceDetails tem dados mas monthlyDetails não,
            // criar/atualizar monthlyDetails automaticamente

            try {
              // Buscar todos os produtos únicos
              const uniqueProducts = new Set<string>();
              audienceSnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.product) {
                  uniqueProducts.add(data.product);
                }
              });

              // Para cada produto, criar/atualizar monthlyDetails
              for (const product of uniqueProducts) {
                const productAgendamentos = audienceSnapshot.docs
                  .filter(doc => doc.data().product === product)
                  .reduce((sum, doc) => sum + (doc.data().agendamentos || 0), 0);

                const productVendas = audienceSnapshot.docs
                  .filter(doc => doc.data().product === product)
                  .reduce((sum, doc) => sum + (doc.data().vendas || 0), 0);

                if (productAgendamentos > 0 || productVendas > 0) {
                  //                   

                  // Salvar no monthlyDetails
                  await this.saveMonthlyDetails({
                    month,
                    product,
                    client,
                    agendamentos: productAgendamentos,
                    vendas: productVendas,
                    ticketMedio: 250 // valor padrão
                  });
                }
              }
            } catch (syncError) {
              console.error('🎯 CARD DEBUG - getRealValuesForClient - Erro ao sincronizar:', syncError);
            }
          }
        } catch (audienceError) {
          console.error('🎯 CARD DEBUG - getRealValuesForClient - Erro ao buscar audienceDetails:', audienceError);
        }
      }

      // Buscar investimento real das métricas do Meta Ads
      let investimentoTotal = 0;
      try {
        const metrics = await this.getMetrics(month, client);
        if (metrics && metrics.length > 0) {
          // CORREÇÃO: Filtrar apenas métricas do cliente específico
          const clientMetrics = metrics.filter(metric => metric.client === client);
          if (clientMetrics.length > 0) {
            investimentoTotal = clientMetrics.reduce((sum, metric) => sum + (metric.investment || 0), 0);

          } else {

            investimentoTotal = 0;
          }
        } else {

          investimentoTotal = 0;
        }
      } catch (error) {
        console.warn('🔍 DEBUG - getRealValuesForClient - Erro ao buscar métricas para investimento:', error);
        // CORREÇÃO: Não usar valor padrão, usar zero
        investimentoTotal = 0;
      }

      // Calcular médias para CPV
      const avgCPV = productCount > 0 ? totalCPV / productCount : 0;

      // Processar CPV - se não há valor salvo, calcular baseado no investimento
      let finalCPV = avgCPV;
      if (finalCPV === 0 && totalVendas > 0 && investimentoTotal > 0) {
        // Calcular CPV baseado no investimento total e vendas
        finalCPV = investimentoTotal / totalVendas;
        //         
      }

      // CORREÇÃO: Se não há dados reais da planilha, zerar CPV
      if (totalAgendamentos === 0 && totalVendas === 0) {
        finalCPV = 0;

      }

      // Processar ROI - usar o primeiro valor válido ou calcular baseado nos dados
      let finalROI = '0% (0.0x)';
      //       

      if (roiValues.length > 0) {
        // Verificar se o valor salvo é válido (não é -100% quando há vendas)
        const savedROI = roiValues[0];

        if (savedROI === '-100% (0.0x)' && totalVendas > 0) {
          // Se o ROI salvo é -100% mas há vendas, recalcular

          const ticketMedio = 250; // Valor padrão
          const receitaTotal = totalVendas * ticketMedio;
          const investimentoTotal = finalCPV * totalVendas;
          const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
          const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
          finalROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
          //           
        } else {
          // Usar o valor salvo se for válido
          //           
          finalROI = savedROI;

        }
      } else if (totalVendas > 0 && finalCPV > 0) {
        // Calcular ROI baseado nos dados se não houver valor salvo
        //         

        const ticketMedio = 250; // Valor padrão
        const receitaTotal = totalVendas * ticketMedio;
        const investimentoTotal = finalCPV * totalVendas;
        const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
        const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;

        //         

        finalROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
        //         
      } else {
        //         
      }

      // CORREÇÃO: Se não há dados reais da planilha, zerar ROI
      if (totalAgendamentos === 0 && totalVendas === 0) {
        //         
        finalROI = '0% (0.0x)';

      }

      //       

      //       

      // CORREÇÃO: Remover fallback para audienceDetails pois pode causar persistência de dados incorretos
      // Se não há dados na monthlyDetails, significa que o cliente não tem dados para este mês

      // 🎯 CORREÇÃO: Usar valores calculados para os cards quando disponíveis
      const cardCPV = (this as any).calculatedCPVForCards || finalCPV;
      const cardROI = (this as any).calculatedROIForCards || finalROI;

      //       

      const result = {
        agendamentos: totalAgendamentos,
        vendas: totalVendas,
        cpv: cardCPV, // Retornar o CPV calculado para cards ou salvo
        roi: cardROI // Retornar o ROI calculado para cards ou formatado
      };

      //       

      // Limpar variáveis temporárias
      delete (this as any).calculatedCPVForCards;
      delete (this as any).calculatedROIForCards;


      //       

      return result;
    } catch (error) {
      console.error('Erro ao buscar valores reais do cliente:', error);
      return { agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' };
    }
  },

  // Função para verificar se há dados em outros meses para o cliente
  async checkClientDataInOtherMonths(client: string) {
    try {


      // Verificar na coleção monthlyDetails primeiro - filtrar por cliente
      const monthlyDetailsQuery = query(
        collection(db, 'monthlyDetails'),
        where('client', '==', client)
      );
      const monthlyDetailsSnapshot = await getDocs(monthlyDetailsQuery);
      const monthsWithData: string[] = [];



      monthlyDetailsSnapshot.forEach((doc) => {
        const data = doc.data();
        //         

        if (data.month && !monthsWithData.includes(data.month)) {
          monthsWithData.push(data.month);
        }
      });



      // Se não há dados em monthlyDetails, verificar audienceDetails
      if (monthsWithData.length === 0) {


        const audienceDetailsQuery = query(
          collection(db, 'audienceDetails'),
          where('client', '==', client)
        );

        const audienceDetailsSnapshot = await getDocs(audienceDetailsQuery);

        audienceDetailsSnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.month && !monthsWithData.includes(data.month)) {
            monthsWithData.push(data.month);
          }
        });


      }

      return monthsWithData;
    } catch (error) {
      console.error('Erro ao verificar dados do cliente em outros meses:', error);
      return [];
    }
  },

  // Função de debug para verificar dados de um período específico
  async debugPeriodData(client: string, month: string) {
    try {


      // Verificar monthlyDetails
      const monthlyDetailsQuery = query(
        collection(db, 'monthlyDetails'),
        where('month', '==', month),
        where('client', '==', client)
      );
      const monthlyDetailsSnapshot = await getDocs(monthlyDetailsQuery);





      // Verificar audienceDetails
      const audienceDetailsQuery = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('client', '==', client)
      );
      const audienceDetailsSnapshot = await getDocs(audienceDetailsQuery);





      // Testar getRealValuesForClient diretamente

      const result = await this.getRealValuesForClient(month, client);


      return {
        monthlyDetailsCount: monthlyDetailsSnapshot.size,
        audienceDetailsCount: audienceDetailsSnapshot.size,
        getRealValuesResult: result
      };

    } catch (error) {
      console.error('🔍 DEBUG - debugPeriodData - Erro:', error);
      return { error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  },

  // Retorna meses com gasto na coleção de métricas para o cliente (BM) selecionado
  async getClientMonthsWithSpend(
    client: string,
    referenceMonth?: string,
    minInvestment: number = 1,
    direction: 'past' | 'future' | 'both' = 'past'
  ): Promise<string[]> {
    try {

      const metricsRef = collection(db, 'metrics');
      const selectedAdAccountRaw = localStorage.getItem('selectedAdAccount');
      let adAccountId: string | null = null;
      try {
        if (selectedAdAccountRaw) {
          const parsed = JSON.parse(selectedAdAccountRaw);
          adAccountId = parsed?.id || parsed?.account_id || null;
        }
      } catch { }

      let q = query(metricsRef, where('client', '==', client));
      const snapshot = await getDocs(q);


      // Helpers de datas (mês pt-BR)
      const monthsPt = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ];
      const toMonthDate = (m: string): Date | null => {
        const parts = m.split(' ');
        if (parts.length < 2) return null;
        const name = parts[0];
        const year = parseInt(parts[1]);
        const idx = monthsPt.findIndex(x => x.toLowerCase() === name.toLowerCase());
        if (idx < 0 || !year) return null;
        return new Date(year, idx, 1);
      };
      const refDate = referenceMonth ? toMonthDate(referenceMonth) : null;

      // Acumular investimento por mês
      const monthToInvestmentSum = new Map<string, number>();
      snapshot.forEach((docSnap) => {
        const data: any = docSnap.data();
        const monthStr = typeof data?.month === 'string' ? data.month.trim() : '';
        const inv = typeof data?.investment === 'number' ? data.investment : 0;
        const service = data?.service;
        const docAdAccId = data?.adAccountId;

        // Exigir serviço Meta Ads (evitar dados manuais)
        if (service && service !== 'Meta Ads') return;
        // Se temos adAccountId selecionado, exigir match estrito (ignorar docs sem o campo ou divergentes)
        if (adAccountId && docAdAccId !== adAccountId) return;
        // Considerar posição relativa ao mês de referência
        if (refDate) {
          const d = toMonthDate(monthStr);
          if (!d) return;
          if (direction === 'past' && !(d < refDate)) return;
          if (direction === 'future' && !(d > refDate)) return;
          if (direction === 'both' && d.getTime() === refDate.getTime()) return;
        }
        if (!monthStr) return;
        monthToInvestmentSum.set(monthStr, (monthToInvestmentSum.get(monthStr) || 0) + inv);
      });



      // Filtrar meses com soma de investimento >= minInvestment, ordenar desc e limitar
      const monthsWithSpend = Array.from(monthToInvestmentSum.entries())
        .filter(([, sum]) => (sum || 0) >= minInvestment)
        .map(([m]) => m)
        .sort((a, b) => {
          const da = toMonthDate(a)?.getTime() || 0;
          const db = toMonthDate(b)?.getTime() || 0;
          return db - da;
        })
        .slice(0, 12);


      return monthsWithSpend;
    } catch (error) {
      console.error('Erro ao listar meses com gasto para cliente:', error);
      return [];
    }
  },

  // Função para verificar dados na coleção monthlyDetails (debug)
  async debugMonthlyDetails(month: string) {
    try {


      const q = query(
        collection(db, 'monthlyDetails'),
        where('month', '==', month)
      );
      const querySnapshot = await getDocs(q);





      return querySnapshot.size;
    } catch (error) {
      console.error('Erro ao verificar monthlyDetails:', error);
      return 0;
    }
  },



  // Função para criar dados de teste (temporária)
  async createTestDataForClient(client: string, month: string) {
    try {


      const testData = [
        {
          month: month,
          client: client,
          product: 'Produto Teste 1',
          audience: 'Público Teste 1',
          agendamentos: 150,
          vendas: 75,
          vendasAuto: false,
          manualVendasValue: 75,
          ticketMedio: 250,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          month: month,
          client: client,
          product: 'Produto Teste 2',
          audience: 'Público Teste 2',
          agendamentos: 200,
          vendas: 100,
          vendasAuto: false,
          manualVendasValue: 100,
          ticketMedio: 250,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      for (const data of testData) {
        const docId = this.sanitizeDocumentId(`${data.month}_${data.product}_${data.audience}`);
        const docRef = doc(db, 'audienceDetails', docId);
        await setDoc(docRef, data);

      }


      return true;
    } catch (error) {
      console.error('Erro ao criar dados de teste:', error);
      return false;
    }
  },

  // 🎯 NOVA FUNÇÃO: Reset do rate limit da API do Meta Ads
  resetApiRateLimit(): void {
    try {

      metaAdsService.resetApiRateLimit();

    } catch (error) {
      console.error('❌ Erro ao resetar API rate limit:', error);
    }
  },

  // 🎯 NOVA FUNÇÃO: Verificar status do rate limit da API
  async getApiRateLimitStatus(): Promise<{
    isActive: boolean;
    remainingTime?: number;
    canMakeRequest: boolean;
  }> {
    try {
      return await metaAdsService.getApiRateLimitStatus();
    } catch (error) {
      console.error('Erro ao verificar status do rate limit da API:', error);
      return {
        isActive: false,
        canMakeRequest: true
      };
    }
  },

  // 🎯 NOVO MÉTODO: Sincronização centralizada de dados de públicos
  // Este método garante que todas as seções tenham os mesmos dados
  async getSynchronizedAudienceData(
    client: string,
    product: string,
    month: string,
    options?: {
      includeSpend?: boolean;
      includeStatus?: boolean;
      forceRefresh?: boolean;
    }
  ): Promise<{
    audiences: Array<{
      name: string;
      adSetId: string;
      spend: number;
      status: string;
      activeDays: number;
      lastSpendDate?: string;
    }>;
    totalSpend: number;
    activeAudiences: number;
    lastUpdate: string;
  }> {
    const cacheKey = `sync_${client}_${product}_${month}`;

    // Se não forçar refresh e tiver cache válido, usar cache
    if (!options?.forceRefresh && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutos
        return cached.data;
      }
    }

    try {
      // 🎯 PASSO 1: Buscar todos os conjuntos de anúncios da campanha
      const campaignId = localStorage.getItem('selectedCampaignId') || '';
      let adSets: any[] = [];

      if (metaAdsService.isLoggedIn() && metaAdsService.getSelectedAccount() && campaignId) {
        try {
          adSets = await metaAdsService.getAdSets(campaignId);
        } catch (e) {
          console.info('ℹ️ Não foi possível buscar ad sets via Meta Ads, usando fallback');
        }
      }

      // 🎯 PASSO 2: Buscar dados de insights para cada conjunto
      const { since, until } = this.getMonthDateRange(month);
      const audienceData: Array<{
        name: string;
        adSetId: string;
        spend: number;
        status: string;
        activeDays: number;
        lastSpendDate?: string;
      }> = [];

      for (const adSet of adSets) {
        try {
          let spend = 0;
          let activeDays = 0;
          let lastSpendDate: string | undefined;

          if (options?.includeSpend) {
            try {
              const insights = await metaAdsService.getAdSetInsights(adSet.id, since, until, { fallbackToLast30Days: false });

              if (insights && insights.length > 0) {
                spend = insights.reduce((sum: number, i: any) => sum + (parseFloat(i?.spend || '0') || 0), 0);
                activeDays = insights.reduce((acc: number, i: any) => {
                  const daySpend = parseFloat(i?.spend || '0') || 0;
                  if (daySpend > 0) {
                    activeDays++;
                    if (!lastSpendDate || i.date_start > lastSpendDate) {
                      lastSpendDate = i.date_start;
                    }
                  }
                  return acc;
                }, 0);
              }
            } catch (e: any) {
              if (e?.response?.status === 400) {
                // Conjunto novo sem dados - isso é normal
                console.info(`ℹ️ AdSet ${adSet.id} ainda não tem dados de insights disponíveis`);
              }
            }
          }

          // 🎯 PASSO 3: Buscar status atual do conjunto
          let status = 'UNKNOWN';
          if (options?.includeStatus) {
            try {
              const details = await metaAdsService.getAdSetDetails(adSet.id);
              status = details?.status || 'UNKNOWN';
            } catch (e) {
              console.warn(`⚠️ Não foi possível buscar status do adSet ${adSet.id}`);
            }
          }

          audienceData.push({
            name: adSet.name,
            adSetId: adSet.id,
            spend,
            status,
            activeDays,
            lastSpendDate
          });
        } catch (e) {
          console.warn(`⚠️ Erro ao processar adSet ${adSet.id}:`, e);
        }
      }

      // 🎯 PASSO 4: Buscar dados históricos do Firestore como complemento
      try {
        const historicalData = await this.getAllAudienceDetailsForProduct(month, product);
        const historicalMap = new Map<string, any>();

        historicalData.forEach((detail: any) => {
          if (detail.audience && detail.adSetId) {
            historicalMap.set(detail.adSetId, detail);
          }
        });

        // 🎯 PASSO 5: Mesclar dados do Meta Ads com dados históricos
        audienceData.forEach(audience => {
          const historical = historicalMap.get(audience.adSetId);
          if (historical) {
            // Se não temos gastos do Meta Ads mas temos dados históricos, usar histórico
            if (audience.spend === 0 && historical.investment > 0) {
              audience.spend = historical.investment;
              audience.activeDays = 1; // Assumir pelo menos 1 dia ativo
            }
          }
        });

        // 🎯 CORREÇÃO CRÍTICA: Adicionar conjuntos históricos que não estão mais ativos no Meta Ads
        // Isso garante que o histórico mostre TODOS os conjuntos de TODOS os meses
        for (const [adSetId, detail] of historicalMap) {
          const existsInAudienceData = audienceData.some(a => a.adSetId === adSetId);

          if (!existsInAudienceData && detail.audience) {
            // Adicionar conjunto histórico que não está mais ativo no Meta Ads
            audienceData.push({
              name: detail.audience,
              adSetId: adSetId,
              spend: detail.investment || 0,
              status: 'UNKNOWN', // Status desconhecido para conjuntos históricos
              activeDays: 0,
              lastSpendDate: undefined
            });
          }
        }
      } catch (e) {
        console.warn('⚠️ Erro ao buscar dados históricos:', e);
      }

      const result = {
        audiences: audienceData,
        totalSpend: audienceData.reduce((sum, a) => sum + a.spend, 0),
        activeAudiences: audienceData.filter(a => a.status === 'ACTIVE').length,
        lastUpdate: new Date().toISOString()
      };

      // 🎯 PASSO 6: Cachear resultado
      this.cache.set(cacheKey, {
        data: result as any, // Type assertion para compatibilidade com cache existente
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5 minutos
      });

      return result;
    } catch (error) {
      console.error('❌ Erro na sincronização de dados de públicos:', error);
      throw error;
    }
  },

  // 🎯 MÉTODO AUXILIAR: Obter range de datas do mês
  getMonthDateRange(monthLabel: string): { since: string; until: string } {
    const months: Record<string, number> = {
      'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3, 'maio': 4, 'junho': 5,
      'julho': 6, 'agosto': 7, 'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11
    };
    const parts = (monthLabel || '').toLowerCase().split(/\s+/);
    const monthIdx = months[parts[0]] ?? new Date().getMonth();
    const year = parseInt(parts[1]) || new Date().getFullYear();
    const start = new Date(year, monthIdx, 1);
    const end = new Date(year, monthIdx + 1, 0);
    const since = start.toISOString().slice(0, 10);
    const until = end.toISOString().slice(0, 10);
    return { since, until };
  },

};

// 🎯 EXPOSER FUNÇÕES DE RATE LIMIT GLOBALMENTE PARA DEBUG
(window as any).resetApiRateLimit = metricsService.resetApiRateLimit;
(window as any).getApiRateLimitStatus = metricsService.getApiRateLimitStatus;



