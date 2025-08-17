import { metaAdsService } from './metaAdsService';
import { firestoreStrategyService } from './firestoreStrategyService';
import { authService } from './authService';

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
    remarketing: string[];
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
}

class AdStrategyService {
  private storageKey = 'adStrategies';

  private isUserAuthenticated(): boolean {
    const user = authService.getCurrentUser();
    return !!user?.uid;
  }

  async saveStrategy(strategy: AdStrategy): Promise<void> {
    const existing = this.getLocalStrategies();
    const updated = [...existing.filter(s => s.id !== strategy.id), strategy];
    localStorage.setItem(this.storageKey, JSON.stringify(updated));

    if (this.isUserAuthenticated()) {
      try {
        await firestoreStrategyService.saveStrategy(strategy);
      } catch {}
    }
  }

  async getAllStrategies(): Promise<AdStrategy[]> {
    if (this.isUserAuthenticated()) {
      try {
        const remote = await firestoreStrategyService.getAllStrategies();
        if (remote?.length) return remote;
      } catch {}
    }
    return this.getLocalStrategies();
  }

  getAllStrategiesSync(): AdStrategy[] {
    return this.getLocalStrategies();
  }

  private getLocalStrategies(): AdStrategy[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AdStrategy[];
      return parsed.map(s => ({
        ...s,
        createdAt: new Date(s.createdAt),
      }));
    } catch {
      return [];
    }
  }

  async getStrategiesByClient(client: string): Promise<AdStrategy[]> {
    if (this.isUserAuthenticated()) {
      try {
        const remote = await firestoreStrategyService.getStrategiesByClient(client);
        if (remote?.length) return remote;
      } catch {}
    }
    return this.getLocalStrategies().filter(s => s.client === client);
  }

  async getStrategiesByClientAndMonth(client: string, month: string): Promise<AdStrategy[]> {
    if (this.isUserAuthenticated()) {
      try {
        const remote = await firestoreStrategyService.getStrategiesByClientAndMonth(client, month);
        if (remote?.length) return remote;
      } catch {}
    }
    return this.getLocalStrategies().filter(s => s.client === client && s.month === month);
  }

  async removeStrategy(strategyId: string): Promise<void> {
    const updated = this.getLocalStrategies().filter(s => s.id !== strategyId);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    if (this.isUserAuthenticated()) {
      try {
        await firestoreStrategyService.removeStrategy(strategyId);
      } catch {}
    }
  }

  async updateStrategy(updatedStrategy: AdStrategy): Promise<void> {
    const updated = this.getLocalStrategies().map(s => (s.id === updatedStrategy.id ? updatedStrategy : s));
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    if (this.isUserAuthenticated()) {
      try {
        await firestoreStrategyService.updateStrategy(updatedStrategy);
      } catch {}
    }
  }

  async getCurrentInvestmentForAudience(audienceName: string, client: string, month: string): Promise<number> {
    try {
      if (!metaAdsService.isLoggedIn()) return 0;
      const [monthName, yearStr] = month.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = [
        'Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'
      ].indexOf(monthName);
      if (monthIndex === -1 || Number.isNaN(year)) return 0;
      const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${new Date(year, monthIndex + 1, 0).getDate()}`;
      const metrics = await metaAdsService.syncMetrics(month, startDate, endDate, undefined, client);
      const normalizedWanted = audienceName.toLowerCase();
      const audienceMetrics = metrics.filter(m => {
        const n = (m.name || '').toLowerCase();
        return n.includes(normalizedWanted) || normalizedWanted.includes(n) || this.namesMatch(n, normalizedWanted);
      });
      return audienceMetrics.reduce((sum, m) => sum + (m.spend || 0), 0);
    } catch {
      return 0;
    }
  }

  private namesMatch(metaAdsName: string, strategyName: string): boolean {
    const normalize = (v: string) => v.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    const a = normalize(metaAdsName).split(' ');
    const b = normalize(strategyName).split(' ');
    return a.some(w => w.length > 2 && b.includes(w));
  }

  generateNames(strategy: Partial<AdStrategy>): { product: string; audience: string } {
    if (!strategy.product?.name || !strategy.product?.niche || !strategy.product?.objective) {
      return { product: '', audience: '' };
    }
    const objectiveLabels = {
      trafico: 'tráfego',
      mensagens: 'conversão por mensagem',
      compras: 'conversão por compra',
      captura_leads: 'captura de leads',
    } as const;
    const typeLabels = { online: 'online', fisico: 'presencial' } as const;
    const productName = `[${strategy.product.name} ${typeLabels[strategy.product.type!]}] [${strategy.product.niche}] [${objectiveLabels[strategy.product.objective!]}]`;

    const genderLabels = { homem: 'homens', mulher: 'mulheres', ambos: 'pessoas' } as const;
    const gender = genderLabels[(strategy.audience?.gender as keyof typeof genderLabels) || 'ambos'] || 'pessoas';
    const ageRange = strategy.audience?.ageRange || 'faixa etária';
    const locations = strategy.audience?.locations?.join(', ') || 'localização';
    const interests = strategy.audience?.interests || [];

    let audienceName = `[${gender}] [${ageRange}] [${locations}]`;
    audienceName += interests.length > 0 ? ` [${interests.join(', ')}]` : ` [aberto]`;
    return { product: productName, audience: audienceName };
  }

  async createStrategy(
    strategyData: Omit<AdStrategy, 'id' | 'createdAt' | 'budget' | 'isSynchronized'> & { budget: { planned: number; current?: number } },
  ): Promise<AdStrategy> {
    const strategy: AdStrategy = {
      ...strategyData,
      id: Date.now().toString(),
      createdAt: new Date(),
      budget: { planned: strategyData.budget.planned, current: strategyData.budget.current || 0 },
      isSynchronized: false,
    };
    if (!strategyData.budget.current) {
      const generatedNames = this.generateNames(strategy);
      const currentInvestment = await this.getCurrentInvestmentForAudience(
        generatedNames.audience,
        strategy.client,
        strategy.month,
      );
      strategy.budget.current = currentInvestment;
      strategy.isSynchronized = currentInvestment > 0;
    } else {
      strategy.isSynchronized = true;
    }
    await this.saveStrategy(strategy);
    return strategy;
  }

  async updateCurrentInvestment(strategyId: string): Promise<number> {
    const strategies = await this.getAllStrategies();
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) throw new Error('Estratégia não encontrada');
    const currentInvestment = await this.getCurrentInvestmentForAudience(
      strategy.generatedNames.audience,
      strategy.client,
      strategy.month,
    );
    const updated: AdStrategy = {
      ...strategy,
      budget: { ...strategy.budget, current: currentInvestment },
      isSynchronized: currentInvestment > 0,
    };
    await this.updateStrategy(updated);
    return currentInvestment;
  }

  cleanupOldStrategies(): void {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recent = this.getLocalStrategies().filter(s => new Date(s.createdAt) > thirtyDaysAgo);
      localStorage.setItem(this.storageKey, JSON.stringify(recent));
    } catch {}
  }
}

export const adStrategyService = new AdStrategyService();

