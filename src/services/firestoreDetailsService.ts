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

interface MonthlyDetails {
  id?: string;
  client: string;
  product: string;
  audience?: string;
  month: string;
  agendamentos: number;
  vendas: number;
  createdAt: Date;
  updatedAt?: Date;
  userId: string;
}

class FirestoreDetailsService {
  private readonly COLLECTION_NAME = 'monthly_details';

  // Garantir que o usuário está autenticado
  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  // Converter para formato Firestore
  private toFirestoreFormat(details: Omit<MonthlyDetails, 'userId'>): MonthlyDetails {
    return {
      ...details,
      createdAt: details.createdAt instanceof Date ? details.createdAt : new Date(),
      updatedAt: details.updatedAt instanceof Date ? details.updatedAt : new Date(),
      userId: this.getCurrentUserId()!
    };
  }

  // Gerar chave única para identificar registro específico
  private generateKey(client: string, product: string, month: string, audience?: string): string {
    const parts = [client, product, month];
    if (audience) parts.push(audience);
    return parts.join('|').toLowerCase().replace(/\s+/g, '_');
  }

  // Salvar/atualizar detalhes mensais
  async saveMonthlyDetails(
    client: string,
    product: string,
    month: string,
    agendamentos: number,
    vendas: number,
    audience?: string
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // Verificar se já existe registro
      const existing = await this.getMonthlyDetails(client, product, month, audience);
      
      if (existing) {
        // Atualizar existente
        await this.updateMonthlyDetails(existing.id!, agendamentos, vendas);
      } else {
        // Criar novo
        const details = this.toFirestoreFormat({
          client,
          product,
          audience,
          month,
          agendamentos,
          vendas,
          createdAt: new Date()
        });

        await addDoc(collection(db, this.COLLECTION_NAME), {
          ...details,
          createdAt: Timestamp.fromDate(details.createdAt),
          updatedAt: Timestamp.fromDate(details.updatedAt!)
        });
      }
      
      console.log('Detalhes mensais salvos no Firestore:', { client, product, month, audience });
    } catch (error) {
      console.error('Erro ao salvar detalhes mensais no Firestore:', error);
      throw error;
    }
  }

  // Buscar detalhes mensais específicos
  async getMonthlyDetails(
    client: string,
    product: string,
    month: string,
    audience?: string
  ): Promise<MonthlyDetails | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      let q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('client', '==', client),
        where('product', '==', product),
        where('month', '==', month)
      );

      if (audience) {
        q = query(q, where('audience', '==', audience));
      }

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      // Pegar o mais recente se houver múltiplos
      const docs = querySnapshot.docs.sort((a, b) => 
        b.data().updatedAt?.toMillis() - a.data().updatedAt?.toMillis()
      );

      const data = docs[0].data();
      return {
        ...data,
        id: docs[0].id,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as MonthlyDetails;
    } catch (error) {
      console.error('Erro ao buscar detalhes mensais do Firestore:', error);
      return null;
    }
  }

  // Atualizar detalhes mensais existentes
  async updateMonthlyDetails(
    id: string,
    agendamentos: number,
    vendas: number
  ): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await updateDoc(docRef, {
        agendamentos,
        vendas,
        updatedAt: Timestamp.now()
      });
      
      console.log('Detalhes mensais atualizados no Firestore:', id);
    } catch (error) {
      console.error('Erro ao atualizar detalhes mensais no Firestore:', error);
      throw error;
    }
  }

  // Buscar todos os detalhes mensais do usuário
  async getAllMonthlyDetails(): Promise<MonthlyDetails[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as MonthlyDetails;
      });
    } catch (error) {
      console.error('Erro ao buscar todos os detalhes mensais do Firestore:', error);
      return [];
    }
  }

  // Buscar detalhes por cliente
  async getMonthlyDetailsByClient(client: string): Promise<MonthlyDetails[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('client', '==', client),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as MonthlyDetails;
      });
    } catch (error) {
      console.error('Erro ao buscar detalhes por cliente do Firestore:', error);
      return [];
    }
  }

  // Remover detalhes mensais
  async removeMonthlyDetails(id: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const docRef = doc(db, this.COLLECTION_NAME, id);
      await deleteDoc(docRef);
      console.log('Detalhes mensais removidos do Firestore:', id);
    } catch (error) {
      console.error('Erro ao remover detalhes mensais do Firestore:', error);
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
      let migratedCount = 0;
      
      // Procurar por diferentes tipos de dados no localStorage
      const localStorageKeys = [
        'monthlyDetails',
        'agendamentos',
        'vendas'
      ];

      for (const key of localStorageKeys) {
        const localData = localStorage.getItem(key);
        if (!localData) continue;

        try {
          const data = JSON.parse(localData);
          
          // Diferentes formatos de dados podem existir
          if (Array.isArray(data)) {
            // Array de detalhes mensais
            for (const item of data) {
              if (item.client && item.product && item.month) {
                const existing = await this.getMonthlyDetails(
                  item.client, 
                  item.product, 
                  item.month, 
                  item.audience
                );

                if (!existing) {
                  await this.saveMonthlyDetails(
                    item.client,
                    item.product,
                    item.month,
                    item.agendamentos || 0,
                    item.vendas || 0,
                    item.audience
                  );
                  migratedCount++;
                }
              }
            }
          } else if (typeof data === 'object') {
            // Objeto com chaves estruturadas
            for (const [storageKey, value] of Object.entries(data)) {
              try {
                // Tentar extrair informações da chave
                const keyParts = storageKey.split('_');
                if (keyParts.length >= 3) {
                  const [client, product, month, ...audienceParts] = keyParts;
                  const audience = audienceParts.length > 0 ? audienceParts.join('_') : undefined;
                  
                  const existing = await this.getMonthlyDetails(client, product, month, audience);
                  
                  if (!existing) {
                    const valueData = value as any;
                    await this.saveMonthlyDetails(
                      client,
                      product,
                      month,
                      valueData.agendamentos || valueData.value || 0,
                      valueData.vendas || 0,
                      audience
                    );
                    migratedCount++;
                  }
                }
              } catch (itemError) {
                console.warn(`Erro ao migrar item ${storageKey}:`, itemError);
              }
            }
          }
        } catch (parseError) {
          console.warn(`Erro ao fazer parse de ${key}:`, parseError);
        }
      }

      console.log(`Migração de detalhes mensais concluída: ${migratedCount} registros migrados`);
      return migratedCount;
    } catch (error) {
      console.error('Erro durante migração de detalhes mensais:', error);
      return 0;
    }
  }

  // Limpar registros antigos (mais de 1 ano)
  async cleanOldDetails(): Promise<number> {
    const userId = this.getCurrentUserId();
    if (!userId) return 0;

    try {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      let cleanedCount = 0;

      for (const docSnapshot of querySnapshot.docs) {
        const data = docSnapshot.data();
        const createdAt = data.createdAt.toDate();
        
        if (createdAt < oneYearAgo) {
          await deleteDoc(docSnapshot.ref);
          cleanedCount++;
        }
      }

      console.log(`Limpeza de detalhes antigos concluída: ${cleanedCount} registros removidos`);
      return cleanedCount;
    } catch (error) {
      console.error('Erro durante limpeza de detalhes:', error);
      return 0;
    }
  }
}

export const firestoreDetailsService = new FirestoreDetailsService();
