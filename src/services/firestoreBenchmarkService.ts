import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { authService } from './authService';
import { BenchmarkResults } from './aiBenchmarkService';

interface FirestoreBenchmark {
  id?: string;
  productName: string;
  results: BenchmarkResults;
  timestamp: Timestamp;
  clientName?: string;
  month?: string;
  userId: string;
}

class FirestoreBenchmarkService {
  private readonly COLLECTION_NAME = 'ai_benchmarks';

  // Garantir que o usuário está autenticado
  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  // Converter para formato Firestore
  private toFirestoreFormat(
    productName: string, 
    results: BenchmarkResults, 
    clientName?: string, 
    month?: string
  ): FirestoreBenchmark {
    return {
      productName,
      results,
      timestamp: Timestamp.now(),
      clientName,
      month,
      userId: this.getCurrentUserId()!
    };
  }

  // Converter de Firestore
  private fromFirestoreFormat(doc: any): FirestoreBenchmark & { id: string } {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      timestamp: data.timestamp
    };
  }

  // Salvar benchmark no Firestore
  async saveBenchmark(
    productName: string, 
    results: BenchmarkResults, 
    clientName?: string, 
    month?: string
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Verificar se já existe benchmark para este produto/cliente/mês
      const existing = await this.loadBenchmark(productName, clientName, month);
      
      if (existing) {
        // Atualizar existente
        await this.updateBenchmark(productName, results, clientName, month);
      } else {
        // Criar novo
        const benchmarkData = this.toFirestoreFormat(productName, results, clientName, month);
        await addDoc(collection(db, this.COLLECTION_NAME), benchmarkData);
      }
      
      console.log('Benchmark salvo no Firestore:', { productName, clientName, month });
    } catch (error) {
      console.error('Erro ao salvar benchmark no Firestore:', error);
      throw error;
    }
  }

  // Carregar benchmark específico
  async loadBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): Promise<BenchmarkResults | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('productName', '==', productName)
      );

      if (clientName) {
        q = query(q, where('clientName', '==', clientName));
      }

      if (month) {
        q = query(q, where('month', '==', month));
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      // Pegar o mais recente se houver múltiplos
      const docs = querySnapshot.docs.sort((a, b) => 
        b.data().timestamp.toMillis() - a.data().timestamp.toMillis()
      );

      return docs[0].data().results;
    } catch (error) {
      console.error('Erro ao carregar benchmark do Firestore:', error);
      return null;
    }
  }

  // Verificar se existe benchmark
  async hasBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): Promise<boolean> {
    const benchmark = await this.loadBenchmark(productName, clientName, month);
    return benchmark !== null;
  }

  // Atualizar benchmark existente
  async updateBenchmark(
    productName: string, 
    results: BenchmarkResults, 
    clientName?: string, 
    month?: string
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('productName', '==', productName)
      );

      if (clientName) {
        q = query(q, where('clientName', '==', clientName));
      }

      if (month) {
        q = query(q, where('month', '==', month));
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Benchmark não encontrado');
      }

      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, {
        results,
        timestamp: Timestamp.now()
      });
      
      console.log('Benchmark atualizado no Firestore:', { productName, clientName, month });
    } catch (error) {
      console.error('Erro ao atualizar benchmark no Firestore:', error);
      throw error;
    }
  }

  // Remover benchmark
  async removeBenchmark(
    productName: string, 
    clientName?: string, 
    month?: string
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('productName', '==', productName)
      );

      if (clientName) {
        q = query(q, where('clientName', '==', clientName));
      }

      if (month) {
        q = query(q, where('month', '==', month));
      }

      const querySnapshot = await getDocs(q);
      
      for (const docSnapshot of querySnapshot.docs) {
        await deleteDoc(docSnapshot.ref);
      }
      
      console.log('Benchmark(s) removido(s) do Firestore:', { productName, clientName, month });
    } catch (error) {
      console.error('Erro ao remover benchmark do Firestore:', error);
      throw error;
    }
  }

  // Listar todos os benchmarks do usuário
  async listBenchmarks(): Promise<Array<{
    productName: string;
    results: BenchmarkResults;
    timestamp: Date;
    clientName?: string;
    month?: string;
  }>> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          productName: data.productName,
          results: data.results,
          timestamp: data.timestamp.toDate(),
          clientName: data.clientName,
          month: data.month
        };
      });
    } catch (error) {
      console.error('Erro ao listar benchmarks do Firestore:', error);
      return [];
    }
  }

  // Migrar dados do localStorage para o Firestore
  async migrateFromLocalStorage(): Promise<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('Usuário não autenticado - não é possível migrar');
      return 0;
    }

    try {
      const localData = localStorage.getItem('ai_benchmark_results');
      if (!localData) {
        console.log('Nenhum dado de benchmarks encontrado no localStorage');
        return 0;
      }

      const benchmarks = JSON.parse(localData);
      if (!Object.keys(benchmarks).length) {
        console.log('Nenhum benchmark para migrar');
        return 0;
      }

      let migratedCount = 0;
      
      for (const [key, benchmarkData] of Object.entries(benchmarks)) {
        try {
          const data = benchmarkData as any;
          
          // Verificar se já existe no Firestore
          const existing = await this.hasBenchmark(
            data.productName, 
            data.clientName, 
            data.month
          );

          if (!existing) {
            await this.saveBenchmark(
              data.productName,
              data.results,
              data.clientName,
              data.month
            );
            migratedCount++;
          }
        } catch (error) {
          console.error(`Erro ao migrar benchmark ${key}:`, error);
        }
      }

      console.log(`Migração de benchmarks concluída: ${migratedCount} benchmarks migrados`);
      return migratedCount;
    } catch (error) {
      console.error('Erro durante migração de benchmarks:', error);
      return 0;
    }
  }

  // Limpar benchmarks antigos (mais de 90 dias)
  async cleanOldBenchmarks(): Promise<number> {
    const userId = this.getCurrentUserId();
    if (!userId) return 0;

    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      let cleanedCount = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const timestamp = data.timestamp.toDate();
        
        if (timestamp < ninetyDaysAgo) {
          await deleteDoc(docSnapshot.ref);
          cleanedCount++;
        }
      }

      console.log(`Limpeza de benchmarks concluída: ${cleanedCount} benchmarks antigos removidos`);
      return cleanedCount;
    } catch (error) {
      console.error('Erro durante limpeza de benchmarks:', error);
      return 0;
    }
  }

  // Obter estatísticas
  async getStats(): Promise<{ total: number; thisMonth: number; avgConfidence: number }> {
    const userId = this.getCurrentUserId();
    if (!userId) return { total: 0, thisMonth: 0, avgConfidence: 0 };

    try {
      const benchmarks = await this.listBenchmarks();
      const thisMonth = new Date().getMonth();
      const thisYear = new Date().getFullYear();
      
      const thisMonthCount = benchmarks.filter(b => {
        const date = b.timestamp;
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
      console.error('Erro ao obter estatísticas de benchmarks:', error);
      return { total: 0, thisMonth: 0, avgConfidence: 0 };
    }
  }
}

export const firestoreBenchmarkService = new FirestoreBenchmarkService();
