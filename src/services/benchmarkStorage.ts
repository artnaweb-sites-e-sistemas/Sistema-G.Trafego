import { BenchmarkResults } from './aiBenchmarkService';

interface StoredBenchmark {
  productName: string;
  results: BenchmarkResults;
  timestamp: number;
  clientName?: string;
  month?: string;
}

class BenchmarkStorageService {
  private readonly STORAGE_KEY = 'ai_benchmark_results';

  // Salvar benchmark para um produto específico
  saveBenchmark(
    productName: string, 
    results: BenchmarkResults, 
    clientName?: string, 
    month?: string
  ): void {
    try {
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
    } catch (error) {
      console.warn('Erro ao salvar benchmark no localStorage:', error);
    }
  }

  // Carregar benchmark para um produto específico
  loadBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): BenchmarkResults | null {
    try {
      const stored = this.getAllBenchmarks();
      const key = this.generateKey(productName, clientName, month);
      const benchmark = stored[key];

      if (benchmark && this.isValidBenchmark(benchmark)) {
        return benchmark.results;
      }

      return null;
    } catch (error) {
      console.warn('Erro ao carregar benchmark do localStorage:', error);
      return null;
    }
  }

  // Verificar se existe benchmark para um produto
  hasBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): boolean {
    const benchmark = this.loadBenchmark(productName, clientName, month);
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
      console.warn('Erro ao remover benchmark do localStorage:', error);
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
      console.warn('Erro ao listar benchmarks:', error);
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
      console.warn('Erro ao limpar benchmarks antigos:', error);
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
      console.warn('Erro ao calcular estatísticas:', error);
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
      console.warn('Erro ao ler localStorage:', error);
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