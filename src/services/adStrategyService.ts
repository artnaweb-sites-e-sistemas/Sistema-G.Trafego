import { metaAdsService } from './metaAdsService';
import { db } from '../config/firebase';
import { authService } from './authService';
import { collection, addDoc, setDoc, doc, deleteDoc, getDocs, query, where, orderBy } from 'firebase/firestore';

export interface AdStrategy {
  id: string;
  product: {
    name: string;
    niche: string;
    type: 'online' | 'fisico';
    objective: 'trafico' | 'mensagens' | 'compras' | 'captura_leads';
  };
  audience: {
    gender: 'homem' | 'mulher' | 'ambos';
    ageRange: string;
    locations: string[];
    interests: string[];
    remarketing: string[]; // Novo campo para remarketing
    scaleType?: 'vertical' | 'horizontal' | null;
  };
  budget: {
    planned: number;
    current: number;
  };
  generatedNames: {
    product: string;
    audience: string;
  };
  client: string;
  month: string;
  createdAt: Date;
  isSynchronized: boolean;
  firebaseId?: string; // opcional, não usado na UI
}

class AdStrategyService {
  private storageKey = 'adStrategies';
  private hydrated = false;

  private getUserCollection() {
    const user = authService.getCurrentUser();
    if (!user) return null;
    return collection(db, 'users', user.uid, 'adStrategies');
  }

  private async saveRemote(strategy: AdStrategy): Promise<string | undefined> {
    try {
      const col = this.getUserCollection();
      if (!col) return undefined;
      if (strategy.firebaseId) {
        await setDoc(doc(col, strategy.firebaseId), strategy, { merge: true });
        return strategy.firebaseId;
      }
      const ref = await addDoc(col, strategy as any);
      return ref.id;
    } catch {
      return undefined;
    }
  }

  private async deleteRemote(firebaseId?: string): Promise<void> {
    try {
      const col = this.getUserCollection();
      if (!col || !firebaseId) return;
      await deleteDoc(doc(col, firebaseId));
    } catch {
      // ignore
    }
  }

  // Utilitário para admin/inspector: sincroniza todas estratégias locais para Firestore
  async syncLocalStrategiesToFirestore(): Promise<{ synced: number; failed: number }> {
    const local = this.getAllStrategies();
    let synced = 0;
    let failed = 0;
    for (const s of local) {
      try {
        const fid = await this.saveRemote(s);
        if (fid && s.firebaseId !== fid) {
          s.firebaseId = fid;
        }
        synced++;
      } catch {
        failed++;
      }
    }
    // Atualiza cache local com possíveis firebaseIds recebidos
    localStorage.setItem(this.storageKey, JSON.stringify(local));
    return { synced, failed };
  }

  // Salvar estratégia no Firestore (primário) + atualizar cache local
  saveStrategy(strategy: AdStrategy): void {
    try {
      // Persistência primária
      this.saveRemote(strategy).then((fid) => {
        const existingStrategies = this.getAllStrategies();
        const withId = fid ? { ...strategy, firebaseId: fid } : strategy;
        const updatedStrategies = [...existingStrategies, withId];
        // Atualiza cache local (somente leitura futura; UI continua igual)
        localStorage.setItem(this.storageKey, JSON.stringify(updatedStrategies));
      });
    } catch (error) {
      console.error('Erro ao salvar estratégia:', error);
    }
  }

  // Buscar todas as estratégias
  getAllStrategies(): AdStrategy[] {
    try {
      const strategies = localStorage.getItem(this.storageKey);
      return strategies ? JSON.parse(strategies) : [];
    } catch (error) {
      console.error('Erro ao buscar estratégias:', error);
      return [];
    }
  }

  // Buscar estratégias por cliente (local)
  getStrategiesByClient(client: string): AdStrategy[] {
    const allStrategies = this.getAllStrategies();
    return allStrategies.filter(strategy => strategy.client === client);
  }

  // Buscar estratégias por cliente e mês (Firestore-first com cache local)
  async getStrategiesByClientAndMonth(client: string, month: string): Promise<AdStrategy[]> {
    // 1) Remoto – fonte de verdade
    try {
      console.time(`adStrategyService.getStrategiesByClientAndMonth ${client}/${month}`);
      const user = authService.getCurrentUser();
      if (!user) throw new Error('Usuário não autenticado');
      console.log('🔍 DEBUG - adStrategyService - getStrategiesByClientAndMonth - User UID:', user.uid);
      console.log('🔍 DEBUG - adStrategyService - getStrategiesByClientAndMonth - Filtros:', { client, month });
      const col = collection(db, 'users', user.uid, 'adStrategies');
      const q = query(col, where('client', '==', client), where('month', '==', month), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      console.log('🔍 DEBUG - adStrategyService - getStrategiesByClientAndMonth - Docs encontrados:', snap.size);
      const docIds: string[] = [];
      const remote: AdStrategy[] = snap.docs.map(d => {
        const data: any = d.data();
        docIds.push(d.id);
        return {
          id: data.id,
          product: data.product,
          audience: data.audience,
          budget: data.budget,
          generatedNames: data.generatedNames,
          client: data.client,
          month: data.month,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          isSynchronized: !!data.isSynchronized,
          firebaseId: d.id
        };
      });
      console.log('🔍 DEBUG - adStrategyService - getStrategiesByClientAndMonth - IDs:', docIds);

      // Atualizar cache local com o remoto (fonte de verdade)
      const existing = this.getAllStrategies();
      const byId = new Map(existing.map(s => [s.id, s]));
      for (const m of remote) byId.set(m.id, m);
      localStorage.setItem(this.storageKey, JSON.stringify(Array.from(byId.values())));
      console.timeEnd(`adStrategyService.getStrategiesByClientAndMonth ${client}/${month}`);
      return remote;
    } catch {
      // 2) Fallback: devolver cache local se offline
      console.warn('⚠️ DEBUG - adStrategyService - getStrategiesByClientAndMonth - Falha remota, usando cache local');
      const allStrategies = this.getAllStrategies();
      return allStrategies.filter(s => s.client === client && s.month === month);
    }
  }

  // Remover estratégia
  removeStrategy(strategyId: string): void {
    try {
      const existingStrategies = this.getAllStrategies();
      const target = existingStrategies.find(s => s.id === strategyId);
      const updatedStrategies = existingStrategies.filter(strategy => strategy.id !== strategyId);
      localStorage.setItem(this.storageKey, JSON.stringify(updatedStrategies));
      // Remoção remota best-effort
      this.deleteRemote(target?.firebaseId);
    } catch (error) {
      console.error('Erro ao remover estratégia:', error);
    }
  }

  // Atualizar estratégia
  updateStrategy(updatedStrategy: AdStrategy): void {
    try {
      const existingStrategies = this.getAllStrategies();
      const updatedStrategies = existingStrategies.map(strategy => 
        strategy.id === updatedStrategy.id ? updatedStrategy : strategy
      );
      localStorage.setItem(this.storageKey, JSON.stringify(updatedStrategies));
      // Atualização remota best-effort
      this.saveRemote(updatedStrategy);
    } catch (error) {
      console.error('Erro ao atualizar estratégia:', error);
    }
  }

  // Buscar valor investido atual do público no Meta Ads
  async getCurrentInvestmentForAudience(audienceName: string, client: string, month: string): Promise<number> {
    try {
      if (!metaAdsService.isLoggedIn()) {
        console.warn('Meta Ads não está conectado');
        return 0;
      }

      // Converter mês para datas de início e fim
      const monthParts = month.split(' ');
      const monthName = monthParts[0];
      const year = parseInt(monthParts[1]);
      
      const monthIndex = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ].indexOf(monthName);
      
      if (monthIndex === -1) {
        console.warn('Mês inválido:', month);
        return 0;
      }

      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${new Date(year, monthIndex + 1, 0).getDate()}`;

      // Buscar dados do Meta Ads para o período
      const metrics = await metaAdsService.syncMetrics(month, startDate, endDate, undefined, client);
      
      // Filtrar por público que corresponde ao nome da estratégia
      const audienceMetrics = metrics.filter(metric => {
        // Verificar se o nome do público contém elementos da estratégia
        const metricName = metric.name?.toLowerCase() || '';
        const strategyAudienceName = audienceName.toLowerCase();
        
        // Buscar por correspondências parciais
        return metricName.includes(strategyAudienceName) || 
               strategyAudienceName.includes(metricName) ||
               this.namesMatch(metricName, strategyAudienceName);
      });

      if (audienceMetrics.length === 0) {
        console.log(`Nenhum público encontrado para: ${audienceName}`);
        return 0;
      }

      // Calcular valor total investido
      const totalInvestment = audienceMetrics.reduce((total, metric) => {
        return total + (metric.spend || 0);
      }, 0);

      console.log(`Valor investido encontrado para ${audienceName}: R$ ${totalInvestment}`);
      return totalInvestment;

    } catch (error) {
      console.error('Erro ao buscar valor investido:', error);
      return 0;
    }
  }

  // Função auxiliar para comparar nomes de públicos
  private namesMatch(metaAdsName: string, strategyName: string): boolean {
    // Normalizar nomes removendo caracteres especiais e espaços extras
    const normalize = (name: string) => name
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const normalizedMetaAds = normalize(metaAdsName);
    const normalizedStrategy = normalize(strategyName);

    // Verificar se há palavras em comum
    const metaAdsWords = normalizedMetaAds.split(' ');
    const strategyWords = normalizedStrategy.split(' ');

    const commonWords = metaAdsWords.filter(word => 
      strategyWords.includes(word) && word.length > 2
    );

    return commonWords.length >= 1; // Pelo menos uma palavra em comum
  }

  // Gerar nomes automáticos para produto e público
  generateNames(strategy: Partial<AdStrategy>): { product: string; audience: string } {
    if (!strategy.product?.name || !strategy.product?.niche || !strategy.product?.objective) {
      return { product: '', audience: '' };
    }

    // Gerar nome do produto
    const objectiveLabels = {
      trafico: 'tráfego',
      mensagens: 'conversão por mensagem',
      compras: 'conversão por compra'
    };

    const typeLabels = {
      online: 'online',
      fisico: 'presencial'
    };

    const productName = `[${strategy.product.name} ${typeLabels[strategy.product.type as keyof typeof typeLabels]}] [${strategy.product.niche}] [${objectiveLabels[strategy.product.objective as keyof typeof objectiveLabels]}]`;

    // Gerar nome do público
    const genderLabels = {
      homem: 'homens',
      mulher: 'mulheres',
      ambos: 'pessoas'
    };

    // Construir a nomenclatura do público
    const gender = genderLabels[strategy.audience?.gender as keyof typeof genderLabels] || 'pessoas';
    const ageRange = strategy.audience?.ageRange || 'faixa etária';
    const locations = strategy.audience?.locations?.join(', ') || 'localização';
    const interests = strategy.audience?.interests || [];

    // Construir a nomenclatura do público com interesses
    let audienceName = `[${gender}] [${ageRange}] [${locations}]`;
    
    // Adicionar interesses ou "aberto" se não há interesses
    if (interests.length > 0) {
      audienceName += ` [${interests.join(', ')}]`;
    } else {
      audienceName += ` [aberto]`;
    }

    return { product: productName, audience: audienceName };
  }

  // Criar nova estratégia
  async createStrategy(strategyData: Omit<AdStrategy, 'id' | 'createdAt' | 'budget' | 'isSynchronized'> & { budget: { planned: number; current?: number } }): Promise<AdStrategy> {
    const strategy: AdStrategy = {
      ...strategyData,
      id: Date.now().toString(),
      createdAt: new Date(),
      budget: {
        planned: strategyData.budget.planned,
        current: strategyData.budget.current || 0
      },
      isSynchronized: false
    };

    // Se não foi fornecido valor atual, tentar buscar do Meta Ads
    if (!strategyData.budget.current) {
      const generatedNames = this.generateNames(strategy);
      const currentInvestment = await this.getCurrentInvestmentForAudience(
        generatedNames.audience,
        strategy.client,
        strategy.month
      );
      strategy.budget.current = currentInvestment;
      
      // Verificar se conseguiu sincronizar (valor > 0 significa que encontrou dados)
      strategy.isSynchronized = currentInvestment > 0;
    } else {
      // Se foi fornecido valor manual, considerar como sincronizado
      strategy.isSynchronized = true;
    }

    this.saveStrategy(strategy);
    return strategy;
  }

  // Atualizar valor investido atual de uma estratégia
  async updateCurrentInvestment(strategyId: string): Promise<number> {
    const strategy = this.getAllStrategies().find(s => s.id === strategyId);
    if (!strategy) {
      throw new Error('Estratégia não encontrada');
    }

    const currentInvestment = await this.getCurrentInvestmentForAudience(
      strategy.generatedNames.audience,
      strategy.client,
      strategy.month
    );

    const updatedStrategy = {
      ...strategy,
      budget: {
        ...strategy.budget,
        current: currentInvestment
      },
      isSynchronized: currentInvestment > 0
    };

    this.updateStrategy(updatedStrategy);
    return currentInvestment;
  }

  // Limpar estratégias antigas (mais de 30 dias)
  cleanupOldStrategies(): void {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const allStrategies = this.getAllStrategies();
      const recentStrategies = allStrategies.filter(strategy => 
        new Date(strategy.createdAt) > thirtyDaysAgo
      );

      localStorage.setItem(this.storageKey, JSON.stringify(recentStrategies));
    } catch (error) {
      console.error('Erro ao limpar estratégias antigas:', error);
    }
  }
}

export const adStrategyService = new AdStrategyService();
