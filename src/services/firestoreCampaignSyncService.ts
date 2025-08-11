import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { authService } from './authService';

export interface CampaignData {
  id: string;
  name: string;
  status: string;
  businessManagerId: string;
  adAccountId: string;
  clientName: string;
  lastSyncAt: any;
  createdAt: any;
  updatedAt: any;
}

export interface UserSelection {
  userId: string;
  selectedClient?: string;
  selectedCampaignId?: string;
  selectedProductName?: string;
  lastUpdatedAt: any;
}

class FirestoreCampaignSyncService {
  private readonly CAMPAIGNS_COLLECTION = 'campaigns';
  private readonly USER_SELECTIONS_COLLECTION = 'user_selections';

  // Sincronizar campanhas do Meta Ads para o Firestore
  async syncCampaignsFromMetaAds(campaigns: any[], clientName: string, businessManagerId: string, adAccountId: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const batch = [];
    
    for (const campaign of campaigns) {
      const campaignData: CampaignData = {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        businessManagerId,
        adAccountId,
        clientName,
        lastSyncAt: serverTimestamp(),
        createdAt: campaign.created_time ? new Date(campaign.created_time) : serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Usar o ID da campanha como document ID para facilitar consultas
      const docRef = doc(db, this.CAMPAIGNS_COLLECTION, `${user.uid}_${campaign.id}`);
      batch.push(setDoc(docRef, {
        ...campaignData,
        userId: user.uid
      }, { merge: true }));
    }

    // Executar todas as operações em lote
    for (const operation of batch) {
      await operation;
    }
    
    console.log(`✅ Sincronizadas ${campaigns.length} campanhas para o Firestore`);
  }

  // Buscar campanhas do cliente no Firestore
  async getCampaignsByClient(clientName: string): Promise<CampaignData[]> {
    const user = authService.getCurrentUser();
    if (!user) return [];

    try {
      const q = query(
        collection(db, this.CAMPAIGNS_COLLECTION),
        where('userId', '==', user.uid),
        where('clientName', '==', clientName),
        orderBy('updatedAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as CampaignData);
    } catch (error) {
      console.error('Erro ao buscar campanhas:', error);
      return [];
    }
  }

  // Buscar campanha específica por ID
  async getCampaignById(campaignId: string): Promise<CampaignData | null> {
    const user = authService.getCurrentUser();
    if (!user) return null;

    try {
      const docRef = doc(db, this.CAMPAIGNS_COLLECTION, `${user.uid}_${campaignId}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as CampaignData;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar campanha por ID:', error);
      return null;
    }
  }

  // Salvar seleção atual do usuário
  async saveUserSelection(selection: Partial<UserSelection>): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      const docRef = doc(db, this.USER_SELECTIONS_COLLECTION, user.uid);
      await setDoc(docRef, {
        userId: user.uid,
        ...selection,
        lastUpdatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ Seleção do usuário salva no Firestore');
    } catch (error) {
      console.error('Erro ao salvar seleção do usuário:', error);
    }
  }

  // Carregar seleção atual do usuário
  async getUserSelection(): Promise<UserSelection | null> {
    const user = authService.getCurrentUser();
    if (!user) return null;

    try {
      const docRef = doc(db, this.USER_SELECTIONS_COLLECTION, user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserSelection;
      }
      return null;
    } catch (error) {
      console.error('Erro ao carregar seleção do usuário:', error);
      return null;
    }
  }

  // Obter produto selecionado atualmente (nome da campanha)
  async getCurrentSelectedProduct(): Promise<string | null> {
    const selection = await this.getUserSelection();
    if (!selection?.selectedCampaignId) return null;

    // Tentar buscar o nome da campanha no Firestore
    const campaign = await this.getCampaignById(selection.selectedCampaignId);
    return campaign?.name || selection.selectedProductName || null;
  }

  // Atualizar nome da campanha quando há mudanças no Meta Ads
  async updateCampaignName(campaignId: string, newName: string): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) return;

    try {
      const docRef = doc(db, this.CAMPAIGNS_COLLECTION, `${user.uid}_${campaignId}`);
      await setDoc(docRef, {
        name: newName,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Atualizar também a seleção do usuário se esta campanha está selecionada
      const selection = await this.getUserSelection();
      if (selection?.selectedCampaignId === campaignId) {
        await this.saveUserSelection({
          selectedProductName: newName
        });
      }
      
      console.log(`✅ Nome da campanha ${campaignId} atualizado para: ${newName}`);
    } catch (error) {
      console.error('Erro ao atualizar nome da campanha:', error);
    }
  }
}

export const firestoreCampaignSyncService = new FirestoreCampaignSyncService();
