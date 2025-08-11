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
  onSnapshot,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { authService } from './authService';
import { AdStrategy } from './adStrategyService';

class FirestoreStrategyService {
  private readonly COLLECTION_NAME = 'ad_strategies';

  // Garantir que o usuário está autenticado
  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  // Converter AdStrategy para formato Firestore
  private toFirestoreFormat(strategy: AdStrategy) {
    return {
      ...strategy,
      createdAt: Timestamp.fromDate(strategy.createdAt),
      userId: this.getCurrentUserId()
    };
  }

  // Converter de Firestore para AdStrategy
  private fromFirestoreFormat(doc: any): AdStrategy {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt.toDate()
    };
  }

  // Salvar estratégia no Firestore
  async saveStrategy(strategy: AdStrategy): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const strategyData = this.toFirestoreFormat(strategy);
      await addDoc(collection(db, this.COLLECTION_NAME), strategyData);
      console.log('Estratégia salva no Firestore:', strategy.id);
    } catch (error) {
      console.error('Erro ao salvar estratégia no Firestore:', error);
      throw error;
    }
  }

  // Buscar todas as estratégias do usuário
  async getAllStrategies(): Promise<AdStrategy[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.fromFirestoreFormat(doc));
    } catch (error) {
      console.error('Erro ao buscar estratégias do Firestore:', error);
      return [];
    }
  }

  // Buscar estratégias por cliente
  async getStrategiesByClient(client: string): Promise<AdStrategy[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('client', '==', client),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.fromFirestoreFormat(doc));
    } catch (error) {
      console.error('Erro ao buscar estratégias por cliente:', error);
      return [];
    }
  }

  // Buscar estratégias por cliente e mês
  async getStrategiesByClientAndMonth(client: string, month: string): Promise<AdStrategy[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('client', '==', client),
        where('month', '==', month),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.fromFirestoreFormat(doc));
    } catch (error) {
      console.error('Erro ao buscar estratégias por cliente e mês:', error);
      return [];
    }
  }

  // Atualizar estratégia
  async updateStrategy(strategy: AdStrategy): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Buscar documento pelo ID da estratégia
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('id', '==', strategy.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Estratégia não encontrada');
      }

      const docRef = querySnapshot.docs[0].ref;
      const strategyData = this.toFirestoreFormat(strategy);
      delete strategyData.userId; // Não atualizar userId
      
      await updateDoc(docRef, strategyData);
      console.log('Estratégia atualizada no Firestore:', strategy.id);
    } catch (error) {
      console.error('Erro ao atualizar estratégia no Firestore:', error);
      throw error;
    }
  }

  // Remover estratégia
  async removeStrategy(strategyId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('id', '==', strategyId)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Estratégia não encontrada');
      }

      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);
      console.log('Estratégia removida do Firestore:', strategyId);
    } catch (error) {
      console.error('Erro ao remover estratégia do Firestore:', error);
      throw error;
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
      // Buscar dados do localStorage
      const localData = localStorage.getItem('adStrategies');
      if (!localData) {
        console.log('Nenhum dado de estratégias encontrado no localStorage');
        return 0;
      }

      const strategies: AdStrategy[] = JSON.parse(localData);
      if (!strategies.length) {
        console.log('Nenhuma estratégia para migrar');
        return 0;
      }

      // Verificar quais estratégias já existem no Firestore
      const existingStrategies = await this.getAllStrategies();
      const existingIds = new Set(existingStrategies.map(s => s.id));

      let migratedCount = 0;
      
      // Migrar apenas estratégias que não existem no Firestore
      for (const strategy of strategies) {
        if (!existingIds.has(strategy.id)) {
          try {
            // Garantir que createdAt seja um objeto Date
            if (typeof strategy.createdAt === 'string') {
              strategy.createdAt = new Date(strategy.createdAt);
            }
            
            await this.saveStrategy(strategy);
            migratedCount++;
          } catch (error) {
            console.error(`Erro ao migrar estratégia ${strategy.id}:`, error);
          }
        }
      }

      console.log(`Migração concluída: ${migratedCount} estratégias migradas`);
      return migratedCount;
    } catch (error) {
      console.error('Erro durante migração de estratégias:', error);
      return 0;
    }
  }

  // Ouvir mudanças em tempo real (opcional)
  subscribeToStrategies(client: string, callback: (strategies: AdStrategy[]) => void): () => void {
    const userId = this.getCurrentUserId();
    if (!userId) {
      console.warn('Usuário não autenticado');
      return () => {};
    }

    const q = query(
      collection(db, this.COLLECTION_NAME),
      where('userId', '==', userId),
      where('client', '==', client),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (querySnapshot) => {
      const strategies = querySnapshot.docs.map(doc => this.fromFirestoreFormat(doc));
      callback(strategies);
    }, (error) => {
      console.error('Erro ao ouvir mudanças em estratégias:', error);
    });
  }
}

export const firestoreStrategyService = new FirestoreStrategyService();
