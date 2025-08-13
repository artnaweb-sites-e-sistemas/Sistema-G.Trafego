import { collection, doc, getDoc, getDocs, query, where, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { authService } from './authService';

export interface AnalysisPlannerRecord {
  userId: string;
  client: string;
  product: string;
  audience?: string;
  lastAnalysisDate?: string; // ISO YYYY-MM-DD
  intervalDays?: number;
  plannedBudget?: number; // orçamento pretendido (BRL)
  adSetId?: string; // id do conjunto de anúncios vinculado
  updatedAt: Date;
}

function sanitize(str: string) {
  return (str || '')
    .toLowerCase()
    .replace(/[\s/\\|]+/g, '_')
    .replace(/[^a-z0-9_\-]/g, '');
}

function buildDocId(userId: string, client: string, product: string, audience?: string) {
  const parts = [userId, client || 'sem-cliente', product || 'sem-produto', audience || 'sem-publico'];
  return parts.map(sanitize).join('|');
}

export const analysisPlannerService = {
  async getPlanner(client: string, product: string, audience?: string): Promise<AnalysisPlannerRecord | null> {
    try {
      const user = authService.getCurrentUser();
      if (!user?.uid) return null;
      const id = buildDocId(user.uid, client, product, audience);
      
      const ref = doc(db, 'analysisPlanner', id);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data();
      return {
        userId: user.uid,
        client,
        product,
        audience,
        lastAnalysisDate: data.lastAnalysisDate || undefined,
        intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : undefined,
        plannedBudget: typeof data.plannedBudget === 'number' ? data.plannedBudget : undefined,
        adSetId: typeof data.adSetId === 'string' ? data.adSetId : undefined,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
      };
    } catch (e) {
      console.error('Erro ao carregar AnalysisPlanner do Firestore:', e);
      return null;
    }
  },

  async savePlanner(client: string, product: string, audience: string | undefined, payload: { lastAnalysisDate?: string; intervalDays?: number; plannedBudget?: number; adSetId?: string }): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user?.uid) return; // sem user logado, não persiste no Firestore
    const id = buildDocId(user.uid, client, product, audience);
    const ref = doc(db, 'analysisPlanner', id);
    const data: any = {
      userId: user.uid,
      client,
      product,
      audience: audience || null,
      updatedAt: new Date()
    };
    if (typeof payload.lastAnalysisDate === 'string') data.lastAnalysisDate = payload.lastAnalysisDate;
    if (typeof payload.intervalDays === 'number') data.intervalDays = payload.intervalDays;
    if (typeof payload.plannedBudget === 'number') data.plannedBudget = payload.plannedBudget;
    if (typeof payload.adSetId === 'string') data.adSetId = payload.adSetId;
    await setDoc(ref, data, { merge: true });
  }
  ,

  async listPlannersForProduct(client: string, product: string): Promise<AnalysisPlannerRecord[]> {
    const user = authService.getCurrentUser();
    if (!user?.uid) return [];
    try {
      const q = query(
        collection(db, 'analysisPlanner'),
        where('userId', '==', user.uid),
        where('client', '==', client),
        where('product', '==', product)
      );
      const snap = await getDocs(q);
      const results = snap.docs.map(d => {
        const data: any = d.data();
        return {
          userId: data.userId,
          client: data.client,
          product: data.product,
          audience: data.audience || undefined,
          lastAnalysisDate: data.lastAnalysisDate || undefined,
          intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : undefined,
          plannedBudget: typeof data.plannedBudget === 'number' ? data.plannedBudget : undefined,
          adSetId: typeof data.adSetId === 'string' ? data.adSetId : undefined,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
        } as AnalysisPlannerRecord;
      });
      return results;
    } catch (err: any) {
      // Fallback: buscar apenas por userId e filtrar em memória (evita índice composto)
      try {
        const qUser = query(collection(db, 'analysisPlanner'), where('userId', '==', user.uid));
        const snap = await getDocs(qUser);
        const results = snap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(d => d.client === client && d.product === product)
          .map((data: any) => ({
            userId: data.userId,
            client: data.client,
            product: data.product,
            audience: data.audience || undefined,
            lastAnalysisDate: data.lastAnalysisDate || undefined,
            intervalDays: typeof data.intervalDays === 'number' ? data.intervalDays : undefined,
            plannedBudget: typeof data.plannedBudget === 'number' ? data.plannedBudget : undefined,
            adSetId: typeof data.adSetId === 'string' ? data.adSetId : undefined,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date()
          } as AnalysisPlannerRecord));
        return results;
      } catch (e) {
        console.error('Erro ao listar planners (fallback):', e);
        return [];
      }
    }
  }
};


