import { firestoreStrategyService } from './firestoreStrategyService';
import { firestoreShareService } from './firestoreShareService';
import { firestoreBenchmarkService } from './firestoreBenchmarkService';
import { firestoreDetailsService } from './firestoreDetailsService';
import { authService } from './authService';

interface MigrationResult {
  success: boolean;
  strategiesMigrated: number;
  linksMigrated: number;
  benchmarksMigrated: number;
  detailsMigrated: number;
  totalMigrated: number;
  errors: string[];
}

class MigrationService {
  private static instance: MigrationService;

  private constructor() {}

  public static getInstance(): MigrationService {
    if (!MigrationService.instance) {
      MigrationService.instance = new MigrationService();
    }
    return MigrationService.instance;
  }

  // Verificar se o usuário está autenticado
  private isUserAuthenticated(): boolean {
    const user = authService.getCurrentUser();
    return !!user?.uid;
  }

  // Migração completa de todos os dados do localStorage para Firestore
  async migrateAllData(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      strategiesMigrated: 0,
      linksMigrated: 0,
      benchmarksMigrated: 0,
      detailsMigrated: 0,
      totalMigrated: 0,
      errors: []
    };

    if (!this.isUserAuthenticated()) {
      result.errors.push('Usuário não autenticado');
      return result;
    }

    try {
      // Migrar estratégias
      try {
        result.strategiesMigrated = await firestoreStrategyService.migrateFromLocalStorage();
        } catch (error) {
        const errorMsg = `Erro ao migrar estratégias: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Migrar links de compartilhamento
      try {
        result.linksMigrated = await firestoreShareService.migrateFromLocalStorage();
        } catch (error) {
        const errorMsg = `Erro ao migrar links: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Migrar benchmarks
      try {
        result.benchmarksMigrated = await firestoreBenchmarkService.migrateFromLocalStorage();
        } catch (error) {
        const errorMsg = `Erro ao migrar benchmarks: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Migrar detalhes mensais
      try {
        result.detailsMigrated = await firestoreDetailsService.migrateFromLocalStorage();
        } catch (error) {
        const errorMsg = `Erro ao migrar detalhes mensais: ${error}`;
        console.error(errorMsg);
        result.errors.push(errorMsg);
      }

      // Calcular total
      result.totalMigrated = result.strategiesMigrated + result.linksMigrated + 
                            result.benchmarksMigrated + result.detailsMigrated;

      // Determinar sucesso
      result.success = result.errors.length === 0 || result.totalMigrated > 0;

      if (result.errors.length > 0) {
        console.warn('⚠️ Algumas migrações apresentaram erros:', result.errors);
      }

      return result;
    } catch (error) {
      console.error('❌ Erro durante migração:', error);
      result.errors.push(`Erro geral de migração: ${error}`);
      return result;
    }
  }

  // Migração automática no login
  async autoMigrateOnLogin(): Promise<boolean> {
    if (!this.isUserAuthenticated()) {
      console.warn('Usuário não autenticado - pulando migração automática');
      return false;
    }

    try {
      // Verificar se já foi feita migração (verificando uma flag no localStorage)
      const migrationFlag = localStorage.getItem('firestore_migration_completed');
      if (migrationFlag) {
        return true;
      }

      const result = await this.migrateAllData();

      if (result.success) {
        // Marcar migração como concluída
        localStorage.setItem('firestore_migration_completed', 'true');
        localStorage.setItem('firestore_migration_date', new Date().toISOString());
        return true;
      } else {
        console.warn('⚠️ Migração automática teve problemas:', result.errors);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro durante migração automática:', error);
      return false;
    }
  }

  // Verificar se há dados para migrar
  async hasDataToMigrate(): Promise<boolean> {
    const checks = [
      localStorage.getItem('adStrategies'),
      localStorage.getItem('shareLinks'),
      localStorage.getItem('ai_benchmark_results'),
      localStorage.getItem('monthlyDetails'),
      localStorage.getItem('agendamentos'),
      localStorage.getItem('vendas')
    ];

    return checks.some(item => item && item !== '{}' && item !== '[]');
  }

  // Limpar dados do localStorage após migração bem-sucedida
  async cleanupLocalStorageAfterMigration(): Promise<void> {
    try {
      const keysToClean = [
        'adStrategies',
        'shareLinks',
        'ai_benchmark_results',
        'monthlyDetails',
        'agendamentos',
        'vendas'
      ];

      for (const key of keysToClean) {
        localStorage.removeItem(key);
      }

      } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
  }

  // Forçar nova migração (remover flag)
  resetMigrationFlag(): void {
    localStorage.removeItem('firestore_migration_completed');
    localStorage.removeItem('firestore_migration_date');
    }

  // Obter status da migração
  getMigrationStatus(): { completed: boolean; date?: string } {
    const completed = localStorage.getItem('firestore_migration_completed') === 'true';
    const date = localStorage.getItem('firestore_migration_date');
    
    return {
      completed,
      date: date || undefined
    };
  }
}

export const migrationService = MigrationService.getInstance();
