import { BenchmarkResults } from './aiBenchmarkService';
import { firestoreBenchmarkService } from './firestoreBenchmarkService';
import { authService } from './authService';

interface StoredBenchmark {
  productName: string;
  results: BenchmarkResults;
  timestamp: number;
  clientName?: string;
  month?: string;
}

class BenchmarkStorageService {
  private readonly STORAGE_KEY = 'ai_benchmark_results';

  // Verificar se o usuário está autenticado
  private isUserAuthenticated(): boolean {
    const user = authService.getCurrentUser();
    return !!user?.uid;
  }

  // Salvar benchmark para um produto específico (localStorage + Firestore)
  async saveBenchmark(
    productName: string, 
    results: BenchmarkResults, 
    clientName?: string, 
    month?: string
  ): Promise<void> {
    try {
      // Salvar no localStorage
      const stored = this.getAllBenchmarks();
      const key = this.generateKey(productName, clientName, month);
      
      stored[key] = {
        productName,
        results,
        timestamp: Date.now(),
        clientName,
        month
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));

      // Se autenticado, salvar também no Firestore
      if (this.isUserAuthenticated()) {
        try {
          await firestoreBenchmarkService.saveBenchmark(productName, results, clientName, month);
          } catch (error) {
          console.error('Erro ao salvar benchmark no Firestore (usando localStorage):', error);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar benchmark:', error);
      throw error;
    }
  }

  // Carregar benchmark para um produto específico (Firestore primeiro, localStorage como fallback)
  async loadBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): Promise<BenchmarkResults | null> {
    // Se autenticado, tentar buscar no Firestore primeiro
    if (this.isUserAuthenticated()) {
      try {
        const firestoreResult = await firestoreBenchmarkService.loadBenchmark(productName, clientName, month);
        if (firestoreResult) {
          return firestoreResult;
        }
      } catch (error) {
        console.error('Erro ao carregar benchmark do Firestore, usando localStorage:', error);
      }
    }

    // Fallback para localStorage
    try {
      const stored = this.getAllBenchmarks();
      const key = this.generateKey(productName, clientName, month);
      const benchmark = stored[key];

      if (benchmark && this.isValidBenchmark(benchmark)) {
        return benchmark.results;
      }

      return null;
    } catch (error) {
      console.error('Erro ao carregar benchmark do localStorage:', error);
      return null;
    }
  }

  // Verificar se existe benchmark para um produto
  async hasBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): Promise<boolean> {
    const benchmark = await this.loadBenchmark(productName, clientName, month);
    return benchmark !== null;
  }

  // Remover benchmark específico
  removeBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): void {
    try {
      const stored = this.getAllBenchmarks();
      const key = this.generateKey(productName, clientName, month);
      
      delete stored[key];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      }
  }

  // Listar todos os benchmarks salvos
  listBenchmarks(): StoredBenchmark[] {
    try {
      const stored = this.getAllBenchmarks();
      return Object.values(stored)
        .filter(this.isValidBenchmark)
        .sort((a, b) => b.timestamp - a.timestamp); // Mais recentes primeiro
    } catch (error) {
      return [];
    }
  }

  // Limpar benchmarks antigos (mais de 30 dias)
  cleanOldBenchmarks(): void {
    try {
      const stored = this.getAllBenchmarks();
      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
      let hasChanges = false;

      Object.keys(stored).forEach(key => {
        if (stored[key].timestamp < thirtyDaysAgo) {
          delete stored[key];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stored));
      }
    } catch (error) {
      }
  }

  // Obter estatísticas de uso
  getStats(): { total: number; thisMonth: number; avgConfidence: number } {
    try {
      const benchmarks = this.listBenchmarks();
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      const thisMonthCount = benchmarks.filter(b => {
        const date = new Date(b.timestamp);
        return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
      }).length;

      const avgConfidence = benchmarks.length > 0 
        ? benchmarks.reduce((sum, b) => sum + b.results.confidence, 0) / benchmarks.length
        : 0;

      return {
        total: benchmarks.length,
        thisMonth: thisMonthCount,
        avgConfidence: Math.round(avgConfidence)
      };
    } catch (error) {
      return { total: 0, thisMonth: 0, avgConfidence: 0 };
    }
  }

  private generateKey(productName: string, clientName?: string, month?: string): string {
    const parts = [productName];
    if (clientName) parts.push(clientName);
    if (month) parts.push(month);
    return parts.join('|').toLowerCase().replace(/\s+/g, '_');
  }

  private getAllBenchmarks(): Record<string, StoredBenchmark> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  private isValidBenchmark(benchmark: any): benchmark is StoredBenchmark {
    return (
      benchmark &&
      typeof benchmark === 'object' &&
      typeof benchmark.productName === 'string' &&
      typeof benchmark.timestamp === 'number' &&
      benchmark.results &&
      typeof benchmark.results.confidence === 'number' &&
      Array.isArray(benchmark.results.insights)
    );
  }
}

export const benchmarkStorage = new BenchmarkStorageService();