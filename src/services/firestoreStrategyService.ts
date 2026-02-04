import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  Timestamp,
  setDoc
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
    const firestoreData = {
      ...strategy,
      createdAt: Timestamp.fromDate(strategy.createdAt),
      userId: this.getCurrentUserId()
    };
    
    console.log('🔍 [FIRESTORE] toFirestoreFormat:', {
      strategyId: strategy.id,
      budgetPlanned: strategy.budget.planned,
      remarketing1: !!strategy.remarketing1,
      remarketing2: !!strategy.remarketing2,
      remarketing3: !!strategy.remarketing3,
      remarketing1Budget: strategy.remarketing1?.budget.planned,
      remarketing2Budget: strategy.remarketing2?.budget.planned,
      remarketing3Budget: strategy.remarketing3?.budget.planned,
      budgetItems: strategy.budgetItems?.length || 0
    });
    
    return firestoreData;
  }

  // Converter de Firestore para AdStrategy
  private fromFirestoreFormat(doc: any): AdStrategy {
    const data = doc.data();
    console.log('🔍 [FIRESTORE] fromFirestoreFormat:', { 
      docId: doc.id, 
      strategyId: data.id,
      budgetPlanned: data.budget?.planned,
      hasRemarketing: !!(data.remarketing1 || data.remarketing2 || data.remarketing3),
      remarketing1: !!data.remarketing1,
      remarketing2: !!data.remarketing2,
      remarketing3: !!data.remarketing3,
      remarketing1Budget: data.remarketing1?.budget?.planned,
      remarketing2Budget: data.remarketing2?.budget?.planned,
      remarketing3Budget: data.remarketing3?.budget?.planned,
      budgetItems: data.budgetItems ? data.budgetItems.length : 'undefined'
    });
    
    return {
      ...data,
      id: data.id, // 🎯 CORREÇÃO: Usar o campo 'id' da estratégia, não o docId
      createdAt: data.createdAt.toDate()
    };
  }

  // Salvar estratégia no Firestore (criar ou atualizar)
  async saveStrategy(strategy: AdStrategy): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    console.log('🔍 [FIRESTORE] saveStrategy chamado:', { 
      userId, 
      strategyId: strategy.id,
      hasRemarketing: !!(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3)
    });

    try {
      // Primeiro, tentar encontrar a estratégia existente
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('id', '==', strategy.id)
      );
      
      console.log('🔍 [FIRESTORE] Buscando estratégia existente...');
      const querySnapshot = await getDocs(q);
      
      console.log('🔍 [FIRESTORE] Documentos encontrados com mesmo ID:', querySnapshot.docs.length);
      
      const strategyData = this.toFirestoreFormat(strategy);
      
      if (querySnapshot.empty) {
        // Estratégia não existe, criar nova
        console.log('🔍 [FIRESTORE] Estratégia não existe, criando nova...');
        const docRef = await addDoc(collection(db, this.COLLECTION_NAME), strategyData);
        console.log('🔍 [FIRESTORE] Nova estratégia criada com docId:', docRef.id);
      } else {
        // Estratégia existe, atualizar
        console.log('🔍 [FIRESTORE] Estratégia existe, atualizando...');
        const docRef = querySnapshot.docs[0].ref;
        console.log('🔍 [FIRESTORE] Atualizando documento:', docRef.id);
        delete strategyData.userId; // Não atualizar userId
        await updateDoc(docRef, strategyData);
        console.log('🔍 [FIRESTORE] Estratégia atualizada com sucesso');
      }
      
    } catch (error) {
      console.error('🔍 [FIRESTORE] Erro ao salvar estratégia no Firestore:', error);
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
    } catch (error: any) {
      // Fallback sem índice: buscar só por userId e ordenar no cliente
      if (String(error?.message || '').includes('The query requires an index')) {
        const qFallback = query(
          collection(db, this.COLLECTION_NAME),
          where('userId', '==', userId)
        );
        const snap = await getDocs(qFallback);
        return snap.docs
          .map(doc => this.fromFirestoreFormat(doc))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      console.error('Erro ao buscar estratégias do Firestore:', error);
      return [];
    }
  }

  // Buscar estratégias por cliente
  async getStrategiesByClient(client: string): Promise<AdStrategy[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    console.log('🔍 [FIRESTORE] getStrategiesByClient chamado:', { userId, client });

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('client', '==', client),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q, { source: 'server' });
      
      console.log('🔍 [FIRESTORE] Estratégias encontradas para cliente:', querySnapshot.docs.length);
      
      const strategies = querySnapshot.docs.map(doc => {
        const strategy = this.fromFirestoreFormat(doc);
        console.log('🔍 [FIRESTORE] Estratégia do cliente:', { 
          id: strategy.id, 
          month: strategy.month,
          hasRemarketing: !!(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3)
        });
        return strategy;
      });
      
      return strategies;
    } catch (error: any) {
      console.error('🔍 [FIRESTORE] Erro ao buscar estratégias por cliente:', error);
      return [];
    }
  }

  // Buscar estratégias por cliente e mês
  async getStrategiesByClientAndMonth(client: string, month: string): Promise<AdStrategy[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    console.log('🔍 [FIRESTORE] getStrategiesByClientAndMonth chamado:', { userId, client, month });

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('client', '==', client),
        where('month', '==', month),
        orderBy('createdAt', 'desc')
      );
      // 🎯 CORREÇÃO: Forçar carregamento do servidor para evitar cache
      const querySnapshot = await getDocs(q, { source: 'server' });
      
      console.log('🔍 [FIRESTORE] Query executada (sem cache), documentos encontrados:', querySnapshot.docs.length);
      
             const strategies = querySnapshot.docs.map(doc => {
         const strategy = this.fromFirestoreFormat(doc);
         console.log('🔍 [FIRESTORE] Estratégia do Firestore:', { 
           id: strategy.id, 
           docId: doc.id,
           hasRemarketing: !!(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3),
           remarketingCount: [strategy.remarketing1, strategy.remarketing2, strategy.remarketing3].filter(Boolean).length,
           createdAt: strategy.createdAt,
           client: strategy.client,
           month: strategy.month
         });
         return strategy;
       });
      
      console.log('🔍 [FIRESTORE] Total de estratégias retornadas:', strategies.length);
      return strategies;
    } catch (error: any) {
      console.error('🔍 [FIRESTORE] Erro na query principal:', error);
      
      // Fallback sem índice: buscar por userId e filtrar em memória; ordenar no cliente
      if (String(error?.message || '').includes('The query requires an index')) {
        console.log('🔍 [FIRESTORE] Usando fallback sem índice...');
        const qFallback = query(
          collection(db, this.COLLECTION_NAME),
          where('userId', '==', userId)
        );
        // 🎯 CORREÇÃO: Forçar carregamento do servidor para evitar cache
        const snap = await getDocs(qFallback, { source: 'server' });
        
        console.log('🔍 [FIRESTORE] Fallback encontrou (sem cache):', snap.docs.length, 'documentos');
        
                 const filteredStrategies = snap.docs
           .map(doc => this.fromFirestoreFormat(doc))
           .filter(s => s.client === client && s.month === month)
           .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
         
         console.log('🔍 [FIRESTORE] Após filtro por client/month:', filteredStrategies.length, 'estratégias');
         console.log('🔍 [FIRESTORE] IDs após filtro:', filteredStrategies.map(s => ({ 
           id: s.id, 
           hasRemarketing: !!(s.remarketing1 || s.remarketing2 || s.remarketing3),
           createdAt: s.createdAt,
           client: s.client,
           month: s.month
         })));
        
        return filteredStrategies;
      }
      console.error('🔍 [FIRESTORE] Erro ao buscar estratégias por cliente e mês:', error);
      return [];
    }
  }

  // Atualizar estratégia
  async updateStrategy(strategy: AdStrategy): Promise<void> {
    console.log('🔍 [FIRESTORE] updateStrategy chamado:', { 
      strategyId: strategy.id,
      hasRemarketing: !!(strategy.remarketing1 || strategy.remarketing2 || strategy.remarketing3),
      remarketingCount: [strategy.remarketing1, strategy.remarketing2, strategy.remarketing3].filter(Boolean).length
    });
    
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
      
      console.log('🔍 [FIRESTORE] Buscando documento para atualização...');
      const querySnapshot = await getDocs(q, { source: 'server' });
      
      console.log('🔍 [FIRESTORE] Documentos encontrados para atualização:', querySnapshot.docs.length);
      
      if (querySnapshot.empty) {
        console.log('🔍 [FIRESTORE] Estratégia não encontrada para atualização:', strategy.id);
        
        // 🎯 CORREÇÃO: Se a estratégia não existe, criar uma nova
        console.log('🔍 [FIRESTORE] Criando nova estratégia no Firestore...');
        const strategyData = this.toFirestoreFormat(strategy);
        await addDoc(collection(db, this.COLLECTION_NAME), strategyData);
        console.log('🔍 [FIRESTORE] Nova estratégia criada com sucesso');
        return;
      }

      // 🎯 CORREÇÃO: Verificar se há múltiplos documentos com o mesmo ID
      if (querySnapshot.docs.length > 1) {
        console.warn('🔍 [FIRESTORE] MÚLTIPLOS DOCUMENTOS ENCONTRADOS! Limpando duplicatas...');
        console.warn('🔍 [FIRESTORE] Documentos encontrados:', querySnapshot.docs.map(doc => ({
          docId: doc.id,
          strategyId: doc.data().id,
          createdAt: doc.data().createdAt?.toDate?.() || 'N/A',
          remarketing1: !!doc.data().remarketing1,
          remarketing2: !!doc.data().remarketing2,
          remarketing3: !!doc.data().remarketing3
        })));
        
        // Manter apenas o mais recente
        const sortedDocs = querySnapshot.docs.sort((a, b) => {
          const aTime = a.data().createdAt?.toDate?.() || new Date(0);
          const bTime = b.data().createdAt?.toDate?.() || new Date(0);
          return bTime.getTime() - aTime.getTime();
        });
        
        // Deletar documentos duplicados (exceto o primeiro)
        for (let i = 1; i < sortedDocs.length; i++) {
          console.log('🔍 [FIRESTORE] Deletando documento duplicado:', sortedDocs[i].id);
          await deleteDoc(sortedDocs[i].ref);
        }
        
        console.log('🔍 [FIRESTORE] Documentos duplicados removidos. Mantendo:', sortedDocs[0].id);
      }

      const docRef = querySnapshot.docs[0].ref;
      
      // 🎯 CORREÇÃO: Verificar dados antes da atualização
      const currentDoc = await getDoc(docRef);
      const currentData = currentDoc.data();
      console.log('🔍 [FIRESTORE] Dados atuais antes da atualização:', {
        docId: docRef.id,
        remarketing1: !!currentData?.remarketing1,
        remarketing2: !!currentData?.remarketing2,
        remarketing3: !!currentData?.remarketing3,
        budgetPlanned: currentData?.budget?.planned
      });
      const strategyData = this.toFirestoreFormat(strategy);
      delete strategyData.userId; // Não atualizar userId
      
      console.log('🔍 [FIRESTORE] Dados para atualização:', {
        docId: docRef.id,
        remarketing1: !!strategyData.remarketing1,
        remarketing2: !!strategyData.remarketing2,
        remarketing3: !!strategyData.remarketing3,
        budgetItems: strategyData.budgetItems?.length || 0
      });
      
              await updateDoc(docRef, strategyData);
        console.log('🔍 [FIRESTORE] Documento atualizado com sucesso');
        
        // 🎯 CORREÇÃO: Forçar atualização imediata do cache
        await getDoc(docRef);
        console.log('🔍 [FIRESTORE] Cache atualizado forçadamente');
        
        // 🎯 CORREÇÃO: Verificar dados após a atualização
        const updatedDoc = await getDoc(docRef);
        const updatedData = updatedDoc.data();
        console.log('🔍 [FIRESTORE] Dados após a atualização:', {
          docId: docRef.id,
          remarketing1: !!updatedData?.remarketing1,
          remarketing2: !!updatedData?.remarketing2,
          remarketing3: !!updatedData?.remarketing3,
          budgetPlanned: updatedData?.budget?.planned
        });
        
        // 🎯 CORREÇÃO: Se os dados não foram atualizados, tentar novamente
        if (updatedData?.remarketing1 !== strategyData.remarketing1 || 
            updatedData?.remarketing2 !== strategyData.remarketing2 || 
            updatedData?.remarketing3 !== strategyData.remarketing3) {
          console.warn('🔍 [FIRESTORE] DADOS NÃO ATUALIZADOS! Tentando novamente...');
          
          // Forçar atualização com merge: false
          await setDoc(docRef, strategyData, { merge: false });
          console.log('🔍 [FIRESTORE] Documento reescrito completamente');
          
          // Verificar novamente
          const retryDoc = await getDoc(docRef);
          const retryData = retryDoc.data();
          console.log('🔍 [FIRESTORE] Dados após reescrita:', {
            docId: docRef.id,
            remarketing1: !!retryData?.remarketing1,
            remarketing2: !!retryData?.remarketing2,
            remarketing3: !!retryData?.remarketing3,
            budgetPlanned: retryData?.budget?.planned
          });
        }
      
    } catch (error) {
      console.error('🔍 [FIRESTORE] Erro ao atualizar estratégia no Firestore:', error);
      throw error;
    }
  }

  // Remover estratégia (robusto para diferentes formatos antigos)
  async removeStrategy(strategyId: string): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // 1) Buscar por campo 'id' (formato atual)
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('id', '==', strategyId)
      );

      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docRefFromField = querySnapshot.docs[0].ref;
        await deleteDoc(docRefFromField);
        
        return;
      }

      // 2) Fallback: tentar usar strategyId como ID do documento (formato antigo)
      const directRef = doc(db, this.COLLECTION_NAME, strategyId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        await deleteDoc(directRef);
        
        return;
      }

      // 3) Não encontrada — não lançar erro para não travar UX
      console.warn('Estratégia não encontrada para remoção no Firestore:', strategyId);
    } catch (error) {
      console.error('Erro ao remover estratégia do Firestore:', error);
      // Propagar apenas erros de permissão; ignorar not found
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
        
        return 0;
      }

      const strategies: AdStrategy[] = JSON.parse(localData);
      if (!strategies.length) {
        
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
