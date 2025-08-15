import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Task {
  id: string;
  userId: string;
  text: string;
  completed: boolean;
  order: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface TaskInput {
  text: string;
  userId: string;
}

class TaskService {
  private readonly COLLECTION_NAME = 'tasks';

  async createTask(userId: string, text: string): Promise<Task> {
    try {
      const now = new Date();
      
      // Usar timestamp como ordem temporária para evitar queries complexas
      const order = Date.now();
      
      const taskData = {
        userId,
        text,
        completed: false,
        order,
        createdAt: Timestamp.fromDate(now)
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), taskData);
      
      return {
        id: docRef.id,
        userId,
        text,
        completed: false,
        order,
        createdAt: now
      };
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      throw new Error('Falha ao criar tarefa');
    }
  }

  async getUserTasks(userId: string): Promise<Task[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      
      const querySnapshot = await getDocs(q);
      
      const tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          text: data.text,
          completed: data.completed,
          order: data.order || 0,
          createdAt: data.createdAt?.toDate() || new Date(),
          completedAt: data.completedAt?.toDate()
        };
      });

      // Ordenar por order no código (ao invés de no Firestore)
      return tasks.sort((a, b) => a.order - b.order);
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      throw new Error('Falha ao carregar tarefas');
    }
  }

  async toggleTaskCompletion(taskId: string): Promise<Task> {
    try {
      const taskRef = doc(db, this.COLLECTION_NAME, taskId);
      
      // Primeiro, buscar a tarefa atual para saber seu estado
      const tasks = await getDocs(query(collection(db, this.COLLECTION_NAME)));
      const currentTask = tasks.docs.find(doc => doc.id === taskId);
      
      if (!currentTask) {
        throw new Error('Tarefa não encontrada');
      }

      const taskData = currentTask.data();
      const isCompleted = taskData.completed;
      const now = new Date();

      const updateData: any = {
        completed: !isCompleted
      };

      if (!isCompleted) {
        // Marcando como concluída
        updateData.completedAt = Timestamp.fromDate(now);
      } else {
        // Desmarcando como concluída
        updateData.completedAt = null;
      }

      await updateDoc(taskRef, updateData);

      return {
        id: taskId,
        userId: taskData.userId,
        text: taskData.text,
        completed: !isCompleted,
        order: taskData.order || 0,
        createdAt: taskData.createdAt?.toDate() || new Date(),
        completedAt: !isCompleted ? now : undefined
      };
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw new Error('Falha ao atualizar tarefa');
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION_NAME, taskId));
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      throw new Error('Falha ao deletar tarefa');
    }
  }

  async updateTaskText(taskId: string, newText: string): Promise<Task> {
    try {
      const taskRef = doc(db, this.COLLECTION_NAME, taskId);
      
      await updateDoc(taskRef, {
        text: newText
      });

      // Buscar a tarefa atualizada
      const tasks = await getDocs(query(collection(db, this.COLLECTION_NAME)));
      const updatedTask = tasks.docs.find(doc => doc.id === taskId);
      
      if (!updatedTask) {
        throw new Error('Tarefa não encontrada após atualização');
      }

      const data = updatedTask.data();
      return {
        id: taskId,
        userId: data.userId,
        text: data.text,
        completed: data.completed,
        order: data.order || 0,
        createdAt: data.createdAt?.toDate() || new Date(),
        completedAt: data.completedAt?.toDate()
      };
    } catch (error) {
      console.error('Erro ao atualizar texto da tarefa:', error);
      throw new Error('Falha ao atualizar texto da tarefa');
    }
  }

  async reorderTasks(userId: string, taskIds: string[]): Promise<void> {
    try {
      if (!taskIds || taskIds.length === 0) {
        throw new Error('Lista de IDs de tarefas vazia');
      }

      // Verificar se todas as tarefas pertencem ao usuário
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      const userTaskIds = querySnapshot.docs.map(doc => doc.id);
      
      const validTaskIds = taskIds.filter(id => userTaskIds.includes(id));
      
      if (validTaskIds.length !== taskIds.length) {
        console.warn('Algumas tarefas não pertencem ao usuário ou não existem');
      }

      // Atualizar ordens em lote
      const updatePromises = validTaskIds.map((taskId, index) => {
        const taskRef = doc(db, this.COLLECTION_NAME, taskId);
        return updateDoc(taskRef, { order: index + 1 });
      });
      
      await Promise.all(updatePromises);
      console.log(`${validTaskIds.length} tarefas reordenadas com sucesso`);
    } catch (error) {
      console.error('Erro ao reordenar tarefas:', error);
      throw new Error('Falha ao reordenar tarefas');
    }
  }

  async getTasksStats(userId: string): Promise<{
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  }> {
    try {
      const tasks = await this.getUserTasks(userId);
      const total = tasks.length;
      const completed = tasks.filter(task => task.completed).length;
      const pending = total - completed;
      const completionRate = total > 0 ? (completed / total) * 100 : 0;

      return {
        total,
        completed,
        pending,
        completionRate: Math.round(completionRate)
      };
    } catch (error) {
      console.error('Erro ao calcular estatísticas das tarefas:', error);
      throw new Error('Falha ao calcular estatísticas');
    }
  }
}

export const taskService = new TaskService();
