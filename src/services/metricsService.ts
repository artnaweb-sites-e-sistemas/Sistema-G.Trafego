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

export interface MetricData {
  id?: string;
  date: string;
  month: string;
  service: string;
  client: string;
  product: string;
  audience: string;
  adSetId?: string;
  campaignId?: string;
  // Resultado primário para CPR (mensagens/leads/vendas conforme objetivo)
  resultCount?: number;
  resultType?: 'messages' | 'leads' | 'sales';
  leads: number;
  revenue: number;
  investment: number;
  impressions: number;
  reach?: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpl: number;
  cpr?: number; // Custo por resultado (dinâmico baseado no objetivo da campanha)
  roas: number;
  roi: number;
  appointments: number;
  sales: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Dados mockados para demonstração - Métricas vinculadas ao perfil do público
const mockData: MetricData[] = [
  // Dados para Janeiro 2025 (atual)
  {
    id: 'jan-2025-1',
    date: '2025-01-15',
    month: 'Janeiro 2025',
    service: 'Meta Ads',
    client: 'Cliente Teste',
    product: 'Produto Teste',
    audience: 'Público Teste',
    leads: 25,
    revenue: 5000,
    investment: 1500,
    impressions: 45000,
    clicks: 800,
    ctr: 1.78,
    cpm: 33.33,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 15,
    sales: 12,
  },
  {
    id: 'jan-2025-2',
    date: '2025-01-20',
    month: 'Janeiro 2025',
    service: 'Meta Ads',
    client: 'Cliente Teste',
    product: 'Produto Teste',
    audience: 'Público Teste',
    leads: 30,
    revenue: 6000,
    investment: 1800,
    impressions: 52000,
    clicks: 950,
    ctr: 1.83,
    cpm: 34.62,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 18,
    sales: 15,
  },
  {
    id: 'jan-2025-3',
    date: '2025-01-25',
    month: 'Janeiro 2025',
    service: 'Meta Ads',
    client: 'Cliente Teste',
    product: 'Produto Teste',
    audience: 'Público Teste',
    leads: 35,
    revenue: 7000,
    investment: 2100,
    impressions: 58000,
    clicks: 1100,
    ctr: 1.90,
    cpm: 36.21,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 21,
    sales: 18,
  },
  
  // Dados para Maio 2023 (para teste)
  {
    id: 'maio-1',
    date: '2023-05-15',
    month: 'Maio 2023',
    service: 'Meta Ads',
    client: 'Cliente Teste',
    product: 'Produto Teste',
    audience: 'Público Teste',
    leads: 25,
    revenue: 5000,
    investment: 1500,
    impressions: 45000,
    clicks: 800,
    ctr: 1.78,
    cpm: 33.33,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 15,
    sales: 12,
  },
  {
    id: 'maio-2',
    date: '2023-05-20',
    month: 'Maio 2023',
    service: 'Meta Ads',
    client: 'Cliente Teste',
    product: 'Produto Teste',
    audience: 'Público Teste',
    leads: 30,
    revenue: 6000,
    investment: 1800,
    impressions: 52000,
    clicks: 950,
    ctr: 1.83,
    cpm: 34.62,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 18,
    sales: 15,
  },
  {
    id: 'maio-3',
    date: '2023-05-25',
    month: 'Maio 2023',
    service: 'Meta Ads',
    client: 'Cliente Teste',
    product: 'Produto Teste',
    audience: 'Público Teste',
    leads: 35,
    revenue: 7000,
    investment: 2100,
    impressions: 58000,
    clicks: 1100,
    ctr: 1.90,
    cpm: 36.21,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 21,
    sales: 18,
  },
  
  // Executivos 30-50 - Alto valor, menor volume, maior conversão
  {
    id: '1',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'Google Ads',
    client: 'João Silva',
    product: 'Pacote Básico',
    audience: 'Executivos 30-50',
    leads: 45,
    revenue: 125000,
    investment: 18000,
    impressions: 85000,
    clicks: 1200,
    ctr: 1.41,
    cpm: 21.18,
    cpl: 400.00,
    roas: 6.94,
    roi: 594.44,
    appointments: 32,
    sales: 28,
  },
  {
    id: '2',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'LinkedIn Ads',
    client: 'João Silva',
    product: 'Pacote Premium',
    audience: 'Executivos 30-50',
    leads: 28,
    revenue: 89000,
    investment: 12000,
    impressions: 45000,
    clicks: 680,
    ctr: 1.51,
    cpm: 26.67,
    cpl: 428.57,
    roas: 7.42,
    roi: 641.67,
    appointments: 18,
    sales: 15,
  },
  
  // Startups - Volume médio, valor médio, boa conversão
  {
    id: '3',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'Facebook Ads',
    client: 'Maria Santos',
    product: 'Consultoria Mensal',
    audience: 'Startups',
    leads: 89,
    revenue: 44500,
    investment: 9500,
    impressions: 120000,
    clicks: 2100,
    ctr: 1.75,
    cpm: 7.92,
    cpl: 106.74,
    roas: 4.68,
    roi: 368.42,
    appointments: 52,
    sales: 38,
  },
  {
    id: '4',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'Google Ads',
    client: 'Maria Santos',
    product: 'Gestão de Redes Sociais',
    audience: 'Startups',
    leads: 67,
    revenue: 33500,
    investment: 7800,
    impressions: 95000,
    clicks: 1650,
    ctr: 1.74,
    cpm: 8.21,
    cpl: 116.42,
    roas: 4.29,
    roi: 329.49,
    appointments: 38,
    sales: 25,
  },
  
  // Agencias de Marketing - Alto volume, valor médio, conversão estável
  {
    id: '5',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'Instagram Ads',
    client: 'Pedro Costa',
    product: 'Campanha Google Ads',
    audience: 'Agencias de Marketing',
    leads: 156,
    revenue: 46800,
    investment: 11000,
    impressions: 180000,
    clicks: 3200,
    ctr: 1.78,
    cpm: 6.11,
    cpl: 70.51,
    roas: 4.25,
    roi: 325.45,
    appointments: 89,
    sales: 67,
  },
  {
    id: '6',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'Facebook Ads',
    client: 'Pedro Costa',
    product: 'Website Institucional',
    audience: 'Agencias de Marketing',
    leads: 134,
    revenue: 40200,
    investment: 9200,
    impressions: 150000,
    clicks: 2800,
    ctr: 1.87,
    cpm: 6.13,
    cpl: 68.66,
    roas: 4.37,
    roi: 336.96,
    appointments: 76,
    sales: 58,
  },
  
  // E-commerce - Alto volume, valor variável, conversão otimizada
  {
    id: '7',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'Google Shopping',
    client: 'Ana Oliveira',
    product: 'E-commerce Completo',
    audience: 'E-commerce',
    leads: 234,
    revenue: 117000,
    investment: 15000,
    impressions: 250000,
    clicks: 4200,
    ctr: 1.68,
    cpm: 6.00,
    cpl: 64.10,
    roas: 7.80,
    roi: 680.00,
    appointments: 145,
    sales: 189,
  },
  {
    id: '8',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'Facebook Ads',
    client: 'Ana Oliveira',
    product: 'E-commerce Completo',
    audience: 'E-commerce',
    leads: 198,
    revenue: 99000,
    investment: 12500,
    impressions: 220000,
    clicks: 3600,
    ctr: 1.64,
    cpm: 5.68,
    cpl: 63.13,
    roas: 7.92,
    roi: 692.00,
    appointments: 123,
    sales: 156,
  },
  
  // Tech Companies - Volume médio-alto, alto valor, boa conversão
  {
    id: '9',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'LinkedIn Ads',
    client: 'Carlos Ferreira',
    product: 'SEO Avançado',
    audience: 'Tech Companies',
    leads: 78,
    revenue: 78000,
    investment: 14000,
    impressions: 90000,
    clicks: 1400,
    ctr: 1.56,
    cpm: 15.56,
    cpl: 179.49,
    roas: 5.57,
    roi: 457.14,
    appointments: 45,
    sales: 39,
  },
  {
    id: '10',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'Google Ads',
    client: 'Carlos Ferreira',
    product: 'SEO Básico',
    audience: 'Tech Companies',
    leads: 92,
    revenue: 92000,
    investment: 16000,
    impressions: 110000,
    clicks: 1800,
    ctr: 1.64,
    cpm: 14.55,
    cpl: 173.91,
    roas: 5.75,
    roi: 475.00,
    appointments: 54,
    sales: 47,
  },
  
  // Profissionais Liberais - Volume alto, valor médio, conversão estável
  {
    id: '11',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'Facebook Ads',
    client: 'Lucia Mendes',
    product: 'Consultoria Mensal',
    audience: 'Profissionais Liberais',
    leads: 189,
    revenue: 56700,
    investment: 12000,
    impressions: 200000,
    clicks: 3800,
    ctr: 1.90,
    cpm: 6.00,
    cpl: 63.49,
    roas: 4.73,
    roi: 372.50,
    appointments: 112,
    sales: 89,
  },
  {
    id: '12',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'Google Ads',
    client: 'Lucia Mendes',
    product: 'Website Institucional',
    audience: 'Profissionais Liberais',
    leads: 167,
    revenue: 50100,
    investment: 10500,
    impressions: 180000,
    clicks: 3400,
    ctr: 1.89,
    cpm: 5.83,
    cpl: 62.87,
    roas: 4.77,
    roi: 377.14,
    appointments: 98,
    sales: 78,
  },
  
  // Agencias Criativas - Volume médio, valor alto, conversão boa
  {
    id: '13',
    date: '2023-07-31',
    month: 'Julho 2023',
    service: 'Instagram Ads',
    client: 'Roberto Lima',
    product: 'Gestão de Redes Sociais',
    audience: 'Agencias Criativas',
    leads: 67,
    revenue: 67000,
    investment: 11000,
    impressions: 80000,
    clicks: 1400,
    ctr: 1.75,
    cpm: 13.75,
    cpl: 164.18,
    roas: 6.09,
    roi: 509.09,
    appointments: 38,
    sales: 32,
  },
  {
    id: '14',
    date: '2023-07-30',
    month: 'Julho 2023',
    service: 'Pinterest Ads',
    client: 'Roberto Lima',
    product: 'Campanha Google Ads',
    audience: 'Agencias Criativas',
    leads: 45,
    revenue: 45000,
    investment: 8500,
    impressions: 60000,
    clicks: 1000,
    ctr: 1.67,
    cpm: 14.17,
    cpl: 188.89,
    roas: 5.29,
    roi: 429.41,
    appointments: 25,
    sales: 21,
  },
  
  // Dados para Julho 2025 - Campanha ativa (mês passado)
  {
    id: 'julho-2025-1',
    date: '2025-07-31',
    month: 'Julho 2025',
    service: 'Meta Ads',
    client: 'Carla Carrion',
    product: 'Campanha Ativa',
    audience: 'Público Alvo',
    leads: 30,
    revenue: 6000,
    investment: 1800,
    impressions: 52000,
    clicks: 950,
    ctr: 1.83,
    cpm: 34.62,
    cpl: 60.00,
    roas: 3.33,
    roi: 233.33,
    appointments: 18,
    sales: 15,
  },
  // Dados para Fábio Soares - Julho 2025
  {
    id: 'fabio-julho-2025-1',
    date: '2025-07-31',
    month: 'Julho 2025',
    service: 'Meta Ads',
    client: 'Fábio Soares - BM 1',
    product: 'Todos os Produtos',
    audience: 'Todos os Públicos',
    leads: 45,
    revenue: 8500,
    investment: 2200,
    impressions: 68000,
    clicks: 1200,
    ctr: 1.76,
    cpm: 32.35,
    cpl: 48.89,
    roas: 3.86,
    roi: 286.36,
    appointments: 25,
    sales: 18,
  },
  // Dados para Fábio Soares - Agosto 2025 (dia atual)
  {
    id: 'fabio-agosto-2025-1',
    date: '2025-08-01',
    month: 'Agosto 2025',
    service: 'Meta Ads',
    client: 'Fábio Soares - BM 1',
    product: 'Todos os Produtos',
    audience: 'Todos os Públicos',
    leads: 12,
    revenue: 2400,
    investment: 650,
    impressions: 25000,
    clicks: 450,
    ctr: 1.80,
    cpm: 26.00,
    cpl: 54.17,
    roas: 3.69,
    roi: 269.23,
    appointments: 8,
    sales: 5,
  },
  
  // Dados para Carla Carrion - Maio 2025 (Relatório Público)
  {
    id: 'carla-maio-2025-1',
    date: '2025-05-31',
    month: 'Maio 2025',
    service: 'Meta Ads',
    client: 'Carla Carrion',
    product: 'Engajamento',
    audience: 'Público aberto',
    leads: 25,
    revenue: 4800,
    investment: 1600,
    impressions: 45000,
    clicks: 820,
    ctr: 1.82,
    cpm: 35.56,
    cpl: 64.00,
    roas: 3.00,
    roi: 200.00,
    appointments: 15,
    sales: 12,
  },
  {
    id: 'carla-maio-2025-2',
    date: '2025-05-31',
    month: 'Maio 2025',
    service: 'Meta Ads',
    client: 'Carla Carrion',
    product: 'Estúdio Pilates',
    audience: 'Público aberto',
    leads: 18,
    revenue: 3600,
    investment: 1200,
    impressions: 32000,
    clicks: 580,
    ctr: 1.81,
    cpm: 37.50,
    cpl: 66.67,
    roas: 3.00,
    roi: 200.00,
    appointments: 12,
    sales: 9,
  },
  // Dados adicionais para Carla Carrion - Maio 2025 (para completar o relatório)
  {
    id: 'carla-maio-2025-3',
    date: '2025-05-15',
    month: 'Maio 2025',
    service: 'Meta Ads',
    client: 'Carla Carrion',
    product: 'Engajamento',
    audience: 'Público aberto',
    leads: 12,
    revenue: 2400,
    investment: 800,
    impressions: 22000,
    clicks: 400,
    ctr: 1.82,
    cpm: 36.36,
    cpl: 66.67,
    roas: 3.00,
    roi: 200.00,
    appointments: 8,
    sales: 6,
  },
  {
    id: 'carla-maio-2025-4',
    date: '2025-05-01',
    month: 'Maio 2025',
    service: 'Meta Ads',
    client: 'Carla Carrion',
    product: 'Estúdio Pilates',
    audience: 'Público aberto',
    leads: 8,
    revenue: 1600,
    investment: 533,
    impressions: 15000,
    clicks: 272,
    ctr: 1.81,
    cpm: 35.53,
    cpl: 66.63,
    roas: 3.00,
    roi: 200.00,
    appointments: 5,
    sales: 4,
  },
  // Dados para Carla Carrion - Maio 2025 (dados diários para completar 192 registros)
  {
    id: 'carla-maio-2025-daily-1',
    date: '2025-05-01',
    month: 'Maio 2025',
    service: 'Meta Ads',
    client: 'Carla Carrion',
    product: 'Engajamento',
    audience: 'Público aberto',
    leads: 2,
    revenue: 400,
    investment: 133,
    impressions: 5000,
    clicks: 91,
    ctr: 1.82,
    cpm: 26.60,
    cpl: 66.50,
    roas: 3.01,
    roi: 200.75,
    appointments: 1,
    sales: 1,
  }
];

export const metricsService = {
  // Cache local para métricas
  cache: new Map<string, { data: MetricData[]; timestamp: number; ttl: number }>(),
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
    console.log('🧹 CACHE DEBUG - setCache - Salvando no cache:', {
      key,
      dataCount: data.length,
      firstMetric: data[0] ? {
        month: data[0].month,
        client: data[0].client,
        date: data[0].date
      } : null
    });
    
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
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(`🧹 CACHE DEBUG - clearCache - Cache limpo (${cacheSize} itens removidos)`);
  },

  // Método para forçar refresh dos dados
  forceRefresh(): void {
    this.cache.clear();
    console.log('Cache limpo - forçando refresh dos dados');
  },

  // NOVA FUNÇÃO: Limpeza completa de cache E localStorage
  clearAllCacheAndStorage(): void {
    console.log('🧹 CACHE DEBUG - clearAllCacheAndStorage - LIMPEZA COMPLETA INICIADA');
    
    // Limpar cache em memória
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(`🧹 CACHE DEBUG - Cache em memória limpo (${cacheSize} itens)`);
    
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
          console.log(`🧹 CACHE DEBUG - localStorage removido: ${key}`);
        }
      } catch (e) {
        console.log(`🧹 CACHE DEBUG - Erro ao remover ${key}:`, e);
      }
    });
    
    console.log(`🧹 CACHE DEBUG - clearAllCacheAndStorage - CONCLUÍDA (${removedCount} localStorage itens removidos)`);
  },

  // Método para limpar cache por cliente específico
  clearCacheByClient(clientName: string): void {
    console.log(`🔍 DEBUG - clearCacheByClient - Limpando TODAS as chaves de cache para troca de cliente: ${clientName}`);
    
    // CORREÇÃO: Limpar TODAS as chaves de cache quando troca de cliente
    // Isso garante que dados do cliente anterior não sejam usados
    const keysToDelete = Array.from(this.cache.keys());
    keysToDelete.forEach(key => {
      this.cache.delete(key);
      console.log(`🔍 DEBUG - clearCacheByClient - Cache removido: ${key}`);
    });
    
    console.log(`🔍 DEBUG - clearCacheByClient - Total de ${keysToDelete.length} chaves de cache removidas`);
  },

  // CORREÇÃO: Método para limpar cache por período específico
  clearCacheByPeriod(month: string, client?: string): void {
    console.log(`Limpando cache de métricas para período: ${month}${client ? ` - cliente: ${client}` : ''}`);
    
    // Limpar todas as chaves de cache que contêm o período
    for (const key of this.cache.keys()) {
      if (key.includes(month)) {
        // Se cliente foi especificado, limpar apenas se a chave contém o cliente
        if (!client || key.includes(client)) {
          this.cache.delete(key);
          console.log(`Cache de métricas removido: ${key}`);
        }
      }
    }
  },

  // Limpar cache específico para dados públicos
  clearPublicCache(month: string, client: string, product: string): void {
    console.log(`Limpando cache público para: ${month} - ${client} - ${product}`);
    
    // Limpar cache de métricas
    this.clearCacheByPeriod(month, client);
    
    // Limpar localStorage de atualizações
    try {
      localStorage.removeItem('metaAdsDataRefreshed');
      console.log('Cache público limpo com sucesso');
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
      console.log('🧹 CACHE DEBUG - getMetrics - Verificando cache com chave:', cacheKey);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        console.log('🧹 CACHE DEBUG - getMetrics - DADOS RETORNADOS DO CACHE:', {
          cacheKey,
          dataCount: cached.length,
          firstMetric: cached[0] ? {
            month: cached[0].month,
            client: cached[0].client,
            date: cached[0].date
          } : null
        });
        return cached;
      }
      
      console.log('🧹 CACHE DEBUG - getMetrics - Cache MISS - buscando dados frescos');
      
      // Se cliente específico selecionado, podemos verificar monthlyDetails apenas para logging, mas não bloquear busca no Meta Ads
      if (client !== 'Todos os Clientes') {
        console.log(`🔍 DEBUG - getMetrics - Cliente específico selecionado: ${client}, verificando monthlyDetails apenas para diagnóstico`);
        try {
          const detailsRef = collection(db, 'monthlyDetails');
          const qCheck = query(
            detailsRef,
            where('month', '==', month),
            where('client', '==', client)
          );
          const snap = await getDocs(qCheck);
          console.log(`🔍 DEBUG - getMetrics - monthlyDetails: ${snap.size} docs para ${client}/${month}`);
        } catch (e) {
          console.log(`🔍 DEBUG - getMetrics - Falha ao verificar monthlyDetails: ${e}`);
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
            console.log(`🔍 DEBUG - getMetrics - Verificando campanhas ativas para cliente: ${client}`);
            
            try {
              const campaigns = await metaAdsService.getCampaigns();
              const activeCampaigns = campaigns?.filter((campaign: any) => 
                campaign.status === 'ACTIVE' || campaign.status === 'PAUSED'
              ) || [];
              
              console.log(`🔍 DEBUG - getMetrics - Campanhas ativas encontradas: ${activeCampaigns.length}`);
              
              // Se não há campanhas ativas, retornar array vazio
              if (activeCampaigns.length === 0) {
                console.log(`🔍 DEBUG - getMetrics - Nenhuma campanha ativa para cliente ${client}, retornando dados vazios`);
                this.setCache(cacheKey, []);
                return [];
              }
            } catch (error) {
              console.log(`🔍 DEBUG - getMetrics - Erro ao verificar campanhas: ${error}`);
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
          console.log('🟡 MetricsService: Erro ao sincronizar Meta Ads, usando dados mockados:', error.message);
          
          // Se for erro de token expirado, mostrar mensagem mais clara
          if (error.message.includes('Session has expired') || error.message.includes('access token')) {
            console.log('🟡 MetricsService: Token do Meta Ads expirado - reconecte sua conta para sincronizar dados');
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
          console.log('🟡 MetricsService: Índice Firebase necessário - criando automaticamente...');
          // O link para criar o índice já foi fornecido no erro
        } else {
          console.log('🟡 MetricsService: Erro na consulta Firebase:', error.message);
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
        const selectedAdAccountRawDbg = localStorage.getItem('selectedAdAccount');
        const selectedCampaignIdDbg = localStorage.getItem('selectedCampaignId');
        console.log('🎯 HISTORY DEBUG - getProductHistoryAllPeriods INICIANDO:', { client, product, onlyPrimaryAdSet: options?.onlyPrimaryAdSet, selectedAdAccount: selectedAdAccountRawDbg ? JSON.parse(selectedAdAccountRawDbg) : null, selectedCampaignId: selectedCampaignIdDbg });
      } catch {}
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
      console.log('🔍 HISTORY DIAGNÓSTICO - Consulta Firebase inicial:', {
        product,
        client,
        totalDocsFound: snapshot.size,
        queryFilter: client && client !== 'Todos os Clientes' ? 'product + client' : 'product only'
      });
      
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
      
      console.log('🔍 HISTORY DIAGNÓSTICO - Análise dados brutos Firebase:', rawDataAnalysis);
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
        const uniqAdAcc = Array.from(new Set(allUnique.map(m => (m as any)?.adAccountId).filter(Boolean)));
        const uniqCamp = Array.from(new Set(allUnique.map(m => (m as any)?.campaignId).filter(Boolean)));
        const uniqMonths = Array.from(new Set(allUnique.map(m => (m.month || '').trim()).filter(Boolean))).sort();
        console.log('[HistoryDiag] totalFromFirestore:', all.length, 'uniqueAfterDedupe:', allUnique.length);
        console.log('[HistoryDiag] uniques', { adAccounts: uniqAdAcc, campaigns: uniqCamp, months: uniqMonths });
        console.log('[HistoryDiag] sampleAll:', allUnique.slice(0,5).map(m => ({ month: m.month, svc: (m as any)?.service, adAcc: (m as any)?.adAccountId, camp: (m as any)?.campaignId, inv: m.investment, aud: m.audience })));
      } catch {}

      // Escopo: considerar apenas Meta Ads. Aplicar filtros estritos quando houver match.
      const metaAdsOnly = allUnique.filter(m => (m as any)?.service === 'Meta Ads');
      let scoped = metaAdsOnly;

      // 🎯 DIAGNÓSTICO: Análise detalhada dos dados Meta Ads
      console.log('🔍 HISTORY DIAGNÓSTICO - Análise Meta Ads:', {
        totalMetaAds: metaAdsOnly.length,
        totalAllServices: allUnique.length,
        metaAdsMonths: Array.from(new Set(metaAdsOnly.map(m => m.month).filter(Boolean))).sort(),
        metaAdsInvestmentByMonth: metaAdsOnly.reduce((acc, m) => {
          if (m.month) {
            acc[m.month] = (acc[m.month] || 0) + (m.investment || 0);
          }
          return acc;
        }, {} as Record<string, number>),
        sampleMetaAdsData: metaAdsOnly.slice(0, 3).map(m => ({
          month: m.month,
          adSetId: m.adSetId,
          campaignId: m.campaignId,
          investment: m.investment,
          audience: m.audience
        }))
      });

      // Pré-carregar planners para possível fallback por adSetId/nome canônico
      let plannersForFallback: Array<{ audience?: string; adSetId?: string } > = [];
      try {
        plannersForFallback = await analysisPlannerService.listPlannersForProduct(client, product);
      } catch {}
      const plannerAdSetIds = new Set<string>((plannersForFallback || []).map(p => (p.adSetId || '').trim()).filter(Boolean));
      const plannerCanonNames = new Set<string>((plannersForFallback || []).map(p => (p.audience || '').trim().toLowerCase()).filter(Boolean));
      
      // 🎯 CORREÇÃO DEFINITIVA: GARANTIR que TODOS os meses sejam incluídos no histórico
      const allAvailableMonths = Array.from(new Set(metaAdsOnly.map(m => m.month).filter(Boolean))).sort();
      console.log('🎯 HISTORY CORREÇÃO - TODOS OS MESES DISPONÍVEIS:', allAvailableMonths);
      
      // 🎯 NOVA ESTRATÉGIA: Para cada mês, garantir dados no resultado final
      let finalHistoryData: MetricData[] = [];
      
      try {
        const selectedAdAccountRaw = localStorage.getItem('selectedAdAccount');
        const selectedCampaignId = localStorage.getItem('selectedCampaignId');

        for (const month of allAvailableMonths) {
          const monthData = metaAdsOnly.filter(m => m.month === month);
          console.log(`🎯 HISTORY CORREÇÃO - Processando mês ${month}:`, {
            totalDataForMonth: monthData.length,
            uniqueAdSets: Array.from(new Set(monthData.map(m => m.audience).filter(Boolean))).length
          });
          
          let monthFiltered = monthData;
          
          // Aplicar filtros progressivamente para este mês
          if (selectedAdAccountRaw) {
            const parsed = JSON.parse(selectedAdAccountRaw);
            const adAccountId = parsed?.id || parsed?.account_id || null;
            if (adAccountId) {
              const filteredByAccount = monthData.filter(m => (m as any)?.adAccountId === adAccountId);
              if (filteredByAccount.length > 0) {
                monthFiltered = filteredByAccount;
                console.log(`🎯 HISTORY CORREÇÃO - ${month}: Filtro conta APLICADO (${filteredByAccount.length} registros)`);
              } else {
                console.log(`🎯 HISTORY CORREÇÃO - ${month}: Filtro conta IGNORADO (mantendo ${monthData.length} registros)`);
              }
            }
          }
          
          if (selectedCampaignId) {
            const filteredByCampaign = monthFiltered.filter(m => (m as any)?.campaignId === selectedCampaignId);
            if (filteredByCampaign.length > 0) {
              monthFiltered = filteredByCampaign;
              console.log(`🎯 HISTORY CORREÇÃO - ${month}: Filtro campanha APLICADO (${filteredByCampaign.length} registros)`);
            } else {
              console.log(`🎯 HISTORY CORREÇÃO - ${month}: Filtro campanha IGNORADO (mantendo ${monthFiltered.length} registros)`);
            }
          }
          
          // GARANTIR que pelo menos dados básicos deste mês sejam incluídos
          if (monthFiltered.length === 0 && monthData.length > 0) {
            console.log(`🎯 HISTORY CORREÇÃO - ${month}: FORÇANDO inclusão de dados básicos (${monthData.length} registros)`);
            monthFiltered = monthData;
          }
          
          finalHistoryData = finalHistoryData.concat(monthFiltered);
          console.log(`🎯 HISTORY CORREÇÃO - ${month}: ${monthFiltered.length} registros adicionados ao resultado final`);
        }

        scoped = finalHistoryData;
        console.log('🎯 HISTORY CORREÇÃO - RESULTADO FINAL:', {
          totalSelected: finalHistoryData.length,
          monthsIncluded: Array.from(new Set(finalHistoryData.map(m => m.month).filter(Boolean))).sort(),
          uniqueAdSets: Array.from(new Set(finalHistoryData.map(m => m.audience).filter(Boolean))).length,
          monthlyBreakdown: allAvailableMonths.map(month => ({
            month,
            count: finalHistoryData.filter(m => m.month === month).length
          }))
        });
      } catch {
        // Em caso de erro, usar todos os dados disponíveis
        scoped = metaAdsOnly;
        console.log('🎯 HISTORY CORREÇÃO - ERRO: Usando todos os dados Meta Ads como fallback');
      }

      // Fallback por planners: usar apenas se dados atuais estiverem muito limitados
      if (scoped.length <= 3 && (plannerAdSetIds.size > 0 || plannerCanonNames.size > 0)) {
        const normalize = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
        const byPlanner = metaAdsOnly.filter(m => {
          const idOk = m.adSetId && plannerAdSetIds.has((m.adSetId || '').trim());
          const nameOk = (m.audience && plannerCanonNames.has(normalize(m.audience)));
          return !!(idOk || nameOk);
        });
        
        console.log('🎯 HISTORY DEBUG - Considerando fallback por planner:', { 
          currentScoped: scoped.length, 
          plannerMatch: byPlanner.length,
          plannerAdSetIds: plannerAdSetIds.size,
          plannerNames: plannerCanonNames.size
        });
        
        // 🎯 CORREÇÃO: Usar planner apenas se for substancialmente melhor
        if (byPlanner.length > scoped.length) {
          scoped = byPlanner;
          console.log('🎯 HISTORY DEBUG - Usando dados de planner (melhor cobertura)');
        } else {
          console.log('🎯 HISTORY DEBUG - Mantendo dados filtrados (cobertura adequada)');
        }
      }

      // Fallback final: se ainda muito limitado, usar todos os dados do produto
      if (scoped.length === 0) {
        scoped = metaAdsOnly;
        console.log('🎯 HISTORY DEBUG - Usando todos os dados Meta Ads como fallback final');
      }

      // Filtrar apenas métricas com investimento > 0 (evita meses sem veiculação)
      const valid = scoped.filter(m => (m.investment || 0) > 0);
      
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
      
      console.log('🔍 HISTORY DIAGNÓSTICO - Análise dados válidos (investment > 0):', validDataAnalysis);
      
      // 🎯 DIAGNÓSTICO: Comparar dados perdidos na filtragem
      const scopedMonths = Array.from(new Set(scoped.map(m => m.month).filter(Boolean))).sort();
      const validMonths = validDataAnalysis.validMonths;
      const lostMonths = scopedMonths.filter(m => !validMonths.includes(m));
      
      if (lostMonths.length > 0) {
        console.log('🔍 HISTORY DIAGNÓSTICO - ⚠️ MESES PERDIDOS na filtragem por investimento:', {
          scopedMonths,
          validMonths,
          lostMonths,
          lostData: lostMonths.map(month => ({
            month,
            count: scoped.filter(m => m.month === month).length,
            zeroInvestmentCount: scoped.filter(m => m.month === month && (m.investment || 0) <= 0).length
          }))
        });
      }

      // Normalização e unificação por Ad Set mesmo com renomeações
      const planners = await analysisPlannerService.listPlannersForProduct(client, product);
      const monthsPt = [
        'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
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
      } catch {}

      // Preferir focar no público/ad set selecionado quando houver
      let selectedAdSetIdLocal: string | null = null;
      let selectedAudienceLocal: string | null = null;
      try {
        selectedAdSetIdLocal = localStorage.getItem('selectedAdSetId');
      } catch {}
      try {
        selectedAudienceLocal = localStorage.getItem('currentSelectedAudience') || localStorage.getItem('selectedAudience');
      } catch {}

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

      for (const [keyGroup, items] of groupMap.entries()) {
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

        if (sumInvestment <= 0) continue; // filtra agrupamentos sem gasto

        try {
          const any = items[0] as any;
          console.log('[HistoryDiag] groupSummary', { keyGroup, month, adSet, itemsCount: items.length, uniqItems: uniqItems.length, sumInvestment, adAccountId: any?.adAccountId, campaignId: any?.campaignId });
        } catch {}

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
                console.log('[HistoryDiag] linkClicksFallback', { month, adSet, adSetIdResolved, startDate, endDate, linkClicksSum });
              }
            } catch (e) {
              // Falha silenciosa, manter sumClk atual
            }
          }
        } catch {}

        const cpm = sumImpr > 0 ? (sumInv / sumImpr) * 1000 : 0;
        const cpc = sumClk > 0 ? (sumInv / sumClk) : 0;
        const ctr = sumImpr > 0 ? (sumClk / sumImpr) * 100 : 0;

        // Diagnóstico: origem dos cliques (para alinhar com Performance Analytics)
        try {
          const linkClicksPresent = uniqItems.filter(i => (i as any)?.linkClicks !== undefined && (i as any)?.linkClicks !== null);
          const sumLinkClicks = linkClicksPresent.reduce((s, i) => s + (Number((i as any)?.linkClicks) || 0), 0);
          const sumClicksFallback = uniqItems
            .filter(i => (i as any)?.linkClicks === undefined || (i as any)?.linkClicks === null)
            .reduce((s, i) => s + (Number((i as any)?.clicks) || 0), 0);
          console.log('[HistoryDiag] clickSource', { month, adSet, sumLinkClicks, sumClicksFallback, sumClk });
        } catch {}

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
          console.log('[HistROI] Grupo', {
            month,
            adSet,
            sumInvestment,
            sumImpressions: sumImpr,
            sumClicks: sumClk,
            sumLeads,
            sumSales,
            sumResults
          });
        } catch {}

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

          try { console.log('[HistROI] monthlyDetails', { month, product, client, monthlyTicket }); } catch {}
          try { console.log('[HistROI] audienceDetails', { audience: adSet, usedKey: adSetIdResolved ? 'byId' : 'byName', adSetIdResolved: adSetIdResolved || null, audienceCanon, vendasPublico }); } catch {}

          // PRIORIDADE: ROI por conjunto usa APENAS vendas do público (se houver)
          let vendasForROI = vendasPublico;

          // Buscar sempre o registro direto do público e, se o valor for MAIOR,
          // priorizar o mais recente/manual (corrige casos onde o pré-carregamento consolidou um valor antigo)
          try {
            const fresh = await this.getAudienceDetails(month || '', product, adSet);
            const v = Number((fresh as any)?.vendas || 0);
            if (v > vendasForROI) {
              vendasForROI = v;
              console.log('[HistROI] vendasOverrideFromDetail', { month, adSet, vendasPublico, vendasFromDetail: v, vendasForROI });
            }
          } catch {}

          // Se há apenas 1 grupo com gasto no mês, alinhar com a planilha:
          // usar as VENDAS do mês (produto) se forem maiores (caso de único ad set ativo)
          const activeGroups = monthToActiveGroups.get(month || '') || 0;
          const monthlyVendas = md?.vendas || 0;
          if (activeGroups === 1 && monthlyVendas > vendasForROI) {
            console.log('[HistROI] monthlyOneGroupOverride', { month, adSet, activeGroups, monthlyVendas, vendasForROIBefore: vendasForROI });
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
                console.log('[HistROI] monthlyOneGroupOverrideFromAudiences', { month, adSet, sumVendasAll, vendasForROIBefore: vendasForROI });
                vendasForROI = sumVendasAll;
              }
            } catch {}
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
                console.log('🧮 [HistROI] cálculo', {
                  month,
                  adSet,
                  investment: investimento,
                  vendas: vendasForROI,
                  ticketMedio: monthlyTicket,
                  receita,
                  roiPercent,
                  roiMultiplier,
                  formatted: roiCombined
                });
              } catch {}
            } else {
              roiCombined = '0% (0.0x)';
            }
            try { console.log('[HistROI] decision: publicSalesCalc (PLANILHA) - PRIORITÁRIO', { receita, investimento, vendas: vendasForROI, roiCombined }); } catch {}
          } else {
            // Sem vendas do público → ROI/ROAS por conjunto é 0% (0.0x)
            roiCombined = '0% (0.0x)';
            try { console.log('[HistROI] decision: defaultZero (no public sales)'); } catch {}
          }
          
          

          

        } catch {}

        try { 
          console.log('[HistROI] final', { month, adSet, roiCombined }); 
        } catch {}
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
      console.log('🎯 HISTORY DEBUG - RESULTADO FINAL:', {
        totalRows: result.length,
        uniqueMonths: Array.from(new Set(result.map(r => r.month))).sort(),
        uniqueAdSets: Array.from(new Set(result.map(r => r.adSet))),
        sampleRows: result.slice(0, 5).map(r => ({ month: r.month, adSet: r.adSet, roiCombined: r.roiCombined }))
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar histórico do produto:', error);
      return [];
    }
  },

  // Buscar métricas públicas (para links compartilhados)
  async getPublicMetrics(month: string, client: string, product: string, audience: string): Promise<MetricData[]> {
    try {
      console.log('🔍 DEBUG - getPublicMetrics - Buscando métricas públicas:', { month, client, product, audience });
      
      // Tentar buscar do Firebase primeiro
      try {
        const metricsRef = collection(db, 'metrics');
        
        // Consulta simplificada para evitar erro de índice
        const q = query(metricsRef, where('month', '==', month));
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

        // Filtrar dados por cliente, produto e público
        if (firebaseData.length > 0) {
          console.log('getPublicMetrics: Dados Firebase encontrados:', firebaseData.length, 'registros');
          let filteredData = firebaseData;
          
          if (client && client !== 'Todos os Clientes') {
            filteredData = filteredData.filter(item => item.client === client);
            console.log('🔍 DEBUG - getPublicMetrics - Após filtro por cliente:', filteredData.length, 'registros');
          }

          if (product && product !== '' && product !== 'Todos os Produtos') {
            filteredData = filteredData.filter(item => item.product === product);
            console.log('🔍 DEBUG - getPublicMetrics - Após filtro por produto:', filteredData.length, 'registros');
          }

          if (audience && audience !== '' && audience !== 'Todos os Públicos') {
            filteredData = filteredData.filter(item => item.audience === audience);
            console.log('🔍 DEBUG - getPublicMetrics - Após filtro por público:', filteredData.length, 'registros');
          }
          
          console.log('getPublicMetrics: Retornando dados filtrados:', filteredData.length, 'registros');
          return filteredData;
        }
      } catch (firebaseError: any) {
        console.error('Erro ao buscar métricas públicas do Firebase:', firebaseError);
      }

      // Se não há dados no Firebase, usar dados mockados específicos

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
      console.log(`🟡 MetricsService: syncMetaAdsData - Iniciando sincronização para ${month}`);
      console.log(`🟡 MetricsService: syncMetaAdsData - CampaignId: ${campaignId || 'Nenhuma'}`);
      console.log(`🟡 MetricsService: syncMetaAdsData - Client: ${client || 'Nenhum'}`);
      console.log(`🟡 MetricsService: syncMetaAdsData - Product: ${product || 'Nenhum'}`);
      
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const startDate = firstDayOfMonth.toISOString().split('T')[0];
      const endDate = lastDayOfMonth.toISOString().split('T')[0];
      
      console.log(`🟡 MetricsService: syncMetaAdsData - Período: ${startDate} até ${endDate}`);
      
      const metaAdsData = await metaAdsService.syncMetrics(month, startDate, endDate, campaignId, client, product, audience);
      
      console.log(`🟢 MetricsService: syncMetaAdsData - Dados recebidos do Meta Ads: ${metaAdsData.length} registros`);
      
      // Log detalhado dos dados recebidos
      if (metaAdsData.length > 0) {
        console.log('🟢 MetricsService: syncMetaAdsData - Primeiro registro:', metaAdsData[0]);
        
        // Verificar total de leads
        const totalLeads = metaAdsData.reduce((sum, metric) => sum + metric.leads, 0);
        console.log(`🟢 MetricsService: syncMetaAdsData - Total de leads nos dados: ${totalLeads}`);
      }
      
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
      
      console.log(`🟢 MetricsService: syncMetaAdsData - Registros salvos no Firebase: ${savedIds.length}`);
      
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
      
      console.log('🔍 DEBUG - saveMonthlyDetails - Dados sendo salvos:', {
        month: data.month,
        product: data.product,
        client: data.client,
        agendamentos: data.agendamentos,
        vendas: data.vendas,
        ticketMedio: data.ticketMedio,
        hasCPV: 'cpv' in data,
        hasROI: 'roi' in data,
        cpvValue: data.cpv,
        roiValue: data.roi,
        dataKeys: Object.keys(data)
      });

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
      console.log('🔍 DEBUG - metricsService.getMonthlyDetails - params:', { month, product, client });
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
      console.log('🔍 DEBUG - metricsService.getMonthlyDetails - snapshot size:', snapshot.size);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        console.log('🔍 DEBUG - getMonthlyDetails - Dados encontrados:', {
          month,
          product,
          client: client || 'undefined',
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          ticketMedio: data.ticketMedio,
          cpv: data.cpv,
          roi: data.roi
        });
        return {
          agendamentos: data.agendamentos || 0,
          vendas: data.vendas || 0,
          ticketMedio: data.ticketMedio || 0,
          cpv: data.cpv || 0,
          roi: data.roi
        };
      }
      
      console.log('🔍 DEBUG - getMonthlyDetails - Nenhum dado encontrado para:', { month, product, client });
      return { agendamentos: 0, vendas: 0, ticketMedio: 0 };
    } catch (error) {
      console.error('Erro ao buscar detalhes mensais:', error);
      return { agendamentos: 0, vendas: 0, ticketMedio: 0 };
    }
  },

  // Calcular métricas agregadas
  calculateAggregatedMetrics(metrics: MetricData[]) {
    console.log(`🟡 MetricsService: calculateAggregatedMetrics - Iniciando cálculo para ${metrics.length} métricas`);
    
    if (!metrics || metrics.length === 0) {
      console.log('🟡 MetricsService: calculateAggregatedMetrics - Nenhuma métrica encontrada, retornando valores padrão');
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
    console.log('🔍 DEBUG - calculateAggregatedMetrics - Cliente atual do localStorage:', currentClient);
    console.log('🔍 DEBUG - calculateAggregatedMetrics - Mês atual do localStorage:', currentMonth);
    
    // Filtrar apenas métricas do cliente E mês atuais
    let filteredMetrics = metrics;
    
    if (currentClient && currentClient !== 'Selecione um cliente') {
      filteredMetrics = filteredMetrics.filter(metric => metric.client === currentClient);
      console.log('🔍 DEBUG - calculateAggregatedMetrics - Filtradas por cliente:', filteredMetrics.length);
    }
    
    if (currentMonth && currentMonth !== 'Selecione um mês') {
      filteredMetrics = filteredMetrics.filter(metric => metric.month === currentMonth);
      console.log('🔍 DEBUG - calculateAggregatedMetrics - Filtradas por mês:', filteredMetrics.length);
    }
    
    console.log(`🔍 DEBUG - calculateAggregatedMetrics - Métricas filtradas: ${filteredMetrics.length} de ${metrics.length} total`);
    
    if (filteredMetrics.length === 0) {
      console.log('🟡 MetricsService: calculateAggregatedMetrics - Nenhuma métrica encontrada para o cliente atual, retornando valores padrão');
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
      console.log('🟢 MetricsService: calculateAggregatedMetrics - Primeira métrica:', filteredMetrics[0]);
      console.log(`🟢 MetricsService: calculateAggregatedMetrics - Leads na primeira métrica: ${filteredMetrics[0].leads}`);
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
      totalAppointments: 0,
      totalSales: 0
    });

    console.log(`🟢 MetricsService: calculateAggregatedMetrics - Total de leads calculado: ${totals.totalLeads}`);

    // Seguir a mesma regra dos cards: usar soma global de linkClicks se > 0; senão, usar cliques normais
    const chosenTotalClicks = sumLinkClicksDebug > 0 ? sumLinkClicksDebug : sumClicksAllDebug;
    // Atualizar totalClicks para refletir a decisão global
    try { totals.totalClicks = chosenTotalClicks; } catch {}

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
      console.log('[PlanilhaDiag] aggregateClicks', {
        metricsCount: filteredMetrics.length,
        hasLinkClicksFieldIn: countWithLinkClicksField,
        sumLinkClicks: sumLinkClicksDebug,
        sumClicksAll: sumClicksAllDebug,
        chosenTotalClicks,
        totalImpressions: totals.totalImpressions,
        totalInvestment: totals.totalInvestment,
        avgCTR,
        avgCPC
      });
    } catch {}

    return {
      ...totals,
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
    productLabel?: string,
    clientLabel?: string
  ) {
    // Primeiro, calcular normalmente (Firestore)
    const base = this.calculateAggregatedMetrics(metrics);

    // Se já temos clicks/impressões consistentes, manter
    // Observação: mantemos apenas para referência futura; não usados diretamente

    // Padrão dos cards: usar link_clicks agregados quando disponíveis.
    // Se não houver link_clicks em nenhum doc (sumLinkClicks==0 no cálculo base),
    // e tivermos campanha selecionada, consultar os insights da campanha e somar link_clicks.
    const campaignId = (typeof localStorage !== 'undefined' ? (localStorage.getItem('selectedCampaignId') || '') : '') as string;
    if (!campaignId) {
      try { console.log('[PlanilhaDiag] metaFallback SKIP - campaignId ausente'); } catch {}
      return base;
    }

    // Derivar período do mês a partir do label (ex.: "Agosto 2025")
    const getMonthDateRange = (label: string | undefined) => {
      if (!label) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
      }
      const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      const [name, yearStr] = (label || '').split(' ');
      const year = parseInt(yearStr || '', 10) || new Date().getFullYear();
      const monthIndex = Math.max(0, months.indexOf(name));
      const start = new Date(year, monthIndex, 1);
      const end = new Date(year, monthIndex + 1, 0);
      return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    };

    const { startDate, endDate } = getMonthDateRange(monthLabel);

    try {
      // Consultar insights da campanha no período do mês
      const insights = await metaAdsService.getCampaignInsights(campaignId, startDate, endDate);
      let sumSpend = 0;
      let sumImpr = 0;
      let sumClicksAll = 0;
      let sumLinkClicks = 0;

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
        }
      }

      // Decisão dos cards: se soma de link_clicks > 0, usar; senão, cair para clicks normais
      const chosenTotalClicks = sumLinkClicks > 0 ? sumLinkClicks : sumClicksAll;

      // Se Firestore já tinha clicks/impressões, mas divergindo, preferir Meta Ads (fonte de verdade) para planilha
      const totalClicks = chosenTotalClicks > 0 ? chosenTotalClicks : base.totalClicks;
      const totalImpressions = sumImpr > 0 ? sumImpr : base.totalImpressions;
      const totalInvestment = sumSpend > 0 ? sumSpend : base.totalInvestment;

      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCPM = totalImpressions > 0 ? (totalInvestment / totalImpressions) * 1000 : 0;
      const avgCPC = totalClicks > 0 ? (totalInvestment / totalClicks) : 0;

      try {
        console.log('[PlanilhaDiag] metaFallback', {
          month: monthLabel,
          client: clientLabel,
          product: productLabel,
          campaignId,
          startDate,
          endDate,
          sumSpend,
          sumImpr,
          sumClicksAll,
          sumLinkClicks,
          chosenTotalClicks,
          final: { totalInvestment, totalImpressions, totalClicks, avgCTR, avgCPC }
        });
      } catch {}

      return {
        ...base,
        totalInvestment,
        totalImpressions,
        totalClicks,
        avgCTR: Number(avgCTR.toFixed(2)),
        avgCPM: Number(avgCPM.toFixed(2)),
        avgCPC: Number(avgCPC.toFixed(2))
      };
    } catch (err) {
      try { console.warn('[PlanilhaDiag] metaFallback erro - mantendo agregados Firestore', (err as any)?.message || err); } catch {}
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
      console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Iniciando salvamento:', {
        month: data.month,
        product: data.product,
        audience: data.audience,
        agendamentos: data.agendamentos,
        vendas: data.vendas,
        vendasAuto: data.vendasAuto,
        manualVendasValue: data.manualVendasValue
      });

      const docId = this.sanitizeDocumentId(`${data.month}_${data.product}_${data.audience}`);
      console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Document ID:', docId);
      
      const docRef = doc(db, 'audienceDetails', docId);

      const docSnap = await getDoc(docRef);
      console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Documento existe:', docSnap.exists());

      if (docSnap.exists()) {
        console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Atualizando documento existente');
        await updateDoc(docRef, {
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          ticketMedio: data.ticketMedio || 250,
          vendasAuto: data.vendasAuto !== undefined ? data.vendasAuto : true, // Save the mode
          manualVendasValue: data.manualVendasValue !== undefined ? data.manualVendasValue : 0, // Save manual value
          updatedAt: new Date()
        });
        console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Detalhes do público atualizados com sucesso:', data);
      } else {
        console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Criando novo documento');
        await setDoc(docRef, {
          ...data,
          ticketMedio: data.ticketMedio || 250,
          vendasAuto: data.vendasAuto !== undefined ? data.vendasAuto : true, // Save the mode
          manualVendasValue: data.manualVendasValue !== undefined ? data.manualVendasValue : 0, // Save manual value
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Novos detalhes do público salvos com sucesso:', data);
      }
      
      console.log('🔍 DEBUG - metricsService.saveAudienceDetails - Salvamento concluído com sucesso');
    } catch (error) {
      console.error('🔍 DEBUG - metricsService.saveAudienceDetails - Erro ao salvar detalhes do público:', error);
      throw new Error('Não foi possível salvar os detalhes do público.');
    }
  },

  // Buscar detalhes de um público específico
  async getAudienceDetails(month: string, product: string, audience: string) {
    try {
      console.log('🔍 DEBUG - metricsService.getAudienceDetails - Buscando detalhes:', {
        month,
        product,
        audience
      });

      const docId = this.sanitizeDocumentId(`${month}_${product}_${audience}`);
      console.log('🔍 DEBUG - metricsService.getAudienceDetails - Document ID:', docId);
      
      const docRef = doc(db, 'audienceDetails', docId);
      const docSnap = await getDoc(docRef);
      
      console.log('🔍 DEBUG - metricsService.getAudienceDetails - Documento existe:', docSnap.exists());
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log('🔍 DEBUG - metricsService.getAudienceDetails - Dados encontrados:', data);
        return data;
      } else {
        console.log('🔍 DEBUG - metricsService.getAudienceDetails - Nenhum dado encontrado');
        return null;
      }
    } catch (error) {
      console.error('🔍 DEBUG - metricsService.getAudienceDetails - Erro ao buscar detalhes do público:', error);
      return null;
    }
  },

  // Buscar todos os dados de públicos de um produto específico
  async getAllAudienceDetailsForProduct(month: string, product: string) {
    try {
      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );
      
      const querySnapshot = await getDocs(q);
      const audienceMap = new Map(); // Para consolidar duplicatas
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const audienceKey = data.audience;
        
        // 🎯 CORREÇÃO: Garantir que valores sejam números válidos
        const agendamentosValue = Number(data.agendamentos) || 0;
        const vendasValue = Number(data.vendas) || 0;
        
        console.log('🔴 DEBUG - getAllAudienceDetailsForProduct - PROCESSANDO DOCUMENTO do Firebase:', {
          docId: doc.id,
          audience: audienceKey,
          agendamentos: agendamentosValue,
          vendas: vendasValue,
          agendamentosOriginal: data.agendamentos,
          vendasOriginal: data.vendas,
          updatedAt: data.updatedAt,
          createdAt: data.createdAt,
          month: data.month,
          product: data.product,
          allData: data
        });
        
        // Se já existe um registro para este público, manter o mais recente
        if (audienceMap.has(audienceKey)) {
          const existing = audienceMap.get(audienceKey);
          const existingDate = existing.updatedAt?.toDate?.() || existing.createdAt?.toDate?.() || new Date(0);
          const newDate = data.updatedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date(0);
          
          console.log('🔍 DEBUG - getAllAudienceDetailsForProduct - Duplicata encontrada:', {
            audience: audienceKey,
            existingDate,
            newDate,
            existingValues: { agendamentos: existing.agendamentos, vendas: existing.vendas },
            newValues: { agendamentos: agendamentosValue, vendas: vendasValue },
            keeping: newDate > existingDate ? 'new' : 'existing'
          });
          
          if (newDate > existingDate) {
            audienceMap.set(audienceKey, {
              ...data,
              agendamentos: agendamentosValue,
              vendas: vendasValue
            });
          }
        } else {
          audienceMap.set(audienceKey, {
            ...data,
            agendamentos: agendamentosValue,
            vendas: vendasValue
          });
        }
      });
      
      // Converter Map para array
      const consolidatedDetails = Array.from(audienceMap.values());
      
      // 🎯 CORREÇÃO: Calcular totais para debug
      const totalAgendamentos = consolidatedDetails.reduce((sum, d) => sum + (d.agendamentos || 0), 0);
      const totalVendas = consolidatedDetails.reduce((sum, d) => sum + (d.vendas || 0), 0);

      console.log('🔴 DEBUG - getAllAudienceDetailsForProduct - RESULTADO FINAL CONSOLIDADO:', {
        month,
        product,
        originalCount: querySnapshot.size,
        consolidatedCount: consolidatedDetails.length,
        totalAgendamentos,
        totalVendas,
        timestamp: new Date().toISOString(),
        details: consolidatedDetails.map(d => ({
          audience: d.audience,
          agendamentos: d.agendamentos,
          vendas: d.vendas,
          updatedAt: d.updatedAt,
          docId: d.docId
        }))
      });
      
      return consolidatedDetails;
    } catch (error) {
      console.error('Erro ao buscar todos os detalhes de públicos:', error);
      return [];
    }
  },

  // 🎯 FUNÇÃO DE DEBUG: Verificar todos os dados de um produto/período específico
  async debugAudienceData(month: string, product: string) {
    try {
      console.log('🔍 DEBUG - debugAudienceData - Iniciando debug completo:', { month, product });
      
      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );
      
      const querySnapshot = await getDocs(q);
      const allDocuments: any[] = [];
      
      console.log('🔍 DEBUG - debugAudienceData - Total de documentos encontrados:', querySnapshot.size);
      
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
        
        console.log('🔍 DEBUG - debugAudienceData - Documento:', docData);
      });
      
      // Agrupar por público para ver duplicatas
      const groupedByAudience = allDocuments.reduce((groups, doc) => {
        const key = doc.audience;
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
        return groups;
      }, {});
      
      console.log('🔍 DEBUG - debugAudienceData - Agrupado por público:', groupedByAudience);
      
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
      
      console.log('🔍 DEBUG - debugAudienceData - Resultado completo:', debugResult);
      
      return debugResult;
    } catch (error) {
      console.error('🔍 DEBUG - debugAudienceData - Erro:', error);
      return { error };
    }
  },

  // 🎯 FUNÇÃO DEFINITIVA: Limpar TODOS os dados de um produto/período e forçar recálculo
  async resetProductData(month: string, product: string) {
    try {
      console.log('🧹 DEBUG - resetProductData - Iniciando reset completo:', { month, product });
      
      // 1. Buscar TODOS os documentos para o produto/período
      const q = query(
        collection(db, 'audienceDetails'),
        where('month', '==', month),
        where('product', '==', product)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('🧹 DEBUG - resetProductData - Documentos encontrados:', querySnapshot.size);
      
      // 2. Deletar TODOS os documentos
      const batch = writeBatch(db);
      let deletedCount = 0;
      
      querySnapshot.forEach((doc) => {
        console.log('🧹 DEBUG - resetProductData - Marcando para deletar:', {
          docId: doc.id,
          data: doc.data()
        });
        batch.delete(doc.ref);
        deletedCount++;
      });
      
      if (deletedCount > 0) {
        await batch.commit();
        console.log('🧹 DEBUG - resetProductData - Documentos deletados:', deletedCount);
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
        } catch (e) {}
      });
      
      console.log('🧹 DEBUG - resetProductData - Reset completo concluído:', {
        month,
        product,
        deletedCount,
        cacheCleared: true,
        localStorageCleared: true
      });
      
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
      console.log('🧹 DEBUG - cleanupZeroValueRecords - Iniciando limpeza:', { month, product });
      
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
          console.log('🧹 DEBUG - cleanupZeroValueRecords - Marcando para deletar:', {
            docId: doc.id,
            audience: data.audience,
            agendamentos,
            vendas
          });
          batch.delete(doc.ref);
          deletedCount++;
        }
      });
      
      if (deletedCount > 0) {
        await batch.commit();
        console.log('🧹 DEBUG - cleanupZeroValueRecords - Limpeza concluída:', {
          month,
          product,
          deletedCount
        });
      } else {
        console.log('🧹 DEBUG - cleanupZeroValueRecords - Nenhum registro para deletar');
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
      console.log('🔧 DEBUG - cleanupDuplicateAudienceDetails - Iniciando limpeza:', { month, product });
      
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
      
      console.log('🔧 DEBUG - cleanupDuplicateAudienceDetails - Documentos para deletar:', documentsToDelete);
      
      // Deletar documentos duplicados
      for (const docId of documentsToDelete) {
        const docRef = doc(db, 'audienceDetails', docId);
        await deleteDoc(docRef);
        console.log('🔧 DEBUG - cleanupDuplicateAudienceDetails - Documento deletado:', docId);
      }
      
      console.log('🔧 DEBUG - cleanupDuplicateAudienceDetails - Limpeza concluída. Documentos deletados:', documentsToDelete.length);
      return documentsToDelete.length;
    } catch (error) {
      console.error('Erro ao limpar dados duplicados:', error);
      throw new Error('Não foi possível limpar os dados duplicados.');
    }
  },

  // Buscar valores reais de agendamentos e vendas de todos os produtos de um cliente
  async getRealValuesForClient(month: string, client: string) {
    try {
      console.log('🔍 DEBUG - getRealValuesForClient - Buscando valores reais para:', { month, client });
      console.log('🎯 CARD DEBUG - getRealValuesForClient - INICIANDO busca de valores reais para os cards');
      
      // Primeiro, buscar dados da coleção monthlyDetails (dados reais da planilha)
      // CORREÇÃO: Filtrar por mês E cliente para evitar dados de outros clientes
      const monthlyDetailsQuery = query(
        collection(db, 'monthlyDetails'),
        where('month', '==', month),
        where('client', '==', client) // Adicionar filtro por cliente
      );
      
      const monthlyDetailsSnapshot = await getDocs(monthlyDetailsQuery);
      console.log('🔍 DEBUG - getRealValuesForClient - MonthlyDetails encontrados:', monthlyDetailsSnapshot.size);
      console.log('🎯 CARD DEBUG - getRealValuesForClient - Query para monthlyDetails:', {
        month,
        client,
        collectionName: 'monthlyDetails',
        documentsFound: monthlyDetailsSnapshot.size
      });
      
      let totalAgendamentos = 0;
      let totalVendas = 0;
      let totalCPV = 0;
      let roiValues: string[] = []; // Array para armazenar valores de ROI como strings
      let productCount = 0;
      const productsWithData: string[] = [];
      
      // CORREÇÃO: Filtrar dados apenas do cliente específico
      monthlyDetailsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // CORREÇÃO: Verificar se o documento pertence ao cliente correto
        // Agora que temos filtro por client, todos os documentos são do cliente correto
        console.log('🔍 DEBUG - getRealValuesForClient - MonthlyDetail:', {
          product: data.product,
          client: data.client,
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          cpv: data.cpv,
          roi: data.roi,
          ticketMedio: data.ticketMedio
        });
        
        // 🎯 CARD DEBUG: Log detalhado do documento
        console.log('🎯 CARD DEBUG - getRealValuesForClient - Documento detalhado:', {
          docId: doc.id,
          product: data.product,
          agendamentosValue: data.agendamentos,
          agendamentosType: typeof data.agendamentos,
          vendasValue: data.vendas,
          vendasType: typeof data.vendas,
          cpvValue: data.cpv,
          roiValue: data.roi,
          allData: data
        });
        
        // Somar valores de todos os produtos
        totalAgendamentos += (data.agendamentos || 0);
        totalVendas += (data.vendas || 0);
        totalCPV += (data.cpv || 0);
        
        // Coletar valores de ROI como strings
        if (data.roi && typeof data.roi === 'string') {
          roiValues.push(data.roi);
        }
        
        productCount++;
        productsWithData.push(data.product);
        
        console.log('🔍 DEBUG - getRealValuesForClient - Acumuladores após produto:', {
          totalAgendamentos,
          totalVendas,
          totalCPV,
          roiValues,
          productCount
        });
      });
      
      // CORREÇÃO: Se não há DOCUMENTOS para este cliente/mês, retornar valores zerados
      // MAS se há documentos, mesmo com valores zero, devemos processá-los
      if (productCount === 0) {
        console.log('🔍 DEBUG - getRealValuesForClient - Nenhum documento encontrado para cliente/mês, retornando valores zerados');
        console.log('🎯 CARD DEBUG - getRealValuesForClient - SAINDO PRECOCEMENTE - sem documentos:', {
          totalAgendamentos,
          totalVendas,
          productCount,
          monthlyDetailsFound: monthlyDetailsSnapshot.size
        });
        return {
          agendamentos: 0,
          vendas: 0,
          cpv: 0,
          roi: '0% (0.0x)'
        };
      }
      
      console.log('🎯 CARD DEBUG - getRealValuesForClient - PROSSEGUINDO com processamento:', {
        totalAgendamentos,
        totalVendas,
        productCount,
        monthlyDetailsFound: monthlyDetailsSnapshot.size
      });
      
      // 🎯 CORREÇÃO UNIVERSAL: Calcular ROI/ROAS para os cards SEMPRE que há vendas
      if (totalVendas > 0) {
        console.log('🎯 CARD DEBUG - getRealValuesForClient - CALCULANDO ROI/ROAS universalmente (dados encontrados)...');
        
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
            console.log('🎯 CARD DEBUG - getRealValuesForClient - ✅ CPV universal calculado:', cpvCalculado);
          }
          
          // Calcular ROI/ROAS para os cards
          const receitaTotal = totalVendas * ticketMedio;
          const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
          const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
          const calculatedROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
          
          (this as any).calculatedROIForCards = calculatedROI;
          
          console.log('🎯 CARD DEBUG - getRealValuesForClient - ✅ ROI/ROAS universal calculado:', {
            totalVendas,
            ticketMedio,
            receitaTotal,
            investimentoTotal,
            roiPercent,
            roas,
            calculatedROI
          });
          
        } catch (roiError) {
          console.error('🎯 CARD DEBUG - getRealValuesForClient - Erro no cálculo universal de ROI/ROAS:', roiError);
        }
      }
      
      // 🎯 CARD DEBUG: Se monthlyDetails está zerado, verificar audienceDetails
      if (totalAgendamentos === 0 && totalVendas === 0) {
        console.log('🎯 CARD DEBUG - getRealValuesForClient - monthlyDetails zerado, verificando audienceDetails...');
        
        try {
          // Buscar todos os produtos do cliente no mês atual
          // CORREÇÃO: audienceDetails não tem campo 'client', precisamos buscar por month e filtrar por product
          const audienceDetailsQuery = query(
            collection(db, 'audienceDetails'),
            where('month', '==', month)
          );
          
          const audienceSnapshot = await getDocs(audienceDetailsQuery);
          console.log('🎯 CARD DEBUG - getRealValuesForClient - audienceDetails encontrados:', audienceSnapshot.size);
          
          // Obter lista de produtos do cliente para filtrar audienceDetails
          const clientProducts = new Set<string>();
          monthlyDetailsSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.product) {
              clientProducts.add(data.product);
            }
          });
          
          console.log('🎯 CARD DEBUG - getRealValuesForClient - Produtos do cliente:', Array.from(clientProducts));
          
          let audienceAgendamentos = 0;
          let audienceVendas = 0;
          
          audienceSnapshot.forEach((doc) => {
            const data = doc.data();
            
            // CORREÇÃO: Filtrar apenas produtos que pertencem ao cliente
            if (clientProducts.has(data.product)) {
              console.log('🎯 CARD DEBUG - getRealValuesForClient - audienceDetail VÁLIDO:', {
                docId: doc.id,
                product: data.product,
                audience: data.audience,
                agendamentos: data.agendamentos,
                vendas: data.vendas
              });
              
              audienceAgendamentos += (data.agendamentos || 0);
              audienceVendas += (data.vendas || 0);
            } else {
              console.log('🎯 CARD DEBUG - getRealValuesForClient - audienceDetail IGNORADO (produto não pertence ao cliente):', {
                docId: doc.id,
                product: data.product,
                audience: data.audience
              });
            }
          });
          
          console.log('🎯 CARD DEBUG - getRealValuesForClient - Totais de audienceDetails:', {
            audienceAgendamentos,
            audienceVendas
          });
          
          // Se encontramos dados em audienceDetails, usar eles
          if (audienceAgendamentos > 0 || audienceVendas > 0) {
            totalAgendamentos = audienceAgendamentos;
            totalVendas = audienceVendas;
            console.log('🎯 CARD DEBUG - getRealValuesForClient - USANDO dados de audienceDetails:', {
              totalAgendamentos,
              totalVendas
            });
            
            // 🎯 CORREÇÃO ROI/ROAS: Calcular ROI/ROAS diretamente usando dados da planilha
            console.log('🎯 CARD DEBUG - getRealValuesForClient - Calculando ROI/ROAS para os cards...');
            console.log('🎯 CARD DEBUG - getRealValuesForClient - Condições iniciais:', {
              totalVendas,
              totalAgendamentos,
              audienceAgendamentos,
              audienceVendas
            });
            
            try {
              // Buscar investimento total das métricas do Meta Ads para este cliente
              console.log('🎯 CARD DEBUG - getRealValuesForClient - Buscando métricas do Meta Ads...');
              const metrics = await this.getMetrics(month, client);
              let investimentoTotal = 0;
              
              console.log('🎯 CARD DEBUG - getRealValuesForClient - Métricas encontradas:', {
                metricsFound: metrics?.length || 0,
                metricsArray: metrics ? metrics.slice(0, 2) : null // mostrar apenas primeiros 2 para não poluir logs
              });
              
              if (metrics && metrics.length > 0) {
                const clientMetrics = metrics.filter(metric => metric.client === client);
                investimentoTotal = clientMetrics.reduce((sum, metric) => sum + (metric.investment || 0), 0);
                
                console.log('🎯 CARD DEBUG - getRealValuesForClient - Investimento calculado:', {
                  totalMetrics: metrics.length,
                  clientMetrics: clientMetrics.length,
                  investimentoTotal
                });
              } else {
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ❌ Nenhuma métrica encontrada!');
              }
              
              // Buscar ticket médio da planilha detalhes mensais
              let ticketMedio = 250; // valor padrão
              console.log('🎯 CARD DEBUG - getRealValuesForClient - Buscando ticket médio...', {
                monthlyDetailsSize: monthlyDetailsSnapshot.size
              });
              
              if (monthlyDetailsSnapshot.size > 0) {
                // Usar o ticket médio do primeiro produto encontrado
                const firstDoc = monthlyDetailsSnapshot.docs[0];
                const firstData = firstDoc.data();
                
                console.log('🎯 CARD DEBUG - getRealValuesForClient - Dados do primeiro documento:', {
                  ticketMedioField: firstData.ticketMedio,
                  ticketMedioType: typeof firstData.ticketMedio,
                  allFields: Object.keys(firstData)
                });
                
                if (firstData.ticketMedio && firstData.ticketMedio > 0) {
                  ticketMedio = firstData.ticketMedio;
                }
              }
              
              console.log('🎯 CARD DEBUG - getRealValuesForClient - Ticket médio final:', ticketMedio);
              
              // Calcular CPV para os cards
              if (totalVendas > 0 && investimentoTotal > 0) {
                const cpvCalculado = investimentoTotal / totalVendas;
                
                console.log('🎯 CARD DEBUG - getRealValuesForClient - CPV calculado para cards:', {
                  investimentoTotal,
                  totalVendas,
                  cpvCalculado
                });
                
                // 🎯 CORREÇÃO: Armazenar o CPV calculado para usar no resultado final
                (this as any).calculatedCPVForCards = cpvCalculado;
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ✅ CPV armazenado para os cards:', cpvCalculado);
              }
              
              // Calcular ROI/ROAS para os cards
              console.log('🎯 CARD DEBUG - getRealValuesForClient - Verificando condições para ROI/ROAS:', {
                totalVendas,
                totalVendasMaiorQueZero: totalVendas > 0,
                investimentoTotal,
                ticketMedio
              });
              
              if (totalVendas > 0) {
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ✅ Condição totalVendas > 0 APROVADA');
                
                const receitaTotal = totalVendas * ticketMedio;
                const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
                const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
                const calculatedROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
                
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ROI/ROAS calculado para cards:', {
                  totalVendas,
                  ticketMedio,
                  receitaTotal,
                  investimentoTotal,
                  roiPercent,
                  roas,
                  calculatedROI
                });
                
                // 🎯 CORREÇÃO: Armazenar o ROI calculado para usar no resultado final
                (this as any).calculatedROIForCards = calculatedROI;
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ✅ ROI armazenado para os cards:', calculatedROI);
              } else {
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ❌ Condição totalVendas > 0 FALHOU');
                console.log('🎯 CARD DEBUG - getRealValuesForClient - ❌ ROI/ROAS NÃO será calculado');
              }
            } catch (roiError) {
              console.error('🎯 CARD DEBUG - getRealValuesForClient - Erro ao calcular ROI/ROAS:', roiError);
            }
            
            // CORREÇÃO AUTOMÁTICA: Se audienceDetails tem dados mas monthlyDetails não,
            // criar/atualizar monthlyDetails automaticamente
            console.log('🎯 CARD DEBUG - getRealValuesForClient - Sincronizando audienceDetails → monthlyDetails');
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
                  console.log('🎯 CARD DEBUG - getRealValuesForClient - Atualizando monthlyDetails para produto:', {
                    product,
                    agendamentos: productAgendamentos,
                    vendas: productVendas
                  });
                  
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
            console.log('🔍 DEBUG - getRealValuesForClient - Investimento total das métricas do cliente:', investimentoTotal);
          } else {
            console.log('🔍 DEBUG - getRealValuesForClient - Nenhuma métrica encontrada para o cliente específico');
            investimentoTotal = 0;
          }
        } else {
          console.log('🔍 DEBUG - getRealValuesForClient - Nenhuma métrica encontrada');
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
        console.log('🔍 DEBUG - getRealValuesForClient - CPV calculado:', {
          investimentoTotal,
          totalVendas,
          finalCPV
        });
      }
      
      // CORREÇÃO: Se não há dados reais da planilha, zerar CPV
      if (totalAgendamentos === 0 && totalVendas === 0) {
        finalCPV = 0;
        console.log('🔍 DEBUG - getRealValuesForClient - Nenhum dado real, zerando CPV');
      }
      
      // Processar ROI - usar o primeiro valor válido ou calcular baseado nos dados
      let finalROI = '0% (0.0x)';
      console.log('🎯 CARD DEBUG - getRealValuesForClient - Iniciando processamento de ROI (segunda parte):', {
        roiValuesLength: roiValues.length,
        roiValues,
        finalROIInicial: finalROI
      });
      
      if (roiValues.length > 0) {
        // Verificar se o valor salvo é válido (não é -100% quando há vendas)
        const savedROI = roiValues[0];
        console.log('🎯 CARD DEBUG - getRealValuesForClient - ROI salvo encontrado:', savedROI);
        if (savedROI === '-100% (0.0x)' && totalVendas > 0) {
          // Se o ROI salvo é -100% mas há vendas, recalcular
          console.log('🔍 DEBUG - getRealValuesForClient - ROI salvo inválido, recalculando...');
          const ticketMedio = 250; // Valor padrão
          const receitaTotal = totalVendas * ticketMedio;
          const investimentoTotal = finalCPV * totalVendas;
          const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
          const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
          finalROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
          console.log('🔍 DEBUG - getRealValuesForClient - ROI recalculado:', {
            ticketMedio,
            receitaTotal,
            investimentoTotal,
            roiPercent,
            roas,
            finalROI
          });
        } else {
          // Usar o valor salvo se for válido
          console.log('🎯 CARD DEBUG - getRealValuesForClient - ⚠️ SOBRESCREVENDO finalROI com valor salvo!', {
            finalROIAnterior: finalROI,
            savedROI,
            finalROIDepois: savedROI
          });
          finalROI = savedROI;
          console.log('🔍 DEBUG - getRealValuesForClient - ROI usando valor salvo:', finalROI);
        }
      } else if (totalVendas > 0 && finalCPV > 0) {
        // Calcular ROI baseado nos dados se não houver valor salvo
        console.log('🎯 CARD DEBUG - getRealValuesForClient - ⚠️ ENTRANDO em else if para calcular ROI (segunda parte):', {
          totalVendas,
          finalCPV,
          condicaoTotalVendas: totalVendas > 0,
          condicaoFinalCPV: finalCPV > 0
        });
        
        const ticketMedio = 250; // Valor padrão
        const receitaTotal = totalVendas * ticketMedio;
        const investimentoTotal = finalCPV * totalVendas;
        const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
        const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
        
        console.log('🎯 CARD DEBUG - getRealValuesForClient - ⚠️ SOBRESCREVENDO finalROI na segunda parte!', {
          finalROIAnterior: finalROI,
          novoFinalROI: `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`
        });
        
        finalROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
        console.log('🔍 DEBUG - getRealValuesForClient - ROI calculado:', {
          ticketMedio,
          receitaTotal,
          investimentoTotal,
          roiPercent,
          roas,
          finalROI
        });
      } else {
        console.log('🎯 CARD DEBUG - getRealValuesForClient - ❌ NÃO entrou em nenhuma condição de cálculo de ROI (segunda parte):', {
          roiValuesLength: roiValues.length,
          totalVendas,
          finalCPV,
          finalROI
        });
      }
      
      // CORREÇÃO: Se não há dados reais da planilha, zerar ROI
      if (totalAgendamentos === 0 && totalVendas === 0) {
        console.log('🎯 CARD DEBUG - getRealValuesForClient - ⚠️ ZERANDO finalROI por falta de dados!', {
          totalAgendamentos,
          totalVendas,
          finalROIAnterior: finalROI,
          finalROIDepois: '0% (0.0x)'
        });
        finalROI = '0% (0.0x)';
        console.log('🔍 DEBUG - getRealValuesForClient - Nenhum dado real, zerando ROI');
      }
      
      console.log('🔍 DEBUG - getRealValuesForClient - Cálculo das médias:', {
        totalCPV,
        roiValues,
        productCount,
        avgCPV,
        finalCPV,
        finalROI,
        investimentoTotal
      });
      
      console.log('🔍 DEBUG - getRealValuesForClient - Resultado da monthlyDetails:', {
        month,
        client,
        totalAgendamentos,
        totalVendas,
        finalCPV,
        finalROI,
        productsCount: productsWithData.length,
        products: productsWithData
      });
      
      // CORREÇÃO: Remover fallback para audienceDetails pois pode causar persistência de dados incorretos
      // Se não há dados na monthlyDetails, significa que o cliente não tem dados para este mês
      
      // 🎯 CORREÇÃO: Usar valores calculados para os cards quando disponíveis
      const cardCPV = (this as any).calculatedCPVForCards || finalCPV;
      const cardROI = (this as any).calculatedROIForCards || finalROI;
      
      console.log('🎯 CARD DEBUG - getRealValuesForClient - Escolhendo valores finais:', {
        finalCPV,
        calculatedCPVForCards: (this as any).calculatedCPVForCards,
        cardCPVFinal: cardCPV,
        finalROI,
        calculatedROIForCards: (this as any).calculatedROIForCards,
        cardROIFinal: cardROI
      });
      
      const result = {
        agendamentos: totalAgendamentos,
        vendas: totalVendas,
        cpv: cardCPV, // Retornar o CPV calculado para cards ou salvo
        roi: cardROI // Retornar o ROI calculado para cards ou formatado
      };
      
      console.log('🎯 CARD DEBUG - getRealValuesForClient - Resultado sendo criado:', {
        totalAgendamentos,
        totalVendas,
        cardCPV,
        cardROI,
        resultObject: result
      });
      
      // Limpar variáveis temporárias
      delete (this as any).calculatedCPVForCards;
      delete (this as any).calculatedROIForCards;
      
      console.log('🔍 DEBUG - getRealValuesForClient - Retornando resultado:', result);
      console.log('🎯 CARD DEBUG - getRealValuesForClient - RESULTADO FINAL para os cards:', {
        agendamentos: result.agendamentos,
        vendas: result.vendas,
        cpv: result.cpv,
        roi: result.roi
      });
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar valores reais do cliente:', error);
      return { agendamentos: 0, vendas: 0, cpv: 0, roi: '0% (0.0x)' };
    }
  },

  // Função para verificar se há dados em outros meses para o cliente
  async checkClientDataInOtherMonths(client: string) {
    try {
      console.log('🔍 DEBUG - checkClientDataInOtherMonths - Verificando dados para cliente:', client);
      
      // Verificar na coleção monthlyDetails primeiro - filtrar por cliente
      const monthlyDetailsQuery = query(
        collection(db, 'monthlyDetails'),
        where('client', '==', client)
      );
      const monthlyDetailsSnapshot = await getDocs(monthlyDetailsQuery);
      const monthsWithData: string[] = [];
      
      monthlyDetailsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.month && !monthsWithData.includes(data.month)) {
          monthsWithData.push(data.month);
        }
      });
      
      console.log('🔍 DEBUG - checkClientDataInOtherMonths - Meses com dados em monthlyDetails para cliente:', monthsWithData);
      
      // Se não há dados em monthlyDetails, verificar audienceDetails
      if (monthsWithData.length === 0) {
        console.log('🔍 DEBUG - checkClientDataInOtherMonths - Nenhum dado em monthlyDetails, verificando audienceDetails...');
        
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
        
        console.log('🔍 DEBUG - checkClientDataInOtherMonths - Meses com dados em audienceDetails:', monthsWithData);
      }
      
      return monthsWithData;
    } catch (error) {
      console.error('Erro ao verificar dados do cliente em outros meses:', error);
      return [];
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
      } catch {}

      let q = query(metricsRef, where('client', '==', client));
      const snapshot = await getDocs(q);
      

      // Helpers de datas (mês pt-BR)
      const monthsPt = [
        'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
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
      console.log('🔍 DEBUG - debugMonthlyDetails - Verificando dados para mês:', month);
      
      const q = query(
        collection(db, 'monthlyDetails'),
        where('month', '==', month)
      );
      const querySnapshot = await getDocs(q);
      
      console.log('🔍 DEBUG - debugMonthlyDetails - Total de documentos encontrados para o mês:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('🔍 DEBUG - debugMonthlyDetails - Documento:', {
          id: doc.id,
          month: data.month,
          product: data.product,
          client: data.client,
          agendamentos: data.agendamentos,
          vendas: data.vendas
        });
      });
      
      return querySnapshot.size;
    } catch (error) {
      console.error('Erro ao verificar monthlyDetails:', error);
      return 0;
    }
  },



  // Função para criar dados de teste (temporária)
  async createTestDataForClient(client: string, month: string) {
    try {
      console.log('🔧 DEBUG - createTestDataForClient - Criando dados de teste para:', { client, month });
      
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
        console.log('🔧 DEBUG - createTestDataForClient - Dados criados:', docId);
      }
      
      console.log('🔧 DEBUG - createTestDataForClient - Dados de teste criados com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao criar dados de teste:', error);
      return false;
    }
  },

  // 🎯 NOVA FUNÇÃO: Reset do rate limit da API do Meta Ads
  resetApiRateLimit(): void {
    try {
      console.log('🔄 DEBUG - metricsService.resetApiRateLimit - Chamando resetApiRateLimit do metaAdsService');
      metaAdsService.resetApiRateLimit();
      console.log('✅ API rate limit resetado com sucesso!');
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
  }

};

// 🎯 EXPOSER FUNÇÕES DE RATE LIMIT GLOBALMENTE PARA DEBUG
(window as any).resetApiRateLimit = metricsService.resetApiRateLimit;
(window as any).getApiRateLimitStatus = metricsService.getApiRateLimitStatus;

console.log('🔧 DEBUG - Funções de rate limit expostas globalmente:');
console.log('  - resetApiRateLimit() - Reseta o rate limit da API do Meta Ads');
console.log('  - getApiRateLimitStatus() - Verifica status do rate limit da API');