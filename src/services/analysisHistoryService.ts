import { collection, doc, setDoc, getDocs, query, where, Timestamp, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { authService } from './authService';

export interface AnalysisHistoryEntry {
  id: string;
  userId: string;
  client: string;
  product: string;
  audience?: string;
  actionType: string;
  actionLabel: string;
  description: string;
  createdAt: Date;
  adSetId?: string;
}

/** Todas as opções em formato checkbox — labels curtos para caber na caixa */
export const ANALYSIS_CHECKBOX_OPTIONS: { value: string; label: string; defaultText: string }[] = [
  { value: 'escala_campanha', label: 'Escala', defaultText: 'Campanha performando abaixo do CPA ideal, o que é positivo. Aumentamos o investimento diário em até 50% para aproveitar o momento de boa performance.' },
  { value: 'troca_criativo', label: 'Troca de criativo', defaultText: 'Identificada fadiga do criativo atual. Realizamos a troca por novas variações para testar qual performa melhor e manter a eficiência da campanha.' },
  { value: 'aumento_orcamento', label: 'Aumento de orçamento', defaultText: 'Pacing desalinhado: gasto abaixo do ritmo ideal. Aumentamos o orçamento diário para garantir que o investimento planejado seja utilizado de forma eficiente ao longo do mês.' },
  { value: 'reducao_orcamento', label: 'Redução de orçamento', defaultText: 'CPA acima do esperado. Reduzimos temporariamente o orçamento para evitar desperdício enquanto ajustamos públicos ou criativos.' },
  { value: 'ajuste_publico', label: 'Ajuste de público', defaultText: 'Refinamento do targeting para melhorar a entrega dos anúncios. Ajustamos faixa etária, interesses ou comportamentos para atingir pessoas mais propensas a converter.' },
  { value: 'pacing_desalinhado', label: 'Pacing desalinhado', defaultText: 'Gasto desalinhado em relação ao planejado. Ajustamos o orçamento diário para alinhar o ritmo de investimento ao objetivo do mês.' },
  { value: 'pausa_campanha', label: 'Pausa de campanha', defaultText: 'Campanha pausada temporariamente devido a CPA elevado ou necessidade de revisão estratégica. Será reavaliada na próxima análise.' },
  { value: 'reativacao_campanha', label: 'Reativação', defaultText: 'Campanha reativada após período de pausa. Ajustes realizados nos criativos ou públicos para retomar com melhor performance.' },
  { value: 'otimizacao_anuncios', label: 'Otimização de anúncios', defaultText: 'Revisão e otimização dos anúncios ativos. Desativamos variações com baixa performance e priorizamos as que convertem melhor.' },
  { value: 'pausa_anuncios_esp', label: 'Pausa de anúncios específicos', defaultText: 'Pausamos anúncios com baixa performance para concentrar o orçamento nas variações que convertem melhor.' },
  { value: 'ajuste_pacing', label: 'Ajuste de pacing', defaultText: 'Ajustamos o ritmo de investimento para alinhar o gasto ao planejado para o mês.' },
  { value: 'otimizacao_lances', label: 'Otimização de lances', defaultText: 'Ajustamos os lances das campanhas para melhorar a distribuição do orçamento e a eficiência.' },
  { value: 'manutencao', label: 'Manutenção', defaultText: 'Análise realizada. Métricas dentro do esperado. Nenhuma alteração necessária no momento. Próxima revisão conforme intervalo definido.' },
  { value: 'outro', label: 'Outro', defaultText: '' }
];

/** @deprecated Use ANALYSIS_CHECKBOX_OPTIONS */
export const ANALYSIS_ACTION_OPTIONS = ANALYSIS_CHECKBOX_OPTIONS;

/** @deprecated Use ANALYSIS_CHECKBOX_OPTIONS */
export const ADDITIONAL_ACTION_OPTIONS: { value: string; label: string; additionalText: string }[] = [];

function sanitize(str: string) {
  return (str || '').toLowerCase().replace(/[\s/\\|]+/g, '_').replace(/[^a-z0-9_\-]/g, '');
}

export const analysisHistoryService = {
  async addEntry(
    client: string,
    product: string,
    audience: string | undefined,
    actionType: string,
    actionLabel: string,
    description: string,
    metaAdsUserId?: string,
    adSetId?: string
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user?.uid) return;

    const userId = metaAdsUserId || user.uid;
    const id = `${sanitize(userId)}_${sanitize(client)}_${sanitize(product)}_${sanitize(audience || '')}_${Date.now()}`;

    const ref = doc(db, 'analysisHistory', id);
    await setDoc(ref, {
      userId,
      client,
      product,
      audience: audience || null,
      actionType,
      actionLabel,
      description,
      createdAt: Timestamp.now(),
      adSetId: adSetId || null
    });
  },

  async listForCampaign(
    client: string,
    product: string,
    audience?: string,
    metaAdsUserId?: string,
    maxEntries: number = 50
  ): Promise<AnalysisHistoryEntry[]> {
    const user = authService.getCurrentUser();
    if (!user?.uid) return [];

    const userId = metaAdsUserId || user.uid;

    try {
      const q = query(
        collection(db, 'analysisHistory'),
        where('userId', '==', userId)
      );
      const snap = await getDocs(q);

      return snap.docs
        .map(d => {
          const data = d.data();
          if (data.client !== client || data.product !== product) return null;
          const entryAudience = data.audience || undefined;
          if (audience !== undefined && audience !== '' && entryAudience !== audience) return null;
          return {
            id: d.id,
            userId: data.userId,
            client: data.client,
            product: data.product,
            audience: entryAudience,
            actionType: data.actionType,
            actionLabel: data.actionLabel,
            description: data.description,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            adSetId: data.adSetId
          } as AnalysisHistoryEntry;
        })
        .filter((e): e is AnalysisHistoryEntry => e !== null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, maxEntries);
    } catch (e) {
      console.error('Erro ao listar histórico de análise:', e);
      return [];
    }
  },

  /** Lista histórico para relatório público (usa ownerId da URL, permite leitura anônima) */
  async listForReportPublic(
    client: string,
    product: string,
    audience: string | undefined,
    ownerId: string,
    maxEntries: number = 50
  ): Promise<AnalysisHistoryEntry[]> {
    if (!ownerId) return [];

    try {
      const q = query(
        collection(db, 'analysisHistory'),
        where('userId', '==', ownerId)
      );
      const snap = await getDocs(q);

      return snap.docs
        .map(d => {
          const data = d.data();
          if (data.client !== client || data.product !== product) return null;
          const entryAudience = data.audience || undefined;
          if (audience !== undefined && audience !== '' && entryAudience !== audience) return null;
          return {
            id: d.id,
            userId: data.userId,
            client: data.client,
            product: data.product,
            audience: entryAudience,
            actionType: data.actionType,
            actionLabel: data.actionLabel,
            description: data.description,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            adSetId: data.adSetId
          } as AnalysisHistoryEntry;
        })
        .filter((e): e is AnalysisHistoryEntry => e !== null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, maxEntries);
    } catch (e) {
      console.error('Erro ao listar histórico de análise (público):', e);
      return [];
    }
  },

  async deleteEntry(id: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user?.uid) return;
    const ref = doc(db, 'analysisHistory', id);
    await deleteDoc(ref);
  },

  async updateEntry(
    id: string,
    updates: { actionType?: string; actionLabel?: string; description?: string }
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user?.uid) return;
    const ref = doc(db, 'analysisHistory', id);
    await updateDoc(ref, updates as Record<string, unknown>);
  }
};
