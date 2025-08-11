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
import { ShareLink } from './shareService';

class FirestoreShareService {
  private readonly COLLECTION_NAME = 'share_links';

  // Garantir que o usuário está autenticado
  private getCurrentUserId(): string | null {
    const user = authService.getCurrentUser();
    return user?.uid || null;
  }

  // Converter ShareLink para formato Firestore
  private toFirestoreFormat(shareLink: ShareLink) {
    return {
      ...shareLink,
      createdAt: Timestamp.fromDate(shareLink.createdAt),
      updatedAt: shareLink.updatedAt ? Timestamp.fromDate(shareLink.updatedAt) : null,
      expiresAt: shareLink.expiresAt ? Timestamp.fromDate(shareLink.expiresAt) : null,
      userId: this.getCurrentUserId()
    };
  }

  // Converter de Firestore para ShareLink
  private fromFirestoreFormat(doc: any): ShareLink {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : undefined,
      expiresAt: data.expiresAt ? data.expiresAt.toDate() : undefined
    };
  }

  // Salvar link no Firestore
  async saveShareLink(shareLink: ShareLink): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const linkData = this.toFirestoreFormat(shareLink);
      await addDoc(collection(db, this.COLLECTION_NAME), linkData);
      console.log('Link de compartilhamento salvo no Firestore:', shareLink.shortCode);
    } catch (error) {
      console.error('Erro ao salvar link no Firestore:', error);
      throw error;
    }
  }

  // Buscar link por código
  async getShareLink(shortCode: string): Promise<ShareLink | null> {
    const userId = this.getCurrentUserId();
    if (!userId) return null;

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('shortCode', '==', shortCode),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const shareLink = this.fromFirestoreFormat(querySnapshot.docs[0]);
      
      // Verificar se o link expirou
      if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
        await this.deactivateLink(shortCode);
        return null;
      }

      return shareLink;
    } catch (error) {
      console.error('Erro ao buscar link no Firestore:', error);
      return null;
    }
  }

  // Buscar todos os links ativos do usuário
  async getAllShareLinks(): Promise<ShareLink[]> {
    const userId = this.getCurrentUserId();
    if (!userId) return [];

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => this.fromFirestoreFormat(doc));
    } catch (error) {
      console.error('Erro ao buscar links do Firestore:', error);
      return [];
    }
  }

  // Atualizar link
  async updateShareLink(shareLink: ShareLink): Promise<void> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Usuário não autenticado');
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('shortCode', '==', shareLink.shortCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        throw new Error('Link não encontrado');
      }

      const docRef = querySnapshot.docs[0].ref;
      const linkData = this.toFirestoreFormat(shareLink);
      delete linkData.userId; // Não atualizar userId
      
      await updateDoc(docRef, linkData);
      console.log('Link atualizado no Firestore:', shareLink.shortCode);
    } catch (error) {
      console.error('Erro ao atualizar link no Firestore:', error);
      throw error;
    }
  }

  // Desativar link
  async deactivateLink(shortCode: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('shortCode', '==', shortCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false;
      }

      const docRef = querySnapshot.docs[0].ref;
      await updateDoc(docRef, { isActive: false });
      console.log('Link desativado no Firestore:', shortCode);
      return true;
    } catch (error) {
      console.error('Erro ao desativar link no Firestore:', error);
      return false;
    }
  }

  // Deletar link
  async deleteLink(shortCode: string): Promise<boolean> {
    const userId = this.getCurrentUserId();
    if (!userId) return false;

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId),
        where('shortCode', '==', shortCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return false;
      }

      const docRef = querySnapshot.docs[0].ref;
      await deleteDoc(docRef);
      console.log('Link deletado do Firestore:', shortCode);
      return true;
    } catch (error) {
      console.error('Erro ao deletar link do Firestore:', error);
      return false;
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
      const localData = localStorage.getItem('shareLinks');
      if (!localData) {
        console.log('Nenhum dado de links encontrado no localStorage');
        return 0;
      }

      const links = JSON.parse(localData);
      if (!Object.keys(links).length) {
        console.log('Nenhum link para migrar');
        return 0;
      }

      // Verificar quais links já existem no Firestore
      const existingLinks = await this.getAllShareLinks();
      const existingCodes = new Set(existingLinks.map(l => l.shortCode));

      let migratedCount = 0;
      
      // Migrar apenas links que não existem no Firestore
      for (const [shortCode, linkData] of Object.entries(links)) {
        if (!existingCodes.has(shortCode)) {
          try {
            // Garantir que as datas sejam objetos Date
            const shareLink: ShareLink = {
              ...(linkData as any),
              createdAt: new Date((linkData as any).createdAt),
              updatedAt: (linkData as any).updatedAt ? new Date((linkData as any).updatedAt) : undefined,
              expiresAt: (linkData as any).expiresAt ? new Date((linkData as any).expiresAt) : undefined
            };
            
            await this.saveShareLink(shareLink);
            migratedCount++;
          } catch (error) {
            console.error(`Erro ao migrar link ${shortCode}:`, error);
          }
        }
      }

      console.log(`Migração de links concluída: ${migratedCount} links migrados`);
      return migratedCount;
    } catch (error) {
      console.error('Erro durante migração de links:', error);
      return 0;
    }
  }

  // Limpeza de links expirados
  async cleanupExpiredLinks(): Promise<number> {
    const userId = this.getCurrentUserId();
    if (!userId) return 0;

    try {
      const allLinks = await this.getAllShareLinks();
      const now = new Date();
      let cleanedCount = 0;

      for (const link of allLinks) {
        if (link.expiresAt && now > link.expiresAt) {
          await this.deleteLink(link.shortCode);
          cleanedCount++;
        }
      }

      console.log(`Limpeza concluída: ${cleanedCount} links expirados removidos`);
      return cleanedCount;
    } catch (error) {
      console.error('Erro durante limpeza de links:', error);
      return 0;
    }
  }
}

export const firestoreShareService = new FirestoreShareService();
