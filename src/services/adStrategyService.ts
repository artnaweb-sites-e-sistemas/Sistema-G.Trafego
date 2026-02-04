import { metaAdsService } from './metaAdsService';
import { firestoreStrategyService } from './firestoreStrategyService';
import { authService } from './authService';

import { AdStrategy } from '../types/ad-strategy';

export type { AdStrategy };


class AdStrategyService {
  private storageKey = 'adStrategies';

  private isUserAuthenticated(): boolean {
    const user = authService.getCurrentUser();
    return !!user?.uid;
  }

  async saveStrategy(strategy: AdStrategy): Promise<void> {
    console.log('🔍 [ADSTRATEGY] saveStrategy chamado:', {
      id: strategy.id,
      hasRemarketing: !!(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3),
      remarketingCount: [strategy.remarketing1, strategy.remarketing2, strategy.remarketing3].filter(Boolean).length
    });

    const existing = this.getLocalStrategies();
    const updated = [...existing.filter(s => s.id !== strategy.id), strategy];
    localStorage.setItem(this.storageKey, JSON.stringify(updated));

    console.log('🔍 [ADSTRATEGY] Estratégia salva no localStorage');

    if (this.isUserAuthenticated()) {
      try {
        console.log('🔍 [ADSTRATEGY] Salvando no Firestore...');
        await firestoreStrategyService.saveStrategy(strategy);
        console.log('🔍 [ADSTRATEGY] Estratégia salva no Firestore com sucesso');
      } catch (error) {
        console.error('🔍 [ADSTRATEGY] Erro ao salvar no Firestore:', error);
      }
    }
  }

  async getAllStrategies(): Promise<AdStrategy[]> {
    if (this.isUserAuthenticated()) {
      try {
        const remote = await firestoreStrategyService.getAllStrategies();
        if (remote?.length) {
          // 🎯 CORREÇÃO AVANÇADA: Mesclar estratégias com mesmo ID
          const strategyMap = new Map<string, AdStrategy>();

          remote.forEach(strategy => {
            const existing = strategyMap.get(strategy.id);
            if (existing) {
              const merged = this.mergeStrategies(existing, strategy);
              strategyMap.set(strategy.id, merged);
            } else {
              strategyMap.set(strategy.id, strategy);
            }
          });

          return Array.from(strategyMap.values());
        }
      } catch { }
    }
    const localStrategies = this.getLocalStrategies();
    // 🎯 CORREÇÃO: Mesclar também duplicatas do localStorage
    const localStrategyMap = new Map<string, AdStrategy>();
    localStrategies.forEach(strategy => {
      const existing = localStrategyMap.get(strategy.id);
      if (existing) {
        const merged = this.mergeStrategies(existing, strategy);
        localStrategyMap.set(strategy.id, merged);
      } else {
        localStrategyMap.set(strategy.id, strategy);
      }
    });
    return Array.from(localStrategyMap.values());
  }

  getAllStrategiesSync(): AdStrategy[] {
    const localStrategies = this.getLocalStrategies();
    // 🎯 CORREÇÃO: Mesclar duplicatas do localStorage
    const localStrategyMap = new Map<string, AdStrategy>();
    localStrategies.forEach(strategy => {
      const existing = localStrategyMap.get(strategy.id);
      if (existing) {
        const merged = this.mergeStrategies(existing, strategy);
        localStrategyMap.set(strategy.id, merged);
      } else {
        localStrategyMap.set(strategy.id, strategy);
      }
    });
    return Array.from(localStrategyMap.values());
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
    console.log('🔍 [ADSTRATEGY] getStrategiesByClient chamado:', { client });

    if (this.isUserAuthenticated()) {
      try {
        console.log('🔍 [ADSTRATEGY] Usuário autenticado, buscando do Firestore...');
        const remote = await firestoreStrategyService.getStrategiesByClient(client);
        console.log('🔍 [ADSTRATEGY] Estratégias do Firestore:', remote?.length || 0, 'estratégias');

        if (remote?.length) {
          console.log('🔍 [ADSTRATEGY] IDs das estratégias do Firestore:', remote.map(s => ({
            id: s.id,
            month: s.month,
            hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3)
          })));

          // 🎯 CORREÇÃO: Mesclar estratégias com mesmo ID, mantendo dados mais completos
          const strategyMap = new Map<string, AdStrategy>();

          remote.forEach(strategy => {
            const existing = strategyMap.get(strategy.id);
            if (existing) {
              console.log('🔍 [ADSTRATEGY] DUPLICATA ENCONTRADA! ID:', strategy.id);
              const merged = this.mergeStrategies(existing, strategy);
              strategyMap.set(strategy.id, merged);
            } else {
              strategyMap.set(strategy.id, strategy);
            }
          });

          const result = Array.from(strategyMap.values());
          console.log('🔍 [ADSTRATEGY] Resultado final do Firestore:', result.length, 'estratégias únicas');
          console.log('🔍 [ADSTRATEGY] IDs finais:', result.map(s => ({
            id: s.id,
            month: s.month,
            hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3)
          })));

          return result;
        }
      } catch (error) {
        console.error('🔍 [ADSTRATEGY] Erro ao buscar do Firestore:', error);
      }
    }

    // Fallback para localStorage
    console.log('🔍 [ADSTRATEGY] Usando fallback do localStorage...');
    const localStrategies = this.getAllStrategiesSync().filter(s => s.client === client);
    console.log('🔍 [ADSTRATEGY] Estratégias do localStorage:', localStrategies.length);
    return localStrategies;
  }

  async getStrategiesByClientAndMonth(client: string, month: string): Promise<AdStrategy[]> {
    console.log('🔍 [ADSTRATEGY] getStrategiesByClientAndMonth chamado:', { client, month });

    if (this.isUserAuthenticated()) {
      try {
        console.log('🔍 [ADSTRATEGY] Usuário autenticado, buscando do Firestore...');
        const remote = await firestoreStrategyService.getStrategiesByClientAndMonth(client, month);
        console.log('🔍 [ADSTRATEGY] Estratégias do Firestore:', remote?.length || 0, 'estratégias');

        if (remote?.length) {
          console.log('🔍 [ADSTRATEGY] IDs das estratégias do Firestore:', remote.map(s => ({ id: s.id, hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3) })));

          // 🎯 CORREÇÃO AVANÇADA: Mesclar estratégias com mesmo ID, mantendo dados mais completos
          const strategyMap = new Map<string, AdStrategy>();

          remote.forEach(strategy => {
            const existing = strategyMap.get(strategy.id);
            if (existing) {
              console.log('🔍 [ADSTRATEGY] DUPLICATA ENCONTRADA! ID:', strategy.id);
              console.log('🔍 [ADSTRATEGY] Existing:', { hasRemarketing: !!(existing.remarketing1 || existing.remarketing2 || existing.remarketing3) });
              console.log('🔍 [ADSTRATEGY] New:', { hasRemarketing: !!(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3) });

              // Mesclar estratégias com mesmo ID, priorizando dados mais completos
              const merged = this.mergeStrategies(existing, strategy);
              strategyMap.set(strategy.id, merged);
              console.log('🔍 [ADSTRATEGY] Estratégias mescladas para ID:', strategy.id);
            } else {
              strategyMap.set(strategy.id, strategy);
            }
          });

          const result = Array.from(strategyMap.values());
          console.log('🔍 [ADSTRATEGY] Resultado final do Firestore:', result.length, 'estratégias únicas');
          console.log('🔍 [ADSTRATEGY] IDs finais:', result.map(s => ({ id: s.id, hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3) })));
          return result;
        }
      } catch (error) {
        console.error('🔍 [ADSTRATEGY] Erro ao buscar do Firestore:', error);
      }
    }

    console.log('🔍 [ADSTRATEGY] Buscando do localStorage...');
    const localStrategies = this.getLocalStrategies().filter(s => s.client === client && s.month === month);
    console.log('🔍 [ADSTRATEGY] Estratégias do localStorage:', localStrategies.length, 'estratégias');
    console.log('🔍 [ADSTRATEGY] IDs do localStorage:', localStrategies.map(s => ({ id: s.id, hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3) })));

    // 🎯 CORREÇÃO: Mesclar também duplicatas do localStorage
    const localStrategyMap = new Map<string, AdStrategy>();
    localStrategies.forEach(strategy => {
      const existing = localStrategyMap.get(strategy.id);
      if (existing) {
        console.log('🔍 [ADSTRATEGY] DUPLICATA LOCAL ENCONTRADA! ID:', strategy.id);
        const merged = this.mergeStrategies(existing, strategy);
        localStrategyMap.set(strategy.id, merged);
      } else {
        localStrategyMap.set(strategy.id, strategy);
      }
    });

    const finalResult = Array.from(localStrategyMap.values());
    console.log('🔍 [ADSTRATEGY] Resultado final total:', finalResult.length, 'estratégias');
    console.log('🔍 [ADSTRATEGY] IDs finais totais:', finalResult.map(s => ({ id: s.id, hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3) })));

    return finalResult;
  }

  // 🎯 CORREÇÃO: Função para mesclar estratégias com mesmo ID
  private mergeStrategies(strategy1: AdStrategy, strategy2: AdStrategy): AdStrategy {
    // Priorizar a estratégia mais recente (maior createdAt)
    const primary = strategy1.createdAt > strategy2.createdAt ? strategy1 : strategy2;
    const secondary = strategy1.createdAt > strategy2.createdAt ? strategy2 : strategy1;

    // Mesclar remarketing, mantendo dados mais completos
    const merged: AdStrategy = { ...primary };

    // 🎯 CORREÇÃO: NÃO restaurar conjuntos de remarketing que foram explicitamente deletados
    // Se a estratégia primária (mais recente) não tem um remarketing, não restaurar da secundária
    // Isso evita que conjuntos deletados sejam recriados automaticamente

    // Mesclar remarketing1 apenas se a estratégia primária também tem
    if (primary.remarketing1 && secondary.remarketing1) {
      merged.remarketing1 = this.mergeRemarketing(primary.remarketing1, secondary.remarketing1);
    }
    // Se apenas a secundária tem remarketing1, NÃO restaurar (foi deletado)

    // Mesclar remarketing2 apenas se a estratégia primária também tem
    if (primary.remarketing2 && secondary.remarketing2) {
      merged.remarketing2 = this.mergeRemarketing(primary.remarketing2, secondary.remarketing2);
    }
    // Se apenas a secundária tem remarketing2, NÃO restaurar (foi deletado)

    // Mesclar remarketing3 apenas se a estratégia primária também tem
    if (primary.remarketing3 && secondary.remarketing3) {
      merged.remarketing3 = this.mergeRemarketing(primary.remarketing3, secondary.remarketing3);
    }
    // Se apenas a secundária tem remarketing3, NÃO restaurar (foi deletado)

    return merged;
  }

  // 🎯 NOVA: Função para mesclar dados de remarketing
  private mergeRemarketing(rmkt1: any, rmkt2: any): any {
    // Priorizar dados não vazios
    return {
      audienceName: rmkt1.audienceName || rmkt2.audienceName,
      budget: {
        planned: rmkt1.budget?.planned || rmkt2.budget?.planned || 0,
        current: rmkt1.budget?.current || rmkt2.budget?.current || 0
      },
      keywords: rmkt1.keywords || rmkt2.keywords || '',
      isSynchronized: rmkt1.isSynchronized || rmkt2.isSynchronized || false
    };
  }

  async removeStrategy(strategyId: string): Promise<void> {
    const updated = this.getLocalStrategies().filter(s => s.id !== strategyId);
    localStorage.setItem(this.storageKey, JSON.stringify(updated));
    if (this.isUserAuthenticated()) {
      try {
        await firestoreStrategyService.removeStrategy(strategyId);
      } catch { }
    }
  }

  async updateStrategy(updatedStrategy: AdStrategy): Promise<void> {
    console.log('🔍 [ADSTRATEGY] updateStrategy chamado:', {
      id: updatedStrategy.id,
      hasRemarketing: !!(updatedStrategy.remarketing1 || updatedStrategy.remarketing2 || updatedStrategy.remarketing3),
      remarketingCount: [updatedStrategy.remarketing1, updatedStrategy.remarketing2, updatedStrategy.remarketing3].filter(Boolean).length
    });

    const updated = this.getLocalStrategies().map(s => (s.id === updatedStrategy.id ? updatedStrategy : s));
    localStorage.setItem(this.storageKey, JSON.stringify(updated));

    console.log('🔍 [ADSTRATEGY] Estratégia atualizada no localStorage');

    if (this.isUserAuthenticated()) {
      try {
        console.log('🔍 [ADSTRATEGY] Atualizando no Firestore...');
        await firestoreStrategyService.updateStrategy(updatedStrategy);
        console.log('🔍 [ADSTRATEGY] Estratégia atualizada no Firestore com sucesso');
      } catch (error) {
        console.error('🔍 [ADSTRATEGY] Erro ao atualizar no Firestore:', error);
        throw error; // Re-throw para que o erro seja capturado no componente
      }
    }
  }

  async getCurrentInvestmentForAudience(audienceName: string, client: string, month: string): Promise<number> {
    try {
      if (!metaAdsService.isLoggedIn()) return 0;
      const [monthName, yearStr] = month.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
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
    } catch { }
  }
}

export const adStrategyService = new AdStrategyService();

