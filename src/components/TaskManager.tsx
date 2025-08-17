import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CheckCircle2, Circle, Plus, X, Clock, CheckCheck, Trash2, GripVertical, AlertTriangle } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { createPortal } from 'react-dom';
import { taskService, Task } from '../services/taskService';
// Imports de formatação de data removidos - não mais necessários

interface TaskManagerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onMetaAdsDisconnect?: () => void;
}

const TaskManager: React.FC<TaskManagerProps> = ({ isOpen, onClose, userId, onMetaAdsDisconnect }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userId) {
      loadTasks();
    }
  }, [isOpen, userId]);

  // Limpar tarefas quando o userId mudar (mudança de conta Meta Ads)
  useEffect(() => {
    setTasks([]);
    setNewTaskText('');
    setActiveTab('pending');
  }, [userId]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Verificar se o userId é válido (não deve fechar modal automaticamente)
  const isValidUserId = useMemo(() => {
    if (!userId) return false;
    
    try {
      const savedUser = localStorage.getItem('facebookUser');
      const selectedAdAccount = localStorage.getItem('selectedAdAccount');
      
      if (!savedUser || !selectedAdAccount) return false;
      
      const user = JSON.parse(savedUser);
      const adAccount = JSON.parse(selectedAdAccount);
      const expectedUserId = `${user.id}_${adAccount.id}`;
      
      return userId === expectedUserId;
    } catch (error) {
      return false;
    }
  }, [userId]);

  const loadTasks = async () => {
    if (!isValidUserId) {
      console.warn('Tentativa de carregar tarefas sem userId válido');
      return;
    }

    setIsLoading(true);
    try {
      const userTasks = await taskService.getUserTasks(userId);
      setTasks(userTasks);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim() || !isValidUserId) return;

    try {
      const newTask = await taskService.createTask(userId, newTaskText.trim());
      setTasks(prev => [newTask, ...prev]);
      setNewTaskText('');
    } catch (error) {
      console.error('Erro ao criar tarefa:', error);
      await loadTasks();
    }
  };

  const handleToggleTask = useCallback(async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;

      const updatedTask = await taskService.toggleTaskCompletion(taskId);
      setTasks(prev => prev.map(t => t.id === taskId ? updatedTask : t));
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      await loadTasks();
    }
  }, [tasks]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      await loadTasks();
    }
  }, []);

  const handleDragEnd = async (result: DropResult) => {
    console.log('🎯 DRAG DEBUG - handleDragEnd iniciado:', result);
    
    const { destination, source, draggableId } = result;

    console.log('🎯 DRAG DEBUG - Dados do drag:', {
      destination,
      source,
      draggableId,
      activeTab,
      pendingTasksCount: pendingTasks.length,
      completedTasksCount: completedTasks.length
    });

    // Se não há destino, o item foi solto fora da lista
    if (!destination) {
      console.log('🎯 DRAG DEBUG - Sem destino, cancelando');
      return;
    }

    // Se o item foi solto na mesma posição, não há mudança
    if (destination.index === source.index) {
      console.log('🎯 DRAG DEBUG - Mesma posição, cancelando');
      return;
    }

    // Verificar se o draggableId existe na lista atual
    const currentTasks = activeTab === 'pending' ? pendingTasks : completedTasks;
    console.log('🎯 DRAG DEBUG - Lista atual:', {
      activeTab,
      currentTasksCount: currentTasks.length,
      taskIds: currentTasks.map(t => t.id)
    });

    const draggedTask = currentTasks.find(task => task.id === draggableId);
    
    if (!draggedTask) {
      console.error('🎯 DRAG DEBUG - Tarefa não encontrada:', {
        draggableId,
        availableTaskIds: currentTasks.map(t => t.id),
        allTasks: tasks.map(t => ({ id: t.id, completed: t.completed }))
      });
      return;
    }

    console.log('🎯 DRAG DEBUG - Tarefa encontrada:', draggedTask);
    
    // Criar uma nova array com a ordem alterada
    const reorderedTasks = Array.from(currentTasks);
    const [removed] = reorderedTasks.splice(source.index, 1);
    reorderedTasks.splice(destination.index, 0, removed);

    console.log('🎯 DRAG DEBUG - Reordenação:', {
      original: currentTasks.map(t => ({ id: t.id, order: t.order })),
      reordered: reorderedTasks.map(t => ({ id: t.id, order: t.order })),
      removedTask: removed
    });

    // Atualizar ordens sequenciais
    const updatedTasks = reorderedTasks.map((task, index) => ({
      ...task,
      order: index + 1
    }));

    console.log('🎯 DRAG DEBUG - Tarefas com nova ordem:', 
      updatedTasks.map(t => ({ id: t.id, order: t.order }))
    );

    // Atualizar o estado local
    const newAllTasks = tasks.map(task => {
      const updatedTask = updatedTasks.find(t => t.id === task.id);
      return updatedTask || task;
    });
    
    console.log('🎯 DRAG DEBUG - Atualizando estado local...');
    setTasks(newAllTasks);

    // Atualizar no banco de dados
    try {
      const taskIds = updatedTasks.map(task => task.id);
      console.log('🎯 DRAG DEBUG - Salvando no banco:', taskIds);
      await taskService.reorderTasks(userId, taskIds);
      console.log('🎯 DRAG DEBUG - Salvo com sucesso!');
    } catch (error) {
      console.error('🎯 DRAG DEBUG - Erro ao salvar:', error);
      await loadTasks();
    }
  };

  const pendingTasks = useMemo(() => 
    tasks.filter(task => !task.completed).sort((a, b) => a.order - b.order), 
    [tasks]
  );
  
  const completedTasks = useMemo(() => 
    tasks.filter(task => task.completed).sort((a, b) => a.order - b.order), 
    [tasks]
  );

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="task-manager-modal flex items-start justify-center pt-16"
      style={{
        background: 'rgba(0,0,0,0.5)'
      }}
    >
      <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-600/40 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-600/40">
          <h2 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6 text-indigo-400" />
            Minhas Tarefas
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verificação de userId válido */}
        {!isValidUserId ? (
          <div className="p-6 text-center">
            <div className="bg-amber-900/30 border border-amber-600/40 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-center gap-2 text-amber-200 mb-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-medium">Configuração Necessária</span>
              </div>
              <p className="text-amber-100 text-sm">
                Para usar as tarefas, você precisa ter o Meta Ads conectado com uma conta de anúncios selecionada.
              </p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors duration-200"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-slate-600/40">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === 'pending'
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-700/30'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendingTasks.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-all duration-200 ${
              activeTab === 'completed'
                ? 'text-green-400 border-b-2 border-green-400 bg-slate-700/30'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCheck className="w-4 h-4" />
              Concluídas ({completedTasks.length})
            </div>
          </button>
        </div>

        {/* Add Task Form */}
        {activeTab === 'pending' && (
          <form onSubmit={handleAddTask} className="p-4 border-b border-slate-600/40">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="Digite uma nova tarefa..."
                className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600/40 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <button
                type="submit"
                disabled={!newTaskText.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Tasks List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400"></div>
            </div>
          ) : (
            <DragDropContext 
              onDragEnd={handleDragEnd}
              onDragStart={(start) => {
                console.log('🎯 DRAG DEBUG - Drag iniciado:', start);
              }}
              onDragUpdate={(update) => {
                console.log('🎯 DRAG DEBUG - Drag update:', update);
              }}
            >
              <div className="p-4">
                {activeTab === 'pending' ? (
                  pendingTasks.length > 0 ? (
                    <Droppable droppableId="pending-tasks" type="TASKS">
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`space-y-2 min-h-[100px] transition-colors duration-200 ${
                            snapshot.isDraggingOver ? 'bg-slate-700/20 rounded-lg' : ''
                          }`}
                        >
                          {pendingTasks.map((task, index) => {
                            console.log('🎯 DRAG DEBUG - Criando Draggable pendente:', { 
                              taskId: task.id, 
                              index, 
                              isLoading 
                            });
                            return (
                              <Draggable 
                                key={task.id}
                                draggableId={task.id} 
                                index={index}
                                isDragDisabled={isLoading}
                              >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform || ''} rotate(2deg) scale(1.05)` 
                                      : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <TaskItem
                                    task={task}
                                    onToggle={handleToggleTask}
                                    onDelete={handleDeleteTask}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma tarefa pendente</p>
                      <p className="text-sm mt-1">Adicione uma nova tarefa acima</p>
                    </div>
                  )
                ) : (
                  completedTasks.length > 0 ? (
                    <Droppable droppableId="completed-tasks" type="TASKS">
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className={`space-y-2 min-h-[100px] transition-colors duration-200 ${
                            snapshot.isDraggingOver ? 'bg-slate-700/20 rounded-lg' : ''
                          }`}
                        >
                          {completedTasks.map((task, index) => {
                            console.log('🎯 DRAG DEBUG - Criando Draggable completa:', { 
                              taskId: task.id, 
                              index, 
                              isLoading 
                            });
                            return (
                              <Draggable 
                                key={task.id}
                                draggableId={task.id} 
                                index={index}
                                isDragDisabled={isLoading}
                              >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    transform: snapshot.isDragging 
                                      ? `${provided.draggableProps.style?.transform || ''} rotate(2deg) scale(1.05)` 
                                      : provided.draggableProps.style?.transform
                                  }}
                                >
                                  <TaskItem
                                    task={task}
                                    onToggle={handleToggleTask}
                                    onDelete={handleDeleteTask}
                                    isDragging={snapshot.isDragging}
                                  />
                                </div>
                              )}
                            </Draggable>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  ) : (
                    <div className="text-center py-8 text-slate-400">
                      <CheckCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhuma tarefa concluída</p>
                      <p className="text-sm mt-1">Complete algumas tarefas para vê-las aqui</p>
                    </div>
                  )
                )}
              </div>
            </DragDropContext>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

interface TaskItemProps {
  task: Task;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  isDragging?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = React.memo(({ task, onToggle, onDelete, isDragging }) => {
  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 ${
        task.completed
          ? 'bg-slate-700/30 border-slate-600/30'
          : 'bg-slate-700/20 border-slate-600/40 hover:bg-slate-700/40'
      } ${isDragging ? 'shadow-xl bg-slate-600/60 border-indigo-400/50' : ''}`}
    >
      {/* Drag Handle - todo o item é arrastável agora */}
      <div className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 transition-colors duration-200">
        <GripVertical className="w-4 h-4" />
      </div>

      <button
        onClick={() => onToggle(task.id)}
        className={`mt-0.5 transition-all duration-200 ${
          task.completed
            ? 'text-green-400 hover:text-green-300'
            : 'text-slate-400 hover:text-indigo-400'
        }`}
      >
        {task.completed ? (
          <CheckCircle2 className="w-5 h-5" />
        ) : (
          <Circle className="w-5 h-5" />
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm break-words ${
            task.completed
              ? 'text-slate-400 line-through'
              : 'text-slate-200'
          }`}
        >
          {task.text}
        </p>
        
        {/* Datas das tarefas */}
        <div className="flex items-center justify-between mt-2 text-xs">
          {/* Data de criação (sempre presente) */}
          <span className="text-green-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Criada: {task.createdAt.toLocaleDateString('pt-BR', { 
              day: '2-digit', 
              month: '2-digit', 
              year: 'numeric'
            })}
          </span>
          
          {/* Data de conclusão (apenas para tarefas concluídas) */}
          {task.completed && task.completedAt && (
            <span className="text-red-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Concluída: {task.completedAt.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric'
              })}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 transition-all duration-200"
        title="Deletar tarefa"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
});

export default TaskManager;
