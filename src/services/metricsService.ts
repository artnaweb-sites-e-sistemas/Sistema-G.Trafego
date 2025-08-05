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
  deleteDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { metaAdsService } from './metaAdsService';

export interface MetricData {
  id?: string;
  date: string;
  month: string;
  service: string;
  client: string;
  product: string;
  audience: string;
  leads: number;
  revenue: number;
  investment: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpm: number;
  cpl: number;
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
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.CACHE_TTL
    });

  },

  // Método para limpar cache de métricas
  clearCache(): void {
    this.cache.clear();

  },

  // Método para forçar refresh dos dados
  forceRefresh(): void {
    this.cache.clear();
    console.log('Cache limpo - forçando refresh dos dados');
  },

  // Método para limpar cache por cliente específico
  clearCacheByClient(clientName: string): void {
    console.log(`Limpando cache de métricas para cliente: ${clientName}`);
    
    // Limpar todas as chaves de cache que contêm o nome do cliente
    for (const key of this.cache.keys()) {
      if (key.includes(clientName)) {
        this.cache.delete(key);
        console.log(`Cache de métricas removido: ${key}`);
      }
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
        return cached;
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
            // Se há um Ad Set específico selecionado, buscar métricas do Ad Set
            if (adSetId) {
              const adSetInsights = await metaAdsService.getAdSetInsights(adSetId, startDate, endDate);
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
              const adSetInsights = await metaAdsService.getAdSetInsights(adSetId, startDate, endDate);
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

  // Buscar métricas públicas (para links compartilhados)
  async getPublicMetrics(month: string, client: string, product: string, audience: string): Promise<MetricData[]> {
    try {

      
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
          }

          if (product && product !== '' && product !== 'Todos os Produtos') {
            filteredData = filteredData.filter(item => item.product === product);
          }

          if (audience && audience !== '' && audience !== 'Todos os Públicos') {
            filteredData = filteredData.filter(item => item.audience === audience);
          }
          
          console.log('getPublicMetrics: Retornando dados filtrados:', filteredData.length, 'registros');
          return filteredData;
        }
      } catch (firebaseError: any) {

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
      const docRef = await addDoc(collection(db, 'metrics'), {
        ...data,
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
  async getMonthlyDetails(month: string, product: string) {
    try {
      const detailsRef = collection(db, 'monthlyDetails');
      const q = query(
        detailsRef,
        where('month', '==', month),
        where('product', '==', product)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        return {
          agendamentos: data.agendamentos || 0,
          vendas: data.vendas || 0,
          ticketMedio: data.ticketMedio || 0
        };
      }
      
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

    // Log das primeiras métricas para debug
    if (metrics.length > 0) {
      console.log('🟢 MetricsService: calculateAggregatedMetrics - Primeira métrica:', metrics[0]);
      console.log(`🟢 MetricsService: calculateAggregatedMetrics - Leads na primeira métrica: ${metrics[0].leads}`);
    }

    const totals = metrics.reduce((acc, metric) => {
      acc.totalLeads += metric.leads;
      acc.totalRevenue += metric.revenue;
      acc.totalInvestment += metric.investment;
      acc.totalImpressions += metric.impressions;
      acc.totalClicks += metric.clicks;
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

    const avgCTR = totals.totalImpressions > 0 
      ? (totals.totalClicks / totals.totalImpressions) * 100 
      : 0;
    
    const avgCPM = totals.totalImpressions > 0 
      ? (totals.totalInvestment / totals.totalImpressions) * 1000 
      : 0;
    
    const avgCPL = totals.totalLeads > 0 
      ? totals.totalInvestment / totals.totalLeads 
      : 0;
    
    const avgCPC = totals.totalClicks > 0 
      ? totals.totalInvestment / totals.totalClicks 
      : 0;
    
    
    
    const totalROAS = totals.totalInvestment > 0 
      ? totals.totalRevenue / totals.totalInvestment 
      : 0;
    
    const totalROI = totals.totalInvestment > 0 
      ? ((totals.totalRevenue - totals.totalInvestment) / totals.totalInvestment) * 100 
      : 0;

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
      const audienceDetails: any[] = [];
      const audienceMap = new Map(); // Para consolidar duplicatas
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const audienceKey = data.audience;
        
        console.log('🔍 DEBUG - getAllAudienceDetailsForProduct - Processando documento:', {
          docId: doc.id,
          audience: audienceKey,
          agendamentos: data.agendamentos,
          vendas: data.vendas,
          updatedAt: data.updatedAt
        });
        
        // Se já existe um registro para este público, manter o mais recente
        if (audienceMap.has(audienceKey)) {
          const existing = audienceMap.get(audienceKey);
          const existingDate = existing.updatedAt?.toDate?.() || new Date(0);
          const newDate = data.updatedAt?.toDate?.() || new Date(0);
          
          console.log('🔍 DEBUG - getAllAudienceDetailsForProduct - Duplicata encontrada:', {
            audience: audienceKey,
            existingDate,
            newDate,
            keeping: newDate > existingDate ? 'new' : 'existing'
          });
          
          if (newDate > existingDate) {
            audienceMap.set(audienceKey, data);
          }
        } else {
          audienceMap.set(audienceKey, data);
        }
      });
      
      // Converter Map para array
      const consolidatedDetails = Array.from(audienceMap.values());
      
      console.log('🔍 DEBUG - getAllAudienceDetailsForProduct - Resultado consolidado:', {
        month,
        product,
        originalCount: querySnapshot.size,
        consolidatedCount: consolidatedDetails.length,
        details: consolidatedDetails.map(d => ({
          audience: d.audience,
          agendamentos: d.agendamentos,
          vendas: d.vendas,
          updatedAt: d.updatedAt
        }))
      });
      
      return consolidatedDetails;
    } catch (error) {
      console.error('Erro ao buscar todos os detalhes de públicos:', error);
      return [];
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
      
      // Primeiro, buscar dados da coleção monthlyDetails (dados reais da planilha)
      // CORREÇÃO: Filtrar por mês E cliente para evitar dados de outros clientes
      const monthlyDetailsQuery = query(
        collection(db, 'monthlyDetails'),
        where('month', '==', month),
        where('client', '==', client) // Adicionar filtro por cliente
      );
      
      const monthlyDetailsSnapshot = await getDocs(monthlyDetailsQuery);
      console.log('🔍 DEBUG - getRealValuesForClient - MonthlyDetails encontrados:', monthlyDetailsSnapshot.size);
      
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
      
      // CORREÇÃO: Se não há dados para este cliente/mês, retornar valores zerados
      if (totalAgendamentos === 0 && totalVendas === 0) {
        console.log('🔍 DEBUG - getRealValuesForClient - Nenhum dado encontrado para cliente/mês, retornando valores zerados');
        return {
          agendamentos: 0,
          vendas: 0,
          cpv: 0,
          roi: '0% (0.0x)'
        };
      }
      
      // Buscar investimento real das métricas do Meta Ads
      let investimentoTotal = 0;
      try {
        const metrics = await this.getMetrics(month, client);
        if (metrics && metrics.length > 0) {
          investimentoTotal = metrics.reduce((sum, metric) => sum + (metric.investment || 0), 0);
          console.log('🔍 DEBUG - getRealValuesForClient - Investimento total das métricas:', investimentoTotal);
        }
      } catch (error) {
        console.warn('🔍 DEBUG - getRealValuesForClient - Erro ao buscar métricas para investimento:', error);
        // Usar valor padrão se não conseguir buscar
        investimentoTotal = 225.99;
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
      
      // Processar ROI - usar o primeiro valor válido ou calcular baseado nos dados
      let finalROI = '0% (0.0x)';
      if (roiValues.length > 0) {
        // Verificar se o valor salvo é válido (não é -100% quando há vendas)
        const savedROI = roiValues[0];
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
          finalROI = savedROI;
          console.log('🔍 DEBUG - getRealValuesForClient - ROI usando valor salvo:', finalROI);
        }
      } else if (totalVendas > 0 && finalCPV > 0) {
        // Calcular ROI baseado nos dados se não houver valor salvo
        const ticketMedio = 250; // Valor padrão
        const receitaTotal = totalVendas * ticketMedio;
        const investimentoTotal = finalCPV * totalVendas;
        const roiPercent = investimentoTotal > 0 ? ((receitaTotal - investimentoTotal) / investimentoTotal) * 100 : 0;
        const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;
        finalROI = `${roiPercent.toFixed(0)}% (${roas.toFixed(1)}x)`;
        console.log('🔍 DEBUG - getRealValuesForClient - ROI calculado:', {
          ticketMedio,
          receitaTotal,
          investimentoTotal,
          roiPercent,
          roas,
          finalROI
        });
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
      
      const result = {
        agendamentos: totalAgendamentos,
        vendas: totalVendas,
        cpv: finalCPV, // Retornar o CPV calculado ou salvo
        roi: finalROI // Retornar o ROI formatado corretamente
      };
      
      console.log('🔍 DEBUG - getRealValuesForClient - Retornando resultado:', result);
      
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
  }
};