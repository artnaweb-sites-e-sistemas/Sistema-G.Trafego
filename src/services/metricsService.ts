import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
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
          console.warn('Erro ao sincronizar Meta Ads, usando dados mockados:', error.message);
          // Continue para usar dados mockados
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
      } catch (firebaseError: any) {
        console.warn('Erro na consulta Firebase (possível problema de índice):', firebaseError.message);
        // Continua para usar dados mockados
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
  async syncMetaAdsData(month: string, campaignId?: string) {
    if (!metaAdsService.isConfigured()) {
      throw new Error('Meta Ads não está configurado. Configure primeiro no painel.');
    }

    try {
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const startDate = firstDayOfMonth.toISOString().split('T')[0];
      const endDate = lastDayOfMonth.toISOString().split('T')[0];
      
      const metaAdsData = await metaAdsService.syncMetrics(month, startDate, endDate, campaignId);
      
      // Salvar no Firebase
      const savedIds = [];
      for (const metric of metaAdsData) {
        try {
          const id = await this.addMetric(metric);
          savedIds.push(id);
        } catch (error) {
          console.error('Erro ao salvar métrica:', error);
        }
      }
      
      return {
        success: true,
        message: `Sincronizados ${savedIds.length} registros do Meta Ads`,
        data: metaAdsData
      };
    } catch (error: any) {
      console.error('Erro na sincronização do Meta Ads:', error);
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

  // Calcular métricas agregadas
  calculateAggregatedMetrics(metrics: MetricData[]) {
    if (metrics.length === 0) {
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

    const avgCTR = totals.totalImpressions > 0 
      ? (totals.totalClicks / totals.totalImpressions) * 100 
      : 0;
    
    const avgCPM = totals.totalImpressions > 0 
      ? (totals.totalInvestment / totals.totalImpressions) * 1000 
      : 0;
    
    const avgCPL = totals.totalLeads > 0 
      ? totals.totalInvestment / totals.totalLeads 
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
      totalROAS: Number(totalROAS.toFixed(2)),
      totalROI: Number(totalROI.toFixed(2))
    };
  }
};