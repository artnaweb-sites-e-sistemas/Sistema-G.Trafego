import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { authService } from './authService';

export interface NotificationRecord {
  id: string;
  userId: string;
  type: 'analysis_pending' | 'analysis_overdue' | 'system';
  title: string;
  message: string;
  client?: string;
  product?: string;
  audience?: string;
  daysPastDue?: number;
  isRead: boolean;
  isUrgent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class FirestoreNotificationService {
  private collection = 'notifications';

  /**
   * Salvar uma notificação no Firestore
   */
  async saveNotification(
    userId: string,
    type: NotificationRecord['type'],
    title: string,
    message: string,
    metadata: {
      client?: string;
      product?: string;
      audience?: string;
      daysPastDue?: number;
      isUrgent?: boolean;
    } = {}
  ): Promise<void> {
    try {
      const notificationId = `${userId}_${type}_${metadata.client || 'system'}_${metadata.product || 'general'}_${Date.now()}`;
      
      const notificationData = {
        id: notificationId,
        userId,
        type,
        title,
        message,
        client: metadata.client || null,
        product: metadata.product || null,
        audience: metadata.audience || null,
        daysPastDue: metadata.daysPastDue || null,
        isRead: false,
        isUrgent: metadata.isUrgent || false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const ref = doc(db, this.collection, notificationId);
      await setDoc(ref, notificationData);
      
      } catch (error) {
      console.error('❌ Erro ao salvar notificação no Firestore:', error);
      throw error;
    }
  }

  /**
   * Buscar notificações de um usuário
   */
  async getUserNotifications(userId: string): Promise<NotificationRecord[]> {
    try {
      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const notifications: NotificationRecord[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        notifications.push({
          id: data.id,
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          client: data.client || undefined,
          product: data.product || undefined,
          audience: data.audience || undefined,
          daysPastDue: data.daysPastDue || undefined,
          isRead: data.isRead,
          isUrgent: data.isUrgent,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      
      return notifications;
    } catch (error) {
      console.error('❌ Erro ao buscar notificações do Firestore:', error);
      return [];
    }
  }

  /**
   * Marcar notificação como lida
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const ref = doc(db, this.collection, notificationId);
      await setDoc(ref, {
        isRead: true,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      } catch (error) {
      console.error('❌ Erro ao marcar notificação como lida:', error);
      throw error;
    }
  }

  /**
   * Marcar todas as notificações de um usuário como lidas
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const notifications = await this.getUserNotifications(userId);
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      const promises = unreadNotifications.map(notification =>
        this.markAsRead(notification.id)
      );
      
      await Promise.all(promises);
      } catch (error) {
      console.error('❌ Erro ao marcar todas as notificações como lidas:', error);
      throw error;
    }
  }

  /**
   * Atualizar automaticamente notificações de análises pendentes
   * Criar/atualizar notificações baseadas no estado atual das análises
   */
  async syncPendingAnalysisNotifications(
    userId: string,
    pendingAnalyses: Array<{
      id: string;
      client: string;
      product: string;
      audience?: string;
      daysPastDue: number;
    }>
  ): Promise<void> {
    try {
      // Buscar notificações existentes de análises pendentes
      const existingNotifications = await this.getUserNotifications(userId);
      const existingAnalysisNotifications = existingNotifications.filter(
        n => n.type === 'analysis_pending' || n.type === 'analysis_overdue'
      );

      // Para cada análise pendente, criar ou atualizar notificação
      for (const analysis of pendingAnalyses) {
        const isOverdue = analysis.daysPastDue > 0;
        const isUrgent = analysis.daysPastDue > 3;
        const type = isOverdue ? 'analysis_overdue' : 'analysis_pending';
        
        const title = isOverdue 
          ? `Análise em atraso - ${analysis.client}`
          : `Análise pendente - ${analysis.client}`;
          
        const message = isOverdue
          ? `A análise de ${analysis.product}${analysis.audience ? ` (${analysis.audience})` : ''} está ${analysis.daysPastDue} dia(s) em atraso.`
          : `Análise de ${analysis.product}${analysis.audience ? ` (${analysis.audience})` : ''} programada.`;

        // Verificar se já existe notificação para esta análise
        const existingNotification = existingAnalysisNotifications.find(
          n => n.client === analysis.client && 
               n.product === analysis.product && 
               n.audience === analysis.audience
        );

        if (existingNotification) {
          // Atualizar notificação existente se necessário
          if (existingNotification.daysPastDue !== analysis.daysPastDue || 
              existingNotification.type !== type) {
            await this.updateNotification(existingNotification.id, {
              type,
              title,
              message,
              daysPastDue: analysis.daysPastDue,
              isUrgent
            });
          }
        } else {
          // Criar nova notificação
          await this.saveNotification(userId, type, title, message, {
            client: analysis.client,
            product: analysis.product,
            audience: analysis.audience,
            daysPastDue: analysis.daysPastDue,
            isUrgent
          });
        }
      }

      } catch (error) {
      console.error('❌ Erro ao sincronizar notificações de análises pendentes:', error);
      throw error;
    }
  }

  /**
   * Atualizar uma notificação existente
   */
  private async updateNotification(
    notificationId: string, 
    updates: Partial<NotificationRecord>
  ): Promise<void> {
    try {
      const ref = doc(db, this.collection, notificationId);
      await setDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      } catch (error) {
      console.error('❌ Erro ao atualizar notificação:', error);
      throw error;
    }
  }

  /**
   * Limpar notificações antigas (mais de 30 dias)
   */
  async cleanupOldNotifications(userId: string): Promise<void> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const q = query(
        collection(db, this.collection),
        where('userId', '==', userId),
        where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo))
      );

      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
      
      await Promise.all(deletePromises);
      } catch (error) {
      console.error('❌ Erro ao limpar notificações antigas:', error);
    }
  }
}

export const firestoreNotificationService = new FirestoreNotificationService();
